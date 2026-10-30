# Connector brand logos

Settings → Connectors shows each service's own mark. The marks are the
24×24 paths from [Simple Icons](https://simpleicons.org) 16.33.0 (the icon
paths are CC0 1.0; the marks themselves belong to their owners and only say
which service a row is). On Android they are bundled as vector drawables in
`android/src/android/app/src/main/res/drawable/nm_conn_<slug>.xml`, resolved
from the catalogue's `icon` field (the simple-icons slug). The desktop keeps
the same paths in `harness/dsh-wevvy/src/client/brand-marks.ts`, which is
where the Android drawables were cross-checked.

The tile is a fixed light neutral (`#F3F4F6`) in both themes so dark marks
(Notion, GitHub, Vercel, Railway, Attio, Cal.com) stay readable in the dark
theme; the artwork is drawn unmodified at its brand colour. Services the
set has no mark for keep the letter tile in the catalogue's brand colour,
exactly as the desktop does.

## Marks bundled (43)

| Slug | Brand | Source |
|---|---|---|
| airtable | Airtable | https://airtable.com |
| algolia | Algolia | https://www.algolia.com/press/ |
| asana | Asana | https://asana.com |
| atlassian | Atlassian | https://www.atlassian.com/company/news/press |
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

## Services without a mark in the set (28, letter tile kept)

These brands have no entry in Simple Icons 16.33.0 (several were removed
from the set at their owners' request, so older copies were not reused):
monday.com, Attio, Close, Fireflies.ai, Slack, Heroku, Semgrep, Jam,
Stytch, Honeycomb, Microsoft Learn, DeepWiki, Context7, Octagon,
Audioscrape, Canva, YNAB, Exa, Tavily, Firecrawl, Apify, Simplescraper,
Globalping, 高德地图 Amap, 智谱 Web Search, Telnyx, Oura, Mercado Libre.
They keep the catalogue's coloured letter tile until a licensed mark is
available.
