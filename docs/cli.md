# CLI

Every command accepts `--config PATH` (`-c`). `--auto` switches Sentinel to `auto` mode for that run; explicit deny rules still apply.

## Talking to the agent

```bash
wevvy serve [--host 0.0.0.0] [--port 8787] [--no-qr] [--no-auth]
```

The always-on agent with the phone app. See [app.md](app.md). `--no-auth` is for local development only.

```bash
wevvy chat [--resume] [--show-thinking] [--auto]
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
wevvy run "Summarise the top three Hacker News stories into hn.md" [--auto]
```

One task, then exit. Non-zero exit if the agent fails.

```bash
wevvy daemon [--interval 3600] [--once]
```

Advance every active goal, sleep, repeat. Runs in Sentinel `auto` mode, so pair it with deny rules and a tight `egress_allowlist`. The app's *Background work* switch does the same thing inside `wevvy serve`, one goal per interval, with updates posted to the chat.

## Goals

```bash
wevvy goals list [--status active|paused|done|cancelled] [--category health|finance|career|learning|…]
wevvy goals show g_1a2b3c
wevvy goals add "Learn Rust" -s "Read the book, ch. 1–4" -s "Build a CLI" -s "Publish a crate" \
    --category learning --due 2026-12-31 --check-in "weekly sun 19:00"
wevvy goals run g_1a2b3c            # one background pass now
wevvy goals status g_1a2b3c paused
wevvy goals delete g_1a2b3c
```

## Reminders and routines

```bash
wevvy reminders list [--all]                                  # --all includes the recently fired
wevvy reminders add "Call mum" --at "2026-10-01 18:00"        # one message at that time
wevvy reminders add "Summarise unread email" --repeat "weekdays 07:30" --task   # the agent does it, then reports
wevvy reminders cancel r_1a2b3c
```

A reminder says one thing at the time you named; a routine (`--task`) is work the agent does at that time with its tools. Both fire from the running `wevvy serve`: those set from the terminal land in the main chat, those set in a side chat stay there. Cadence grammar as for goal check-ins: `daily HH:MM`, `weekdays HH:MM`, `weekly <mon…sun> HH:MM`, `monthly <day> HH:MM`.

## Triggers

```bash
wevvy triggers list [--all]                                                   # --all includes cancelled ones
wevvy triggers add mail  "Summarise it and draft a reply" --match "landlord"   # a new mail whose sender/subject has every word
wevvy triggers add event "Put together a one-page brief"  --match "review" --lead 30   # 30 min before a matching event
wevvy triggers add hook  "Check that the site is up"      --match "deploy"    # prints the URL to POST to
wevvy triggers cancel t_1a2b3c
```

A trigger fires when something happens rather than at a time: `mail` needs the email connector (the running server looks at the inbox every `triggers.mail_poll_minutes`, by IMAP UID, so nothing is replayed and nothing fires twice), `event` needs a calendar feed, `hook` is a URL with a key that any program can `POST` to; the body becomes the agent's context. Each firing is a background run in the chat the trigger was set from, shown in the Feed as *New mail: …*, *Coming up: …* or *Webhook: …*. The mail or the request is handed to the model as data, with the instruction that only your standing text says what to do.

## Calendar

```bash
wevvy calendar add Work "https://calendar.google.com/calendar/ical/…/basic.ics"   # link goes to the vault as CALENDAR_WORK
wevvy calendar add Family ~/family.ics                                            # or an .ics file on disk
wevvy calendar agenda --days 7                                                    # what is on, grouped by day
wevvy calendar free --day tomorrow --minutes 45                                   # gaps in the working hours
wevvy calendar feeds                                                              # each feed: events, last read, error
wevvy calendar remove Family
```

Feeds are re-read every `refresh_minutes` by the running server; `agenda --refresh` fetches now. The agent has the same view through its `calendar` tool, plus `draft`, which writes an `.ics` the app shows as an *Add to calendar* card; it never writes to your calendar directly.

## Contacts

```bash
wevvy contacts search "ali"                          # by name, nickname, company, email or phone
wevvy contacts list -n 20                            # the first people alphabetically
wevvy contacts add "Bob Li" -e bob@example.com --note landlord   # into the agent's own book
wevvy contacts sources                               # each address book: people, last read, error
wevvy contacts add-source Google ~/Downloads/contacts.vcf         # a .vcf file, or a link (→ vault CONTACTS_GOOGLE)
wevvy contacts remove-source Google
```

The agent has the same view through its `contacts` tool; `doctor` reports how many people it knows and from where.

## Skills

```bash
wevvy skills list                                    # built-in and yours, on or off
wevvy skills show trip-plan                          # the SKILL.md, as the model reads it
wevvy skills new standup-notes                       # a SKILL.md to fill in, printed with its path
wevvy skills add ./my-skill/                         # a folder or a SKILL.md file …
wevvy skills add https://github.com/anthropics/skills/tree/main/skills/pdf   # … or a raw link / GitHub folder page
wevvy skills disable inbox-triage                    # out of the model's list; the folder stays
wevvy skills enable inbox-triage
wevvy skills remove standup-notes                    # one of yours (built-in ones are disabled, not removed)
```

