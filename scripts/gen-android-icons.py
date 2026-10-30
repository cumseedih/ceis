#!/usr/bin/env python3
"""Generate ceis's launcher and status-bar icons for android/ from assets/brand/.

Idempotent and deterministic; re-run after every upstream pull (CONTRIBUTING.md).
The official logo is used as-is: the blue script mark is never recoloured or
redrawn, only scaled and composited.

Sources (repo root):
- assets/brand/ceis-mark.png        the script mark on transparency
- assets/brand/ceis-icon-512.png    the white tile with the mark (512x512)

Writes:
- drawable-{mdpi..xxxhdpi}/ic_launcher_foreground_ceis.png   the mark, 108dp canvas
- drawable-{mdpi..xxxhdpi}/ic_launcher_foreground_ceis_dark.png  white mark, 108dp
- drawable-{mdpi..xxxhdpi}/ic_launcher_monochrome.png            white silhouette, 108dp
- drawable-{mdpi..xxxhdpi}/ic_stat_ceis.png                      white mark, 24dp
- mipmap-{mdpi..xxxhdpi}/ic_launcher.png                          the tile, 48dp
- mipmap-{mdpi..xxxhdpi,night-*}/ic_launcher_foreground{,_light,_dark}.png
- mipmap-anydpi-v26/ic_launcher*.xml, mipmap-night-anydpi-v26/ic_launcher*.xml
- values*/ic_launcher_background.xml, values/ic_launcher_alt_colors.xml

Geometry: the mark is scaled to 56dp wide and centred on the 108dp adaptive
canvas; the farthest point of the mark from the centre stays inside the 33dp
circle that themed icons and round masks keep.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "assets" / "brand"
RES = ROOT / "android" / "src" / "android" / "app" / "src" / "main" / "res"

MARK = BRAND / "ceis-mark.png"
TILE = BRAND / "ceis-icon-512.png"

MARK_WIDTH_DP = 56.0  # the mark's width on the 108dp adaptive canvas
STAT_WIDTH_DP = 18.0  # the mark's width on the 24dp status-bar canvas

DENSITIES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}

ADAPTIVE_DAY = """<?xml version="1.0" encoding="utf-8"?>
<!-- ceis: generated from assets/brand/ceis-icon-512.png + ceis-mark.png (PIL). -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground_ceis" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
"""

ADAPTIVE_CLASSIC_LIGHT = """<?xml version="1.0" encoding="utf-8"?>
<!-- ceis: generated from assets/brand/ceis-icon-512.png + ceis-mark.png (PIL). -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_bg_force_light" />
    <foreground android:drawable="@drawable/ic_launcher_foreground_ceis" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
"""

ADAPTIVE_CLASSIC_DARK = """<?xml version="1.0" encoding="utf-8"?>
<!-- ceis: generated from assets/brand/ceis-icon-512.png + ceis-mark.png (PIL). -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_bg_force_dark" />
    <foreground android:drawable="@drawable/ic_launcher_foreground_ceis_dark" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
"""

ADAPTIVE_NIGHT = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground>
        <inset
            android:drawable="@mipmap/ic_launcher_foreground"
            android:inset="15%" />
    </foreground>
    <!-- T-android-themed-icons: monochrome layer (see day variant). -->
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
"""

ADAPTIVE_NIGHT_CLASSIC_LIGHT = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_bg_force_light" />
    <!-- [T-android-light-icon-preview-night-leak] Forced "Light" variant always
         uses the light M artwork (see the day variant). This -night copy must
         ALSO pin the always-light foreground rather than @mipmap/ic_launcher_
         foreground — otherwise a Light icon pinned on a dark-mode device picks
         the night (dark) foreground and darkens. Keeps pinned Light identical
         in both system modes. -->
    <foreground>
        <inset
            android:drawable="@mipmap/ic_launcher_foreground_light"
            android:inset="15%" />
    </foreground>
    <!-- T-android-themed-icons: monochrome layer (see day variant). -->
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
"""

ADAPTIVE_NIGHT_CLASSIC_DARK = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_bg_force_dark" />
    <!-- [T-android-dark-app-icon-from-ios] Forced "Dark" variant always uses the
         dark M artwork (see the day variant). Pointing at the explicit
         always-dark drawable rather than @mipmap/ic_launcher_foreground keeps the
         pinned Dark icon identical whether the system is in light or dark mode. -->
    <foreground>
        <inset
            android:drawable="@mipmap/ic_launcher_foreground_dark"
            android:inset="15%" />
    </foreground>
    <!-- T-android-themed-icons: monochrome layer (see day variant). -->
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
"""

