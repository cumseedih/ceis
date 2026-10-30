# CLI

Every command accepts `--config PATH` (`-c`). `--auto` switches Sentinel to `auto` mode for that run; explicit deny rules still apply.

## Talking to the agent

```bash
ceis serve [--host 0.0.0.0] [--port 8787] [--no-qr] [--no-auth]
```

The always-on agent with the phone app. See [app.md](app.md). `--no-auth` is for local development only.

```bash
ceis chat [--resume] [--show-thinking] [--auto]
```

Interactive session in the terminal with approvals inline. Slash commands:

| Command | Effect |
|---|---|
| `/help` | list commands |
| `/reset` | clear the conversation and the taint flag |
| `/memory`, `/goals` | list memories / goals |
| `/audit [n]` | recent audit entries |
| `/tools` | tools the agent can use right now |
| `/tainted` | whether the conversation has read private data |
| `/permissions` | standing permissions you granted (key and lifetime) |
| `/revoke <key>` | take one back, e.g. `/revoke shell:git` |
| `/forget-approvals` | clear every granted permission |
| `/exit` | quit (also `/quit`, `/q`) |

`--resume` continues the most recent session (`<data_dir>/sessions/`).

```bash
ceis run "Summarise the top three Hacker News stories into hn.md" [--auto]
```

One task, then exit. Non-zero exit if the agent fails.

```bash
ceis daemon [--interval 3600] [--once]
```

Advance every active goal, sleep, repeat. Runs in Sentinel `auto` mode, so pair it with deny rules and a tight `egress_allowlist`. The app's *Background work* switch does the same thing inside `ceis serve`, one goal per interval, with updates posted to the chat.

## Goals

```bash
ceis goals list [--status active|paused|done|cancelled] [--category health|finance|career|learning|…]
ceis goals show g_1a2b3c
ceis goals add "Learn Rust" -s "Read the book, ch. 1–4" -s "Build a CLI" -s "Publish a crate" \
    --category learning --due 2026-12-31 --check-in "weekly sun 19:00"
ceis goals run g_1a2b3c            # one background pass now
ceis goals status g_1a2b3c paused
ceis goals delete g_1a2b3c
```

## Reminders and routines

```bash
ceis reminders list [--all]                                  # --all includes the recently fired
ceis reminders add "Call mum" --at "2026-10-01 18:00"        # one message at that time
ceis reminders add "Summarise unread email" --repeat "weekdays 07:30" --task   # the agent does it, then reports
ceis reminders cancel r_1a2b3c
```

A reminder says one thing at the time you named; a routine (`--task`) is work the agent does at that time with its tools. Both fire from the running `ceis serve`: those set from the terminal land in the main chat, those set in a side chat stay there. Cadence grammar as for goal check-ins: `daily HH:MM`, `weekdays HH:MM`, `weekly <mon…sun> HH:MM`, `monthly <day> HH:MM`.

## Triggers

```bash
ceis triggers list [--all]                                                   # --all includes cancelled ones
ceis triggers add mail  "Summarise it and draft a reply" --match "landlord"   # a new mail whose sender/subject has every word
ceis triggers add event "Put together a one-page brief"  --match "review" --lead 30   # 30 min before a matching event
ceis triggers add hook  "Check that the site is up"      --match "deploy"    # prints the URL to POST to
ceis triggers cancel t_1a2b3c
```

A trigger fires when something happens rather than at a time: `mail` needs the email connector (the running server looks at the inbox every `triggers.mail_poll_minutes`, by IMAP UID, so nothing is replayed and nothing fires twice), `event` needs a calendar feed, `hook` is a URL with a key that any program can `POST` to; the body becomes the agent's context. Each firing is a background run in the chat the trigger was set from, shown in the Feed as *New mail: …*, *Coming up: …* or *Webhook: …*. The mail or the request is handed to the model as data, with the instruction that only your standing text says what to do.

## Calendar

```bash
ceis calendar add Work "https://calendar.google.com/calendar/ical/…/basic.ics"   # link goes to the vault as CALENDAR_WORK
ceis calendar add Family ~/family.ics                                            # or an .ics file on disk
ceis calendar agenda --days 7                                                    # what is on, grouped by day
ceis calendar free --day tomorrow --minutes 45                                   # gaps in the working hours
ceis calendar feeds                                                              # each feed: events, last read, error
ceis calendar remove Family
```

Feeds are re-read every `refresh_minutes` by the running server; `agenda --refresh` fetches now. The agent has the same view through its `calendar` tool, plus `draft`, which writes an `.ics` the app shows as an *Add to calendar* card; it never writes to your calendar directly.

## Contacts

```bash
ceis contacts search "ali"                          # by name, nickname, company, email or phone
ceis contacts list -n 20                            # the first people alphabetically
ceis contacts add "Bob Li" -e bob@example.com --note landlord   # into the agent's own book
ceis contacts sources                               # each address book: people, last read, error
ceis contacts add-source Google ~/Downloads/contacts.vcf         # a .vcf file, or a link (→ vault CONTACTS_GOOGLE)
ceis contacts remove-source Google
```

The agent has the same view through its `contacts` tool; `doctor` reports how many people it knows and from where.

## Skills

