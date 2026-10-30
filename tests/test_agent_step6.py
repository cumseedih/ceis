"""Step 6: structured tool results and progress streaming.

The new fields and events are additive: ``output`` and ``for_model()``
stay exactly what they were, the old HeadlessUI event sequence is
unchanged, and progress lives in its own list. Every test runs against
MockLLM, no network.
"""

from __future__ import annotations

import json
from typing import Any

from wevvy.agent import MuseAgent
from wevvy.config import Settings
from wevvy.llm import MockLLM
from wevvy.schema import Function, LLMResponse, ToolCall, ToolResult
from wevvy.sentinel import AuditLog, Sentinel
from wevvy.server.events import EventBus
from wevvy.server.webui import WebUI
from wevvy.tools import Terminate, ToolCollection
from wevvy.tools.base import BaseTool
from wevvy.tools.shell import Shell
from wevvy.ui import HeadlessUI


def tc(name: str, **args: Any) -> ToolCall:
    return ToolCall(function=Function(name=name, arguments=json.dumps(args)))


def terminate(summary: str) -> ToolCall:
    return tc("terminate", status="success", summary=summary)


class FakeFiles(BaseTool):
    """A stand-in for the files tool: reads return content, "bad" fails."""

    name: str = "files"
    description: str = "fake files tool for step 6 tests"
    parameters: dict[str, Any] = {
        "type": "object",
        "properties": {
            "action": {"type": "string"},
            "path": {"type": "string"},
        },
    }

    async def execute(self, action: str = "", path: str = "", **_: Any) -> ToolResult:
        if path == "bad":
            return ToolResult.fail("boom")
        return ToolResult(output=f"{path}-content")


class RecordingUI(HeadlessUI):
    """HeadlessUI that also keeps the raw results, so the test can read
    the structured fields the loop stamped on them."""

    def __init__(self) -> None:
        super().__init__()
        self.results: list[ToolResult] = []

    def on_tool_result(self, call: ToolCall, result: ToolResult) -> None:
        self.results.append(result)
        super().on_tool_result(call, result)


def make_agent(settings: Settings, script: list, extra_tools: list, ui: HeadlessUI | None = None):
    ui = ui or RecordingUI()
    tools = ToolCollection(Terminate(), *extra_tools)
    audit = AuditLog(settings.audit_file)
    sentinel = Sentinel(settings.sentinel, audit, ui)
    llm = MockLLM(script)
    agent = MuseAgent(settings, llm, tools, sentinel, ui, audit)
    return agent, ui


async def test_shell_result_carries_exit_code_and_duration(tmp_path):  # type: ignore[no-untyped-def]
    shell = Shell(workspace=tmp_path)
    ok = await shell.execute(command="echo hi")
    assert ok.output == "hi\n\n[exit code 0]"
    assert ok.exit_code == 0
    assert ok.error is None
    assert ok.duration_ms is not None and ok.duration_ms >= 0
    assert ok.data["stdout_bytes"] >= 2
    assert ok.data["truncated"] is False
    assert ok.for_model() == ok.output

    bad = await shell.execute(command="exit 3")
    assert bad.output == "[exit code 3]"
    assert bad.error == "exit code 3"
    assert bad.exit_code == 3
    assert bad.duration_ms is not None and bad.duration_ms >= 0
    assert bad.for_model() == "Error: exit code 3"


async def test_progress_events_fire_in_started_finished_order(settings: Settings):
    script = [
        LLMResponse(tool_calls=[tc("files", action="read", path="a")]),
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    agent, ui = make_agent(settings, script, [FakeFiles()])
    assert isinstance(ui, RecordingUI)
    assert await agent.run("read one file") == "done"
    files_progress = [p for p in ui.progress if p[1] == "files"]
    assert [p[0] for p in files_progress] == ["started", "finished"]
    started, finished = files_progress
    assert started[2] is None and started[3] is None
    assert finished[2] is not None and finished[2] >= 0
    assert finished[3] is True
    # Every started event in the turn is followed by its finished event.
    phases = [p[0] for p in ui.progress]
    assert phases == ["started", "finished"] * (len(phases) // 2)
    # The loop stamps a duration even on a tool that sets none itself.
    assert ui.results[0].duration_ms is not None and ui.results[0].duration_ms >= 0
    assert ui.results[0].exit_code is None


async def test_old_consumers_see_unchanged_output_and_events(settings: Settings):
    script = [
        LLMResponse(tool_calls=[tc("files", action="read", path="a")]),
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    agent, ui = make_agent(settings, script, [FakeFiles()])
    assert await agent.run("read one file") == "done"
    tool_kinds = [kind for kind, _ in ui.events if kind.startswith("tool_")]
    assert tool_kinds == ["tool_call", "tool_result", "tool_call", "tool_result"]
    assert not any(kind == "tool_progress" for kind, _ in ui.events)
    # A result built the old way carries no structured values at all.
    plain = ToolResult(output="hello")
    assert plain.exit_code is None
    assert plain.duration_ms is None
    assert plain.data == {}
    assert plain.for_model() == "hello"


async def test_failing_tool_yields_structured_error_fields(settings: Settings):
    script = [
        LLMResponse(tool_calls=[tc("files", action="read", path="bad")]),
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    agent, ui = make_agent(settings, script, [FakeFiles()])
    assert isinstance(ui, RecordingUI)
    assert await agent.run("read a failing file") == "done"
    result = ui.results[0]
    assert result.error == "boom"
    assert result.duration_ms is not None and result.duration_ms >= 0
    # A failure the tool did not measure gets no invented exit code.
    assert result.exit_code is None
    finished = [p for p in ui.progress if p[1] == "files" and p[0] == "finished"]
    assert len(finished) == 1 and finished[0][3] is False
    # And a plain failure result leaves the structured fields unset.
    assert ToolResult.fail("boom").exit_code is None
    assert ToolResult.fail("boom").duration_ms is None


def test_webui_publishes_tool_progress_without_touching_timeline(tmp_path):  # type: ignore[no-untyped-def]
    bus = EventBus()
    queue = bus.subscribe()
    webui = WebUI(bus, lambda _t: None, workspace=tmp_path)
    call = tc("shell", command="sleep 600")
    webui.on_tool_progress(call, "started", None, None)
    webui.on_tool_progress(call, "finished", 12.5, True)
    messages = [queue.get_nowait() for _ in range(2)]
    assert messages[0]["kind"] == "tool_progress"
    assert messages[0]["tool"] == "shell"
    assert messages[0]["phase"] == "started"
    assert "elapsed_ms" not in messages[0]
    assert "args" not in messages[0] and "output" not in messages[0]
    assert messages[1]["phase"] == "finished"
    assert messages[1]["elapsed_ms"] == 12.5
    assert messages[1]["ok"] is True


async def test_progress_callback_failure_never_breaks_the_turn(settings: Settings):
    class BrokenUI(RecordingUI):
        def on_tool_progress(self, call, phase, elapsed_ms, ok):  # type: ignore[no-untyped-def]
            raise RuntimeError("progress listener crashed")

    script = [
        LLMResponse(tool_calls=[tc("files", action="read", path="a")]),
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    agent, ui = make_agent(settings, script, [FakeFiles()], ui=BrokenUI())
    assert await agent.run("read one file") == "done"
    assert ui.results[0].output == "a-content"
