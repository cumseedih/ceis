// The stylesheet is one string; a few rules are load-bearing for the window chrome and are
// checked here as text, so that a later restyle cannot quietly bring the macOS bug back where
// the header face over the drag region stopped taking clicks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// A Windows checkout may carry CRLF line endings (core.autocrlf); the tests look for
// `\n<selector> {\n`, so the file is read with LF endings whatever the checkout did.
const css = readFileSync(fileURLToPath(new URL('../src/client/styles.ts', import.meta.url)), 'utf8').replace(/\r\n/g, '\n')

/** The declarations of the first rule whose selector list is exactly `selector`. */
function rule(selector) {
  const lines = css.split('\n')
  const prefix = `${selector} {`
  const line = lines.find((l) => l.startsWith(prefix))
  assert.ok(line, `no rule for ${selector}`)
  return line.slice(prefix.length)
}

/** The whole declaration block of a rule that spans lines (the theme roots). */
function block(selector) {
  const lines = css.split('\n')
  const start = lines.findIndex((l) => l.startsWith(`${selector} {`))
  assert.ok(start >= 0, `no rule for ${selector}`)
  const end = lines.findIndex((l, i) => i > start && l === '}')
  assert.ok(end > start, `no end for ${selector}`)
  return lines.slice(start, end + 1).join('\n')
}

test('the header block is centred without a transform and without pointer-events tricks', () => {
  const header = rule('.nm-header')
  assert.doesNotMatch(header, /transform\s*:/)
  assert.doesNotMatch(header, /pointer-events\s*:/)
  assert.match(header, /left:\s*0;/)
  assert.match(header, /right:\s*0;/)
  assert.match(header, /margin:\s*0 auto/)
  assert.match(header, /width:\s*fit-content/)
  // the old escape hatch is gone with the wrapper's pointer-events:none
  assert.doesNotMatch(css, /^\.nm-header > \* \{ pointer-events: auto; \}/m)
})

test('the face, the header block and the rail face are no-drag islands on macOS and Windows', () => {
  const noDrag = css.split('\n').filter((l) => l.includes('-webkit-app-region: no-drag') && l.includes("[data-nm-platform='darwin']") && l.includes("[data-nm-platform='win32']"))
  const covers = (sel) => noDrag.some((l) => l.includes(sel))
  assert.ok(covers('.nm-header'), '.nm-header')
  assert.ok(covers('.nm-header-face'), '.nm-header-face')
  assert.ok(covers('.nm-rail-face'), '.nm-rail-face')
  // the chat header stays a drag handle
  assert.match(css, /\[data-nm-platform='win32'\]\) \[data-window-drag\][^\n]*-webkit-app-region: drag/)
})

test('on Windows the top bars clear the caption buttons by the title bar area, out of full screen only', () => {
  const scope = "html[data-nm-platform='win32']:not([data-nm-fullscreen])"
  const lines = css.split('\n')
  // one width, defined once, read from the window's title bar area rather than a fixed number
  const defs = lines.filter((l) => l.includes('--nm-caption-inset:'))
  assert.equal(defs.length, 1)
  assert.ok(defs[0].startsWith(`${scope} {`), defs[0])
  assert.match(defs[0], /env\(titlebar-area-x, 0px\)/)
  assert.match(defs[0], /env\(titlebar-area-width, 100vw\)/)
  assert.doesNotMatch(defs[0], /[1-9]\d*px/)
  // and their height, the same way, for the one bar that moves down instead
  const heightDefs = lines.filter((l) => l.includes('--nm-caption-height:'))
  assert.equal(heightDefs.length, 1)
  assert.ok(heightDefs[0].startsWith(`${scope} {`), heightDefs[0])
  assert.match(heightDefs[0], /--nm-caption-height: env\(titlebar-area-height, 0px\);/)
  // every use in the same scope: anywhere else the variable is undefined and the padding would drop to 0
  const uses = lines.filter((l) => l.includes('var(--nm-caption-inset)'))
  assert.ok(uses.length >= 9)
  const heightUses = lines.filter((l) => l.includes('var(--nm-caption-height)'))
  assert.ok(heightUses.length >= 1)
  for (const l of [...uses, ...heightUses]) assert.ok(l.startsWith(`${scope} `), l)
  // a task's detail is a narrow column: it moves down rather than giving up the width, and the
  // Schedules title row clears the corner only while no detail takes it
  assert.ok(heightUses.some((l) => l.includes('[data-detail-tab]')))
  assert.ok(!uses.some((l) => l.includes('[data-detail-tab]')))
  assert.ok(uses.some((l) => l.includes('task-manager-page"]:not(:has(> aside))')))
  // the harness's bars by its markers; a class name only by its stem (_pageHeading), never a full
  // hashed CSS module class
  for (const marker of ['[data-plugin-panel]', 'task-manager-page', '[data-dockkit-strip-chrome]']) {
    assert.ok(uses.some((l) => l.includes(marker)), marker)
  }
  for (const l of [...uses, ...heightUses]) assert.doesNotMatch(l, /\.[\w-]*_/, l)
  // the split pane's bars sit below its own top strip and get nothing
  for (const l of uses.filter((l) => /\.nm-(room-head|view-bar)/.test(l))) assert.match(l, /:not\(\.nm-split \*\)/, l)
})