```bash
ceis skills list                                    # built-in and yours, on or off
ceis skills show trip-plan                          # the SKILL.md, as the model reads it
ceis skills new standup-notes                       # a SKILL.md to fill in, printed with its path
ceis skills add ./my-skill/                         # a folder or a SKILL.md file …
ceis skills add https://github.com/anthropics/skills/tree/main/skills/pdf   # … or a raw link / GitHub folder page
ceis skills disable inbox-triage                    # out of the model's list; the folder stays
ceis skills enable inbox-triage
ceis skills remove standup-notes                    # one of yours (built-in ones are disabled, not removed)
```

Skills are folders with a `SKILL.md` in the [Agent Skills](https://agentskills.io) format; yours live in `<data_dir>/skills/` and one with the same name as a built-in replaces it. In chat, `/name` at the start of a message runs one; `doctor` lists what is loaded and any folder it could not read.

## Memory

```bash
ceis memory list
ceis memory add "Prefers short answers" --category preference
ceis memory recall "写邮件给房东"    # what the agent would recall for this, with closeness
ceis memory forget m_9f8e7d        # id or a phrase to search for
ceis memory clear --yes
ceis memory tidy --dry-run         # what a tidy-up would merge and drop
ceis memory tidy                   # do it; every change is logged
ceis memory changes                # the log, newest first
ceis memory restore c_1a2b3c4d     # undo one change
```

`memory recall` shows the ranking the agent would get for a message: keyword hits and, when an embedding endpoint is set up ([configuration → memory](configuration.md#memory)), hits by meaning fused in, each with its cosine closeness, the way to see whether "写邮件给房东" finds "the landlord is Bob Li" before relying on it. `doctor` says whether recall by meaning is on, with which model, and how many memories are indexed.

## Vault

```bash
ceis vault set EMAIL_PASSWORD      # prompted; or --value for scripts
ceis vault list                    # names only, never values
ceis vault delete EMAIL_PASSWORD
```

Reference secrets as `{{vault:EMAIL_PASSWORD}}` in the config (connectors only; a command never receives a secret). See [sentinel.md](sentinel.md#credential-vault).

## Chat apps

```bash
ceis channels status [--json]              # what is switched on, connected, and who is paired
ceis channels pending                      # pairing codes people were shown and that wait for a yes
ceis channels approve 482913               # let the person who got this code talk to the Muse
ceis channels deny 482913
ceis channels login feishu [--lark]        # create the Feishu bot by scanning a QR code
ceis channels test feishu [--chat <id>]    # send a test message (default: the first paired chat)
```

With `ceis serve` running, these commands go through its API; otherwise they edit the files under the data directory and the server picks them up when it starts. The apps, pairing and what each one needs: [channels.md](channels.md).

## ChatGPT sign-in

```bash
ceis chatgpt login [--no-browser] [--port 1455] [--timeout 600]   # the browser opens OpenAI's sign-in page
ceis chatgpt status                        # who is signed in and until when; never touches the network
ceis chatgpt usage                         # what is left of the plan's usage windows
ceis chatgpt logout                        # forget the sign-in; nothing is revoked upstream
ceis chatgpt proxy [--port 0] [--token …]  # an OpenAI-compatible server on the loopback interface
```

Every subcommand takes `--json` (one JSON object per line) and, where it reaches chatgpt.com, `--proxy` (default: `[llm] proxy` from the config). What the sign-in covers and where the tokens live: [own-key.md](own-key.md#sign-in-with-a-plan-you-already-pay-for).

## Phone

```bash
ceis phone traces [--limit 20]                 # every phone_task on record: id, when, status, steps, goal
ceis phone trace pt-20260923-230710-5be7       # one task step by step: screen, latency, action, what was sent
ceis phone trace pt-20260923-230710-5be7 -o trace.html   # a self-contained page with every screen and tap drawn on it
```

Traces are written whenever the agent operates the phone ([gui.md](gui.md#traces)); the HTML page is one file with the screenshots inlined, made to be attached to an issue.

## Audit and config

```bash
ceis audit [-n 20] [--json]        # recent decisions, approvals, tool calls
ceis config init [--path config/config.toml] [--force]
ceis config show                   # effective settings, secrets masked
ceis config path                   # which file is in use
ceis doctor [--no-model]           # config, data dir, model, connectors — one screen
ceis version                       # also: ceis --version / -V
ceis mcp                           # this computer's screen and hands as an MCP server on stdio, for another host
```

`ceis mcp` is for a host that is not our runtime ([ceis on DeepSeek Harness](harness.md)) and serves `computer_screen` and `computer_act` with the runtime's descriptions; a step the Sentinel would ask about (Enter, a submit, a heavy shortcut, a click on a sensitive word) is refused with the reason until the call carries `confirmed: true`, which the model may set only after the person agreed in the conversation.

`ceis doctor` is the first thing to run when something is off, and what to paste into a bug report: which config file is in use (and any key in it nothing reads), where the data lives, which model and endpoint are configured and whether a key is set, whether recall by meaning is on and how many memories are indexed, which web search provider answers and whether it has its key or URL, whether commands run in the sandbox (and why not, if not), the tools the agent has, connector state (mailbox, calendar feeds, address books), and a one-line call to the model with its latency (`--no-model` skips that). It exits non-zero when something needs fixing and says what.
