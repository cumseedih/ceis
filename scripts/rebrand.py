#!/usr/bin/env python3
"""Keep the android/ tree wevvy. The tree is natively wevvy since the 2026-10-18
rename (Kotlin package io.github.wevvy, sandbox paths, assets); this script is now
the verifier and the applier for the remaining OpenMinis-derived bits. Idempotent.

What it changes, and only this:

- Gradle: applicationId -> com.wevvy.app (the Gradle namespace stays
  com.openminis.app; that is a different upstream project, not our brand).
- The places that hard-code the package id (shortcuts, the accessibility service id).
- The product name: any leftover "Minis" -> "wevvy" in the 18+ strings.xml,
  nm_strings.xml and in Kotlin string literals (never in identifiers, paths such as
  /var/minis, or MinisSkills).
- Links: the update check, source and issue links keep pointing at the upstream
  nanoMuse repository and its release feed (there is no wevvy release feed yet);
  the privacy link points at https://wevvy.in/privacy/; nothing invented.
- Colours: the upstream blues -> the wevvy design tokens (primary #005ABF light /
  #0064D4 dark, link #0064D4, input fill #F3F4F6, border #E5E7EB).
- The URL scheme the system knows us by: `wevvy` (in-app minis:// vocabulary untouched).
- Checks (--check): the applicationId, the scheme, no "Minis" product leftovers, no
  old-brand colours, and no standalone old product name (nanomuse/nanoMuse/NANOMUSE)
  anywhere in our tree.

Anything else is a hand edit marked `// wevvy:` in the file. iOS is out of scope for
this fork pass and is not touched.

    python scripts/rebrand.py            # apply, then report what is still upstream's
    python scripts/rebrand.py --check    # report only, write nothing
"""

from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ANDROID = ROOT / "android" / "src" / "android"
APP = ANDROID / "app"
MAIN = APP / "src" / "main"
JAVA = MAIN / "java" / "com" / "openminis" / "app"
RES = MAIN / "res"

APP_ID = "com.wevvy.app"
NAME = "wevvy"
VERSION_NAME = "1.0.5"
VERSION_CODE = 48
PRIVACY_URL = "https://wevvy.in/privacy/"

# X-Minis-Token is a protocol header; MinisSkills is a path. The tail is an ASCII
# lookahead rather than \b so that "Minis\uac00" (Korean particle) is still caught.
WORD = re.compile(r"(?<!X-)\bMinis(?!Skills)(?![A-Za-z0-9_])")
# the old product name as a standalone word, any case: never inside identifiers
# (WevvyCloud, io.github.wevvy) or paths; used by --check only.
OLD_NAME = re.compile(r"\b(?:nanomuse|nanoMuse|NANOMUSE)s?\b")
changed: list[str] = []


def edit(path: Path, subs: list[tuple[str, str]], count: int = 0) -> None:
    text = path.read_text(encoding="utf-8")
    new = text
    for pattern, repl in subs:
        new = re.sub(pattern, repl, new, count=count, flags=re.M)
    if new != text:
        path.write_text(new, encoding="utf-8")
        changed.append(str(path.relative_to(ROOT)))


def gradle() -> None:
    edit(
        APP / "build.gradle.kts",
        [
            (r'applicationId = "[^"]+"', f'applicationId = "{APP_ID}"'),
            (r"versionCode = \d+", f"versionCode = {VERSION_CODE}"),
            (r'versionName = "[^"]+"', f'versionName = "{VERSION_NAME}"'),
        ],
    )


def package_ids() -> None:
    edit(
        RES / "xml" / "shortcuts.xml",
        [
            (r'android:targetPackage="[^"]+"', f'android:targetPackage="{APP_ID}"'),
        ],
    )
    a11y = JAVA / "accessibility" / "MinisAccessibilityService.kt"
    edit(
        a11y,
        [
            (
                r'const val SERVICE_ID = "com\.openminis\.app/\.accessibility\.MinisAccessibilityService"',
                'val SERVICE_ID = "${BuildConfig.APPLICATION_ID}/com.openminis.app.accessibility.'
                'MinisAccessibilityService" // wevvy: the applicationId is not the package',
            ),
        ],
    )
    text = a11y.read_text(encoding="utf-8")
    if "import com.openminis.app.BuildConfig" not in text:
        text = text.replace("\nimport ", "\nimport com.openminis.app.BuildConfig\nimport ", 1)
        a11y.write_text(text, encoding="utf-8")


