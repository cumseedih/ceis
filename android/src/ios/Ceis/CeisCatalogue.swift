//
//  CeisCatalogue.swift
//  ceis
//
//  The own-key catalogue on the phone (contract C11, docs/parity.md items 32–34): the vendors
//  a person can bring a key of their own from, what each key covers (chat · screen · pictures ·
//  clips), the plans a person may already pay for (ChatGPT, Claude, Kimi, OpenRouter), the
//  servers one runs on a computer of one's own. Two sources, one shape: the relay's
//  `spend.guidance` (relay 0.21; also beside a `429 allowance_exhausted`), region already
//  chosen, read first; and the bundled `providers.json` (`ceis/llm/providers.json`,
//  written by `scripts/providers-json.mjs`) when the relay sent none. The Android twin is
//  io.github.ceis.cloud.ProviderCatalogue / Guidance.
//

import Foundation

/// One vendor of the catalogue, as `providers.json` lists it.
struct CeisVendor: Identifiable, Equatable, Sendable {
    var id: String
    var name: String
    var nameZh: String
    /// `openai` | `anthropic` | `gemini` | `openrouter` | `xai`: which client speaks to it.
    var protocolName: String
    var baseURL: String
    var baseURLGlobal: String?
    var keyURL: String
    var keyURLGlobal: String?
    var keyHint: String?
    /// `key`, `oauth-chatgpt`, `oauth-claude`, `device-kimi`, `oauth-openrouter`, `none`.
    var auth: [String]
    /// What a sign-in covers when that is less than the key (`oauth-chatgpt`: chat and the screen only).
    var authCapabilities: [String: Set<String>]
    var regions: Set<String>
    /// `chat`, `vision`, `image`, `video`.
    var capabilities: Set<String>
    var userCapabilities: Bool
    var defaults: [String: String]
    var note: String
    var noteZh: String
    var verified: String

    /// The sign-in this vendor offers, if any.
    var signIn: String? { auth.first { $0.hasPrefix("oauth-") || $0.hasPrefix("device-") } }
    var takesKey: Bool { auth.contains("key") }
    /// A server on a computer of one's own: no key, no sign-in, an http:// address.
    var local: Bool { auth.contains("none") && signIn == nil && baseURL.hasPrefix("http://") }

    func displayName(chinese: Bool) -> String { chinese && !nameZh.isEmpty ? nameZh : name }
    func note(chinese: Bool) -> String { chinese && !noteZh.isEmpty ? noteZh : note }
    func baseURL(mainland: Bool) -> String { !mainland && !(baseURLGlobal ?? "").isEmpty ? baseURLGlobal! : baseURL }
    func keyURL(mainland: Bool) -> String { !mainland && !(keyURLGlobal ?? "").isEmpty ? keyURLGlobal! : keyURL }
    func capabilitiesFor(_ auth: String?) -> Set<String> { auth.flatMap { authCapabilities[$0] } ?? capabilities }
    func servesMainland() -> Bool { regions.contains(CeisCatalogue.regionCN) }
    func servesGlobal() -> Bool { regions.contains(CeisCatalogue.regionGlobal) }

    /// The upstream provider type that speaks this vendor's protocol; a sign-in may pick another.
    var providerType: ProviderType {
        switch protocolName {
        case "anthropic": return .anthropic
        case "gemini": return .gemini
        case "openrouter": return .openRouter
        case "xai": return .xAI
        default: return .openAI
        }
    }
}

enum CeisCatalogue {
    static let authChatGPT = "oauth-chatgpt"
    static let authClaude = "oauth-claude"
    static let authKimi = "device-kimi"
    static let authOpenRouter = "oauth-openrouter"
    static let regionCN = "cn"
    static let regionGlobal = "global"
    static let bailian = "bailian"
    static let openrouter = "openrouter"
    static let openai = "openai"
    static let custom = "custom"

    /// The catalogue as shipped in the bundle; empty only when the resource is missing.
    static let bundled: [CeisVendor] = {
        guard let url = Bundle.main.url(forResource: "providers", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return [] }
        return parse(json)
    }()

    /// The vendors of a `providers.json` (or of a guidance block, whose `covers` reads as capabilities).
    static func parse(_ json: [String: Any]) -> [CeisVendor] {
        vendors(json["providers"] as? [[String: Any]])
    }

    static func vendors(_ list: [[String: Any]]?) -> [CeisVendor] {
        (list ?? []).compactMap(vendor)
    }

