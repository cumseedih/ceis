/* wevvy Cloud — the operator's page. Static, no build step: the admin
   token (X-Admin-Token) is asked for once and kept in sessionStorage, so it
   is gone when the tab closes. Everything comes from /v1/admin/*.

   0.14: the page is pages. A side nav picks one view — overview, people,
   places, spend, activity, the demo, data controls, the site, models, health,
   settings — and each view fetches only what it shows, when it is first opened
   (cached for the chosen period; refresh clears it). The URL hash names the
   view and, for People, every filter, so a view can be linked and comes back
   the same way after a reload. Charts are filters: a bar, a slice or a row in
   a chart narrows the table, and clicking it again lets go.

   What it shows is what the relay keeps: counts, tokens, estimated cost,
   sign-ins (device names), devices, and the account timeline. Nobody's
   messages — those were never stored. Identifiers are decrypted one
   account at a time, in the drawer; the tables show the masked hint. */
(() => {
  "use strict";

  // appearance matches the user console's sign-in gear (light/dark/system)
  try {
    const t = window.localStorage.getItem("nm.theme") || "system";
    const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (_) { /* storage or matchMedia denied */ }

  const fmt = (n) => Number(n || 0).toLocaleString();
  const T = {
    title: "wevvy Cloud admin", tokenLabel: "Admin token", tokenHint: "The value of CLOUD_ADMIN_TOKEN in the relay's .env; it stays in this tab only.",
    enter: "Open", wrong: "That token is not right.", offline: "Cannot reach the server.", refresh: "Refresh", lock: "Lock", loading: "Loading…",
    today: "Today", week: "Last 7 days", period: (d) => `Last ${d} days`,
    kSamples: "Kept turns", kSamplesSub: (n) => `${n} accounts with “help improve” on`, exportSamples: "Export JSONL", exportFailed: (why) => `The export did not go through: ${why}. Try once more; if it keeps happening, see docker logs wevvy-relay on the server.`, exportCut: "the download broke off", exportEmpty: "Nothing to export yet.", contributes: "helps improve", samples: "Kept conversations (recent)", samplesNote: "Kept only for accounts with “Help improve wevvy's AI models” on: what the person wrote, what the model answered and the tools it called; not the system prompt, tool results or pictures; the export carries no account ids.", user: "user", assistant: "reply", more: "Show more", noSamples: "None yet",
    kAccounts: "Accounts", kAccountsSub: (c) => `${c.with_password || 0} with a password · ${c.unlimited || 0} members · ${c.disabled || 0} disabled`,
    kActive: "Active accounts", kActiveSub: (n) => `${n} new`, kSpent: "Spent", kSpentSub: (r, t) => `${fmt(r)} requests · ${fmt(t)} tokens`,
    kOnline: "Devices online", kOnlineSub: (k, s) => `${k} remembered · ${s} live sign-ins`, kSignals: "Signals today",
    kSignalsSub: (s) => `${s.sign_ins} sign-ins · ${s.sign_in_failures} failed · ${s.budget_refusals} over budget · ${s.upstream_errors} upstream errors · ${s.content_rejected} content checks · ${s.calls} calls`,
    byKind: "By kind", byModel: "By model", byDay: (d) => `Spend by day · last ${d} days`, top: (d) => `Top spenders · last ${d} days`, events: "Activity", accounts: "All accounts", config: "Configuration",
    kinds: { chat: "Chat", image: "Pictures", video: "Video", realtime: "Calls", grant: "Tokens granted", credit: "Credit" },
    lanes: { chat: "chat", gui: "hands" }, laneDefault: (l) => `${l} default`, laneTitle: (l) => `offered in the ${l} picker`, laneDefaultTitle: (l) => `the ${l} picker's default`,
    thWho: "Account", thJoined: "Joined", thSpent: "Spent all / today", thTokens: "Tokens all / today", thReqs: "Requests", thActive: "Last active", thDevices: "Devices",
    never: "never", phone: "phone", email: "e-mail", disabled: "disabled", locked: "locked", member: "member", listed: "listed", review: "review", reviewNote: "the app store reviewer's sign-in (REVIEW_ADDRESSES): a fixed code, left out of the sign-up counts", password: "password", noAccounts: "Nobody has signed in yet.", search: "Search number, e-mail, id, address, device, version, inviter…",
    reqs: (n) => `${fmt(n)} req`, tokens: (n) => `${fmt(n)} tokens`, seconds: (n) => `${fmt(n)} s`, pictures: (n) => `${fmt(n)} pictures`, inOut: (i, o) => `${fmt(i)} in · ${fmt(o)} out`,
    all: "All", signIns: "Sign-ins", refusals: "Refusals", errors: "Errors", contentChecks: "Content checks", calls: "Calls", passwords: "Passwords",
    eventName: {
      "account.created": "Joined", "sign_in.code": "Signed in with a code", "sign_in.password": "Signed in with the password", "sign_in.session": "Took a session key", "sign_in.failed": "Failed sign-in", "password.set": "Password set", "password.changed": "Password changed",
      "password.cleared": "Password removed", "sign_out": "Signed out", "sign_out.all": "Signed out everywhere", "pool.set": "Pool set", "pool.set.many": "Pools set", "budget.refused": "Refused: over budget", "upstream.error": "Upstream error", "content.rejected": "Content check declined", "call.ended": "Call ended", "contribute.on": "“Help improve” on", "contribute.default": "New account: “help improve” on by default", "contribute.bonus": "Early co-creation bonus +¥10", "contribute.off": "“Help improve” off", "contribute.deleted": "Kept turns deleted", "invite.accepted": "Invited a friend", "invite.used": "Signed up via invite", "invite.unknown": "Unknown invite code", "invite.settled": "Invite bonus paid", "invite.clawback": "Invite credit reclaimed", "signup.domain_limited": "Domain at its sign-up limit", "credit.granted": "Credit granted", "grant.tokens": "Token grant adjusted", "account.disabled": "Account disabled", "account.enabled": "Account enabled", "account.deleted": "Account deleted", "member.set": "Made a member", "member.unset": "Membership removed", "profile.put": "Profile updated", "profile.clear": "Profile cleared", "profile.connectors": "Connectors updated", "settings.changed": "Settings changed", "nudges.changed": "Star asks policy changed", "control.switch": "Switch flipped", "control.rule": "Threshold rule fired",
    },
    spendToday: "Today", spendTotal: "All time", requests: "Requests", cap: "Pool", noCap: "no cap", left: "left", usageToday: "Today", usagePeriod: (d) => `Last ${d} days`, usageTotal: "All time",
    sessions: "Sign-ins (incl. revoked)", revoked: "revoked", via: { code: "code", password: "password", session: "session key" }, lastUsed: "last used", devices: "Devices", firstSeen: "first", lastSeen: "last",
    ledger: "All requests", timeline: "Timeline", lgCredits: "Credits", lgSearch: "Search model / note…", tlSearch: "Search detail / kind…", noRequestsYet: "This account has not made a request yet.", none: "—", online: "online", offline: "offline", version: "Version",
    thClient: "Client / IP", addresses: "Addresses / IP", addrNote: "The address recorded with sign-ins, every request and every event (the real one behind Caddy). Click one to see every account seen from it.", addrOnly: "only this account", addrShared: (n) => `${n} other accounts came from this address`,
    atAddress: (ip) => `Accounts seen from ${ip}`, back: "Back to the account", times: (n) => `${fmt(n)}×`, firstIp: "First address", lastIp: "Last address", lastClient: "Last client", lastSeenAt: "Last seen",
    shown: (n, total) => `${fmt(n)} of ${fmt(total)} shown`, allShown: (total) => `all ${fmt(total)} shown`, loadMore: "Load more", feedLoaded: (n) => `${fmt(n)} loaded`,
    samplesAll: "Kept conversations", exportThis: "Export this account's JSONL", expand: "Show the whole conversation", collapse: "Collapse", roles: { system: "system", user: "user", assistant: "reply", tool: "tool result" }, toolCall: "tool call", omitted: "(not kept)", lengthNote: (n) => `${fmt(n)} messages`,
    byAccount: "By account", bSearch: "Search account / model…", bHint: "Account", bTurns: "Turns", bTokens: "Tokens in / out", bFirst: "First", bLast: "Last", bModels: "Models", bSwitch: "Switch", bOn: "on", bOff: "off", noByAccount: "No account has kept turns yet.",
    demo: (d) => `The phone in the browser (demo.wevvy.dev) · last ${d} days`, demoOff: "Not connected: set SHOWCASE_ADMIN_TOKEN on the gateway and WEB_ADMIN_URL (…/api/demo/admin) with WEB_ADMIN_TOKEN on the relay.", demoVisitors: "Visitors", demoVisits: "Demos", demoActive: "Running now", demoNoSignin: "no sign-in asked", demoCreated: "signed up here",
    dvHint: "Visitor", dvSearch: "Search visitors…", dvSignins: "Sign-ins", dvSessions: "Demos", dvFirst: "First", dvLast: "Last", dvClient: "Client / IP", dvNone: "Nobody has tried it yet.", dtWhen: "Started", dtLength: "Length", dtUsed: "Used", dtWhy: "Ended because", dtRunning: "running", dtByok: "own key", dtAnon: "not signed in",
    usedLine: (v) => [`${fmt(v.requests)} req`, `${fmt(v.tokens)} tokens`, v.pictures ? `${fmt(v.pictures)} pictures` : "", v.clips ? `${fmt(v.clips)} clips` : ""].filter(Boolean).join(" · "), dur: (s) => (s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`),
    demoOfAccount: "The phone in the browser", demoAccountLine: (v) => `${fmt(v.signins)} sign-ins · ${fmt(v.sessions)} demos · first ${when(v.first_seen)} · last ${when(v.last_seen)}${v.created ? " · the account was created on the demo page" : ""}`, demoNoneHere: "This account has not tried the demo.",
    recorded: "What is recorded", recordedNote: "Per account: phone / e-mail (encrypted), joined and last seen, first and last address, last client (platform, version); per sign-in: device name, way in, address, client; per request: model, tokens, cost, address, client; per event: kind, address, client; per device: name, OS, version, address. Accounts with “help improve” on also have the text of their turns. All of it goes with the account when it is deleted.",
    grant: "Grant", grantPrompt: (who) => `How many tokens for ${who}? Negative takes away.`, credit: "Add credit", creditPrompt: (who) => `How many yuan for ${who}? Negative takes away. (straight into the pool; never expires)`, creditNote: "Note (say, PR #12)", setPool: "Set the pool", setPoolPrompt: (who, left) => `Set ${who}'s pool to what? ${left} left now.\nWrite: =5 → ¥5 left; total=20 → a ¥20 pool; +3 / -2 → ¥3 more / ¥2 less.`, setPoolMany: (n) => `Set the pool for these ${n}`, setPoolManyPrompt: (n) => `Set the pool of the ${n} accounts shown.\nWrite: =5 → ¥5 left each; total=20 → a ¥20 pool each; +3 / -2 → ¥3 more / ¥2 less each. Members are not touched.`, setPoolManyConfirm: (w, n) => `"${w}" for ${n} accounts?`, setPoolDone: (n) => `${n} pool(s) set.`, poolBad: "Not understood. Write =5, total=20, +3 or -2.", poolLine: (g, l, n, b) => `pool ${g}${l === null ? "" : ` (${l} left)`} · ${n} invited${b ? " · took the early co-creation bonus" : ""}`, invitedBy: "invited by", disable: "Disable", enable: "Enable", makeMember: "Make member", unmakeMember: "Unmake member",
    memberConfirm: (who) => `Make ${who} a member? Members have no allowance limit; you pay their bill.`, listedNote: "on the server's list; edit ALLOWED_IDENTIFIERS to remove",
    disableConfirm: (who) => `Disable ${who}? Every device of theirs drops at once and cannot sign in again.`, remove: "Delete account",
    removeConfirm: (who) => `Delete the account, keys, usage and devices of ${who}? This cannot be undone.`, hasPassword: "has a password", noPassword: "no password", identifierNote: "decrypted for this view only",
    allowed: "Members (no cap)", allowedNone: "(none)", sender: "Code sender", models: "Models", prices: "Prices (¥)", rate: "Rate", rateLine: (r) => `1 USD = ${r} CNY (display only)`,
    perMinute: (n) => (n > 0 ? `${n} a minute` : "no rate limit"), capLine: (c, u, b) => (c > 0 ? `¥${c} (≈ $${u}) in all for non-members · +¥${b} an invite, to both sides` : "no spend limit"), signupOpen: "sign-up open", signupClosed: "members only",
    realtime: "Real-time calls", on: "on", off: "off", pwMin: (n) => `passwords ≥ ${n} chars`,
    rtTitle: "Allowance (in force at once)", rtNote: "Change it here and every client follows at once: new sign-ups get the new allowance, and the account pages, the sign-in pages and the used-up notice all read the server's figures; no release, nothing for anyone to do. Empty puts the environment's value back. A lower figure only changes what new accounts get; nothing is taken from anyone's pool.",
    rtAllowance: "Free allowance for each new account (¥)", rtBonus: "Invite bonus (¥, to both sides)", rtSignup: "Sign-up open", rtSignupOff: "Closed, only members and the list may sign in; whoever is signed in is unaffected.",
    rtEnv: (v) => `environment: ${v}`, rtSet: "set here", rtSave: "Save", rtSaved: "Saved and in force.", rtApply: (n) => `Bring ${n} older account${n === 1 ? "" : "s"} up to the current allowance`, rtApplyNone: "Every account has at least the current allowance.",
    rtApplyConfirm: (n, c) => `Top up the ${n} account(s) that were given less than ¥${c}? Each gets a ledger line saying so.`, rtApplied: (n) => `${n} account(s) topped up.`,
    rtCreditAll: "Credit everyone", rtCreditAllPrompt: "How many yuan into every limited account's pool? Negative takes away. (a holiday, an apology; members left out)", rtSetAll: "Set everyone's pool", rtSetAllPrompt: (n) => `Set the pool of all ${n} limited accounts.\nWrite: =5 → ¥5 left each; total=20 → a ¥20 pool each; +3 / -2 → ¥3 more / ¥2 less each.`, rtCreditAllConfirm: (c, n) => `¥${c} to each of ${n} accounts?`, rtCredited: (n) => `${n} account(s) credited.`,
    ndTitle: "Star asks (in force at once)", ndNote: "When the apps may ask for a star on GitHub. Every client (Android, iPhone, desktop, web) reads this once a day and falls back to the built-in defaults when the relay cannot be reached. Change it here; no release needed. “Not now” counts as an ask; a device that went to GitHub is never asked again.",
    ndEnabled: "Asks on", ndEnabledOff: "Off: no asks at all; the “Star on GitHub” rows in Settings stay.", ndMoments: "Moments", ndSignedIn: "First time seen signed in (a row on the account page)", ndNewLook: "After a new face is drawn", ndExhausted: "When the free allowance is used up (a row in the ways-on card)", ndGoalDone: "When a goal is marked done",
    ndTasks: "After task number", ndTasksHint: "Comma-separated, say 3, 10, 30. A task is a turn the person started that ended in a reply; the naming conversation and background runs do not count.", ndDays: "On day of use number", ndDaysHint: "Comma-separated, say 7, 30: the n-th distinct day the app was opened.",
    ndCooldown: "Days between two asks, at least", ndMax: "Asks per device, at most", ndUrl: "Link",
    ndTextEn: "Card text (English)", ndTextHint: "Empty: each app shows its own sentence. At most 200 characters.", ndTextLeft: (n) => `${n} characters left`, ndSave: "Save", ndReset: "Reset to defaults", ndResetConfirm: "Go back to the built-in defaults? Clients follow within a day.", ndSaved: "Saved; clients follow within a day.", ndResetDone: "Back to the defaults.",
    ndVersion: (v, t) => (t ? `version ${v} · saved ${t}` : `version ${v} · built-in defaults`), ndStored: "set here", ndDefault: "built-in defaults",
    priceLine: (p) => [p.per_m_input || p.per_m_output ? `${p.per_m_input} in / ${p.per_m_output} out per M tokens` : null,
      p.per_image ? `${p.per_image} a picture${p.per_image_2k ? ` (${p.per_image_2k} at 2k)` : ""}` : null, p.per_second ? `${p.per_second} a second` : null].filter(Boolean).join("; "),
    foot: "A phone number or address is decrypted only when you open that account, with the admin token; the database holds ciphertext. Network addresses and the client are recorded with every sign-in, request and event, and go when the account is deleted. The text of a chat is kept only while the account has “Help improve wevvy's AI models” on, and only what the person wrote, what the model answered and the tools it called (see Data controls). Do not share screenshots of this page. Money is estimated at the provider's Beijing list prices.",
    trends: (d) => `Accounts · last ${d} days`, site: (d) => `The site: visits and downloads · last ${d} days`, siteOff: "No traffic figures yet: install wevvy-traffic on the server (demo/showcase/mirror/traffic.py) and point the relay's TRAFFIC_DB at its database.",
    siteUpdated: (t) => `updated ${t}`, siteNote: "From Caddy's access log (kept seven days): counted by day; a visitor is a hash of address and browser under a salt made for that day. No addresses are stored.",
    sPages: "Page views", sVisitors: "Visitors", sBots: "Crawlers / monitors", sMirror: "Mirror downloads", sGithub: "GitHub downloads", sStars: "Stars", sPeriod: "this period", sDelta: (n) => (n > 0 ? `+${fmt(n)} this period` : n < 0 ? `${fmt(n)} this period` : "no change this period"),
    sFiles: "Files downloaded", sMirrorCol: "mirror", sGithubCol: "GitHub, all time", sRefs: "Referring sites", sTop: "Pages", sNone: "Nothing yet", sSince: (d) => `since ${d}`,
    mSignIns: "Sign-ins", mNew: "New accounts", mActive: "Active accounts", mInvites: "Signed up via invite", mContribute: "“Help improve” turned on", mCalls: "Calls", mRefused: "Refused: over budget", mErrors: "Upstream errors", mContentRejected: "Content check declined",
    devices: "Devices", devKinds: { phone: "phones", computer: "computers", web: "web" }, invitesTitle: "Invites", invitesLine: (f) => `${fmt(f.with_code)} made an invite code · ${fmt(f.inviters)} brought someone · ${fmt(f.invited)} came through one`,
    data: (d) => `Data controls · last ${d} days`, dOn: "Accounts with “help improve” on", dOnSub: (on, total) => `${fmt(total)} accounts · ${fmt(on)} on · ${fmt(Math.max(0, total - on))} off`, dOff: "Accounts that turned it off", dOffSub: "ever switched it off themselves", dTurns: "Kept turns", dTurnsSub: (all, acc) => `${fmt(all)} in all · from ${fmt(acc)} accounts`, dTokens: "Tokens in kept turns", dTokensSub: (i, o) => `${fmt(i)} in · ${fmt(o)} out`, dDefault: (on) => on ? "New accounts start with it on (IMPROVE_DEFAULT=1)" : "New accounts start with it off (IMPROVE_DEFAULT=0)", dKeeps: (k) => `Kept: ${k.kept.join(", ")}. Not kept: ${k.not_kept.join(", ")}.`,
    syTitle: "Conversation sync", syOn: "Accounts with sync on", syOnSub: (off) => `${fmt(off)} turned it off`, syWith: "Accounts with synced data", syConvs: "Conversations", syMsgs: "Messages", syMsgsSub: (limit) => `at most ${fmt(limit)} per account`, syBytes: "Text stored", syNote: "0.19: the text of conversations synced between an account's devices. User and assistant texts and attachment names and sizes only; no files, no images. Only totals are shown here, never a text; the relay deletes at once when the switch goes off or the person asks.",
    mTurns: "Kept turns", mTurnAccounts: "Accounts with turns kept", mOn: "Turned on", mDefaultOn: "On by default (new accounts)", mOff: "Turned off", mDeleted: "Deleted", dModels: "By model", dApps: "By app", dRecent: "Newest kept turns (open the account for all of them)", dPlatforms: { android: "Android", windows: "runtime on Windows", macos: "runtime on macOS", linux: "runtime on Linux", runtime: "runtime", browser: "browser", other: "other" },
    webTitle: "wevvy Web", webLine: (w) => (w ? `${fmt(w.accounts)} accounts with a Muse of their own (cap ${fmt(w.max_accounts)}) · ${fmt(w.running)} running (cap ${fmt(w.max_running)})` : "Not connected: set the relay's WEB_INFO_URL to the gateway's /api/web/info."), webOff: "wevvy Web is off",
    places: (d) => `Where from · last ${d} days`, placesNote: "Guessed from the address (ip2region's offline database: city level in China, country / state elsewhere); no third party is asked. It is where the network exit is; mobile data and proxies skew it.", placesOff: "The location database is not here yet: the relay fetches ip2region_v4.xdb (about 11 MB) into its data directory after start; CLOUD_GEOIP=0 turns this off.", placesFetching: "Fetching the location database…", placesError: (e) => `The location database could not be fetched: ${e}`,
    pCountry: "Country / region", pProvince: "Province / state", pAccounts: "Accounts", pNew: "New", pSignins: "Sign-ins", pRequests: "Requests", pDemo: "Demo visitors", pUnknown: "unknown", pLocal: "local network", pNone: "No visits recorded yet.", pAccountsNote: "accounts by their latest address",
    catalog: "Model catalog", catalogNote: "The models under the key beyond the menu: the relay asks each one a one-word question and then shows it a small magenta picture, to learn whether it answers and whether it sees; the answers stand for seven days. The “sees pictures” the apps show is what is here.", catalogOff: "The catalog is off (CLOUD_CATALOG=0).", catalogNames: "Guessed from names, not checked one by one (CLOUD_CATALOG_PROBE=0).", catalogProbing: "Checking…", catalogPending: (n) => `${fmt(n)} to check`, catalogFetched: (t) => `list read ${t}`, catalogError: (e) => `The list could not be read: ${e}`,
    cModel: "Model", cKind: "Kind", cSees: "Sees pictures", cVerified: "Checked", cYes: "yes", cNo: "no", cUnusable: "Models the provider refuses (not offered to the apps)", cNoUnusable: "None refused.", cCount: (n, v) => `${fmt(n)} chat models · ${fmt(v)} see pictures`,
    nav: { overview: "Overview", people: "People", invites: "Invites", places: "Places", money: "Spend", activity: "Activity", demo: "Demo", data: "Data", site: "Site", models: "Models", health: "Health", stats: "Stats", controls: "Controls", settings: "Settings" },
    ctl: {
      title: "Controls", note: "Each switch applies at once and survives a restart; who changed what, and when, is in the log below. A switch says exactly what turning it off does before it flips.",
      names: { free_allowance: "Free allowance", signups: "Sign-ups", cloud_service: "Cloud service", sync: "Conversation sync", hub: "Device hub" },
      what: {
        free_allowance: "Off: a limited account without a model key of its own is refused the models (HTTP 429, code allowance_exhausted with paused: true, and a message saying the allowance is paused). Members are unaffected; sign-in, devices and sync keep working.",
        signups: "Off: a phone number or e-mail address without an account is refused a code and a sign-in (HTTP 403, code signup_closed). Existing accounts sign in and work as before.",
        cloud_service: "Off: every API call but the health check, /v1/config and this console answers HTTP 503 (code service_paused); every hub socket is closed (4003 hub_paused). Nothing is deleted.",
        sync: "Off: conversation sync pushes and pulls answer HTTP 503 (code sync_paused); what is stored stays, each device keeps working on its own.",
        hub: "Off: the device hub refuses new sockets and closes the open ones (4003 hub_paused); /v1/devices answers 503. Each device keeps working on its own.",
      },
      confirm: (name, on, what) => `Turn ${name} ${on ? "on" : "off"}?\n\n${on ? "Everything it governs works again." : what}`,
      actor: "Your name", actorHint: "for the audit log", why: "Why (optional)", byLine: (who, t) => `${who} · ${t}`,
      rules: "Thresholds", rulesNote: "When the account count reaches N, do one thing. A rule fires once (checked as an account is made and once a minute); “re-arm” lets it fire again.",
      rThreshold: "Accounts reach", rAction: "Action", rEnabled: "Enabled", rLastFired: "Last fired", rNote: "Note", rAdd: "Add rule", rRearm: "Re-arm", rDelete: "Delete", rNever: "not yet", rFiredAt: (n, t) => `${t} · ${fmt(n)} accounts then`,
      rDeleteConfirm: "Delete this rule?", rNow: (n) => `${fmt(n)} accounts now`, rNext: (n) => `next threshold ${fmt(n)}`, rNone: "No rules yet", rCheck: "Check now",
      actions: { close_signups: "Close sign-ups", pause_allowance: "Pause the free allowance", pause_sync: "Pause conversation sync", notify: "E-mail the admin" },
      notifyOk: "Notices are configured (ADMIN_EMAIL + SMTP)", notifyNo: "Notices are not configured: set ADMIN_EMAIL and SMTP_HOST / SMTP_FROM in the environment", notifyTest: "Send a test", notifySent: "sent", notifyFailed: "not sent (see the log)",
      audit: "Audit log", aWhen: "When", aWho: "Who", aWhat: "What", aTarget: "Target", aDetail: "Detail", aNone: "Nothing yet",
      strip: (off) => (off.length ? `Off: ${off.join(", ")}` : "Every switch is on"), stripNext: (n, total) => `${fmt(total)} accounts · next threshold ${fmt(n)}`,
      saved: "Saved", failed: (e) => `Did not work: ${e}`, closed: (n) => `${fmt(n)} sockets closed`, turnOn: "Turn on", turnOff: "Turn off",
    },
    st: {
      title: "Stats", note: "Every figure says how it is computed (hover ⓘ). Days are UTC; the table shows your local date beside each. Every chart has a table and a CSV.",
      csv: "Download CSV", how: "How it is computed", rows: (n) => `${fmt(n)} rows`, none: "Nothing yet", utc: "UTC", local: "local", localTz: () => Intl.DateTimeFormat().resolvedOptions().timeZone || "local",
      showTable: "Table", hideTable: "Hide table", generated: (t) => `generated ${t}`,
    },
    gh: {
      title: "GitHub", refresh: "Refresh now", refreshing: "Reading…", lastOk: (t) => `last read ${t}`, never: "not read yet", error: (e) => `last attempt failed: ${e}`, off: "No repository configured: set GITHUB_REPO (owner/name) or REPO_URL in the environment",
      stars: "Stars", forks: "Forks", watchers: "Watchers", issues: "Open issues", downloads: "Downloads", newStars: "New stars", newDownloads: "New downloads", assets: "Downloads by file", platforms: "By platform", releases: "By release", token: "with GITHUB_TOKEN", noToken: "no token (60 requests an hour, plenty)",
      note: "Read once a day (at start and every 6 hours after; the day's last read stands) into the relay's database; when GitHub cannot be reached the last snapshot stays. “New” is the day's figure minus the previous snapshot's.",
      refreshed: (s, d) => `Refreshed: ${fmt(s)} stars · ${fmt(d)} downloads`,
    },
    seeAll: "See all", loadFailed: (e) => `Could not load: ${e}`, retry: "Try again",
    fRegion: "Region", fProvince: "Province / state", fCity: "City", fChannel: "Channel", fStatus: "Status", fActivity: "Activity", fSpend: "Spend", fClient: "Client", fSort: "Sort", fClear: "Clear filters", fAny: "Any", fCount: (n, t) => (n === t ? `${fmt(t)} accounts` : `${fmt(n)} of ${fmt(t)} accounts`),
    stat: { member: "members", disabled: "disabled", locked: "locked", password: "with a password", nopassword: "without a password", contributes: "“help improve” on", exhausted: "allowance used up", online: "a device online", new: "new this period" },
    act: { today: "last 24 h", "7d": "last 7 days", "30d": "last 30 days", older: "longer ago", never: "never used" },
    bucket: { 0: "¥0", lt1: "<¥1", "1to5": "¥1–5", "5to10": "¥5–10", ge10: "≥¥10" },
    sortBy: { active: "last active", joined: "joined", spent: "spent", today: "spent today", tokens: "tokens", requests: "requests", left: "left", region: "region", invites: "invites" },
    // 0.26: the search reaches further, and three more filters
    searchHint: "Several words, space-separated, must all match; press / on any page to start searching.", searchKeys: "Matches the number or e-mail, the account id, addresses, device names, client and version, region, the inviter and the invite code.",
    fJoined: "Joined", joinedIn: { today: "last 24 h", "7d": "last 7 days", "30d": "last 30 days", older: "longer ago" },
    fSource: "Came", cameVia: { invited: "through an invite", organic: "on their own", inviter: "brought someone" }, fVersion: "Version",
    // who invited whom: the Invites view and the account drawer's list
    invNote: "Who brought whom. Inviters in order of the accounts their code brought; open a row for the people it brought, a name for the account page.", invSearch: "Search inviters…", invNone: "Nobody has come through an invite yet.", invNoMatch: "No inviter matches.",
    invKpiCode: "accounts", invKpiInviters: "brought someone", invKpiInvited: "came through a code", invKpiActive: "of them used it", invKpiSameIp: "same address as the inviter",
    invThWho: "Inviter", invThInvited: "Brought", invThActive: "Used it", invThSameIp: "Same address", invThSpent: "They spent", invThEarned: "Earned", invThLast: "Latest",
    invSort: { invited: "brought", active: "used it", same_ip: "same address", spent: "they spent", earned: "earned", latest: "latest" },
    invRecorded: (n) => `recorded ${fmt(n)}`, invSameIp: "same address", invGone: "deleted", invSeeRanking: "see who brought whom", invMore: (n) => `${fmt(n)} more; the account page lists them all`,
    invSameIpNote: "“Same address” means an invitee's first or latest address is one of the inviter's own, which is what one person padding their own pool looks like; “recorded” is the invite counter, which does not go down when an invitee deletes their account. The invite bonus reaches both sides at the invitee's first charged request; “pending” counts the people who have not used it yet.",
    invitedList: (n) => `Brought · ${fmt(n)}`, invPill: (n) => `${fmt(n)} invited`, invEarnedLine: (m) => `${m} earned from invites`, invNewest: (n, total) => `the newest ${fmt(n)} of ${fmt(total)}`,
    invPending: (n) => `${fmt(n)} pending`, invPendingPill: "pending", invSettledPill: "paid",
    // the one-click abuse action: reclaim the invite credit, and what the two boxes add
    invAbuseDisable: "disable the account", invAbuseDelete: "delete the invited accounts that never used it", invAbuseGo: "Reclaim the invite credit",
    invAbuseConfirm: (who, amount, disable, del) => `Reclaim the invite credit of ${who}${amount ? ` (${amount} can be reclaimed; what was already spent stays)` : ""}?${disable ? "\nAlso disable the account: every device is cut off now and a new sign-in is refused." : ""}${del ? "\nAlso delete the accounts it brought that never made a request and never spent anything; this cannot be undone. The ones that used it stay." : ""}`,
    invAbuseDone: (r) => `Reclaimed ${r.reclaimed}${r.disabled ? ", account disabled" : ""}${r.deleted || r.kept ? `, ${fmt(r.deleted)} unused invited account(s) deleted, ${fmt(r.kept)} kept` : ""}.`,
    cSignups: "Sign-ups", cRegions: "By region", cRegionsIn: (c) => `${c} · by region`, cSpend: "By spend", cActivity: "By activity", cChannel: "By channel", cClients: "By client", cClickNote: "Every piece of a chart is a filter: click it to see only that, click again to let go.", up: "Up a level",
    thRegion: "Region", moreRows: (n) => `Show ${fmt(n)} more`, exportCsv: "Export CSV", csvNote: "The current selection as the table shows it, phone numbers and addresses included; keep the file to yourself.",
    byDayLabel: "by day", byWeekLabel: "by week",
    pMetric: "Count", pTopCountries: "Countries / regions", pTopProvinces: "Provinces / states", pRowHint: "Click a row to see only that region's accounts under People.",
    kindAll: "All kinds", mShare: "Where the money went", mTop: "Top accounts", mPrices: "Prices",
    aSearch: "Search hint / detail…", aCount: (n) => `${fmt(n)} events`,
    dPerDay: "Demos a day", dReasons: "Ended because", dReason: { idle: "idle", "time is up": "time was up", "ended by the visitor": "visitor ended it", "gateway stopping": "gateway restarted", "failed to start": "failed to start" }, dPlaces: "Visitors by place", dAll: "All", dRunning: "Running", dSigned: "Signed in", dAnon: "Not signed in", dByokOnly: "Own key",
    cSearch: "Search models…", cOnlyVision: "Only ones that see pictures",
    hOk: "All well", hProblems: "Needs a look", hInFlight: "Requests under way", hInFlightSub: (a, l) => `${fmt(a)} accounts · ${l > 0 ? `${l} per account at most` : "no limit"}`, hHub: "Device hub", hOnline: "Connections", hAccountsOnline: "Accounts online", hPending: "Calls awaiting a reply", hDropped: "Frames dropped", hFlood: "Closed for flooding", hLastHour: "Last hour", hRequests: "Requests", hUpstreamErrors: "Upstream errors", hContentRejected: "Content check declined", hRefused: "Refused: over budget", hSignIns: "Sign-ins", hFailures: "Failed sign-ins", hDb: "Database", hWritable: "writable", hNotWritable: "not writable", hUpstream: "Upstream key", hHave: "set", hMissing: "missing", hServerTime: "Server time", hAuto: "refreshes every 30 s", hNote: "The self-check timer on the server reads the same figures every ten minutes (journalctl -t wevvy-selfcheck); a problem that stays goes to ALERT_URL when one is set.",
  };

  const moneyN = (v) => { const c = Number(v || 0); return c >= 100 ? c.toFixed(0) : c >= 1 ? c.toFixed(2) : c > 0 && c < 0.01 ? c.toFixed(4) : c.toFixed(2); };
  const money = (cny) => `¥${moneyN(cny)}`;
  const usd = (cny, rate) => (rate > 0 ? `$${moneyN(Number(cny || 0) / rate)}` : "");
  const when = (ts) => (ts ? new Date(ts * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : T.never);
  const dateOf = (ts) => (ts ? new Date(ts * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : T.never);
  const day = (ts) => new Date(ts * 1000).toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
  const iso = (ts) => (ts ? new Date(ts * 1000).toISOString() : "");
  const nowS = () => Math.floor(Date.now() / 1000);
  const ago = (ts) => {
    if (!ts) return T.never;
    const s = Math.max(0, nowS() - ts);
    if (s < 90) return "just now"; if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`; return `${Math.floor(s / 86400)} d ago`;
  };
  const svg = (paths) => `<svg viewBox="0 0 24 24">${paths}</svg>`;
  const ICON = {
    chat: svg('<path d="M4 5.5h16v10H9l-5 4z"/>'),
    image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
    video: svg('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>'),
    realtime: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
    key: svg('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M15 5l3 3M18 4l2 2"/>'),
    in: svg('<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 8l5 4-5 4M14 12H3"/>'),
    out: svg('<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l5 4-5 4M20 12H9"/>'),
    warn: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>'),
    person: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>'),
    phone: svg('<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>'),
    computer: svg('<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 20.5h8M12 17v3.5"/>'),
    web: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    refresh: svg('<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    ok: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>'),
    download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  };
  const NAV_ICON = {
    overview: svg('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>'),
    people: ICON.person,
    invites: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M17.5 4v6M14.5 7h6"/>'),
    places: svg('<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
    money: svg('<circle cx="12" cy="12" r="9"/><path d="M9 8.5l3 4 3-4M12 12.5V17M9.5 14.5h5"/>'),
    activity: svg('<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>'),
    demo: ICON.phone,
    data: svg('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'),
    site: ICON.web,
    models: svg('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>'),
    stats: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    controls: svg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.5"/><circle cx="8" cy="17" r="2.5"/>'),
    health: svg('<path d="M20.8 9.5c0 5-8.8 10.5-8.8 10.5S3.2 14.5 3.2 9.5A4.6 4.6 0 0 1 12 6.9a4.6 4.6 0 0 1 8.8 2.6z"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
  };
  const EVENT_STYLE = {
    "account.created": ["ok", ICON.person], "sign_in.code": ["", ICON.in], "sign_in.password": ["", ICON.in], "sign_in.session": ["", ICON.key], "sign_in.failed": ["warn", ICON.warn],
    "password.set": ["violet", ICON.key], "password.changed": ["violet", ICON.key], "password.cleared": ["violet", ICON.key], "sign_out": ["grey", ICON.out], "sign_out.all": ["grey", ICON.out],
    "budget.refused": ["bad", ICON.warn], "upstream.error": ["bad", ICON.warn], "content.rejected": ["warn", ICON.warn], "call.ended": ["ok", ICON.realtime],
    "control.switch": ["warn", ICON.warn], "control.rule": ["warn", ICON.warn],
  };
  const FILTERS = [["", "all"], ["sign_in.code,sign_in.password,sign_in.session,sign_in.failed,account.created", "signIns"], ["budget.refused", "refusals"], ["upstream.error", "errors"], ["content.rejected", "contentChecks"], ["call.ended", "calls"], ["password.set,password.changed,password.cleared", "passwords"]];
  const VIEWS = ["overview", "people", "invites", "places", "money", "activity", "demo", "data", "site", "models", "health", "stats", "controls", "settings"];
  const PAGE = 50;

  // ── state ──────────────────────────────────────────────────────
  const SS = window.sessionStorage;
  let token = SS.getItem("nm.admin") || "";
  let ov = null, accounts = null, err = "", days = Number(SS.getItem("nm.admin.days") || 30), filter = "", filtered = null;
  let detail = null, detailErr = "";
  let view = "overview", params = new URLSearchParams();
  // every answer that shows addresses carries `places` ({ip: {country, province, city, text…}});
  // they are kept across answers so an address is named wherever it appears
  const PLACES = new Map();
  const mergePlaces = (j) => { if (j && j.places && typeof j.places === "object") for (const [ip, p] of Object.entries(j.places)) PLACES.set(ip, p); return j; };
  const placeOf = (ip) => PLACES.get(ip) || null;
  const placeText = (p) => (!p ? "" : p.local ? T.pLocal : p.text || "");

  const app = document.getElementById("app");
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v; else if (k.startsWith("on")) { if (v) el.addEventListener(k.slice(2), v); }
      else if (k === "html") el.innerHTML = v; else if (v !== null && v !== undefined) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  };

  const CTL_ACTOR_KEY = "nm.admin.actor";
  const actorName = () => SS.getItem(CTL_ACTOR_KEY) || "";
  async function api(method, path, body) {
    const r = await fetch(path, {
      // X-Admin-Actor (0.22): the name typed on the Controls page, for the audit log
      method, headers: { "X-Admin-Token": token, ...(actorName() ? { "X-Admin-Actor": actorName() } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => { throw new Error(T.offline); });
    if (r.status === 401) { token = ""; SS.removeItem("nm.admin"); err = T.wrong; draw(); throw new Error("admin"); }
    if (r.status === 204) return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || r.statusText);
    return mergePlaces(j);
  }

  // ── routing: #view?filters ─────────────────────────────────────
  function route() {
    const [v, qs = ""] = location.hash.replace(/^#/, "").split("?");
    view = VIEWS.includes(v) ? v : "overview";
    params = new URLSearchParams(qs);
  }
  const hashFor = (v, p) => { const qs = p ? new URLSearchParams(p).toString() : ""; return `#${v}${qs ? "?" + qs : ""}`; };
  function go(v, p) { location.hash = hashFor(v, p); }
  /** A filter change within the current view: the hash follows (reload keeps it), history does not pile up. */
  function setParams(patch) {
    for (const [k, v] of Object.entries(patch)) { if (v === "" || v === null || v === undefined || v === false) params.delete(k); else params.set(k, String(v)); }
    history.replaceState(null, "", hashFor(view, params));
    draw();
  }
  // 0.26: a new view closes the account drawer; it used to stay over the next page
  window.addEventListener("hashchange", () => { closeDrawer(); route(); draw(); });
  // 0.26: "/" puts the cursor in the page's search box; on a page without one it opens People
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || !token || !ov || drawerEl) return;
    const tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) return;
    e.preventDefault();
    if (!app.querySelector(".search input")) { location.hash = "#people"; route(); draw(); }
    const box = app.querySelector(".search input");
    if (box) { box.focus(); box.select(); }
  });

  // ── data: the core at once, the rest when a view asks ──────────
  const SOURCES = {
    usage: (d) => `/v1/admin/usage?days=${Math.min(d, 90)}`,
    series: (d) => `/v1/admin/series?days=${d}`,
    traffic: (d) => `/v1/admin/traffic?days=${d}`,
    data: (d) => `/v1/admin/data?days=${d}`,
    demo: (d) => `/v1/admin/demo?days=${d}`,
    places: (d) => `/v1/admin/places?days=${d}`,
    invites: () => "/v1/admin/invites?limit=500&per=20",
    catalog: () => "/v1/admin/catalog",
    health: () => "/v1/admin/health",
    nudges: () => "/v1/admin/nudges",
    sync: () => "/v1/admin/sync",
    // 0.22
    controls: () => "/v1/admin/controls",
    stats: (d) => `/v1/admin/stats?days=${d}`,
    github: (d) => `/v1/admin/github?days=${d}`,
  };
  const TIMELESS = new Set(["catalog", "health", "nudges", "sync", "controls", "invites"]);
  const CACHE = new Map();
  const cacheKey = (key) => `${key}:${TIMELESS.has(key) ? 0 : days}`;
  /** The view's data, or null while it is on its way (the view draws again when it lands);
      `{_error}` when the relay would not give it. */
  function need(key) {
    const k = cacheKey(key);
    const c = CACHE.get(k);
    if (c) return c.value === undefined ? null : c.value;
    const entry = {};
    CACHE.set(k, entry);
    api("GET", SOURCES[key](days)).then((v) => { entry.value = v || {}; }, (e) => { entry.value = { _error: e.message }; }).then(() => draw());
    return null;
  }
  const forget = (key) => CACHE.delete(cacheKey(key));

  async function load() {
    try {
      [ov, accounts] = await Promise.all([api("GET", `/v1/admin/overview?days=${days}`), api("GET", "/v1/admin/accounts")]);
      IDENT.clear();
      for (const a of (accounts && accounts.accounts) || []) if (a.identifier) IDENT.set(a.id, a.identifier);
      err = "";
    } catch (e) {
      if (e.message !== "admin") err = e.message;
    }
    CACHE.clear();
    filtered = null;
    feedMore = []; feedEnd = false;
    if (filter) loadFiltered(); else draw();
  }
  async function loadFiltered() {
    feedMore = []; feedEnd = false;
    if (!filter) { filtered = null; draw(); return; }
    try { filtered = (await api("GET", `/v1/admin/events?limit=200&kind=${encodeURIComponent(filter)}`)).events; } catch (_) { filtered = []; }
    draw();
  }
  // 0.26: the Activity feed reads on past its first page, 200 rows at a time, with the kind filter kept
  let feedMore = [], feedEnd = false, feedBusy = false;
  const feedRows = () => ((filter ? filtered : ov && ov.events) || []).concat(feedMore);
  async function loadFeedMore() {
    const rows = feedRows(), last = rows.length ? rows[rows.length - 1].id : 0;
    if (!last || feedBusy) return;
    feedBusy = true; draw();
    try { const more = (await api("GET", `/v1/admin/events?limit=200&kind=${encodeURIComponent(filter)}&before=${last}`)).events || []; feedMore = feedMore.concat(more); if (more.length < 200) feedEnd = true; }
    catch (_) { feedEnd = true; }
    feedBusy = false; draw();
  }
  setInterval(() => { if (view === "health" && token && ov && !drawerEl) { forget("health"); draw(); } }, 30_000);

  // ── gate ───────────────────────────────────────────────────────
  function drawGate() {
    const input = h("input", { type: "password", autocomplete: "off", spellcheck: "false", placeholder: "…" });
    const go = async () => { token = input.value.trim(); if (!token) return; SS.setItem("nm.admin", token); err = ""; await load(); };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    app.replaceChildren(h("div", { class: "signin admin" },
      h("div", { class: "card rise" },
        h("div", { class: "disc" }, h("img", { src: "../mark.svg", alt: "" })),
        h("h1", {}, T.title),
        h("p", { class: "sub" }, location.host),
        h("div", { class: "field" }, h("label", {}, T.tokenLabel), h("div", { class: "in" }, input)),
        h("button", { class: "btn", onclick: go }, T.enter),
        h("div", { class: "hint" + (err ? " bad" : "") }, err || T.tokenHint),
      )));
    input.focus();
  }

  // ── pieces ─────────────────────────────────────────────────────
  const who = (a) => a.identifier || a.hint || (a.id || "").slice(0, 8);
  // 0.22: the console shows accounts in full — rows from endpoints that only carry the
  // masked hint (events, samples, demo visits) look the identifier up in the loaded list
  const IDENT = new Map();
  const identOf = (id, hint) => (id && IDENT.get(id)) || hint || "";
  const initial = (a) => ((a.hint || a.identifier || "?").replace(/[^0-9a-z]/gi, "").slice(0, 1).toUpperCase() || "?");
  const settings = () => (ov && ov.settings) || {};
  const kindAmount = (r) => {
    const k = r.kind || "chat";
    if (k === "realtime" || k === "video") return T.seconds(r.charged);
    if (k === "image") return T.pictures(r.requests);
    return T.tokens(r.charged);
  };
  function kindRows(rows, rate) {
    if (!rows || !rows.length) return h("div", { class: "empty" }, T.none);
    return rows.map((r) => h("div", { class: "usage-row" },
      h("div", { class: "k" }, h("i", { class: r.kind || "chat" }), T.kinds[r.kind] || r.kind),
      h("span", { class: "n" }, `${T.reqs(r.requests)} · ${kindAmount(r)}${r.kind === "chat" && (r.prompt_tokens || r.completion_tokens) ? ` · ${T.inOut(r.prompt_tokens, r.completion_tokens)}` : ""}`),
      h("span", { class: "c", title: usd(r.cost_cny, rate) }, money(r.cost_cny))));
  }
  function modelRows(rows, rate, kinds) {
    if (!rows || !rows.length) return h("div", { class: "empty" }, T.none);
    return rows.map((r) => h("div", { class: "usage-row" },
      h("div", { class: "k" }, h("i", { class: (kinds && kinds[r.model]) || r.kind || "chat" }), h("code", {}, r.model)),
      h("span", { class: "n" }, `${T.reqs(r.requests)}${r.charged ? " · " + fmt(r.charged) : ""}`),
      h("span", { class: "c", title: usd(r.cost_cny, rate) }, money(r.cost_cny))));
  }
  /** Stacked bars, one column per local day, a segment per kind. `rows` are {day, kind, cost_cny}. */
  function dayBars(rows, n, offsetH, rate) {
    const offset = Number(offsetH || 0) * 3600;
    const byDay = new Map();
    for (const r of rows || []) {
      const d = byDay.get(r.day) || { day: r.day, cost: 0, parts: {}, lines: [] };
      d.cost += r.cost_cny || 0; d.parts[r.kind] = (d.parts[r.kind] || 0) + (r.cost_cny || 0);
      d.lines.push(`${T.kinds[r.kind] || r.kind} ${money(r.cost_cny)} · ${T.reqs(r.requests)}${r.charged ? " · " + fmt(r.charged) : ""}`);
      byDay.set(r.day, d);
    }
    const t = nowS();
    const start = t - ((t + offset) % 86400) - (n - 1) * 86400;
    const cols = [];
    for (let i = 0; i < n; i++) { const k = start + i * 86400; cols.push(byDay.get(k) || { day: k, cost: 0, parts: {}, lines: [] }); }
    const max = Math.max(0.0001, ...cols.map((d) => d.cost));
    const every = n > 45 ? 7 : n > 20 ? 3 : 1;
    return h("div", {}, h("div", { class: "bars" }, ...cols.map((d, i) => h("div", { class: "col", title: `${day(d.day)} · ${money(d.cost)} ${usd(d.cost, rate)}\n${d.lines.join("\n")}` },
      ...["realtime", "video", "image", "chat"].filter((k) => d.parts[k] > 0).map((k) => h("div", { class: "seg-bar " + k, style: `height:${Math.max(1, Math.round(84 * d.parts[k] / max))}px` })),
      d.cost <= 0 ? h("div", { class: "seg-bar", style: "height:1px;background:var(--hairline)" }) : null,
      i % every === 0 ? h("div", { class: "lbl" }, day(d.day)) : null))),
      h("div", { class: "bars-x" }),
      h("div", { class: "legend" }, ...["chat", "image", "video", "realtime"].map((k) => h("span", {}, h("i", { class: k }), T.kinds[k]))));
  }
  /** One metric across the period: its total, then a tiny bar per day (hover for the day and the count). */
  function sparkRow(label, cols, key, tone, dayOf) {
    const values = cols.map((c) => Number(c[key] || 0));
    const max = Math.max(1, ...values), total = values.reduce((a, b) => a + b, 0);
    return h("div", { class: "spark" },
      h("span", { class: "k" }, label), h("b", {}, fmt(total)),
      h("div", { class: "bars-mini" }, ...values.map((v, i) => h("i", { class: v > 0 ? tone : "z", style: `height:${v > 0 ? Math.max(2, Math.round(22 * v / max)) : 1}px`, title: `${dayOf(cols[i])} · ${fmt(v)}` }))));
  }
  const sizeOf = (b) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(0)} MB` : `${Math.round(b / 1e3)} kB`);
  function rankRows(items, unit) {
    if (!items || !items.length) return h("div", { class: "empty" }, T.sNone);
    const max = Math.max(1, ...items.map((x) => x.hits));
    return h("div", { class: "ranks" }, ...items.slice(0, 12).map((x) => h("div", { class: "rank", title: x.bytes ? sizeOf(x.bytes) : "" },
      h("span", { class: "n" }, x.name), h("i", { style: `width:${Math.round(100 * x.hits / max)}%` }), h("b", {}, unit ? unit(x) : fmt(x.hits)))));
  }
  const kpi = (k, v, sub, small) => h("div", { class: "kpi" }, h("div", { class: "k" }, k), h("div", { class: "v" }, v, small ? h("small", {}, small) : null), sub ? h("div", { class: "s", title: typeof sub === "string" ? sub : "" }, sub) : null);
  const flatKpi = (k, v, sub) => h("div", { class: "kpi flat" }, h("div", { class: "k" }, k), h("div", { class: "v" }, v), sub ? h("div", { class: "s" }, sub) : null);

  // 0.14: charts that filter. Vertical bars, horizontal ranks and one segmented bar — each
  // piece carries `on` (it is the current filter) and `onclick` (make it the filter, or let go).
  const labelEvery = (n) => (n > 45 ? 15 : n > 20 ? 7 : n > 10 ? 3 : 1);
  function vbars(items, tone) {
    const max = Math.max(1, ...items.map((x) => x.value));
    return h("div", {}, h("div", { class: "vbars" }, ...items.map((x) => h("div", { class: "vb" + (x.on ? " on" : "") + (x.onclick ? " tap" : ""), title: x.title || `${x.label} · ${fmt(x.value)}`, onclick: x.onclick || null },
      h("i", { class: "tone-" + (x.tone || tone || "blue"), style: `height:${x.value > 0 ? Math.max(3, Math.round(100 * x.value / max)) : 1}%` })))),
      h("div", { class: "vlabels" }, ...items.map((x) => h("span", {}, x.label))));
  }
  function hranks(items, opts = {}) {
    if (!items.length) return h("div", { class: "empty sm" }, T.none);
    const max = Math.max(1, ...items.map((x) => x.value));
    return h("div", { class: "ranks" }, ...items.map((x) => h("div", { class: "rank" + (x.onclick ? " tap" : "") + (x.on ? " on" : ""), onclick: x.onclick || null, title: x.title || "" },
      h("span", { class: "n" + (opts.mono ? "" : " txt") }, x.name), h("i", { class: "tone-" + (x.tone || opts.tone || "blue"), style: `width:${Math.max(1, Math.round(100 * x.value / max))}%` }), h("b", {}, opts.format ? opts.format(x.value) : fmt(x.value)))));
  }
  function split(parts, format) {
    const total = parts.reduce((a, p) => a + p.value, 0);
    const show = format || fmt;
    if (!total) return h("div", { class: "empty sm" }, T.none);
    return h("div", {}, h("div", { class: "split" }, ...parts.filter((p) => p.value > 0).map((p) => h("i", { class: "tone-" + p.tone + (p.on ? " on" : ""), style: `width:${100 * p.value / total}%`, title: `${p.label} · ${show(p.value)} · ${Math.round(100 * p.value / total)}%`, onclick: p.onclick || null }))),
      h("div", { class: "split-legend" }, ...parts.map((p) => h("span", { class: (p.on ? "on" : "") + (p.onclick ? " tap" : ""), onclick: p.onclick || null }, h("i", { class: "tone-" + p.tone }), `${p.label} ${show(p.value)}`))));
  }
  const chart = (title, total, body, note) => h("div", { class: "chart" }, h("h4", {}, ...(Array.isArray(title) ? title : [title]), total !== undefined && total !== null ? h("b", {}, total) : null), body, note ? h("div", { class: "fine", style: "margin-top:6px" }, note) : null);
  const chips = (items, value, onpick) => h("div", { class: "filter" }, ...items.map(([v, text]) => h("button", { class: String(v) === String(value) ? "on" : "", onclick: () => onpick(v) }, text)));
  const select = (label, value, options, onchange) => {
    const sel = h("select", { onchange: (e) => onchange(e.target.value) }, ...options.map(([v, text, count]) => h("option", { value: v }, count !== undefined ? `${text} (${fmt(count)})` : text)));
    sel.value = String(value);
    if (sel.value !== String(value)) sel.selectedIndex = 0;
    return h("label", { class: "sel" }, label, sel);
  };
  const panel = (title, ...body) => h("div", { class: "panel" }, title ? h("h2", {}, ...(Array.isArray(title) ? title : [title])) : null, ...body);
  const loadingPanel = (title) => panel(title, h("div", { class: "empty" }, T.loading));
  const failedPanel = (title, key, e) => panel(title, h("div", { class: "empty" }, T.loadFailed(e), " ", h("button", { class: "btn quiet sm", onclick: () => { forget(key); draw(); } }, T.retry)));
  const seeAll = (v, p) => h("a", { class: "fine more-link", href: hashFor(v, p) }, `${T.seeAll} →`);

  /** The site: what wevvy-traffic counted from the access log, next to GitHub's own numbers. */
  function sitePanel(tr) {
    if (!tr.available) return panel(T.site(days), h("div", { class: "empty" }, T.siteOff));
    const rows = tr.days || [], gh = tr.github || {}, ghDays = gh.days || [];
    const sum = (k) => rows.reduce((a, r) => a + Number(r[k] || 0), 0);
    const first = ghDays[0], last = ghDays[ghDays.length - 1];
    const delta = (k) => (first && last ? Number(last[k]) - Number(first[k]) : 0);
    const dayOf = (r) => r.day.slice(5).replace("-", "/");
    const ghAssets = Object.assign({}, ...Object.values(gh.assets || {}));
    return h("div", { class: "panel" },
      h("h2", {}, T.site(days), h("span", { class: "sp" }), tr.updated_at ? h("span", { class: "fine" }, T.siteUpdated(when(tr.updated_at))) : null),
      h("div", { class: "kpis in-panel" },
        flatKpi(T.sPages, fmt(sum("pages")), T.sPeriod), flatKpi(T.sVisitors, fmt(sum("visitors")), T.sPeriod), flatKpi(T.sMirror, fmt(sum("downloads")), sizeOf(rows.reduce((a, r) => a + Number(r.bytes || 0), 0))),
        flatKpi(T.sGithub, fmt(gh.downloads || 0), T.sDelta(delta("downloads"))), flatKpi(T.sStars, fmt(gh.stars || 0), T.sDelta(delta("stars"))), flatKpi(T.sBots, fmt(sum("bots")), T.sPeriod)),
      rows.length ? h("div", { class: "sparks" },
        sparkRow(T.sPages, rows, "pages", "blue", dayOf), sparkRow(T.sVisitors, rows, "visitors", "cyan", dayOf), sparkRow(T.sMirror, rows, "downloads", "violet", dayOf)) : h("div", { class: "empty" }, T.sNone),
      h("div", { class: "cols3" },
        h("div", {}, h("h3", {}, T.sFiles, h("span", { class: "fine" }, ` · ${T.sMirrorCol} / ${T.sGithubCol}`)), rankRows(tr.downloads, (x) => `${fmt(x.hits)}${ghAssets[x.name] !== undefined ? ` / ${fmt(ghAssets[x.name])}` : ""}`)),
        h("div", {}, h("h3", {}, T.sRefs), rankRows(tr.referrers)),
        h("div", {}, h("h3", {}, T.sTop), rankRows(tr.pages))),
      h("div", { class: "fine", style: "padding:0 16px 12px" }, T.siteNote));
  }
  /** Data controls, for the operator: who has “help improve” on, what was kept — by day, model and app — the switches turned on and off, and the newest turns. */
  function dataPanel(dv) {
    const rows = dv.days || [], acc = dv.accounts || {}, tot = dv.totals || {}, per = dv.period || {};
    const dayOf = (r) => day(r.day);
    const pct = acc.total ? `${Math.round((acc.share || 0) * 100)}%` : "–";
    const ranks = (items, name, value) => items && items.length ? (() => { const max = Math.max(1, ...items.map(value)); return h("div", { class: "ranks" }, ...items.slice(0, 12).map((x) => h("div", { class: "rank" }, h("span", { class: "n" }, name(x)), h("i", { style: `width:${Math.round(100 * value(x) / max)}%` }), h("b", {}, fmt(value(x)))))); })() : h("div", { class: "empty" }, T.none);
    const recent = (dv.recent || []).map((smp) => sampleRow(smp, { who: true }));
    const byAccount = dv.by_account || [];
    // 0.26: the by-account table searches by account, id or model, several words at once
    const bq = terms(params.get("bq"));
    const shownAccounts = bq.length ? byAccount.filter((x) => matches([identOf(x.account_id, x.hint), x.hint, x.account_id, ...(x.models || [])].filter(Boolean).join(" ").toLowerCase(), bq)) : byAccount;
    const accountRows = shownAccounts.map((x) => h("tr", { onclick: () => openAccount(x.account_id) },
      h("td", {}, h("div", { class: "who" }, h("div", { class: "disc" }, initial(x)), h("div", { style: "min-width:0" }, h("div", { class: "n" }, identOf(x.account_id, x.hint) || x.account_id.slice(0, 8)), h("div", { class: "tags" }, h("span", { class: "pill" }, x.channel === "phone" ? T.phone : T.email), h("span", { class: "pill " + (x.contribute ? "cyan" : "") }, x.contribute ? T.bOn : T.bOff))))),
      h("td", { class: "num" }, fmt(x.samples)),
      h("td", { class: "num hide-sm" }, `${fmt(x.prompt_tokens)} / ${fmt(x.completion_tokens)}`),
      h("td", { class: "hide-sm" }, when(x.first_ts)), h("td", {}, when(x.last_ts)),
      h("td", { class: "hide-sm" }, ...(x.models || []).map((m) => h("code", { style: "margin-right:6px" }, m)))));
    return h("div", { class: "panel" },
      h("h2", {}, T.data(days), h("span", { class: "sp" }), h("span", { class: "fine" }, T.dDefault(!!dv.default_on)), tot.samples ? h("button", { class: "btn quiet sm", style: "margin-left:10px", onclick: () => exportSamples() }, T.exportSamples) : null),
      h("div", { class: "kpis in-panel" },
        flatKpi(T.dOn, `${fmt(acc.on || 0)} · ${pct}`, T.dOnSub(acc.on || 0, acc.total || 0)), flatKpi(T.dOff, fmt(acc.turned_off_ever || 0), T.dOffSub),
        flatKpi(T.dTurns, fmt(per.samples || 0), T.dTurnsSub(tot.samples || 0, acc.with_samples || 0)), flatKpi(T.dTokens, fmt((per.prompt_tokens || 0) + (per.completion_tokens || 0)), T.dTokensSub(per.prompt_tokens || 0, per.completion_tokens || 0))),
      rows.length ? h("div", { class: "sparks" },
        sparkRow(T.mTurns, rows, "samples", "violet", dayOf), sparkRow(T.mTurnAccounts, rows, "accounts", "cyan", dayOf), sparkRow(T.mOn, rows, "turned_on", "ok", dayOf),
        sparkRow(T.mDefaultOn, rows, "default_on", "blue", dayOf), sparkRow(T.mOff, rows, "turned_off", "warn", dayOf), sparkRow(T.mDeleted, rows, "deleted", "warn", dayOf)) : null,
      h("div", { class: "cols3" },
        h("div", {}, h("h3", {}, T.dModels), ranks(dv.by_model, (x) => x.model, (x) => x.samples)),
        h("div", {}, h("h3", {}, T.dApps), ranks(dv.by_platform, (x) => T.dPlatforms[x.platform] || x.platform, (x) => x.samples)),
        h("div", {}, h("h3", {}, T.dRecent), recent.length ? h("div", { class: "list", style: "max-height:380px;overflow:auto" }, ...recent) : h("div", { class: "empty" }, T.noSamples))),
      h("div", { class: "subhead" }, h("h3", {}, T.byAccount, h("span", { class: "pill", style: "margin-left:8px" }, bq.length ? `${fmt(accountRows.length)} / ${fmt(byAccount.length)}` : byAccount.length)),
        byAccount.length ? h("span", { class: "search" }, h("input", { type: "search", "data-focus": "data-q", placeholder: T.bSearch, value: params.get("bq") || "", oninput: (e) => setParams({ bq: e.target.value }) })) : null),
      accountRows.length ? h("div", { class: "ledger", style: "padding:0 16px 8px" }, h("table", {}, h("thead", {}, h("tr", {},
        h("th", {}, T.bHint), h("th", { class: "num" }, T.bTurns), h("th", { class: "num hide-sm" }, T.bTokens), h("th", { class: "hide-sm" }, T.bFirst), h("th", {}, T.bLast), h("th", { class: "hide-sm" }, T.bModels))),
        h("tbody", {}, ...accountRows))) : h("div", { class: "empty" }, byAccount.length ? T.none : T.noByAccount),
      h("div", { class: "fine", style: "padding:0 16px 12px" }, dv.keeps ? T.dKeeps(dv.keeps) : "", " ", T.samplesNote));
  }
  /** One demo on the phone in the browser: when, how long, from where and with what, what it used, why it ended. */
  function visitRow(v, withWho) {
    const running = !v.ended;
    const length = (v.ended || Date.now() / 1000) - v.started;
    return h("div", { class: "row" + (withWho && v.visitor ? " tap" : ""), onclick: withWho && v.visitor ? () => openAccount(v.visitor) : null },
      h("span", { class: "tile " + (running ? "ok" : "grey"), html: ICON.web }),
      h("div", { class: "txt" }, h("div", { class: "t" }, when(v.started), withWho ? [" · ", v.hint ? h("span", { style: "color:var(--ink-2);font-weight:400" }, identOf(v.account_id, v.hint)) : h("span", { class: "pill" }, T.dtAnon)] : null,
        running ? [" ", h("span", { class: "pill ok" }, T.dtRunning)] : null, v.byok ? [" ", h("span", { class: "pill violet" }, T.dtByok)] : null),
        h("div", { class: "s" }, [`${T.dtLength} ${T.dur(length)}`, T.usedLine(v), v.reason ? `${T.dtWhy} ${v.reason}` : "", v.ua ? (platformOf(v.ua) === "browser" ? browserOf(v.ua) : clientLine(v.ua)) : ""].filter(Boolean).join(" · "), v.ip ? [" · ", ipChip(v.ip, v.visitor)] : null)),
      h("code", { class: "fine" }, v.id));
  }
  const browserOf = (ua) => { ua = String(ua || ""); const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : ""; const b = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : ""; return [os, b].filter(Boolean).join(" ") || ua.split(" ")[0]; };
  /** 0.11: the models under the key and what the probes found; 0.14: searched and narrowed to the ones that see. */
  function catalogPanel(cv) {
    const title = h("h2", {}, T.catalog);
    if (!cv.enabled) return h("div", { class: "panel" }, title, h("div", { class: "empty" }, T.catalogOff));
    const q = (params.get("q") || "").toLowerCase(), onlyVision = params.get("v") === "1";
    const all = (cv.models || []).filter((m) => m.kind === "chat"), others = (cv.models || []).filter((m) => m.kind !== "chat");
    const chat = all.filter((m) => (!q || m.id.toLowerCase().includes(q)) && (!onlyVision || m.vision));
    const tick = (v) => h("span", { class: "pill " + (v ? "ok" : "grey") }, v ? T.cYes : T.cNo);
    const note = [cv.error ? T.catalogError(cv.error) : "", cv.fetched_at ? T.catalogFetched(when(cv.fetched_at)) : "", !cv.probe ? T.catalogNames : cv.probing ? T.catalogProbing : "", cv.probe && cv.pending ? T.catalogPending(cv.pending) : ""].filter(Boolean).join(" · ");
    const rows = chat.sort((a, b) => a.id.localeCompare(b.id)).map((m) => h("tr", {}, h("td", {}, h("code", {}, m.id)), h("td", {}, tick(m.vision)), h("td", { class: "hide-sm" }, cv.probe ? tick(m.verified) : h("span", { class: "fine" }, "·"))));
    return h("div", { class: "panel" }, title,
      h("div", { class: "toolbar" },
        h("span", { class: "search" }, h("input", { type: "search", "data-focus": "models-q", placeholder: T.cSearch, value: params.get("q") || "", oninput: (e) => setParams({ q: e.target.value }) })),
        h("button", { class: "chip" + (onlyVision ? " on" : ""), onclick: () => setParams({ v: onlyVision ? "" : "1" }) }, T.cOnlyVision),
        h("span", { class: "cnt" }, T.cCount(all.length, all.filter((m) => m.vision).length), note ? ` · ${note}` : "")),
      rows.length ? h("div", { class: "ledger", style: "max-height:520px;overflow:auto" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, T.cModel), h("th", {}, T.cSees), h("th", { class: "hide-sm" }, T.cVerified))), h("tbody", {}, ...rows))) : h("div", { class: "empty" }, T.none),
      others.length ? h("div", { class: "fine", style: "padding:10px 16px 0" }, ...others.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id)).map((m) => h("span", { class: "pill", style: "margin:2px 4px 2px 0" }, `${T.kinds[m.kind] || m.kind} · ${m.id}`))) : null,
      h("h3", { style: "margin:12px 16px 0" }, T.cUnusable),
      (cv.unusable || []).length ? h("div", { class: "list" }, ...cv.unusable.map((u) => h("div", { class: "row" }, h("span", { class: "tile bad", html: ICON.warn }), h("div", { class: "txt" }, h("div", { class: "t" }, h("code", {}, u.id)), h("div", { class: "s" }, u.note || "", u.checked_at ? ` · ${when(u.checked_at)}` : ""))))) : h("div", { class: "fine", style: "padding:6px 16px" }, T.cNoUnusable),
      h("div", { class: "fine", style: "padding:8px 16px 12px" }, T.catalogNote));
  }
  const platformOf = (ua) => { ua = String(ua || ""); if (ua.startsWith("wevvy-Android")) return "android"; if (ua.startsWith("wevvy/")) { const m = /\(([^)]*)\)/.exec(ua); return { windows: "windows", darwin: "macos", linux: "linux" }[(m ? m[1] : "").toLowerCase()] || "runtime"; } return ua.startsWith("Mozilla/") ? "browser" : "other"; };
  const versionOf = (ua) => { const m = /^wevvy(?:-Android)?\/([0-9][^\s(]*)/.exec(String(ua || "")); return m ? m[1] : ""; };
  const clientLine = (ua) => { if (!ua) return ""; const p = T.dPlatforms[platformOf(ua)] || ""; const v = versionOf(ua); return [p, v ? `v${v}` : ""].filter(Boolean).join(" "); };
  // an address, and where it is when the relay knows (0.11) — one click opens every account seen from it
  const ipChip = (ip, fromAccount) => {
    if (!ip) return null;
    const p = placeOf(ip), txt = placeText(p);
    const chip = h("code", { class: "ip tap", title: T.atAddress(ip), onclick: (e) => { e.stopPropagation(); openAddress(ip, fromAccount); } }, ip);
    return txt ? h("span", { class: "ipp" }, chip, h("span", { class: "place", title: p.isp || "" }, txt)) : chip;
  };
  /** Everything a kept message holds, in order: text parts, omitted parts named, tool calls with their arguments. */
  const msgText = (m) => !m ? "" : typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.map((p) => p && p.type === "text" ? p.text : p && p.omitted ? `[${p.type} ${T.omitted}]` : "").filter(Boolean).join("\n") : "";
  function messageBlock(m) {
    const role = (m && m.role) || "?";
    const parts = [h("b", { class: "role " + role }, (T.roles[role] || role) + ": ")];
    const txt = msgText(m);
    if (m && m.omitted && !txt) parts.push(h("i", { class: "fine" }, T.omitted)); else parts.push(txt);
    for (const c of Array.isArray(m && m.tool_calls) ? m.tool_calls : []) {
      const f = c && c.function ? c.function : {};
      parts.push(h("div", { class: "toolcall" }, h("span", { class: "pill violet" }, T.toolCall), " ", h("code", {}, f.name || ""), f.arguments ? h("pre", {}, typeof f.arguments === "string" ? f.arguments : JSON.stringify(f.arguments, null, 1)) : null));
    }
    return h("div", { class: "msg " + role }, ...parts);
  }
  /** One kept turn: the header line, then the last thing the person said and the reply in full — and the
      whole exchange (every message, every tool call) when expanded. `who` adds the account's hint and a tap into it. */
  function sampleRow(smp, opts = {}) {
    const msgs = Array.isArray(smp.request) ? smp.request : [];
    const lastUser = [...msgs].reverse().find((m) => m && m.role === "user");
    const meta = smp.meta || {};
    let open = false;
    const body = h("div", {});
    const toggle = h("button", { class: "btn quiet sm", style: "margin-top:6px", onclick: (e) => { e.stopPropagation(); open = !open; paint(); } });
    const paint = () => {
      toggle.textContent = open ? T.collapse : `${T.expand} · ${T.lengthNote(msgs.length + 1)}`;
      body.replaceChildren(...(open
        ? [...msgs.map(messageBlock), messageBlock({ role: "assistant", content: String(smp.response || "") })]
        : [messageBlock({ role: "user", content: msgText(lastUser) }), messageBlock({ role: "assistant", content: String(smp.response || "") })]));
    };
    paint();
    const head = h("div", { class: "s" }, when(smp.ts), opts.who && smp.hint ? [" · ", h("span", { class: "tap", onclick: (e) => { e.stopPropagation(); openAccount(smp.account_id); } }, identOf(smp.account_id, smp.hint))] : null,
      " · ", h("code", {}, smp.model || ""), ` · ${T.inOut(smp.prompt_tokens, smp.completion_tokens)}`, meta.ua ? ` · ${clientLine(meta.ua) || String(meta.ua).split(" ")[0]}` : "", meta.lang ? ` · ${meta.lang}` : "", meta.ip ? [" · ", ipChip(meta.ip, smp.account_id)] : null, smp.cut ? " · cut" : "");
    return h("div", { class: "row sample", style: "align-items:flex-start" }, h("div", { class: "txt", style: "white-space:pre-wrap;word-break:break-word;min-width:0" }, head, body, toggle));
  }
  /** The relay's own series: sign-ins, accounts, invites, the data switch, calls — and the devices and wevvy Web as they stand. */
  function trendsPanel(sr) {
    const rows = sr.days || [];
    const dayOf = (r) => day(r.day);
    const dev = sr.devices || [];
    const byKind = {};
    for (const d of dev) { const k = byKind[d.kind] || (byKind[d.kind] = { n: 0, os: [] }); k.n += d.count; k.os.push(`${d.os || "?"} ${fmt(d.count)}`); }
    return h("div", { class: "panel" },
      h("h2", {}, T.trends(days)),
      h("div", { class: "sparks" },
        sparkRow(T.mSignIns, rows, "sign_ins", "blue", dayOf), sparkRow(T.mNew, rows, "new_accounts", "ok", dayOf), sparkRow(T.mActive, rows, "active_accounts", "cyan", dayOf),
        sparkRow(T.mInvites, rows, "invites_used", "violet", dayOf), sparkRow(T.mContribute, rows, "contribute_on", "violet", dayOf), sparkRow(T.mCalls, rows, "calls", "ok", dayOf),
        sparkRow(T.mRefused, rows, "budget_refusals", "warn", dayOf), sparkRow(T.mErrors, rows, "upstream_errors", "warn", dayOf), sparkRow(T.mContentRejected, rows, "content_rejected", "grey", dayOf)),
      h("div", { class: "kv" },
        h("b", {}, T.devices), h("span", {}, Object.keys(byKind).length ? Object.entries(byKind).map(([k, v]) => h("div", {}, h("span", { class: "pill", style: "margin-right:6px" }, `${T.devKinds[k] || k} ${fmt(v.n)}`), h("span", { class: "fine" }, v.os.join(" · ")))) : T.none),
        h("b", {}, T.invitesTitle), h("span", {}, T.invitesLine({ with_code: 0, inviters: 0, invited: 0, ...(sr.invites || {}) }), " · ", h("a", { class: "more-link", href: "#invites" }, T.invSeeRanking)),
        h("b", {}, T.webTitle), h("span", {}, sr.web && sr.web.enabled === false ? T.webOff : T.webLine(sr.web))));
  }
  function eventRow(e, withWho, accountId) {
    const [tone, icon] = EVENT_STYLE[e.kind] || ["grey", ICON.person];
    return h("div", { class: "row" + (withWho && e.account_id ? " tap" : ""), onclick: withWho && e.account_id ? () => openAccount(e.account_id) : null },
      h("span", { class: "tile " + tone, html: icon }),
      h("div", { class: "txt" }, h("div", { class: "t" }, T.eventName[e.kind] || e.kind, withWho && (e.hint || e.identifier) ? [" · ", h("span", { style: "color:var(--ink-2);font-weight:400" }, e.identifier || identOf(e.account_id, e.hint))] : null),
        h("div", { class: "s" }, [when(e.ts), e.detail, e.ua ? clientLine(e.ua) : ""].filter(Boolean).join(" · "), e.ip ? [" · ", ipChip(e.ip, accountId || e.account_id)] : null)));
  }
  const deviceIcon = (k) => (k === "phone" ? ICON.phone : k === "web" ? ICON.web : ICON.computer);
  const download = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = h("a", { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  // ── actions ────────────────────────────────────────────────────
  async function doGrant(a) {
    const v = prompt(T.grantPrompt(who(a)), "1000000");
    if (v === null) return;
    const n = parseInt(v.replace(/[\s,_]/g, ""), 10);
    if (!Number.isFinite(n) || n === 0) return;
    try { await api("POST", "/v1/admin/grant", { account_id: a.id, tokens: n }); } catch (e) { alert(e.message); }
    await Promise.all([load(), detail ? openAccount(a.id) : null]);
  }
  /** "=5" → what is left; "total=20" / "总额=20" → the lifetime pool; "+3" / "-2" → a difference. */
  function parsePool(v) {
    const s = String(v || "").replace(/[\s,¥]/g, "").toLowerCase();
    let m;
    if ((m = /^(?:total|pool|总额|总额度)=(\d+(?:\.\d+)?)$/.exec(s))) return { grant_cny: parseFloat(m[1]) };
    if ((m = /^(?:=|left=|剩=|剩余=)(\d+(?:\.\d+)?)$/.exec(s))) return { left_cny: parseFloat(m[1]) };
    if ((m = /^([+-])(\d+(?:\.\d+)?)$/.exec(s))) { const d = parseFloat(m[2]) * (m[1] === "-" ? -1 : 1); return d ? { delta_cny: d } : null; }
    return null;
  }
  const poolWords = (c) => c.left_cny !== undefined ? `= ¥${c.left_cny}` : c.grant_cny !== undefined ? `total ¥${c.grant_cny}` : `${c.delta_cny > 0 ? "+" : "−"}¥${Math.abs(c.delta_cny)}`;
  async function doSetPool(a) {
    const v = prompt(T.setPoolPrompt(who(a), money(a.left_cny || 0)), "=5");
    if (v === null) return;
    const change = parsePool(v);
    if (!change) { alert(T.poolBad); return; }
    const note = prompt(T.creditNote, "") || "";
    try { await api("POST", "/v1/admin/pool", { account_id: a.id, ...change, note }); } catch (e) { alert(e.message); }
    await Promise.all([load(), detail ? openAccount(a.id) : null]);
  }
  async function doSetPoolMany(list) {
    const ids = list.filter((a) => !a.member).map((a) => a.id);
    if (!ids.length) return;
    const v = prompt(T.setPoolManyPrompt(ids.length), "=5");
    if (v === null) return;
    const change = parsePool(v);
    if (!change) { alert(T.poolBad); return; }
    if (!confirm(T.setPoolManyConfirm(poolWords(change), ids.length))) return;
    const note = prompt(T.creditNote, "") || "";
    try { const r = await api("POST", "/v1/admin/pool/batch", { account_ids: ids, ...change, note }); alert(T.setPoolDone(r.accounts)); } catch (e) { alert(e.message); }
    await load();
  }
  async function doCredit(a) {
    const v = prompt(T.creditPrompt(who(a)), "5");
    if (v === null) return;
    const cny = parseFloat(v.replace(/[\s,¥]/g, ""));
    if (!Number.isFinite(cny) || cny === 0) return;
    const note = prompt(T.creditNote, "") || "";
    try { await api("POST", "/v1/admin/credit", { account_id: a.id, cny, note }); } catch (e) { alert(e.message); }
    await Promise.all([load(), detail ? openAccount(a.id) : null]);
  }
  async function doDisable(a) {
    if (!a.disabled && !confirm(T.disableConfirm(who(a)))) return;
    try { await api("POST", "/v1/admin/disable", { account_id: a.id, disabled: !a.disabled }); } catch (e) { alert(e.message); }
    await Promise.all([load(), detail ? openAccount(a.id) : null]);
  }
  async function doDelete(a) {
    if (!confirm(T.removeConfirm(who(a)))) return;
    try { await api("POST", "/v1/admin/delete", { account_id: a.id }); } catch (e) { alert(e.message); }
    closeDrawer(); await load();
  }
  async function doMember(a) {
    if (!a.unlimited && !confirm(T.memberConfirm(who(a)))) return;
    try { await api("POST", "/v1/admin/unlimited", { account_id: a.id, unlimited: !a.unlimited }); } catch (e) { alert(e.message); }
    await Promise.all([load(), detail ? openAccount(a.id) : null]);
  }
  /** The abuse action on an inviter: reclaim the invite credit, and if asked disable it and delete its unused invitees. */
  async function doInviteAbuse(a, disable, del) {
    const earned = Number(a.invite_earned_cny ?? a.earned_cny ?? 0);
    if (!confirm(T.invAbuseConfirm(who(a), earned ? money(earned) : "", disable, del))) return;
    let r;
    try { r = await api("POST", "/v1/admin/invites/abuse", { account_id: a.id, disable: !!disable, delete_unused: !!del }); } catch (e) { alert(e.message); return; }
    forget("invites");
    alert(T.invAbuseDone({ reclaimed: money(r.reclaimed_cny || 0), disabled: !!r.disabled, deleted: r.deleted || 0, kept: r.kept || 0 }));
    await Promise.all([load(), detail ? openAccount(a.id) : null]);
  }
  /** The abuse action's row: two boxes and the button; `a` is the inviter as the leaders list or the drawer knows it. */
  function inviteAbuseRow(a, pad) {
    const box = (label) => { const i = h("input", { type: "checkbox" }); return [i, h("label", { class: "sw", onclick: (e) => e.stopPropagation() }, i, " ", label)]; };
    const [dis, disEl] = box(T.invAbuseDisable), [del, delEl] = box(T.invAbuseDelete);
    return h("div", { class: "acts", style: pad || "", onclick: (e) => e.stopPropagation() },
      h("button", { class: "btn danger sm", onclick: () => doInviteAbuse(a, dis.checked, del.checked) }, T.invAbuseGo), disEl, delEl);
  }

  // ── the drawer: one account ────────────────────────────────────
  let drawerEl = null;
  function closeDrawer() { if (drawerEl) { drawerEl.remove(); drawerEl = null; } detail = null; address = null; LISTF.clear(); }
  /** The whole training set as a file: fetched with the admin token (a bare link could not carry it).
      What can go wrong is said in words: the browser's "Failed to fetch" covers a dropped connection,
      a proxy in the way and a token that stopped working alike. */
  async function exportSamples(accountId) {
    let r;
    try {
      r = await fetch(`/v1/admin/samples/export${accountId ? `?account_id=${encodeURIComponent(accountId)}` : ""}`, { headers: { "X-Admin-Token": token }, cache: "no-store" });
    } catch (_) { alert(T.exportFailed(T.offline)); return; }
    if (r.status === 401) { token = ""; SS.removeItem("nm.admin"); err = T.wrong; draw(); return; }
    if (!r.ok) { alert(T.exportFailed(`HTTP ${r.status}${r.statusText ? " " + r.statusText : ""}`)); return; }
    let blob;
    try { blob = await r.blob(); } catch (_) { alert(T.exportFailed(T.exportCut)); return; }
    if (!blob.size) { alert(T.exportEmpty); return; }
    download(blob, `wevvy-samples-${accountId ? accountId.slice(0, 8) + "-" : ""}${new Date().toISOString().slice(0, 10)}.jsonl`);
  }

  function ensureDrawer() {
    if (drawerEl) return;
    drawerEl = h("div", { class: "drawer-scrim", onclick: (e) => { if (e.target === drawerEl) closeDrawer(); } }, h("div", { class: "drawer" }, h("div", { class: "empty" }, T.loading)));
    document.body.append(drawerEl);
    const onKey = (e) => { if (e.key === "Escape") { closeDrawer(); document.removeEventListener("keydown", onKey); } };
    document.addEventListener("keydown", onKey);
  }
  async function openAccount(id) {
    ensureDrawer();
    address = null;
    try { detail = await api("GET", `/v1/admin/accounts/${encodeURIComponent(id)}?days=${days}`); detailErr = ""; }
    catch (e) { detail = null; detailErr = e.message; }
    if (drawerEl) drawDrawer();
  }
  /** One address across accounts, in the drawer; `fromAccount` is where "back" goes. */
  let address = null;
  async function openAddress(ip, fromAccount) {
    ensureDrawer();
    try { address = { ...(await api("GET", `/v1/admin/address?ip=${encodeURIComponent(ip)}`)), from: fromAccount || (detail && detail.account && detail.account.id) || "" }; detailErr = ""; }
    catch (e) { address = { ip, accounts: [], from: fromAccount || "" }; detailErr = e.message; }
    if (drawerEl) drawDrawer();
  }
  function drawAddress(box) {
    const list = address.accounts || [];
    const p = address.place || placeOf(address.ip);
    box.replaceChildren(...[
      h("div", { class: "head" }, h("h2", {}, T.atAddress(address.ip)), h("button", { class: "round", html: ICON.close, onclick: closeDrawer })),
      p ? h("div", { class: "fine", style: "padding:0 16px 8px" }, h("span", { class: "place big" }, placeText(p)), p.isp ? ` · ${p.isp}` : "") : null,
      address.from ? h("div", { class: "acts", style: "padding:0 16px 10px" }, h("button", { class: "btn quiet sm", onclick: () => openAccount(address.from) }, "← " + T.back)) : null,
      detailErr ? h("div", { class: "hint bad" }, detailErr) : null,
      h("div", { class: "card" }, list.length ? list.map((x) => h("div", { class: "row tap", onclick: () => openAccount(x.id) },
        h("span", { class: "tile" + (x.id === address.from ? "" : " grey"), html: ICON.person }),
        h("div", { class: "txt" }, h("div", { class: "t" }, identOf(x.id, x.hint) || x.id.slice(0, 8), " ", h("span", { class: "pill" }, x.channel === "phone" ? T.phone : T.email)),
          h("div", { class: "s" }, `${T.times(x.n)} · ${T.lastSeen} ${ago(x.last_seen)} · ${T.thJoined} ${dateOf(x.created_at)}`)),
        h("code", { class: "fine" }, x.id.slice(0, 8)))) : h("div", { class: "empty" }, T.none)),
      h("div", { class: "fine", style: "padding:10px 16px" }, T.addrNote)].filter(Boolean));
  }
  /** A list that reads on, page by page, to the first line: `fetchPage(before)` → {rows, total}; `row(r)` draws one. */
  function pagedList(firstRows, total, fetchPage, row, cls) {
    const box = h("div", { class: cls || "" });
    let rows = firstRows.slice(), lastId = rows.length ? rows[rows.length - 1].id : 0, busy = false;
    const foot = h("div", { class: "pager fine" });
    const paint = () => {
      const more = rows.length < total && lastId;
      foot.replaceChildren(...[h("span", {}, more ? T.shown(rows.length, total) : T.allShown(total)), more ? h("button", { class: "btn quiet sm", style: "margin-left:10px", onclick: loadMore }, busy ? T.loading : T.loadMore) : null].filter(Boolean));
    };
    async function loadMore() {
      if (busy) return; busy = true; paint();
      try { const page = await fetchPage(lastId); rows = rows.concat(page.rows || []); total = page.total || total; if (page.rows && page.rows.length) lastId = page.rows[page.rows.length - 1].id; else total = rows.length; body.append(...(page.rows || []).map(row)); }
      catch (e) { foot.replaceChildren(h("span", { class: "bad" }, e.message)); busy = false; return; }
      busy = false; paint();
    }
    const body = h("div", {}, ...rows.map(row));
    paint();
    box.append(...[rows.length ? body : h("div", { class: "empty" }, T.none), total ? foot : null].filter(Boolean));
    return box;
  }
  /** 0.26: a statement or a timeline with its own filter, kind chips and a text, both sent to
   *  the relay: the count is of what matches and the filter holds across pages. The filter
   *  outlives a redraw (the drawer is drawn again whenever the page is) and goes with the drawer. */
  const LISTF = new Map();
  function filteredList(key, firstRows, total, fetchPage, row, kinds, placeholder, cls) {
    const st = LISTF.get(key) || { kind: "", q: "" };
    LISTF.set(key, st);
    const listBox = h("div", {});
    let seq = 0, timer = 0;
    const show = () => {
      const my = ++seq;
      if (!st.kind && !st.q) { listBox.replaceChildren(pagedList(firstRows, total, (before) => fetchPage(before, "", ""), row, cls)); return; }
      listBox.replaceChildren(h("div", { class: "empty" }, T.loading));
      fetchPage(0, st.kind, st.q).then(
        (page) => { if (my === seq) listBox.replaceChildren(pagedList(page.rows || [], page.total || 0, (before) => fetchPage(before, st.kind, st.q), row, cls)); },
        (e) => { if (my === seq) listBox.replaceChildren(h("div", { class: "hint bad" }, e.message)); });
    };
    const input = h("input", { type: "search", placeholder, value: st.q, oninput: (e) => { st.q = e.target.value.trim(); clearTimeout(timer); timer = setTimeout(show, 300); } });
    const bar = h("div", { class: "listf" });
    const paintBar = () => bar.replaceChildren(chips(kinds, st.kind, (v) => { st.kind = v; paintBar(); show(); }), h("span", { class: "search" }, input));
    paintBar();
    show();
    return h("div", {}, bar, listBox);
  }
  const LEDGER_KINDS = () => [["", T.all], ["chat", T.kinds.chat], ["image", T.kinds.image], ["video", T.kinds.video], ["realtime", T.kinds.realtime], ["credit,grant", T.lgCredits]];
  const TIMELINE_KINDS = () => [...FILTERS.map(([k, name]) => [k, T[name]]),
    ["invite.used,invite.accepted,invite.settled,invite.clawback,invite.unknown", T.nav.invites], ["pool.set,pool.set.many,credit.granted,grant.tokens", T.lgCredits]];
  // the pills next to a menu model's id: its kind, then (0.17) the lane(s) a chat model is
  // for — "chat", "hands" — with the one it is the default pick in marked as such
  function modelPills(id, s) {
    const kinds = s.model_kinds || {}, lanes = (s.model_lanes || {})[id] || [], picks = (s.recommended_for || {})[id] || [];
    const tone = { chat: "blue", image: "violet", video: "cyan", realtime: "ok" }[kinds[id]] || "";
    const out = [h("span", { class: "pill " + tone, style: "margin-right:6px" }, T.kinds[kinds[id]] || kinds[id] || "")];
    for (const lane of lanes) {
      const name = T.lanes[lane] || lane, picked = picks.includes(lane);
      out.push(h("span", { class: picked ? "pill ok" : "pill", style: "margin-right:6px", title: picked ? T.laneDefaultTitle(name) : T.laneTitle(name) }, picked ? T.laneDefault(name) : name));
    }
    return out;
  }
  function drawDrawer() {
    const box = drawerEl.firstChild;
    if (address) { drawAddress(box); return; }
    if (!detail) { box.replaceChildren(h("div", { class: "head" }, h("h2", {}, "…"), h("button", { class: "round", html: ICON.close, onclick: closeDrawer })), h("div", { class: "empty" }, detailErr || T.loading)); return; }
    const s = settings(), rate = Number(s.usd_cny || 0), kinds = s.model_kinds || {};
    const a = detail.account, sp = detail.spend || {}, u = detail.usage || {}, p = u.period || {};
    const tags = [
      h("span", { class: "pill" }, a.channel === "phone" ? T.phone : T.email),
      a.member ? h("span", { class: "pill ok", title: a.listed ? T.listedNote : "" }, a.listed ? T.listed : T.member) : null,
      a.review ? h("span", { class: "pill", title: T.reviewNote }, T.review) : null,
      a.has_password ? h("span", { class: "pill violet" }, T.hasPassword) : h("span", { class: "pill" }, T.noPassword),
      a.disabled ? h("span", { class: "pill bad" }, T.disabled) : null,
      a.locked ? h("span", { class: "pill warn" }, T.locked) : null,
      a.contribute ? h("span", { class: "pill cyan" }, T.contributes) : null,
    ];
    const cap = a.member ? 0 : Number(sp.grant_cny || 0), frac = cap > 0 ? Math.min(1, Number(sp.total_cny || 0) / cap) : 0;
    box.replaceChildren(
      h("div", { class: "head" }, h("h2", {}, a.identifier || a.hint), h("button", { class: "round", html: ICON.close, onclick: closeDrawer })),
      h("div", { class: "card" },
        h("div", { class: "identity" }, h("div", { class: "disc" }, initial(a)),
          h("div", { class: "who" }, h("div", { class: "n" }, a.hint, " ", h("span", { class: "fine" }, `· ${T.identifierNote}`)),
            h("div", { class: "m" }, `${dateOf(a.created_at)} · `, h("code", {}, a.id)),
            h("div", { class: "m", style: "margin-top:4px" }, `${T.lastSeenAt} ${a.last_seen_at ? ago(a.last_seen_at) : T.never}`, a.last_ua ? [` · ${T.lastClient} ${clientLine(a.last_ua) || a.last_ua}`] : null,
              a.last_ip ? [` · ${T.lastIp} `, ipChip(a.last_ip, a.id)] : null, a.first_ip && a.first_ip !== a.last_ip ? [` · ${T.firstIp} `, ipChip(a.first_ip, a.id)] : null),
            h("div", { class: "tags", style: "margin-top:6px" }, ...tags))),
        h("div", { class: "stats" },
          h("div", {}, h("div", { class: "k" }, T.spendTotal), h("div", { class: "v", title: usd(sp.total_cny, rate) }, money(sp.total_cny)), cap > 0 ? h("div", { class: "meter", style: "margin-top:6px" }, h("i", { class: frac >= 1 ? "bad" : frac >= 0.8 ? "warn" : "", style: `width:${Math.round(frac * 100)}%` })) : null, h("div", { class: "k", style: "margin-top:4px" }, cap > 0 ? `${T.cap} ${money(cap)} · ${T.left} ${money(sp.left_cny || 0)}` : T.noCap)),
          h("div", {}, h("div", { class: "k" }, T.spendToday), h("div", { class: "v", title: usd(sp.today_cny, rate) }, money(sp.today_cny)), h("div", { class: "k", style: "margin-top:4px" }, T.tokens(a.used))),
          h("div", {}, h("div", { class: "k" }, T.requests), h("div", { class: "v" }, fmt(sp.requests_total)), h("div", { class: "k", style: "margin-top:4px" }, s.unlimited ? T.noCap : `${T.grant}: ${fmt(a.granted)}`))),
        h("div", { class: "fine", style: "padding:0 16px 10px" }, T.poolLine(money(a.grant_cny || 0), a.left_cny === null || a.left_cny === undefined ? null : money(a.left_cny), a.invites || 0, !!a.contribute_bonus_at),
          // the inviter by name when the account is still there, the id's start when it is gone
          a.invited_by ? [" · ", T.invitedBy, " ", a.inviter ? h("a", { class: "more-link", href: "#", onclick: (e) => { e.preventDefault(); openAccount(a.inviter.id); } }, who(a.inviter)) : [h("code", {}, String(a.invited_by).slice(0, 8)), ` (${T.invGone})`]] : null),
        h("div", { class: "acts" },
          s.unlimited ? null : h("button", { class: "btn quiet", onclick: () => doGrant(a) }, T.grant),
          h("button", { class: "btn quiet", onclick: () => doCredit(a) }, T.credit),
          a.member ? null : h("button", { class: "btn quiet", onclick: () => doSetPool(a) }, T.setPool),
          a.listed ? null : h("button", { class: "btn quiet", onclick: () => doMember(a) }, a.unlimited ? T.unmakeMember : T.makeMember),
          h("button", { class: "btn quiet", onclick: () => doDisable(a) }, a.disabled ? T.enable : T.disable),
          h("button", { class: "btn danger", onclick: () => doDelete(a) }, T.remove))),
      // the people this account's code brought, newest first; shown once there is one to show
      ...((a.invited || []).length || a.invites ? [h("div", { class: "label" }, T.invitedList(a.invited_total || (a.invited || []).length), a.invite_earned_cny ? ` · ${T.invEarnedLine(money(a.invite_earned_cny))}` : ""),
        h("div", { class: "card" }, ...(a.invited || []).map((i) => inviteeRow(i, a)), !(a.invited || []).length ? h("div", { class: "empty" }, T.none) : null,
          (a.invited_total || 0) > (a.invited || []).length ? h("div", { class: "fine", style: "padding:6px 16px 10px" }, T.invNewest((a.invited || []).length, a.invited_total)) : null,
          // the abuse action lives with the people it is about
          (a.invited || []).length ? inviteAbuseRow(a, "padding:6px 16px 12px;flex-wrap:wrap;gap:8px 14px") : null)] : []),
      // 0.26: an account that never made a request gets one line instead of three empty tables and an empty chart
      ...(!Number(sp.requests_total || 0) && !(u.total && (u.total.by_kind || []).length) ? [h("div", { class: "label" }, T.byKind), h("div", { class: "card" }, h("div", { class: "empty" }, T.noRequestsYet))] : [
        h("div", { class: "label" }, T.byKind), h("div", { class: "card" },
          h("div", { class: "label", style: "margin:12px 16px 4px" }, T.usageToday), kindRows(u.today && u.today.by_kind, rate),
          h("div", { class: "label", style: "margin:12px 16px 4px" }, T.usagePeriod(p.days || days)), kindRows(p.by_kind, rate),
          h("div", { class: "label", style: "margin:12px 16px 4px" }, T.usageTotal), kindRows(u.total && u.total.by_kind, rate)),
        h("div", { class: "label" }, T.byDay(p.days || days)), h("div", { class: "card" }, dayBars(p.by_day, p.days || days, s.day_offset_h, rate)),
        h("div", { class: "label" }, T.byModel), h("div", { class: "card" }, modelRows(p.by_model, rate, kinds))]),
      h("div", { class: "label" }, T.addresses, ` · ${fmt((detail.addresses || []).length)}`), h("div", { class: "card" }, (detail.addresses || []).length ? (detail.addresses || []).map((x) => h("div", { class: "row tap", onclick: () => openAddress(x.ip, a.id) },
        h("span", { class: "tile grey", html: ICON.web }),
        h("div", { class: "txt" }, h("div", { class: "t" }, h("code", {}, x.ip), " ", ...(x.platforms || []).map((p) => h("span", { class: "pill", style: "margin-left:4px" }, T.dPlatforms[p] || p))),
          h("div", { class: "s" }, `${T.times(x.n)} · ${T.firstSeen} ${when(x.first_seen)} · ${T.lastSeen} ${when(x.last_seen)}`)))) : h("div", { class: "empty" }, T.none),
        h("div", { class: "fine", style: "padding:6px 16px 10px" }, T.addrNote)),
      h("div", { class: "label" }, T.sessions, ` · ${fmt((detail.sessions || []).length)}`), h("div", { class: "card" }, (detail.sessions || []).length ? (detail.sessions || []).map((k) => h("div", { class: "row" },
        h("span", { class: "tile" + (k.revoked_at ? " grey" : ""), html: /web|网页|browser/i.test(k.device || "") ? ICON.web : /phone|android|手机|iphone/i.test(k.device || "") ? ICON.phone : ICON.computer }),
        h("div", { class: "txt" }, h("div", { class: "t" }, k.device || "—", k.revoked_at ? [" ", h("span", { class: "pill" }, T.revoked)] : null),
          h("div", { class: "s" }, `${T.via[k.via] || k.via} · ${when(k.created_at)}${k.last_used_at ? ` · ${T.lastUsed} ${ago(k.last_used_at)}` : ""}`, k.ua ? ` · ${clientLine(k.ua) || String(k.ua).split(" ")[0]}` : "", k.ip ? [" · ", ipChip(k.ip, a.id)] : null)),
        h("code", { class: "fine" }, k.prefix))) : h("div", { class: "empty" }, T.none)),
      h("div", { class: "label" }, T.devices, ` · ${fmt((detail.devices || []).length)}`), h("div", { class: "card" }, (detail.devices || []).length ? (detail.devices || []).map((d) => h("div", { class: "row" },
        h("span", { class: "tile" + (d.online ? "" : " grey"), html: deviceIcon(d.kind) }),
        h("div", { class: "txt" }, h("div", { class: "t" }, d.name || d.id, " ", h("span", { class: "pill " + (d.online ? "ok" : "") }, d.online ? T.online : T.offline)),
          h("div", { class: "s" }, [d.kind, d.os, d.version ? "v" + d.version : "", d.last_seen ? `${T.lastSeen} ${ago(d.last_seen)}` : "", d.first_seen ? `${T.firstSeen} ${dateOf(d.first_seen)}` : ""].filter(Boolean).join(" · "), d.ip ? [" · ", ipChip(d.ip, a.id)] : null)),
        Array.isArray(d.actions) && d.actions.length ? h("span", { class: "pill", title: d.actions.join(", ") }, d.actions.length) : null)) : h("div", { class: "empty" }, T.none)),
      h("div", { class: "label" }, T.ledger, ` · ${fmt(detail.ledger_total || (detail.recent || []).length)}`), h("div", { class: "card ledger" },
        filteredList(`${a.id}:ledger`, detail.recent || [], detail.ledger_total || (detail.recent || []).length,
          (before, kind, q) => api("GET", `/v1/admin/accounts/${encodeURIComponent(a.id)}/ledger?limit=200&before=${before}&kind=${encodeURIComponent(kind)}&q=${encodeURIComponent(q)}`),
          (r) => ledgerLine(r, a.id), LEDGER_KINDS(), T.lgSearch, "lines")),
      h("div", { class: "label" }, T.timeline, ` · ${fmt(detail.events_total || (detail.events || []).length)}`), h("div", { class: "card feed" },
        filteredList(`${a.id}:events`, detail.events || [], detail.events_total || (detail.events || []).length,
          (before, kind, q) => api("GET", `/v1/admin/accounts/${encodeURIComponent(a.id)}/events?limit=200&before=${before}&kind=${encodeURIComponent(kind)}&q=${encodeURIComponent(q)}`),
          (e) => eventRow(e, false, a.id), TIMELINE_KINDS(), T.tlSearch)),
      ...(detail.demo ? [h("div", { class: "label" }, T.demoOfAccount, ` · ${fmt(detail.demo.visits_total || 0)}`), h("div", { class: "card feed" },
        detail.demo.visitor ? h("div", { class: "fine", style: "padding:10px 16px 4px" }, T.demoAccountLine(detail.demo.visitor), detail.demo.visitor.last_ua ? ` · ${browserOf(detail.demo.visitor.last_ua)}` : "") : null,
        (detail.demo.visits || []).length ? (detail.demo.visits || []).map((v) => visitRow(v, false)) : h("div", { class: "empty" }, T.demoNoneHere))] : []),
      ...(a.contribute || a.samples ? [h("div", { class: "label" }, T.samplesAll, ` · ${fmt(a.samples || 0)}`), h("div", { class: "card" },
        h("div", { class: "acts", style: "padding:10px 16px 0" }, a.samples ? h("button", { class: "btn quiet sm", onclick: () => exportSamples(a.id) }, T.exportThis) : null),
        h("div", { class: "fine", style: "padding:6px 16px 0" }, T.samplesNote), samplesBox(a.id))] : []),
      h("div", { class: "fine", style: "padding:14px 4px 4px" }, h("b", {}, T.recorded), " ", T.recordedNote),
    );
  }
  /** One statement line: when, kind, model, what it took, what it cost and, 0.10, from where and with what.
   *  A credit line whose figure is negative (`from: clawback`) is a reclaim: red pill, the minus kept. */
  function ledgerLine(r, accountId) {
    const clawback = r.kind === "credit" && r.detail && Number(r.detail.credit_uy) < 0;
    return h("div", { class: "line" },
      h("span", { class: "c when" }, when(r.ts)),
      h("span", { class: "c" }, h("span", { class: "pill " + (clawback ? "bad" : { chat: "blue", image: "violet", video: "cyan", realtime: "ok", grant: "ok", credit: "ok" }[r.kind] || "") }, T.kinds[r.kind] || r.kind)),
      h("span", { class: "c grow", title: [r.model, r.detail && r.detail.from, r.detail && r.detail.note].filter(Boolean).join(" · ") }, h("code", {}, r.model || ""), r.detail && r.detail.from ? h("span", { class: "fine" }, ` ${r.detail.from}`) : null, r.detail && r.detail.note ? h("span", { class: "fine" }, ` ${r.detail.note}`) : null),
      h("span", { class: "c num" }, r.kind === "chat" ? T.inOut(r.prompt_tokens, r.completion_tokens) : r.kind === "grant" || r.kind === "credit" ? (r.detail && r.detail.credit_uy ? money(r.detail.credit_uy / 1e6) : fmt(-r.charged)) : fmt(r.charged)),
      h("span", { class: "c num" }, money(r.cost_cny)),
      // 0.26: the client fits in the address chip's tooltip, so the model name keeps its room
      h("span", { class: "c fine", title: r.ua ? clientLine(r.ua) || String(r.ua) : "" }, r.ip ? ipChip(r.ip, accountId) : r.ua ? clientLine(r.ua) : ""));
  }

  /** Every turn one account kept, newest first, page by page to the first; each row is the whole turn (sampleRow). */
  function samplesBox(accountId) {
    const box = h("div", {}, h("div", { class: "empty" }, T.loading));
    let before = 0, beforeId = "", shown = 0, total = 0;
    const list = h("div", {});
    const foot = h("div", { class: "pager fine" });
    const paint = () => {
      const more = shown < total && before;
      foot.replaceChildren(...[h("span", {}, more ? T.shown(shown, total) : T.allShown(total)), more ? h("button", { class: "btn quiet sm", style: "margin-left:10px", onclick: load }, T.loadMore) : null].filter(Boolean));
    };
    const load = async () => {
      try {
        // keyset paging on (ts, id): several turns in one second are not skipped
        const page = before ? `&before=${before}&before_id=${encodeURIComponent(beforeId)}` : "";
        const r = await api("GET", `/v1/admin/samples?account_id=${encodeURIComponent(accountId)}&limit=20${page}`);
        const items = r.samples || [];
        total = r.total || 0;
        if (shown === 0) box.replaceChildren(...[items.length ? list : h("div", { class: "empty" }, T.noSamples), total ? foot : null].filter(Boolean));
        list.append(...items.map((smp) => sampleRow(smp)));
        shown += items.length;
        before = items.length ? items[items.length - 1].ts : 0;
        beforeId = items.length ? items[items.length - 1].id : "";
        if (!items.length) total = shown;
        paint();
      } catch (e) { box.replaceChildren(h("div", { class: "hint bad" }, e.message)); }
    };
    load();
    return box;
  }

  // ── people: the accounts, filtered, charted, sorted, paged ─────
  const placeOfAccount = (a) => placeOf(a.last_ip) || placeOf(a.first_ip) || null;
  // the region key is language-neutral (the server's own tallies use a fixed key), the label follows the UI language
  const regionKey = (p) => (!p ? "?" : p.local ? "本地网络" : p.country || "?");
  const regionLabel = (k) => (k === "?" ? T.pUnknown : k === "本地网络" ? T.pLocal : k);
  const regionName = (p) => regionLabel(regionKey(p));
  const activityOf = (a) => { const t = a.last_active_at || a.last_seen_at; if (!t) return "never"; const d = nowS() - t; return d < 86400 ? "today" : d < 7 * 86400 ? "7d" : d < 30 * 86400 ? "30d" : "older"; };
  const spendBucket = (a) => { const c = Number(a.spent_cny || 0); return c <= 0 ? "0" : c < 1 ? "lt1" : c < 5 ? "1to5" : c < 10 ? "5to10" : "ge10"; };
  const statusOk = (a, s) => !s || (s === "member" ? !!a.member : s === "disabled" ? !!a.disabled : s === "locked" ? !!a.locked : s === "password" ? !!a.has_password : s === "nopassword" ? !a.has_password
    : s === "contributes" ? !!a.contribute : s === "exhausted" ? (!a.member && a.left_cny !== null && a.left_cny !== undefined && Number(a.left_cny) <= 0) : s === "online" ? (a.devices || []).some((d) => d.online) : s === "new" ? nowS() - (a.created_at || 0) < days * 86400 : true);
  const SORTS = {
    active: (a) => a.last_active_at || 0, joined: (a) => a.created_at || 0, spent: (a) => Number(a.spent_cny || 0), today: (a) => Number(a.spent_today_cny || 0), tokens: (a) => Number(a.used || 0),
    requests: (a) => Number(a.requests || 0), left: (a) => (a.left_cny === null || a.left_cny === undefined ? -1 : Number(a.left_cny)), region: (a) => regionName(placeOfAccount(a)),
    invites: (a) => Number(a.invites || 0),
  };
  const joinedOf = (a) => { const d = nowS() - (a.created_at || 0); return d < 86400 ? "today" : d < 7 * 86400 ? "7d" : d < 30 * 86400 ? "30d" : "older"; };
  const sourceOk = (a, s) => !s || (s === "invited" ? !!a.invited_by : s === "organic" ? !a.invited_by : s === "inviter" ? Number(a.invites || 0) > 0 : true);
  /** 0.26: everything the search can hit, as one lowercase text per account: the number or
   *  e-mail, the id, both addresses, the client and its version, the devices' names, the region,
   *  the inviter (by name when the list has them) and the account's own invite code. */
  const haystack = (a) => [a.identifier, a.hint, a.id, a.first_ip, a.last_ip, a.last_version, a.last_platform, T.dPlatforms[a.last_platform] || "", clientLine(a.last_ua),
    ...(a.devices || []).map((d) => `${d.name || ""} ${d.kind || ""} ${d.os || ""}`), placeText(placeOfAccount(a)), regionName(placeOfAccount(a)),
    a.invited_by ? identOf(a.invited_by, "") : "", a.invite_code].filter(Boolean).join(" ").toLowerCase();
  /** Several words, each anywhere in the text, all of them. */
  const terms = (q) => String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (text, ts) => ts.every((t) => text.includes(t));
  const PEOPLE_KEYS = ["country", "province", "city", "channel", "status", "activity", "spend", "platform", "joined", "source", "version"];
  const peopleFilters = () => {
    const g = (k) => params.get(k) || "";
    return { q: g("q"), country: g("country"), province: g("province"), city: g("city"), channel: g("channel"), status: g("status"), activity: g("activity"), spend: g("spend"), platform: g("platform"),
      joined: g("joined"), source: g("source"), version: g("version"), sort: g("sort") || "active", dir: g("dir") || "desc", n: Number(g("n")) || PAGE };
  };
  /** A filter change: the page count starts over unless the change is the page count itself. */
  const setPeople = (patch) => setParams({ n: "", ...patch, ...("n" in patch ? {} : { n: "" }) });
  const toggle = (key, value, current) => setPeople({ [key]: current === value ? "" : value });

  function signupChart(list) {
    const offset = Number(settings().day_offset_h || 0) * 3600;
    const t = nowS(), dayStart = t - ((t + offset) % 86400);
    const weekly = days > 31, step = weekly ? 7 * 86400 : 86400, n = weekly ? Math.ceil(days / 7) : days;
    const start = dayStart - (n - 1) * step;
    const counts = new Array(n).fill(0);
    let total = 0;
    for (const a of list) { if (a.review) continue; const c = a.created_at || 0; if (c < start) continue; counts[Math.min(n - 1, Math.floor((c - start) / step))]++; total++; }
    const every = labelEvery(n);
    const items = counts.map((v, i) => ({ value: v, label: i % every === 0 ? day(start + i * step) : "", title: `${day(start + i * step)}${weekly ? " +7d" : ""} · ${fmt(v)}` }));
    return chart(`${T.cSignups} · ${T.period(days)}`, fmt(total), vbars(items, "ok"), weekly ? T.byWeekLabel : T.byDayLabel);
  }
  /** Where the people are, one level at a time: countries; the provinces of the chosen country; the cities of the chosen province. */
  function regionChart(base, f) {
    const level = !f.country ? "country" : !f.province ? "province" : "city";
    const groups = new Map();
    for (const a of base) {
      const p = placeOfAccount(a);
      if (level !== "country") { if (regionKey(p) !== f.country) continue; if (level === "city" && ((p && p.province) || "") !== f.province) continue; }
      const key = level === "country" ? regionKey(p) : level === "province" ? ((p && p.province) || "") : ((p && p.city) || "");
      groups.set(key, (groups.get(key) || 0) + 1);
    }
    const sel = level === "country" ? "" : level === "province" ? f.province : f.city;
    const items = [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([key, value]) => ({
      name: level === "country" ? regionLabel(key) : key || T.pUnknown, value, on: !!key && sel === key,
      onclick: level === "country" ? () => setPeople({ country: key, province: "", city: "" })
        : !key ? null
          : level === "province" ? () => setPeople({ province: sel === key ? "" : key, city: "" }) : () => setPeople({ city: sel === key ? "" : key }),
    }));
    const up = level === "country" ? null : h("button", { class: "up", title: T.up, onclick: () => (level === "province" ? setPeople({ country: "", province: "", city: "" }) : setPeople({ province: "", city: "" })) }, "←");
    const title = level === "country" ? T.cRegions : T.cRegionsIn(level === "province" ? regionLabel(f.country) : f.province);
    return chart([up, title].filter(Boolean), fmt(groups.size), hranks(items));
  }
  function peopleView() {
    const list = (accounts && accounts.accounts) || [];
    const f = peopleFilters();
    const ts = terms(f.q), q = ts.length > 0;
    const base = list.filter((a) => (!q || matches(haystack(a), ts))
      && (!f.channel || a.channel === f.channel) && statusOk(a, f.status) && (!f.activity || activityOf(a) === f.activity) && (!f.spend || spendBucket(a) === f.spend) && (!f.platform || (a.last_platform || "") === f.platform)
      && (!f.joined || joinedOf(a) === f.joined) && sourceOk(a, f.source) && (!f.version || (a.last_version || "") === f.version));
    const inRegion = (a) => { const p = placeOfAccount(a); return (!f.country || regionKey(p) === f.country) && (!f.province || ((p && p.province) || "") === f.province) && (!f.city || ((p && p.city) || "") === f.city); };
    const shown = f.country || f.province || f.city ? base.filter(inRegion) : base;
    const key = SORTS[f.sort] || SORTS.active, sign = f.dir === "asc" ? 1 : -1;
    shown.sort((a, b) => { const x = key(a), y = key(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * sign || (b.created_at || 0) - (a.created_at || 0); });
    const page = shown.slice(0, f.n);
    const s = settings();

    // the filter bar: region (country → province → city), channel, status, activity, spend, client, sort
    const count = (xs, keyOf) => { const m = new Map(); for (const x of xs) { const k = keyOf(x); m.set(k, (m.get(k) || 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1]); };
    const countries = count(base, (a) => regionKey(placeOfAccount(a)));
    const provinces = f.country ? count(base.filter((a) => regionKey(placeOfAccount(a)) === f.country), (a) => (placeOfAccount(a) || {}).province || "").filter(([k]) => k) : [];
    const cities = f.province ? count(base.filter((a) => { const p = placeOfAccount(a); return regionKey(p) === f.country && ((p && p.province) || "") === f.province; }), (a) => (placeOfAccount(a) || {}).city || "").filter(([k]) => k) : [];
    const versions = count(base.filter((a) => a.last_version), (a) => a.last_version).sort((x, y) => y[0].localeCompare(x[0], undefined, { numeric: true }));
    const anyOpt = [["", T.fAny]];
    const active = PEOPLE_KEYS.filter((k) => f[k]).length + (q ? 1 : 0);
    // 0.26: the search on a row of its own, wide, with what it reaches said next to it; the filters below
    const searchRow = h("div", { class: "toolbar lead" },
      h("span", { class: "search wide" }, h("input", { type: "search", "data-focus": "people-q", placeholder: T.search, title: T.searchKeys, value: f.q, oninput: (e) => setPeople({ q: e.target.value }) })),
      h("span", { class: "fine hide-sm" }, T.searchHint),
      h("span", { class: "cnt" }, T.fCount(shown.length, list.length)),
      shown.length ? h("button", { class: "btn quiet sm", title: T.csvNote, onclick: () => exportCsv(shown) }, T.exportCsv) : null,
      shown.some((a) => !a.member) ? h("button", { class: "btn quiet sm", onclick: () => doSetPoolMany(shown) }, T.setPoolMany(shown.filter((a) => !a.member).length)) : null);
    const toolbar = h("div", { class: "toolbar" },
      select(T.fRegion, f.country, anyOpt.concat(countries.map(([k, n]) => [k, regionLabel(k), n])), (v) => setPeople({ country: v, province: "", city: "" })),
      f.country && provinces.length ? select(T.fProvince, f.province, anyOpt.concat(provinces.map(([k, n]) => [k, k, n])), (v) => setPeople({ province: v, city: "" })) : null,
      f.province && cities.length ? select(T.fCity, f.city, anyOpt.concat(cities.map(([k, n]) => [k, k, n])), (v) => setPeople({ city: v })) : null,
      select(T.fChannel, f.channel, [...anyOpt, ["phone", T.phone], ["email", T.email]], (v) => setPeople({ channel: v })),
      select(T.fStatus, f.status, anyOpt.concat(Object.entries(T.stat)), (v) => setPeople({ status: v })),
      select(T.fJoined, f.joined, anyOpt.concat(Object.entries(T.joinedIn)), (v) => setPeople({ joined: v })),
      select(T.fActivity, f.activity, anyOpt.concat(Object.entries(T.act)), (v) => setPeople({ activity: v })),
      select(T.fSpend, f.spend, anyOpt.concat(Object.entries(T.bucket)), (v) => setPeople({ spend: v })),
      select(T.fSource, f.source, anyOpt.concat(Object.entries(T.cameVia)), (v) => setPeople({ source: v })),
      select(T.fClient, f.platform, anyOpt.concat(Object.entries(T.dPlatforms)), (v) => setPeople({ platform: v })),
      versions.length || f.version ? select(T.fVersion, f.version, anyOpt.concat(versions.map(([k, n]) => [k, `v${k}`, n])), (v) => setPeople({ version: v })) : null,
      select(T.fSort, f.sort, Object.entries(T.sortBy), (v) => setPeople({ sort: v })),
      active ? h("button", { class: "chip", onclick: () => { params = new URLSearchParams(); history.replaceState(null, "", "#people"); draw(); } }, `${T.fClear} (${active})`) : null);

    // the charts, each a filter
    const byAct = ["today", "7d", "30d", "older", "never"].map((k, i) => ({ label: T.act[k], value: shown.filter((a) => activityOf(a) === k).length, tone: ["ok", "blue", "cyan", "grey", "warn"][i], on: f.activity === k, onclick: () => toggle("activity", k, f.activity) }));
    const byBucket = Object.keys(T.bucket).map((k) => ({ label: T.bucket[k], value: shown.filter((a) => spendBucket(a) === k).length, on: f.spend === k, onclick: () => toggle("spend", k, f.spend) }));
    const byChannel = [["phone", T.phone, "blue"], ["email", T.email, "violet"]].map(([k, label, tone]) => ({ label, value: shown.filter((a) => a.channel === k).length, tone, on: f.channel === k, onclick: () => toggle("channel", k, f.channel) }));
    const byPlatform = count(shown, (a) => a.last_platform || "").slice(0, 7).map(([k, value]) => ({ name: k ? T.dPlatforms[k] || k : T.pUnknown, value, tone: "cyan", on: f.platform === k && !!k, onclick: k ? () => toggle("platform", k, f.platform) : null }));
    const members = shown.filter((a) => a.member).length, exhausted = shown.filter((a) => statusOk(a, "exhausted")).length;
    const charts = h("div", { class: "charts" },
      signupChart(shown), regionChart(base, f),
      chart(T.cSpend, `${money(shown.reduce((t, a) => t + Number(a.spent_cny || 0), 0))}`, vbars(byBucket, "violet"), `${T.stat.member} ${fmt(members)} · ${T.stat.exhausted} ${fmt(exhausted)}`),
      chart(T.cActivity, null, split(byAct)), chart(T.cChannel, null, split(byChannel)), chart(T.cClients, null, hranks(byPlatform)));

    // the table
    const th = (label, key, cls) => h("th", { class: (cls || "") + (key ? " sort" : "") + (key === f.sort ? " on" : ""), onclick: key ? () => setPeople({ sort: key, dir: f.sort === key && f.dir === "desc" ? "asc" : "desc" }) : null }, label, key === f.sort ? (f.dir === "asc" ? " ↑" : " ↓") : "");
    const rows = page.map((a) => {
      const p = placeOfAccount(a), cap = a.member ? 0 : Number(a.grant_cny || 0), frac = cap > 0 ? Math.min(1, Number(a.spent_cny || 0) / cap) : 0;
      return h("tr", { onclick: () => openAccount(a.id) },
        h("td", {}, h("div", { class: "who" }, h("div", { class: "disc" }, initial(a)),
          h("div", { style: "min-width:0" }, h("div", { class: "n", title: a.hint }, who(a)),
            h("div", { class: "tags" },
              h("span", { class: "pill" }, a.channel === "phone" ? T.phone : T.email),
              a.member ? h("span", { class: "pill ok" }, a.listed ? T.listed : T.member) : null,
              a.review ? h("span", { class: "pill", title: T.reviewNote }, T.review) : null,
              a.has_password ? h("span", { class: "pill violet" }, T.password) : null,
              a.disabled ? h("span", { class: "pill bad" }, T.disabled) : null,
              a.locked ? h("span", { class: "pill warn" }, T.locked) : null,
              a.invites ? h("span", { class: "pill violet", title: T.invSeeRanking, onclick: (e) => { e.stopPropagation(); go("invites", { q: a.identifier || a.hint }); } }, T.invPill(a.invites)) : null)))),
        h("td", { class: "hide-sm nowrap" }, dateOf(a.created_at)),
        h("td", { class: "hide-sm" }, p ? h("span", { class: "place", title: p.isp || "" }, placeText(p)) : h("span", { class: "fine" }, T.pUnknown)),
        h("td", { class: "num" }, money(a.spent_cny), h("span", { class: "sub" }, money(a.spent_today_cny)), cap > 0 ? h("div", { class: "meter sm", title: `${T.cap} ${money(cap)} · ${T.left} ${money(a.left_cny || 0)}` }, h("i", { class: frac >= 1 ? "bad" : frac >= 0.8 ? "warn" : "", style: `width:${Math.round(frac * 100)}%` })) : null),
        h("td", { class: "num hide-sm" }, fmt(a.used), h("span", { class: "sub" }, fmt(a.used_today))),
        h("td", { class: "num hide-sm" }, fmt(a.requests)),
        h("td", { class: "hide-sm" }, a.last_active_at ? ago(a.last_active_at) : T.never, h("span", { class: "sub" }, `${a.live_keys || 0} sign-ins`)),
        h("td", { class: "hide-sm" }, a.last_ua || a.last_ip ? [a.last_ua ? h("div", {}, clientLine(a.last_ua) || String(a.last_ua).split(" ")[0]) : null, a.last_ip ? h("div", {}, ipChip(a.last_ip, a.id)) : null] : T.none),
        h("td", {}, (a.devices || []).length ? h("div", { class: "dev" }, ...(a.devices || []).map((d) => h("span", { title: `${d.kind || ""} ${d.os || ""} · ${d.online ? T.online : ago(d.last_seen)}` }, h("i", { class: "dot" + (d.online ? " on" : "") }), d.name || d.id))) : T.none));
    });
    const table = rows.length ? h("table", {},
      h("thead", {}, h("tr", {},
        th(T.thWho), th(T.thJoined, "joined", "hide-sm"), th(T.thRegion, "region", "hide-sm"), th(T.thSpent, "spent", "num"), th(T.thTokens, "tokens", "num hide-sm"),
        th(T.thReqs, "requests", "num hide-sm"), th(T.thActive, "active", "hide-sm"), th(T.thClient, null, "hide-sm"), th(T.thDevices))),
      h("tbody", {}, ...rows)) : h("div", { class: "empty" }, list.length ? T.none : T.noAccounts);
    return [h("div", { class: "panel" }, h("h2", {}, T.nav.people, h("span", { class: "pill" }, fmt(shown.length)), h("span", { class: "sp" }), h("span", { class: "fine" }, T.cClickNote)), searchRow, toolbar, charts),
      h("div", { class: "panel" }, table, shown.length > page.length ? h("div", { class: "more" }, h("button", { class: "btn quiet sm", onclick: () => setPeople({ n: f.n + PAGE }) }, T.moreRows(Math.min(PAGE, shown.length - page.length))), h("span", { class: "fine" }, T.shown(page.length, shown.length))) : null)];
  }
  /** The selection as a file: the identifiers as the table shows them (0.22), the masked hint beside each, and the figures. */
  function exportCsv(rows) {
    const cols = [["identifier", (a) => a.identifier || ""], ["hint", (a) => a.hint], ["id", (a) => a.id], ["channel", (a) => a.channel], ["joined", (a) => iso(a.created_at)], ["region", (a) => placeText(placeOfAccount(a))],
      ["spent_cny", (a) => moneyN(a.spent_cny)], ["spent_today_cny", (a) => moneyN(a.spent_today_cny)], ["left_cny", (a) => (a.left_cny === null || a.left_cny === undefined ? "" : moneyN(a.left_cny))],
      ["tokens", (a) => a.used || 0], ["requests", (a) => a.requests || 0], ["last_active", (a) => iso(a.last_active_at)], ["member", (a) => (a.member ? 1 : 0)], ["disabled", (a) => (a.disabled ? 1 : 0)],
      ["password", (a) => (a.has_password ? 1 : 0)], ["client", (a) => a.last_platform || ""], ["version", (a) => a.last_version || ""], ["devices", (a) => (a.devices || []).length],
      // 0.26: who brought the account and how many it brought, since the page filters on both
      ["invited_by", (a) => (a.invited_by ? identOf(a.invited_by, "") || a.invited_by : "")], ["invites", (a) => a.invites || 0]];
    const esc = (v) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const text = [cols.map((c) => c[0]).join(","), ...rows.map((a) => cols.map((c) => esc(c[1](a))).join(","))].join("\n");
    download(new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }), `wevvy-accounts-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  // ── invites: who brought whom, the inviters that brought most first ──
  const INV_SORTS = {
    invited: (x) => x.invited || 0, active: (x) => x.invited_active || 0, same_ip: (x) => x.invited_same_ip || 0,
    spent: (x) => Number(x.invited_spent_cny || 0), earned: (x) => Number(x.earned_cny || 0), latest: (x) => x.last_invite_at || 0,
  };
  const INV_OPEN = new Set(); // the inviters whose people are unfolded in the table
  const inviteeLabel = (i) => identOf(i.id, i.hint);
  /** One account that came through a code, as a row: who, when, whether it was used, from where. */
  function inviteeRow(i, inviter, cls) {
    const same = !!(inviter && [i.first_ip, i.last_ip].some((ip) => ip && (ip === inviter.first_ip || ip === inviter.last_ip)));
    return h("div", { class: "row tap" + (cls ? " " + cls : ""), onclick: (e) => { e.stopPropagation(); openAccount(i.id); } },
      h("span", { class: "tile" + (i.requests > 0 ? "" : " grey"), html: ICON.person }),
      h("div", { class: "txt" }, h("div", { class: "t" }, inviteeLabel(i), " ", h("span", { class: "pill" }, i.channel === "phone" ? T.phone : T.email),
        same ? [" ", h("span", { class: "pill warn" }, T.invSameIp)] : null, i.disabled ? [" ", h("span", { class: "pill bad" }, T.disabled)] : null,
        // the bonus is paid at the invitee's first charged request: say which side of that line this one is on
        i.settled === false ? [" ", h("span", { class: "pill" }, T.invPendingPill)] : i.settled === true ? [" ", h("span", { class: "pill ok" }, T.invSettledPill)] : null),
        h("div", { class: "s" }, `${T.thJoined} ${dateOf(i.created_at)} · ${T.lastSeenAt} ${i.last_seen_at ? ago(i.last_seen_at) : T.never} · ${T.thReqs} ${fmt(i.requests)} · ${money(i.spent_cny)}`,
          i.last_ip ? [" · ", ipChip(i.last_ip, i.id)] : null)));
  }
  function invitesView() {
    const iv = need("invites");
    if (!iv) return loadingPanel(T.nav.invites);
    if (iv._error) return failedPanel(T.nav.invites, "invites", iv._error);
    const f = { q: params.get("q") || "", sort: INV_SORTS[params.get("sort")] ? params.get("sort") : "invited", dir: params.get("dir") || "desc", n: Number(params.get("n")) || PAGE };
    const q = f.q.trim().toLowerCase();
    const all = iv.leaders || [], fun = { with_code: 0, inviters: 0, invited: 0, ...(iv.funnel || {}) };
    const shown = all.filter((x) => !q || (x.hint || "").toLowerCase().includes(q) || (x.identifier || "").toLowerCase().includes(q) || (x.id || "").startsWith(q) || (x.last_ip || "").includes(q));
    const key = INV_SORTS[f.sort], sign = f.dir === "asc" ? 1 : -1;
    shown.sort((a, b) => (key(a) - key(b)) * sign || (b.invited || 0) - (a.invited || 0) || (b.last_invite_at || 0) - (a.last_invite_at || 0));
    const page = shown.slice(0, f.n);
    const sum = (k) => all.reduce((t, x) => t + Number(x[k] || 0), 0);
    const kpis = h("div", { class: "kpis in-panel" },
      flatKpi(T.invKpiCode, fmt(fun.with_code)), flatKpi(T.invKpiInviters, fmt(fun.inviters)), flatKpi(T.invKpiInvited, fmt(fun.invited)),
      flatKpi(T.invKpiActive, fmt(sum("invited_active"))), flatKpi(T.invKpiSameIp, fmt(sum("invited_same_ip"))));
    const toolbar = h("div", { class: "toolbar" },
      h("span", { class: "search" }, h("input", { type: "search", "data-focus": "invites-q", placeholder: T.invSearch, value: f.q, oninput: (e) => setParams({ q: e.target.value, n: "" }) })),
      select(T.fSort, f.sort, Object.entries(T.invSort), (v) => setParams({ sort: v, n: "" })),
      h("span", { class: "cnt" }, T.fCount(shown.length, all.length)));
    const th = (label, key, cls) => h("th", { class: (cls || "") + (key ? " sort" : "") + (key === f.sort ? " on" : ""), onclick: key ? () => setParams({ sort: key, dir: f.sort === key && f.dir === "desc" ? "asc" : "desc", n: "" }) : null }, label, key === f.sort ? (f.dir === "asc" ? " ↑" : " ↓") : "");
    const rows = [];
    page.forEach((x, i) => {
      const open = INV_OPEN.has(x.id), rank = shown.indexOf(x) + 1;
      rows.push(h("tr", { class: open ? "country" : "", onclick: () => { if (open) INV_OPEN.delete(x.id); else INV_OPEN.add(x.id); draw(); } },
        h("td", { class: "num fine" }, String(rank)),
        h("td", {}, h("div", { class: "who" }, h("div", { class: "disc" }, initial(x)),
          h("div", { style: "min-width:0" }, h("div", { class: "n", title: x.hint }, h("a", { class: "more-link", href: "#", onclick: (e) => { e.preventDefault(); e.stopPropagation(); openAccount(x.id); } }, who(x))),
            h("div", { class: "tags" }, h("span", { class: "pill" }, x.channel === "phone" ? T.phone : T.email), x.disabled ? h("span", { class: "pill bad" }, T.disabled) : null,
              h("span", { class: "fine" }, `${T.thJoined} ${dateOf(x.created_at)}`))))),
        h("td", { class: "num" + (f.sort === "invited" ? " on" : "") }, fmt(x.invited), x.invited_pending ? h("span", { class: "sub" }, T.invPending(x.invited_pending)) : null, x.invites !== x.invited ? h("span", { class: "sub" }, T.invRecorded(x.invites)) : null),
        h("td", { class: "num hide-sm" + (f.sort === "active" ? " on" : "") }, fmt(x.invited_active), x.invited ? h("span", { class: "sub" }, `${Math.round(100 * x.invited_active / x.invited)}%`) : null),
        h("td", { class: "num hide-sm" + (f.sort === "same_ip" ? " on" : "") }, x.invited_same_ip ? h("span", { class: "pill warn" }, fmt(x.invited_same_ip)) : "0"),
        h("td", { class: "num hide-sm" + (f.sort === "spent" ? " on" : "") }, money(x.invited_spent_cny)),
        h("td", { class: "num hide-sm" + (f.sort === "earned" ? " on" : "") }, money(x.earned_cny)),
        h("td", { class: "hide-sm" + (f.sort === "latest" ? " on" : "") }, x.last_invite_at ? ago(x.last_invite_at) : T.never, h("span", { class: "sub" }, `${T.firstSeen} ${dateOf(x.first_invite_at)}`)),
        h("td", { class: "num fine" }, open ? "▾" : "▸")));
      if (open) {
        const list = x.invitees || [];
        rows.push(h("tr", { class: "province" }, h("td", {}, ""), h("td", { colspan: 8, style: "padding:0" },
          h("div", { class: "list" }, ...list.map((it) => inviteeRow(it, x)), !list.length ? h("div", { class: "empty sm" }, T.none) : null,
            x.invited > list.length ? h("div", { class: "row tap", onclick: (e) => { e.stopPropagation(); openAccount(x.id); } }, h("span", { class: "tile grey", html: ICON.person }), h("div", { class: "txt" }, h("div", { class: "s" }, T.invMore(x.invited - list.length)))) : null,
            inviteAbuseRow(x, "padding:8px 16px 12px;flex-wrap:wrap;gap:8px 14px")))));
      }
    });
    const table = rows.length ? h("table", { class: "places" },
      h("thead", {}, h("tr", {}, th("#"), th(T.invThWho), th(T.invThInvited, "invited", "num"), th(T.invThActive, "active", "num hide-sm"), th(T.invThSameIp, "same_ip", "num hide-sm"),
        th(T.invThSpent, "spent", "num hide-sm"), th(T.invThEarned, "earned", "num hide-sm"), th(T.invThLast, "latest", "hide-sm"), th(""))),
      h("tbody", {}, ...rows)) : h("div", { class: "empty" }, all.length ? T.invNoMatch : T.invNone);
    return [h("div", { class: "panel" }, h("h2", {}, T.nav.invites, h("span", { class: "pill" }, fmt(fun.inviters)), h("span", { class: "sp" }), h("span", { class: "fine" }, T.invNote)), kpis, toolbar),
      h("div", { class: "panel" }, table,
        shown.length > page.length ? h("div", { class: "more" }, h("button", { class: "btn quiet sm", onclick: () => setParams({ n: f.n + PAGE }) }, T.moreRows(Math.min(PAGE, shown.length - page.length))), h("span", { class: "fine" }, T.shown(page.length, shown.length))) : null,
        h("div", { class: "fine", style: "padding:10px 16px 12px" }, T.invSameIpNote))];
  }

  // ── places: where people are, and a way into them ──────────────
  const PLACE_METRICS = [["accounts", "pAccounts"], ["new_accounts", "pNew"], ["signins", "pSignins"], ["requests", "pRequests"], ["demo_visitors", "pDemo"]];
  /** The places answer as a tree: countries with their provinces, every metric summed. */
  function placeTree(pv) {
    const cells = new Map();
    for (const [key] of PLACE_METRICS) for (const r of pv[key] || []) {
      const k = `${r.country}|${r.province}`;
      const c = cells.get(k) || { country: r.country, code: r.code, province: r.province, n: {} };
      c.n[key] = (c.n[key] || 0) + r.n;
      cells.set(k, c);
    }
    const byCountry = new Map();
    for (const c of cells.values()) { const e = byCountry.get(c.country) || { country: c.country, code: c.code, n: {}, provinces: [] }; for (const [key, v] of Object.entries(c.n)) e.n[key] = (e.n[key] || 0) + v; if (c.province) e.provinces.push(c); byCountry.set(c.country, e); }
    return [...byCountry.values()];
  }
  const placeName = (c) => (c.country === "本地网络" ? T.pLocal : c.country || T.pUnknown);
  function placesView() {
    const pv = need("places");
    if (!pv) return loadingPanel(T.places(days));
    if (pv._error) return failedPanel(T.places(days), "places", pv._error);
    const g = pv.geo || {};
    if (!g.ready) return panel(T.places(days), h("div", { class: "empty" }, g.error ? T.placesError(g.error) : g.fetching ? T.placesFetching : T.placesOff));
    const metrics = PLACE_METRICS.filter(([k]) => k !== "demo_visitors" || pv.demo_visitors);
    const metric = metrics.some(([k]) => k === params.get("m")) ? params.get("m") : "accounts";
    const by = (x) => x.n[metric] || 0;
    const countries = placeTree(pv).sort((a, b) => by(b) - by(a) || (b.n.requests || 0) - (a.n.requests || 0));
    const provinces = countries.flatMap((e) => e.provinces.map((c) => ({ ...c, label: countries.length > 1 ? `${c.province} · ${placeName(c)}` : c.province }))).sort((a, b) => by(b) - by(a));
    const toPeople = (c) => go("people", { country: placeName(c), ...(c.province ? { province: c.province } : {}) });
    const out = [];
    for (const e of countries) {
      out.push(h("tr", { class: "country", onclick: () => toPeople(e) }, h("td", {}, h("b", {}, placeName(e)), e.code ? h("span", { class: "fine", style: "margin-left:6px" }, e.code) : null), h("td", { class: "hide-sm" }, ""), ...metrics.map(([key]) => h("td", { class: "num" + (key === metric ? " on" : "") }, e.n[key] ? fmt(e.n[key]) : h("span", { class: "fine" }, "·")))));
      for (const c of e.provinces.sort((a, b) => by(b) - by(a)))
        out.push(h("tr", { class: "province", onclick: () => toPeople(c) }, h("td", {}, ""), h("td", { class: "hide-sm" }, c.province), ...metrics.map(([key]) => h("td", { class: "num fine" + (key === metric ? " on" : "") }, c.n[key] ? fmt(c.n[key]) : "·"))));
    }
    const metricLabel = T[metrics.find(([k]) => k === metric)[1]];
    return [h("div", { class: "panel" },
      h("h2", {}, T.places(days), h("span", { class: "sp" }), h("span", { class: "fine" }, T.pRowHint)),
      h("div", { class: "toolbar" }, h("span", { class: "lbl" }, T.pMetric), chips(metrics.map(([k, name]) => [k, T[name]]), metric, (v) => setParams({ m: v === "accounts" ? "" : v }))),
      h("div", { class: "charts two" },
        chart(`${T.pTopCountries} · ${metricLabel}`, fmt(countries.reduce((t, e) => t + by(e), 0)), hranks(countries.slice(0, 10).map((e) => ({ name: placeName(e), value: by(e), onclick: () => toPeople(e) })))),
        chart(`${T.pTopProvinces} · ${metricLabel}`, fmt(provinces.reduce((t, c) => t + by(c), 0)), hranks(provinces.slice(0, 10).map((c) => ({ name: c.label, value: by(c), tone: "cyan", onclick: () => toPeople(c) }))))),
      out.length ? h("div", { class: "ledger" }, h("table", { class: "places" }, h("thead", {}, h("tr", {}, h("th", {}, T.pCountry), h("th", { class: "hide-sm" }, T.pProvince), ...metrics.map(([k, name]) => h("th", { class: "num" + (k === metric ? " on" : "") }, T[name])))), h("tbody", {}, ...out))) : h("div", { class: "empty" }, T.pNone),
      h("div", { class: "fine", style: "padding:10px 16px 12px" }, `${T.pAccountsNote} · ${T.placesNote}`))];
  }

  // ── the other views ────────────────────────────────────────────
  function overviewView() {
    const s = settings(), rate = Number(s.usd_cny || 0);
    const c = ov.accounts || {}, today = ov.today || {}, week = ov.week || {}, period = ov.period || {}, sig = ov.signals_today || {};
    const spendKpi = (label, t) => kpi(`${T.kSpent} · ${label}`, money(t.cost_cny), T.kSpentSub(t.requests, t.charged), usd(t.cost_cny, rate));
    const usage = need("usage"), pv = need("places"), hv = need("health");
    const ct = ov.contributions || {};
    const samplesKpi = kpi(T.kSamples, fmt(ct.samples || 0), T.kSamplesSub(ct.accounts || 0));
    if (ct.samples) samplesKpi.append(h("button", { class: "btn quiet sm", style: "margin-top:6px", onclick: () => exportSamples() }, T.exportSamples));
    const healthStrip = !hv ? null : hv._error ? h("div", { class: "strip warn" }, h("span", { class: "tile warn", html: ICON.warn }), T.loadFailed(hv._error))
      : h("a", { class: "strip " + (hv.ok ? "ok" : "bad"), href: "#health" }, h("span", { class: "tile " + (hv.ok ? "ok" : "bad"), html: hv.ok ? ICON.ok : ICON.warn }),
        h("span", { class: "txt" }, h("b", {}, hv.ok ? T.hOk : T.hProblems), " · ", hv.ok ? `${T.hInFlight} ${fmt((hv.in_flight || {}).requests || 0)} · ${T.hOnline} ${fmt((hv.hub || {}).online || 0)} · ${T.hLastHour}: ${T.hRequests} ${fmt((hv.last_hour || {}).requests || 0)}, ${T.hUpstreamErrors} ${fmt((hv.last_hour || {}).upstream_errors || 0)}` : (hv.problems || []).join(" · ")), h("span", { class: "fine" }, `${T.seeAll} →`));
    const topRegions = !pv ? h("div", { class: "empty" }, T.loading) : pv._error || !(pv.geo || {}).ready ? h("div", { class: "empty" }, pv._error ? T.loadFailed(pv._error) : T.placesOff)
      : hranks(placeTree(pv).sort((a, b) => (b.n.accounts || 0) - (a.n.accounts || 0)).slice(0, 6).map((e) => ({ name: placeName(e), value: e.n.accounts || 0, onclick: () => go("people", { country: placeName(e) }) })));
    return [
      controlsStrip(),
      healthStrip,
      h("div", { class: "kpis" },
        kpi(T.kAccounts, fmt(c.total), T.kAccountsSub(c)),
        kpi(`${T.kActive} · ${T.today}`, fmt(today.active_accounts), T.kActiveSub(today.new_accounts || 0), `/ ${fmt(period.active_accounts)} ${T.period(days)}`),
        spendKpi(T.today, today), spendKpi(T.week, week), spendKpi(T.period(days), period),
        kpi(T.kOnline, fmt(ov.online_devices), T.kOnlineSub(c.devices || 0, c.live_keys || 0)),
        kpi(T.kSignals, fmt((sig.sign_ins || 0) + (sig.calls || 0)), T.kSignalsSub({ sign_ins: 0, sign_in_failures: 0, budget_refusals: 0, upstream_errors: 0, content_rejected: 0, calls: 0, ...sig })),
        samplesKpi),
      h("div", { class: "panel" }, h("h2", {}, T.byDay(Math.min(days, 90)), h("span", { class: "sp" }), seeAll("money")), usage ? (usage._error ? h("div", { class: "empty" }, T.loadFailed(usage._error)) : dayBars(usage.days, Math.min(days, 90), s.day_offset_h, rate)) : h("div", { class: "empty" }, T.loading)),
      h("div", { class: "grid2" },
        h("div", { class: "panel" }, h("h2", {}, T.nav.places, h("span", { class: "sp" }), seeAll("places")), h("div", { class: "pad" }, topRegions)),
        h("div", { class: "panel" }, h("h2", {}, T.top(days), h("span", { class: "sp" }), seeAll("money")), (ov.top_accounts || []).length ? (ov.top_accounts || []).slice(0, 6).map((t) => h("div", { class: "row tap", onclick: () => openAccount(t.account_id) },
          h("span", { class: "tile grey", html: ICON.person }), h("div", { class: "txt" }, h("div", { class: "t" }, t.identifier || t.hint), h("div", { class: "s" }, `${T.reqs(t.requests)} · ${T.tokens(t.charged)}`)),
          h("span", { class: "v" }, h("b", {}, money(t.cost_cny))))) : h("div", { class: "empty" }, T.none)),
        h("div", { class: "panel feed" }, h("h2", {}, T.events, h("span", { class: "sp" }), seeAll("activity")), h("div", { class: "list" }, ...(ov.events || []).slice(0, 10).map((e) => eventRow(e, true)), !(ov.events || []).length ? h("div", { class: "empty" }, T.none) : null)),
        h("div", { class: "panel" }, h("h2", {}, `${T.byKind} · ${T.today}`), kindRows(today.by_kind, rate), h("h2", {}, `${T.byKind} · ${T.period(days)}`), kindRows(period.by_kind, rate))),
    ];
  }
  function moneyView() {
    const s = settings(), rate = Number(s.usd_cny || 0), kinds = s.model_kinds || {};
    const today = ov.today || {}, week = ov.week || {}, period = ov.period || {};
    const usage = need("usage");
    const kind = params.get("k") || "";
    const spendKpi = (label, t) => kpi(`${T.kSpent} · ${label}`, money(t.cost_cny), T.kSpentSub(t.requests, t.charged), usd(t.cost_cny, rate));
    const tones = { chat: "blue", image: "violet", video: "cyan", realtime: "ok" };
    const share = (period.by_kind || []).map((r) => ({ label: T.kinds[r.kind] || r.kind, value: Number(r.cost_cny || 0), tone: tones[r.kind] || "grey", on: kind === r.kind, onclick: () => setParams({ k: kind === r.kind ? "" : r.kind }) }));
    const models = (period.by_model || []).filter((r) => !kind || (kinds[r.model] || r.kind || "chat") === kind);
    const top = (ov.top_accounts || []).map((t) => ({ name: t.identifier || t.hint, value: Number(t.cost_cny || 0), title: `${T.reqs(t.requests)} · ${T.tokens(t.charged)}`, onclick: () => openAccount(t.account_id) }));
    return [
      h("div", { class: "kpis" }, spendKpi(T.today, today), spendKpi(T.week, week), spendKpi(T.period(days), period)),
      h("div", { class: "panel" }, h("h2", {}, T.byDay(Math.min(days, 90))), usage ? (usage._error ? h("div", { class: "empty" }, T.loadFailed(usage._error)) : dayBars(usage.days, Math.min(days, 90), s.day_offset_h, rate)) : h("div", { class: "empty" }, T.loading)),
      h("div", { class: "grid2" },
        h("div", { class: "panel" }, h("h2", {}, `${T.mShare} · ${T.period(days)}`), h("div", { class: "pad" }, share.length ? split(share, money) : h("div", { class: "empty" }, T.none)),
          h("div", { class: "label", style: "margin:4px 16px" }, T.today), kindRows(today.by_kind, rate), h("div", { class: "label", style: "margin:12px 16px 4px" }, T.period(days)), kindRows(period.by_kind, rate)),
        h("div", { class: "panel" }, h("h2", {}, `${T.byModel} · ${T.period(days)}`),
          chips([["", T.kindAll], ...["chat", "image", "video", "realtime"].map((k) => [k, T.kinds[k]])], kind, (v) => setParams({ k: v })),
          modelRows(models, rate, kinds)),
        h("div", { class: "panel" }, h("h2", {}, T.mTop, h("span", { class: "fine" }, ` · ${T.period(days)}`)), h("div", { class: "pad" }, hranks(top, { format: money }))),
        h("div", { class: "panel" }, h("h2", {}, T.mPrices, h("span", { class: "fine" }, ` · ${T.rateLine(rate)}`)), h("div", { class: "kv" },
          ...Object.entries(s.prices || {}).flatMap(([id, p]) => [h("b", {}, ...modelPills(id, s)), h("span", {}, h("code", {}, id), " ", T.priceLine(p))])))),
    ];
  }
  function activityView() {
    const sr = need("series");
    const q = (params.get("q") || "").trim().toLowerCase();
    // the first page is 60 rows unfiltered (the overview's) and up to 200 with a kind; a shorter filtered page is the whole of it
    const rows = feedRows(), canMore = !feedEnd && rows.length > 0 && !!rows[rows.length - 1].id && (!filter || rows.length >= 200);
    const events = rows.filter((e) => !q || (e.hint || "").toLowerCase().includes(q) || (e.identifier || identOf(e.account_id, "")).toLowerCase().includes(q) || (e.detail || "").toLowerCase().includes(q) || (T.eventName[e.kind] || e.kind).toLowerCase().includes(q));
    return [
      sr ? (sr._error ? failedPanel(T.trends(days), "series", sr._error) : trendsPanel(sr)) : loadingPanel(T.trends(days)),
      h("div", { class: "panel feed" }, h("h2", {}, T.events, h("span", { class: "pill" }, fmt(events.length)), h("span", { class: "sp" }),
        h("span", { class: "search" }, h("input", { type: "search", "data-focus": "activity-q", placeholder: T.aSearch, value: params.get("q") || "", oninput: (e) => setParams({ q: e.target.value }) }))),
        h("div", { class: "filter" }, ...FILTERS.map(([k, name]) => h("button", { class: k === filter ? "on" : "", onclick: () => { filter = k; loadFiltered(); } }, T[name]))),
        h("div", { class: "list tall" }, ...events.map((e) => eventRow(e, true)), !events.length ? h("div", { class: "empty" }, filter && filtered === null ? T.loading : T.none) : null),
        canMore ? h("div", { class: "more" }, h("button", { class: "btn quiet sm", onclick: loadFeedMore }, feedBusy ? T.loading : T.loadMore), h("span", { class: "fine" }, T.feedLoaded(rows.length))) : null),
    ];
  }
  function demoView() {
    const dv = need("demo");
    if (!dv) return loadingPanel(T.demo(days));
    if (dv._error) return failedPanel(T.demo(days), "demo", dv._error);
    if (!dv.available) return panel(T.demo(days), h("div", { class: "empty" }, T.demoOff));
    const pv = need("places");
    const visitors = dv.visitors || [], visits = dv.visits || [], active = dv.active || [];
    const all = [...active, ...visits.filter((v) => !active.some((a) => a.id === v.id))];
    const pick = params.get("s") || "";
    const sessions = all.filter((v) => !pick || (pick === "running" ? !v.ended : pick === "signed" ? !!v.visitor : pick === "anon" ? !v.visitor : pick === "byok" ? !!v.byok : true));
    // demos a day, from when each started
    const offset = Number(settings().day_offset_h || 0) * 3600;
    const t = nowS(), dayStart = t - ((t + offset) % 86400), n = Math.min(days, 90), start = dayStart - (n - 1) * 86400;
    const perDay = new Array(n).fill(0);
    for (const v of all) if (v.started >= start) perDay[Math.min(n - 1, Math.floor((v.started - start) / 86400))]++;
    const every = labelEvery(n);
    const reasons = Object.entries(all.reduce((m, v) => { const k = v.ended ? T.dReason[v.reason] || v.reason || "?" : T.dtRunning; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value, tone: "violet" }));
    const places = !pv ? h("div", { class: "empty sm" }, T.loading) : pv._error || !pv.demo_visitors ? h("div", { class: "empty sm" }, T.none)
      : hranks(pv.demo_visitors.slice(0, 8).map((r) => ({ name: [r.country === "本地网络" ? T.pLocal : r.country || T.pUnknown, r.province].filter(Boolean).join(" · "), value: r.n, tone: "cyan" })));
    // 0.26: the visitors table searches like the People page: several words, all of them, anywhere
    const vq = terms(params.get("dq"));
    const shownVisitors = vq.length ? visitors.filter((v) => matches([identOf(v.id, v.hint), v.hint, v.id, v.last_ip, v.first_ip, v.last_ua, browserOf(v.last_ua || "")].filter(Boolean).join(" ").toLowerCase(), vq)) : visitors;
    const rows = shownVisitors.map((v) => h("tr", { onclick: () => openAccount(v.id) },
      h("td", {}, h("div", { class: "who" }, h("div", { class: "disc" }, initial(v)), h("div", { style: "min-width:0" }, h("div", { class: "n" }, identOf(v.id, v.hint) || v.id.slice(0, 8)), h("div", { class: "tags" }, h("span", { class: "pill" }, v.channel === "sms" || v.channel === "phone" ? T.phone : T.email), v.created ? h("span", { class: "pill cyan" }, T.demoCreated) : null)))),
      h("td", { class: "num" }, fmt(v.signins)), h("td", { class: "num" }, fmt(v.sessions)),
      h("td", { class: "hide-sm" }, when(v.first_seen)), h("td", {}, ago(v.last_seen)),
      h("td", { class: "hide-sm" }, v.last_ua ? h("div", {}, browserOf(v.last_ua)) : null, v.last_ip ? h("div", {}, ipChip(v.last_ip, v.id), v.first_ip && v.first_ip !== v.last_ip ? [" ", h("span", { class: "fine" }, `(${T.firstIp} `, ipChip(v.first_ip, v.id), ")")] : null) : null)));
    return [
      h("div", { class: "panel" },
        h("h2", {}, T.demo(days), h("span", { class: "sp" }), dv.signin_required === false ? h("span", { class: "fine" }, T.demoNoSignin) : null),
        h("div", { class: "kpis in-panel" }, flatKpi(T.demoVisitors, fmt(dv.visitors_total || 0)), flatKpi(T.demoVisits, fmt(visits.length), `/ ${fmt(dv.visits_total || 0)}`), flatKpi(T.demoActive, fmt(active.length))),
        h("div", { class: "charts" },
          chart(T.dPerDay, fmt(perDay.reduce((a, b) => a + b, 0)), vbars(perDay.map((v, i) => ({ value: v, label: i % every === 0 ? day(start + i * 86400) : "", title: `${day(start + i * 86400)} · ${fmt(v)}` })), "cyan")),
          chart(T.dReasons, null, hranks(reasons)), chart(T.dPlaces, null, places))),
      h("div", { class: "grid2 wide" },
        h("div", { class: "panel" }, h("h2", {}, T.demoVisitors, h("span", { class: "pill" }, vq.length ? `${fmt(rows.length)} / ${fmt(visitors.length)}` : visitors.length), h("span", { class: "sp" }),
          visitors.length ? h("span", { class: "search" }, h("input", { type: "search", "data-focus": "demo-q", placeholder: T.dvSearch, value: params.get("dq") || "", oninput: (e) => setParams({ dq: e.target.value }) })) : null),
          rows.length ? h("div", { class: "ledger", style: "max-height:560px;overflow:auto" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, T.dvHint), h("th", { class: "num" }, T.dvSignins), h("th", { class: "num" }, T.dvSessions), h("th", { class: "hide-sm" }, T.dvFirst), h("th", {}, T.dvLast), h("th", { class: "hide-sm" }, T.dvClient))), h("tbody", {}, ...rows))) : h("div", { class: "empty" }, visitors.length ? T.none : T.dvNone)),
        h("div", { class: "panel feed" }, h("h2", {}, T.demoVisits, h("span", { class: "pill" }, sessions.length)),
          chips([["", T.dAll], ["running", T.dRunning], ["signed", T.dSigned], ["anon", T.dAnon], ["byok", T.dByokOnly]], pick, (v) => setParams({ s: v })),
          h("div", { class: "list", style: "max-height:560px;overflow:auto" }, ...sessions.map((v) => visitRow(v, true)), !sessions.length ? h("div", { class: "empty" }, T.none) : null))),
    ];
  }
  /** 0.19: conversation sync in aggregate — accounts on / off, what is stored — never a text. */
  function syncPanel() {
    const sv = need("sync");
    if (!sv) return loadingPanel(T.syTitle);
    if (sv._error) return failedPanel(T.syTitle, "sync", sv._error);
    return panel(T.syTitle,
      h("div", { class: "kpis in-panel" },
        flatKpi(T.syOn, fmt(sv.accounts_enabled || 0), T.syOnSub(sv.accounts_disabled || 0)), flatKpi(T.syWith, fmt(sv.accounts_with_data || 0)),
        flatKpi(T.syConvs, fmt(sv.conversations || 0)), flatKpi(T.syMsgs, fmt(sv.messages || 0), T.syMsgsSub((sv.limits || {}).messages || 20000)), flatKpi(T.syBytes, sizeOf(sv.bytes || 0))),
      h("div", { class: "fine", style: "padding:0 16px 12px" }, T.syNote));
  }
  function dataView() { const dv = need("data"); return [!dv ? loadingPanel(T.data(days)) : dv._error ? failedPanel(T.data(days), "data", dv._error) : dataPanel(dv), syncPanel()]; }
  function siteView() { const tr = need("traffic"); return [githubPanel(), !tr ? loadingPanel(T.site(days)) : tr._error ? failedPanel(T.site(days), "traffic", tr._error) : sitePanel(tr)]; }
  function modelsView() { const cv = need("catalog"); return !cv ? loadingPanel(T.catalog) : cv._error ? failedPanel(T.catalog, "catalog", cv._error) : catalogPanel(cv); }
  function healthView() {
    const hv = need("health");
    if (!hv) return loadingPanel(T.nav.health);
    if (hv._error) return failedPanel(T.nav.health, "health", hv._error);
    const f = hv.in_flight || {}, hub = hv.hub || {}, hr = hv.last_hour || {}, db = hv.db || {};
    const tone = (bad, warn) => (bad ? " bad" : warn ? " warn" : "");
    const val = (v, cls) => h("div", { class: "v" + (cls || "") }, v);
    const card = (k, v, sub, cls) => h("div", { class: "kpi" }, h("div", { class: "k" }, k), val(v, cls), sub ? h("div", { class: "s" }, sub) : null);
    return [
      h("div", { class: "strip " + (hv.ok ? "ok" : "bad") }, h("span", { class: "tile " + (hv.ok ? "ok" : "bad"), html: hv.ok ? ICON.ok : ICON.warn }),
        h("span", { class: "txt" }, h("b", {}, hv.ok ? T.hOk : T.hProblems), hv.ok ? "" : " · " + (hv.problems || []).join(" · ")), h("span", { class: "fine" }, `v${hv.version || ""} · ${T.hServerTime} ${when(hv.time)} · ${T.hAuto}`)),
      h("div", { class: "label" }, T.hInFlight), h("div", { class: "kpis" },
        card(T.hInFlight, fmt(f.requests || 0), T.hInFlightSub(f.accounts || 0, f.limit || 0))),
      h("div", { class: "label" }, T.hHub), h("div", { class: "kpis" },
        card(T.hOnline, fmt(hub.online || 0)), card(T.hAccountsOnline, fmt(hub.accounts_online || 0)), card(T.hPending, fmt(hub.pending_calls || 0)),
        card(T.hDropped, fmt(hub.dropped_frames || 0), null, tone(false, hub.dropped_frames > 0)), card(T.hFlood, fmt(hub.flood_closes || 0), null, tone(hub.flood_closes > 0))),
      h("div", { class: "label" }, T.hLastHour), h("div", { class: "kpis" },
        card(T.hRequests, fmt(hr.requests || 0)), card(T.hUpstreamErrors, fmt(hr.upstream_errors || 0), null, tone(hr.upstream_errors >= 20, hr.upstream_errors > 0)), card(T.hContentRejected, fmt(hr.content_rejected || 0)), card(T.hRefused, fmt(hr.budget_refused || 0), null, tone(false, hr.budget_refused > 0)),
        card(T.hSignIns, fmt(hr.sign_ins || 0)), card(T.hFailures, fmt(hr.sign_in_failures || 0), null, tone(false, hr.sign_in_failures > 0))),
      h("div", { class: "label" }, T.hDb), h("div", { class: "kpis" },
        card(T.hDb, sizeOf(db.size_bytes || 0), db.writable ? T.hWritable : T.hNotWritable, tone(!db.writable)), card(T.hUpstream, hv.upstream_key ? T.hHave : T.hMissing, null, tone(!hv.upstream_key))),
      h("p", { class: "foot" }, T.hNote),
    ];
  }
  // ── runtime settings (relay 0.15): the allowance, the invite bonus, sign-up ──
  // Drafts live here between redraws (every answer redraws the page); a save
  // posts only the fields that were touched, "" meaning back to the environment.
  const RT_DRAFT = {};
  let rtMsg = "", rtBusy = false;
  async function rtSave() {
    const body = {};
    for (const key of ["allowance_cny", "invite_bonus_cny", "signup_open"]) if (key in RT_DRAFT) body[key] = RT_DRAFT[key] === "" ? null : RT_DRAFT[key];
    if (!Object.keys(body).length) return;
    rtBusy = true; rtMsg = ""; draw();
    try { await api("POST", "/v1/admin/settings", body); for (const k of Object.keys(RT_DRAFT)) delete RT_DRAFT[k]; rtMsg = T.rtSaved; } catch (e) { rtMsg = e.message; }
    rtBusy = false;
    await load();
  }
  async function rtApply(n, cny) {
    if (!confirm(T.rtApplyConfirm(n, cny))) return;
    try { const r = await api("POST", "/v1/admin/allowance/apply"); rtMsg = T.rtApplied(r.accounts); } catch (e) { rtMsg = e.message; }
    await load();
  }
  async function rtCreditAll(limitedCount) {
    const v = prompt(T.rtCreditAllPrompt, "2");
    if (v === null) return;
    const cny = parseFloat(v.replace(/[\s,¥]/g, ""));
    if (!Number.isFinite(cny) || cny === 0) return;
    if (!confirm(T.rtCreditAllConfirm(cny, limitedCount))) return;
    const note = prompt(T.creditNote, "") || "";
    try { const r = await api("POST", "/v1/admin/credit-all", { cny, note }); rtMsg = T.rtCredited(r.accounts); } catch (e) { rtMsg = e.message; }
    await load();
  }
  async function rtSetAll(limitedCount) {
    const v = prompt(T.rtSetAllPrompt(limitedCount), "=5");
    if (v === null) return;
    const change = parsePool(v);
    if (!change) { rtMsg = T.poolBad; draw(); return; }
    if (!confirm(T.setPoolManyConfirm(poolWords(change), limitedCount))) return;
    const note = prompt(T.creditNote, "") || "";
    try { const r = await api("POST", "/v1/admin/pool/batch", { all: true, ...change, note }); rtMsg = T.setPoolDone(r.accounts); } catch (e) { rtMsg = e.message; }
    await load();
  }
  function runtimePanel() {
    const rt = settings().runtime || { values: {}, env: {}, overridden: {}, below_allowance: 0 };
    const v = rt.values || {}, env = rt.env || {}, set = rt.overridden || {};
    const c = ov.accounts || {};
    const limited = Math.max(0, Number(c.total || 0) - Number(c.unlimited || 0) - Number(c.disabled || 0));
    const note = (key) => h("span", { class: "fine" }, (set[key] ? T.rtSet + " · " : "") + T.rtEnv(typeof env[key] === "boolean" ? (env[key] ? T.on : T.off) : env[key]));
    const num = (key, label) => [h("b", {}, label), h("span", { class: "rt" },
      h("input", { type: "number", step: "0.5", min: "0", "data-focus": "rt-" + key, value: key in RT_DRAFT ? RT_DRAFT[key] : (v[key] ?? ""), oninput: (e) => { RT_DRAFT[key] = e.target.value; draw(); } }), note(key))];
    const on = "signup_open" in RT_DRAFT ? RT_DRAFT.signup_open : !!v.signup_open;
    const dirty = Object.keys(RT_DRAFT).length > 0;
    return h("div", { class: "panel" }, h("h2", {}, T.rtTitle, h("span", { class: "sp" }), h("button", { class: "btn sm", disabled: dirty && !rtBusy ? null : "", onclick: rtSave }, T.rtSave)),
      h("div", { class: "fine", style: "padding:12px 16px 0" }, T.rtNote),
      h("div", { class: "kv" },
        ...num("allowance_cny", T.rtAllowance),
        ...num("invite_bonus_cny", T.rtBonus),
        h("b", {}, T.rtSignup), h("span", { class: "rt" }, h("label", { class: "sw" }, h("input", { type: "checkbox", checked: on ? "" : null, onchange: (e) => { RT_DRAFT.signup_open = e.target.checked; draw(); } }), " ", on ? T.on : T.off), note("signup_open"), h("span", { class: "fine" }, T.rtSignupOff))),
      h("div", { class: "acts", style: "padding:0 16px 12px; display:flex; gap:8px; flex-wrap:wrap; align-items:center" },
        Number(v.allowance_cny) > 0 && rt.below_allowance > 0
          ? h("button", { class: "btn quiet sm", onclick: () => rtApply(rt.below_allowance, v.allowance_cny) }, T.rtApply(rt.below_allowance))
          : h("span", { class: "fine" }, T.rtApplyNone),
        h("button", { class: "btn quiet sm", onclick: () => rtCreditAll(limited) }, T.rtCreditAll),
        h("button", { class: "btn quiet sm", onclick: () => rtSetAll(limited) }, T.rtSetAll),
        rtMsg ? h("span", { class: "fine" }, rtMsg) : null));
  }
  // ── nudges (relay 0.18): when the apps ask for a star on GitHub ──
  // The draft is a copy of the policy being edited (null = showing what is in force); a
  // save PUTs the whole policy, the server checks it and bumps the version.
  let ND = null, ndMsg = "", ndBusy = false;
  function ndEdit(nv) {
    if (!ND) ND = JSON.parse(JSON.stringify(nv.nudges));
    return ND;
  }
  async function ndSave() {
    if (!ND) return;
    ndBusy = true; ndMsg = ""; draw();
    try { await api("PUT", "/v1/admin/nudges", ND); ND = null; ndMsg = T.ndSaved; } catch (e) { ndMsg = e.message; }
    ndBusy = false;
    forget("nudges"); draw();
  }
  async function ndReset() {
    if (!confirm(T.ndResetConfirm)) return;
    ndBusy = true; ndMsg = ""; draw();
    try { await api("PUT", "/v1/admin/nudges", { reset: true }); ND = null; ndMsg = T.ndResetDone; } catch (e) { ndMsg = e.message; }
    ndBusy = false;
    forget("nudges"); draw();
  }
  function nudgesPanel() {
    const nv = need("nudges");
    if (!nv) return loadingPanel(T.ndTitle);
    if (nv._error) return failedPanel(T.ndTitle, "nudges", nv._error);
    const d = ND || nv.nudges, star = d.star || {}, m = star.moments || {};
    const listText = (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));
    const sw = (on, set, label, hint) => h("span", { class: "rt" },
      h("label", { class: "sw" }, h("input", { type: "checkbox", checked: on ? "" : null, disabled: ndBusy ? "" : null, onchange: (e) => { set(e.target.checked); draw(); } }), " ", label),
      hint ? h("span", { class: "fine" }, hint) : null);
    const text = (key, value, set, hint, type, attrs) => h("span", { class: "rt" },
      h("input", { type: type || "text", "data-focus": "nd-" + key, value, disabled: ndBusy ? "" : null, ...(attrs || {}), oninput: (e) => { set(e.target.value); draw(); } }),
      hint ? h("span", { class: "fine" }, hint) : null);
    const momentSw = (name, label, hint) => sw(!!m[name], (v) => { ndEdit(nv).star.moments[name] = v; }, label, hint);
    // the card's sentence (after relay 0.22): counted in code points, as the server counts it
    const left = (v) => T.ndTextLeft(Math.max(0, 200 - [...String(v ?? "").trim()].length));
    const cardText = (name, hint) => text(name, star[name] || "", (v) => { ndEdit(nv).star[name] = v; }, hint ? [left(star[name]), " · ", hint] : left(star[name]), "text", { class: "wide" });
    return h("div", { class: "panel" },
      h("h2", {}, T.ndTitle, h("span", { class: "fine" }, T.ndVersion(d.version, nv.updated_at ? when(nv.updated_at) : "")), h("span", { class: "sp" }),
        h("button", { class: "btn quiet sm", disabled: ndBusy || !nv.stored ? "" : null, onclick: ndReset }, T.ndReset),
        h("button", { class: "btn sm", disabled: ND && !ndBusy ? null : "", onclick: ndSave }, T.ndSave)),
      h("div", { class: "fine", style: "padding:12px 16px 0" }, T.ndNote),
      h("div", { class: "kv" },
        h("b", {}, T.ndEnabled), sw(!!star.enabled, (v) => { ndEdit(nv).star.enabled = v; }, star.enabled ? T.on : T.off, T.ndEnabledOff),
        h("b", {}, T.ndMoments), h("span", { class: "rt col" },
          momentSw("signed_in", T.ndSignedIn), momentSw("new_look", T.ndNewLook), momentSw("exhausted", T.ndExhausted), momentSw("goal_done", T.ndGoalDone)),
        h("b", {}, T.ndTasks), text("tasks", listText(m.tasks), (v) => { ndEdit(nv).star.moments.tasks = v; }, T.ndTasksHint),
        h("b", {}, T.ndDays), text("days", listText(m.days_used), (v) => { ndEdit(nv).star.moments.days_used = v; }, T.ndDaysHint),
        h("b", {}, T.ndCooldown), text("cooldown", star.cooldown_days ?? "", (v) => { ndEdit(nv).star.cooldown_days = v; }, null, "number", { min: "0", max: "365", step: "1" }),
        h("b", {}, T.ndMax), text("max", star.max_asks ?? "", (v) => { ndEdit(nv).star.max_asks = v; }, null, "number", { min: "0", max: "50", step: "1" }),
        h("b", {}, T.ndUrl), text("url", star.url || "", (v) => { ndEdit(nv).star.url = v; }, null, "url", { maxlength: "200", class: "wide" }),
        h("b", {}, T.ndTextEn), cardText("text")),
      ndMsg ? h("div", { class: "fine", style: "padding:0 16px 12px" }, ndMsg) : null);
  }
  function settingsView() {
    const s = settings(), rate = Number(s.usd_cny || 0);
    return [
      runtimePanel(),
      nudgesPanel(),
      h("div", { class: "panel" }, h("h2", {}, T.config),
        h("div", { class: "kv" },
          h("b", {}, T.kAccounts), h("span", {}, `${s.signup_open ? T.signupOpen : T.signupClosed} · ${T.capLine(s.allowance_cny, s.allowance_usd, s.invite_bonus_cny)} · ${T.perMinute(s.per_minute_requests)} · ${T.pwMin(s.password_min_len || 8)}`),
          h("b", {}, T.realtime), h("span", {}, s.realtime_enabled ? T.on : T.off),
          h("b", {}, T.allowed), h("code", {}, (s.allowed_identifiers || []).join(", ") || T.allowedNone),
          h("b", {}, T.rate), h("span", {}, T.rateLine(rate)),
          h("b", {}, T.prices), h("span", {}, ...Object.entries(s.prices || {}).map(([id, p]) => h("div", {}, ...modelPills(id, s), h("code", {}, id), " ", T.priceLine(p)))),
          h("b", {}, T.sender), h("span", {}, s.sender || "log"),
          h("b", {}, T.version), h("span", {}, ov.version || ""))),
      h("div", { class: "panel" }, h("h2", {}, T.recorded), h("div", { class: "fine", style: "padding:12px 16px" }, T.recordedNote)),
      h("p", { class: "foot" }, T.foot),
    ];
  }

  // ── 0.22: switches, thresholds, the audit log ──────────────────
  let ctlMsg = "", ctlBusy = false;
  const RULE_DRAFT = { threshold: "", action: "close_signups", note: "" };
  async function ctlCall(method, path, body) {
    ctlBusy = true; ctlMsg = ""; draw();
    try {
      const out = await api(method, path, body);
      ctlMsg = T.ctl.saved + (out && out.sockets_closed ? ` · ${T.ctl.closed(out.sockets_closed)}` : "");
      forget("controls"); forget("health");
      await load();
      return out || {};
    } catch (e) {
      if (e.message !== "admin") ctlMsg = T.ctl.failed(e.message);
      return null;
    } finally { ctlBusy = false; draw(); }
  }
  async function flipSwitch(key, enabled) {
    if (!confirm(T.ctl.confirm(T.ctl.names[key], enabled, T.ctl.what[key]))) return;
    const note = enabled ? "" : prompt(T.ctl.why, "");
    if (note === null) return;
    await ctlCall("POST", `/v1/admin/controls/${key}`, { enabled, note: note || "" });
  }
  async function notifyTest() {
    ctlBusy = true; draw();
    try { const out = await api("POST", "/v1/admin/controls/notify-test"); ctlMsg = out.sent ? T.ctl.notifySent : T.ctl.notifyFailed; forget("controls"); }
    catch (e) { if (e.message !== "admin") ctlMsg = T.ctl.failed(e.message); }
    ctlBusy = false; draw();
  }
  function switchRow(key, st) {
    const on = !!st.enabled;
    return h("div", { class: "ctl-row" + (on ? "" : " off") },
      h("div", { class: "txt" },
        h("div", { class: "t" }, T.ctl.names[key], h("span", { class: "pill " + (on ? "ok" : "bad") }, on ? T.on : T.off)),
        h("div", { class: "s" }, T.ctl.what[key]),
        st.updated_at ? h("div", { class: "fine" }, T.ctl.byLine(st.actor || "—", when(st.updated_at)) + (st.note ? ` · ${st.note}` : "")) : null),
      h("button", { class: "btn sm " + (on ? "danger" : ""), disabled: ctlBusy ? "" : null, onclick: () => flipSwitch(key, !on) }, on ? T.ctl.turnOff : T.ctl.turnOn));
  }
  function rulesPanel(cv) {
    const rules = cv.rules || [];
    const rows = rules.map((r) => h("tr", {},
      h("td", { class: "num" }, fmt(r.threshold)),
      h("td", {}, T.ctl.actions[r.action] || r.action),
      h("td", {}, h("label", { class: "sw" }, h("input", { type: "checkbox", checked: r.enabled ? "" : null, disabled: ctlBusy ? "" : null, onchange: (e) => ctlCall("PUT", `/v1/admin/controls/rules/${r.id}`, { enabled: e.target.checked }) }), " ", r.enabled ? T.on : T.off)),
      h("td", {}, r.last_fired_at ? h("span", { class: "pill warn" }, T.ctl.rFiredAt(r.fired_accounts || 0, when(r.last_fired_at))) : h("span", { class: "fine" }, T.ctl.rNever)),
      h("td", { class: "wrap" }, r.note || ""),
      h("td", { class: "num nowrap" },
        r.last_fired_at ? h("button", { class: "btn quiet sm", disabled: ctlBusy ? "" : null, onclick: () => ctlCall("PUT", `/v1/admin/controls/rules/${r.id}`, { rearm: true }) }, T.ctl.rRearm) : null, " ",
        h("button", { class: "btn quiet sm", disabled: ctlBusy ? "" : null, onclick: () => { if (confirm(T.ctl.rDeleteConfirm)) ctlCall("DELETE", `/v1/admin/controls/rules/${r.id}`); } }, T.ctl.rDelete))));
    const addRule = async () => {
      const n = parseInt(String(RULE_DRAFT.threshold).replace(/[\s,_]/g, ""), 10);
      if (!Number.isFinite(n) || n <= 0) return;
      const out = await ctlCall("POST", "/v1/admin/controls/rules", { threshold: n, action: RULE_DRAFT.action, note: RULE_DRAFT.note });
      if (out) { RULE_DRAFT.threshold = ""; RULE_DRAFT.note = ""; draw(); }
    };
    const add = h("div", { class: "toolbar" },
      h("span", { class: "lbl" }, T.ctl.rThreshold), h("input", { class: "num-in", type: "number", min: "1", "data-focus": "rule-n", value: RULE_DRAFT.threshold, oninput: (e) => { RULE_DRAFT.threshold = e.target.value; } }),
      select(T.ctl.rAction, RULE_DRAFT.action, Object.entries(T.ctl.actions), (v) => { RULE_DRAFT.action = v; }),
      h("input", { class: "txt-in", type: "text", placeholder: T.ctl.rNote, "data-focus": "rule-note", value: RULE_DRAFT.note, oninput: (e) => { RULE_DRAFT.note = e.target.value; } }),
      h("button", { class: "btn sm", disabled: ctlBusy ? "" : null, onclick: addRule }, T.ctl.rAdd),
      h("span", { class: "cnt" }, T.ctl.rNow(cv.accounts_total || 0) + (cv.next_threshold ? ` · ${T.ctl.rNext(cv.next_threshold)}` : "")),
      h("button", { class: "btn quiet sm", disabled: ctlBusy ? "" : null, onclick: () => ctlCall("POST", "/v1/admin/controls/evaluate") }, T.ctl.rCheck));
    return h("div", { class: "panel" },
      h("h2", {}, T.ctl.rules, h("span", { class: "sp" }), h("span", { class: "fine" }, cv.notify_configured ? T.ctl.notifyOk : T.ctl.notifyNo),
        cv.admin_email_set ? h("button", { class: "btn quiet sm", disabled: ctlBusy ? "" : null, onclick: notifyTest }, T.ctl.notifyTest) : null),
      h("div", { class: "fine", style: "padding:12px 16px 0" }, T.ctl.rulesNote),
      add,
      rules.length ? h("table", { class: "plain" }, h("thead", {}, h("tr", {}, h("th", { class: "num" }, T.ctl.rThreshold), h("th", {}, T.ctl.rAction), h("th", {}, T.ctl.rEnabled), h("th", {}, T.ctl.rLastFired), h("th", {}, T.ctl.rNote), h("th", {}))), h("tbody", {}, ...rows)) : h("div", { class: "empty" }, T.ctl.rNone));
  }
  function auditPanel(cv) {
    const rows = cv.audit || [];
    return h("div", { class: "panel" }, h("h2", {}, T.ctl.audit, h("span", { class: "pill" }, fmt(rows.length))),
      rows.length ? h("table", { class: "plain" }, h("thead", {}, h("tr", {}, h("th", {}, T.ctl.aWhen), h("th", {}, T.ctl.aWho), h("th", {}, T.ctl.aWhat), h("th", {}, T.ctl.aTarget), h("th", {}, T.ctl.aDetail))),
        h("tbody", {}, ...rows.map((r) => h("tr", {}, h("td", { class: "nowrap" }, when(r.ts), r.ip ? h("span", { class: "sub" }, r.ip) : null), h("td", {}, r.actor), h("td", {}, h("code", {}, r.action)), h("td", {}, r.target ? T.ctl.names[r.target] || r.target : ""), h("td", { class: "wrap" }, r.detail))))) : h("div", { class: "empty" }, T.ctl.aNone));
  }
  function controlsView() {
    const cv = need("controls");
    if (!cv) return loadingPanel(T.ctl.title);
    if (cv._error) return failedPanel(T.ctl.title, "controls", cv._error);
    const sw = cv.switches || {};
    const actorBox = h("span", { class: "search" }, h("input", { type: "text", placeholder: T.ctl.actorHint, title: T.ctl.actor, "data-focus": "ctl-actor", value: actorName(), oninput: (e) => SS.setItem(CTL_ACTOR_KEY, e.target.value.trim()) }));
    return [
      h("div", { class: "panel" },
        h("h2", {}, T.ctl.title, h("span", { class: "sp" }), ctlMsg ? h("span", { class: "fine" }, ctlMsg) : null, h("span", { class: "fine" }, T.ctl.actor), actorBox),
        h("div", { class: "fine", style: "padding:12px 16px 0" }, T.ctl.note),
        h("div", { class: "ctl-list" }, ...Object.keys(T.ctl.names).map((k) => switchRow(k, sw[k] || { enabled: true })))),
      rulesPanel(cv),
      auditPanel(cv),
    ];
  }
  /** The dashboard's first line: which switches are off, the next threshold. */
  function controlsStrip() {
    const cv = need("controls");
    if (!cv || cv._error) return null;
    const off = Object.entries(cv.switches || {}).filter(([, st]) => !st.enabled).map(([k]) => T.ctl.names[k] || k);
    return h("a", { class: "strip " + (off.length ? "bad" : "ok"), href: "#controls" }, h("span", { class: "tile " + (off.length ? "bad" : "ok"), html: off.length ? ICON.warn : ICON.ok }),
      h("span", { class: "txt" }, h("b", {}, T.ctl.strip(off)), cv.next_threshold ? ` · ${T.ctl.stripNext(cv.next_threshold, cv.accounts_total || 0)}` : ""), h("span", { class: "fine" }, `${T.seeAll} →`));
  }

  // ── 0.22: the statistics — every metric from stats.py, with its table and CSV ──
  const ST_OPEN = new Set(JSON.parse(SS.getItem("nm.admin.st") || "[]"));
  const dayUtc = (ts) => new Date(ts * 1000).toISOString().slice(0, 10);
  const dayLocal = (ts) => new Date(ts * 1000).toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
  const colLabel = (c) => c.label || c.key;
  const numKind = (c) => c.kind === "int" || c.kind === "cny";
  function cell(v, kind) {
    if (v === null || v === undefined) return h("span", { class: "fine" }, "—");
    if (kind === "day") return [dayUtc(v), h("span", { class: "sub" }, `${T.st.local} ${dayLocal(v)}`)];
    if (kind === "ts") return `${iso(v).slice(0, 16).replace("T", " ")} UTC`;
    if (kind === "cny") return money(v);
    if (kind === "bool") return v ? "✓" : "";
    if (kind === "int") return fmt(v);
    return String(v);
  }
  async function statCsv(id) {
    const r = await fetch(`/v1/admin/stats/${id}.csv?days=${days}`, { headers: { "X-Admin-Token": token } }).catch(() => null);
    if (!r || !r.ok) { alert(T.loadFailed(r ? r.statusText : T.offline)); return; }
    download(new Blob(["\ufeff" + await r.text()], { type: "text/csv;charset=utf-8" }), `wevvy-${id}-${new Date().toISOString().slice(0, 10)}.csv`);
  }
  function statPanel(m) {
    const title = m.title, how = m.how;
    const cols = m.columns || [], rows = m.rows || [];
    const open = m.shape !== "series" || ST_OPEN.has(m.id);
    let body = null;
    if (m.shape === "series" && rows.length) {
      const keys = (m.chart && m.chart.length ? m.chart : cols.filter((c) => c.kind === "int" && c.key !== "day").map((c) => c.key)).slice(0, 3);
      const tones = ["blue", "cyan", "violet"];
      const dayOf = (r) => `${dayUtc(r.day)} (${T.st.local} ${dayLocal(r.day)})`;
      body = h("div", { class: "sparks" }, ...keys.map((k, i) => { const c = cols.find((x) => x.key === k); return sparkRow(c ? colLabel(c) : k, rows, k, tones[i % 3], dayOf); }));
    } else if (m.shape === "table" && rows.length) {
      const num = cols.find(numKind), names = cols.filter((c) => c.kind === "str");
      if (num && names.length) body = h("div", { class: "pad" }, hranks(rows.slice(0, 12).map((r) => ({ name: names.map((c) => r[c.key]).filter(Boolean).join(" · "), value: Number(r[num.key] || 0) })), { format: num.kind === "cny" ? money : fmt }));
    }
    const table = !rows.length ? h("div", { class: "empty" }, T.st.none) : !open ? null : h("div", { class: "tbl" }, h("table", { class: "plain" },
      h("thead", {}, h("tr", {}, ...cols.map((c) => h("th", { class: numKind(c) ? "num" : "" }, colLabel(c))))),
      h("tbody", {}, ...rows.map((r) => h("tr", {}, ...cols.map((c) => h("td", { class: numKind(c) ? "num" : c.kind === "day" ? "nowrap" : "" }, cell(r[c.key], c.kind))))))));
    const toggleTable = () => { if (ST_OPEN.has(m.id)) ST_OPEN.delete(m.id); else ST_OPEN.add(m.id); SS.setItem("nm.admin.st", JSON.stringify([...ST_OPEN])); draw(); };
    return h("div", { class: "panel stat" },
      h("h2", {}, title, h("span", { class: "tt", title: how, "aria-label": how }, "ⓘ"), h("span", { class: "fine" }, T.st.rows(rows.length)), h("span", { class: "sp" }),
        m.shape === "series" && rows.length ? h("button", { class: "btn quiet sm", onclick: toggleTable }, open ? T.st.hideTable : T.st.showTable) : null,
        rows.length ? h("button", { class: "btn quiet sm", onclick: () => statCsv(m.id) }, T.st.csv) : null),
      h("div", { class: "how" }, how),
      body, table);
  }
  function statsView() {
    const sv = need("stats");
    if (!sv) return loadingPanel(T.st.title);
    if (sv._error) return failedPanel(T.st.title, "stats", sv._error);
    // 0.26: the metrics' names up top, each a jump to its panel; the page is long
    const metrics = sv.metrics || [];
    const panels = metrics.map((m) => { const p = statPanel(m); p.id = `st-${m.id}`; return p; });
    const jump = h("div", { class: "filter", style: "border-bottom:0;padding-top:0" }, ...metrics.map((m) => h("button", { onclick: () => { const el = document.getElementById(`st-${m.id}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); } }, m.title)));
    return [h("div", { class: "panel" }, h("h2", {}, T.st.title, h("span", { class: "sp" }), h("span", { class: "fine" }, `${T.st.utc} · ${T.st.local}: ${T.st.localTz()} · ${T.st.generated(when(sv.generated_at))}`)), h("div", { class: "fine", style: "padding:12px 16px" }, T.st.note), jump),
      ...panels];
  }

  // ── 0.22: GitHub — the collector's series, on the Site page ────
  let ghBusy = false, ghMsg = "";
  async function ghRefresh() {
    ghBusy = true; ghMsg = T.gh.refreshing; draw();
    try { const out = await api("POST", "/v1/admin/github/refresh"); ghMsg = out.ok ? T.gh.refreshed(out.stars, out.downloads) : T.gh.error(out.error || "?"); }
    catch (e) { if (e.message !== "admin") ghMsg = T.gh.error(e.message); }
    ghBusy = false; forget("github"); forget("stats"); draw();
  }
  function githubPanel() {
    const gv = need("github");
    if (!gv) return loadingPanel(T.gh.title);
    if (gv._error) return failedPanel(T.gh.title, "github", gv._error);
    const st = gv.status || {}, latest = gv.latest || {}, rows = gv.days || [];
    if (!st.enabled) return panel(T.gh.title, h("div", { class: "empty" }, T.gh.off));
    const sum = (k) => rows.reduce((a, r) => a + Number(r[k] || 0), 0);
    const dayOf = (r) => `${dayUtc(r.day)} (${T.st.local} ${dayLocal(r.day)})`;
    const platforms = Object.entries(latest.platforms || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: k, value: v }));
    return h("div", { class: "panel" },
      h("h2", {}, T.gh.title, h("code", {}, st.repo), h("span", { class: "sp" }),
        h("span", { class: "fine" }, ghMsg || (st.error ? T.gh.error(st.error) : st.last_ok ? T.gh.lastOk(when(st.last_ok)) : T.gh.never), ` · ${st.token ? T.gh.token : T.gh.noToken}`),
        h("button", { class: "btn quiet sm", disabled: ghBusy ? "" : null, onclick: ghRefresh }, T.gh.refresh),
        h("button", { class: "btn quiet sm", onclick: () => statCsv("github_daily") }, T.st.csv)),
      h("div", { class: "kpis in-panel" },
        flatKpi(T.gh.stars, fmt(latest.stars || 0), T.sDelta(sum("new_stars"))), flatKpi(T.gh.forks, fmt(latest.forks || 0), T.sDelta(sum("new_forks"))),
        flatKpi(T.gh.watchers, fmt(latest.watchers || 0), T.sDelta(sum("new_watchers"))), flatKpi(T.gh.issues, fmt(latest.issues || 0), ""),
        flatKpi(T.gh.downloads, fmt(latest.downloads || 0), T.sDelta(sum("new_downloads")))),
      rows.some((r) => r.snapshot) ? h("div", { class: "sparks" }, sparkRow(T.gh.newStars, rows, "new_stars", "blue", dayOf), sparkRow(T.gh.newDownloads, rows, "new_downloads", "violet", dayOf)) : h("div", { class: "empty" }, T.sNone),
      h("div", { class: "cols3" },
        h("div", {}, h("h3", {}, T.gh.assets), rankRows((latest.assets || []).map((a) => ({ name: a.name, hits: a.downloads })))),
        h("div", {}, h("h3", {}, T.gh.platforms), hranks(platforms, { mono: true })),
        h("div", {}, h("h3", {}, T.gh.releases), rankRows((latest.releases || []).map((r) => ({ name: r.tag, hits: r.downloads }))))),
      h("div", { class: "fine", style: "padding:0 16px 12px" }, T.gh.note));
  }
  const RENDER = { overview: overviewView, people: peopleView, invites: invitesView, places: placesView, money: moneyView, activity: activityView, demo: demoView, data: dataView, site: siteView, models: modelsView, health: healthView, stats: statsView, controls: controlsView, settings: settingsView };

  // ── the shell: bar, nav, one view ──────────────────────────────
  function drawMain() {
    const c = ov.accounts || {};
    const hv = CACHE.get(cacheKey("health")), problems = hv && hv.value && !hv.value._error ? (hv.value.problems || []).length : 0;
    const badge = { people: fmt(c.total || 0), health: problems ? String(problems) : "" };
    const nav = h("nav", { class: "side" }, ...VIEWS.map((v) => h("a", { class: (v === view ? "on" : "") + (v === "health" && problems ? " alert" : ""), href: `#${v}`, onclick: (e) => { if (v === view) { e.preventDefault(); params = new URLSearchParams(); history.replaceState(null, "", `#${v}`); draw(); } } },
      h("span", { class: "ic", html: NAV_ICON[v] }), T.nav[v], badge[v] ? h("span", { class: "badge" }, badge[v]) : null)));
    const body = [].concat(RENDER[view]()).filter(Boolean);
    app.replaceChildren(h("div", { class: "admin" },
      h("div", { class: "bar" },
        h("img", { src: "../mark.svg", alt: "" }),
        h("h1", {}, T.title, h("small", {}, location.host, ov.version ? ` · v${ov.version}` : "")),
        h("div", { class: "seg" }, ...[7, 30, 90].map((d) => h("button", { class: d === days ? "on" : "", onclick: () => { days = d; SS.setItem("nm.admin.days", d); load(); } }, T.period(d)))),
        h("button", { class: "round", title: T.refresh, html: ICON.refresh, onclick: load }),
        h("button", { class: "round", title: T.lock, html: ICON.lock, onclick: () => { token = ""; SS.removeItem("nm.admin"); ov = null; CACHE.clear(); draw(); } })),
      err ? h("div", { class: "hint bad", style: "margin:0 0 14px" }, err) : null,
      h("div", { class: "shell" }, nav, h("main", { class: "view" }, ...body)),
    ));
  }

  function draw() {
    const act = document.activeElement, fid = act && act.dataset ? act.dataset.focus : null, pos = fid && typeof act.selectionStart === "number" ? act.selectionStart : null;
    if (!token || !ov) drawGate(); else drawMain();
    if (fid) { const el = app.querySelector(`[data-focus="${fid}"]`); if (el) { el.focus(); if (pos !== null && el.setSelectionRange) try { el.setSelectionRange(pos, pos); } catch (_) { /* a search box may refuse */ } } }
    if (drawerEl) drawDrawer();
  }

  document.title = T.title;
  route();
  if (token) load(); else draw();
})();
