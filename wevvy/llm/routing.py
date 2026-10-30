"""Shape-based model routing: which model client a turn runs on.

The choice is a pure function of the request text and an explicit hint:
no model call, no I/O, no randomness, so the same inputs always route
the same way and tests can assert the choice exactly. The bias is
deliberate: a simple request sent to the strong model costs a little
more, but a hard task sent to the fast model answers badly, so borderline
requests route strong.

``"fast"`` means the configured fast slot; ``"strong"`` means the
configured main model. The router itself knows no provider, model id or
key; those live in the config that builds the clients.
"""

from __future__ import annotations

import re
from typing import Literal

Route = Literal["fast", "strong"]

# Task words that mark a request as real work rather than a question.
# Single words are matched as whole tokens, so "testing" does not fire
# on "latest" and "build" does not fire on "rebuild" (which is a build
# task anyway, and is covered by the phrase list through "rebuild").
STRONG_WORDS: frozenset[str] = frozenset(
    {
        "fix",
        "bug",
        "error",
        "crash",
        "refactor",
        "implement",
        "feature",
        "build",
        "compile",
        "gradle",
        "test",
        "tests",
        "testing",
        "lint",
        "deploy",
        "migrate",
        "debug",
        "debugging",
        "failing",
        "broken",
        "rewrite",
        "optimize",
        "optimise",
        "code",
        "coding",
        "script",
        "android",
        "react",
        "kotlin",
        "typescript",
        "javascript",
        "python",
        "api",
        "database",
        "endpoint",
        "performance",
        "codebase",
        "repository",
    }
)

# Multi-word and hyphenated shapes, matched as substrings of the
# lowercased request (whitespace collapsed first).
STRONG_PHRASES: tuple[str, ...] = (
    "multi-file",
    "multiple files",
    "across files",
    "pull request",
    "code review",
    "unit test",
    "end to end",
    "stack trace",
)

# A long request is rarely a simple question, whatever words it uses.
LONG_WORDS = 80
LONG_CHARS = 600

_TOKEN = re.compile(r"[a-z0-9]+")


def route_request(text: str, *, hint: Route | None = None) -> Route:
    """Route one request: an explicit hint wins, else cheap heuristics.

    An unknown hint value is ignored rather than crashing the turn;
    the heuristics decide then. Empty text has no signals and routes
    fast.
    """
    if hint in ("fast", "strong"):
        return hint
    lowered = " ".join(text.lower().split())
    if not lowered:
        return "fast"
    if len(lowered) >= LONG_CHARS or len(lowered.split()) >= LONG_WORDS:
        return "strong"
    if any(phrase in lowered for phrase in STRONG_PHRASES):
        return "strong"
    if set(_TOKEN.findall(lowered)) & STRONG_WORDS:
        return "strong"
    return "fast"


__all__ = ["LONG_CHARS", "LONG_WORDS", "STRONG_PHRASES", "STRONG_WORDS", "Route", "route_request"]
