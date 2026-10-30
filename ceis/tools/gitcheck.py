"""Git inspection and rollback, and structured command checks.

Both tools are thin wrappers over the shell tool's machinery, not new
executors: the same scrubbed environment, timeouts, output caps and
sandbox. The git tool builds its argument list itself and never runs a
shell, so a file name or a ref cannot smuggle in a second command. The
check tool runs one shell command through the shell tool itself, and its
assessment is the shell tool's assessment with the name changed, so a
command that would ask as ``shell`` asks as ``check`` too: there is no
approval bypass in either direction.

What the git tool refuses on purpose: remotes (no push, fetch or pull),
branch checkouts, ``reset --hard`` and ``clean``. Rollback here means
``restore`` of named files and ``stash`` with ``stash pop``: changes set
aside can come back, changes restored cannot, and the approval card says
which one is happening.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from ceis.sandbox import Sandbox
from ceis.schema import RiskLevel, ToolResult
from ceis.tools.base import BaseTool, CallAssessment, number_arg
from ceis.tools.shell import Shell, run_argv

_GIT_ACTIONS = ("status", "diff", "log", "stash", "stash_pop", "restore")
_READ_ACTIONS = ("status", "diff", "log")
# A ref is one name, not a range and not an option: letters, digits, slash,
# dot, underscore, dash, starting with a letter or digit. Anything else is
# refused before git ever sees it.
_REF = re.compile(r"[A-Za-z0-9][A-Za-z0-9/._-]*")

# Lines that say a command failed, across the runners this tool is for:
# pytest ("FAILED tests/x.py::test_y"), Go ("FAIL\tpkg"), a Python traceback,
# an exception line ("ValueError: ..."), a compiler diagnostic
# ("x.c:3: error: ...", "x.ts(1,1): error TS2307"), a marked test line.
_FAILURE_PATTERNS = [
    re.compile(r"FAILED"),
    re.compile(r"^FAIL[ \t]"),
    re.compile(r"Traceback \(most recent call last\)"),
    re.compile(r"\b[A-Za-z_]*Error:"),
    re.compile(r": error[ :]"),
    re.compile(r"^[✕✖]"),
]
_MAX_FAILURE_LINES = 30


def failure_lines(text: str) -> list[str]:
    """The lines of command output that look like failures, in order, capped."""
    found: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if any(pattern.search(stripped) for pattern in _FAILURE_PATTERNS):
            if stripped not in found:
                found.append(stripped)
            if len(found) >= _MAX_FAILURE_LINES:
                break
    return found


class Git(BaseTool):
    name: str = "git"
    description: str = (
        "Inspect and roll back the workspace repository. Use status to see what changed, "
        "diff to see the changes, log for recent commits, stash to set changes aside, "
        "stash_pop to bring them back, and restore to discard changes to named files. "
        "Never touches remotes, never switches branches."
    )
    parameters: dict[str, Any] = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": list(_GIT_ACTIONS),
                "description": (
                    "status, diff, log, stash, stash_pop or restore. restore needs a path; "
                    "restore discards changes, stash sets them aside."
                ),
            },
            "path": {
                "type": "string",
                "description": "A file or directory inside the workspace, to limit the action to.",
            },
            "ref": {
                "type": "string",
                "description": "One commit, tag or branch for diff or log, e.g. HEAD~1. No ranges.",
            },
            "staged": {
                "type": "boolean",
                "description": "For diff: compare the staged changes. For restore: unstage instead of discarding.",
            },
            "message": {"type": "string", "description": "The stash message for stash."},
            "timeout": {"type": "number", "description": "Seconds (default 60, max 600)."},
        },
        "required": ["action"],
    }
    risk: RiskLevel = RiskLevel.SENSITIVE
    workspace: Path
    sandbox: Sandbox | None = None

    def _resolve_path(self, path: str | None) -> tuple[Path | None, str | None]:
        """The path as git wants it (relative to the workspace), or an error message."""
        if path is None or not str(path).strip():
            return None, None
        candidate = (self.workspace / str(path)).resolve()
        root = self.workspace.resolve()
        if candidate != root and root not in candidate.parents:
            return None, f"path {path} is outside the workspace"
        if not candidate.exists():
            return None, f"path {path} does not exist in the workspace"
        return candidate.relative_to(root), None

    def _argv(self, action: str, rel: Path | None, ref: str | None, staged: bool,
              message: str | None) -> tuple[list[str] | None, str | None]:
        """The git argument list for an action, or an error message when refused."""
        if action not in _GIT_ACTIONS:
            return None, f"unknown git action {action}; use one of {', '.join(_GIT_ACTIONS)}"
        if ref is not None:
            ref = str(ref).strip()
            if not _REF.fullmatch(ref) or ".." in ref:
                return None, f"ref {ref} is not a single plain ref"
        path_args = ["--", str(rel)] if rel is not None else []
        if action == "status":
            return ["git", "status", "--porcelain=v1", "--branch", *path_args], None
        if action == "diff":
            argv = ["git", "diff"]
            if staged:
                argv.append("--cached")
            if ref:
                argv.append(ref)
            return [*argv, *path_args], None
        if action == "log":
            argv = ["git", "log", "--oneline", "-20"]
            if ref:
                argv.append(ref)
            return [*argv, *path_args], None
        if action == "stash":
            argv = ["git", "stash", "push"]
            if message:
                argv += ["-m", str(message)]
            return [*argv, *path_args], None
        if action == "stash_pop":
            return ["git", "stash", "pop"], None
        # restore
        if rel is None:
            return None, "restore needs a path: it discards changes to named files only"
        argv = ["git", "restore"]
        if staged:
            argv.append("--staged")
        return [*argv, *path_args], None

    def assess(self, args: dict[str, Any]) -> CallAssessment:
        action = str(args.get("action", ""))
        path = str(args.get("path", "") or "")
        summary = f"git.{action}" + (f" {path}" if path else "")
        if action in _READ_ACTIONS:
            # Reads inside the workspace are safe, like file reads: the
            # workspace is the agent's own working material.
            return CallAssessment(risk=RiskLevel.SAFE, summary=summary)
        warnings = {
            "stash": ["moves uncommitted changes off the working tree"],
            "stash_pop": ["puts stashed changes back onto the working tree"],
            "restore": [f"discards uncommitted changes to {path or 'the working tree'}"],
        }.get(action, [f"changes the working tree (git.{action})"])
        # A warning is never waved through, not even in auto mode, and
        # earns a once-only grant: a destructive git action always asks.
        return CallAssessment(risk=RiskLevel.SENSITIVE, summary=summary, warnings=warnings)

    async def execute(
        self,
        action: str = "",
        path: str | None = None,
        ref: str | None = None,
        staged: bool = False,
        message: str | None = None,
        timeout: float = 60,
        **_: Any,
    ) -> ToolResult:
        self.workspace.mkdir(parents=True, exist_ok=True)
        rel, error = self._resolve_path(path)
        if error is not None:
            return ToolResult.fail(error)
        argv, error = self._argv(str(action), rel, ref, bool(staged), message)
        if error is not None:
            return ToolResult.fail(error)
        assert argv is not None
        result = await run_argv(
            argv,
            self.workspace,
            number_arg(timeout, 60, 1.0, 600.0),
            sandbox=self.sandbox,
        )
        if not result.ok and "not a git repository" in (result.output + (result.error or "")):
            return ToolResult.fail("the workspace is not a git repository")
        if not result.ok:
            return result
        text = result.output
        if action == "status":
            branch, entries = "", []
            for line in text.splitlines():
                if line.startswith("## "):
                    branch = line[3:].split("...")[0]
                elif len(line) > 3:
                    entries.append({"status": line[:2], "path": line[3:]})
            if not entries:
                text = "working tree clean"
            result.data = {"branch": branch, "entries": entries[:200]}
        elif action == "diff":
            files = []
            for line in text.splitlines():
                if line.startswith("diff --git "):
                    parts = line.split(" ")
                    if len(parts) >= 4 and parts[3].startswith("b/"):
                        files.append(parts[3][2:])
            if not text.strip():
                text = "no changes"
            result.data = {"files": files}
        elif action == "log":
            commits = []
            for line in text.splitlines():
                if " " in line:
                    head, subject = line.split(" ", 1)
                    commits.append({"hash": head, "subject": subject})
            result.data = {"commits": commits}
        else:
            result.data = {"action": action, "path": str(rel) if rel is not None else None}
        result.output = text
        return result


class Check(BaseTool):
    name: str = "check"
    description: str = (
        "Run a test, lint, type-check or build command in the workspace and get a "
        "structured result: the exit code, the wall time, and the lines that look like "
        "failures. Same sandbox, timeout and approval rules as shell."
    )
    parameters: dict[str, Any] = {
        "type": "object",
        "properties": {
            "command": {"type": "string"},
            "timeout": {"type": "number", "description": "Seconds (default 60, max 600)."},
            "network": {
                "type": "boolean",
                "description": (
                    "Set when the command needs the network and that is not obvious from "
                    "what it runs (curl, pip, git … and URLs are recognised on their own)."
                ),
            },
        },
        "required": ["command"],
    }
    risk: RiskLevel = RiskLevel.SENSITIVE
    egress: bool = True
    workspace: Path
    sandbox: Sandbox | None = None

    def _shell(self) -> Shell:
        return Shell(workspace=self.workspace, sandbox=self.sandbox)

    def assess(self, args: dict[str, Any]) -> CallAssessment:
        # The shell tool's assessment, with the name changed: a command
        # that would ask as shell asks as check, with the same target,
        # warnings and network treatment. Nothing here re-decides risk.
        assessment = self._shell().assess(args)
        summary = assessment.summary
        if summary.startswith("shell"):
            summary = "check" + summary[len("shell"):]
        return assessment.model_copy(update={"summary": summary})

    async def execute(
        self, command: str = "", timeout: float = 60, network: bool = False, **_: Any
    ) -> ToolResult:
        if not str(command).strip():
            return ToolResult.fail("empty command")
        result = await self._shell().execute(
            command=command, timeout=timeout, network=network
        )
        failures = failure_lines(result.output)
        data = dict(result.data)
        data["failures"] = failures
        data["passed"] = result.exit_code == 0
        result.data = data
        if result.exit_code == 0:
            result.output = result.output + "\n[check: passed]"
        elif failures:
            result.output = (
                result.output + f"\n[check: {len(failures)} failure lines]\n" + "\n".join(failures)
            )
        else:
            result.output = result.output + "\n[check: failed]"
        return result


__all__ = ["Check", "Git", "failure_lines"]