def product_name() -> None:
    for path in sorted(RES.glob("values*/strings.xml")) + sorted(RES.glob("values*/nm_strings.xml")):
        text = path.read_text(encoding="utf-8")
        new = WORD.sub(NAME, text)
        if new != text:
            ET.fromstring(new.encode("utf-8"))
            path.write_text(new, encoding="utf-8")
            changed.append(str(path.relative_to(ROOT)))
    literal = re.compile(r'"""[\s\S]*?"""|"(?:[^"\\\n]|\\.)*"')
    # links() owns UpdateChecker.kt's literals (the upstream repo pointers stay
    # upstream's); rewriting them here would fight it and report a phantom edit
    # on every run.
    skip = {JAVA / "data" / "UpdateChecker.kt"}
    for path in sorted(JAVA.rglob("*.kt")):
        if path in skip:
            continue
        text = path.read_text(encoding="utf-8")
        new = literal.sub(lambda m: WORD.sub(NAME, m.group(0)), text)
        if new != text:
            path.write_text(new, encoding="utf-8")
            changed.append(str(path.relative_to(ROOT)))


def soul_defaults() -> None:
    # already applied by the wevvy pass (paw emoji); nothing to change for wevvy.
    edit(
        JAVA / "agent" / "SoulStore.kt",
        [
            (r'const val DISPLAY_EMOJI = "✨"', 'const val DISPLAY_EMOJI = "🐾"'),
        ],
    )
    # The default-name round-trip follows DEFAULT; explicit stored-name fixtures stay intact.
    test = APP / "src" / "test" / "java" / "com" / "openminis" / "app" / "agent"
    test /= "SoulIconConfigEdgeTest.kt"
    if test.is_file():
        edit(
            test,
            [
                (
                    r'^([ \t]*)assertEquals\("Minis", back\.metadata\.name\)$',
                    r"\1// wevvy: round-trip the rebranded default name.\n"
                    r"\1assertEquals(SoulMetadata.DEFAULT.name, back.metadata.name)",
                ),
            ],
        )


UPSTREAM_REPO_URL = "https://github.com/nano-muse/nanoMuse"


def links() -> None:
    # The wevvy fork has no release feed yet: the update check and the repo links
    # keep pointing at the upstream nanoMuse repository and its releases; nothing
    # invented. The privacy link is ours.
    edit(
        JAVA / "data" / "UpdateChecker.kt",
        [
            (r'private const val OWNER = "[^"]+"', 'private const val OWNER = "nano-muse"'),
            (r'private const val REPO = "[^"]+"', 'private const val REPO = "nanoMuse"'),
            (
                r'const val RELEASES_URL: String = "[^"]+"',
                f'const val RELEASES_URL: String = "{UPSTREAM_REPO_URL}/releases"',
            ),
        ],
    )
    edit(
        JAVA / "ui" / "settings" / "AboutScreen.kt",
        [
            (r'"https://github\.com/OpenMinis/OpenMinis"\)', f'"{UPSTREAM_REPO_URL}")'),
            (r'"https://github\.com/nano-muse/nanoMuse"', f'"{UPSTREAM_REPO_URL}"'),
        ],
    )
    edit(
        JAVA / "ui" / "settings" / "SettingsScreen.kt",
        [
            (r'"https://openminis\.github\.io/privacy-policy\.html"', f'"{PRIVACY_URL}"'),
            (r'"https://github\.com/OpenMinis/OpenMinis/issues/new"', f'"{UPSTREAM_REPO_URL}/issues/new"'),
            (
                r'"https://github\.com/nano-muse/nanoMuse/issues/new"',
                f'"{UPSTREAM_REPO_URL}/issues/new"',
            ),
        ],
    )


SYSTEM_SCHEME = "wevvy"  # what the system knows the app by; in-app links stay minis://


