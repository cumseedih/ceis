# Architecture: agent reply and motion on Android

Maps `recon.md` onto the code that exists. No new stack, no schema, no routes: the state already lives in the chat view model, `SessionActivityTracker` and the scheduled-task store. Date: 2026-11-01.

## What exists (survey)

| area | where | state today |
| --- | --- | --- |
| Transcript model | `ChatFlatItems.kt` `buildFlatChatItems`, rendered by the `when (item)` in `ChatScreen.kt` (about lines 3624 to 3830) | one `FlatChatItem` per markdown block, tool call, thinking block |
| Agent text | `NmAssistantBubble` in `io/github/ceis/ui/chat/NmHomeChrome.kt` wraps each markdown block | grey received bubble, 70 percent max width, tail on the last block |
| Tool call row | `ToolCallPill(nmCompact = true)` in `ChatAssistantMessageUI.kt` | capsule chip with typed icon, title, duration, stop button; running state sweeps a white band over the capsule (2.8 s); tap opens `ToolDetailSheet` through `viewModel.openToolDetail` |
| Thinking | `ThinkingBlock(nmQuiet = true)` | already one quiet line |
| Scroll follow | `ChatScreen.kt`: `isNearBottom`, `userScrolledAway`, `contentOverflows`, long documented anti-drift logic | works; not to be rewritten |
| Scroll buttons | `FilledIconButton` pair near line 4119 and 4162 | down button is an ink disc, appears and disappears with no animation |
| Header | `home/MuseHeader.kt`, `chat/NmTemplateChatHeader.kt` | no activity indicator |
| Copy and read aloud | selection toolbar, `LazyReadAloudPlayer.speak` held in `ChatScreen` | no per-reply action row |
| Running work | `SessionActivityTracker.activeSessions` (Set of session ids); `currentRunStartedAtMs` is one global stamp | no per-session start time |
| Finished background work | `ScheduledTaskStore.observe()`; each `ScheduledTask.runHistory` entry has `firedAt`, `sessionId`, `preview`, `ok`; goal checks are hidden scheduled tasks | real, durable; no duration, tokens or tool counts |
| Not present | sub-agent runs, per-task token counts | `HubTasks` is unobservable bookkeeping, so it is not used |
| Glass | `ui/glass/LiquidGlass.kt`; model picker sheet shows the window-blur pattern for a `ModalBottomSheet` | reuse as is |

## Decisions

1. **Flat reply.** `NmAssistantBubble` keeps its signature and draws no fill, no tail and no width cap; text sits on the 16 dp transcript inset. Bare `ceis-*` card blocks are unchanged. Sent bubbles and the composer capsule are untouched. (Recon: AgentReply.)
2. **ToolRow.** Restyle `ToolCallPill` under `nmCompact`: no capsule, one muted line, trailing chevron, shimmer on the label while running, diff badge for `file_edit` computed from `old_string` and `new_string` in `toolArgs`. Tap keeps opening the existing detail sheet, so no inline expansion is added inside the lazy list (the list has a long history of scroll drift bugs). Stop button, long-press menu and duration stay.
3. **Not built: one summary line for several calls** ("Ran 2 commands"). It needs a new `FlatChatItem` subtype and edits to six exhaustive `when` sites in a 7,000 line file that cannot be compiled in this environment. Recorded as `partial` in the matrix.
4. **ReplyActions.** Drawn inside the last markdown item of a settled message, so no new item type: copy (the message markdown) and read aloud (existing `LazyReadAloudPlayer`).
5. **ScrollPill.** Same gating as the existing down button; new look (neutral surface, hairline, ink arrow) and a 150 ms fade, decided by a pure `ScrollPillPolicy`.
6. **HeaderActivity.** A ring beside the header's trailing button, shown while `SessionActivityTracker.activeSessions` is not empty. Static when the system animator scale is zero.
7. **Running tasks.** Link above the composer (not under the last reply, to leave the list alone) and a `ModalBottomSheet` in the window-blur glass pattern. Running rows come from `activeSessions` with real start times (two small `// ceis:` edits in `SessionActivityTracker`); finished rows come from scheduled-task run history. Rows show what is known (title, kind, time, ok or failed) and nothing invented. "View transcript" opens the chat. Load more pages the real list.

## Files

New, in `io.github.ceis.ui.chat` unless noted: `AgentReplyParts.kt` (ReplyActions, ScrollPill, HeaderActivityRing, shimmer brush), `ScrollPillPolicy.kt` (pure), `BackgroundTasks.kt` (pure model, grouping, paging, diff stat), `BackgroundTasksSheet.kt` (UI and data feed); `io.github.ceis.ui.theme.CeisMotion`. Edited: `NmHomeChrome.kt`, `ChatAssistantMessageUI.kt`, `ChatScreen.kt` (small), `SessionActivityTracker.kt` (two spots), `MuseHeader.kt` or the chat header, `CeisTokens.kt`, `nm_strings.xml` in every locale.

## Riskiest parts

1. No compiler is reachable here, so every edit is small and made beside existing patterns.
2. Shimmer cost beside the live glass composer: one brush animated in draw, nothing per character.
3. Sheet data honesty: counts and rows must come from the stores above, and the link stays hidden at zero.
