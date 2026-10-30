import XCTest
@testable import Minis

/// 0.1.39, contract C10 on the phone: which account a local conversation belongs to, what the
/// lists and the push take under the signed-in account, and how an account is told apart.
/// Android: the same rules in SyncEngineTest; desktop: sync.test.mjs; relay: tests/test_sync.py.
@MainActor
final class CeisAccountsTests: XCTestCase {

    // MARK: - Rule 2 and 3: shown and pushed

    func testUnownedAndOwnConversationsShowUnderAnAccount() {
        XCTAssertTrue(CeisSync.visible(owner: nil, current: "acc-b"), "a conversation no account has synced is shown — and becomes the account's with its first push")
        XCTAssertTrue(CeisSync.visible(owner: "acc-b", current: "acc-b"))
    }

    func testAnotherAccountsConversationsStayHidden() {
        XCTAssertFalse(CeisSync.visible(owner: "acc-a", current: "acc-b"), "A's conversation neither shows under B nor goes up as B's")
    }

    func testSignedOutShowsEverythingOnThePhone() {
        XCTAssertTrue(CeisSync.visible(owner: "acc-a", current: ""))
        XCTAssertTrue(CeisSync.visible(owner: nil, current: ""))
    }

    // MARK: - The account's key

    func testTheRelaysOpaqueIdKeysTheTable() {
        XCTAssertEqual(CeisSync.accountKey(id: "acc-7f3a", hint: "138****1234", apiKey: "nm_abcdefgh12345678"), "acc-7f3a", "the id, never the identifier")
    }

    func testARelayWithoutAnIdFallsBackTo0138sKey() {
        XCTAssertEqual(CeisSync.accountKey(id: nil, hint: "a***@b.com", apiKey: "nm_abcdefgh12345678"), "a***@b.com")
        XCTAssertEqual(CeisSync.accountKey(id: "", hint: "", apiKey: "nm_abcdefgh12345678"), "12345678", "the key's tail when there is no hint either")
        XCTAssertEqual(CeisSync.accountKey(id: nil, hint: nil, apiKey: nil), "", "signed out")
    }

    func testTheAccountCarriesItsIdAndDecodesWithoutOne() throws {
        let reply: [String: Any] = ["account": ["id": "acc-7f3a", "channel": "sms", "hint": "138****1234"], "tokens": ["granted": 1, "used": 0]]
        XCTAssertEqual(CeisCloud.parseAccount(reply).id, "acc-7f3a")
        XCTAssertEqual(CeisCloud.parseAccount(["account": ["channel": "sms", "hint": "x"]]).id, "", "a relay that sends no id")
        // an account cached by 0.1.38 has no `id` field
        let cached = Data(#"{"channel":"sms","hint":"138****1234","granted":1,"used":0,"usedToday":0,"dailyCap":0,"checkedAt":0}"#.utf8)
        let decoded = try JSONDecoder().decode(CeisCloudAccount.self, from: cached)
        XCTAssertEqual(decoded.id, "")
        XCTAssertEqual(decoded.hint, "138****1234")
        XCTAssertNil(decoded.poolLeftCny, "an account cached before 1.0.1 carries no pool")
    }

    func testTheSettingsRowReadsThePoolInYuanOnAMoneyRelay() {
        // the Settings row and the account page name the same figure: what is left of the pool
        let reply: [String: Any] = ["account": ["channel": "sms", "hint": "138****1234"], "tokens": ["granted": 1000, "used": 10],
                                    "spend": ["total": 1.8, "grant": 5, "left": 3.2, "usd_cny": 7.2]]
        XCTAssertEqual(CeisCloud.parseAccount(reply).poolLeftCny, 3.2)
        // a member or an open relay has no pool; an older relay sends tokens only
        XCTAssertNil(CeisCloud.parseAccount(["account": ["channel": "sms"], "spend": ["total": 1.8, "unlimited": true, "left": NSNull()]]).poolLeftCny)
        XCTAssertNil(CeisCloud.parseAccount(["account": ["channel": "sms"], "tokens": ["granted": 1000, "used": 10]]).poolLeftCny)
        // spent past the pool reads as nothing left, not a negative figure
        XCTAssertEqual(CeisCloud.parseAccount(["account": ["channel": "sms"], "spend": ["grant": 5, "left": -0.4]]).poolLeftCny, 0)
    }

    // MARK: - C12 (0.1.40): a key the relay refuses

    func testARefusedKeyKeepsTheAccountsDataAside() {
        XCTAssertTrue(CeisAccountData.keepOnRefusedKey(code: "bad_key"), "revoked elsewhere, or by the person's own Sign out everywhere")
        XCTAssertTrue(CeisAccountData.keepOnRefusedKey(code: nil), "a relay reset or a relay bug answers like a revoked key")
        XCTAssertTrue(CeisAccountData.keepOnRefusedKey(code: "http_401"), "an older relay, or a code the phone does not know")
    }

    func testOnlyADeletedAccountLeavesNothingToComeBackTo() {
        XCTAssertFalse(CeisAccountData.keepOnRefusedKey(code: CeisAccountData.accountDeleted))
        XCTAssertEqual(CeisAccountData.accountDeleted, "account_deleted", "the relay's code, as documented")
    }
}
