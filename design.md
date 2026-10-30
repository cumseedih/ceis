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
  Bubbles take at most about 70 percent of the row width.
- Sent bubbles are right aligned with white text on the iMessage blue
  gradient, #4EBAFF at the top to #0088FF at the bottom (template). Received
  bubbles are left aligned with ink text on light grey (#E9E9EB family; the
  file draws rgba(120,120,128,0.16), which flattens to that on white).
- Bubble corners are one large uniform radius, 20dp (template). The last
  bubble of a group carries the small tail at its bottom outer corner,
  extending about 6dp below the bubble body (template). Text sits 9dp above
  and below and 12dp in from the sides of the bubble (template).
- Bubbles inside one group sit 4dp apart, surface to surface (template).
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

Two deliberate exceptions to the rules above, both required by the template:

- The sent bubble's blue gradient overrides the "no decorative gradients"
  rule in Do's and Don'ts. It is the template's own treatment, not a
  decoration added by Ceis, and it applies to sent bubbles only.
- The composer capsule overrides the input component spec (44dp height,
  `rounded.sm`). The composer keeps its capsule form and height, as it did
  under the previous design system.

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
