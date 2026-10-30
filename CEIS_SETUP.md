# ceis setup

This fork rebrands ceis (GPL-3.0-or-later, v1.0.5) as **ceis**. Behaviour is
unchanged; only user-visible branding and the sign-in door were reworked. The
internal packages (`ceis`, the Kotlin package, the Gradle namespace) were not
renamed, per the project's own rules.

## What changed in this pass

- Brand assets: the user's blue script W logo (measured #00ADFA on white) was
  converted to a transparent mark (`assets/brand/ceis-mark.png`) and a white-tile
  app icon (`assets/brand/ceis-icon-512.png`). The web console serves the same
  mark and tile at `web/public/mark.png`, `web/public/icon-512.png`,
  `web/public/icon-192.png`, and `web/public/icon.svg` (white tile with the mark
  embedded).
- Web branding: `web/index.html` title is now "ceis"; the manifest name and
  short name are "ceis"; `BrandMark` alt text is "ceis". The web accent moved
  to a ceis-derived blue (light: `#0071CE` with pale tint `#E3F4FE`; dark:
  `#00ADFA` with dark tint `#15303F`).
- Sign-in door: `web/src/screens/SignInGate.tsx` and
  `web/src/components/SignIn.tsx` now follow the reference layout. Screen 1 has
  a back arrow, a settings gear (appearance switch and privacy link), the logo,
  "Welcome to ceis", one rounded "Mobile number or email" field, a short SMS
  note, and a pill Continue button that fills in when the field has text.
  Screen 2 has the back arrow, the logo, a sign-up code heading, a sent-to line
  with spam/social-folder advice and a Resend code action, six separate OTP
  boxes (auto-advance, paste fills all), and a pill Confirm button. The existing
  sign-in logic (`api.cloudCode`, `api.cloudVerify`, invite handling) is reused;
  the password path stays reachable as a quiet secondary link; the "Use your own
  API key instead" skip path is still there as a text link. The screens keep the
  repo's honesty rule: text codes reach mainland-China numbers only, so email is
  presented as the reliable route. All wording is in our own words.
- Relay config: `cloud/.env` (git-ignored) holds `CODE_SENDER=log` for local
  development. `cloud/.env.ceis.example` (committed) documents the SMTP block
  with empty placeholders.

## Defaults chosen

- **Email-first codes.** The relay's built-in SMS sender only reaches
  mainland-China numbers, so with no SMS provider the login field accepts a
  phone number but codes arrive by email. A global SMS provider (for example
  Twilio) can be added later as a new `CodeSender` in `cloud/ceis_cloud/senders.py`.
- **Post-code steps left as upstream.** After a new account verifies its code,
  the existing first-sign-in steps (password, model source) still run. The user
  was asked about dropping them; the decision is pending.
- **Accent shade.** The logo blue `#00ADFA` reads poorly with white text, so
  interactive elements use a deeper shade of the same hue (`#0071CE`), while the
  logo itself keeps `#00ADFA`.
- **English strings only.** New user-visible strings are in English this pass;
  简体中文 and other locales in `web/src/i18n/zh-CN.ts` are a follow-up.
- **Password mode kept secondary**, not removed.

## Running the web app

```bash
cd web
npm ci        # or npm install if ci fails on a lockfile drift
npm run dev   # serves the console at http://localhost:5173
```

Production build (writes `ceis/server/static/`, which the upstream project
commits; this fork keeps it in the working tree for now):

```bash
cd web
npm run build
```

## Running the relay locally

```bash
cd cloud
# pip install -e ".[dev]" once
python -m ceis_cloud --port 8787   # see cloud/README.md for the full guide
```

With `cloud/.env` at `CODE_SENDER=log`, sign-in codes print to the server log.
The web console talks to the relay configured in its settings; for local work
point it at `http://localhost:8787` (or your compose setup) under Connections.

## Android

### Rebrand (done, uncommitted)

- `scripts/rebrand.py` was adapted to the ceis constants and run clean:
  applicationId `com.ceis.app`, product name "ceis" in every
  `strings.xml`/`nm_strings.xml` and Kotlin string literal, the ceis blue
  palette (light accent `#0071CE`, dark `#00ADFA`), notification icons
  `ic_stat_ceis`, URL scheme `ceis://`. iOS was skipped (out of scope).
  Internal package names, the Gradle namespace and sandbox paths are untouched.