def schemes() -> None:
    """The scheme registered with the system is ours, so a phone with OpenMinis or the
    original wevvy installed too never has two apps claiming one scheme."""
    edit(
        MAIN / "AndroidManifest.xml",
        [
            (r'<data android:scheme="minis" />', f'<data android:scheme="{SYSTEM_SCHEME}" />'),
            (r'<data android:scheme="wevvy" />', f'<data android:scheme="{SYSTEM_SCHEME}" />'),
            (
                r"the scheme the system knows us by is `wevvy`, not upstream's `minis`,",
                "the scheme the system knows us by is `wevvy`, not upstream's `minis`, // wevvy",
            ),
        ],
    )


# (pattern, replacement); applied to Theme.kt only. The upstream blues become the wevvy
# design tokens (primary #005ABF light / #0064D4 dark); the neutrals stay untouched.
# The second block maps the previous pass's accents (#0071CE / #00ADFA family) onto the
# same tokens so re-running converges no matter which pass touched the file first.
THEME_MAP = [
    ("0xFF015CFB", "0xFF005ABF"),  # primary
    ("0xFFE5F0FF", "0xFFE6EEF9"),  # primaryContainer
    ("0xFF012F80", "0xFF00408A"),  # onPrimaryContainer
    ("0xFF58A6FF", "0xFF0064D4"),  # dark primary
    ("0xFF00224D", "0xFF00224D"),  # dark onPrimary (kept: readable on #0064D4)
    ("0xFF1A2B4A", "0xFF0F2542"),  # dark primaryContainer
    ("0xFFE5E5EA", "0xFFE6EEF9"),  # dark onPrimaryContainer
    ("0xFF0071CE", "0xFF005ABF"),  # previous pass's light accent
    ("0xFF00ADFA", "0xFF0064D4"),  # previous pass's dark accent
    ("0xFFE3F4FE", "0xFFE6EEF9"),  # previous pass's light container
    ("0xFF01497E", "0xFF00408A"),  # previous pass's onPrimaryContainer
    ("0xFF15303F", "0xFF0F2542"),  # previous pass's dark container
]

# Applied to ChatColors.kt only; light palette first, then dark. The link blue is the
# token #0064D4 rather than the primary #005ABF.
CHAT_MAP = [
    ("inlineCodeText = Color(0xFF015CFB)", "inlineCodeText = Color(0xFF005ABF)"),
    ("link = Color(0xFF015CFB)", "link = Color(0xFF0064D4)"),
    ("thinking = Color(0xFF015CFB)", "thinking = Color(0xFF005ABF)"),
    ("fabAccent = Color(0xFF015CFB)", "fabAccent = Color(0xFF005ABF)"),
    ("inlineCodeText = Color(0xFF0071CE)", "inlineCodeText = Color(0xFF005ABF)"),
    ("link = Color(0xFF0071CE)", "link = Color(0xFF0064D4)"),
    ("thinking = Color(0xFF0071CE)", "thinking = Color(0xFF005ABF)"),
    ("fabAccent = Color(0xFF0071CE)", "fabAccent = Color(0xFF005ABF)"),
    ("inlineCodeText = Color(0xFF58A6FF)", "inlineCodeText = Color(0xFF0064D4)"),
    ("link = Color(0xFF58A6FF)", "link = Color(0xFF0064D4)"),
    ("thinking = Color(0xFF58A6FF)", "thinking = Color(0xFF0064D4)"),
    ("fabAccent = Color(0xFF58A6FF)", "fabAccent = Color(0xFF0064D4)"),
    ("inlineCodeText = Color(0xFF00ADFA)", "inlineCodeText = Color(0xFF0064D4)"),
    ("link = Color(0xFF00ADFA)", "link = Color(0xFF0064D4)"),
    ("thinking = Color(0xFF00ADFA)", "thinking = Color(0xFF0064D4)"),
    ("fabAccent = Color(0xFF00ADFA)", "fabAccent = Color(0xFF0064D4)"),
    ("inputBg = Color.White", "inputBg = Color(0xFFF3F4F6)"),  # token input fill (light)
]