BG_DAY = """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>
"""

ALT_COLORS = """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- T-android-dynamic-app-icon: explicit light/dark backgrounds for
         the forced-mode alternate icons. These do NOT swap with the
         system theme — they're the "always light" / "always dark"
         choices the user can pin in Settings → Appearance → App Icon. -->
    <color name="ic_launcher_bg_force_light">#FFFFFF</color>
    <color name="ic_launcher_bg_force_dark">#0F1B33</color>
</resources>
"""


def write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_bytes() != data:
        path.write_bytes(data)
        print(f"  wrote {path.relative_to(ROOT)}")


def write_text(path: Path, text: str) -> None:
    write(path, text.encode("utf-8"))


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if args in (["-h"], ["--help"]):
        print(__doc__.strip())
        return 0
    if args:
        print(
            f"usage: {sys.argv[0]}  (takes no arguments; unknown: {' '.join(args)})",
            file=sys.stderr,
        )
        return 2
    from PIL import Image

    if not MARK.is_file():
        sys.exit(f"{MARK} not found")
    if not TILE.is_file():
        sys.exit(f"{TILE} not found")

    mark = Image.open(MARK).convert("RGBA")
    tile = Image.open(TILE).convert("RGBA")
    mw, mh = mark.size

    def scaled_mark(width_px: int) -> Image.Image:
        h = round(width_px * mh / mw)
        return mark.resize((width_px, h), Image.LANCZOS)

    def white_mark(width_px: int) -> Image.Image:
        m = scaled_mark(width_px)
        white = Image.new("RGBA", m.size, (255, 255, 255, 255))
        white.putalpha(m.split()[3])
        return white

    def centred(canvas_px: int, art: Image.Image) -> Image.Image:
        out = Image.new("RGBA", (canvas_px, canvas_px), (0, 0, 0, 0))
        out.alpha_composite(art, ((canvas_px - art.width) // 2, (canvas_px - art.height) // 2))
        return out

    def png(im: Image.Image) -> bytes:
        from io import BytesIO

        buf = BytesIO()
        im.save(buf, format="PNG")
        return buf.getvalue()

    for density, scale in DENSITIES.items():
        canvas = round(108 * scale)
        mark_w = round(MARK_WIDTH_DP * scale)
        blue = centred(canvas, scaled_mark(mark_w))
        white = centred(canvas, white_mark(mark_w))
        draw = RES / f"drawable-{density}"
        write(draw / "ic_launcher_foreground_ceis.png", png(blue))
        write(draw / "ic_launcher_foreground_ceis_dark.png", png(white))
        write(draw / "ic_launcher_monochrome.png", png(white))
        stat_canvas = round(24 * scale)
        stat_w = round(STAT_WIDTH_DP * scale)
        write(draw / "ic_stat_ceis.png", png(centred(stat_canvas, white_mark(stat_w))))

        tile_px = round(48 * scale)
        for prefix in ("mipmap", "mipmap-night"):
            folder = RES / f"{prefix}-{density}"
            if not folder.is_dir():
                continue
            write(folder / "ic_launcher.png", png(tile.resize((tile_px, tile_px), Image.LANCZOS)))
            write(folder / "ic_launcher_foreground.png", png(blue))
            write(folder / "ic_launcher_foreground_light.png", png(blue))
            write(folder / "ic_launcher_foreground_dark.png", png(white))

    anydpi = RES / "mipmap-anydpi-v26"
    write_text(anydpi / "ic_launcher.xml", ADAPTIVE_DAY)
    write_text(anydpi / "ic_launcher_classic_light.xml", ADAPTIVE_CLASSIC_LIGHT)
    write_text(anydpi / "ic_launcher_classic_dark.xml", ADAPTIVE_CLASSIC_DARK)
    night = RES / "mipmap-night-anydpi-v26"
    write_text(night / "ic_launcher.xml", ADAPTIVE_NIGHT)
    write_text(night / "ic_launcher_classic_light.xml", ADAPTIVE_NIGHT_CLASSIC_LIGHT)
    write_text(night / "ic_launcher_classic_dark.xml", ADAPTIVE_NIGHT_CLASSIC_DARK)
    write_text(RES / "values" / "ic_launcher_background.xml", BG_DAY)
    write_text(RES / "values-night" / "ic_launcher_background.xml", BG_DAY)
    write_text(RES / "values" / "ic_launcher_alt_colors.xml", ALT_COLORS)
    return 0


if __name__ == "__main__":
    sys.exit(main())
