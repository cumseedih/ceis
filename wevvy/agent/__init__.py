"""The agent loop (:mod:`wevvy.agent.core`) and the hold registry
(:mod:`wevvy.agent.holds`). ``core`` pulls in the Sentinel and the tools, and the tools
import ``holds``; so ``core`` is loaded on first use rather than here, and
``from wevvy.agent.holds import Holds`` works from anywhere without a cycle."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from wevvy.agent.core import Incoming, MuseAgent

__all__ = ["Incoming", "MuseAgent"]


def __getattr__(name: str) -> Any:
    if name in __all__:
        from wevvy.agent import core

        return getattr(core, name)
    raise AttributeError(f"module 'wevvy.agent' has no attribute {name!r}")
