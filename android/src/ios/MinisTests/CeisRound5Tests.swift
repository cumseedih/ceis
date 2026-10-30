import XCTest
@testable import Minis

/// 0.1.38: the pure parts of the composer's native field and its fail-safe, Contract C9 on the
/// phone (scope, tail, the side-chat switch, presence and its expiry, the working line), the
/// own-relay rule and the phone-region check. Android: SyncEngineTest, PresenceTest,
/// CloudSignInTest; relay: tests/test_sync.py.
@MainActor
final class CeisRound5Tests: XCTestCase {

    // MARK: - Composer field

    func testReturnIsOneAppendedNewline() {
        XCTAssertTrue(CeisComposerField.isReturn(from: "hello", to: "hello\n"))
        XCTAssertTrue(CeisComposerField.isReturn(from: "", to: "\n"))
        XCTAssertFalse(CeisComposerField.isReturn(from: "hello", to: "hello"), "nothing typed")
        XCTAssertFalse(CeisComposerField.isReturn(from: "hello", to: "hello\n\n"), "two at once is a paste")
        XCTAssertFalse(CeisComposerField.isReturn(from: "hello", to: "hell\n"), "a character went too")
        XCTAssertFalse(CeisComposerField.isReturn(from: "a\nb", to: "a\nb c"), "a newline in the middle is not Return")
    }

    func testReturnSendsWithAHardwareKeyboardOrThePreference() {
        XCTAssertTrue(CeisComposerField.returnSends(hardwareKeyboard: true, preference: 0))
        XCTAssertTrue(CeisComposerField.returnSends(hardwareKeyboard: false, preference: 1))
        XCTAssertFalse(CeisComposerField.returnSends(hardwareKeyboard: false, preference: 0), "on-screen Return is a newline by default")
    }

    func testOverflowCountsLinesAndRoughWraps() {
        XCTAssertFalse(CeisComposerField.overflows("one line", lines: 6))
        XCTAssertFalse(CeisComposerField.overflows("1\n2\n3\n4\n5\n6", lines: 6), "six lines fit six")
        XCTAssertTrue(CeisComposerField.overflows("1\n2\n3\n4\n5\n6\n7", lines: 6))
        XCTAssertTrue(CeisComposerField.overflows(String(repeating: "word ", count: 80), lines: 6), "a long paragraph wraps past the cap")
    }

    // MARK: - Composer watch

    func testComposerIsMissingWhenNothingIsAttachedOrNothingHasHeight() {
        XCTAssertTrue(CeisComposerWatch.isMissing(attached: 0, hostHeight: 80, frameHeight: 80), "no probe in a window")
        XCTAssertTrue(CeisComposerWatch.isMissing(attached: 1, hostHeight: 0, frameHeight: 80), "the column collapsed")
        XCTAssertTrue(CeisComposerWatch.isMissing(attached: 1, hostHeight: 80, frameHeight: 0), "the bar reports no height")
        XCTAssertFalse(CeisComposerWatch.isMissing(attached: 1, hostHeight: 80, frameHeight: 64))
    }

    // MARK: - C9: scope, tail, the switch

    func testPullPathCarriesScopeAndTail() {
        XCTAssertEqual(CeisSync.pullPath(since: 0, sideChats: false, tail: 300), "/v1/sync/changes?since=0&limit=500&scope=main&tail=300")
        XCTAssertEqual(CeisSync.pullPath(since: 0, sideChats: true, tail: 300), "/v1/sync/changes?since=0&limit=500&scope=all&tail=300")
        XCTAssertEqual(CeisSync.pullPath(since: 4711, sideChats: false), "/v1/sync/changes?since=4711&limit=500&scope=main", "a normal pull: no tail")
        XCTAssertEqual(CeisSync.tail, 300)
    }

    func testSideChatsAreOnlyTakenWithTheSwitchOn() {
        XCTAssertTrue(CeisSync.takes(kind: "main", sideChats: false))
        XCTAssertFalse(CeisSync.takes(kind: "side", sideChats: false), "a side row is ignored while the switch is off")
        XCTAssertTrue(CeisSync.takes(kind: "side", sideChats: true))
        XCTAssertTrue(CeisSync.takes(kind: "main", sideChats: true))
    }

    func testSideChatSwitchDefaultsOff() {
        UserDefaults.standard.removeObject(forKey: "ceis.sync.sidechats")
        XCTAssertFalse(CeisSync.shared.sideChats)
    }

    // MARK: - C9: presence

    func testPresenceFrameParses() {
        let frame: [String: Any] = ["cid": "c1", "from": "dev-a", "device_name": "kwai", "working": true, "at": 1_700_000_000]
        let entry = CeisPresence.parse(frame)
        XCTAssertEqual(entry?.cid, "c1")
        XCTAssertEqual(entry?.from, "dev-a")
        XCTAssertEqual(entry?.deviceName, "kwai")
        XCTAssertEqual(entry?.at.timeIntervalSince1970, 1_700_000_000)
        XCTAssertNil(CeisPresence.parse(["from": "dev-a"]), "no cid, no entry")
        XCTAssertNil(CeisPresence.parse(["cid": "c1"]), "no device, no entry")
    }

