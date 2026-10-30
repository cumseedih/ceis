"""Workspace file operations (read / write / append / list / search / edit / grep / symbols).

Paths are resolved inside the agent workspace. Reading outside of it is allowed
only for explicitly configured extra roots and is treated as *private data*.
"""

from __future__ import annotations

import asyncio
import fnmatch
import hashlib
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from wevvy.schema import RiskLevel, ToolResult
from wevvy.tools.base import BaseTool, CallAssessment, int_arg, short_json

MAX_READ_CHARS = 60_000


def unescape_flat(content: str) -> tuple[str, bool]:
    """Turn a one-line text full of literal ``\\n`` into lines.

    Small models double-escape newlines in JSON arguments, so a three-day itinerary
    arrives as one line with ``\\n`` between the days. Only text that has *no* real
    newline and at least two escaped ones is touched — code has real newlines, and a
    one-liner that genuinely contains ``\\n`` twice is not something people write.
    """
    if "\n" in content or content.count("\\n") < 2:
        return content, False
    return content.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\t", "\t"), True


def pdf_text(path: Path, max_pages: int = 60) -> str:
    """The text of a PDF, page by page — what the model reads when the user attaches one.
    Scanned PDFs have no text layer; the result says so instead of coming back empty."""
    from pypdf import PdfReader

    try:
        reader = PdfReader(str(path))
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:  # noqa: BLE001
                return "(this PDF is encrypted; the text cannot be read without its password)"
        pages = len(reader.pages)
    except Exception as exc:  # noqa: BLE001 — a damaged file is a result, not a crash
        return f"(this PDF could not be read: {type(exc).__name__}: {str(exc)[:200]})"
    parts: list[str] = []
    for i, page in enumerate(reader.pages[:max_pages], start=1):
        try:
            content = (page.extract_text() or "").strip()
        except Exception as exc:  # noqa: BLE001
            content = f"(page could not be read: {exc})"
        parts.append(f"--- page {i} of {pages} ---\n{content}")
    if pages > max_pages:
        parts.append(f"... [{pages - max_pages} more pages not shown]")
    text = "\n\n".join(parts)
    if not any(p.split("---\n", 1)[-1].strip() for p in parts):
        return (
            f"(this PDF has {pages} page{'s' if pages != 1 else ''} but no text layer; it is "
            "probably scanned images; the text cannot be extracted here)"
        )
    return text


# an unbounded `search` over a home directory would walk for minutes; this is plenty
SEARCH_MAX_ENTRIES = 50_000

# Directories the content search and the symbol index never descend into: vendored
# code, virtual environments and build output would otherwise dominate every query.
SKIP_DIRS = frozenset(
    {
        ".git",
        ".hg",
        ".svn",
        ".tox",
        ".venv",
        ".eggs",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        ".next",
        "__pycache__",
        "build",
        "dist",
        "node_modules",
        "site-packages",
        "venv",
    }
)

# Result caps, matching the filename search cap of 200 matches.
GREP_DEFAULT_RESULTS = 100
GREP_HARD_CAP = 200
SYMBOLS_DEFAULT_RESULTS = 100
SYMBOLS_HARD_CAP = 200
# A file larger than this is generated output or data, not source to index.
MAX_SYMBOL_FILE_BYTES = 1_000_000
# A match line is a snippet, not the whole line: long minified lines are cut here.
MAX_SNIPPET_CHARS = 200
# ripgrep on a huge tree is fast, but a pathological tree still gets a deadline.
GREP_TIMEOUT_S = 60


def _rg_available() -> bool:
    """Whether ripgrep is installed. Kept as a function (not a cached flag) so
    tests can force the pure Python fallback by monkeypatching it."""
    return shutil.which("rg") is not None


def _display_path(root: Path, found: Path, in_ws: bool, ws: Path) -> str:
    """How a match is named: relative to the workspace when the root is in it,
    as an absolute path under an extra root (the same rule as `search`)."""
    if in_ws:
        try:
            return found.relative_to(ws).as_posix()
        except ValueError:
            pass
    return str(found)


