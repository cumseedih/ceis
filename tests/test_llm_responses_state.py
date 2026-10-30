"""Responses state reuse: ``previous_response_id`` chaining, the fresh fallback,
and the untouched behaviour of the stateless clients."""

from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any

import httpx
import openai
import pytest

from wevvy.agent import MuseAgent
from wevvy.config import Settings
from wevvy.goals import GoalStore
from wevvy.llm.base import BaseLLM, ResponseStateRejected
from wevvy.llm.mock import MockLLM
from wevvy.llm.openai_chat import OpenAIChatLLM
from wevvy.llm.openai_responses import OpenAIResponsesLLM
from wevvy.memory import MemoryStore
from wevvy.schema import Function, LLMResponse, Message, Role, ToolCall, ToolResult
from wevvy.sentinel import AuditLog, Sentinel
from wevvy.tools import Terminate, ToolCollection
from wevvy.tools.base import BaseTool
from wevvy.ui import HeadlessUI


def _bad_request(message: str) -> openai.BadRequestError:
    request = httpx.Request("POST", "https://example.invalid/responses")
    return openai.BadRequestError(message, response=httpx.Response(400, request=request), body=None)


def _response(
    resp_id: str, text: str | None = None, calls: list[tuple[str, str, str]] | None = None
) -> SimpleNamespace:
    items: list[SimpleNamespace] = []
    if text is not None:
        items.append(
            SimpleNamespace(
                type="message", content=[SimpleNamespace(type="output_text", text=text)]
            )
        )
    for call_id, name, args in calls or []:
        items.append(
            SimpleNamespace(type="function_call", call_id=call_id, name=name, arguments=args)
        )
    return SimpleNamespace(
        output=items,
        id=resp_id,
        usage=None,
        status="completed",
        incomplete_details=None,
        model="test-model",
    )


class _FakeCreate:
    """A stand-in for an SDK ``create`` method: records kwargs, then answers from
    a script of responses or exceptions."""

    def __init__(self, replies: list[Any]):
        self.seen: list[dict[str, Any]] = []
        self.replies = list(replies)

    async def create(self, **kwargs: Any) -> Any:
        self.seen.append(kwargs)
        item = self.replies.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def _responses_llm(settings: Settings) -> tuple[OpenAIResponsesLLM, _FakeCreate]:
    llm = OpenAIResponsesLLM(settings.llm)
    fake = _FakeCreate([])
    llm.client = SimpleNamespace(responses=SimpleNamespace(create=fake.create))  # type: ignore[attr-defined]
    return llm, fake


def _completion(text: str) -> SimpleNamespace:
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=text, tool_calls=None, reasoning_content=None),
                finish_reason="stop",
            )
        ],
        usage=None,
        model="test-model",
    )


def _chat_llm(settings: Settings) -> tuple[OpenAIChatLLM, _FakeCreate]:
    llm = OpenAIChatLLM(settings.llm)
    fake = _FakeCreate([])
    llm.client = SimpleNamespace(  # type: ignore[attr-defined]
        chat=SimpleNamespace(completions=SimpleNamespace(create=fake.create))
    )
    return llm, fake


async def test_first_call_sends_instructions_and_no_previous_id(settings: Settings) -> None:
    llm, fake = _responses_llm(settings)
    fake.replies.append(_response("resp_1", text="hi"))
    resp = await llm.ask(
        [Message.system("SYS"), Message.user("hello")],
        tools=[{"type": "function", "function": {"name": "add", "parameters": {}}}],
    )
    assert resp.response_id == "resp_1"
    assert len(fake.seen) == 1
    params = fake.seen[0]
    assert "previous_response_id" not in params
    assert params["instructions"] == "SYS"
    assert params["input"] == [{"role": "user", "content": "hello"}]
    assert params["tools"][0]["name"] == "add"


async def test_chained_call_sends_delta_only_and_no_instructions(settings: Settings) -> None:
    llm, fake = _responses_llm(settings)
    fake.replies.append(_response("resp_2", text="done"))
    resp = await llm.ask(
        [Message.tool("5", "call_1", "add")],
        tools=[{"type": "function", "function": {"name": "add", "parameters": {}}}],
        previous_response_id="resp_1",
    )
    assert resp.response_id == "resp_2"
    params = fake.seen[0]
    assert params["previous_response_id"] == "resp_1"
    assert "instructions" not in params
    assert params["input"] == [{"type": "function_call_output", "call_id": "call_1", "output": "5"}]
    # tools are per request, not stored, so they still go on a chained call
    assert params["tools"][0]["name"] == "add"


async def test_chained_bad_request_becomes_state_rejected(settings: Settings) -> None:
    llm, fake = _responses_llm(settings)
    fake.replies.append(_bad_request("previous_response_id is unknown"))
    with pytest.raises(ResponseStateRejected):
        await llm.ask([Message.user("hi")], previous_response_id="resp_1")


async def test_unchained_bad_request_still_propagates(settings: Settings) -> None:
    llm, fake = _responses_llm(settings)
    fake.replies.append(_bad_request("model not found"))
    with pytest.raises(openai.BadRequestError):
        await llm.ask([Message.user("hi")])


async def test_chat_client_ignores_previous_response_id(settings: Settings) -> None:
    llm, fake = _chat_llm(settings)
    fake.replies.append(_completion("ok"))
    resp = await llm.ask([Message.user("hi")], previous_response_id="resp_9")
    assert resp.content == "ok"
    assert "previous_response_id" not in fake.seen[0]


