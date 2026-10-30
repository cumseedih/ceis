// The English dictionary: every `{hole}` fills by name, no string names a
// developer's computer, and the house style holds (AGENTS.md) — plain sentences
// with commas, colons and full stops, no em or en dashes, no exclamation marks.
// The Chinese dictionary was removed (the app is English-only now), so the
// old en/zh parity checks are gone with it.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const here = fileURLToPath(new URL('.', import.meta.url))
let dir
let en

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'nm-locales-'))
  await build({
    entryPoints: [join(here, '..', 'src', 'client', 'locales.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: join(dir, 'locales.mjs'),
    logLevel: 'silent',
  })
  ;({ en } = await import(pathToFileURL(join(dir, 'locales.mjs')).href))
})

after(async () => {
  await rm(dir, { recursive: true, force: true })
})

test('no string names this computer', () => {
  // the presence line once read 'kwai is working…' — a developer's host name baked into the dictionary
  for (const [k, v] of Object.entries(en)) assert.ok(!/\bkwai\b/i.test(v), `${k}: ${v}`)
})

test('house style: no em or en dashes, no exclamation marks', () => {
  // the voice rule (AGENTS.md): plain sentences with commas, colons and full stops; the
  // 0.1.41 dictionary carried 66 strings with a dash
  const dashed = Object.keys(en).filter((k) => /[—–]/.test(en[k]))
  const loud = Object.keys(en).filter((k) => /[!！]/.test(en[k]))
  assert.deepEqual(loud, [], 'English strings with an exclamation mark')
  assert.deepEqual(dashed, [], 'English strings with a dash')
})

/** Keys built at run time from a prefix (`t(`style_${id}`)`, `t(`mood_${mood}`)`). */
const COMPUTED_PREFIXES = ['style_', 'mood_']

test('every key is used somewhere in the client or the host', async () => {
  // 102 keys of 0.1.41 were used nowhere (old onboarding slides, the first profile drawer, the
  // first About); a key nobody reads is a string nobody reviews
  const src = join(here, '..', 'src')
  let text = ''
  const walk = async (d) => {
    for (const entry of await readdir(d, { withFileTypes: true })) {
      const p = join(d, entry.name)
      if (entry.isDirectory()) await walk(p)
      else if (/\.(ts|tsx)$/.test(entry.name) && !p.endsWith(join('client', 'locales.ts'))) text += (await readFile(p, 'utf8')) + '\n'
    }
  }
  await walk(src)
  const dead = Object.keys(en).filter((k) => !COMPUTED_PREFIXES.some((p) => k.startsWith(p)) && !new RegExp(`\\b${k}\\b`).test(text))
  assert.deepEqual(dead, [], 'locale keys nothing reads')
})