def _grep_rg(
    root: Path,
    pattern: str,
    max_results: int,
    ignore_case: bool,
    glob: str | None,
    in_ws: bool,
    ws: Path,
) -> tuple[list[str], str]:
    """Content search through ripgrep. Raises ValueError on a bad pattern and
    RuntimeError when ripgrep itself fails, so the caller can fall back."""
    cmd = [
        "rg",
        "--no-heading",
        "--with-filename",
        "--line-number",
        "--no-messages",
    ]
    if ignore_case:
        cmd.append("--ignore-case")
    for skipped in sorted(SKIP_DIRS):
        cmd += ["--glob", f"!{skipped}/**"]
    if glob:
        cmd += ["--glob", glob]
    cmd += ["--", pattern]
    if root.is_file():
        cmd.append(str(root))
        cwd = root.parent
    else:
        cmd.append(".")
        cwd = root
    try:
        proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=GREP_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        raise RuntimeError("ripgrep timed out; try a narrower `path`") from None
    if proc.returncode == 1:
        return [], ""
    if proc.returncode != 0:
        raise RuntimeError(f"ripgrep failed: {proc.stderr.strip()[:200]}")
    lines: list[str] = []
    truncated = False
    for raw in proc.stdout.splitlines():
        parts = raw.split(":", 2)
        if len(parts) != 3:
            continue
        found_raw, lineno, text = parts
        found = Path(found_raw) if Path(found_raw).is_absolute() else (cwd / found_raw)
        display = _display_path(root, found.resolve(), in_ws, ws)
        lines.append(f"{display}:{lineno}: {text.strip()[:MAX_SNIPPET_CHARS]}")
        if len(lines) >= max_results:
            truncated = True
            break
    note = (
        f"\n(showing the first {max_results} matches; narrow `path` or `glob`)" if truncated else ""
    )
    return lines, note


def _grep_python(
    root: Path,
    pattern: str,
    max_results: int,
    ignore_case: bool,
    glob: str | None,
    in_ws: bool,
    ws: Path,
) -> tuple[list[str], str]:
    """Pure Python content search, the fallback when ripgrep is missing or
    fails. Same output shape and caps as the ripgrep path."""
    flags = re.IGNORECASE if ignore_case else 0
    try:
        rx = re.compile(pattern, flags)
    except re.error as exc:
        raise ValueError(f"invalid regex: {exc}") from exc
    files: list[Path] = []
    scanned = 0
    if root.is_file():
        files = [root]
    else:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = sorted(
                d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")
            )
            for name in sorted(filenames):
                scanned += 1
                if scanned > SEARCH_MAX_ENTRIES:
                    break
                candidate = Path(dirpath) / name
                if glob and not fnmatch.fnmatch(candidate.relative_to(root).as_posix(), glob):
                    continue
                files.append(candidate)
            if scanned > SEARCH_MAX_ENTRIES:
                break
    lines: list[str] = []
    truncated = False
    for found in files:
        try:
            with found.open("rb") as fh:
                head = fh.read(8192)
                if b"\x00" in head:
                    continue
                fh.seek(0)
                data = fh.read()
        except OSError:
            continue
        for lineno, line in enumerate(data.decode("utf-8", errors="ignore").splitlines(), 1):
            if rx.search(line):
                display = _display_path(root, found.resolve(), in_ws, ws)
                lines.append(f"{display}:{lineno}: {line.strip()[:MAX_SNIPPET_CHARS]}")
                if len(lines) >= max_results:
                    truncated = True
                    break
        if truncated:
            break
    note = (
        f"\n(showing the first {max_results} matches; narrow `path` or `glob`)" if truncated else ""
    )
    if scanned > SEARCH_MAX_ENTRIES:
        note += f"\n(stopped after {SEARCH_MAX_ENTRIES} entries; search a narrower `path`)"
    return lines, note


def _grep(
    root: Path,
    pattern: str,
    max_results: int,
    ignore_case: bool,
    glob: str | None,
    in_ws: bool,
    ws: Path,
) -> tuple[list[str], str]:
    """Content search: ripgrep when available, pure Python otherwise. A bad
    pattern is an error in both paths; a ripgrep failure falls back."""
    try:
        re.compile(pattern, re.IGNORECASE if ignore_case else 0)
    except re.error as exc:
        raise ValueError(f"invalid regex: {exc}") from exc
    if _rg_available():
        try:
            return _grep_rg(root, pattern, max_results, ignore_case, glob, in_ws, ws)
        except RuntimeError:
            pass
    return _grep_python(root, pattern, max_results, ignore_case, glob, in_ws, ws)


