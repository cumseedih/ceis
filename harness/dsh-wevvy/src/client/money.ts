/**
 * Money renders in US dollars only. The relay's payloads carry the CNY amounts
 * beside USD figures it computed itself (`/v1/me` `spend.*_usd`, the avatar
 * estimates' `usd`, `/v1/config` `allowance_usd`); where a USD figure is absent
 * the relay's `usd_cny` rate converts. ¥ is the last resort, for an older relay
 * that sent neither — the `_cny` field names stay as they are.
 */
export function dollars(cny: number, usd: number | null | undefined, rate: number | null | undefined, digits = 2): string {
  if (typeof usd === 'number' && Number.isFinite(usd)) return `$${usd.toFixed(digits)}`
  if (rate && rate > 0) return `$${(cny / rate).toFixed(digits)}`
  return `¥${cny.toFixed(digits)}`
}

/** The figure for a `{hole}` in a locale string that already carries the `$`: the relay's
 *  own USD number first, else the CNY amount through the relay's rate. */
export function usdNum(cny: number, usd: number | null | undefined, rate: number | null | undefined, digits = 2): string {
  if (typeof usd === 'number' && Number.isFinite(usd)) return usd.toFixed(digits)
  if (rate && rate > 0) return (cny / rate).toFixed(digits)
  return cny.toFixed(digits)
}
