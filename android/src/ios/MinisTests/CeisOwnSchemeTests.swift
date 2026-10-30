import XCTest
@testable import Minis

/// The app's two link names: `minis` inside, `ceis` towards the system, so a phone with
/// OpenMinis installed too never has two apps on one scheme. The Android twin is OwnSchemeTest.
final class CeisOwnSchemeTests: XCTestCase {

    func testBothNamesAreOursAndNothingElseIs() {
        for s in ["minis", "MINIS", "ceis", "Ceis"] { XCTAssertTrue(CeisOwnScheme.isOwn(s), s) }
        for s in ["", "http", "https", "minis-mcp", "ceis-mcp", "file", "shortcuts"] {
            XCTAssertFalse(CeisOwnScheme.isOwn(s), s)
        }
        XCTAssertFalse(CeisOwnScheme.isOwn(nil))
    }

    func testTheSystemsNameReadsAsTheAppsOwn() {
        func read(_ s: String) -> String { CeisOwnScheme.internalURL(URL(string: s)!).absoluteString }
        XCTAssertEqual(read("ceis://share"), "minis://share")
        XCTAssertEqual(read("Ceis://settings/soul"), "minis://settings/soul")
        XCTAssertEqual(read("ceis://session/abc/index.html?title=x&y=1"), "minis://session/abc/index.html?title=x&y=1")
        XCTAssertEqual(read("minis://attachments/a.png"), "minis://attachments/a.png")
        XCTAssertEqual(read("https://ceis.cn/"), "https://ceis.cn/")
        // the host part is not a scheme
        XCTAssertEqual(read("https://ceis.cn/ceis://x"), "https://ceis.cn/ceis://x")
        // a host with no path still has a host
        XCTAssertEqual(CeisOwnScheme.internalURL(URL(string: "ceis://share")!).host, "share")
    }

    func testThePlistRegistersTheSystemsNamesOnly() throws {
        // the test bundle sits inside the app bundle; its parent's Info.plist is the app's
        let schemes = try XCTUnwrap(Self.appURLSchemes(), "the app's Info.plist")
        XCTAssertTrue(schemes.contains(CeisOwnScheme.system), "\(schemes)")
        XCTAssertTrue(schemes.contains(CeisOwnScheme.systemMCP), "\(schemes)")
        XCTAssertFalse(schemes.contains(CeisOwnScheme.internalScheme), "upstream's scheme must not be registered: \(schemes)")
        XCTAssertFalse(schemes.contains("minis-mcp"), "\(schemes)")
    }

    /// Every `CFBundleURLSchemes` entry of the host app: from the running app's bundle, or from the
    /// source tree's Info.plist when the tests run without a host.
    private static func appURLSchemes() -> [String]? {
        var types = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes") as? [[String: Any]]
        if types == nil {
            let plist = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
                .appendingPathComponent("Info.plist")
            if let data = try? Data(contentsOf: plist),
               let dict = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] {
                types = dict["CFBundleURLTypes"] as? [[String: Any]]
            }
        }
        return types?.flatMap { ($0["CFBundleURLSchemes"] as? [String]) ?? [] }
    }
}