    func testPresenceExpiresAfterTenMinutes() {
        let at = Date(timeIntervalSince1970: 1_700_000_000)
        XCTAssertTrue(CeisPresence.isLive(at: at, now: at.addingTimeInterval(599)))
        XCTAssertFalse(CeisPresence.isLive(at: at, now: at.addingTimeInterval(600)))
        XCTAssertFalse(CeisPresence.isLive(at: at, now: at.addingTimeInterval(3600)))
        XCTAssertEqual(CeisPresence.ttl, 600)
    }

    func testWorkingLineOnlyUnderARemoteUserLine() {
        let entry = CeisPresence.Working(cid: "c1", from: "dev-a", deviceName: "kwai", at: Date())
        XCTAssertEqual(CeisPresence.line(lastIsRemoteUser: true, lastFromDevice: "kwai", entry: entry, me: "dev-b"), "kwai")
        XCTAssertNil(CeisPresence.line(lastIsRemoteUser: false, lastFromDevice: nil, entry: entry, me: "dev-b"), "our own line, or an assistant row: nothing")
        XCTAssertNil(CeisPresence.line(lastIsRemoteUser: true, lastFromDevice: "kwai", entry: nil, me: "dev-b"), "nobody working: nothing")
        XCTAssertNil(CeisPresence.line(lastIsRemoteUser: true, lastFromDevice: "kwai", entry: entry, me: "dev-a"), "our own presence echo is not shown")
        let unnamed = CeisPresence.Working(cid: "c1", from: "dev-a", deviceName: "", at: Date())
        XCTAssertEqual(CeisPresence.line(lastIsRemoteUser: true, lastFromDevice: "Pixel 8", entry: unnamed, me: "dev-b"), "Pixel 8", "the caption's device name stands in")
    }

    // MARK: - Own relay

    func testRelayAddressesAreNormalised() {
        XCTAssertEqual(CeisCloud.normalizedRelay("relay.example.org"), "https://relay.example.org")
        XCTAssertEqual(CeisCloud.normalizedRelay(" https://relay.example.org/ "), "https://relay.example.org")
        XCTAssertEqual(CeisCloud.normalizedRelay("http://192.168.1.20:8787/"), "http://192.168.1.20:8787")
        XCTAssertNil(CeisCloud.normalizedRelay(""))
        XCTAssertNil(CeisCloud.normalizedRelay("https://"))
    }

    func testPrivateHosts() {
        for host in ["10.0.0.5", "192.168.1.20", "172.16.0.1", "172.31.255.1", "localhost", "mac.local", "studio.tail1234.ts.net"] {
            XCTAssertTrue(CeisCloud.isPrivateHost(host), host)
        }
        for host in ["172.15.0.1", "172.32.0.1", "relay.example.org", "11.0.0.1", "example.local.com"] {
            XCTAssertFalse(CeisCloud.isPrivateHost(host), host)
        }
        // one rule with the proxy's bypass and Android's LanOnly: parsed addresses, not prefixes
        for host in ["10.foo.example.com", "192.168.example.org", "127.example.org", "ts.net.example.org", "100.128.0.1", "2001:db8::1", "[2001:db8::1]"] {
            XCTAssertFalse(CeisCloud.isPrivateHost(host), host)
        }
        for host in ["100.64.0.1", "100.101.102.103", "169.254.3.4", "127.0.0.1", "[::1]", "fd00::1", "[fe80::1%en0]", "desktop", "nas.lan", "box.home.arpa", "LOCALHOST"] {
            XCTAssertTrue(CeisCloud.isPrivateHost(host), host)
        }
    }

    func testHttpsIsRequiredUnlessPrivate() {
        XCTAssertNil(CeisCloud.relayProblem("https://relay.example.org"))
        XCTAssertNil(CeisCloud.relayProblem("relay.example.org"), "no scheme means https")
        XCTAssertNil(CeisCloud.relayProblem("http://192.168.1.20:8787"))
        XCTAssertNil(CeisCloud.relayProblem("http://mac.local:8787"))
        XCTAssertNotNil(CeisCloud.relayProblem("http://relay.example.org"), "plain http on the internet")
        XCTAssertNotNil(CeisCloud.relayProblem("ftp://relay.example.org"))
        XCTAssertNotNil(CeisCloud.relayProblem(""))
    }

    // MARK: - Phone region

    func testNumbersOutsideMainlandChinaAreToldBeforeTheRequest() {
        XCTAssertTrue(CeisCloud.needsEmailInstead(identifier: "+1 415 555 0100"))
        XCTAssertTrue(CeisCloud.needsEmailInstead(identifier: "+44 7700 900123"))
        XCTAssertTrue(CeisCloud.needsEmailInstead(identifier: "0081-90-1234-5678"))
        XCTAssertFalse(CeisCloud.needsEmailInstead(identifier: "+86 138 0013 8000"))
        XCTAssertFalse(CeisCloud.needsEmailInstead(identifier: "0086 13800138000"))
        XCTAssertFalse(CeisCloud.needsEmailInstead(identifier: "13800138000"), "bare digits are the relay's call")
        XCTAssertFalse(CeisCloud.needsEmailInstead(identifier: "someone@example.org"))
        XCTAssertFalse(CeisCloud.needsEmailInstead(identifier: ""))
    }

    func testPhoneRegionErrorSaysTheSameSentence() {
        let error = CeisCloudError(code: "phone_region", message: "sms only for +86", status: 400)
        XCTAssertEqual(CeisCloud.describe(error), CeisCloud.phoneRegionSentence)
        XCTAssertFalse(CeisCloud.phoneRegionSentence.isEmpty)
    }
}