    /// One entry; nil for one without an id (a malformed entry is skipped, not the whole list).
    static func vendor(_ p: [String: Any]) -> CeisVendor? {
        guard let id = p["id"] as? String, !id.isEmpty else { return nil }
        func strings(_ v: Any?) -> [String] { (v as? [Any] ?? []).compactMap { $0 as? String }.filter { !$0.isEmpty } }
        let authCaps = (p["auth_capabilities"] as? [String: Any] ?? [:]).reduce(into: [String: Set<String>]()) { out, kv in
            out[kv.key] = Set(strings(kv.value))
        }
        let defaults = (p["defaults"] as? [String: Any] ?? [:]).reduce(into: [String: String]()) { out, kv in
            if let s = kv.value as? String { out[kv.key] = s }
        }
        var capabilities = Set(strings(p["covers"]))
        if capabilities.isEmpty { capabilities = Set(strings(p["capabilities"])) }
        return CeisVendor(
            id: id,
            name: (p["name"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? id,
            nameZh: p["name_zh"] as? String ?? "",
            protocolName: (p["protocol"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "openai",
            baseURL: p["base_url"] as? String ?? "",
            baseURLGlobal: (p["base_url_global"] as? String).flatMap { $0.isEmpty ? nil : $0 },
            keyURL: p["key_url"] as? String ?? "",
            keyURLGlobal: (p["key_url_global"] as? String).flatMap { $0.isEmpty ? nil : $0 },
            keyHint: (p["key_hint"] as? String).flatMap { $0.isEmpty ? nil : $0 },
            auth: strings(p["auth"]),
            authCapabilities: authCaps,
            regions: Set(strings(p["regions"])),
            capabilities: capabilities,
            userCapabilities: (p["user_capabilities"] as? Bool) ?? false,
            defaults: defaults,
            note: p["note"] as? String ?? "",
            noteZh: p["note_zh"] as? String ?? "",
            verified: p["verified"] as? String ?? ""
        )
    }

    /// The card's order: the region's lead first (Bailian for mainland China; OpenRouter, then
    /// OpenAI elsewhere), then the vendors that serve the region, then the rest; local servers
    /// and the blank entry left out.
    static func ordered(_ list: [CeisVendor], mainland: Bool) -> [CeisVendor] {
        let shown = list.filter { !$0.local && $0.id != custom && !$0.baseURL.isEmpty }
        let first = mainland ? [bailian] : [openrouter, openai]
        let home = shown.filter { mainland ? $0.servesMainland() : $0.servesGlobal() }
        let away = shown.filter { !home.contains($0) }
        var out: [CeisVendor] = []
        for id in first { if let v = shown.first(where: { $0.id == id }) { out.append(v) } }
        for v in home + away where !out.contains(v) { out.append(v) }
        return out
    }

    /// The vendors whose sign-in this phone offers, in the card's order.
    static func signIns(_ list: [CeisVendor], mainland: Bool) -> [CeisVendor] {
        ordered(list, mainland: mainland).filter { $0.signIn != nil }
    }

    /// The vendor by id, from the bundle or from the relay's last guidance.
    @MainActor
    static func byId(_ id: String) -> CeisVendor? {
        if let v = bundled.first(where: { $0.id == id }) { return v }
        guard let g = CeisAllowance.storedGuidance() else { return nil }
        return (g.providers + g.local).first { $0.id == id }
    }

    /// The UI is Chinese: the vendors' Chinese names and notes.
    @MainActor
    static var chinese: Bool {
        (AppBundle.current.preferredLocalizations.first ?? Locale.preferredLanguages.first ?? "en").lowercased().hasPrefix("zh")
    }

    /// "chat · screen · pictures · clips", for what a key covers.
    static func covers(_ caps: Set<String>) -> String {
        var words: [String] = []
        if caps.contains("chat") { words.append(AppLocalized("chat")) }
        if caps.contains("vision") { words.append(AppLocalized("screen")) }
        if caps.contains("image") { words.append(AppLocalized("pictures")) }
        if caps.contains("video") { words.append(AppLocalized("clips")) }
        return words.joined(separator: " · ")
    }

    /// The plan's brand for a sign-in: ChatGPT, Claude, Kimi; else the vendor's name.
    static func planName(auth: String, vendor: CeisVendor, chinese: Bool) -> String {
        switch auth {
        case authChatGPT: return "ChatGPT"
        case authClaude: return "Claude"
        case authKimi: return "Kimi"
        default: return vendor.displayName(chinese: chinese)
        }
    }
}

/// The ways-on card as data, the relay's way (relay 0.21, contract C11, `docs/cloud.md`):
/// `spend.guidance` of `/v1/me` and `guidance` beside a `429 allowance_exhausted` list the
/// providers for the person's region in order, each with what its key covers, the plans a
/// person may already pay for and which clients sign in with them, the local servers, the
/// docs link and the honest line about the ChatGPT sign-in.
struct CeisGuidance: Equatable, Sendable {
    struct Plan: Equatable, Sendable {
        var id: String
        /// The catalogue id of the provider whose sign-in it is (`openai` for ChatGPT).
        var provider: String
        var name: String
        /// `oauth-chatgpt` | `oauth-claude` | `device-kimi` | `oauth-openrouter`.
        var auth: String
        /// Which clients sign in with it: `android`, `ios`, `desktop`, `web`; empty = everyone.
        var clients: Set<String>
        var covers: Set<String>
    }

    static let client = "ios"

    var region: String
    var docs: String
    var providers: [CeisVendor]
    var plans: [Plan]
    var local: [CeisVendor]
    var chatgptCaveat: String
    var chatgptCaveatZh: String

    func caveat(chinese: Bool) -> String { chinese && !chatgptCaveatZh.isEmpty ? chatgptCaveatZh : chatgptCaveat }

    /// The guidance in a `spend.guidance` / `error.guidance` object; nil when it has no providers.
    static func parse(_ o: [String: Any]?) -> CeisGuidance? {
        guard let o else { return nil }
        var providers = CeisCatalogue.vendors(o["providers"] as? [[String: Any]])
        if providers.isEmpty { return nil }
        // `session_providers`: vendors that want a session id per conversation (OpenCode Go),
        // which the relay lists apart for the apps of before this one; this app sends the id
        // (CeisOpenCodeSession), so they follow the relay's own list
        for v in CeisCatalogue.vendors(o["session_providers"] as? [[String: Any]]) where !providers.contains(where: { $0.id == v.id }) {
            providers.append(v)
        }
        func strings(_ v: Any?) -> [String] { (v as? [Any] ?? []).compactMap { $0 as? String }.filter { !$0.isEmpty } }
        let plans = (o["plans"] as? [[String: Any]] ?? []).compactMap { p -> Plan? in
            guard let id = p["id"] as? String, !id.isEmpty else { return nil }
            return Plan(
                id: id,
                provider: p["provider"] as? String ?? "",
                name: (p["name"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? id,
                auth: p["auth"] as? String ?? "",
                clients: Set(strings(p["clients"])),
                covers: Set(strings(p["covers"]))
            )
        }
        let caveats = o["caveats"] as? [String: Any] ?? [:]
        return CeisGuidance(
            region: o["region"] as? String ?? "",
            docs: o["docs"] as? String ?? "",
            providers: providers,
            plans: plans,
            local: CeisCatalogue.vendors(o["local"] as? [[String: Any]]),
            chatgptCaveat: caveats["chatgpt"] as? String ?? "",
            chatgptCaveatZh: caveats["chatgpt_zh"] as? String ?? ""
        )
    }

    /// The same, from the JSON text the phone keeps between runs.
    static func parse(json: String) -> CeisGuidance? {
        guard let data = json.data(using: .utf8),
              let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return nil }
        return parse(o)
    }
}

/// What the ways-on card lists, resolved once: the relay's guidance when it sent one, else
/// the bundled catalogue ordered for the region (docs/parity.md, item 33).
struct CeisWays: Equatable, Sendable {
    /// One plan: the vendor to open the form on, how it signs in, what the sign-in covers, its brand.
    struct SignIn: Equatable, Sendable, Identifiable {
        var vendor: CeisVendor
        var auth: String
        var covers: Set<String>
        var name: String
        var id: String { vendor.id + ":" + auth }
    }

    /// The vendors with a key, the region's lead first.
    var vendors: [CeisVendor]
    /// The plans this phone signs in with.
    var signIns: [SignIn]
    /// The servers a person runs on a computer of their own.
    var locals: [CeisVendor]
    /// Where the guide is; empty when neither the relay nor the catalogue named one.
    var docs: String
    /// The honest line about the ChatGPT sign-in; empty when the relay sent none (the app has its own).
    var chatgptCaveat: String
    /// True when the list came from the relay.
    var fromRelay: Bool

    /// The guidance first — its providers in the relay's order, its plans that name this
    /// client, its local servers — and the catalogue only when the relay sent none. A plan
    /// whose provider the bundled catalogue knows opens that vendor's form; one it does not
    /// is still listed with the relay's own entry, so a new vendor on the relay shows before
    /// the app is updated; one nobody knows is left out rather than shown with no form to open.
    static func resolve(guidance: CeisGuidance?, catalogue: [CeisVendor], mainland: Bool, chinese: Bool = false) -> CeisWays {
        guard let guidance else {
            let signIns = CeisCatalogue.signIns(catalogue, mainland: mainland).compactMap { v -> SignIn? in
                guard let auth = v.signIn else { return nil }
                return SignIn(vendor: v, auth: auth, covers: v.capabilitiesFor(auth), name: CeisCatalogue.planName(auth: auth, vendor: v, chinese: chinese))
            }
            return CeisWays(
                vendors: CeisCatalogue.ordered(catalogue, mainland: mainland),
                signIns: signIns,
                locals: catalogue.filter { $0.local },
                docs: "",
                chatgptCaveat: "",
                fromRelay: false
            )
        }
        let known = guidance.providers + guidance.local + catalogue
        let signIns = guidance.plans
            .filter { $0.clients.isEmpty || $0.clients.contains(CeisGuidance.client) }
            .compactMap { plan -> SignIn? in
                guard let vendor = catalogue.first(where: { $0.id == plan.provider }) ?? known.first(where: { $0.id == plan.provider }) else { return nil }
                return SignIn(vendor: vendor, auth: plan.auth, covers: plan.covers.isEmpty ? vendor.capabilitiesFor(plan.auth) : plan.covers, name: plan.name)
            }
        return CeisWays(
            vendors: guidance.providers.filter { !$0.local && $0.id != CeisCatalogue.custom },
            signIns: signIns,
            locals: guidance.local,
            docs: guidance.docs,
            chatgptCaveat: guidance.caveat(chinese: chinese),
            fromRelay: true
        )
    }
}
