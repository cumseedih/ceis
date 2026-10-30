"""Step 3: concurrent read-only tool calls and the per-turn tool-call cap.

The concurrency proof uses an ordering harness, not wall-clock timing: a
blocked read must let a second read start while it is still blocked, which
a sequential loop can never do. Every test runs against MockLLM, no network.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

from pydantic import PrivateAttr

from wevvy.agent import MuseAgent
from wevvy.config import Settings
from wevvy.llm import MockLLM
from wevvy.schema import Function, LLMResponse, ToolCall, ToolResult
from wevvy.sentinel import AuditLog, Sentinel
from wevvy.tools import Terminate, ToolCollection
from wevvy.tools.base import BaseTool
from wevvy.tools.files import Files
from wevvy.ui import HeadlessUI


def tc(name: str, **args: Any) -> ToolCall:
    return ToolCall(function=Function(name=name, arguments=json.dumps(args)))


def terminate(summary: str) -> ToolCall:
    return tc("terminate", status="success", summary=summary)


class FakeFiles(BaseTool):
    """A stand-in for the files tool: reads and writes that record their
    order, so the tests can see which call ran when. Paths pick the
    behaviour: "block" waits for ``release``, "slow" sleeps, "bad" fails."""

    name: str = "files"
    description: str = "fake files tool for step 3 tests"
    parameters: dict[str, Any] = {
        "type": "object",
        "properties": {
            "action": {"type": "string"},
            "path": {"type": "string"},
        },
    }

    _events: list[str] = PrivateAttr(default_factory=list)
    _release: asyncio.Event | None = PrivateAttr(default=None)

    def __init__(self, events: list[str], release: asyncio.Event | None = None, **kwargs: Any):
        super().__init__(**kwargs)
        self._events = events
        self._release = release

    @property
    def events(self) -> list[str]:
        return self._events

    async def execute(self, action: str = "", path: str = "", **_: Any) -> ToolResult:
        if action in ("read", "list", "search", "grep", "symbols"):
            self._events.append(f"start {path}")
            if path == "block":
                assert self._release is not None
                await self._release.wait()
                self._events.append("end block")
                return ToolResult(output="block-content")
            if path == "slow":
                await asyncio.sleep(0.05)
                self._events.append("end slow")
                return ToolResult(output="slow-content")
            if path == "bad":
                return ToolResult.fail("boom")
            return ToolResult(output=f"{path}-content")
        self._events.append(f"start {action}")
        return ToolResult(output=f"{action}-done")


def make_agent(settings: Settings, script: list, extra_tools: list, ui: HeadlessUI | None = None):
    ui = ui or HeadlessUI()
    tools = ToolCollection(Terminate(), *extra_tools)
    audit = AuditLog(settings.audit_file)
    sentinel = Sentinel(settings.sentinel, audit, ui)
    llm = MockLLM(script)
    agent = MuseAgent(settings, llm, tools, sentinel, ui, audit)
    return agent, llm, ui


async def _wait_for(predicate: object, timeout: float = 2.0) -> None:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        if predicate():  # type: ignore[operator]
            return
        await asyncio.sleep(0.01)
    raise AssertionError("timed out waiting for the expected event")


def _tool_contents(agent: MuseAgent) -> list[str]:
    """Tool results in history order, excluding the terminate call's own
    result (the loop appends one for every call, terminate included)."""
    from wevvy.schema import Role

    return [
        m.content or "" for m in agent.messages if m.role == Role.TOOL and m.name != "terminate"
    ]


async def test_two_reads_run_concurrently(settings: Settings):
    events: list[str] = []
    release = asyncio.Event()
    files = FakeFiles(events, release)
    script = [
        LLMResponse(
            tool_calls=[
                tc("files", action="read", path="block"),
                tc("files", action="read", path="free"),
            ]
        ),
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    agent, _, _ = make_agent(settings, script, [files])
    task = asyncio.create_task(agent.run("read two files"))
    try:
        # The free read starts while the blocked read is still waiting: a
        # sequential loop could never produce this ordering.
        await _wait_for(lambda: "start free" in events)
        assert "end block" not in events
        release.set()
        assert await task == "done"
    finally:
        if not task.done():
            release.set()
            await task
    assert _tool_contents(agent) == ["block-content", "free-content"]


async def test_mutating_call_runs_after_reads_but_results_stay_in_order(settings: Settings):
    events: list[str] = []
    files = FakeFiles(events)
    script = [
        LLMResponse(
            tool_calls=[
                tc("files", action="write", path="out.txt"),
                tc("files", action="read", path="slow"),
            ]
        ),
        LLMResponse(tool_calls=[terminate("done")]),
        # Step 4: the first terminate is intercepted for the post-edit
        # verification report, so the script needs one more terminate
        # for the turn to end.
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    agent, _, _ = make_agent(settings, script, [files])
    assert await agent.run("write then read") == "done"
    # The read completes before the write starts, even though the model
    # listed the write first: reads run first, mutations after them.
    assert events.index("end slow") < events.index("start write")
    # But the model sees the results in the order it asked for them.
    assert _tool_contents(agent) == ["write-done", "slow-content"]


async def test_failing_read_does_not_lose_other_results(settings: Settings):
    events: list[str] = []
    files = FakeFiles(events)
    script = [
        LLMResponse(
            tool_calls=[
                tc("files", action="read", path="bad"),
                tc("files", action="read", path="ok"),
                tc("files", action="write", path="out.txt"),
            ]
        ),
        LLMResponse(tool_calls=[terminate("done")]),
        # Step 4: the first terminate is intercepted for the post-edit
        # verification report, so the script needs one more terminate
        # for the turn to end.
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    agent, _, _ = make_agent(settings, script, [files])
    assert await agent.run("one read fails") == "done"
    contents = _tool_contents(agent)
    assert "boom" in contents[0]
    assert contents[1] == "ok-content"
    assert contents[2] == "write-done"


async def test_cap_stops_turn_with_cap_message(settings: Settings):
    settings.agent.max_tool_calls = 2
    events: list[str] = []
    files = FakeFiles(events)
    script = [
        LLMResponse(tool_calls=[tc("files", action="read", path="a")]),
        LLMResponse(
            tool_calls=[
                tc("files", action="read", path="b"),
                tc("files", action="read", path="c"),
            ]
        ),
        LLMResponse(tool_calls=[terminate("should never run")]),
    ]
    agent, llm, _ = make_agent(settings, script, [files])
    final = await agent.run("read a lot")
    assert "tool-call cap" in final
    assert "max_tool_calls=2" in final
    # Exactly two calls executed, across both steps; the third was capped.
    assert files.events == ["start a", "start b"]
    contents = _tool_contents(agent)
    assert contents[0] == "a-content"
    assert contents[1] == "b-content"
    assert "not run" in contents[2] and "tool-call cap" in contents[2]
    # The turn ended on the cap: the model was never asked again.
    assert len(llm.calls) == 2


async def test_single_call_step_behaves_as_before(settings: Settings):
    events: list[str] = []
    files = FakeFiles(events)
    script = [
        LLMResponse(tool_calls=[tc("files", action="write", path="out.txt")]),
        LLMResponse(tool_calls=[terminate("done")]),
        # Step 4: the first terminate is intercepted for the post-edit
        # verification report, so the script needs one more terminate
        # for the turn to end.
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    agent, _, ui = make_agent(settings, script, [files])
    assert await agent.run("one write") == "done"
    tool_kinds = [kind for kind, _ in ui.events if kind.startswith("tool_")]
    # Step 4 adds the intercepted terminate's pair: write, first
    # terminate (intercepted for verification), second terminate.
    assert tool_kinds == [
        "tool_call",
        "tool_result",
        "tool_call",
        "tool_result",
        "tool_call",
        "tool_result",
    ]
    assert _tool_contents(agent) == ["write-done"]


class BlockingApprovalUI(HeadlessUI):
    """Records approval requests; the first one blocks until released, so a
    test can tell whether a second gated call was started concurrently."""

    def __init__(self) -> None:
        super().__init__(approve=True)
        self.requests: list[str] = []
        self.release = asyncio.Event()

    async def ask_approval(self, request):  # type: ignore[no-untyped-def]
        self.requests.append(request.summary)
        if len(self.requests) == 1:
            await self.release.wait()
        return await super().ask_approval(request)


async def test_approval_gated_reads_stay_sequential(settings: Settings, tmp_path):  # type: ignore[no-untyped-def]
    settings.sentinel.mode = "strict"
    workspace = tmp_path / "workspace"
    workspace.mkdir(exist_ok=True)
    outside_a = str(tmp_path / "outside-a.txt")
    outside_b = str(tmp_path / "outside-b.txt")
    files = Files(workspace=workspace)
    script = [
        LLMResponse(
            tool_calls=[
                tc("files", action="read", path=outside_a),
                tc("files", action="read", path=outside_b),
            ]
        ),
        LLMResponse(tool_calls=[terminate("done")]),
    ]
    ui = BlockingApprovalUI()
    agent, _, _ = make_agent(settings, script, [files], ui=ui)
    task = asyncio.create_task(agent.run("read outside the workspace"))
    try:
        await _wait_for(lambda: len(ui.requests) == 1)
        await asyncio.sleep(0.1)
        # The second gated read has not even asked yet: it waits for the
        # first call's approval to resolve.
        assert len(ui.requests) == 1
        ui.release.set()
        assert await task == "done"
    finally:
        if not task.done():
            ui.release.set()
            await task
    assert len(ui.requests) == 2
    assert len(_tool_contents(agent)) == 2