# The iOS system blues and the previous product's blues, wherever they are
# hard-coded (any alpha), plus the action blue MuseTones.action carried from the
# earlier pass (0xFF0A66E4). All become the wevvy design tokens; the previous
# pass's #0071CE / #00ADFA map to the same tokens so a re-run converges.
GLOBAL_MAP = [
    (r"0x([0-9A-Fa-f]{2})007AFF", r"0x\g<1>005ABF"),
    (r"0x([0-9A-Fa-f]{2})0A84FF", r"0x\g<1>0064D4"),
    (r"0x([0-9A-Fa-f]{2})0A66E4", r"0x\g<1>005ABF"),
    (r"0x([0-9A-Fa-f]{2})015CFB", r"0x\g<1>005ABF"),
    (r"0x([0-9A-Fa-f]{2})58A6FF", r"0x\g<1>0064D4"),
    (r"0x([0-9A-Fa-f]{2})0071CE", r"0x\g<1>005ABF"),
    (r"0x([0-9A-Fa-f]{2})00ADFA", r"0x\g<1>0064D4"),
    (r"0x([0-9A-Fa-f]{2})E3F4FE", r"0x\g<1>E6EEF9"),
    (r"0x([0-9A-Fa-f]{2})01497E", r"0x\g<1>00408A"),
    (r"0x([0-9A-Fa-f]{2})15303F", r"0x\g<1>0F2542"),
    (r"#007AFF\b", "#005ABF"),
    (r"#0A84FF\b", "#0064D4"),
    (r"#015CFB\b", "#005ABF"),
    (r"#58A6FF\b", "#0064D4"),
    (r"#0071CE\b", "#005ABF"),
    (r"#00ADFA\b", "#0064D4"),
]


def colours() -> None:
    edit(JAVA / "ui" / "theme" / "Theme.kt", [(re.escape(a), b) for a, b in THEME_MAP])
    edit(JAVA / "ui" / "theme" / "ChatColors.kt", [(re.escape(a), b) for a, b in CHAT_MAP], count=1)
    for path in sorted(JAVA.rglob("*.kt")) + sorted(RES.rglob("*.xml")):
        edit(path, GLOBAL_MAP)
    edit(RES / "values" / "colors.xml", [(r'(<color name="seed">)#[0-9A-Fa-f]+', r"\g<1>#005ABF")])


def notification_icons_wevvy_tree() -> None:
    """Our own tree (io.github.wevvy) was written with the old mark drawable already."""
    ours = MAIN / "java" / "io" / "github" / "wevvy"
    for path in sorted(ours.rglob("*.kt")):
        edit(
            path,
            [
                (r"R\.drawable\.ic_stat_wevvy\b", "R.drawable.ic_stat_wevvy"),
            ],
        )


def notification_icons() -> None:
    for path in sorted(JAVA.rglob("*.kt")):
        edit(
            path,
            [
                (
                    r"setSmallIcon\(R\.mipmap\.ic_launcher\)",
                    "setSmallIcon(R.drawable.ic_stat_wevvy) // wevvy: flat status-bar mark",
                ),
                (
                    r"setSmallIcon\(R\.drawable\.ic_stat_wevvy\)",
                    "setSmallIcon(R.drawable.ic_stat_wevvy) // wevvy: flat status-bar mark",
                ),
            ],
        )


FACE = re.compile(
    r"(Notification(?:Compat)?\.Builder\((\w+), [^\n]*\)\n(\s*)\.setSmallIcon\([^\n]*\n)"
    r"(?!\s*\.setLargeIcon)"
)


def notification_faces() -> None:
    """Every notification the agent sends shows its face as the large icon."""

    def add(m: re.Match[str]) -> str:
        ctx, indent = m.group(2), m.group(3)
        return (
            f"{m.group(1)}{indent}.setLargeIcon(io.github.wevvy.identity.WevvyIdentity"
            f".face({ctx})) // wevvy: the agent is the sender\n"
        )

    for path in sorted(JAVA.rglob("*.kt")):
        text = path.read_text(encoding="utf-8")
        new = FACE.sub(add, text)
        if new != text:
            path.write_text(new, encoding="utf-8")
            changed.append(str(path.relative_to(ROOT)))


