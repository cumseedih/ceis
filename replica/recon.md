# Recon map: agent chat reply and its motion (Android first)

Scope: how an agent's reply is drawn and animated in a mobile agent-chat app: the flat reply text, collapsed tool-call rows with a running shimmer, the header activity spinner, the scroll-to-bottom pill, the action row, the "N running tasks" link and the background-tasks bottom sheet. Not the sign-in, settings or list screens.
For: the Ceis chat screen (owner's own product).
Date: 2026-11-01

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | the owner's own screen recording of their own session | uploaded file `video_1793472501505.mp4`, 42.7 s, 720x1600, h264 | the only source. Sampled at 1 fps (43 frames) plus two 15 fps bursts (sheet opening, shimmer). Frames are kept in scratch space, never in the repo and never shipped |

No source code, bundle, network call or private API was read. Timings come from a compressed recording sampled at 15 fps, so each is good to about 70 ms; marked `est.` where it is inferred.

## Core loop

The person sends a message, the agent works and streams a reply while showing what it is doing in quiet collapsed rows, and the person can leave the scroll alone, read along, or open a sheet that lists every task the agent has running.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Chat transcript | chat tab | read the conversation | header, user bubble, agent reply, tool rows, action row, time divider, question card | streaming, settled, scrolled up |
| S02 | Composer | bottom of S01 | write and send | card with draft line, suggestion chip, plus button, model chip, mic, send disc | draft with ghost suggestion, send disc faded |
| S03 | Running-tasks sheet, peek | tap "N running tasks" | see what is running | scrim, sheet, handle, close, section headers, task rows | peek (about 60 percent of height) |
| S04 | Running-tasks sheet, full | drag S03 up | see everything finished | same plus "Load more" | full height, list scrolling, loading more |
| S05 | Scroll-to-bottom pill | appears over S01 | jump back to live end | round pill with a down arrow | visible, fading out |

## Flows

```
F01 Read a streaming reply
    S01 (streaming) -> S05 appears if the person scrolled up -> tap pill -> S01 pinned to bottom
    happy path clicks: 0 (auto-follow while pinned)
    edge: person scrolls up mid-stream (stop following, show pill), reply ends (action row appears)

F02 Check what the agent is running
    S01 -> tap "2 running tasks" -> S03 -> drag up -> S04 -> tap close or swipe down -> S01
    happy path clicks: 2
    edge: no running tasks (link hidden), tasks finish while the sheet is open (row moves from Running to Finished)

F03 Load older finished tasks
    S04 -> tap "Load more" -> label becomes a spinner -> five more rows appear, count goes 16 -> 21
    happy path clicks: 1
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| AgentReply | flat full-width prose, no bubble, no tail | streaming, settled | S01 |
| InlineCode chip | monospace, tinted pill, small radius | default | S01 |
| ToolRow | tool, skill, agent; optional diff badge (green +n, red -n) | running (shimmer), done, expanded | S01 |
| ReplyActions | copy, speak (two muted icons, left aligned under the reply) | visible only when settled | S01 |
| UserBubble | right aligned, light neutral fill, large radius | default | S01 |
| TimeDivider | hairline wave with centred muted time | default | S01 |
| QuestionCard | outlined card, "Question" label, question, chosen answer | answered | S01 |
| ScrollPill | 36 dp circle, hairline border, down arrow | hidden, visible, fading | S05 |
| HeaderActivity | partial ring spinner beside the overflow menu | idle (hidden or still), working (rotating) | S01 |
| ComposerCard | rounded card, two rows | empty, draft, suggestion | S02 |
| TaskSheet | modal sheet with scrim, handle, close, collapsible sections | peek, full, dragging | S03, S04 |
| TaskRow | agent task (title, "Agent, Completed, 4m 27s", stats, "View transcript"), shell task (title, "Shell, Completed") | running (ring-stop control at right), completed | S03, S04 |
| LoadMoreButton | full-width outlined pill | idle, loading (spinner replaces label) | S04 |

## Measurements (proportions at a 411 dp wide phone; estimates)

- Reply text left and right inset about 14 dp. Body about 15 sp on a 20 dp line. Paragraph gap about 10 dp. No bubble background.
- Tool row text about 13 sp, muted, with a trailing small chevron. Rows sit about 8 dp apart inside the reply column.
- Inline code: monospace about 13 sp, muted blue text on a pale blue-grey fill, radius about 4 dp, horizontal padding about 4 dp.
- User bubble: light neutral fill, radius about 16 dp, right aligned, at most about 75 percent of the width.
- Action row icons 16 dp, about 12 dp apart, muted, 8 dp below the last line.
- "N running tasks": small text link in the interactive blue, 12 dp below the action row.
- Header: back arrow at the left; centred two-line title (about 13 sp semibold over about 10 sp muted); at the right a ring spinner about 20 dp and the overflow button.
- Composer card: radius about 24 dp, hairline border, draft line on top, control row under it (plus, model chip, mic, send disc 36 dp, faded when there is nothing to send).
- Sheet: peek top at about 40 percent from the top, top corners about 24 dp, handle about 32 x 4 dp, scrim about 35 to 40 percent black, task cards radius about 12 dp on a faint tint, 8 dp apart.

## Motion

| what | observed | value |
| --- | --- | --- |
| Streaming follow | content scrolls up continuously as text arrives while the list is pinned to the end | follow by line, no jump |
| Scroll pill | appears while content grows and the list is not at the end, fades out once the end is reached | visible about 0.5 s then fade about 0.15 s `est.` |
| Running shimmer | a lighter band sweeps left to right across the tool-row label while it runs | about 1.3 s per sweep, linear, loops `est.` |
| Header spinner | an arc of about 270 degrees rotates | about 1 s per turn, linear `est.` |
| Sheet open | scrim steps in within one frame, then the sheet rises from the bottom edge to the peek height with deceleration | about 0.7 s, decelerate (ease-out) |
| Sheet drag to full | follows the finger, no snap overshoot | gesture driven |
| Sheet close | reverse of open | about 0.5 to 0.7 s `est.` |
| Load more | label swaps to a small spinner in place, button keeps its width | immediate swap |
| Count change | section header count updates after load | no animation seen |

## Inferred data model

```
ToolRow          id, kind (tool | skill | agent), label, status (running | done), diffAdded?, diffRemoved?, detail (expandable)
                 evidence: S01 rows "Ran 2 commands", "Read a file, ran 2 commands, edited a file +4 -4", "Running agent"
                 confidence: high
BackgroundTask   id, title, type (agent | shell), status (running | completed), elapsed, tokens?, toolUses?, transcriptRef?
                 evidence: S03, S04 rows, "Finished 16" then 21 after load
                 confidence: medium (agent rows carry stats, shell rows do not)
```

Relationships: Reply 1-n ToolRow; Conversation 1-n BackgroundTask; BackgroundTask 0-1 transcript.

## Conflicts with the current design system

`design.md` (Chat, iMessage template) draws the agent as the received side: a grey bubble with a tail, 70 percent max width. This reference draws the agent reply flat, full width, with no bubble. The owner asked for the flat reply, so `design.md` changes first (an explicit exception for agent replies), then the platform layers. The sent bubble and the composer capsule rules are not touched by this recon.

## Feature matrix

See `features.csv`. Must: 7, should: 5, could: 3, skip: 4.

## Out of scope (cannot or should not be cloned)

- The source app's icons, wordmark, brand colours (its send disc tint is its own brand), illustrations and sounds. Ceis uses its own tokens and an open icon set.
- Its copy and labels. Every string in Ceis is written fresh and goes through every locale.
- Its model names, skill system, token-count format and plan limits.
- Its server, transcripts and account features.

## Size

Screens 5, flows 3, entities 2. Hard parts: pinned-scroll logic with a pill that does not fight the user's finger, a cheap shimmer in Compose that holds frame rate beside the live Liquid Glass layers, a partially expanded sheet that coexists with the glass composer, and feeding the task list from the real agent runtime instead of mock data. Size: M for Android; iOS and web follow the parity rule afterwards.