- Launcher icons regenerated from `assets/brand/ceis-icon-512.png`: mipmap
  mdpi..xxxhdpi tiles plus night variants, adaptive-icon foreground/background
  XMLs, monochrome tile, and the white 24dp `ic_stat_ceis` notification icon.
- Sign-in reskinned in `CloudSignInScreen.kt`: centred ceis mark, "Welcome to
  ceis", one rounded "Mobile number or email" pill field, pill Continue; then
  the code screen with six OTP boxes (auto-advance, paste fills all), a sent-to
  line with Resend, and pill Confirm. The existing sign-in logic is reused and
  the SMS honesty line is kept (text codes reach mainland-China numbers only;
  email is the reliable route). All wording is our own, and the screen reuses
  existing `nm_cloud_*` strings so every locale already has translations.
- Signing: `android/keystore.properties` + `android/keystore/ceis.jks`
  (alias `ceis`, RSA-2048), both git-ignored. The password lives only in that
  properties file. Back the keystore up somewhere safe: losing it means the app
  can never be updated under the same identity again.
- **The applicationId `com.ceis.app` becomes permanent the moment the app is
  published.** Google Play ties every update to it forever, so confirm it
  before any store release.

### Toolchain (in `~/workspace/toolchain`, persistent)

- JDK 21 (Temurin), Android command-line tools with platform android-36,
  build-tools 35, platform-tools and cmake 3.22.1, NDK r27c, Go 1.25+,
  Gradle 8.11.1, gomobile/gobind. SDK packages were installed by direct
  download because the sandbox proxy blocks JVM network traffic (see below).
- Native artifacts are built and git-ignored: `proot-aarch64` and
  `libproot.so` (NDK), `alpine-minirootfs.tar.gz`, and `app/libs/rclone.aar`
  (gomobile). Rebuild them with `bash scripts/android/build-natives.sh`.
- The APK build itself is
  `cd android/src/android && ./gradlew :app:assembleDebug --console=plain --no-daemon`
  with `source ~/workspace/toolchain/env-ceis.sh` first.

### Blocker: the APK cannot be built inside this sandbox yet

Gradle cannot run here at all, for a reason deeper than missing downloads. The
runtime's egress layer answers **every** TCP connection opened by a Java
process, even to 127.0.0.1, with the text "Other TCP connections is turned off
for this assistant." This was verified directly: a Java socket to
127.0.0.1:8888 (a working local proxy that serves Python and curl fine)
receives that denial, while the identical bytes from a Python socket get
`HTTP/1.1 200 Connection Established`. Renaming the java binary does not help;
it is a per-process policy, not a path check.

Two consequences:

1. Gradle cannot download anything (AGP, the Kotlin plugin, the ~300 Maven
   artifacts the app needs). Its proxy settings are inert.
2. Gradle cannot even start: its daemon IPC runs over loopback TCP, which gets
   intercepted, so every invocation dies with "Could not receive a message from
   the daemon ... Could not read message from '/127.0.0.1:32837'".

The unblock step is on the human side: in Muse settings, under Permissions,
find Direct network protocols and switch `other_tcp` from Deny to Ask (or
Allow). After that, rerun the two commands above; everything else (rebrand,
icons, keystore, SDK/NDK, native artifacts) is staged and ready.

## Desktop

### Rebrand (done, uncommitted)

- `scripts/rebrand-desktop.py` (new, idempotent, mirrors `scripts/rebrand.py`;
  `--check` reports leftovers) was run clean. `harness/desktop` now carries:
  appId `com.ceis.desktop`, productName `ceis`, executableName
  `ceis-desktop`, artifact names `ceis-Desktop-*`, and `package.json` name
  `ceis-desktop`.
- User-visible strings across `src/*.ts` and `resources/*.html` (tray menu,
  dialogs, permission prompts, splash titles) read ceis, in English and
  简体中文 alike. Internal identifiers are untouched: the `ceis` Python
  package, `~/.ceis` paths, `window.ceis*` bridge names, the upstream
  GitHub links (no ceis site yet), the "the ceis community" copyright
  line, and `DEFAULT_RELAY_HOST` (point the app at your own relay at runtime).
