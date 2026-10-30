/* wevvy web console — a front door to the Muses on your devices, and
   to your wevvy Cloud account. No build step, no framework: one
   WebSocket to /v1/hub as a `web` device, `task` calls to the device you
   pick, events streamed back; the account sheet talks to /v1/me. */
(() => {
  "use strict";

  const VERSION = "1.0.5";

  // ── i18n ────────────────────────────────────────────────────────
  const T = {
    tagline: "Every device you own, a Muse of yours.",
    welcome: "Welcome to Wevvy", identifierPh: "Mobile number or email", smsNotice: "By using your mobile number, you may receive SMS notifications from us.", learnMore: "Learn more", continueBtn: "Continue", goBack: "Back", settings: "Settings", appearance: "Appearance", themeLight: "Light", themeDark: "Dark", themeSystem: "System", resend: "Resend code", noCode: "Did not get the code?", confirmBtn: "Confirm", digit: (n) => `Digit ${n}`,
    identifier: "Mainland China phone number or e-mail", smsRegion: "Text-message codes reach mainland-China numbers only. Use an e-mail address instead.", code: "Verification code", password: "Password", sendCode: "Send code", signIn: "Sign in", another: "Use another account",
    byCode: "With a code", byPassword: "With a password", forgot: "Forgot it? Sign in with a code", show: "Show", hide: "Hide",
    codeSent: (m) => `A six-digit code is on its way; it is good for ${m} ${m === 1 ? "minute" : "minutes"}.`, relay: "Server", fine: "Once signed in, this page shows every device of your account that is online and lets each device's Muse do things. The page itself operates nothing.",
    devices: "Devices", noDevices: "No device yet. Sign in to wevvy on your phone with this account, or run wevvy Desktop on a computer, and they appear here.",
    online: "online", offline: "offline", phone: "phone", computer: "computer", web: "browser", thisTab: "this tab",
    signOut: "Sign out", signOutAll: "Sign out everywhere", connected: "connected", connecting: "connecting…", disconnected: "disconnected, reconnecting…",
    pick: "Pick a device", pickSub: "then tell it what to do, like a message. The Muse on a phone uses the phone's apps and sandbox; the one on a computer uses its shell, files and screen; and they can ask each other.",
    placeholder: (n) => `Ask ${n} to do something…`, offlineNote: (n) => `${n} is offline; nothing can be sent.`,
    thinking: "thinking", running: "run", result: "result", asks: "asks", remote: "there", failed: "failed",
    approvalTitle: (d) => `${d} wants to do something that needs your OK`, allow: "Allow", deny: "Don't", allowed: "allowed", denied: "declined", expired: "timed out", stop: "Stop",
    stopped: "Stopped.", clear: "Clear history", forget: "Forget", forgetConfirm: (n) => `Take ${n} off the list? It comes back the next time it signs in with this account.`, errorOffline: "The device went offline before answering.", errorTimeout: "No answer in time.", errorBusy: "That device is still on the previous message.",
    busy: (n) => `${n} is working…`, sentFrom: "from the web", waitingPhone: "The Muse on the phone is working; the answer comes back here when it is done.",
    lastSeen: "last seen", justNow: "just now", minAgo: (m) => `${m} min ago`, hAgo: (h) => `${h} h ago`, dAgo: (d) => `${d} d ago`,
    risks: { destructive: "removes or rewrites", outbound: "sends something out", system: "system-level", install: "installs software", money: "a payment" },
    account: "Account", member: "member", regular: "account", since: "since", noPassword: "No password yet", hasPassword: "Password set", setPassword: "Set a password", changePassword: "Change password",
    allowance: "Free allowance", unlimited: "No ceiling", spentTotal: (a, c) => `${a} of ${c} used`, spentOnly: (a) => `${a} used in all`, tokensToday: (n) => `${n} tokens today`,
    allowanceWhy: (a, b, region) => `Every account has ${usdOf(a)} to spend, for good; it does not reset by the day. A friend who signs up with your code adds ${usdOf(b)} for each of you. When it is gone, bring your own key${region === "cn" ? " (Alibaba Cloud Bailian covers chat, hands, pictures and clips with one key and has a free tier for mainland China accounts; DeepSeek, Kimi, Zhipu and others work too)" : " (OpenRouter or OpenAI first outside mainland China; Alibaba Cloud Bailian only signs up accounts from the mainland)"}, or sign in with a plan you already pay for (ChatGPT, Claude or Kimi, where the app has the sign-in). Sign-in and your devices keep working either way.`, allowanceWarn: "Nearly used up.", allowanceOut: "Used up.", ownKey: "How to set up a Bailian key", openRouterKey: "Get an OpenRouter key", ownKeyGuide: "Bring your own key: how", keyFrom: (name) => `Get a key from ${name}`, covers: { chat: "chat", vision: "hands", image: "pictures", video: "clips" }, coversLine: (list) => `covers ${list.join(", ")}`, plansLine: (names) => `Or sign in with a plan you already pay for: ${names.join(", ")} (where the app has the sign-in).`,
    usage: "Usage", today: "Today", allTime: "All time", byModel: "By model", noUsage: "Nothing used yet.", requests: (n) => `${n} req`, tokens: (n) => `${n} tokens`, seconds: (n) => `${n} s`, images: (n) => `${n} pictures`,
    kinds: { chat: "Chat", image: "Pictures", video: "Video", realtime: "Calls" },
    signIns: "Signed in on", thisOne: "this one", revoke: "Sign out", viaCode: "code", viaPassword: "password", viaWeb: "web", lastUsed: "last used",
    activity: "Activity", events: {
      "account.created": "Account created", "sign_in.code": "Signed in with a code", "sign_in.password": "Signed in with the password", "sign_in.failed": "Failed sign-in", "password.set": "Password set", "password.changed": "Password changed",
      "password.cleared": "Password removed", "sign_out": "Signed out", "sign_out.all": "Signed out everywhere", "pool.set": "Allowance adjusted", "budget.refused": "Refused: allowance used up", "upstream.error": "Model service error", "content.rejected": "The model provider's content check declined the request", "call.ended": "Call ended", "contribute.on": "Turned on “Help improve wevvy's AI models”", "contribute.off": "Turned off “Help improve wevvy's AI models”", "contribute.default": "New account: “Help improve wevvy's AI models” on by default", "contribute.deleted": "Deleted the kept conversations", "invite.accepted": "A friend signed up with your code", "invite.used": "Signed up with an invite code", "invite.settled": "Invite bonus paid", "credit.granted": "Credit granted", "grant.tokens": "Token grant adjusted", "account.disabled": "Account disabled by the operator", "account.enabled": "Account enabled again", "member.set": "Made a member", "member.unset": "Membership removed", "contribute.bonus": "Early co-creation bonus", "sync.on": "Turned on “Sync conversations between my devices”", "sync.off": "Turned off “Sync conversations between my devices”; the synced conversations were deleted", "sync.deleted": "Deleted the synced conversations",
    },
    ways: "Leave", signOutConfirm: "Sign this page out?", signOutAllConfirm: "Sign out everywhere? wevvy on your phone and computers will ask you to sign in again.",
    pwTitle: (has) => (has ? "Change password" : "Set a password"), pwWhy: (n) => `With a password you can sign in without waiting for a code. At least ${n} characters.`, pwCurrent: "Current password", pwNew: "New password", pwAgain: "Once more", pwRemove: "Remove the password", pwSaved: "Password saved.", pwRemoved: "Password removed.", pwMismatch: "The two do not match.", pwShort: (n) => `At least ${n} characters.`,
    save: "Save", cancel: "Cancel", ok: "OK", refresh: "Refresh", community: "wevvy Cloud is run by volunteers of the community, not for profit. What is kept here is counts, tokens and an estimated cost; whether the text of your chats helps improve the model is the switch under Data controls below.",
    contribute: "Data controls", improve: "Help improve wevvy's AI models", contributeWhy: "When this is on, the text of your chats with the wevvy Cloud models (what you wrote, what it answered and the tools it chose to call) is kept on the server to train the community's own open model. Not the system prompt (memory, SOUL, instructions), not what tools returned, not pictures, and never next to who you are. Turn it off at any time and delete what was kept.", contributeDefault: (on) => on ? "On by default for new accounts." : "Off by default for new accounts.", contributeOn: "On", contributeOff: "Off", contributeCount: (n) => `${n} turns kept`, deleteSamples: "Delete the kept conversations", deleteSamplesConfirm: "The kept conversations are removed from the server. This cannot be undone.", deleted: (n) => `${n} turns deleted`, privacy: "Privacy policy", syncTitle: "Sync conversations between my devices", syncWhy: "The text of your chats is kept on wevvy Cloud so every device shows the same conversations. Files and images stay on the device they were made on.", syncCount: (c, m) => `${c} conversations · ${m} messages`, syncEmpty: "Nothing synced yet", deleteSync: "Delete synced conversations", deleteSyncConfirm: "The text kept on wevvy Cloud is deleted; the switch stays as it is. What each device keeps locally is not touched.", syncDeleted: "Deleted", syncOffConfirm: "Turning this off deletes the text kept on wevvy Cloud and stops syncing between your devices.",
    invite: "Invite a friend", inviteWhy: (b) => `When a friend signs up with your code and makes a first request, each of you gets ${usdOf(b)} added to your allowance. It never expires.`, inviteCode: "Invite code", inviteLink: "Invite link", copy: "Copy", copied: "Copied", invited: (n) => `${n} invited`, earned: (c) => `${usdOf(c)} from invites`,
    errors: { bad_identifier: "Enter a mainland phone number or an e-mail address.", phone_region: "Codes reach mainland China numbers only for now; elsewhere, sign in with an e-mail address.", channel_unsupported: "This relay does not send text-message codes; sign in with an e-mail address.", code_wrong: "That code is not right.", code_expired: "That code has expired; send a new one.", code_too_often: "Too many codes; wait a few minutes.", not_invited: "This relay is private; that address is not on its list.", signup_closed: "New sign-ups are paused on this relay for now; existing accounts keep working. Try again later.", domain_limited: "This address's domain has reached today's sign-up limit on this relay; try again tomorrow or use another address.", allowance_exhausted: (e) => e.paused ? `The free allowance is paused for now, so the shared models are not answering. Bring your own key${e.region === "cn" ? " (Alibaba Cloud Bailian covers chat, hands, pictures and clips with one key)" : " (OpenRouter or OpenAI first outside mainland China; Alibaba Cloud Bailian only signs up accounts from the mainland)"}, or sign in with a plan you already pay for (ChatGPT, Claude or Kimi, where the app has the sign-in); your sign-in, your devices and what you have left stay as they are.` : `Your free allowance is used up. Invite a friend (+${usdOf(e.invite_bonus_cny ?? 5)} for each of you), bring your own key${e.region === "cn" ? " (Alibaba Cloud Bailian covers chat, hands, pictures and clips with one key)" : " (OpenRouter or OpenAI first outside mainland China; Alibaba Cloud Bailian only signs up accounts from the mainland)"}, or sign in with a plan you already pay for (ChatGPT, Claude or Kimi, where the app has the sign-in); sign-in and your devices keep working.`, daily_cap: "Today's token quota is used up; it comes back tomorrow.", too_many_in_flight: "Too many requests under way on this account; wait for the last one to finish.", rate_limited: "Too many requests; slow down a little.", service_paused: "wevvy Cloud is paused by its operator for now; your sign-in and your data are kept. Try again later.", sync_paused: "Conversation sync is paused for now; what is stored is kept and each device keeps working on its own.", hub_paused: "The device hub is paused for now; each device keeps working on its own.", account_deleted: "This account was deleted. Signing in again starts a new one.", send_failed: "The code could not be sent; try again shortly.", bad_key: "Your sign-in has expired; sign in again.", offline: "Cannot reach the server.",
      bad_credentials: "That address or password is not right.", no_password: "This account has no password yet; sign in with a code.", locked: "Too many wrong passwords; try later or use a code.", password_short: () => `At least ${cfg.password_min_len} characters.`, password_long: "That password is too long.", password_weak: "That password is too easy.", password_wrong: "The current password is not right.", password_required: "Enter the current password.", account_disabled: "This account has been disabled.",
      bad_request: "The request was not understood; reload the page and try again.", too_large: "That is too large for the server to take.", no_session: "That sign-in no longer exists.", device_online: "That device is connected right now; sign out on it first.", sync_off: "Conversation sync is off for this account.", invite_code: "An invite code could not be made just now; try again shortly.", not_found: "There is no such thing." },
    email: "e-mail", hubPaused: "device hub paused",
  };

  // ── state ───────────────────────────────────────────────────────
  const LS = window.localStorage;
  const base = location.origin;
  // the relay's figures the forms print (/v1/config, public, a minute's cache): how long a
  // code is good for and the shortest password it takes; these are the defaults an older
  // relay leaves us with until the answer lands
  const cfg = { code_ttl_s: 600, password_min_len: 8, privacy_url: "" };
  const codeMinutes = () => Math.max(1, Math.round((Number(cfg.code_ttl_s) || 600) / 60));
  // the Learn more target on the sign-in: the relay's own privacy page when it sends one
  const privacyUrl = () => cfg.privacy_url || "https://wevvy.in/privacy/";
  fetch(base + "/v1/config").then((r) => (r.ok ? r.json() : {})).then((c) => {
    if (c && Number(c.code_ttl_s) > 0) cfg.code_ttl_s = Number(c.code_ttl_s);
    if (c && Number(c.password_min_len) > 0) cfg.password_min_len = Number(c.password_min_len);
    if (c && c.privacy_url) cfg.privacy_url = String(c.privacy_url);
  }).catch(() => { /* the defaults stand */ });
  // appearance (the gear on the sign-in): light, dark, or the system; the CSS only
  // knows html[data-theme="dark"], so the choice resolves to one of the two
  const themeName = () => { try { return LS.getItem("nm.theme") || "system"; } catch (_) { return "system"; } };
  function applyTheme() {
    let dark = themeName() === "dark";
    if (themeName() === "system") { try { dark = window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (_) { /* light */ } }
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }
  applyTheme();
  try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (themeName() === "system") applyTheme(); }); } catch (_) { /* older browsers */ }
  const params = new URLSearchParams(location.search);
  let key = LS.getItem("nm.key") || "";
  let hint = LS.getItem("nm.hint") || "";
  let ws = null, wsState = "off", hubPaused = false, backoff = 1000, devices = [], selected = params.get("device") || LS.getItem("nm.selected") || "";
  const pending = new Map(); // call id → {onEvent, resolve, reject}
  const chats = new Map(); // device id → {messages:[], busy:false, callId:null}
  // One hub device per tab, not per browser: the id lives in sessionStorage, so a reload
  // keeps it and a second tab gets its own. Two tabs sharing one id took turns replacing
  // each other on the hub (close 4003) and reconnecting, for as long as both stayed open.
  const webId = (() => {
    let id = "";
    try { id = window.sessionStorage.getItem("nm.webid") || ""; } catch (_) { /* storage denied */ }
    if (!id) {
      id = "web-" + Math.random().toString(36).slice(2, 12);
      try { window.sessionStorage.setItem("nm.webid", id); } catch (_) { /* this tab's life only */ }
    }
    return id;
  })();
  LS.removeItem("nm.webid"); // the id of before, shared by every tab of this browser

  const app = document.getElementById("app");
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v; else if (v !== null && v !== undefined) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const svg = (paths, extra = "") => `<svg viewBox="0 0 24 24" ${extra}>${paths}</svg>`;
  const ICON = {
    phone: svg('<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>'),
    computer: svg('<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 20.5h8M12 17v3.5"/>'),
    web: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    person: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>'),
    key: svg('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M15 5l3 3M18 4l2 2"/>'),
    chat: svg('<path d="M4 5.5h16v10H9l-5 4z"/>'),
    image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
    video: svg('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>'),
    realtime: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
    devices: svg('<rect x="2.5" y="5" width="13" height="10" rx="2"/><rect x="17" y="9" width="4.5" height="10" rx="1.5"/><path d="M6 19h6"/>'),
    out: svg('<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l5 4-5 4M20 12H9"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    back: svg('<path d="M15 5l-7 7 7 7"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    more: svg('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'),
    refresh: svg('<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>'),
    shield: svg('<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  };

  // A very small Markdown: paragraphs, **bold**, `code`, ```blocks```, links, lists.
  function md(text) {
    const blocks = String(text).split(/```/);
    let out = "";
    blocks.forEach((b, i) => {
      if (i % 2 === 1) { out += `<pre>${esc(b.replace(/^\w*\n/, ""))}</pre>`; return; }
      const paras = b.split(/\n{2,}/).filter((p) => p.trim());
      for (const p of paras) {
        let s = esc(p);
        s = s.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
          .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
          .replace(/^(?:[-*] .*(?:\n|$))+/gm, (m) => "<ul>" + m.trim().split("\n").map((l) => `<li>${l.replace(/^[-*] /, "")}</li>`).join("") + "</ul>")
          .replace(/^#{1,3} (.*)$/gm, "<b>$1</b>");
        out += `<p>${s.replace(/\n/g, "<br>")}</p>`;
      }
    });
    return out;
  }

  // ── cloud HTTP ───────────────────────────────────────────────────
  async function api(method, path, body, token) {
    const r = await fetch(base + path, {
      method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => { throw { code: "offline" }; });
    if (r.status === 204) return {};
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw { ...(data.error || {}), code: (data.error && data.error.code) || `http_${r.status}`, message: (data.error && data.error.message) || "" };
    return data;
  }
  const errText = (e) => { const t = T.errors[e.code]; return (typeof t === "function" ? t(e) : t) || e.message || e.code || String(e); };
  const deviceName = () => `Web console · ${navigator.platform || "browser"}`;

  // ── sign in view ─────────────────────────────────────────────────
  { const inv = new URLSearchParams(location.search).get("invite"); if (inv) LS.setItem("nm.invite", inv); }
  function renderSignIn() {
    let identifier = LS.getItem("nm.identifier") || "", sent = false, busy = false, msg = "", bad = false, gear = false;
    let digits = ["", "", "", "", "", ""];
    const empty = () => !identifier.trim();
    const goBack = () => {
      if (sent) { sent = false; msg = ""; bad = false; digits = ["", "", "", "", "", ""]; draw(); return; }
      try { if (window.history.length > 1) window.history.back(); } catch (_) { /* nowhere to go */ }
    };
    const syncContinue = () => {
      const b = document.getElementById("continue");
      if (!b) return;
      const e = empty() || busy;
      b.classList.toggle("pale", empty() && !busy);
      if (e) b.setAttribute("disabled", ""); else b.removeAttribute("disabled");
    };
    const syncCode = () => { const hid = document.getElementById("code"); if (hid) hid.value = digits.join(""); };
    const boxes = () => Array.from(document.querySelectorAll(".otp input"));
    const setDigit = (i, raw) => {
      const d = String(raw).replace(/\D/g, "").slice(-1);
      digits[i] = d;
      const bs = boxes();
      if (bs[i] && bs[i].value !== d) bs[i].value = d;
      syncCode();
      if (d && i < 5 && bs[i + 1]) bs[i + 1].focus();
    };
    const onBoxKey = (i, e) => {
      const bs = boxes();
      if (e.key === "Backspace" && !digits[i] && i > 0 && bs[i - 1]) bs[i - 1].focus();
      else if (e.key === "ArrowLeft" && i > 0 && bs[i - 1]) bs[i - 1].focus();
      else if (e.key === "ArrowRight" && i < 5 && bs[i + 1]) bs[i + 1].focus();
      else if (e.key === "Enter") verify();
    };
    const onPaste = (e) => {
      const t = ((e.clipboardData && e.clipboardData.getData("text")) || "").replace(/\D/g, "").slice(0, 6);
      if (!t) return;
      e.preventDefault();
      digits = t.split("").concat(["", "", "", "", "", ""]).slice(0, 6);
      boxes().forEach((b, i) => { b.value = digits[i]; });
      syncCode();
      const bs = boxes(), next = bs[Math.min(t.length, 5)];
      if (next) next.focus();
    };
    const themeItem = (name, label) => h("button", { class: "m-item" + (themeName() === name ? " on" : ""), onclick: () => { try { LS.setItem("nm.theme", name); } catch (_) { /* private mode */ } applyTheme(); gear = false; draw(); } },
      label, themeName() === name ? h("span", { class: "tick" }, "✓") : null);
    const draw = () => {
      if (!sent) {
        app.replaceChildren(h("div", { class: "signin" },
          h("div", { class: "signin-top" },
            h("button", { class: "round", "aria-label": T.goBack, html: ICON.back, onclick: goBack }),
            h("div", { class: "signin-menu-wrap" },
              h("button", { class: "round", "aria-label": T.settings, html: ICON.gear, onclick: () => { gear = !gear; draw(); } }),
              gear ? h("div", { class: "signin-menu" },
                h("div", { class: "m-label" }, T.appearance),
                themeItem("light", T.themeLight), themeItem("dark", T.themeDark), themeItem("system", T.themeSystem),
                h("a", { class: "m-item", href: privacyUrl(), target: "_blank", rel: "noopener" }, T.privacy)) : null)),
          h("div", { class: "signin-body" },
            h("img", { class: "signin-mark", src: "mark.svg", alt: "wevvy" }),
            h("h1", {}, T.welcome),
            h("input", { id: "ident", class: "signin-id", type: "text", autocomplete: "username", placeholder: T.identifierPh, value: identifier,
              inputmode: /^\s*[+\d]/.test(identifier) ? "tel" : "email",
              oninput: (e) => { identifier = e.target.value; e.target.inputMode = /^\s*[+\d]/.test(identifier) ? "tel" : "email"; syncContinue(); },
              onkeydown: (e) => { if (e.key === "Enter") send(); } }),
            h("p", { class: "signin-note" }, T.smsNotice, " ", h("a", { href: privacyUrl(), target: "_blank", rel: "noopener" }, T.learnMore)),
            h("button", { id: "continue", class: "btn-continue" + (empty() ? " pale" : ""), disabled: (empty() || busy) ? "" : null, onclick: send }, T.continueBtn),
            h("div", { class: "hint" + (bad ? " bad" : msg ? " ok" : "") }, msg))));
        const focus = document.getElementById("ident");
        if (focus) focus.focus();
        return;
      }
      app.replaceChildren(h("div", { class: "signin" },
        h("div", { class: "signin-body" },
          h("img", { class: "signin-mark small", src: "mark.svg", alt: "wevvy" }),
          h("h1", {}, "wevvy"),
          h("p", { class: "sub" }, T.tagline),
          h("div", { class: "field", style: "width:100%;margin-top:8px" }, h("label", {}, T.code),
            h("div", { class: "otp" }, digits.map((d, i) => h("input", { type: "text", inputmode: "numeric", autocomplete: i === 0 ? "one-time-code" : "off", maxlength: "1", value: d, "aria-label": T.digit(i + 1),
              oninput: (e) => setDigit(i, e.target.value), onkeydown: (e) => onBoxKey(i, e), onpaste: onPaste }))),
            h("input", { id: "code", type: "hidden", value: digits.join("") })),
          h("p", { class: "signin-resend" }, T.noCode, " ", h("button", { class: "linklike", disabled: busy ? "" : null, onclick: resend }, T.resend)),
          h("button", { class: "btn-continue", disabled: busy ? "" : null, onclick: verify }, T.confirmBtn),
          h("button", { class: "btn ghost", onclick: () => { sent = false; msg = ""; bad = false; digits = ["", "", "", "", "", ""]; draw(); } }, T.another),
          h("div", { class: "hint" + (bad ? " bad" : msg ? " ok" : "") }, msg))));
      const first = document.querySelector(".otp input");
      if (first) first.focus();
    };
    const send = async () => {
      identifier = identifier.trim(); if (!identifier) return;
      busy = true; msg = ""; bad = false; draw();
      try { await api("POST", "/v1/auth/code", { identifier }); LS.setItem("nm.identifier", identifier); sent = true; digits = ["", "", "", "", "", ""]; msg = T.codeSent(codeMinutes()); }
      catch (e) { msg = errText(e); bad = true; }
      busy = false; draw();
    };
    const resend = async () => {
      if (busy) return;
      busy = true; msg = ""; bad = false; draw();
      try { await api("POST", "/v1/auth/code", { identifier }); msg = T.codeSent(codeMinutes()); }
      catch (e) { msg = errText(e); bad = true; }
      busy = false; draw();
    };
    function adopt(r) {
      key = r.api_key; hint = (r.account && r.account.hint) || identifier;
      LS.setItem("nm.key", key); LS.setItem("nm.hint", hint);
      renderMain(); connect();
    }
    async function verify() {
      const code = (document.getElementById("code") || {}).value || "";
      if (code.replace(/\D/g, "").length !== 6) return;
      busy = true; draw();
      // a friend's code from the link (?invite=…) travels with the first sign-in; it counts for a new account only
      const invite = new URLSearchParams(location.search).get("invite") || LS.getItem("nm.invite") || "";
      try { adopt(await api("POST", "/v1/auth/verify", { identifier, code: code.replace(/\D/g, ""), device: deviceName(), invite })); LS.removeItem("nm.invite"); return; }
      catch (e) { msg = errText(e); bad = true; }
      busy = false; draw();
    }
    draw();
  }
  // ── hub socket ───────────────────────────────────────────────────
  function connect() {
    if (!key) return;
    if (ws) { try { ws.onclose = null; ws.close(); } catch (_) { /* ignore */ } }
    wsState = "connecting"; drawStatus();
    const url = base.replace(/^http/, "ws") + "/v1/hub";
    ws = new WebSocket(url);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "hello", key, device: { id: webId, name: "Web console", kind: "web", os: navigator.platform || "browser", version: VERSION, actions: [] } }));
    };
    ws.onmessage = (ev) => {
      let f; try { f = JSON.parse(ev.data); } catch (_) { return; }
      if (f.type === "welcome") { wsState = "on"; hubPaused = false; backoff = 1000; devices = f.devices || []; drawAll(); }
      else if (f.type === "devices") { devices = f.devices || []; drawSide(); drawHead(); }
      else if (f.type === "error" && !f.id) {
        if (f.code === "bad_key") { signOut(true); }
        else console.warn("hub:", f.code, f.message);
      } else if (f.id && pending.has(f.id)) {
        const p = pending.get(f.id);
        if (f.type === "event") p.onEvent(f.body || {});
        else if (f.type === "result") { pending.delete(f.id); f.ok ? p.resolve(f.body || {}) : p.reject({ code: f.error || "failed", message: f.message || "" }); }
        else if (f.type === "error") { pending.delete(f.id); p.reject({ code: f.code, message: f.message }); }
      }
    };
    ws.onclose = (ev) => {
      wsState = "off"; drawStatus();
      for (const [id, p] of pending) { p.reject({ code: "disconnected", message: "" }); pending.delete(id); }
      if (ev.code === 4001) { signOut(true); return; }
      // 0.22: the operator paused the hub (4003 `hub_paused`, docs/hub.md); keep trying, slowly, and say why
      if (ev.code === 4003 && ev.reason === "hub_paused") { hubPaused = true; drawStatus(); backoff = 30000; }
      setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 30000);
    };
    ws.onerror = () => { /* onclose follows */ };
  }
  function call(to, action, args, onEvent) {
    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== 1) { reject({ code: "disconnected" }); return; }
      const id = Math.random().toString(36).slice(2, 14);
      pending.set(id, { onEvent: onEvent || (() => {}), resolve, reject });
      ws.send(JSON.stringify({ type: "call", id, to, action, args: args || {} }));
    });
  }
  function signOut(expired) {
    if (!expired && key) api("POST", "/v1/auth/sign-out", {}, key).catch(() => {});
    key = ""; hint = ""; LS.removeItem("nm.key"); LS.removeItem("nm.hint");
    if (ws) { try { ws.onclose = null; ws.close(); } catch (_) { /* ignore */ } ws = null; }
    closeSheet();
    renderSignIn();
  }

  // ── chats ────────────────────────────────────────────────────────
  function chat(id) {
    if (!chats.has(id)) {
      let messages = [];
      try { messages = JSON.parse(LS.getItem("nm.chat." + id) || "[]"); } catch (_) { /* fresh */ }
      chats.set(id, { messages, busy: false, callId: null, steps: [] });
    }
    return chats.get(id);
  }
  function persist(id) {
    const c = chat(id);
    const keep = c.messages.slice(-60).map((m) => (m.image && m.image.length > 400000 ? { ...m, image: null } : m));
    try { LS.setItem("nm.chat." + id, JSON.stringify(keep)); } catch (_) { /* quota */ }
  }
  function convId(deviceId) {
    let c = LS.getItem("nm.conv." + deviceId);
    if (!c) { c = "web-" + Math.random().toString(36).slice(2, 12); LS.setItem("nm.conv." + deviceId, c); }
    return c;
  }
  const dev = (id) => devices.find((d) => d.id === id);
  const kindLabel = (k) => T[k] || k;
  function ago(ts) {
    if (!ts) return "";
    const s = Math.max(0, Math.floor(Date.now() / 1000 - ts));
    if (s < 90) return T.justNow; if (s < 3600) return T.minAgo(Math.floor(s / 60)); if (s < 86400) return T.hAgo(Math.floor(s / 3600)); return T.dAgo(Math.floor(s / 86400));
  }
  const when = (ts) => (ts ? new Date(ts * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
  const dateOf = (ts) => (ts ? new Date(ts * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "");
  const fmtN = (n) => Number(n || 0).toLocaleString();
  const money = (v) => { const c = Number(v || 0); return c >= 100 ? c.toFixed(0) : c >= 1 ? c.toFixed(2) : c > 0 && c < 0.01 ? c.toFixed(4) : c.toFixed(2); };
  let USD_RATE = 7.1; // the relay rate from /v1/me, once it has loaded; money shows in dollars only
  const usdOf = (cny) => "$" + money(Number(cny || 0) / (USD_RATE > 0 ? USD_RATE : 7.1));

  async function send(text) {
    const d = dev(selected); if (!d || !d.online) return;
    const c = chat(d.id);
    if (c.busy) return;
    c.messages.push({ role: "me", text }); c.busy = true; c.steps = []; persist(d.id); drawChat(); drawComposer();
    const conversation = convId(d.id);
    const onEvent = (b) => {
      const stage = b.stage;
      if (stage === "thinking") c.steps.push({ kind: "thinking" });
      else if (stage === "tool") c.steps.push({ kind: "tool", k: T.running, v: `${b.name} ${b.summary || ""}` });
      else if (stage === "delegate") c.steps.push({ kind: "tool", k: T.asks, v: `${b.device}: ${b.task}` });
      else if (stage === "remote") { const bb = b.body || {}; if (bb.stage === "tool") c.steps.push({ kind: "remote", k: `${b.device} ${T.running}`, v: `${bb.name} ${bb.summary || ""}` }); }
      else if (stage === "text" && b.interim) c.messages.push({ role: "them", text: b.text, from: d.name });
      else if (stage === "image" && b.data) c.messages.push({ role: "them", image: `data:${b.mime || "image/png"};base64,${b.data}`, from: b.from || d.name });
      else if (stage === "approval") c.messages.push({ role: "approval", id: b.approval_id, preview: b.preview, risk: b.risk, reason: b.reason, state: "open" });
      else if (stage === "error") c.steps.push({ kind: "err", k: T.failed, v: b.message || b.code });
      else if (stage === "done") c.steps = c.steps.filter((s) => s.kind !== "thinking");
      drawChat();
    };
    try {
      const r = await call(d.id, "task", { text, conversation, from: "web console" }, onEvent);
      c.messages.push({ role: "them", text: r.text || r.answer || JSON.stringify(r), from: d.name });
    } catch (e) {
      const m = e.code === "device_offline" ? T.errorOffline : e.code === "busy" ? T.errorBusy : e.code === "timeout" ? T.errorTimeout : (e.message || e.code);
      c.messages.push({ role: "them", text: `⚠ ${m}`, from: d.name });
    }
    c.busy = false; c.steps = []; for (const m of c.messages) if (m.role === "approval" && m.state === "open") m.state = "expired";
    persist(d.id); drawChat(); drawComposer();
  }
  async function decide(deviceId, approvalId, allow) {
    const c = chat(deviceId); const a = c.messages.find((m) => m.role === "approval" && m.id === approvalId); if (!a || a.state !== "open") return;
    a.state = allow ? "allowed" : "denied"; persist(deviceId); drawChat();
    try { await call(deviceId, "approve", { approval_id: approvalId, allow }); } catch (_) { /* the task reports it */ }
  }
  async function stop() {
    const d = dev(selected); if (!d) return;
    try { await call(d.id, "stop", { conversation: convId(d.id) }); } catch (_) { /* ignore */ }
  }

  // ── main view ────────────────────────────────────────────────────
  let els = {};
  function renderMain() {
    els = {};
    els.side = h("aside", { class: "side" });
    els.chat = h("section", { class: "chat" });
    app.replaceChildren(h("div", { class: "main" }, els.side, els.chat));
    drawAll();
  }
  function drawAll() { drawSide(); drawChatShell(); }
  function drawStatus() { const s = els.status; if (s) { s.className = "status " + (wsState === "on" ? "on" : wsState === "off" ? "off" : ""); s.title = wsState === "on" ? T.connected : wsState === "off" ? (hubPaused ? T.hubPaused : T.disconnected) : T.connecting; } }
  const glyph = (kind) => ICON[kind] || ICON.computer;
  function pickDevice(id) {
    selected = id; LS.setItem("nm.selected", id); history.replaceState(null, "", "?device=" + encodeURIComponent(id));
    drawSide(); drawChatShell();
    if (window.matchMedia("(max-width: 760px)").matches) { els.side.classList.add("hidden"); }
  }
  function drawSide() {
    if (!els.side) return;
    const others = devices.filter((d) => d.kind !== "web");
    els.status = h("span", { class: "status" });
    els.side.replaceChildren(
      h("div", { class: "top" }, h("img", { src: "mark.svg", alt: "" }), h("b", {}, "wevvy"), els.status),
      h("div", { class: "label" }, T.devices),
      h("div", { class: "devices" }, h("div", { class: "card" },
        others.length ? others.map((d) => h("button", { class: "row tap" + (d.id === selected ? " active" : ""), onclick: () => pickDevice(d.id) },
          h("span", { class: "tile" + (d.online ? "" : " grey"), html: glyph(d.kind) }),
          h("div", { class: "txt" }, h("div", { class: "t" }, d.name), h("div", { class: "s" }, `${kindLabel(d.kind)} · ${d.os || ""} · ${d.online ? T.online : `${T.lastSeen} ${ago(d.last_seen)}`}`)),
          h("span", { class: "dot" + (d.online ? " on" : "") }),
        )) : h("div", { class: "empty" }, T.noDevices))),
      h("div", { class: "foot card" },
        h("button", { class: "row tap", onclick: openAccount },
          h("span", { class: "tile grey", html: ICON.person }),
          h("div", { class: "txt" }, h("div", { class: "t" }, hint), h("div", { class: "s" }, T.account)),
          h("span", { class: "chev" }))),
    );
    drawStatus();
  }
  function drawChatShell() {
    if (!els.chat) return;
    const d = dev(selected);
    if (!d) {
      els.chat.replaceChildren(h("div", { class: "empty-chat" }, h("img", { src: "mark.svg", alt: "" }), h("p", {}, h("b", {}, T.pick), T.pickSub)));
      return;
    }
    els.head = h("div", { class: "head" });
    els.messages = h("div", { class: "messages" });
    els.composer = h("div", { class: "composer" });
    els.chat.replaceChildren(els.head, els.messages, els.composer);
    drawHead(); drawChat(); drawComposer();
  }
  function drawHead() {
    const d = dev(selected); if (!els.head || !d) return;
    els.head.replaceChildren(
      h("button", { class: "round back", onclick: () => { els.side.classList.remove("hidden"); }, html: ICON.back }),
      h("span", { class: "tile", html: glyph(d.kind) }),
      h("div", {}, h("div", { class: "name" }, d.name), h("div", { class: "sub" }, `${kindLabel(d.kind)} · ${d.os || ""} · ${d.online ? T.online : T.offline}`)),
      h("span", { class: "spacer" }),
      h("button", { class: "btn quiet sm", onclick: () => { const c = chat(d.id); c.messages = []; persist(d.id); LS.removeItem("nm.conv." + d.id); drawChat(); } }, T.clear),
      d.online ? null : h("button", { class: "btn quiet sm", onclick: () => { if (!confirm(T.forgetConfirm(d.name))) return; if (ws && wsState === "on") ws.send(JSON.stringify({ type: "forget", device_id: d.id })); LS.removeItem("nm.conv." + d.id); if (selected === d.id) { selected = ""; LS.removeItem("nm.selected"); history.replaceState(null, "", location.pathname); } devices = devices.filter((x) => x.id !== d.id); drawSide(); drawChatShell(); } }, T.forget),
    );
    drawComposer();
  }
  function drawChat() {
    const d = dev(selected); if (!els.messages || !d) return;
    const c = chat(d.id);
    const nodes = [];
    for (const m of c.messages) {
      if (m.role === "me") nodes.push(h("div", { class: "msg me" }, h("div", { class: "bubble" }, m.text)));
      else if (m.role === "approval") nodes.push(h("div", { class: "approval" + (m.state !== "open" ? " done" : "") },
        h("div", { class: "t" }, T.approvalTitle(d.name)),
        h("div", { class: "p" }, (T.risks[m.risk] || m.risk) + (m.reason ? ` · ${m.reason}` : ""), h("code", {}, m.preview || "")),
        m.state === "open"
          ? h("div", { class: "btns" }, h("button", { class: "yes", onclick: () => decide(d.id, m.id, true) }, T.allow), h("button", { onclick: () => decide(d.id, m.id, false) }, T.deny))
          : h("div", { class: "decided" }, m.state === "allowed" ? T.allowed : m.state === "denied" ? T.denied : T.expired)));
      else nodes.push(h("div", { class: "msg them" }, h("div", { class: "from" }, m.from || d.name),
        m.image ? h("div", { class: "bubble" }, h("img", { class: "shot", src: m.image, alt: "" })) : h("div", { class: "bubble", html: md(m.text || "") })));
    }
    if (c.busy) {
      const steps = c.steps.slice(-8);
      nodes.push(h("div", { class: "steps" },
        steps.filter((s) => s.kind !== "thinking").map((s) => h("div", { class: "step " + s.kind }, h("span", { class: "k" }, s.k), h("span", { class: "v", title: s.v }, s.v))),
        h("div", { class: "thinking" }, h("i"), d.kind === "phone" && !steps.length ? T.waitingPhone : T.busy(d.name))));
    }
    els.messages.replaceChildren(...nodes);
    els.messages.scrollTop = els.messages.scrollHeight;
  }
  function drawComposer() {
    const d = dev(selected); if (!els.composer || !d) return;
    const c = chat(d.id);
    const ta = h("textarea", { rows: "1", placeholder: T.placeholder(d.name), disabled: d.online ? null : "", onkeydown: (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); go(); } }, oninput: (e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(160, e.target.scrollHeight) + "px"; } });
    const go = () => { const t = ta.value.trim(); if (!t) return; ta.value = ""; ta.style.height = "auto"; send(t); };
    els.composer.replaceChildren(
      h("div", { class: "box" }, ta,
        c.busy ? h("button", { class: "stop", title: T.stop, onclick: stop, html: '<svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" rx="2" fill="#fff"/></svg>' })
          : h("button", { disabled: d.online ? null : "", onclick: go, html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>' })),
      h("div", { class: "note" }, d.online ? (d.kind === "phone" ? "Anything that needs an OK on the phone is asked on the phone." : "Anything that needs an OK is asked here.") : T.offlineNote(d.name)),
    );
    if (d.online && !c.busy) ta.focus();
  }

  // ── account sheet (/v1/me, the same picture as the phone's Account screen) ──
  let sheet = null;
  function closeSheet() { if (sheet) { sheet.remove(); sheet = null; } }
  function openSheet(node) {
    closeSheet();
    sheet = h("div", { class: "scrim", onclick: (e) => { if (e.target === sheet) closeSheet(); } }, node);
    document.body.append(sheet);
    const onKey = (e) => { if (e.key === "Escape") { closeSheet(); document.removeEventListener("keydown", onKey); } };
    document.addEventListener("keydown", onKey);
  }
  function dialog(title, body, actions) {
    const d = h("div", { class: "dialog" }, h("h3", {}, title), body, h("div", { class: "acts" }, ...actions));
    openSheet(d);
    return d;
  }
  function ask(title, text, okLabel, danger) {
    return new Promise((resolve) => {
      dialog(title, h("p", {}, text), [
        h("button", { class: "btn quiet", onclick: () => { closeSheet(); resolve(false); } }, T.cancel),
        h("button", { class: "btn" + (danger ? " danger" : ""), onclick: () => { closeSheet(); resolve(true); } }, okLabel),
      ]);
    });
  }

  let me = null, meErr = "", usageTab = "today";
  async function openAccount() {
    const body = h("div", { class: "sheet" });
    openSheet(body);
    drawAccount(body);
    await loadMe();
    if (sheet && body.isConnected) drawAccount(body);
  }
  async function loadMe() {
    try {
      const [m, s, ev, sy] = await Promise.all([api("GET", "/v1/me", null, key), api("GET", "/v1/me/sessions", null, key), api("GET", "/v1/me/events?limit=12", null, key),
        api("GET", "/v1/sync/state", null, key).catch(() => null)]);  // 0.19; an older relay has no sync and the card is left out
      me = { ...m, sessions: s.sessions || [], events: ev.events || [], sync: sy }; meErr = "";
    } catch (e) { if (e.code === "bad_key" || e.code === "account_deleted" || e.code === "http_401") { signOut(true); return; } meErr = errText(e); }
  }
  const kindRow = (r) => {
    const k = r.kind || "chat";
    const n = k === "realtime" ? T.seconds(fmtN(r.charged)) : k === "image" ? T.images(fmtN(r.requests)) : k === "video" ? T.seconds(fmtN(r.charged)) : T.tokens(fmtN(r.charged));
    return h("div", { class: "usage-row" },
      h("div", { class: "k" }, h("i", { class: k }), T.kinds[k] || k),
      h("span", { class: "n" }, `${T.requests(fmtN(r.requests))} · ${n}`),
      h("span", { class: "c" }, r.cost_cny !== undefined ? usdOf(r.cost_cny) : ""));
  };
  function drawAccount(body) {
    const a = me && me.account, u = me && me.usage;
    const initial = (hint || "?").replace(/[^0-9a-z]/gi, "").slice(0, 1).toUpperCase() || "M";
    const kids = [
      h("div", { class: "grab" }),
      h("div", { class: "head" }, h("h2", {}, T.account), h("button", { class: "round", title: T.refresh, html: ICON.refresh, onclick: async () => { await loadMe(); drawAccount(body); } }), h("button", { class: "round", html: svg('<path d="M6 6l12 12M18 6L6 18"/>'), onclick: closeSheet })),
    ];
    if (!me) { kids.push(h("div", { class: "card" }, h("div", { class: "empty" }, meErr || "…"))); body.replaceChildren(...kids); return; }
    // identity
    kids.push(h("div", { class: "card" },
      h("div", { class: "identity" }, h("div", { class: "disc" }, initial),
        h("div", { class: "who" }, h("div", { class: "n" }, a.hint || hint),
          h("div", { class: "m" }, `${a.channel === "phone" ? T.phone : T.email} · ${T.since} ${dateOf(a.created_at)}`, a.member ? [" · ", h("span", { class: "pill ok" }, T.member)] : null))),
      h("button", { class: "row tap", onclick: () => passwordDialog(!!a.has_password, body) },
        h("span", { class: "tile violet", html: ICON.key }),
        h("div", { class: "txt" }, h("div", { class: "t" }, a.has_password ? T.changePassword : T.setPassword), h("div", { class: "s" }, a.has_password ? `${T.hasPassword}${a.password_set_at ? " · " + dateOf(a.password_set_at) : ""}` : T.noPassword)),
        h("span", { class: "chev" })),
      h("div", { class: "row" }, h("span", { class: "tile grey", html: ICON.devices }), h("div", { class: "txt" }, h("div", { class: "t" }, T.signIns)), h("span", { class: "v" }, h("b", {}, fmtN(a.sessions || 0)))),
      h("div", { class: "row" }, h("span", { class: "tile grey", html: ICON.shield }), h("div", { class: "txt" }, h("div", { class: "t" }, "ID"), h("div", { class: "s" }, h("code", {}, (a.id || "").slice(0, 12) + "…"))))));
    // allowance — the key pages in the order for where the person is (0.17: `region`,
    // `spend.ways`; 0.21: `spend.guidance`, contract C11): the region's first picks with
    // what each covers, the guide, and the plans an app can sign in with. An older relay
    // without `guidance` still gets the two 0.17 links.
    const keyLinks = (sp, region) => {
      const g = sp.guidance;
      const docs = h("a", { href: sp.own_key_docs || "https://wevvy.in/own-key", target: "_blank", rel: "noopener" }, g ? T.ownKeyGuide : T.ownKey);
      if (!g || !Array.isArray(g.providers) || !g.providers.length) {
        const openrouter = h("a", { href: sp.openrouter_url || "https://openrouter.ai/keys", target: "_blank", rel: "noopener" }, T.openRouterKey);
        return region === "cn" ? [docs, " · ", openrouter] : [openrouter, " · ", docs];
      }
      const out = [];
      for (const p of g.providers.slice(0, 3)) {
        if (out.length) out.push(" · ");
        const name = p.name;
        out.push(h("a", { href: p.key_url, target: "_blank", rel: "noopener" }, T.keyFrom(name)), " (", T.coversLine((p.covers || []).map((c) => T.covers[c] || c)), ")");
      }
      out.push(" · ", docs);
      const plans = (g.plans || []).filter((p) => (p.clients || []).includes("web") || (p.clients || []).includes("android")).map((p) => p.name);
      if (plans.length) out.push(" ", T.plansLine(plans));
      return out;
    };
    const sp = me.spend || {}, tk = me.tokens || {};
    if (sp.usd_cny > 0) USD_RATE = sp.usd_cny;
    const cap = Number(sp.grant || 0), spent = Number(sp.total || 0), free = !!sp.unlimited;
    const left = Math.max(0, cap - spent), frac = cap > 0 ? Math.min(1, spent / cap) : 0;
    const usd = (c) => (sp.usd_cny > 0 ? ` ≈ $${(c / sp.usd_cny).toFixed(2)}` : "");
    kids.push(h("div", { class: "label" }, T.allowance), h("div", { class: "card" }, h("div", { class: "allow" },
      h("div", { class: "big" }, free ? T.unlimited : usdOf(left), !free ? h("small", {}, "left") : null),
      !free ? h("div", { class: "meter" }, h("i", { class: frac >= 1 ? "bad" : frac >= 0.8 ? "warn" : "", style: `width:${Math.round(frac * 100)}%` })) : null,
      h("div", { class: "s" }, !free ? T.spentTotal(usdOf(spent), usdOf(cap)) : T.spentOnly(usdOf(spent)), tk.used_today !== undefined ? ` · ${T.tokensToday(fmtN(tk.used_today))}` : ""),
      !free && frac >= 0.8 ? h("div", { class: "s", style: "color:var(--bad, #c0392b);margin-top:4px" }, frac >= 1 ? T.allowanceOut : T.allowanceWarn) : null),
      !free ? h("p", { class: "fine", style: "padding:0 16px 12px" }, T.allowanceWhy(sp.allowance_cny ?? 10, sp.invite_bonus_cny ?? 5, me.region), " ", ...keyLinks(sp, me.region)) : null));
    // invite a friend: the code, the link, what came of it
    const inv = me.invite;
    if (inv && inv.code) {
      const copyBtn = (text) => h("button", { class: "btn quiet sm", onclick: async (e) => { try { await navigator.clipboard.writeText(text); e.target.textContent = T.copied; setTimeout(() => { e.target.textContent = T.copy; }, 1500); } catch (_) { prompt(T.copy, text); } } }, T.copy);
      kids.push(h("div", { class: "label" }, T.invite), h("div", { class: "card" },
        h("div", { class: "row" }, h("span", { class: "tile violet", html: ICON.shield }), h("div", { class: "txt" }, h("div", { class: "t" }, T.inviteCode), h("div", { class: "s" }, h("code", { style: "font-size:15px;letter-spacing:.12em" }, inv.code))), copyBtn(inv.code)),
        inv.url ? h("div", { class: "row" }, h("span", { class: "tile grey", html: ICON.web }), h("div", { class: "txt" }, h("div", { class: "t" }, T.inviteLink), h("div", { class: "s" }, h("code", {}, inv.url))), copyBtn(inv.url)) : null,
        h("div", { class: "row" }, h("span", { class: "tile grey", html: ICON.devices }), h("div", { class: "txt" }, h("div", { class: "t" }, `${T.invited(inv.invites || 0)} · ${T.earned(inv.earned_cny || 0)}`))),
        h("p", { class: "fine", style: "padding:0 16px 12px" }, T.inviteWhy(inv.bonus_cny))));
    }
    // data controls: the person's switch, what was kept, the delete, the policy
    const ct = me.contribute || { on: false, samples: 0 };
    kids.push(h("div", { class: "label" }, T.contribute), h("div", { class: "card" },
      h("div", { class: "row" }, h("span", { class: "tile " + (ct.on ? "violet" : "grey"), html: ICON.shield }),
        h("div", { class: "txt" }, h("div", { class: "t" }, T.improve), h("div", { class: "s" }, ct.on ? T.contributeOn : T.contributeOff, ct.samples ? ` · ${T.contributeCount(ct.samples)}` : "")),
        h("button", { class: "btn quiet sm", role: "switch", "aria-checked": ct.on ? "true" : "false", onclick: async () => { try { await api("POST", "/v1/me/contribute", { on: !ct.on }, key); } catch (e) { alert(errText(e)); } await loadMe(); drawAccount(body); } }, ct.on ? "Turn off" : "Turn on")),
      ct.samples ? h("button", { class: "row tap danger", onclick: async () => { if (await ask(T.deleteSamples, T.deleteSamplesConfirm, T.deleteSamples, true)) { try { const r = await api("DELETE", "/v1/me/samples", null, key); alert(T.deleted(r.deleted || 0)); } catch (e) { alert(errText(e)); } await loadMe(); drawAccount(body); } } }, h("span", { class: "tile bad", html: ICON.out }), h("div", { class: "txt" }, h("div", { class: "t" }, T.deleteSamples))) : null,
      h("p", { class: "fine", style: "padding:0 16px 12px" }, T.contributeWhy, " ", T.contributeDefault(!!ct.default_on), " ",
        h("a", { href: ct.privacy_url || "https://wevvy.in/privacy/", target: "_blank", rel: "noopener" }, T.privacy))));
    // 0.19: conversation sync between the account's devices — the switch (off deletes), what is stored, the delete
    const sy = me.sync;
    if (sy && sy.counts) {
      const n = sy.counts, has = (n.conversations || 0) + (n.messages || 0) > 0;
      kids.push(h("div", { class: "card" },
        h("div", { class: "row" }, h("span", { class: "tile " + (sy.enabled ? "violet" : "grey"), html: ICON.devices }),
          h("div", { class: "txt" }, h("div", { class: "t" }, T.syncTitle), h("div", { class: "s" }, sy.enabled ? T.contributeOn : T.contributeOff, " · ", has ? T.syncCount(n.conversations || 0, n.messages || 0) : T.syncEmpty)),
          h("button", { class: "btn quiet sm", role: "switch", "aria-checked": sy.enabled ? "true" : "false", onclick: async () => {
            if (sy.enabled && has && !(await ask(T.syncTitle, T.syncOffConfirm, "Turn off", true))) return;
            try { await api("PUT", "/v1/sync/state", { enabled: !sy.enabled }, key); } catch (e) { alert(errText(e)); } await loadMe(); drawAccount(body); } }, sy.enabled ? "Turn off" : "Turn on")),
        has ? h("button", { class: "row tap danger", onclick: async () => { if (await ask(T.deleteSync, T.deleteSyncConfirm, T.deleteSync, true)) { try { await api("DELETE", "/v1/sync/changes", null, key); alert(T.syncDeleted); } catch (e) { alert(errText(e)); } await loadMe(); drawAccount(body); } } }, h("span", { class: "tile bad", html: ICON.out }), h("div", { class: "txt" }, h("div", { class: "t" }, T.deleteSync))) : null,
        h("p", { class: "fine", style: "padding:0 16px 12px" }, T.syncWhy)));
    }
    // usage by kind / by model
    const rows = usageTab === "today" ? (u.today && u.today.by_kind) || [] : (u.total && u.total.by_kind) || [];
    const models = (u.total && u.total.by_model) || [];
    kids.push(h("div", { class: "label" }, T.usage), h("div", { class: "card" },
      h("div", { style: "padding:12px 16px 4px" }, h("div", { class: "seg" },
        h("button", { class: usageTab === "today" ? "on" : "", onclick: () => { usageTab = "today"; drawAccount(body); } }, T.today),
        h("button", { class: usageTab === "all" ? "on" : "", onclick: () => { usageTab = "all"; drawAccount(body); } }, T.allTime))),
      rows.length ? rows.map(kindRow) : h("div", { class: "empty" }, T.noUsage)),
      ...(models.length ? [h("div", { class: "label" }, T.byModel), h("div", { class: "card" }, ...models.map((m) => h("div", { class: "usage-row" },
        h("div", { class: "k" }, h("i", { class: m.kind || "chat" }), h("code", {}, m.model)),
        h("span", { class: "n" }, `${T.requests(fmtN(m.requests))}${m.charged ? " · " + fmtN(m.charged) : ""}`),
        h("span", { class: "c" }, m.cost_cny !== undefined ? usdOf(m.cost_cny) : ""))))] : []));
    // sign-ins
    const sessions = me.sessions || [];
    if (sessions.length) kids.push(h("div", { class: "label" }, T.signIns), h("div", { class: "card" }, ...sessions.map((s) => h("div", { class: "row" },
      h("span", { class: "tile" + (s.current ? "" : " grey"), html: /web|网页|browser/i.test(s.device || "") ? ICON.web : /phone|android|手机|iphone/i.test(s.device || "") ? ICON.phone : ICON.computer }),
      h("div", { class: "txt" }, h("div", { class: "t" }, s.device || "—", s.current ? [" ", h("span", { class: "pill blue" }, T.thisOne)] : null),
        h("div", { class: "s" }, `${s.via === "password" ? T.viaPassword : s.via === "session" ? T.viaWeb : T.viaCode} · ${when(s.created_at)}${s.last_used_at ? ` · ${T.lastUsed} ${ago(s.last_used_at)}` : ""}`)),
      s.current ? null : h("button", { class: "btn quiet sm", onclick: async () => { try { await api("DELETE", `/v1/me/sessions/${encodeURIComponent(s.prefix)}`, null, key); } catch (e) { alert(errText(e)); } await loadMe(); drawAccount(body); } }, T.revoke)))));
    // activity
    const events = me.events || [];
    if (events.length) kids.push(h("div", { class: "label" }, T.activity), h("div", { class: "card" }, ...events.slice(0, 12).map((e) => h("div", { class: "row" },
      h("span", { class: "tile grey", html: ICON.clock }),
      h("div", { class: "txt" }, h("div", { class: "t" }, T.events[e.kind] || e.kind), h("div", { class: "s" }, [when(e.ts), e.detail].filter(Boolean).join(" · ")))))));
    // ways out
    kids.push(h("div", { class: "label" }, T.ways), h("div", { class: "card" },
      h("button", { class: "row tap", onclick: async () => { if (await ask(T.signOut, T.signOutConfirm, T.signOut)) signOut(false); } }, h("span", { class: "tile grey", html: ICON.out }), h("div", { class: "txt" }, h("div", { class: "t" }, T.signOut))),
      h("button", { class: "row tap danger", onclick: async () => { if (await ask(T.signOutAll, T.signOutAllConfirm, T.signOutAll, true)) { try { await api("POST", "/v1/auth/sign-out-all", { all: true }, key); } catch (_) { /* leaving anyway */ } signOut(true); } } }, h("span", { class: "tile bad", html: ICON.out }), h("div", { class: "txt" }, h("div", { class: "t" }, T.signOutAll)))),
      h("p", { class: "fine" }, T.community));
    body.replaceChildren(...kids);
  }
  function passwordDialog(has, sheetBody) {
    let msg = "", bad = false;
    const cur = h("input", { type: "password", autocomplete: "current-password" });
    const nw = h("input", { type: "password", autocomplete: "new-password" });
    const again = h("input", { type: "password", autocomplete: "new-password" });
    const hintEl = h("div", { class: "hint" });
    const setMsg = (m, isBad) => { hintEl.textContent = m; hintEl.className = "hint" + (isBad ? " bad" : m ? " ok" : ""); };
    const save = async () => {
      if (nw.value.length < cfg.password_min_len) return setMsg(T.pwShort(cfg.password_min_len), true);
      if (nw.value !== again.value) return setMsg(T.pwMismatch, true);
      try { await api("POST", "/v1/auth/password", { password: nw.value, current: has ? cur.value : undefined }, key); closeSheet(); openAccount(); }
      catch (e) { setMsg(errText(e), true); }
    };
    const remove = async () => {
      try { await api("POST", "/v1/auth/password", { password: "", current: cur.value }, key); closeSheet(); openAccount(); }
      catch (e) { setMsg(errText(e), true); }
    };
    const d = dialog(T.pwTitle(has), h("div", {},
      h("p", {}, T.pwWhy(cfg.password_min_len)),
      has ? h("div", { class: "field" }, h("label", {}, T.pwCurrent), h("div", { class: "in" }, cur)) : null,
      h("div", { class: "field" }, h("label", {}, T.pwNew), h("div", { class: "in" }, nw)),
      h("div", { class: "field" }, h("label", {}, T.pwAgain), h("div", { class: "in" }, again)),
      hintEl,
    ), [
      has ? h("button", { class: "btn danger", style: "margin-right:auto", onclick: remove }, T.pwRemove) : null,
      h("button", { class: "btn quiet", onclick: () => { closeSheet(); if (sheetBody) openAccount(); } }, T.cancel),
      h("button", { class: "btn", onclick: save }, T.save),
    ]);
    if (msg) setMsg(msg, bad);
    (has ? cur : nw).focus();
    return d;
  }

  // ── boot ─────────────────────────────────────────────────────────
  if (key) { renderMain(); connect(); } else renderSignIn();
})();
