---
version: alpha
name: Apple Minimal
description: A refined, high-contrast editorial system built around whitespace, restrained color, and crisp typography.
colors:
  primary: "#0071e3"
  secondary: "#0066cc"
  tertiary: "#1d1d1f"
  neutral: "#ffffff"
  surface: "#f5f5f7"
  on-surface: "#1d1d1f"
  border: "#e5e7eb"
  muted: "#6e6e73"
  error: "#d92d20"
typography:
  headline-display:
    fontFamily: SF Pro Text
    fontSize: 56px
    fontWeight: 700
    lineHeight: 67px
    letterSpacing: 0px
  headline-lg:
    fontFamily: SF Pro Display
    fontSize: 47px
    fontWeight: 600
    lineHeight: 60px
    letterSpacing: -0.28px
  headline-md:
    fontFamily: SF Pro Display
    fontSize: 40px
    fontWeight: 600
    lineHeight: 44px
    letterSpacing: 0px
  headline-sm:
    fontFamily: SF Pro Text
    fontSize: 33px
    fontWeight: 600
    lineHeight: 40px
    letterSpacing: 0px
  body-lg:
    fontFamily: SF Pro Display
    fontSize: 28px
    fontWeight: 400
    lineHeight: 42px
    letterSpacing: 0.196px
  body-md:
    fontFamily: SF Pro Display
    fontSize: 17px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0.196px
  body-sm:
    fontFamily: SF Pro Display
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0.2px
  label-lg:
    fontFamily: SF Pro Text
    fontSize: 17px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  label-md:
    fontFamily: SF Pro Text
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  label-sm:
    fontFamily: SF Pro Text
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  nav:
    fontFamily: SF Pro Text
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  button:
    fontFamily: SF Pro Text
    fontSize: 17px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 24px
  full: 9999px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 60px
  xl: 70px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: 11px 21px
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: 11px 21px
    height: 44px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: 11px 21px
    height: 44px
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: 0px
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: 16px
  input:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: 11px 16px
    height: 44px
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.nav}"
    rounded: "{rounded.none}"
    padding: 0px
---
# Apple Minimal

## Overview
This system is quiet, premium, and highly disciplined, with a strong editorial feel. It relies on large typography, generous whitespace, and restrained interaction styling to keep the focus on products and messages. The tone is professional rather than playful, and the density is intentionally low to preserve clarity and perceived value.