- macOS helper: `mac/computer-use/Info.plist` and `build.sh` now build
  "ceis Computer Use" with bundle id `com.ceis.desktop.computer-use`;
  `HELPER_BUNDLE_ID` in `mac-helper.ts` matches.
- Windows updater: the expected installer name and User-Agent follow the new
  `ceis-Desktop-*` artifact names, so auto-update keeps working.
- Icons regenerated from the brand assets: `resources/icons/` 16..512px,
  `resources/logo.png` (256px), and `resources/app-icon.png` (1024px, mark
  recomposed from `assets/brand/ceis-mark.png` at the same relative geometry
  as `ceis-icon-512.png`).
- `scripts/desktop-app/`: runtime spec name `ceis`, `package-mac.sh`
  defaults `ceis` / `ceis-Desktop`.
- Verified: `electron-builder.yml` parses with the new ids; `npm run
  typecheck` passes in `harness/desktop`, and `npm test` is green (137/137,
  including the updater and helper suites whose fixtures were updated for the
  renamed `ceis-Desktop-*` installer and the `ceis Computer Use` helper).

## Plugging in SMTP

1. Copy `cloud/.env.ceis.example` to `cloud/.env`.
2. Set `CODE_SENDER=smtp` and fill in `SMTP_HOST`, `SMTP_PORT` (465 default),
   `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
3. Restart the relay. Codes then arrive by email for every email sign-in.

## Deep-clean de-branding (2026-10-18)

- Data directory: the default is `~/.ceis`, with a guarded one-time move of
  `~/.ceis` when the new one does not exist (falls back to the old path on
  failure). `CEIS_DATA_DIR` is the override; `CEIS_DATA_DIR` still works
  silently. Covered by new tests in `tests/test_config.py`.
- Default relay host: `https://relay.wevvy.in` in `ceis/config.py` and in
  the desktop client's cloud module. The host is not live yet (agreed
  production subdomain); tour and local configs override it explicitly.
- Outbound User-Agent strings are ceis everywhere in the runtime; the relay
  console's parsing of other clients' agents is untouched.
- Serve banner, CLI help and error messages, calendar feed PRODID, MCP server
  description, notification titles, and the desktop client's model picker
  labels ("ceis Cloud") and default relay host now read ceis. The desktop
  About dialog copyright reads "the ceis community".
- Distribution names: `ceis` and `ceis-cloud` in the two `pyproject.toml`
  files; the Connections screen browser hint reads `pip install
  "ceis[browser]"`. The Python import package stays `ceis`; the console
  script names are unchanged.
- Relay console: fallback own-key and privacy links point at wevvy.in; admin
  download filenames are `ceis-*`. Left functional: `docker logs
  ceis-relay`, `ceis-traffic`, `journalctl -t ceis-selfcheck`, the
  upstream release check URLs, and the desktop updater's upstream asset
  fixtures.
