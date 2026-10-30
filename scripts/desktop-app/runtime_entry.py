"""The entry point of the bundled runtime (PyInstaller): ``ceis`` with all its
subcommands, so the desktop app can run ``ceis serve`` without a Python install.
"""

from __future__ import annotations

import multiprocessing
import sys


def main() -> None:
    multiprocessing.freeze_support()
    # the bundle's OpenSSL knows the build machine's certificate paths, not this one's
    from ceis.certs import ensure_ca_bundle

    ensure_ca_bundle()
    # the bridge commands (console scripts in a pip install) are subcommands of this one
    # executable: `ceis device …`, `ceis browser …`, `ceis open …`
    if len(sys.argv) > 1 and sys.argv[1] in ("device", "browser", "open"):
        from ceis.bridge import cli as bridge

        which = sys.argv.pop(1)
        {"device": bridge.device_main, "browser": bridge.browser_main, "open": bridge.open_main}[
            which
        ]()
        return
    from ceis.cli import main as cli_main

    cli_main()


if __name__ == "__main__":
    main()