## Colors
- **Primary (#0071e3):** The signature blue used for primary calls to action, reinforcing trust and action without overwhelming the page.
- **Secondary (#0066cc):** A slightly deeper interactive blue for secondary actions and links, keeping the interface cohesive while still signaling clickability.
- **Tertiary (#1d1d1f):** The near-black text color used for headlines, navigation, and important copy. It reads as crisp charcoal rather than pure black.
- **Neutral (#ffffff):** The dominant background and button text color. It supports the airy, minimal composition and maximizes contrast.
- **Surface (#f5f5f7):** A soft off-white surface tone useful for section backgrounds and subtle separation without heavy borders.
- **On-surface (#1d1d1f):** The main body text color for readable copy on light backgrounds.
- **Border (#e5e7eb):** A light neutral border used sparingly for cards and input affordances.
- **Muted (#6e6e73):** Secondary text for supporting details, captions, and de-emphasized labels.
- **Error (#d92d20):** Reserved for destructive states and validation feedback; it should remain visually restrained.

## Typography
The system uses SF Pro Text for navigation, buttons, and other compact UI labels, while SF Pro Display is used for larger editorial content and body copy. Headlines are bold and confident, with `headline-display` at 56px/67px for the biggest product moments and `headline-lg` through `headline-sm` stepping down cleanly for hierarchy. Body text is spacious and highly legible, with `body-lg` and `body-md` maintaining the Apple-like balance of precision and calm. Letter spacing is generally minimal or slightly positive, and the overall system avoids uppercase-heavy styling except where needed for compact navigation patterns.

## Layout
The layout is centered, wide, and highly symmetrical, with product messaging stacked vertically in a single-column hero pattern. Spacing follows a generous rhythm based on 8px increments, with larger jumps at 24px, 60px, and 70px for major section separation and breathing room. Sections use broad horizontal padding and large vertical whitespace, making the interface feel expansive rather than dense. Cards and content blocks should remain simple and uncluttered, with modest internal padding and no exaggerated gutters.

## Elevation & Depth
Depth is deliberately minimal. The system prefers flat surfaces, subtle tonal separation, and thin borders over heavy shadow treatment. Shadows are effectively absent in most cases, with hierarchy created through contrast, whitespace, and typographic scale rather than layered elevation. When depth is needed, use the light border token and tonal background shifts before introducing shadows.

## Shapes
The shape language is soft and modern, with rounded controls and restrained corner treatment for cards. Primary and secondary buttons use fully pill-shaped corners (`rounded.full`) to feel friendly and recognizable. Cards and inputs use small radii (`rounded.sm`) to stay understated and architectural. Overall, the interface should feel polished, smooth, and precise rather than sharp or ornate.

## Components
Buttons are the clearest interactive signature of the system. Use `button-primary` for the main action: solid blue fill, white text, 44px height, and pill rounding. Use `button-secondary` for the secondary CTA: transparent background, blue outline/text, same height, same generous horizontal padding. Use `button-tertiary` for low-emphasis text-only actions or inline links. Buttons should remain lightweight in feel, with no shadow and minimal visual complexity.

Cards should stay white, bordered, and quiet, using `card` with a 1px light border, `rounded.sm`, and 16px padding. Avoid heavy shadows or decorative framing. Inputs should follow the same restrained treatment: white fill, subtle border, 44px height, and comfortable internal padding for touch targets. Navigation links should be text-first and low-profile, with `nav-link` used for top-level site navigation and other lightweight text actions.

If chips, pills, or badges are needed, they should mirror the button language but at a smaller scale: thin, rounded, and mostly flat. Tooltips and list items should remain simple and legible, prioritizing contrast and spacing over ornament.

## Do's and Don'ts
- Do use large typography and generous spacing to preserve the editorial, premium feeling.
- Do keep buttons pill-shaped, with one solid primary action and one outlined secondary action.
- Do favor flat surfaces, light borders, and contrast over shadow-heavy elevation.
- Do maintain strong alignment and centered compositions for hero content.
- Don't introduce bright accent colors beyond the primary blue and restrained utility tones.
- Don't use tight line spacing or cramped layouts; the system depends on airiness.
- Don't add decorative gradients, glows, or heavy shadows.
- Don't over-round cards or inputs; reserve full rounding for interactive pills only.
## Liquid Glass material (Ceis addendum, 2026-10-23)

Liquid Glass is the material layer of this system, specified from Apple's own
documentation (the Liquid Glass technology overview, the Human Interface
Guidelines chapter on Materials, and the SwiftUI guidance for applying Liquid
Glass to custom views; research notes in the project workspace). It is a
dynamic material, not a blur: it bends light at its edges, reflects the colour
and light of surrounding content, and reacts to touch in real time.

Where it applies in Ceis: the functional layer, meaning every element that
floats above content or carries a control. The prompt box (composer), the
floating tab bar, header controls and the persona chip, bottom sheets and
menus, approval, continue and hand-over cards, the model picker, dialogs, and
the voice panel. Content itself (message text, inline result cards, settings
rows, lists) stays flat in the Apple Minimal language above; that contrast is
what makes the glass read as a separate, functional layer.

The material, regular variant (the default; the clear variant is reserved for
controls floating over photos or video, with a 35 percent dark dimming layer
behind them when the media is bright):

- Backdrop blur with a luminosity adjustment, so text on the glass stays
  legible over any content beneath.
- A specular edge: a bright, thin highlight along the top and side edges that
  answers the light, plus a soft inner refraction falloff at the rim (the
  lensing approximation).
- A faint tint of the surface colour; a stronger tint only to give one primary
  element prominence.
- Interactive glass flexes on press (a small scale and a lift of the specular
  highlight), with springy, gel-like motion, and neighbouring glass elements
  in one container may blend and morph into each other across transitions.
- Separation deepens as content scrolls beneath: shadow and blur strengthen.
- Honour reduced-transparency and increased-contrast system settings by
  falling back toward an opaque surface.

Never stack glass on glass: elements that sit on a glass surface use flat
fills and transparency for separation. Keep the number of live glass elements
on a screen small enough to hold frame rate; the prompt box and the tab bar
are always present, so they carry the material first.

## Chat (iMessage template)

The chat screen in the home shell follows Apple's Messages design, taken from
the official iMessage Apps and Stickers template in Apple's design resources.
The person using the app is the sender and the agent is the received side, and
every part of the transcript speaks that language. Metrics below marked
"template" were read from the template file itself; metrics marked "visual"
match the template's visible standard values and are to be rechecked against
the file when access allows.

- Transcript rows sit 16dp from the screen edges (template, 402pt frame).
  Sent bubbles take at most about 70 percent of the row width. The agent's
  turn is not a bubble: it is flat text on the full row (see Agent reply).
- Sent bubbles are right aligned with white text on the iMessage blue
  gradient, #4EBAFF at the top to #0088FF at the bottom (template). The
  template's received bubble (left aligned, ink on light grey, #E9E9EB family)
  no longer applies to the agent, by the owner's decision of 2026-11-01; Ceis
  has no other received sender.
- Sent bubble corners are one large uniform radius, 20dp (template). The
  last sent bubble of a group carries the small tail at its bottom outer
  corner, extending about 6dp below the bubble body (template). Text sits 9dp
  above and below and 12dp in from the sides of the bubble (template).
- Sent bubbles inside one group sit 4dp apart, surface to surface (template).
- Time is shown as a centred divider in the muted caption style: "Today
  9:41 AM", "Yesterday 8:22 AM", or a short date with the time.
- Voice messages use the template's audio bubble: a play disc, a waveform
  and the duration, in the 76dp height family (template), sized to content.
- The header follows the template's chat toolbar: the agent's face and name
  centred with a small chevron, one round action button at each end.
- The composer bar is 72dp at rest including its padding (template). The
  attach button is a flat circle outside the capsule at the left; the text
  field is a glass capsule; the microphone sits at the field's right; send
  is a blue disc with an up arrow when there is text.

Two deliberate exceptions to the rules above, both required by the template
(the agent's flat reply is a third, chosen by the owner and specified in the
next section):

- The sent bubble's blue gradient overrides the "no decorative gradients"
  rule in Do's and Don'ts. It is the template's own treatment, not a
  decoration added by Ceis, and it applies to sent bubbles only.
- The composer capsule overrides the input component spec (44dp height,
  `rounded.sm`). The composer keeps its capsule form and height, as it did
  under the previous design system.

## Agent reply (owner's decision, 2026-11-01)

The agent's turn is flat text on the page: full width inside the 16dp
transcript inset, no bubble, no tail, no fill. It replaces the template's
received bubble for the agent. The sent bubble, its gradient and the composer
capsule are unchanged. The pattern was studied from a screen recording the
owner supplied; only behaviour, spacing and timing were taken (notes in
`replica/recon.md`). None of that app's artwork, colour or wording is used.

- Text: ink, at the markdown renderer's body size (16sp by default, and the
  size the person sets in settings). Bold lead-ins, numbered lists, code
  blocks and paragraph spacing keep the renderer's styles.
- Inline code: monospace 13sp, radius 4dp, 4dp of side padding. Light
  #005ABF on #F2F2F7, dark #6CB6FF on #34343A.
- The parts of one turn (text, tool rows) sit 4dp apart; a new turn starts
  16dp below the one before.

Components of the agent's turn. All colour pairs are checked with
`replica/design/tokens.json` (light) and `tokens.dark.json`; every pair passes
WCAG AA (4.5:1 for text, 3:1 for icons and borders).

- **ToolRow.** One muted line per tool call: a small typed icon, the title,
  and a 16dp chevron at the end. No capsule, no border, 13sp, text-muted ink
  (light #6E6E73, dark #A1A1A6), 40dp tall, the whole row is the tap target. States:
  running (a light band sweeps the title, see Motion; the stop button stays at
  the end), done, failed (the icon takes the error colour), cancelled. Tap
  opens the tool detail sheet. A file edit adds a diff badge after the title,
  12sp monospace, "+12" in diff-add and "-3" in diff-remove. The sign is
  always printed, so colour is never the only cue. diff-add is #1B7A3E (dark
  #46C46F), not the success green, because the success green fails as text on
  white. diff-remove is #CC2A1D (dark #FF6B63).
- **ReplyActions.** Copy and read aloud: 18dp icons in 44dp targets, muted
  ink, left aligned, 8dp under the last line of the turn. Shown only once the
  message has stopped streaming.
- **ScrollPill.** A 40dp circle, neutral fill (light white, dark #2C2C30),
  hairline border, 20dp ink arrow, centred, 8dp above the composer. Shown
  while the person has scrolled away from the end and the list overflows. It
  fades out when the end is reached or when it is tapped.
- **HeaderActivity.** A ring, 20dp, 2dp stroke, an arc of about 270 degrees in
  text-muted, beside the header's trailing button while any agent run is
  active. It is still when the system animation scale is zero.
- **Tasks link.** "Running tasks: N" in the link colour (light #0066CC, dark
  #4DA3FF), 13sp, 48dp tall, above the composer. It counts the other chats
  whose agent is running now, not the chat on screen, and is hidden when the
  count is zero.
- **TaskSheet.** A bottom sheet in the window-blur Liquid Glass material (the
  model picker's pattern), top radius 24dp, a 32 by 4dp handle, scrim 38
  percent black. It opens at about half the height (the platform's partial
  state) and drags to full.
  A centred title, a close button at the left, and two collapsible sections,
  Running and Finished, each with a count. Rows inside are flat, never glass:
  surface fill, radius 12dp, 8dp apart, 12dp of padding.
- **TaskRow.** A title (ink, 14sp medium) over one muted 12sp line that says
  the kind, the state and the time. A running row shows its elapsed time; a
  finished row shows when it ran. A row that has a chat shows "Open chat" in
  the link colour. Only what the app actually knows is shown: there are no
  token counts or tool counts, and no per-row stop control, because the app
  can only stop every run at once (that stop stays in the tool bar and the
  notification).
- **LoadMoreButton.** Full width, 44dp, outlined pill, ink label. Shown only
  while more finished rows exist; each press adds 10. The history is read
  from the device, so there is no loading state.

Motion. Every duration below lives in one Kotlin object, `CeisMotion`
(`io/github/ceis/ui/theme/CeisMotion.kt`); this table and that object are
changed together.

| What | Value |
| --- | --- |
| Running shimmer on a ToolRow title | 1300ms per sweep, linear, loops |
| Header ring | 1000ms per turn, linear |
| TaskSheet open and close | 700ms, decelerate |
| Scrim | 38 percent black, fades with the sheet |
| ScrollPill fade out | 150ms |
| Follow while streaming | the list follows the stream while it is at the end, and stops following the moment the person scrolls up |

When the system animation scale is zero, the shimmer and the ring hold still
and the sheet appears without motion. When the system asks for reduced
transparency, the sheet falls back to its opaque surface, as for every glass
surface above.

Two existing tokens failed AA in dark mode and were changed here: the inline
code text (#0064D4 on #34343A, 2.2:1, now #6CB6FF) and new surfaces take
#4DA3FF for links instead of #0064D4 (3.8:1 on black). The previous muted
chat ink, about #8A8A8E on white, is 3.4:1, so ToolRow uses text-muted from
this file instead.

## Brand mark

- Official transparent mark: `assets/brand/ceis-mark.png`.
- Official white app tile: `assets/brand/ceis-icon-512.png`.
- Preserve the supplied mark's geometry, proportions, and colour (#0754E0).
  Do not redraw, stretch, recolour, or substitute it. The mark's blue is a
  brand colour, distinct from the interface primary token above.

## Implementation notes

- Typography names SF Pro, which is not licensed for Android or the web. As
  with the previous system, platforms use their system sans-serif stack at
  the sizes, weights, line heights, and letter spacing in the front matter,
  until a licensed asset is supplied. This is a dependency gap, not a reason
  to download a substitute and present it as the specified font.
- One utility colour is carried over from the previous system because this
  file does not define it: success green #1F9D55, used only for small status
  confirmations (a finished step, a saved item), never as an accent.
- Android consumes these tokens through `CeisTokens.kt` and the Material
  theme; the web app through `web/src/theme.ts` and its CSS variables; the
  relay console through its CSS variables. A token change lands in design.md
  first, then in each platform layer.
- This file supersedes the previous Ceis design system (primary #005ABF,
  ink #111112, optimisticAI scale, spacing 6/14/32/56/120) as of 2026-10-23.
