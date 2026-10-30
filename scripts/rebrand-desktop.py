#!/usr/bin/env python3
"""Turn the DeepSeek-Harness desktop in harness/desktop/ into wevvy. Idempotent;
re-run after every upstream pull (CONTRIBUTING.md), then the icon pass below.

What it changes, and only this:

- electron-builder.yml: appId -> com.wevvy.desktop, productName -> wevvy,
  executableName -> wevvy-desktop, artifact/shortcut/helper names follow.
- package.json: name -> wevvy-desktop.
- The product name in user-visible strings across src/*.ts and resources/*.html:
  "wevvy Desktop" -> "wevvy", "wevvy" -> "wevvy" (never inside identifiers
  such as window.wevvyCapsule, paths like ~/.wevvy, or the upstream URLs).
- The macOS helper: "wevvy Computer Use" -> "wevvy Computer Use", bundle id
  io.github.wevvy.desktop.computer-use -> com.wevvy.desktop.computer-use
  (Info.plist, build.sh, mac-helper.ts).
- The PyInstaller runtime spec name -> wevvy; package-mac.sh defaults follow.
- The Windows updater's expected artifact name and User-Agent follow the new
  artifactName, or auto-update would look for the old file.
- Icons: resources/icons/<n>x<n>.png, resources/app-icon.png and
  resources/logo.png are regenerated from assets/brand/wevvy-icon-512.png
  (the white-tile W); run icons() after the string pass.

Kept as upstream's, like the Android pass: internal identifiers (the `wevvy`
Python package, ~/.wevvy paths, window.wevvy* bridge names), the
source/repository links (there is no wevvy site yet), the copyright line's
"the wevvy community", and DEFAULT_RELAY_HOST (the user points the app at
their own relay at runtime; nothing invented).

    python scripts/rebrand-desktop.py            # apply, then report leftovers
    python scripts/rebrand-desktop.py --check    # report only, write nothing
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DESK = ROOT / "harness" / "desktop"
SRC = DESK / "src"
RES = DESK / "resources"
BRAND = ROOT / "assets" / "brand"

APP_ID = "com.wevvy.app"
DESKTOP_ID = "com.wevvy.desktop"
HELPER_ID = "com.wevvy.desktop.computer-use"
NAME = "wevvy"
HELPER_NAME = "wevvy Computer Use"
EXEC = "wevvy-desktop"

# "wevvy Computer Use" first (quoted and bare), then the desktop product name,
# then the standalone word. The standalone pattern never touches identifiers,
# dotted paths, URLs or hyphenated names.
HELPER = re.compile(r"wevvy Computer Use")
DESKTOP_PHRASE = re.compile(r"wevvy Desktop")
NANO = re.compile(r"(?<![\w./@-])wevvy(?![\w.])")

changed: list[str] = []


def edit(path: Path, subs: list[tuple[str, str]]) -> None:
    text = path.read_text(encoding="utf-8")
    new = text
    for pattern, repl in subs:
        new = re.sub(pattern, repl, new)
    if new != text:
        path.write_text(new, encoding="utf-8")
        changed.append(str(path.relative_to(ROOT)))


def product_strings(text: str) -> str:
    text = HELPER.sub(HELPER_NAME, text)
    text = DESKTOP_PHRASE.sub(NAME, text)
    text = NANO.sub(NAME, text)
    # historical / attribution keepers the broad rule would otherwise catch
    text = text.replace("the wevvy community", "the wevvy community")
    text = text.replace("as wevvy Harness", "as wevvy Harness")
    return text


def edit_strings(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    new = product_strings(text)
    if new != text:
        path.write_text(new, encoding="utf-8")
        changed.append(str(path.relative_to(ROOT)))


def builder_yml() -> None:
    p = DESK / "electron-builder.yml"
    edit(
        p,
        [
            (r"# electron-builder: the installers of wevvy Desktop",
             "# electron-builder: the installers of wevvy Desktop"),
            (r"# The appId is the one the previous desktop app "
             r"\(desktop/app, retired in 0\.1\.30\) carried, so\n"
             r"# this one installs over it and keeps its place in the system's permission lists\.",
             "# The appId is wevvy's own (the previous desktop app's id is retired with\n"
             "# upstream), so it installs as its own app with its own permission entries."),
            (r"appId: io\.github\.wevvy\.desktop", f"appId: {DESKTOP_ID}"),
            (r"productName: wevvy", f"productName: {NAME}"),
            (r"executableName: wevvy-desktop", f"executableName: {EXEC}"),
            (r"artifactName: wevvy-Desktop-", "artifactName: wevvy-Desktop-"),
            (r"shortcutName: wevvy", f"shortcutName: {NAME}"),
            (r"\"wevvy Computer Use\.app\" — the helper",
             f'"{HELPER_NAME}.app" — the helper'),
            (r"from: mac/computer-use/build/wevvy Computer Use\.app",
             f"from: mac/computer-use/build/{HELPER_NAME}.app"),
            (r"to: Helpers/wevvy Computer Use\.app", f"to: Helpers/{HELPER_NAME}.app"),
        ],
    )


def package_json() -> None:
    edit(DESK / "package.json", [(r'"name": "wevvy-desktop"', f'"name": "{EXEC}"')])


def helper_plist() -> None:
    p = DESK / "mac" / "computer-use" / "Info.plist"
    edit(
        p,
        [
            (r"<!-- wevvy Computer Use\.app", f"<!-- {HELPER_NAME}.app"),
            (r"<string>wevvy Computer Use</string>", f"<string>{HELPER_NAME}</string>"),
            (r"<string>io\.github\.wevvy\.desktop\.computer-use</string>",
             f"<string>{HELPER_ID}</string>"),
        ],
    )


def helper_build_sh() -> None:
    p = DESK / "mac" / "computer-use" / "build.sh"
    edit(
        p,
        [
            (r'# Build "wevvy Computer Use\.app"', f'# Build "{HELPER_NAME}.app"'),
            (r"→ build/wevvy Computer Use\.app", f"→ build/{HELPER_NAME}.app"),
            (r'name="wevvy Computer Use"', f'name="{HELPER_NAME}"'),
        ],
    )


def mac_helper_ts() -> None:
    p = SRC / "mac-helper.ts"
    edit(
        p,
        [
            (r'export const HELPER_BUNDLE_ID = "io\.github\.wevvy\.desktop\.computer-use";',
             f'export const HELPER_BUNDLE_ID = "{HELPER_ID}";'),
        ],
    )
    edit_strings(p)


def runtime_spec() -> None:
    p = ROOT / "scripts" / "desktop-app" / "wevvy_runtime.spec"
    edit(
        p,
        [
            (r'"""PyInstaller spec for the runtime wevvy Desktop carries',
             '"""PyInstaller spec for the runtime wevvy Desktop carries'),
            (r'name="wevvy",', 'name="wevvy",'),
        ],
    )


