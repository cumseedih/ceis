"""Post-edit verification: what a turn changed, checked before it ends.

After a step that edited files, the loop feeds this report back to the
model instead of accepting a terminate straight away, so the model can
repair a broken edit before the turn closes. The report is advisory, not
a gate: when a part of it cannot run, the report says so and the turn
proceeds. Only two kinds of inspection run here, both read-only: a git
diff summary scoped to the edited files, and a syntax check of edited
Python files. No other file type has a checker in this tree, so no other
type is checked and no new dependency is added for one.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

# File actions of the files tool that change content.
MUTATING_FILE_ACTIONS = frozenset({"write", "edit", "append"})

_GIT_TIMEOUT_SECONDS = 10
_MAX_FILES_LISTED = 100
_MAX_DIFF_LINES = 40


def _resolve_inside(raw: str, workspace: Path) -> Path | None:
    """The edited path, resolved, or None when it escapes the workspace.

    A path outside the workspace is never read: the caller lists it as
    skipped instead. A path that cannot be resolved is skipped the same
    way, since there is nothing safe to say about it.
    """
    candidate = Path(raw)
    if not candidate.is_absolute():
        candidate = workspace / candidate
    try:
        resolved = candidate.resolve()
    except OSError:
        return None
    if resolved == workspace or workspace not in resolved.parents:
        return None
    return resolved


def _git_summary(workspace: Path, rel_paths: list[str]) -> list[str] | None:
    """Read-only git inspection of the edited files, or None on failure.

    ``git status`` names new and changed files (a plain diff misses a
    file the turn created), and ``git diff --stat`` sizes the changes
    to tracked files. Both commands are scoped to the edited files, so
    unrelated uncommitted work in the workspace stays out of the
    report. A missing git binary, a timeout, or a non-zero exit all
    return None, and the caller falls back to the file list.
    """
    try:
        status = subprocess.run(
            ["git", "status", "--porcelain", "--", *rel_paths],
            cwd=workspace,
            capture_output=True,
            text=True,
            timeout=_GIT_TIMEOUT_SECONDS,
        )
        diff = subprocess.run(
            ["git", "diff", "--stat", "--", *rel_paths],
            cwd=workspace,
            capture_output=True,
            text=True,
            timeout=_GIT_TIMEOUT_SECONDS,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if status.returncode != 0 or diff.returncode != 0:
        return None
    lines: list[str] = []
    if status.stdout.strip():
        lines.append("Changed files (git status):")
        lines.extend(f"  {line}" for line in status.stdout.splitlines())
    if diff.stdout.strip():
        lines.append("Change sizes (git diff --stat):")
        diff_lines = diff.stdout.splitlines()
        lines.extend(f"  {line}" for line in diff_lines[:_MAX_DIFF_LINES])
        if len(diff_lines) > _MAX_DIFF_LINES:
            lines.append(f"  ... ({len(diff_lines) - _MAX_DIFF_LINES} more lines)")
    return lines


def _file_list(resolved: list[Path], workspace: Path) -> list[str]:
    """The edited files with line counts, for a workspace without git."""
    lines = ["Edited files:"]
    for path in resolved[:_MAX_FILES_LISTED]:
        rel = path.relative_to(workspace)
        try:
            count = len(path.read_text(encoding="utf-8").splitlines())
        except UnicodeDecodeError:
            lines.append(f"  {rel} (not text, line count skipped)")
        except OSError:
            lines.append(f"  {rel} (unreadable or removed)")
        else:
            lines.append(f"  {rel} ({count} lines)")
    if len(resolved) > _MAX_FILES_LISTED:
        lines.append(f"  ... ({len(resolved) - _MAX_FILES_LISTED} more files)")
    return lines


def _syntax_checks(resolved: list[Path]) -> list[str]:
    """A compile check of each edited Python file. Compiling parses
    without executing, so an untrusted file cannot run code here."""
    lines: list[str] = []
    for path in resolved:
        if path.suffix != ".py" or not path.is_file():
            continue
        try:
            source = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            lines.append(f"  {path.name}: skipped, could not be read as text")
            continue
        try:
            compile(source, str(path), "exec")
        except SyntaxError as exc:
            lines.append(f"  {path.name}: SYNTAX ERROR line {exc.lineno}: {exc.msg}")
        else:
            lines.append(f"  {path.name}: syntax ok")
    return lines


def verify_edits(edited: list[str], workspace: Path | None) -> str:
    """Build the verification report for one turn's edits.

    ``edited`` holds the raw ``path`` arguments of the turn's successful
    file mutations, in order. The report never raises: a failure to
    inspect is reported in the text, so the loop can feed it to the
    model and carry on.
    """
    lines = ["[Post-edit verification: what changed this turn]"]
    if workspace is None:
        lines.append("Workspace unknown, so no file was inspected.")
        for raw in edited[:_MAX_FILES_LISTED]:
            lines.append(f"  {raw}")
        lines.append(
            "Review the edited files above and fix any problem before calling "
            "terminate again, or call terminate if the edits are correct."
        )
        return "\n".join(lines)
    ws = workspace.resolve()
    resolved: list[Path] = []
    skipped = 0
    for raw in edited:
        path = _resolve_inside(raw, ws)
        if path is None:
            skipped += 1
        elif path not in resolved:
            resolved.append(path)
    if skipped:
        lines.append(f"{skipped} edited path(s) outside the workspace were not inspected.")
    if not resolved:
        lines.append("No edited file inside the workspace to check.")
    else:
        git_dir = ws / ".git"
        rel_paths = [path.relative_to(ws).as_posix() for path in resolved]
        git_lines = _git_summary(ws, rel_paths) if git_dir.exists() else None
        if git_lines is not None:
            if git_lines:
                lines.extend(git_lines)
            else:
                lines.append(
                    "Git reports no changes for these files (already committed or identical)."
                )
        else:
            if git_dir.exists():
                lines.append("Git inspection failed, falling back to the file list.")
            lines.extend(_file_list(resolved, ws))
        syntax = _syntax_checks(resolved)
        if syntax:
            lines.append("Syntax checks (Python):")
            lines.extend(syntax)
    lines.append(
        "Review the report above and fix any problem before calling terminate "
        "again, or call terminate if the edits are correct."
    )
    return "\n".join(lines)