Skills are folders with a `SKILL.md` in the [Agent Skills](https://agentskills.io) format; yours live in `<data_dir>/skills/` and one with the same name as a built-in replaces it. In chat, `/name` at the start of a message runs one; `doctor` lists what is loaded and any folder it could not read.

## Memory

```bash
wevvy memory list
wevvy memory add "Prefers short answers" --category preference
wevvy memory recall "写邮件给房东"    # what the agent would recall for this, with closeness
wevvy memory forget m_9f8e7d        # id or a phrase to search for
wevvy memory clear --yes
wevvy memory tidy --dry-run         # what a tidy-up would merge and drop
wevvy memory tidy                   # do it; every change is logged
wevvy memory changes                # the log, newest first
wevvy memory restore c_1a2b3c4d     # undo one change
```

`memory recall` shows the ranking the agent would get for a message: keyword hits and, when an embedding endpoint is set up ([configuration → memory](configuration.md#memory)), hits by meaning fused in, each with its cosine closeness, the way to see whether "写邮件给房东" finds "the landlord is Bob Li" before relying on it. `doctor` says whether recall by meaning is on, with which model, and how many memories are indexed.

## Vault

```bash
wevvy vault set EMAIL_PASSWORD      # prompted; or --value for scripts
wevvy vault list                    # names only, never values
wevvy vault delete EMAIL_PASSWORD
```

Reference secrets as `{{vault:EMAIL_PASSWORD}}` in the config (connectors only; a command never receives a secret). See [sentinel.md](sentinel.md#credential-vault).

## Chat apps

```bash
wevvy channels status [--json]              # what is switched on, connected, and who is paired
wevvy channels pending                      # pairing codes people were shown and that wait for a yes
wevvy channels approve 482913               # let the person who got this code talk to the Muse
wevvy channels deny 482913
wevvy channels login feishu [--lark]        # create the Feishu bot by scanning a QR code
wevvy channels test feishu [--chat <id>]    # send a test message (default: the first paired chat)
```

With `wevvy serve` running, these commands go through its API; otherwise they edit the files under the data directory and the server picks them up when it starts. The apps, pairing and what each one needs: [channels.md](channels.md).

## ChatGPT sign-in

```bash
wevvy chatgpt login [--no-browser] [--port 1455] [--timeout 600]   # the browser opens OpenAI's sign-in page
wevvy chatgpt status                        # who is signed in and until when; never touches the network
wevvy chatgpt usage                         # what is left of the plan's usage windows
wevvy chatgpt logout                        # forget the sign-in; nothing is revoked upstream
wevvy chatgpt proxy [--port 0] [--token …]  # an OpenAI-compatible server on the loopback interface
```

Every subcommand takes `--json` (one JSON object per line) and, where it reaches chatgpt.com, `--proxy` (default: `[llm] proxy` from the config). What the sign-in covers and where the tokens live: [own-key.md](own-key.md#sign-in-with-a-plan-you-already-pay-for).

## Phone

```bash
wevvy phone traces [--limit 20]                 # every phone_task on record: id, when, status, steps, goal
wevvy phone trace pt-20260923-230710-5be7       # one task step by step: screen, latency, action, what was sent
wevvy phone trace pt-20260923-230710-5be7 -o trace.html   # a self-contained page with every screen and tap drawn on it
```

Traces are written whenever the agent operates the phone ([gui.md](gui.md#traces)); the HTML page is one file with the screenshots inlined, made to be attached to an issue.

## Audit and config

```bash
wevvy audit [-n 20] [--json]        # recent decisions, approvals, tool calls
wevvy config init [--path config/config.toml] [--force]
wevvy config show                   # effective settings, secrets masked
wevvy config path                   # which file is in use
wevvy doctor [--no-model]           # config, data dir, model, connectors — one screen
wevvy version                       # also: wevvy --version / -V
wevvy mcp                           # this computer's screen and hands as an MCP server on stdio, for another host
```

`wevvy mcp` is for a host that is not our runtime ([wevvy on DeepSeek Harness](harness.md)) and serves `computer_screen` and `computer_act` with the runtime's descriptions; a step the Sentinel would ask about (Enter, a submit, a heavy shortcut, a click on a sensitive word) is refused with the reason until the call carries `confirmed: true`, which the model may set only after the person agreed in the conversation.

`wevvy doctor` is the first thing to run when something is off, and what to paste into a bug report: which config file is in use (and any key in it nothing reads), where the data lives, which model and endpoint are configured and whether a key is set, whether recall by meaning is on and how many memories are indexed, which web search provider answers and whether it has its key or URL, whether commands run in the sandbox (and why not, if not), the tools the agent has, connector state (mailbox, calendar feeds, address books), and a one-line call to the model with its latency (`--no-model` skips that). It exits non-zero when something needs fixing and says what.
