import UIKit
import XCTest
@testable import Minis

/// The emoji look another device set (#435): the profile's `#rrggbb` as a colour with the
/// desktop's fallbacks, and the order the face is settled in (drawn, then emoji, then dragon).
final class CeisEmojiLookTests: XCTestCase {

    private func rgb(_ color: UIColor) -> (Int, Int, Int) {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        color.getRed(&r, green: &g, blue: &b, alpha: &a)
        return (Int((r * 255).rounded()), Int((g * 255).rounded()), Int((b * 255).rounded()))
    }

    func testHexColourParsesEitherCaseWithOrWithoutTheHash() {
        XCTAssertTrue(rgb(CeisEmojiLook.color(hex: "#7c3aed")) == (0x7c, 0x3a, 0xed))
        XCTAssertTrue(rgb(CeisEmojiLook.color(hex: "#DC2626")) == (0xdc, 0x26, 0x26))
        XCTAssertTrue(rgb(CeisEmojiLook.color(hex: "059669")) == (0x05, 0x96, 0x69))
        XCTAssertTrue(rgb(CeisEmojiLook.color(hex: " #4b5563 ")) == (0x4b, 0x55, 0x63))
    }

    func testBadOrMissingColourIsTheActionBlue() {
        let blue = rgb(CeisEmojiLook.color(hex: CeisEmojiLook.defaultColor))
        XCTAssertTrue(blue == (0x00, 0x64, 0xd4))
        for bad in ["", "#", "#fff", "#12345g", "blue", "#0064d4ff"] {
            XCTAssertTrue(rgb(CeisEmojiLook.color(hex: bad)) == blue, bad)
        }
        XCTAssertTrue(rgb(CeisEmojiLook(emoji: "", color: "").uiColor) == blue)
    }

    func testEmptyEmojiShowsTheSparkle() {
        XCTAssertEqual(CeisEmojiLook(emoji: "", color: "").shownEmoji, "✨")
        XCTAssertEqual(CeisEmojiLook(emoji: "  ", color: "").shownEmoji, "✨")
        XCTAssertEqual(CeisEmojiLook(emoji: "🦊", color: "#0891b2").shownEmoji, "🦊")
    }

    func testTheDrawnFaceComesBeforeTheEmojiAndTheEmojiBeforeTheDragon() {
        let look = CeisEmojiLook(emoji: "🦉", color: "#059669")
        XCTAssertEqual(CeisFaceSource.of(hasDrawn: true, emoji: look), .drawn)
        XCTAssertEqual(CeisFaceSource.of(hasDrawn: true, emoji: nil), .drawn)
        XCTAssertEqual(CeisFaceSource.of(hasDrawn: false, emoji: look), .emoji)
        XCTAssertEqual(CeisFaceSource.of(hasDrawn: false, emoji: nil), .dragon)
    }

    func testTheLookRoundTripsThroughJSON() throws {
        let look = CeisEmojiLook(emoji: "🪐", color: "#d97706")
        let data = try JSONEncoder().encode(look)
        XCTAssertEqual(try JSONDecoder().decode(CeisEmojiLook.self, from: data), look)
    }
}