def package_mac_sh() -> None:
    p = ROOT / "scripts" / "desktop-app" / "package-mac.sh"
    edit(
        p,
        [
            (r"# The macOS packages of wevvy Desktop", "# The macOS packages of wevvy Desktop"),
            (r'app_name="${APP_NAME:-wevvy}"', 'app_name="${APP_NAME:-wevvy}"'),
            (r'artifact="${ARTIFACT:-wevvy-Desktop}"', 'artifact="${ARTIFACT:-wevvy-Desktop}"'),
            (r"wevvy\.app/Contents/Helpers", "wevvy.app/Contents/Helpers"),
        ],
    )


def build_runtime_py() -> None:
    p = ROOT / "scripts" / "desktop-app" / "build-runtime.py"
    edit(
        p,
        [
            (r'"""Build the runtime wevvy Desktop carries',
             '"""Build the runtime wevvy Desktop carries'),
        ],
    )


def prepare_dsh_readme() -> None:
    p = DESK / "scripts" / "prepare-dsh.mjs"
    edit(
        p,
        [
            (r"No runtime for the hands was built into this copy of wevvy Desktop",
             "No runtime for the hands was built into this copy of wevvy Desktop"),
        ],
    )


def windows_updater() -> None:
    # The updater must look for the artifact name the rebranded build produces.
    p = SRC / "windows-updates.ts"
    edit(
        p,
        [
            (r"`wevvy-Desktop/\$\{this\.options\.currentVersion\}`",
             "`wevvy-Desktop/${this.options.currentVersion}`"),
            (r"`wevvy-Desktop-\$\{info\.version\}-win-x64\.exe`",
             "`wevvy-Desktop-${info.version}-win-x64.exe`"),
        ],
    )


