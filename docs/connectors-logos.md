# Connector brand logos

Settings → Connectors shows each service's own mark. The marks are the
24×24 paths from [Simple Icons](https://simpleicons.org) 16.33.0 (the icon
paths are CC0 1.0; the marks themselves belong to their owners and only say
which service a row is). On Android they are bundled as vector drawables in
`android/src/android/app/src/main/res/drawable/nm_conn_<slug>.xml`, resolved
from the catalogue's `icon` field (the simple-icons slug). The desktop keeps
the same paths in `harness/dsh-ceis/src/client/brand-marks.ts`, which is
where the Android drawables were cross-checked.

The tile is a fixed light neutral (`#F3F4F6`) in both themes so dark marks
(Notion, GitHub, Vercel, Railway, Attio, Cal.com) stay readable in the dark
theme; the artwork is drawn unmodified at its brand colour. Services the
set has no mark for keep the letter tile in the catalogue's brand colour,
exactly as the desktop does.

## Marks bundled (44)

| Slug | Brand | Source |
|---|---|---|
| airtable | Airtable | https://airtable.com |
| algolia | Algolia | https://www.algolia.com/press/ |
| asana | Asana | https://asana.com |
| atlassian | Atlassian | https://www.atlassian.com/company/news/press |
| attio | Attio | https://attio.com/brand (hand-sourced, not in Simple Icons; see below) |
| bitrise | Bitrise | https://www.bitrise.io/press |
| box | Box | https://www.box.com/en-gb/about-us/press |
| buildkite | Buildkite | https://buildkite.com/brand-assets |
| caldotcom | Cal.com | https://cal.com |
| clickup | ClickUp | https://clickup.com |
| cloudflare | Cloudflare | https://www.cloudflare.com/logo/ |
| digitalocean | DigitalOcean | https://www.digitalocean.com/press |
| discord | Discord | https://discord.com/branding |
| dodopayments | Dodo Payments | https://dodopayments.com/brand |
| dropbox | Dropbox | https://www.dropbox.com/branding |
| egnyte | Egnyte | https://www.egnyte.com/presskit.html |
| figma | Figma | https://www.figma.com/press/ |
| github | GitHub | https://github.com/logos |
| gitlab | GitLab | https://about.gitlab.com/press/press-kit/ |
| hubspot | HubSpot | https://www.hubspot.com/company/brand |
| huggingface | Hugging Face | https://huggingface.co/brand |
| intercom | Intercom | https://www.intercom.com/press |
| linear | Linear | https://linear.app |
| mercadopago | Mercado Pago | https://www.mercadopago.com |
| miro | Miro | https://miro.com |
| neon | Neon | https://neon.tech |
| netlify | Netlify | https://www.netlify.com/press/ |
| notion | Notion | https://www.notion.com |
| pagerduty | PagerDuty | https://www.pagerduty.com |
| paypal | PayPal | https://www.paypal.com |
| postman | Postman | https://www.postman.com |
| prisma | Prisma | https://www.prisma.io |
| quickbooks | QuickBooks | https://design.intuit.com/quickbooks/brand |
| railway | Railway | https://railway.app |
| render | Render | https://render.com |
| sentry | Sentry | https://sentry.io |
| square | Square | https://squareup.com |
| stripe | Stripe | https://stripe.com/newsroom |
| supabase | Supabase | https://supabase.com/brand-assets |
| todoist | Todoist | https://doist.com |
| turkishairlines | Turkish Airlines | https://www.turkishairlines.com |
| vercel | Vercel | https://vercel.com/design/branding |
| webflow | Webflow | https://webflow.com |
| wix | Wix | https://www.wix.com |

The `source` column is the brand's own page as recorded by Simple Icons 16.33.0
(`data/simple-icons.json`); the full per-mark provenance lives in that file.

## Hand-sourced marks (not in Simple Icons)

One brand below has no Simple Icons entry but does publish its mark on its
own site for this kind of use, so it was added by hand in
`scripts/custom-marks.json` instead (the generator merges it into
`brand-marks.ts`; see the comment in `scripts/brand-marks.mjs`):

- **Attio**: `attio-logomark.svg` from https://attio.com/brand (fetched
  2026-10-31). The page's only restriction is "keep clear space around it,
  and do not warp, stretch, recolor, or redraw" — the mark here is rescaled
  from its native 37×30 viewBox to 24×24 preserving aspect ratio (uniform
  scale plus centering, not a stretch) and otherwise unmodified.

## Services checked and skipped (research done, no mark added)

Checked on 2026-10-31 while filling this list; none of these were added,
each for a documented reason, not an oversight:

- **Explicit permission required**: Heroku (`devcenter.heroku.com/articles/heroku-brand-guidelines`
  asks to contact brand@heroku.com before product/website use), Tavily
  (`tavily.com/brand` says to seek permission before use), Exa (`exa.ai/brand`
  frames third-party use as co-branding, which "requires approval from both
  parties").
- **Mark exists but terms are unclear for app/integration use**: Slack (the
  official media kit covers general brand use but says nothing about
  third-party app integration badges; Slack is also one of the brands Simple
  Icons dropped at the owner's request, which argues for extra caution, not
  less).
- **Official page found, no accessible unrestricted file**: Firecrawl, YNAB,
  Telnyx (assets are behind a Brandfolder/Dropbox collection or a zip without
  stated third-party terms).
- **No official brand/press page found**: Canva, Stytch, Honeycomb, Semgrep,
  monday.com (whose logo a third party explicitly describes as needing
  monday's written permission for commercial use), Oura.
- **Inherently multi-colour, can't be represented**: Apify. Its official
  symbol (`apify.com/resources/brand`) is three colours (blue, green,
  orange); this app's mark system (`MARKS: Record<string, { d; hex }>`) is
  single-path, single-colour by design, matching every other entry here.
  Recoloring Apify's mark to fit would itself break their "don't modify"
  terms. Adding multi-path, multi-colour support to the renderer (desktop
  and Android both) is a larger change than a logo fill and wasn't done here.
- **Not checked individually**: Close, Fireflies.ai, Jam, Microsoft Learn,
  DeepWiki, Context7, Octagon, Audioscrape, Simplescraper, Globalping,
  高德地图 Amap, 智谱 Web Search, Mercado Libre — smaller or narrower products
  unlikely to publish a formal brand kit; not exhaustively searched.

## Services without a mark in the set (27, letter tile kept)

monday.com, Close, Fireflies.ai, Slack, Heroku, Semgrep, Jam, Stytch,
Honeycomb, Microsoft Learn, DeepWiki, Context7, Octagon, Audioscrape, Canva,
YNAB, Exa, Tavily, Firecrawl, Apify, Simplescraper, Globalping, 高德地图 Amap,
智谱 Web Search, Telnyx, Oura, Mercado Libre. They keep the catalogue's
coloured letter tile until a licensed mark is available.