# ------------------------------------------------------------------ symbol index
_PY_DEF = re.compile(r"^(?P<indent>[ \t]*)(?P<kind>class|def|async def)\s+(?P<name>[A-Za-z_]\w*)")
_TS_CLASS = re.compile(
    r"^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(?P<name>[A-Za-z_$][\w$]*)"
)
_TS_FUNC = re.compile(
    r"^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*(?P<name>[A-Za-z_$][\w$]*)"
)
_TS_ARROW = re.compile(
    r"^(?:export\s+)?(?:const|let|var)\s+(?P<name>[A-Za-z_$][\w$]*)"
    r"\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>"
)
_TS_TYPE = re.compile(r"^(?:export\s+)?(?:interface|type|enum)\s+(?P<name>[A-Za-z_$][\w$]*)")
_TS_METHOD = re.compile(
    r"^\s*(?:(?:public|private|protected|static|async|readonly|get|set|\*)\s+)*"
    r"(?P<name>[A-Za-z_$][\w$]*)\s*\([^;]*\)\s*(?::\s*[^{]+)?\{"
)
_TS_METHOD_KEYWORDS = frozenset(
    {"if", "for", "while", "switch", "catch", "return", "typeof", "new", "super"}
)
_KT_CLASS = re.compile(
    r"^(?:\s*(?:public|private|internal|protected|open|final|abstract|data|sealed|enum|annotation)\s+)*"
    r"(?:class|interface|object)\s+(?P<name>[A-Za-z_]\w*)"
)
_KT_FUN = re.compile(r"\bfun\s+(?:<[^>]+>\s+)?(?:[A-Za-z_][\w.]*\.)?(?P<name>[A-Za-z_]\w*)\s*\(")

_SYMBOL_EXTS: dict[str, str] = {
    ".py": "python",
    ".pyi": "python",
    ".ts": "ts",
    ".tsx": "ts",
    ".mts": "ts",
    ".cts": "ts",
    ".js": "js",
    ".jsx": "js",
    ".mjs": "js",
    ".cjs": "js",
    ".kt": "kotlin",
    ".kts": "kotlin",
}


def _symbols_for_file(path: Path, lang: str) -> list[tuple[int, str, str, str]]:
    """Definition sites in one file: (line, kind, name, enclosing scope).
    Regex based and best effort: it finds the usual shapes and may miss
    multi-line signatures. No binary dependency, no ctags."""
    try:
        if path.stat().st_size > MAX_SYMBOL_FILE_BYTES:
            return []
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return []
    out: list[tuple[int, str, str, str]] = []
    if lang == "python":
        # Indentation stack: (indent width, name) for enclosing classes/functions.
        stack: list[tuple[int, str]] = []
        for lineno, line in enumerate(text.splitlines(), 1):
            m = _PY_DEF.match(line)
            if not m:
                continue
            indent = len(m.group("indent").expandtabs(8))
            while stack and stack[-1][0] >= indent:
                stack.pop()
            scope = ".".join(name for _, name in stack)
            keyword = m.group("kind")
            if keyword == "class":
                kind = "class"
            elif scope:
                kind = "method"
            else:
                kind = "function"
            out.append((lineno, kind, m.group("name"), scope))
            stack.append((indent, m.group("name")))
        return out
    # Brace tracked languages: a class scope lasts while its braces stay open.
    brace_stack: list[tuple[int, str]] = []
    depth = 0
    for lineno, line in enumerate(text.splitlines(), 1):
        while brace_stack and brace_stack[-1][0] > depth:
            brace_stack.pop()
        scope = ".".join(name for _, name in brace_stack)
        stripped = line.strip()
        if lang in ("ts", "js"):
            is_class = False
            m = _TS_CLASS.match(stripped)
            if m:
                out.append((lineno, "class", m.group("name"), scope))
                is_class = True
            else:
                m = _TS_FUNC.match(stripped)
                if m:
                    out.append((lineno, "function", m.group("name"), scope))
                else:
                    m = _TS_TYPE.match(stripped)
                    if m:
                        out.append((lineno, "type", m.group("name"), scope))
                    else:
                        m = _TS_ARROW.match(stripped)
                        if m:
                            out.append((lineno, "function", m.group("name"), scope))
                        elif brace_stack:
                            m = _TS_METHOD.match(line)
                            if m and m.group("name") not in _TS_METHOD_KEYWORDS:
                                out.append((lineno, "method", m.group("name"), scope))
                            else:
                                m = None
            if is_class and m is not None:
                brace_stack.append((depth + line.count("{") - line.count("}"), m.group("name")))
        else:  # kotlin
            m = _KT_CLASS.match(line)
            if m:
                out.append((lineno, "class", m.group("name"), scope))
                brace_stack.append((depth + line.count("{") - line.count("}"), m.group("name")))
            else:
                m = _KT_FUN.search(line)
                if m:
                    kind = "method" if brace_stack else "function"
                    out.append((lineno, kind, m.group("name"), scope))
        depth += line.count("{") - line.count("}")
    return out