def icons() -> None:
    """Regenerate the desktop icon set from the wevvy white-tile icon."""
    from PIL import Image

    tile = Image.open(BRAND / "wevvy-icon-512.png").convert("RGBA")
    icon_dir = RES / "icons"
    for n in (16, 24, 32, 48, 64, 128, 256, 512):
        out = icon_dir / f"{n}x{n}.png"
        tile.resize((n, n), Image.LANCZOS).save(out)
        changed.append(str(out.relative_to(ROOT)))
    # splash logo: 256px tile
    logo = RES / "logo.png"
    tile.resize((256, 256), Image.LANCZOS).save(logo)
    changed.append(str(logo.relative_to(ROOT)))
    # app-icon: 1024px tile, mark recomposed from the transparent mark so it
    # stays crisp (same relative geometry as wevvy-icon-512.png: blue bbox of
    # the mark is ~35% of the tile height, centred a touch left/up of middle).
    mark = Image.open(BRAND / "wevvy-mark.png").convert("RGBA")
    canvas = Image.new("RGBA", (1024, 1024), (255, 255, 255, 255))
    target_h = int(1024 * 0.43)
    scale = target_h / mark.height
    mark = mark.resize((int(mark.width * scale), target_h), Image.LANCZOS)
    cx, cy = int(1024 * 0.485), int(1024 * 0.492)
    canvas.alpha_composite(mark, (cx - mark.width // 2, cy - mark.height // 2))
    app_icon = RES / "app-icon.png"
    canvas.save(app_icon)
    changed.append(str(app_icon.relative_to(ROOT)))


def check() -> int:
    """Report branding that still reads upstream; 0 when clean."""
    problems: list[str] = []
    probe = re.compile(r"wevvy(?! Harness)")
    url = re.compile(r"https?://\S+")
    for p in sorted(SRC.rglob("*.ts")) + sorted(RES.glob("*.html")):
        for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
            # the source/repository links are kept as upstream's (see the module
            # docstring): they are not branding to fix
            scrubbed = url.sub("", line)
            if probe.search(scrubbed) and "the wevvy community" not in scrubbed:
                problems.append(f"{p.relative_to(ROOT)}:{i}: {line.strip()[:90]}")
    for label, path, pattern in [
        ("appId", DESK / "electron-builder.yml", r"io\.github\.wevvy\.desktop"),
        ("productName", DESK / "electron-builder.yml", r"productName: wevvy"),
        ("helper id", DESK / "mac" / "computer-use" / "Info.plist", r"io\.github\.wevvy"),
    ]:
        if re.search(pattern, path.read_text(encoding="utf-8")):
            problems.append(f"{path.relative_to(ROOT)}: {label} still upstream")
    for line in problems:
        print(line)
    return 1 if problems else 0


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    if "--check" in args:
        return check()
    builder_yml()
    package_json()
    helper_plist()
    helper_build_sh()
    mac_helper_ts()
    for f in ("main.ts", "operator.ts", "operator-server.ts", "preload.ts",
              "profile-link.ts", "proxy.ts", "mac-permissions.ts", "windows-updates.ts",
              "glow.ts", "host-start.ts", "host-work.ts", "navigation.ts",
              "overlay-preload.ts", "protected-exit.ts", "windows-network-cost.ts"):
        edit_strings(SRC / f)
    windows_updater()
    runtime_spec()
    package_mac_sh()
    build_runtime_py()
    prepare_dsh_readme()
    for f in ("capsule.html", "loading.html", "glow.html"):
        edit_strings(RES / f)
    icons()
    print(f"{len(changed)} files changed")
    return check()


if __name__ == "__main__":
    raise SystemExit(main())
