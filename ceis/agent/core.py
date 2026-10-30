"""The agent loop: think (LLM) → act (tools through the Sentinel) → repeat."""

from __future__ import annotations

import asyncio
import json
import time
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from ceis import prompts
from ceis.agent.verify import MUTATING_FILE_ACTIONS, verify_edits
from ceis.calendar import CalendarFeeds
from ceis.config import Settings
from ceis.contacts import ContactBook
from ceis.goals import GoalStore
from ceis.llm import session as llm_session
from ceis.llm.base import BaseLLM, DeltaCallback, ResponseStateRejected
from ceis.llm.routing import Route, route_request
from ceis.llm.vision import keep_newest_images
from ceis.logger import logger
from ceis.memory import MemoryItem, MemoryStore
from ceis.runtime import device
from ceis.schema import AgentState, Attachment, LLMResponse, Message, Role, ToolCall, ToolResult
from ceis.sentinel import AuditLog, Sentinel
from ceis.sentinel.gate import current_task
from ceis.sentinel.grants import grant_key
from ceis.sentinel.policy import Decision
from ceis.skills import SkillLibrary
from ceis.tools.base import BaseTool, ToolCollection
from ceis.ui import UI

# Tool calls one step may run side by side: pure reads only, keyed by tool
# name to the actions that never change anything (None means the whole tool
# is a read: memory recall, and web search against the owner-configured
# provider). Everything else, mutating calls, approval-gated calls, network
# calls to a model-chosen host, MCP and device tools, and calls the loop does
# not recognise, runs one at a time, in the model's order, after the reads.
# The map grows only when a tool's actions have been audited as side-effect
# free; a tool absent here is sequential by default, never concurrent.
READ_ONLY_CALLS: dict[str, frozenset[str] | None] = {
    "files": frozenset({"read", "list", "search", "grep", "symbols"}),
    "recall": None,
    "web_search": None,
}


def _model_id(llm: BaseLLM) -> str:
    """A debuggable id for a client: its configured model, else its class.

    Adapters wrap the real client (``PromptToolAdapter.inner``), so the
    lookup follows one such link; a client with no model setting, like
    the test mock, reads as its class name.
    """
    seen: set[int] = set()
    current: BaseLLM | None = llm
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        settings = getattr(current, "settings", None)
        model = getattr(settings, "model", None)
        if isinstance(model, str) and model:
            return model
        current = getattr(current, "inner", None)
    return type(llm).__name__


class Incoming:
    """A user message on its way to the agent: the text, what was attached to it, the
    language of the client's screens (a BCP-47 tag, "" when the client did not say), and,
    for *Use ceis Cloud this time*, the model client this one turn runs on (``llm``)
    and its id (``model``); None and "" for a turn on the configured model."""

    __slots__ = ("files", "language", "llm", "model", "text")

    def __init__(
        self,
        text: str,
        files: list[Attachment] | None = None,
        language: str = "",
        llm: BaseLLM | None = None,
        model: str = "",
    ):
        self.text = text
        self.files = files or []
        self.language = language
        self.llm = llm
        self.model = model