class _Adder(BaseTool):
    name: str = "add"
    description: str = "add two numbers"
    parameters: dict[str, Any] = {
        "type": "object",
        "properties": {"a": {"type": "number"}, "b": {"type": "number"}},
    }

    async def execute(self, a: float = 0, b: float = 0, **_: Any) -> ToolResult:
        return ToolResult(output=str(a + b))


def _tc(name: str, **args: Any) -> ToolCall:
    return ToolCall(function=Function(name=name, arguments=json.dumps(args)))


def _make_agent(settings: Settings, llm: BaseLLM) -> MuseAgent:
    ui = HeadlessUI()
    memory = MemoryStore(settings.memory_db)
    goals = GoalStore(settings.goals_db)
    tools = ToolCollection(Terminate(), _Adder())
    audit = AuditLog(settings.audit_file)
    sentinel = Sentinel(settings.sentinel, audit, ui)
    return MuseAgent(settings, llm, tools, sentinel, ui, audit, memory=memory, goals=goals)


class _StatefulFakeLLM(BaseLLM):
    """A Responses-shaped fake: records every call and answers from a script,
    optionally rejecting any chained call the way a provider would."""

    name = "stateful_fake"
    supports_response_state = True

    def __init__(self, script: list[LLMResponse], reject_chained: bool = False):
        self.script = list(script)
        self.reject_chained = reject_chained
        self.calls: list[dict[str, Any]] = []

    async def ask(
        self,
        messages: list[Message],
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str = "auto",
        on_delta: Any = None,
        max_tokens: int | None = None,
        previous_response_id: str | None = None,
    ) -> LLMResponse:
        self.calls.append(
            {
                "messages": list(messages),
                "tools": tools,
                "previous_response_id": previous_response_id,
            }
        )
        if self.reject_chained and previous_response_id is not None:
            raise ResponseStateRejected("provider rejected previous_response_id")
        return self.script.pop(0)


async def test_second_step_chains_onto_first_response(settings: Settings) -> None:
    script = [
        LLMResponse(
            content="Let me add.",
            tool_calls=[_tc("add", a=2, b=3)],
            response_id="resp_1",
        ),
        LLMResponse(
            tool_calls=[_tc("terminate", status="success", summary="2+3=5")],
            response_id="resp_2",
        ),
    ]
    llm = _StatefulFakeLLM(script)
    agent = _make_agent(settings, llm)
    assert await agent.run("what is 2+3?") == "2+3=5"
    assert len(llm.calls) == 2
    first, second = llm.calls
    assert first["previous_response_id"] is None
    assert first["messages"][0].role == Role.SYSTEM
    assert second["previous_response_id"] == "resp_1"
    # the second call carries only what is new: the tool result, no system
    # prompt, no original question, no re-sent history
    assert [m.role for m in second["messages"]] == [Role.TOOL]
    assert second["messages"][0].content == "5"
    # the stable prefix (the tool schemas) is the same object on both calls
    assert second["tools"] is first["tools"]


async def test_rejected_chain_falls_back_to_a_fresh_call(settings: Settings) -> None:
    script = [
        LLMResponse(
            content="Let me add.",
            tool_calls=[_tc("add", a=2, b=3)],
            response_id="resp_1",
        ),
        LLMResponse(
            tool_calls=[_tc("terminate", status="success", summary="2+3=5")],
            response_id="resp_2",
        ),
    ]
    llm = _StatefulFakeLLM(script, reject_chained=True)
    agent = _make_agent(settings, llm)
    assert await agent.run("what is 2+3?") == "2+3=5"
    assert len(llm.calls) == 3
    first, chained, fresh = llm.calls
    assert chained["previous_response_id"] == "resp_1"
    assert fresh["previous_response_id"] is None
    # the fresh retry re-sends the stable prefix byte for byte, plus the tool
    # result the chained call would have carried
    assert fresh["messages"][0].role == Role.SYSTEM
    assert fresh["messages"][0].content == first["messages"][0].content
    assert fresh["tools"] is first["tools"]
    tool_msgs = [m for m in fresh["messages"] if m.role == Role.TOOL]
    assert tool_msgs and tool_msgs[0].content == "5"


async def test_missing_response_id_ends_chaining(settings: Settings) -> None:
    script = [
        LLMResponse(tool_calls=[_tc("add", a=2, b=3)], response_id="resp_1"),
        LLMResponse(tool_calls=[_tc("add", a=4, b=5)]),
        LLMResponse(tool_calls=[_tc("terminate", status="success", summary="done")]),
    ]
    llm = _StatefulFakeLLM(script)
    agent = _make_agent(settings, llm)
    assert await agent.run("add twice") == "done"
    assert len(llm.calls) == 3
    assert llm.calls[1]["previous_response_id"] == "resp_1"
    # the second response carried no id, so the third call starts fresh again
    assert llm.calls[2]["previous_response_id"] is None
    assert llm.calls[2]["messages"][0].role == Role.SYSTEM


async def test_stateless_client_never_gets_a_previous_id(settings: Settings) -> None:
    script = [
        LLMResponse(content="Let me add.", tool_calls=[_tc("add", a=2, b=3)]),
        LLMResponse(tool_calls=[_tc("terminate", status="success", summary="2+3=5")]),
    ]
    llm = MockLLM(script)
    agent = _make_agent(settings, llm)
    assert await agent.run("what is 2+3?") == "2+3=5"
    assert len(llm.calls) == 2
    assert all(c["previous_response_id"] is None for c in llm.calls)
    # and the stateless path still re-sends the full context, as before
    assert llm.calls[1]["messages"][0].role == Role.SYSTEM
