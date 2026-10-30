import XCTest
@testable import Minis

/// OpenCode Go asks for one stable id per conversation in `x-opencode-session`: the endpoints
/// that get it, and the relay's `session_providers` joining the ways on. The Android twins are
/// ProviderCatalogueTest and GuidanceTest.
final class CeisOpenCodeSessionTests: XCTestCase {

    func testOnlyOpenCodesHostGetsTheHeader() {
        XCTAssertEqual(CeisOpenCodeSession.header, "x-opencode-session")
        XCTAssertTrue(CeisOpenCodeSession.wants("https://opencode.ai/zen/go/v1"))
        XCTAssertTrue(CeisOpenCodeSession.wants(" https://OpenCode.ai/zen/v1/ "))
        XCTAssertFalse(CeisOpenCodeSession.wants("https://api.deepseek.com/v1"))
        XCTAssertFalse(CeisOpenCodeSession.wants("https://notopencode.ai/v1"))
        XCTAssertFalse(CeisOpenCodeSession.wants(nil))
    }

    func testEveryCatalogueEntryWithASessionHeaderIsOnThatHost() throws {
        let url = try XCTUnwrap(Bundle.main.url(forResource: "providers", withExtension: "json"))
        let json = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
        let entries = (json["providers"] as? [[String: Any]] ?? []).filter { ($0["session_header"] as? String)?.isEmpty == false }
        XCTAssertEqual(entries.compactMap { $0["id"] as? String }, ["opencode-go"])
        for e in entries {
            XCTAssertEqual(e["session_header"] as? String, CeisOpenCodeSession.header)
            XCTAssertTrue(CeisOpenCodeSession.wants(e["base_url"] as? String))
        }
        XCTAssertTrue(CeisCatalogue.bundled.contains { $0.id == "opencode-go" })
    }

    @MainActor
    func testTheRelaysSessionProvidersFollowItsList() throws {
        let guidance = try XCTUnwrap(CeisGuidance.parse(json: """
        {"region":"intl","providers":[
          {"id":"openrouter","name":"OpenRouter","protocol":"openai","base_url":"https://openrouter.ai/api/v1","key_url":"https://openrouter.ai/keys","auth":["key"],"regions":["global"],"covers":["chat"]}
        ],"session_providers":[
          {"id":"opencode-go","name":"OpenCode Go","protocol":"openai","base_url":"https://opencode.ai/zen/go/v1","key_url":"https://opencode.ai/auth","auth":["key"],"regions":["global"],"covers":["chat"],"session_header":"x-opencode-session"},
          {"id":"openrouter","name":"OpenRouter twice","protocol":"openai","base_url":"https://openrouter.ai/api/v1","key_url":"","auth":["key"],"regions":["global"],"covers":["chat"]}
        ]}
        """))
        XCTAssertEqual(guidance.providers.map(\.id), ["openrouter", "opencode-go"])
        XCTAssertEqual(guidance.providers.first?.name, "OpenRouter")
    }
}