def _symbols(
    root: Path, name: str | None, max_results: int, in_ws: bool, ws: Path
) -> tuple[list[str], str]:
    """A per-query symbol index over the workspace: walk, regex, report.
    Files over the size cap and skipped directories are never read."""
    files: list[Path] = []
    scanned = 0
    if root.is_file():
        files = [root]
    else:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = sorted(
                d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")
            )
            for fname in sorted(filenames):
                scanned += 1
                if scanned > SEARCH_MAX_ENTRIES:
                    break
                candidate = Path(dirpath) / fname
                if candidate.suffix.lower() in _SYMBOL_EXTS:
                    files.append(candidate)
            if scanned > SEARCH_MAX_ENTRIES:
                break
    lines: list[str] = []
    truncated = False
    for found in files:
        lang = _SYMBOL_EXTS.get(found.suffix.lower())
        if lang is None:
            continue
        for lineno, kind, sym, scope in _symbols_for_file(found, lang):
            if name is not None and sym != name:
                continue
            display = _display_path(root, found.resolve(), in_ws, ws)
            entry = f"{display}:{lineno} {kind} {sym}"
            if scope:
                entry += f" in {scope}"
            lines.append(entry)
            if len(lines) >= max_results:
                truncated = True
                break
        if truncated:
            break
    note = (
        f"\n(showing the first {max_results} symbols; narrow `path` or `name`)" if truncated else ""
    )
    if scanned > SEARCH_MAX_ENTRIES:
        note += f"\n(stopped after {SEARCH_MAX_ENTRIES} entries; search a narrower `path`)"
    return lines, note