- Left for the full internal rename (user's separate decision): the `ceis`
  import package, `~/ceis` workspace folder, desktop bridge globals, and
  the Android/Kotlin identifiers.
- Default avatar: unchanged. The profile mechanism only knows the dragon
  illustration, an emoji plus colour, or an AI-drawn face; there is no
  supported path to seed the brand mark as the avatar, so the dragon stays.

## De-branding and credit policy (2026-10-17)

- Sign-in emails: English only, ceis branding throughout
  (`cloud/ceis_cloud/senders.py`); the relay console lost its Chinese
  dictionary and its ceis titles the same day.
- Relay nudges: the GitHub star card ships switched off and points at
  wevvy.in, not at the upstream repository.
- Credit policy (in `cloud/.env`, template in `cloud/.env.ceis.example`):
  `ALLOWANCE_CNY=71` (shown as $10 at the `USD_CNY` 7.1 rate) for any new
  account, `INVITE_BONUS_CNY=0`, and `PRIVILEGED_DOMAIN=wevvy.in` with
  `PRIVILEGED_ALLOWANCE_CNY=3550` ($500) for new accounts at our own domain.
  The privileged grant is wired in `config.py` and `service.py` and covered
  by tests in `cloud/tests/`.
- Chinese removed and remaining user-facing ceis wording replaced across
  web, desktop, Android and the relay console.
- Money display: dollars only in user-facing text (relay messages, web
  console, apps). The yuan stays the relay's internal unit; the operator
  admin console still counts in yuan because its pool inputs are yuan.
- Every account has a tag ending in `@ceis` (`account.tag` in the sign-in
  response and `/v1/me`, from `service.py` `_user_tag`): the local part of
  the address, or user plus the last four digits for a phone account.
- Relay link defaults (invite, own-key guide, privacy) point at wevvy.in.
- Kept on purpose: the GPL license and notice files and the internal
  identifiers (packages, paths, API names). The license requires the notices
  to stay; they are not shown to app users.

## Design system (2026-10-17, the user's design file is the source of truth)

- Official logo replaced: the user's new mark (dominant colour #0754E0, 2048 by 2048) supersedes the first logo (#00ADFA). Brand assets regenerated from it: `assets/brand/ceis-mark.png` (transparent, 1433 by 944) and `assets/brand/ceis-icon-512.png` (white tile). Never recolour or distort the mark.
- Tokens: the project-level source of truth is now `design.md` in the repo root, adapted from the user's supplied design file with the brand name and description set to Ceis and the token values preserved. Primary #005ABF (CTA fill, white text, 48px height, pill radius), link #0064D4, text #111112, page #FCFCFC, surface #FFFFFF, border/muted #E5E7EB, input fill #F3F4F6 (pill), success #1F9D55, error #D92D20; dark theme primary #0064D4. Flat, airy, pill controls, headings weight 500. The design names the optimisticAI font, but no licensed font asset was supplied; surfaces keep the system font stack and the gap is recorded in `design.md`.
- Login screens re-matched to the user's new reference (circular back and settings buttons, bare mark, "Welcome to Ceis", SMS note with Learn more link, pale Continue while the field is empty) on web, desktop and Android. Per the user's strict instruction (2026-10-17) the login screen shows ONLY the reference elements: no password or own-key options, no mainland-China note, no privacy text on that screen; those flows keep working elsewhere in the app.
- The runtime's default agent name is ceis (config, profile defaults, notification titles, cloud provider label "ceis Cloud"); fresh profiles introduce themselves as ceis. Relay service messages say ceis Cloud too.

## Production relay: relay.wevvy.in (prepared, NOT deployed)

The relay is not in production yet. The apps already default to
`https://relay.wevvy.in` (runtime `ceis/config.py`, desktop client, Android
`CeisCloud.DEFAULT_BASE`), and the production config is prepared in
`cloud/deploy/ceis-hk/relay.env.example` (copy to `relay.env` on the VPS,
fill the placeholders, never commit the filled file). What remains:

1. **DNS.** In Cloudflare, add an A record for `relay.wevvy.in` pointing at the
   VPS. Nothing else on wevvy.in changes.
2. **Run it.** On the VPS, from a copy of this repo: copy
   `cloud/deploy/ceis-hk/relay.env.example` to `relay.env`, fill in
   `CLOUD_SECRET`, `CLOUD_ADMIN_TOKEN` (both `openssl rand -hex 32`) and the
   Brevo `SMTP_USER` / `SMTP_PASSWORD`, then start the relay with uvicorn on
   127.0.0.1:8787 (or the `ceis-hk` compose file). Keep it running under the
   existing process supervision on the box.
3. **Reach it.** Known constraint: the shared box's firewall blocks inbound app
   ports from the internet and the provider's nginx owns ports 80/443, so the
   relay on 8787 is not directly reachable. Viable options: a tunnel like the
   one the test setup uses (Cloudflare quick tunnel in front of 127.0.0.1:8787),
   or asking the provider for a reverse-proxy entry for relay.wevvy.in.
4. **Verify before claiming readiness.** Public `GET https://relay.wevvy.in/healthz`
   answers 200; a real sign-in code e-mail for a test address arrives through
   Brevo; the app signs in with no config override (it uses the default host);
   the admin console opens with the admin token and shows the account.

## Next steps

- Confirm `com.ceis.app` is final, then build the signed release on the VPS.
- iOS rebrand: same script pass, plus `scripts/gen-ios-icons.py`; TestFlight
  details in `docs/ios.md`.
- Deploy the relay with the note above; until then the apps' default relay
  host does not resolve.
- Decide whether to drop the post-code first-sign-in steps and whether to add
  a global SMS sender.