test('the desk-a additions sit at the end of the sheet, under their marker', () => {
  const marker = css.indexOf('/* desk-a */')
  assert.ok(marker > 0)
  assert.ok(css.indexOf('.nm-rail-face, button:has(> .nm-rail-face)') > marker)
})

test('the lights breathe: nothing runs round, sweeps across or flows in the stylesheet', () => {
  // the phone's rhythm — 2.4 s in, 2.4 s out — on every light that says "working"
  for (const sel of ['.nm-chat-dot.nm-live', '.nm-status-dot.nm-live', '.nm-traj-live', '.nm-mic.nm-live', '.nm-remote-working::before']) {
    const r = rule(sel)
    assert.match(r, /animation:\s*nm-(pulse 2\.4s|breathe-light 4\.8s|mic-pulse 4\.8s) ease-in-out infinite/, sel)
  }
  assert.match(rule('html[data-nm-muse] [data-chat-running]::after'), /nm-breathe-light 4\.8s ease-in-out infinite/)
  // no marquee, no shimmer, no running border, no flowing gradient
  assert.doesNotMatch(css, /conic-gradient/)
  assert.doesNotMatch(css, /background-position/)
  assert.doesNotMatch(css, /@keyframes nm-(dots|ripple|stage-pulse|flow|sweep|shimmer|marquee)\b/)
  assert.doesNotMatch(css, /\.nm-stage/)
  // the breathing keyframes go between a dim and a full light, no travel
  assert.match(css, /@keyframes nm-breathe-light \{ 0%, 100% \{ opacity: 0\.3; \} 50% \{ opacity: 1; \} \}/)
})

