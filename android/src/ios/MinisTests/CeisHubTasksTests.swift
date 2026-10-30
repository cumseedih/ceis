import XCTest
@testable import Minis

/// The bookkeeping behind `stop {call | conversation}` on the iPhone (docs/hub.md): the run a
/// `stop` ends is the one the task frame opened, or the sender's run in the named conversation,
/// and never another device's. The Android twin is HubTasksTest.
@MainActor
final class CeisHubTasksTests: XCTestCase {

    override func setUp() {
        super.setUp()
        CeisHubTasks.running = [:]
    }

    override func tearDown() {
        CeisHubTasks.running = [:]
        super.tearDown()
    }

    func testPromptCarriesTheAskingDevicesLanguage() {
        // A device's Muse gets the context and, with `language`, the language to answer in.
        let fromPhone = CeisHubTasks.prompt(text: "weather tomorrow", senderName: "Pixel", senderKind: "phone", language: "zh-Hans")
        XCTAssertTrue(fromPhone.contains("Pixel"))
        XCTAssertTrue(fromPhone.contains("tagged zh-Hans"))
        XCTAssertTrue(fromPhone.hasSuffix("\n\nweather tomorrow"))
        // Without the tag the model goes by the text; nothing is said about a language tag.
        let untagged = CeisHubTasks.prompt(text: "weather tomorrow", senderName: "Pixel", senderKind: "computer", language: nil)
        XCTAssertFalse(untagged.contains("tagged"))
        XCTAssertEqual(CeisHubTasks.prompt(text: "weather tomorrow", senderName: "Pixel", senderKind: "computer", language: "  "), untagged, "blank counts as absent")
        // A web console speaks for the person: no context line, the tag still counts.
        let fromWeb = CeisHubTasks.prompt(text: "weather tomorrow", senderName: "web", senderKind: "web", language: "fr")
        XCTAssertEqual(fromWeb, "Answer in the language tagged fr; the device that asked shows its screens in it.\n\nweather tomorrow")
        XCTAssertEqual(CeisHubTasks.prompt(text: "weather tomorrow", senderName: "web", senderKind: "web", language: nil), "weather tomorrow")
        // An overlong tag is cut, so a stray value cannot pad the prompt.
        XCTAssertTrue(CeisHubTasks.prompt(text: "x", senderName: "web", senderKind: "web", language: String(repeating: "a", count: 80)).contains("tagged " + String(repeating: "a", count: 20) + ";"))
    }

    func testConversationKeyIsTheNamedOneOrOnePerDevice() {
        XCTAssertEqual(CeisHubTasks.conversationKey(senderId: "mac", conversation: nil), "from-mac")
        XCTAssertEqual(CeisHubTasks.conversationKey(senderId: "mac", conversation: "  "), "from-mac")
        XCTAssertEqual(CeisHubTasks.conversationKey(senderId: "", conversation: nil), "from-unknown")
        XCTAssertEqual(CeisHubTasks.conversationKey(senderId: "mac", conversation: "t-1"), "t-1")
    }

    func testStopByCallFindsTheRunTheFrameOpened() {
        CeisHubTasks.running["c1"] = .init(senderId: "mac", conversation: "from-mac")
        XCTAssertEqual(CeisHubTasks.find(senderId: "mac", callId: "c1", conversation: nil), "c1")
        XCTAssertNil(CeisHubTasks.find(senderId: "mac", callId: "c9", conversation: "elsewhere"))
    }

    func testStopByConversationDefaultsToTheSendersOwn() {
        CeisHubTasks.running["c1"] = .init(senderId: "mac", conversation: "from-mac")
        CeisHubTasks.running["c2"] = .init(senderId: "mac", conversation: "t-1")
        XCTAssertEqual(CeisHubTasks.find(senderId: "mac", callId: nil, conversation: nil), "c1")
        XCTAssertEqual(CeisHubTasks.find(senderId: "mac", callId: "", conversation: "t-1"), "c2")
        XCTAssertNil(CeisHubTasks.find(senderId: "mac", callId: nil, conversation: "t-2"))
    }

    func testAnotherDeviceCannotStopIt() {
        CeisHubTasks.running["c1"] = .init(senderId: "mac", conversation: "t-1")
        XCTAssertNil(CeisHubTasks.find(senderId: "pc", callId: "c1", conversation: nil))
        XCTAssertNil(CeisHubTasks.find(senderId: "pc", callId: nil, conversation: "t-1"))
        XCTAssertFalse(CeisHubTasks.stop(args: ["call": "c1"], from: ["id": "pc"]))
        XCTAssertEqual(CeisHubTasks.running["c1"]?.stopped, false)
    }

    func testStopMarksTheRunSoTheTaskAnswersCancelled() {
        CeisHubTasks.running["c1"] = .init(senderId: "mac", conversation: "from-mac")
        XCTAssertTrue(CeisHubTasks.stop(args: [:], from: ["id": "mac"]))
        XCTAssertEqual(CeisHubTasks.running["c1"]?.stopped, true)
        XCTAssertFalse(CeisHubTasks.stop(args: ["conversation": "none"], from: ["id": "mac"]))
    }
}