# Reworded in wevvy's voice. Locale dir -> string name -> text.
COPY: dict[str, dict[str, str]] = {
    "values": {
        "bg_service_notification_title": "wevvy is working",
    },
}


def reword() -> None:
    for folder, strings in COPY.items():
        subs = [
            (rf'(<string name="{name}">)[^<]*(</string>)', rf"\g<1>{text}\g<2>")
            for name, text in strings.items()
        ]
        edit(RES / folder / "strings.xml", subs)


def check() -> int:
    problems = 0
    gradle_text = (APP / "build.gradle.kts").read_text(encoding="utf-8")
    for want in (
        f'applicationId = "{APP_ID}"',
        f"versionCode = {VERSION_CODE}",
        f'versionName = "{VERSION_NAME}"',
    ):
        if want not in gradle_text:
            print(f"  ! app/build.gradle.kts lacks {want}")
            problems += 1
    ours = MAIN / "java" / "io" / "github" / "wevvy"
    ours_test = APP / "src" / "test" / "java" / "io" / "github" / "wevvy"
    for path in (
        sorted(RES.glob("values*/strings.xml"))
        + sorted(RES.glob("values*/nm_strings.xml"))
        + sorted(ours.rglob("*.kt"))
        + sorted(ours_test.rglob("*.kt"))
    ):
        text = path.read_text(encoding="utf-8")
        if WORD.search(text):
            print(f"  ! Minis left in {path.relative_to(ROOT)}")
            problems += 1
        for m in OLD_NAME.finditer(text):
            # the functional upstream GitHub URLs and the update checker's repo
            # field are intentionally kept
            start = max(0, m.start() - 40)
            context = text[start:m.end()]
            if ("github.com/nano-muse/" in context or "api.github.com/repos/nano-muse/" in context
                    or '"repo":"nano-muse/' in context or "'repo':'nano-muse/" in context):
                continue
            print(f"  ! old product name in {path.relative_to(ROOT)}: ...{m.group(0)}...")
            problems += 1
            break
    leftovers = re.compile(
        r"0x[0-9A-Fa-f]{2}(007AFF|0A84FF|0A66E4|015CFB|58A6FF|0071CE|00ADFA|528AD2|6A94CE)"
        r"|#007AFF|#0A84FF|#015CFB|#58A6FF|#0071CE|#00ADFA"
        r"|wevvySkills"
    )
    for path in sorted(JAVA.rglob("*.kt")) + sorted(RES.rglob("*.xml")):
        for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if leftovers.search(line):
                print(f"  ! {path.relative_to(ROOT)}:{i}: {line.strip()[:80]}")
                problems += 1
    manifest = (MAIN / "AndroidManifest.xml").read_text(encoding="utf-8")
    if 'android:scheme="minis"' in manifest:
        print("  ! AndroidManifest.xml still registers the upstream minis URL scheme")
        problems += 1
    if f'android:scheme="{SYSTEM_SCHEME}"' not in manifest:
        print(f"  ! AndroidManifest.xml lacks the {SYSTEM_SCHEME} scheme")
        problems += 1
    return problems


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if args in (["-h"], ["--help"]):
        print(__doc__.strip())
        return 0
    if args not in ([], ["--check"]):
        print(f"usage: {sys.argv[0]} [--check]  (unknown: {' '.join(args)})", file=sys.stderr)
        return 2
    if not APP.is_dir():
        sys.exit(f"{APP} not found")
    if args == ["--check"]:
        problems = check()
        print("clean" if problems == 0 else f"{problems} leftovers")
        return 1 if problems else 0
    gradle()
    package_ids()
    product_name()
    soul_defaults()
    links()
    schemes()
    colours()
    notification_icons()
    notification_icons_wevvy_tree()
    notification_faces()
    reword()
    for path in sorted(set(changed)):
        print(f"  edited {path}")
    print(f"{len(set(changed))} files changed")
    problems = check()
    print("clean" if problems == 0 else f"{problems} leftovers")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