test('a thread from other devices in the hero layout is bottom-aligned by an auto margin, so it scrolls (#261)', () => {
  const scroll = '[data-conversation-content][data-content-phase="hero"] > [data-conversation-scroll]'
  // the bubbles and the run card in the scrolling body: the alignment of the column itself stays at
  // the start, since a column aligned to its end or centred puts its overflow above the top edge,
  // where no scroll reaches it
  assert.match(rule(`${scroll}:has(.nm-remote, .nm-traj)`), /justify-content:\s*flex-start/)
  for (const line of css.split('\n').filter((l) => l.startsWith(scroll))) {
    assert.doesNotMatch(line, /justify-content:\s*(flex-end|end|center|safe)/, line)
  }
  // the first of them takes the free space above it while there is some
  const first = rule(`${scroll} > :is(.nm-remote, .nm-traj):not(:is(.nm-remote, .nm-traj) ~ :is(.nm-remote, .nm-traj))`)
  assert.match(first, /margin-top:\s*auto/)
  // and the old first-child margin, which did nothing once the bubbles overflowed, is gone
  assert.doesNotMatch(css, /\.nm-remote:first-child \{ margin-top: 16px/)
})

test('under prefers-reduced-motion every breathing light is steady', () => {
  const reduced = css.split('\n').filter((l) => l.startsWith('@media (prefers-reduced-motion: reduce)'))
  assert.ok(reduced.length >= 2)
  const steady = reduced.find((l) => l.includes('.nm-traj-live'))
  assert.ok(steady, 'the trajectory light is covered')
  for (const sel of ['.nm-chat-dot.nm-live', '.nm-status-dot.nm-live', '.nm-remote-working::before', '.nm-mic.nm-live', 'html[data-nm-muse] [data-chat-running]::after']) assert.ok(steady.includes(sel), sel)
  assert.match(steady, /animation: none; opacity: 1;/)
})

test('the chat wears the Messages dress: the sent gradient, the received grey, the send disc blue', () => {
  // the token blocks span several lines
  const block = (selector) => {
    const at = css.indexOf(`\n${selector} {\n`)
    assert.ok(at >= 0, `no block for ${selector}`)
    return css.slice(at, css.indexOf('\n}', at))
  }
  const light = block('html[data-ceis] body')
  const dark = block('html[data-ceis] body[data-ds-dark-theme]')
  const tokens = (block) => Object.fromEntries([...block.matchAll(/--(nm-[a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
  const l = tokens(light)
  const d = tokens(dark)
  // the sent bubble: the template's #4EBAFF over #0088FF with white ink, in both themes
  for (const t of [l, d]) {
    assert.equal(t['nm-user-bubble-top'], '#4ebaff')
    assert.equal(t['nm-user-bubble-bottom'], '#0088ff')
    // the solid the gradient falls back to, and what the coding and remote copies use
    assert.equal(t['nm-user-bubble'], '#0088ff')
    assert.equal(t['nm-user-bubble-fg'], '#ffffff')
  }
  // the received bubble: #E9E9EB in the light, #26262A in the dark
  assert.equal(l['nm-agent-bubble'], '#e9e9eb')
  assert.equal(d['nm-agent-bubble'], '#26262a')
  assert.equal(l['nm-canvas'], '#ffffff')
  assert.equal(d['nm-canvas'], d['nm-base'])
  // the send disc and the scroll-to-latest disc: the template's blue, white glyph
  for (const t of [l, d]) {
    assert.equal(t['nm-send'], '#0088ff')
    assert.equal(t['nm-send-fg'], '#ffffff')
  }
  // the user's pill carries the gradient over a solid, and its own text colour; so do the remote
  // and coding copies of it
  for (const sel of [
    'html[data-nm-muse] [data-chat-flow-kind="user"] [class*="_bubble"]',
    'html[data-nm-muse] .nm-remote-user .nm-remote-bubble',
    '.nm-cd-from-you .nm-cd-bubble',
  ]) {
    const r = rule(sel)
    assert.match(r, /background-color:\s*var\(--nm-user-bubble\)/, sel)
    assert.match(r, /background-image:\s*linear-gradient\(to bottom, var\(--nm-user-bubble-top\), var\(--nm-user-bubble-bottom\)\)/, sel)
    assert.match(r, /color:\s*var\(--nm-user-bubble-fg\)/, sel)
  }
  const toBottom = rule('html[data-nm-muse] [data-conversation-scroll] [class*="_toBottomSlot"] > button[class*="_toBottom"]')
  assert.match(toBottom, /background:\s*var\(--nm-send\)/)
  assert.match(toBottom, /color:\s*var\(--nm-send-fg\)/)
})

test('in the Muse look the header is a scrim over the thread, not a bar with a line under it', () => {
  const header = 'html[data-nm-muse] header[data-window-drag]:has(.nm-header)'
  const scrim = rule(header)
  assert.match(scrim, /position:\s*absolute/)
  assert.match(scrim, /border-bottom:\s*0/)
  assert.match(scrim, /pointer-events:\s*none/)
  assert.match(scrim, /linear-gradient\(to bottom, color-mix\(in srgb, var\(--nm-canvas\) 80%, transparent\) 0%, color-mix\(in srgb, var\(--nm-canvas\) 35%, transparent\) 55%, transparent 100%\)/)
  // the controls in it still take clicks, and the drag strip still drags
  const controls = css.split('\n').find((l) => l.startsWith(`${header} :is(`) && l.includes('pointer-events: auto'))
  assert.ok(controls, 'the header controls take their clicks back')
  for (const sel of ['button', 'a', '.nm-header', '.nm-header-drag', '[role="tab"]']) assert.ok(controls.includes(sel), sel)
  // the thread keeps the header's height clear, one variable per platform
  const thread = 'html[data-nm-muse] [data-slot="conversation.header"]:has(.nm-header) ~ [data-conversation-content]'
  assert.match(rule(`${thread} > [data-conversation-scroll]`), /padding-top:\s*var\(--nm-header-h\)/)
  assert.match(rule('header[data-window-drag]:has(.nm-header)'), /min-height:\s*var\(--nm-header-h\)/)
  assert.match(rule("html[data-nm-platform='darwin']:not([data-nm-fullscreen])"), /--nm-header-h:\s*136px/)
  assert.match(rule("html[data-nm-platform='win32']:not([data-nm-fullscreen])"), /--nm-header-h:\s*122px/)
  // the chat's canvas: white in the light, and the harness's own base token follows it there
  const content = rule(thread)
  assert.match(content, /background:\s*var\(--nm-canvas\)/)
  assert.match(content, /--dsw-alias-bg-base:\s*var\(--nm-canvas\)/)
})

test('the ceis design tokens are defined once, on the theme root, with the official values', () => {
  const root = block('html[data-ceis]')
  for (const [name, value] of [
    ['--wv-primary', '#005ABF'],
    ['--wv-link', '#0064D4'],
    ['--wv-text', '#111112'],
    ['--wv-page', '#FCFCFC'],
    ['--wv-surface', '#FFFFFF'],
    ['--wv-border', '#E5E7EB'],
    ['--wv-input', '#F3F4F6'],
    ['--wv-success', '#1F9D55'],
    ['--wv-error', '#D92D20'],
    ['--wv-radius-sm', '4px'],
    ['--wv-radius-md', '8px'],
    ['--wv-radius-lg', '16px'],
    ['--wv-radius-xl', '24px'],
    ['--wv-radius-full', '9999px'],
    ['--wv-space-xs', '6px'],
    ['--wv-space-sm', '14px'],
    ['--wv-space-md', '32px'],
    ['--wv-space-lg', '56px'],
    ['--wv-space-xl', '120px'],
  ]) assert.match(root, new RegExp(`${name}:\\s*${value};`), name)
  // the type scale rides the system stack: the design file's named font was not supplied
  assert.match(root, /--wv-type-headline-sm:\s*500 25px\/30px var\(--nm-font\);/)
  assert.match(root, /--wv-type-label-lg:\s*500 14px\/20px var\(--nm-font\);/)
  assert.match(root, /--wv-type-body-md:\s*400 16px\/24px var\(--nm-font\);/)
  assert.match(root, /--wv-type-caption:\s*400 12px\/18px var\(--nm-font\);/)
  // the accent follows the tokens: #005ABF in the light, the link-blue #0064D4 in the dark
  assert.match(root, /--nm-accent:\s*#005ABF;/)
  assert.match(root, /--nm-blue:\s*#005ABF;/)
  const dark = block('html[data-ceis] body[data-ds-dark-theme]')
  assert.match(dark, /--wv-primary:\s*#0064D4;/)
  assert.match(dark, /--wv-link:\s*#[0-9a-fA-F]{6};/)
  assert.doesNotMatch(dark, /--wv-link:\s*#0064D4;/)
  assert.match(dark, /--nm-accent:\s*#0064D4;/)
})

test('the shared controls follow the tokens: 48px primary pill, pill input on the input fill', () => {
  const pill = rule('.nm-pill')
  assert.match(pill, /min-height:\s*48px;/)
  assert.match(pill, /padding:\s*17px 32px;/)
  assert.match(pill, /border-radius:\s*var\(--wv-radius-full\);/)
  assert.match(pill, /background:\s*var\(--wv-primary\);/)
  assert.match(pill, /color:\s*#fff;/)
  assert.match(pill, /font:\s*var\(--wv-type-label-lg\);/)
  const field = rule('.nm-field')
  assert.match(field, /border-radius:\s*var\(--wv-radius-full\);/)
  assert.match(field, /background:\s*var\(--wv-input\);/)
  assert.match(field, /padding:\s*16px 20px;/)
  assert.match(field, /font:\s*var\(--wv-type-body-md\);/)
  assert.doesNotMatch(field, /border:\s*1px/)
  const box = rule('.nm-code-box')
  assert.match(box, /border-radius:\s*var\(--wv-radius-lg\);/)
  assert.match(box, /background:\s*var\(--wv-input\);/)
  const chip = rule('.nm-chip')
  assert.match(chip, /border-radius:\s*var\(--wv-radius-full\);/)
  assert.match(chip, /background:\s*var\(--wv-input\);/)
  const card = rule('.nm-ob-card')
  assert.match(card, /border-radius:\s*var\(--wv-radius-md\);/)
  assert.match(card, /background:\s*var\(--wv-surface\);/)
  assert.match(rule('.nm-ob-error'), /color:\s*var\(--wv-error\);/)
})

test('the sign-in door: round outline buttons, bare 64px mark, 25px/500 heading, link-blue Learn more, pale Continue while empty', () => {
  const round = rule('.nm-login-round')
  assert.match(round, /width:\s*44px;/)
  assert.match(round, /height:\s*44px;/)
  assert.match(round, /border:\s*1px solid var\(--wv-border\);/)
  assert.match(round, /border-radius:\s*50%;/)
  assert.match(round, /background:\s*var\(--wv-surface\);/)
  assert.match(rule('.nm-login-mark'), /width:\s*64px;/)
  const title = rule('.nm-login-title')
  assert.match(title, /font:\s*var\(--wv-type-headline-sm\);/)
  assert.match(title, /color:\s*var\(--wv-text\);/)
  assert.match(rule('.nm-login-fine a'), /color:\s*var\(--wv-link\);/)
  const cta = rule('.nm-pill.nm-login-cta:disabled')
  assert.match(cta, /background:\s*color-mix\(in srgb, var\(--wv-primary\) 14%, transparent\);/)
  assert.match(cta, /color:\s*var\(--wv-primary\);/)
  assert.match(rule('.nm-ob-link.nm-inline.nm-login-resend'), /color:\s*var\(--wv-link\);/)
  assert.match(rule('.nm-ob'), /background:\s*var\(--wv-page\);/)
})
