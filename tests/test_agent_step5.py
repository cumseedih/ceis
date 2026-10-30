"""Step 5: config-driven model routing (audit bottleneck 8)."""

from __future__ import annotations

import json
from pathlib import Path

from ceis.agent import MuseAgent
from ceis.config import LLMSettings, RoutingSettings, Settings, load_settings
from ceis.goals import GoalStore
from ceis.llm import MockLLM
from ceis.llm.routing import route_request
from ceis.memory import MemoryStore
from ceis.schema import LLMResponse
from ceis.sentinel import AuditLog, Sentinel
from ceis.tools import Goals, Remember, Terminate, ToolCollection
from ceis.ui import HeadlessUI


def make_routed_agent(settings, main_script, fast_script, *, enabled=True, with_fast=True):
    ui = HeadlessUI()
    memory = MemoryStore(settings.memory_db)
    goals = GoalStore(settings.goals_db)
    tools = ToolCollection(Terminate(), Remember(store=memory), Goals(store=goals))
    audit = AuditLog(settings.audit_file)
    sentinel = Sentinel(settings.sentinel, audit, ui)
    main = MockLLM(main_script)
    fast = MockLLM(fast_script) if with_fast else None
    settings.routing.enabled = enabled
    agent = MuseAgent(
        settings, main, tools, sentinel, ui, audit, memory=memory, goals=goals, fast_llm=fast
    )
    return agent, main, fast


def route_records(settings):
    path = Path(settings.audit_file)
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text("utf-8").splitlines() if line.strip()]


def recorded_route(settings):
    return [e for e in route_records(settings) if e.get("event") == "model_route"]


async def test_simple_request_routes_fast(settings: Settings):
    agent, main, fast = make_routed_agent(
        settings, [LLMResponse(content="main answer")], [LLMResponse(content="4")]
    )
    assert await agent.run("what is 2+3?") == "4"
    assert len(fast.calls) == 1
    assert main.calls == []
    routes = recorded_route(settings)
    assert len(routes) == 1 and routes[0]["route"] == "fast"
    assistant = [m for m in agent.messages if m.role == "assistant"][0]
    assert assistant.meta["model"] == "MockLLM"


async def test_complex_request_routes_strong(settings: Settings):
    agent, main, fast = make_routed_agent(
        settings,
        [LLMResponse(content="fixed")],
        [LLMResponse(content="fast answer")],
    )
    assert (
        await agent.run("Fix the crash in the Android build and refactor the failing tests")
        == "fixed"
    )
    assert len(main.calls) == 1
    assert fast.calls == []
    routes = recorded_route(settings)
    assert len(routes) == 1 and routes[0]["route"] == "strong"


async def test_explicit_hint_wins_over_heuristics(settings: Settings):
    agent, main, fast = make_routed_agent(
        settings, [LLMResponse(content="main answer")], [LLMResponse(content="fast answer")]
    )
    assert await agent.run("what is 2+3?", model_hint="strong") == "main answer"
    assert len(main.calls) == 1 and fast.calls == []

    agent, main, fast = make_routed_agent(
        settings, [LLMResponse(content="main answer")], [LLMResponse(content="fast answer")]
    )
    assert await agent.run("Fix the crash in the Android build", model_hint="fast") == "fast answer"
    assert len(fast.calls) == 1 and main.calls == []


async def test_routing_off_keeps_main_model(settings: Settings):
    agent, main, fast = make_routed_agent(
        settings,
        [LLMResponse(content="main answer")],
        [LLMResponse(content="fast answer")],
        enabled=False,
    )
    assert (
        await agent.run("Fix the crash in the Android build and refactor the failing tests")
        == "main answer"
    )
    assert len(main.calls) == 1 and fast.calls == []
    assert recorded_route(settings)[0]["route"] == "main"


async def test_unconfigured_fast_slot_keeps_main_model(settings: Settings):
    agent, main, fast = make_routed_agent(
        settings, [LLMResponse(content="main answer")], [], with_fast=False
    )
    assert await agent.run("what is 2+3?") == "main answer"
    assert len(main.calls) == 1
    assert recorded_route(settings)[0]["route"] == "main"


async def test_explicit_client_wins_over_routing(settings: Settings):
    agent, main, fast = make_routed_agent(
        settings, [LLMResponse(content="main answer")], [LLMResponse(content="fast answer")]
    )
    override = MockLLM([LLMResponse(content="override answer")])
    agent.llm = override  # the service worker's per-turn swap
    assert await agent.run("what is 2+3?") == "override answer"
    assert len(override.calls) == 1 and main.calls == [] and fast.calls == []
    assert recorded_route(settings)[0]["route"] == "main"


def test_router_is_deterministic_and_shape_based():
    assert route_request("what is 2+3?") == "fast"
    assert route_request("Fix the Android build") == "strong"
    assert route_request("please review this pull request") == "strong"
    assert route_request("x" * 700) == "strong"
    assert route_request("") == "fast"
    assert route_request("hi", hint="bogus") == "fast"  # unknown hints are ignored
    assert route_request("hi", hint="strong") == "strong"
    assert route_request("Fix the Android build", hint="fast") == "fast"
    first = route_request("Fix the crash in the Android build and refactor the failing tests")
    assert all(
        route_request("Fix the crash in the Android build and refactor the failing tests") == first
        for _ in range(5)
    )


def test_routing_config_defaults_and_toml(tmp_path: Path):
    assert Settings().routing.enabled is False
    assert Settings().routing.fast is None
    assert RoutingSettings(enabled=True, fast=LLMSettings(model="tiny")).fast.model == "tiny"
    toml_path = tmp_path / "config.toml"
    toml_path.write_text(
        '[routing]\nenabled = true\n[routing.fast]\nmodel = "tiny-model"\n', "utf-8"
    )
    loaded = load_settings(toml_path)
    assert loaded.routing.enabled is True
    assert loaded.routing.fast is not None and loaded.routing.fast.model == "tiny-model"
