"""Step 4: post-edit verification before termination is accepted.

A turn that edited files gets one verification report fed back to the
model when it first tries to end, and ends on the next attempt, unless
a new edit re-arms the report. A turn with no edits ends exactly as
before, and a verification that cannot run never blocks termination.
Every test runs against MockLLM, no network.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from ceis.agent import MuseAgent
from ceis.agent.verify import verify_edits
from ceis.config import Settings
from ceis.llm import MockLLM
from ceis.schema import Function, LLMResponse, Role, ToolCall
from ceis.sentinel import AuditLog, Sentinel
from ceis.tools import Terminate, ToolCollection
from ceis.tools.files import Files
from ceis.ui import HeadlessUI


def tc(name: str, **args: Any) -> ToolCall:
    return ToolCall(function=Function(name=name, arguments=json.dumps(args)))


def terminate(summary: str) -> ToolCall:
    return tc("terminate", status="success", summary=summary)


def make_agent(settings: Settings, script: list, files: Files):
    ui = HeadlessUI()
    tools = ToolCollection(Terminate(), files)
    audit = AuditLog(settings.audit_file)
    sentinel = Sentinel(settings.sentinel, audit, ui)
    llm = MockLLM(script)
    agent = MuseAgent(settings, llm, tools, sentinel, ui, audit)
    return agent, llm


def verification_messages(agent: MuseAgent) -> list[str]:
    return [
        m.content or ""
        for m in agent.messages
        if m.role == Role.USER and (m.content or "").startswith("[Post-edit verification")
    ]


def git(*args: str, cwd: Path) -> None:
    subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
        env={
            "PATH": "/usr/bin:/bin",
            "GIT_AUTHOR_NAME": "test",
            "GIT_AUTHOR_EMAIL": "test@example.com",
            "GIT_COMMITTER_NAME": "test",
            "GIT_COMMITTER_EMAIL": "test@example.com",
        },
    )


async def test_edit_gets_verification_before_termination(settings: Settings, tmp_path):  # type: ignore[no-untyped-def]
    workspace = tmp_path / "ws"
    workspace.mkdir()
    target = workspace / "a.py"
    target.write_text("x = 1\n", encoding="utf-8")
    git("init", "-q", cwd=workspace)
    git("add", "a.py", cwd=workspace)
    git("commit", "-q", "-m", "initial", cwd=workspace)
    files = Files(workspace=workspace)
    script = [
        LLMResponse(
            tool_calls=[
                tc("files", action="edit", path="a.py", old_text="x = 1\n", new_text="x = 2\n")
            ]
        ),
        LLMResponse(tool_calls=[terminate("done")]),
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    agent, llm = make_agent(settings, script, files)
    assert await agent.run("bump x") == "done"
    # The first terminate was intercepted: the model was called a third
    # time, after the verification report, and only then ended the turn.
    assert len(llm.calls) == 3
    reports = verification_messages(agent)
    assert len(reports) == 1
    assert "a.py" in reports[0]
    assert "1 file changed" in reports[0]
    assert "syntax ok" in reports[0]
    assert target.read_text(encoding="utf-8") == "x = 2\n"


async def test_tool_free_reply_after_edit_gets_one_verification(settings: Settings, tmp_path):  # type: ignore[no-untyped-def]
    workspace = tmp_path / "ws"
    workspace.mkdir()
    (workspace / "b.py").write_text("y = 1\n", encoding="utf-8")
    files = Files(workspace=workspace)
    script = [
        LLMResponse(
            tool_calls=[
                tc("files", action="edit", path="b.py", old_text="y = 1\n", new_text="y = 2\n")
            ]
        ),
        LLMResponse(content="all done"),
        LLMResponse(content="all done"),
    ]
    agent, llm = make_agent(settings, script, files)
    assert await agent.run("bump y") == "all done"
    assert len(llm.calls) == 3
    reports = verification_messages(agent)
    assert len(reports) == 1
    # No git repo here, so the report lists the file with its line count.
    assert "b.py" in reports[0]
    assert "1 lines" in reports[0]


async def test_new_edit_after_verification_re_arms(settings: Settings, tmp_path):  # type: ignore[no-untyped-def]
    workspace = tmp_path / "ws"
    workspace.mkdir()
    (workspace / "a.py").write_text("a = 1\n", encoding="utf-8")
    (workspace / "b.py").write_text("b = 1\n", encoding="utf-8")
    files = Files(workspace=workspace)
    script = [
        LLMResponse(
            tool_calls=[
                tc("files", action="edit", path="a.py", old_text="a = 1\n", new_text="a = 2\n")
            ]
        ),
        LLMResponse(tool_calls=[terminate("first try")]),
        LLMResponse(
            tool_calls=[
                tc("files", action="edit", path="b.py", old_text="b = 1\n", new_text="b = 2\n")
            ]
        ),
        LLMResponse(tool_calls=[terminate("second try")]),
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    agent, _ = make_agent(settings, script, files)
    assert await agent.run("bump both") == "done"
    reports = verification_messages(agent)
    assert len(reports) == 2
    assert "a.py" in reports[0]
    assert "b.py" in reports[1]


async def test_no_edits_terminates_as_before(settings: Settings, tmp_path):  # type: ignore[no-untyped-def]
    workspace = tmp_path / "ws"
    workspace.mkdir()
    (workspace / "a.py").write_text("x = 1\n", encoding="utf-8")
    files = Files(workspace=workspace)
    script = [
        LLMResponse(tool_calls=[tc("files", action="read", path="a.py")]),
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    agent, llm = make_agent(settings, script, files)
    assert await agent.run("just look") == "done"
    assert len(llm.calls) == 2
    assert verification_messages(agent) == []


async def test_verification_failure_does_not_block_termination(
    settings: Settings, tmp_path, monkeypatch
):  # type: ignore[no-untyped-def]
    workspace = tmp_path / "ws"
    workspace.mkdir()
    (workspace / "a.py").write_text("x = 1\n", encoding="utf-8")
    files = Files(workspace=workspace)

    def _boom(edited: list[str], ws: Path | None) -> str:
        raise RuntimeError("boom")

    monkeypatch.setattr("ceis.agent.core.verify_edits", _boom)
    script = [
        LLMResponse(
            tool_calls=[
                tc("files", action="edit", path="a.py", old_text="x = 1\n", new_text="x = 2\n")
            ]
        ),
        LLMResponse(tool_calls=[terminate("done")]),
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    agent, llm = make_agent(settings, script, files)
    assert await agent.run("bump x") == "done"
    assert len(llm.calls) == 3
    reports = verification_messages(agent)
    assert len(reports) == 1
    assert "could not run" in reports[0]


def test_verify_edits_reports_syntax_error(tmp_path):  # type: ignore[no-untyped-def]
    workspace = tmp_path / "ws"
    workspace.mkdir()
    (workspace / "broken.py").write_text("def f(:\n", encoding="utf-8")
    report = verify_edits(["broken.py"], workspace)
    assert "broken.py" in report
    assert "SYNTAX ERROR" in report


def test_verify_edits_never_reads_outside_the_workspace(tmp_path):  # type: ignore[no-untyped-def]
    workspace = tmp_path / "ws"
    workspace.mkdir()
    outside = tmp_path / "secret.txt"
    outside.write_text("distinctive-secret-content", encoding="utf-8")
    report = verify_edits([str(outside)], workspace)
    assert "not inspected" in report
    assert "distinctive-secret-content" not in report


def test_verify_edits_falls_back_when_git_fails(tmp_path, monkeypatch):  # type: ignore[no-untyped-def]
    workspace = tmp_path / "ws"
    workspace.mkdir()
    (workspace / ".git").mkdir()
    (workspace / "a.py").write_text("x = 1\nx = 2\n", encoding="utf-8")

    def _fail(*args: Any, **kwargs: Any) -> Any:
        raise OSError("no git here")

    monkeypatch.setattr("ceis.agent.verify.subprocess.run", _fail)
    report = verify_edits(["a.py"], workspace)
    assert "Git inspection failed" in report
    assert "a.py (2 lines)" in report


def test_verify_edits_without_workspace_lists_paths_only(tmp_path):  # type: ignore[no-untyped-def]
    report = verify_edits(["a.py"], None)
    assert "Workspace unknown" in report
    assert "a.py" in report