class MuseAgent:
    def __init__(
        self,
        settings: Settings,
        llm: BaseLLM,
        tools: ToolCollection,
        sentinel: Sentinel,
        ui: UI,
        audit: AuditLog,
        memory: MemoryStore | None = None,
        goals: GoalStore | None = None,
        calendar: CalendarFeeds | None = None,
        contacts: ContactBook | None = None,
        skills: SkillLibrary | None = None,
        session_file: Path | None = None,
        conversation_id: str | None = None,
        fast_llm: BaseLLM | None = None,
    ):
        self.settings = settings
        self.llm = llm
        # The client routing compares against: the configured model. The
        # service worker swaps ``self.llm`` for one turn for an explicit
        # per-turn client ("Use ceis Cloud this time"); that swap, not the
        # router, decides such a turn, and routing never overrides it.
        self._configured_llm = llm
        # The fast slot for opt-in routing ([routing]); None when routing
        # is off or no fast slot is configured, and the loop then behaves
        # exactly as before.
        self.fast_llm = fast_llm
        self.tools = tools
        self.sentinel = sentinel
        self.ui = ui
        self.audit = audit
        self.memory = memory
        self.goals = goals
        self.calendar = calendar
        self.contacts = contacts
        self.skills = skills
        self.session_file = session_file
        # The conversation (thread) this agent is; approvals "for this conversation" are
        # bound to it and last as long as it does. Without one, each run stands alone.
        self.conversation_id = conversation_id
        # The id model calls carry for a vendor that wants one per conversation (OpenCode Go):
        # the thread's, else one of this agent's own for as long as it lives.
        self.session_id = conversation_id or llm_session.new_fallback()
        self.messages: list[Message] = []
        self.state = AgentState.IDLE
        self.turns = 0
        # Optional queue of user messages that arrive *while* a run is in progress (the app
        # lets you interrupt or pile on requests). They are folded into the conversation
        # before the next model call instead of waiting for the current run to finish.
        self.inbox: asyncio.Queue[str | Incoming] | None = None
        self._told_no_vision = False
        # The language of the screens the person reads this conversation on, from the latest
        # message that said (a BCP-47 tag); the language rule names it ahead of the script
        # of one message. "" means no client has said, and the script decides.
        self.ui_language = ""
        # Words for this conversation alone, read when the system prompt is built (the first
        # conversation's phase, ceis/server/firstrun.py); None or "" adds nothing.
        self.prompt_addendum: Callable[[], str] | None = None

    def _drain_inbox(self) -> int:
        if self.inbox is None:
            return 0
        count = 0
        while not self.inbox.empty():
            try:
                item = self.inbox.get_nowait()
            except asyncio.QueueEmpty:  # pragma: no cover
                break
            incoming = item if isinstance(item, Incoming) else Incoming(item)
            if incoming.language:
                self.ui_language = incoming.language
            self.messages.append(self.user_message(incoming.text, incoming.files))
            self.audit.record("user_message", content=incoming.text, interjected=True)
            count += 1
        return count

    def user_message(self, text: str, files: list[Attachment] | None = None) -> Message:
        """The user's message as the model gets it: the text, a line per attached file
        (path and what it is), and the pictures as images when the model takes them."""
        if not files:
            return Message.user(text)
        lines = [f"- {a.path} ({a.describe()})" for a in files]
        note = "[Attached files]\n" + "\n".join(lines)
        if any(a.kind != "image" for a in files):
            note += "\nRead them with `files` action=read."
        content = f"{text}\n\n{note}" if text.strip() else note
        workspace = Path(self.settings.agent.workspace).expanduser()
        images = [str(workspace / a.path) for a in files if a.kind == "image"]
        return Message.user(content, images=images or None)

    # ------------------------------------------------------------------ prompt
    def sandbox_note(self) -> str:
        """How commands run, from the shell tool's sandbox (the tools own it)."""
        shell = self.tools.get("shell")
        box = getattr(shell, "sandbox", None)
        if box is not None and box.active:
            note = box.describe().replace("Commands run", "Commands (shell, python_execute) run")
            if box.blocks_network:
                note += (
                    " Commands that need the network say so by what they run (curl, pip, git, a "
                    "URL, a script that imports requests …); otherwise pass network=true."
                )
            return note
        return "Commands (shell, python_execute) run in the workspace with a scrubbed environment."

    def skills_section(self) -> str:
        """The index of skills — names and descriptions; the tool has the instructions."""
        lib = self.skills
        if lib is None or "skills" not in self.tools:
            return ""
        index = lib.index()
        if not index:
            return ""
        return prompts.SKILLS_SECTION.format(items=index)

    def phone_section(self) -> str:
        """The phone, when GUI operation is on: connected or not, and what is on it."""
        task = self.tools.get("phone_task")
        link = getattr(task, "link", None)
        if task is None or link is None:
            return ""
        device = link.device
        if device is None:
            status = (
                "- GUI operation is on, but no phone is connected right now: the `phone_*` tools "
                "will fail until the user opens the ceis app on the phone (or the MobileGym "
                "module). Say so if a step needs the phone."
            )
        else:
            apps = device.app_list()
            status = f"- The user's phone is connected: {device.name} ({device.platform})."
            if apps:
                status += f" Apps on it: {apps}."
        return prompts.PHONE_SECTION.format(status=status)

    def device_section(self) -> str:
        """The phone this runs on, when its capabilities are there as `device__*` tools."""
        from ceis.runtime import DEVICE_PREFIX

        names = sorted(
            t.name[len(DEVICE_PREFIX) :] for t in self.tools if t.name.startswith(DEVICE_PREFIX)
        )
        if not names:
            return ""
        return prompts.DEVICE_SECTION.format(tools=", ".join(names))

    def computer_section(self) -> str:
        """This computer's screen, when the hands are on: available or not, and what is in front.
        On a computer with the hands off, one line saying where the switch is — so a request
        for a desktop application gets the way to it, not a shrug."""
        task = self.tools.get("computer_task")
        link = getattr(task, "link", None)
        if task is None or link is None:
            if device() is None and not self.settings.hands.enabled:
                return prompts.COMPUTER_OFF_SECTION
            return ""
        status = link.status() if hasattr(link, "status") else {}
        if not status.get("available", True):
            reason = status.get("reason") or "no backend"
            status_line = (
                "- The hands are turned on, but they cannot drive this computer right now "
                f"({reason}): the `computer_*` tools will fail. Say so if a step needs the screen."
            )
        else:
            last = link.last_screen
            status_line = (
                f"- The hands can drive this computer ({status.get('backend') or 'hands'} on "
                f"{link.device.platform}, screen {link.device.width}×{link.device.height})."
            )
            if last is not None and last.title:
                status_line += f" In front last time: {last.title}."
        return prompts.COMPUTER_SECTION.format(status=status_line)

    def devices_section(self) -> str:
        """The user's other devices, when this computer is on the hub (the `devices` tool)."""
        tool = self.tools.get("devices")
        hub = getattr(tool, "hub", None)
        if tool is None or hub is None:
            return ""
        others = hub.others()
        if not getattr(hub, "client", None) or not hub.client.connected.is_set():
            status = (
                "- This computer is not connected to the ceis hub right now, so the other "
                "devices cannot be reached; say so if a step needs one."
            )
        elif not others:
            status = (
                f"- This computer is on the hub as “{hub.device_name}”; no other device of the "
                "user's has joined yet."
            )
        else:
            listed = ", ".join(
                f"{d.get('name')} ({d.get('kind') or 'device'}, "
                f"{'online' if d.get('online') else 'offline'})"
                for d in others
            )
            status = f"- This computer is “{hub.device_name}”. Other devices: {listed}."
        return prompts.DEVICES_SECTION.format(status=status)

    def contacts_note(self) -> str:
        """One line on the address book, when there is one (the tool does the looking up)."""
        book = self.contacts
        if book is None or "contacts" not in self.tools or not book.configured:
            return ""
        n = len(book)
        return (
            f"- Address book: {n} {'person' if n == 1 else 'people'}; look someone up with "
            "`contacts` before writing to them; never guess an address\n"
        )

    async def recall_for(self, user_input: str) -> list[MemoryItem] | None:
        """The memories to put in the system prompt for this message — by meaning too,
        when an embedding endpoint is set up (that is the awaited part)."""
        if self.memory is None or not self.settings.memory.enabled:
            return None
        try:
            return await self.memory.relevant_async(
                user_input, limit=self.settings.memory.max_inject
            )
        except Exception as exc:  # noqa: BLE001 — recall must never stop a turn
            logger.warning("recall failed ({}); using the keyword ranking", exc)
            return self.memory.relevant(user_input, limit=self.settings.memory.max_inject)

    def language_rule(self, user_input: str) -> str:
        """The `## Language` paragraph of the system prompt. A reply language set under
        Settings wins; else the language of the client's screens when a client has said
        (``ui_language``); else the script of the message."""
        fixed = self.settings.agent.language
        if fixed not in ("", "auto"):
            return prompts.LANGUAGE_FIXED.format(language=fixed)
        detected = prompts.detect_language(user_input)
        ui = prompts.language_name(self.ui_language)
        if ui:
            return prompts.LANGUAGE_UI.format(language=ui, detected=detected)
        return prompts.LANGUAGE_AUTO.format(detected=detected)

    def build_system_prompt(
        self, user_input: str, memories_: list[MemoryItem] | None = None
    ) -> str:
        """``memories_`` is what ``recall_for`` returned; without it the keyword ranking is
        used on the spot."""
        a = self.settings.agent
        language_rule = self.language_rule(user_input)
        memories = ""
        if self.memory is not None and self.settings.memory.enabled:
            items = (
                memories_
                if memories_ is not None
                else self.memory.relevant(user_input, limit=self.settings.memory.max_inject)
            )
            if items:
                memories = prompts.MEMORY_SECTION.format(
                    items="\n".join(f"- {m.render()}" for m in items)
                )
                if self.turns <= 1:
                    memories += prompts.MEMORY_OPENING_NOTE
        goals = ""
        if self.goals is not None:
            active = self.goals.list("active")[:5]
            if active:
                lines = []
                for g in active:
                    nxt = g.next_step
                    bits = [f"progress {g.progress}"]
                    if g.category:
                        bits.append(g.category)
                    if g.due:
                        bits.append(f"due {g.due}" + (", overdue" if g.overdue else ""))
                    if nxt:
                        bits.append(f"next: {nxt.idx}. {nxt.title}")
                    if g.proposal:
                        bits.append("a plan change is awaiting the user's answer")
                    lines.append(f"- {g.id}: {g.title} ({', '.join(bits)})")
                goals = prompts.GOALS_SECTION.format(items="\n".join(lines))
        calendar = ""
        if self.calendar is not None and self.calendar.configured:
            # today and tomorrow, from the cache — the tool fetches when more is needed
            today = datetime.now(self.calendar.tz).date()
            events = self.calendar.agenda(today, 2)
            calendar = prompts.CALENDAR_SECTION.format(
                items=self.calendar.render(events, today)
                if events
                else "(nothing on the calendar today or tomorrow)"
            )
        profile = (
            prompts.USER_PROFILE_SECTION.format(profile=a.user_profile.strip())
            if a.user_profile.strip()
            else ""
        )
        extra = (
            f"\n## Additional instructions\n{a.instructions.strip()}\n"
            if a.instructions.strip()
            else ""
        )
        addendum = (self.prompt_addendum() if self.prompt_addendum is not None else "").strip()
        if addendum:
            extra += f"\n## This conversation\n{addendum}\n"
        return prompts.SYSTEM_PROMPT.format(
            name=a.name,
            language_rule=language_rule,
            now=datetime.now().astimezone().strftime("%Y-%m-%d %H:%M (%A, UTC%z)"),
            workspace=str(a.workspace.resolve()),
            sentinel_mode=self.settings.sentinel.mode,
            sandbox=self.sandbox_note(),
            contacts=self.contacts_note(),
            tool_names=", ".join(t.name for t in self.tools),
            user_profile=profile,
            memories=memories,
            goals=goals
            + calendar
            + self.device_section()
            + self.phone_section()
            + self.computer_section()
            + self.devices_section()
            + self.skills_section(),
            extra=extra,
        )

    # ------------------------------------------------------------------ context window
    def context_messages(self) -> list[Message]:
        """The window the model sees: the newest ``max_context_messages`` (never starting
        inside a tool exchange), with pictures only on the newest ``max_context_images``
        image-bearing messages — a hands session would otherwise send every screenshot of
        the run on every step (C9). Copies where a picture was dropped; the history itself
        keeps them."""
        limit = self.settings.agent.max_context_messages
        msgs = self.messages
        if len(msgs) <= limit:
            window = list(msgs)
        else:
            cutoff = len(msgs) - limit
            # Never start in the middle of a tool exchange: advance to the next user message.
            while cutoff < len(msgs) and msgs[cutoff].role != Role.USER:
                cutoff += 1
            window = list(msgs[cutoff:]) if cutoff < len(msgs) else list(msgs[-limit:])
        return keep_newest_images(window, self.settings.agent.max_context_images)

    # ------------------------------------------------------------------ stuck detection
    def _is_stuck(self) -> bool:
        assistants = [m for m in self.messages if m.role == Role.ASSISTANT][-3:]
        if len(assistants) < 3:
            return False

        def sig(m: Message) -> str:
            calls = [(tc.function.name, tc.function.arguments) for tc in (m.tool_calls or [])]
            return json.dumps([m.content, calls], ensure_ascii=False, sort_keys=True)

        return len({sig(m) for m in assistants}) == 1

    async def _ask_with_state(
        self,
        llm: BaseLLM,
        full_context: list[Message],
        delta: list[Message],
        tools: list[dict[str, Any]] | None,
        previous_response_id: str | None,
        on_delta: DeltaCallback | None,
        max_tokens: int | None = None,
    ) -> tuple[LLMResponse, str | None]:
        """One model call for a loop step, reusing server side state when possible.

        The caller only ever passes ``previous_response_id`` when the client
        supports state reuse, the system prompt is unchanged since the last call,
        and ``delta`` (the messages appended since that call) is non-empty. A
        chained call then sends just ``delta`` plus the tools, no instructions:
        the provider keeps the earlier instructions, which is the stable prefix
        a cache would want, and the history is not re-sent. When the provider
        rejects the chained call, one fresh call with the full context follows
        and the chain resumes from the fresh response. Returns the response and
        the id the next step may chain onto (None when the client or the
        response carries none, which also ends chaining for the turn).
        """
        if previous_response_id is not None:
            try:
                response = await llm.ask(
                    delta,
                    tools=tools,
                    on_delta=on_delta,
                    max_tokens=max_tokens,
                    previous_response_id=previous_response_id,
                )
                return response, response.response_id
            except ResponseStateRejected:
                logger.info(
                    "the provider rejected the chained call; retrying with the full context"
                )
        response = await llm.ask(
            full_context, tools=tools, on_delta=on_delta, max_tokens=max_tokens
        )
        return response, response.response_id

    # ------------------------------------------------------------------ tool calls
    def _call_summary(self, call: ToolCall) -> str:
        """The one-line description the loop shows for a call: the tool's own
        assessment, or a note when the arguments cannot be assessed."""
        tool = self.tools.get(call.name)
        if tool is None:
            return f"{call.name}(?)"
        if "__raw__" in call.arguments:
            raw = str(call.arguments["__raw__"])
            return f"{call.name}: arguments cut off ({len(raw)} chars)"
        try:
            return tool.assess(call.arguments).summary
        except Exception as exc:  # noqa: BLE001
            # the gate's assess will fail the same way, as a tool result
            return f"{call.name}: bad arguments ({type(exc).__name__})"

    def _approval_gated(self, call: ToolCall, tool: BaseTool) -> bool:
        """Would the Sentinel stop this call for a question? This mirrors the
        pre-execution half of Sentinel.guard (assess, policy, grant, auto-mode
        waiver) so the loop can keep approval-gated calls sequential. Guard
        itself still makes the real decision at execution time, so a grant
        that lapses between the two checks can still surface a card; this
        check can never wave a call through, only hold it back to the
        sequential path. An assessment failure also holds the call back, and
        the sequential path reports it as a tool result, as before."""
        try:
            assessment = tool.assess(call.arguments)
        except Exception:  # noqa: BLE001
            return True
        result = self.sentinel.policy.evaluate(
            tool.name, call.arguments, assessment, tainted=self.sentinel.tainted
        )
        if result.decision != Decision.ASK:
            return False
        target = assessment.target if assessment.target is not None else assessment.egress_target
        key = grant_key(tool.name, target)
        task = current_task()
        grant = (
            None
            if assessment.warnings
            else self.sentinel.grants.match(key, task.conversation_id if task else None)
        )
        if self.sentinel.settings.mode == "auto" and not (
            assessment.warnings or result.tainted_ask
        ):
            return False
        return grant is None

    def _is_concurrent_read(self, call: ToolCall, tool: BaseTool) -> bool:
        """Whether this call may run beside the step's other reads: a pure
        read from READ_ONLY_CALLS whose Sentinel decision is already settled,
        so no approval card can appear mid-batch. Reads carry no egress to a
        model-chosen host, so a concurrent read tainting the conversation
        cannot turn a batch mate into an approval-gated call: the taint rule
        only escalates egress calls."""
        if call.name not in READ_ONLY_CALLS or "__raw__" in call.arguments:
            return False
        allowed = READ_ONLY_CALLS[call.name]
        if allowed is not None and call.arguments.get("action") not in allowed:
            return False
        return not self._approval_gated(call, tool)

    async def _guarded_read(self, call: ToolCall, tool: BaseTool) -> ToolResult:
        """One concurrent read through the same Sentinel guard as a sequential
        call. A failure of the guard itself (not the tool: tools already return
        failures, never raise) becomes this call's failure result, so it can
        never cancel or corrupt the batch mates' results."""
        try:
            return await self.sentinel.guard(call, tool)
        except Exception as exc:  # noqa: BLE001
            logger.exception("concurrent read {} failed in the guard", call.name)
            return ToolResult.fail(f"{type(exc).__name__}: {exc}")

    def _progress(
        self,
        call: ToolCall,
        phase: str,
        started: float | None = None,
        ok: bool | None = None,
        elapsed_ms: float | None = None,
    ) -> None:
        """A started/finished note for one call, through the UI when it
        provides the callback. Older UIs lack it and are skipped, so
        their stream is unchanged; a failing callback never breaks the
        turn. The payload is names and timings only, never arguments
        or output."""
        fn = getattr(self.ui, "on_tool_progress", None)
        if fn is None:
            return
        if elapsed_ms is None and phase == "finished" and started is not None:
            elapsed_ms = (time.monotonic() - started) * 1000
        try:
            fn(call, phase, elapsed_ms, ok)
        except Exception:  # noqa: BLE001
            logger.exception("tool progress callback failed")

    async def _timed_read(self, call: ToolCall, tool: BaseTool) -> ToolResult:
        """A concurrent read with progress notes and a duration stamp:
        the started note fires when execution actually begins, the
        finished note carries the wall time and whether it worked."""
        started = time.monotonic()
        self._progress(call, "started", started)
        try:
            result = await self._guarded_read(call, tool)
        except BaseException:
            self._progress(call, "finished", started, ok=False)
            raise
        elapsed = (time.monotonic() - started) * 1000
        if result.duration_ms is None:
            result.duration_ms = elapsed
        self._progress(call, "finished", started, ok=result.ok, elapsed_ms=elapsed)
        return result

    async def _run_step_calls(
        self, calls: list[ToolCall], remaining: int
    ) -> tuple[list[str], str | None, bool, int, list[str]]:
        """Execute one step's tool calls. Returns the picture paths, the output
        of a stopping result (None when no call stopped the turn), whether the
        tool-call cap was hit, how many calls were dispatched, and the raw
        ``path`` arguments of the step's successful file mutations, in order.

        Every call is announced in the model's order, then the concurrent reads
        run together through asyncio.gather and the remaining calls run one at
        a time after them, still in model order. Results are reported and
        appended to the history in the model's order, even when the reads
        finish out of order, so the timeline and the model see exactly the
        sequence a sequential run would have produced. Calls past the
        remaining budget are not dispatched at all; they get a result saying
        the cap was hit, and the caller ends the turn after this step. The
        cap counts dispatched calls only: a capped call is not one, and a
        model call that makes no tool call is not one either."""
        results: list[ToolResult | None] = [None] * len(calls)
        read_tasks: dict[int, asyncio.Task[ToolResult]] = {}
        sequential: list[int] = []
        cap_hit = False
        dispatched = 0
        cap = self.settings.agent.max_tool_calls
        for i, call in enumerate(calls):
            self.ui.on_tool_call(call, self._call_summary(call))
            if dispatched >= remaining:
                results[i] = ToolResult.fail(
                    f"not run: the turn's tool-call cap (agent.max_tool_calls={cap}) "
                    "was reached, so no further tool call runs this turn."
                )
                cap_hit = True
                continue
            tool = self.tools.get(call.name)
            dispatched += 1
            if tool is not None and self._is_concurrent_read(call, tool):
                read_tasks[i] = asyncio.create_task(self._timed_read(call, tool))
            else:
                sequential.append(i)
        if read_tasks:
            outcomes = await asyncio.gather(*read_tasks.values(), return_exceptions=True)
            for (i, _), outcome in zip(read_tasks.items(), outcomes, strict=True):
                if isinstance(outcome, ToolResult):
                    results[i] = outcome
                elif isinstance(outcome, BaseException):
                    results[i] = ToolResult.fail(f"{type(outcome).__name__}: {outcome}")
        for i in sequential:
            call = calls[i]
            tool = self.tools.get(call.name)
            started = time.monotonic()
            self._progress(call, "started", started)
            if tool is None:
                results[i] = ToolResult.fail(
                    f"unknown tool '{call.name}'. Available tools: "
                    f"{', '.join(t.name for t in self.tools)}"
                )
            else:
                results[i] = await self.sentinel.guard(call, tool)
            elapsed = (time.monotonic() - started) * 1000
            result = results[i]
            assert result is not None  # filled just above
            if result.duration_ms is None:
                result.duration_ms = elapsed
            self._progress(call, "finished", started, ok=result.ok, elapsed_ms=elapsed)
        pictures: list[str] = []
        stop_output: str | None = None
        edited: list[str] = []
        for i, call in enumerate(calls):
            result = results[i]
            assert result is not None  # every index is filled above
            self.ui.on_tool_result(call, result)
            self.messages.append(Message.tool(result.for_model(), call.id, call.name))
            if result.images:
                pictures.extend(result.images)
            if result.stop:
                stop_output = result.output
            # A successful mutation is what the post-edit verification
            # reports on; a denied or failed call changed nothing, and a
            # call whose arguments were cut off carries no usable path.
            if (
                result.ok
                and call.name == "files"
                and call.arguments.get("action") in MUTATING_FILE_ACTIONS
                and isinstance(call.arguments.get("path"), str)
            ):
                edited.append(call.arguments["path"])
        return pictures, stop_output, cap_hit, dispatched, edited

    def _verification_message(self, edited: list[str]) -> str:
        """The post-edit report for the model. It never raises: when the
        report itself cannot run, the model is told so and the turn
        proceeds, so a broken check cannot stall a turn that edited
        files. The workspace comes from the files tool when the agent
        has one; without it, only the edited paths are listed."""
        files_tool = self.tools.get("files")
        workspace = getattr(files_tool, "workspace", None)
        try:
            return verify_edits(edited, Path(workspace) if workspace is not None else None)
        except Exception as exc:  # noqa: BLE001
            logger.exception("post-edit verification failed")
            return (
                "[Post-edit verification could not run "
                f"({type(exc).__name__}: {exc}). The edits above are "
                "unverified; carry on with the turn.]"
            )

    # ------------------------------------------------------------------ main loop
    def _routed_llm(
        self, user_input: str, model_hint: Literal["fast", "strong"] | None
    ) -> tuple[str, BaseLLM]:
        """The client this turn runs on, and the route name for the record.

        Precedence, in order: an explicit per-turn client (the worker's
        swap) wins over everything and records as ``"main"``; an explicit
        hint wins over the heuristics; the heuristics run only when
        routing is enabled and a fast client exists; anything else is
        ``"main"``, the configured model, exactly as before. A hint of
        ``"fast"`` with no fast client falls back to the main model
        rather than failing the turn. The chosen client is fixed for
        the whole turn: the chain state from step 2 is per-turn local,
        so no mid-turn model change can leak a chained id across
        clients, and routing looks only at the turn's opening request,
        not at messages folded in later.
        """
        if self.llm is not self._configured_llm:
            return "main", self.llm
        if model_hint == "fast" and self.fast_llm is not None:
            return "fast", self.fast_llm
        if model_hint == "strong":
            return "strong", self.llm
        if self.settings.routing.enabled and self.fast_llm is not None:
            choice: Route = route_request(user_input)
            return choice, self.fast_llm if choice == "fast" else self.llm
        return "main", self.llm

    async def run(
        self,
        user_input: str,
        purpose: str | None = None,
        files: list[Attachment] | None = None,
        language: str = "",
        model_hint: Literal["fast", "strong"] | None = None,
    ) -> str:
        """One task: a user message (or a background prompt) worked to completion.

        ``purpose`` is what approval cards show as the reason for an action; it defaults
        to the message itself. ``files`` are the attachments that came with the message.
        ``language`` is the BCP-47 tag of the client's screens when the client sent one;
        it is remembered for the conversation and names the reply language ahead of the
        script of the message. ``model_hint`` is an explicit per-turn route ("fast" or
        "strong") from a caller that knows the task's weight; it wins over the
        heuristics, and no caller sends one today. Task-scoped approvals end when this call returns.
        """
        if self.state == AgentState.RUNNING:
            raise RuntimeError("agent is already running")
        self.state = AgentState.RUNNING
        self.turns += 1
        if language:
            self.ui_language = language
        if self.skills is not None and "skills" in self.tools:
            # "/weekly-review …" — the skill's instructions ride along with the message
            user_input = self.skills.expand(user_input)
        self.messages.append(self.user_message(user_input, files))
        attached = {"files": [a.path for a in files]} if files else {}
        self.audit.record("user_message", content=user_input, **attached)
        # Per-turn model routing (opt-in, [routing]): the client is chosen
        # once, from the opening request, and held for the whole turn, so
        # the Responses chain state below can never cross clients. The
        # choice is recorded in the audit log and on every assistant
        # message of the turn, so a turn's model is always debuggable.
        route, llm = self._routed_llm(user_input, model_hint)
        model_id = _model_id(llm)
        self.audit.record("model_route", route=route, model=model_id)
        system_prompt = self.build_system_prompt(user_input, await self.recall_for(user_input))
        tool_params = self.tools.to_params()
        final: str | None = None
        step = 0
        tool_calls_used = 0
        empty_replies = 0
        # Post-edit verification for this turn: ``edited`` is the turn's
        # successful file mutations in order, ``edits_version`` counts
        # them, and ``verified_version`` is the count the last report
        # covered. A terminate (or a tool-free final reply) with an
        # unverified edit set gets the report and one more model call
        # instead of ending at once; a new edit after a report re-arms
        # it, and a terminate with nothing new to verify ends the turn.
        # The report runs at most once per edit set, so it cannot loop.
        edited: list[str] = []
        edits_version = 0
        verified_version: int | None = None
        # Responses state reuse for this turn: the stable prefix is the system
        # prompt plus the tool schemas, both built once above and byte identical
        # on every step unless the inbox drain rebuilds the prompt. ``prev_id``
        # is the chain head, ``sent_upto`` marks how far into ``self.messages``
        # the server side state reaches, and ``last_prompt`` is the instructions
        # of the last call made. A changed system prompt breaks the chain: the
        # next call is a fresh full context call. The chain state is local to
        # this turn, so a per turn model swap cannot leak ids across turns.
        # Note the behaviour change for chained turns: the provider holds the
        # full turn, so the 80 message client side window no longer trims what
        # the model sees mid turn; the local history and session file are
        # unchanged, and a rejected chain falls back to the windowed call.
        prev_id: str | None = None
        sent_upto = 0
        last_prompt: str | None = None
        task_token = self.sentinel.begin_task(
            purpose or user_input, conversation=self.conversation_id
        )
        session_token = llm_session.enter(self.session_id)
        try:
            while step < self.settings.agent.max_steps:
                step += 1
                if self._drain_inbox():
                    logger.debug("folded queued user message(s) into the running turn")
                    # the language rule and the memory section follow the latest message
                    latest = self.messages[-1].content or ""
                    system_prompt = self.build_system_prompt(latest, await self.recall_for(latest))
                context = [Message.system(system_prompt), *self.context_messages()]
                chain = (
                    llm.supports_response_state
                    and prev_id is not None
                    and system_prompt == last_prompt
                )
                delta = self.messages[sent_upto:] if chain else []
                if chain and not delta:
                    chain = False
                call_prev = prev_id if chain else None
                response, new_prev = await self._ask_with_state(
                    llm,
                    context,
                    delta,
                    tool_params,
                    call_prev,
                    on_delta=self.ui.on_text_delta,
                )
                if (
                    response.finish_reason == "length"
                    and not response.content
                    and not response.tool_calls
                ):
                    # the model thought until the budget ran out (reasoning models do on a
                    # hard step): the same call once more, with room to think and answer.
                    # The retry repeats the original call, not a chain onto the cut reply.
                    logger.info("reply cut off before it began; asking again with more room")
                    response, new_prev = await self._ask_with_state(
                        llm,
                        context,
                        delta,
                        tool_params,
                        call_prev,
                        on_delta=self.ui.on_text_delta,
                        max_tokens=llm.roomier_max_tokens(),
                    )
                prev_id = new_prev
                last_prompt = system_prompt
                if llm.vision_available is False and not self._told_no_vision:
                    if any(m.images for m in self.messages if m.role == Role.USER):
                        self._told_no_vision = True
                        self.ui.warn(
                            "This model does not take images, so the picture was described to "
                            "it by name only. It stays in the workspace; a model with vision "
                            "(Settings → Connections) would see it."
                        )
                assistant = response.to_message()
                assistant.meta.update({"step": step, "usage": response.usage, "model": model_id})
                self.messages.append(assistant)
                # The assistant message is the previous response's own output,
                # already stored server side, so the next delta starts after it.
                sent_upto = len(self.messages)
                self.ui.on_assistant_message(response.content, response.reasoning)
                self.audit.record(
                    "assistant_message",
                    step=step,
                    content=response.content or "",
                    tool_calls=[tc.function.name for tc in response.tool_calls],
                    usage=response.usage,
                )

                if not response.tool_calls:
                    if response.content:
                        if edited and verified_version != edits_version:
                            self.messages.append(Message.user(self._verification_message(edited)))
                            verified_version = edits_version
                            continue
                        final = response.content
                        break
                    empty_replies += 1
                    if empty_replies >= 2:
                        final = ""
                        break
                    self.messages.append(
                        Message.user(
                            "(Your reply was empty. Continue the task, or call `terminate` if it is done.)"
                        )
                    )
                    continue

                pictures, stop_output, cap_hit, dispatched, step_edits = await self._run_step_calls(
                    response.tool_calls,
                    self.settings.agent.max_tool_calls - tool_calls_used,
                )
                tool_calls_used += dispatched
                for path in step_edits:
                    if path not in edited:
                        edited.append(path)
                    edits_version += 1
                if stop_output is not None:
                    if edited and verified_version != edits_version:
                        self.messages.append(Message.user(self._verification_message(edited)))
                        verified_version = edits_version
                        continue
                    final = stop_output
                    break
                if cap_hit:
                    final = (
                        f"Stopped: the turn reached its tool-call cap "
                        f"({tool_calls_used} calls, agent.max_tool_calls="
                        f"{self.settings.agent.max_tool_calls}). The calls already made "
                        "are in the conversation above; the rest did not run."
                    )
                    break
                if (
                    pictures
                    and llm.vision_available is not False
                    and self.settings.llm.vision != "off"
                ):
                    # A tool result cannot carry an image, so the picture (the phone's screen)
                    # follows as a user message; models without vision get the text alone.
                    self.messages.append(
                        Message.user(
                            "[The screenshot that goes with the tool result above.]",
                            images=pictures[-2:],
                        )
                    )
                if self._is_stuck():
                    logger.warning("agent seems stuck – nudging")
                    self.messages.append(Message.user(prompts.STUCK_PROMPT))
            else:
                # Step budget exhausted: ask for a wrap-up without tools. Chained
                # when the chain is intact, so the wrap-up also skips re-sending
                # the history; the delta carries the last tool results plus the
                # wrap-up prompt itself. An unverified edit set is reported
                # first, so the wrap-up can speak to it; the wrap-up call
                # itself is the last model call either way.
                if edited and verified_version != edits_version:
                    self.messages.append(Message.user(self._verification_message(edited)))
                    verified_version = edits_version
                self.messages.append(Message.user(prompts.MAX_STEPS_PROMPT))
                context = [Message.system(system_prompt), *self.context_messages()]
                chain = (
                    llm.supports_response_state
                    and prev_id is not None
                    and system_prompt == last_prompt
                )
                delta = self.messages[sent_upto:] if chain else []
                if chain and not delta:
                    chain = False
                response, _ = await self._ask_with_state(
                    llm,
                    context,
                    delta,
                    None,
                    prev_id if chain else None,
                    on_delta=self.ui.on_text_delta,
                )
                self.messages.append(response.to_message())
                self.ui.on_assistant_message(response.content, response.reasoning)
                final = response.content or "(step limit reached)"
            self.state = AgentState.FINISHED
        except Exception:
            self.state = AgentState.ERROR
            raise
        finally:
            llm_session.leave(session_token)
            self.sentinel.end_task(task_token)
            self._save_session()
        return final or ""

    # ------------------------------------------------------------------ session persistence
    def reset(self) -> None:
        self.messages.clear()
        # only this conversation: the taint of the chats running beside this one is theirs
        self.sentinel.untaint(self.conversation_id or "")
        self.state = AgentState.IDLE

    def _save_session(self) -> None:
        if not self.session_file:
            return
        try:
            self.session_file.parent.mkdir(parents=True, exist_ok=True)
            data: dict[str, Any] = {
                "saved_at": datetime.now().astimezone().isoformat(timespec="seconds"),
                "turns": self.turns,
                "messages": [m.model_dump(mode="json") for m in self.messages],
            }
            self.session_file.write_text(json.dumps(data, ensure_ascii=False, indent=1), "utf-8")
        except OSError as exc:  # pragma: no cover
            logger.warning("could not save session: {}", exc)

    def load_session(self, path: Path) -> int:
        data = json.loads(Path(path).read_text("utf-8"))
        self.messages = [Message.model_validate(m) for m in data.get("messages", [])]
        self.turns = int(data.get("turns", 0))
        self._repair_dangling_tool_calls()
        return len(self.messages)

    def _repair_dangling_tool_calls(self) -> None:
        """A restart in the middle of a tool call (say, while an approval was pending)
        leaves an assistant message whose tool calls have no results. Providers reject
        that history outright, so give every orphan a result that says what happened."""
        repaired: list[Message] = []
        i = 0
        while i < len(self.messages):
            msg = self.messages[i]
            repaired.append(msg)
            i += 1
            if msg.role != Role.ASSISTANT or not msg.tool_calls:
                continue
            answered: set[str] = set()
            while i < len(self.messages) and self.messages[i].role == Role.TOOL:
                repaired.append(self.messages[i])
                answered.add(self.messages[i].tool_call_id or "")
                i += 1
            for call in msg.tool_calls:
                if call.id not in answered:
                    repaired.append(
                        Message.tool(
                            "(no result: the app was restarted before this call finished)",
                            call.id,
                            call.function.name,
                        )
                    )
        if len(repaired) != len(self.messages):
            logger.info("repaired {} unanswered tool call(s)", len(repaired) - len(self.messages))
            self.messages = repaired


__all__ = ["MuseAgent"]
