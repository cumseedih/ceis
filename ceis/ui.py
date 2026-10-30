"""User-interface abstraction.

The agent core never prints. It talks to a :class:`UI` implementation which the
CLI (rich console), tests (headless) or future web/chat front-ends provide.
"""

from __future__ import annotations

from typing import Any, Literal, Protocol

from pydantic import BaseModel, Field

from ceis.schema import RiskLevel, ToolCall, ToolResult

ApprovalScope = Literal["once", "conversation", "session", "24h", "always"]


def _once() -> list[ApprovalScope]:
    return ["once"]


class ApprovalRequest(BaseModel):
    tool: str
    args: dict[str, Any]
    summary: str
    risk: RiskLevel
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    egress_target: str | None = None
    # What the user asked for, so the card can say why this action is happening.
    purpose: str = ""
    # What a standing permission would be bound to (host, recipient, program); None = the tool.
    target: str | None = None
    grant_key: str = ""
    # Scopes the Sentinel is willing to grant for this call, in display order.
    grant_options: list[ApprovalScope] = Field(default_factory=_once)


class ApprovalDecision(BaseModel):
    approved: bool
    scope: ApprovalScope = "once"
    reason: str = ""


class UI(Protocol):
    def on_text_delta(self, text: str) -> None: ...
    def on_assistant_message(self, content: str | None, reasoning: str | None) -> None: ...
    def on_tool_call(self, call: ToolCall, summary: str) -> None: ...
    def on_tool_result(self, call: ToolCall, result: ToolResult) -> None: ...
    def on_tool_progress(
        self,
        call: ToolCall,
        phase: Literal["started", "finished"],
        elapsed_ms: float | None,
        ok: bool | None,
    ) -> None:
        """A tool call started or finished, with its wall time so far.

        Optional: the loop calls it only when the UI provides it, so an
        older implementation that lacks it keeps working unchanged. The
        payload carries names and timings only, never arguments, output
        or file contents."""
        ...

    def on_sentinel(self, decision: str, summary: str, reasons: list[str]) -> None: ...
    def info(self, message: str) -> None: ...
    def warn(self, message: str) -> None: ...
    async def ask_approval(self, request: ApprovalRequest) -> ApprovalDecision: ...
    async def ask_user(self, question: str) -> str: ...


class HeadlessUI:
    """No-interaction UI for tests, scripts and unattended runs."""

    def __init__(self, approve: bool = True, user_answer: str = "", verbose: bool = False):
        self.approve = approve
        self.user_answer = user_answer
        self.verbose = verbose
        self.events: list[tuple[str, Any]] = []
        # Tool progress lives apart from ``events`` on purpose: the old
        # event sequence stays exactly what it was, and a test or client
        # that reads only it never sees a new kind interleaved.
        self.progress: list[tuple[str, str, float | None, bool | None]] = []

    def _log(self, kind: str, payload: Any) -> None:
        self.events.append((kind, payload))
        if self.verbose:
            print(f"[{kind}] {payload}")

    def on_tool_progress(
        self,
        call: ToolCall,
        phase: str,
        elapsed_ms: float | None,
        ok: bool | None,
    ) -> None:
        self.progress.append((phase, call.name, elapsed_ms, ok))
        if self.verbose:
            print(f"[tool_progress] {phase} {call.name} {elapsed_ms} {ok}")

    def on_text_delta(self, text: str) -> None:
        pass

    def on_assistant_message(self, content: str | None, reasoning: str | None) -> None:
        self._log("assistant", content)

    def on_tool_call(self, call: ToolCall, summary: str) -> None:
        self._log("tool_call", summary)

    def on_tool_result(self, call: ToolCall, result: ToolResult) -> None:
        self._log("tool_result", result.for_model(500))

    def on_sentinel(self, decision: str, summary: str, reasons: list[str]) -> None:
        self._log("sentinel", f"{decision}: {summary} {reasons}")

    def info(self, message: str) -> None:
        self._log("info", message)

    def warn(self, message: str) -> None:
        self._log("warn", message)

    async def ask_approval(self, request: ApprovalRequest) -> ApprovalDecision:
        self._log("approval", request.summary)
        return ApprovalDecision(approved=self.approve, reason="headless")

    async def ask_user(self, question: str) -> str:
        self._log("ask_user", question)
        return self.user_answer


__all__ = ["UI", "HeadlessUI", "ApprovalRequest", "ApprovalDecision", "ApprovalScope"]