class Files(BaseTool):
    name: str = "files"
    description: str = (
        "Work with files in the workspace. Actions: "
        "`read` (path; PDFs come back as text, page by page), `write` (path, content – overwrites), `append` (path, content), "
        "`list` (path, optional), `search` (pattern glob such as '**/*.md'), "
        "`edit` (path, old_text, new_text: replace one exact occurrence; pass occurrence, 1-based, when old_text matches more than once), "
        "`grep` (pattern regex over file contents, ripgrep when installed, pure Python fallback otherwise; returns file:line matches), "
        "`symbols` (name, optional: definition sites for Python, TypeScript/JavaScript and Kotlin, as file:line entries). "
        "Paths are relative to the workspace unless they start with '/' or '~'."
    )
    parameters: dict[str, Any] = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["read", "write", "append", "list", "search", "edit", "grep", "symbols"],
            },
            "path": {"type": "string", "description": "File or directory path."},
            "content": {"type": "string", "description": "Content for write/append."},
            "pattern": {
                "type": "string",
                "description": "Glob pattern for search; regex for grep.",
            },
            "old_text": {"type": "string", "description": "Exact text to replace, for edit."},
            "new_text": {"type": "string", "description": "Replacement text, for edit."},
            "occurrence": {
                "type": "integer",
                "description": "1-based occurrence of old_text to replace, for edit; required when old_text matches more than once.",
            },
            "max_results": {
                "type": "integer",
                "description": "Result cap for grep/symbols (default 100, max 200).",
            },
            "ignore_case": {
                "type": "boolean",
                "description": "Case-insensitive matching, for grep.",
            },
            "name": {
                "type": "string",
                "description": "Symbol name to look up, for symbols; omit to list all.",
            },
            "glob": {
                "type": "string",
                "description": "Filename glob limiting which files grep reads.",
            },
        },
        "required": ["action"],
    }
    risk: RiskLevel = RiskLevel.SAFE

    workspace: Path
    extra_roots: list[Path] = []

    # ------------------------------------------------------------------ helpers
    def _resolve(self, path: str | None, must_exist: bool = False) -> Path:
        raw = (path or ".").strip()
        candidate = Path(os.path.expanduser(raw))
        if not candidate.is_absolute():
            candidate = self.workspace / candidate
        resolved = candidate.resolve()
        roots = [self.workspace.resolve(), *[r.resolve() for r in self.extra_roots]]
        if not any(resolved == r or r in resolved.parents for r in roots):
            raise PermissionError(
                f"path '{raw}' is outside the workspace ({self.workspace}). "
                "Ask the user to add it to agent.extra_roots if access is really needed."
            )
        if must_exist and not resolved.exists():
            raise FileNotFoundError(f"'{raw}' does not exist")
        return resolved

    def _inside_workspace(self, path: Path) -> bool:
        ws = self.workspace.resolve()
        return path == ws or ws in path.parents

    def assess(self, args: dict[str, Any]) -> CallAssessment:
        action = args.get("action", "")
        path = args.get("path") or "."
        summary = (
            f"files.{action} {path}"
            if action != "search"
            else f"files.search {args.get('pattern', '')}"
        )
        try:
            resolved = self._resolve(path)
            inside = self._inside_workspace(resolved)
        except Exception:  # noqa: BLE001 - reported at execution time
            inside = False  # a path that cannot be resolved does not get the workspace's trust
        # `edit` is a write: it goes through the same Sentinel path as `write`,
        # with the same risk, because the gate decides on the assessment, not
        # on the action name. Reads stay safe inside the workspace.
        if action in ("write", "append", "edit"):
            risk = RiskLevel.MODERATE if inside else RiskLevel.SENSITIVE
            chars = len(args.get("content") or args.get("new_text") or "")
            return CallAssessment(risk=risk, summary=summary + f" ({chars} chars)")
        # reads
        return CallAssessment(
            risk=RiskLevel.SAFE if inside else RiskLevel.MODERATE,
            reads_private_data=not inside,
            summary=summary,
        )

    # ------------------------------------------------------------------ execution
    async def execute(
        self,
        action: str = "",
        path: str | None = None,
        content: str | None = None,
        pattern: str | None = None,
        old_text: str | None = None,
        new_text: str | None = None,
        occurrence: int | None = None,
        max_results: int | None = None,
        ignore_case: bool = False,
        name: str | None = None,
        glob: str | None = None,
        **_: Any,
    ) -> ToolResult:
        try:
            if action == "read":
                target = self._resolve(path, must_exist=True)
                if target.is_dir():
                    return await self.execute(action="list", path=path)
                if target.suffix.lower() == ".pdf":
                    # pypdf on a long document takes seconds: off the event loop, so the
                    # web app and the hub keep answering meanwhile
                    text = await asyncio.to_thread(pdf_text, target)
                    if len(text) > MAX_READ_CHARS:
                        text = text[:MAX_READ_CHARS] + f"\n... [truncated, {len(text)} chars total]"
                    return ToolResult(output=text or "(empty file)")
                # read what fits and one more character, not the whole file: a log of a few
                # hundred MB is truncated either way, and need not be loaded for it
                with target.open("r", encoding="utf-8", errors="replace") as fh:
                    text = fh.read(MAX_READ_CHARS + 1)
                if len(text) > MAX_READ_CHARS:
                    size = target.stat().st_size
                    text = text[:MAX_READ_CHARS] + f"\n... [truncated, {size} bytes total]"
                return ToolResult(output=text or "(empty file)")
            if action in ("write", "append"):
                if content is None:
                    return ToolResult.fail("`content` is required")
                content, fixed = unescape_flat(content)
                target = self._resolve(path)
                target.parent.mkdir(parents=True, exist_ok=True)
                with target.open("a" if action == "append" else "w", encoding="utf-8") as fh:
                    fh.write(content)
                rel = os.path.relpath(target, self.workspace)
                note = " (the content had escaped newlines; written as lines)" if fixed else ""
                return ToolResult(
                    output=f"{'Appended' if action == 'append' else 'Wrote'} {len(content)} chars "
                    f"to {rel}{note}"
                )
            if action == "edit":
                if old_text is None or new_text is None:
                    return ToolResult.fail("`old_text` and `new_text` are required for edit")
                if old_text == "":
                    return ToolResult.fail("`old_text` must not be empty")
                if occurrence is not None:
                    if isinstance(occurrence, bool) or not isinstance(occurrence, int):
                        return ToolResult.fail("`occurrence` must be a whole number, 1-based")
                    if occurrence < 1:
                        return ToolResult.fail("`occurrence` must be 1 or higher")
                target = self._resolve(path, must_exist=True)
                if target.is_dir():
                    return ToolResult.fail("edit needs a file path, not a directory")
                try:
                    text = target.read_bytes().decode("utf-8")
                except UnicodeDecodeError:
                    return ToolResult.fail("file is not UTF-8 text; edit works on text files only")
                count = text.count(old_text)
                if count == 0:
                    return ToolResult.fail(f"`old_text` not found in {path or target.name}")
                if occurrence is None:
                    if count > 1:
                        return ToolResult.fail(
                            f"`old_text` matches {count} times; pass `occurrence` "
                            "(1-based) or a longer, unique `old_text`"
                        )
                    picked = 1
                    idx = text.find(old_text)
                else:
                    if occurrence > count:
                        return ToolResult.fail(
                            f"`occurrence` {occurrence} is out of range: "
                            f"`old_text` matches {count} times"
                        )
                    picked = occurrence
                    idx = -1
                    for _pick in range(occurrence):
                        idx = text.find(old_text, idx + 1)
                start_line = text.count("\n", 0, idx) + 1
                end_line = start_line + old_text.count("\n")
                replaced = text[:idx] + new_text + text[idx + len(old_text) :]
                target.write_text(replaced, encoding="utf-8")
                digest = hashlib.sha256(replaced.encode("utf-8")).hexdigest()[:12]
                if not replaced:
                    new_lines = 0
                elif replaced.endswith("\n"):
                    new_lines = replaced.count("\n")
                else:
                    new_lines = replaced.count("\n") + 1
                rel = os.path.relpath(target, self.workspace)
                return ToolResult(
                    output=f"Edited {rel}: replaced lines {start_line}-{end_line} "
                    f"(occurrence {picked} of {count}); now {new_lines} lines; "
                    f"sha256:{digest}"
                )
            if action == "grep":
                if not pattern:
                    return ToolResult.fail("`pattern` is required")
                root = self._resolve(path, must_exist=True)
                ws = self.workspace.resolve()
                in_ws = root == ws or ws in root.parents
                cap = int_arg(max_results, GREP_DEFAULT_RESULTS, 1, GREP_HARD_CAP)
                try:
                    matches, note = await asyncio.to_thread(
                        _grep, root, pattern, cap, bool(ignore_case), glob, in_ws, ws
                    )
                except (ValueError, RuntimeError) as exc:
                    return ToolResult.fail(str(exc))
                return ToolResult(output=("\n".join(matches) or "(no matches)") + note)
            if action == "symbols":
                root = self._resolve(path, must_exist=True)
                ws = self.workspace.resolve()
                in_ws = root == ws or ws in root.parents
                cap = int_arg(max_results, SYMBOLS_DEFAULT_RESULTS, 1, SYMBOLS_HARD_CAP)
                sym_entries, note = await asyncio.to_thread(_symbols, root, name, cap, in_ws, ws)
                return ToolResult(output=("\n".join(sym_entries) or "(no symbols found)") + note)
            if action == "list":
                target = self._resolve(path, must_exist=True)
                if target.is_file():
                    return ToolResult(output=f"{target.name} ({target.stat().st_size} bytes)")
                entries = sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
                lines = [f"{'[dir] ' if p.is_dir() else ''}{p.name}" for p in entries[:500]]
                return ToolResult(output="\n".join(lines) or "(empty directory)")
            if action == "search":
                if not pattern:
                    return ToolResult.fail("`pattern` is required")
                root = self._resolve(path)
                # matches are named relative to the workspace when the root is in it, and
                # as absolute paths under an extra root (relative_to raised there before)
                ws = self.workspace.resolve()
                in_ws = root == ws or ws in root.parents
                glob = str(pattern)

                def _walk() -> tuple[list[str], str]:
                    # a walk of tens of thousands of entries stays off the event loop
                    matches: list[str] = []
                    scanned = 0
                    for p in root.rglob("*"):
                        scanned += 1
                        if p.is_file() and fnmatch.fnmatch(p.relative_to(root).as_posix(), glob):
                            matches.append(p.relative_to(ws).as_posix() if in_ws else str(p))
                        if len(matches) >= 200:
                            break
                        if scanned >= SEARCH_MAX_ENTRIES:
                            return matches, (
                                f"\n(stopped after {SEARCH_MAX_ENTRIES} entries; "
                                "search a narrower `path`)"
                            )
                    return matches, ""

                matches, note = await asyncio.to_thread(_walk)
                return ToolResult(output=("\n".join(matches) or "(no matches)") + note)
            return ToolResult.fail(
                f"unknown action '{action}'; use read/write/append/list/search/edit/grep/symbols"
            )
        except (PermissionError, FileNotFoundError, IsADirectoryError, OSError) as exc:
            return ToolResult.fail(str(exc))

    def __repr__(self) -> str:  # pragma: no cover
        return f"Files({short_json({'workspace': str(self.workspace)})})"


__all__ = ["Files"]
