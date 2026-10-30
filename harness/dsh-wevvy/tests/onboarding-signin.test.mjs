// The sign-in door keeps the reference composition: screen one shows exactly the six
// reference elements (back, gear, bare mark, heading, identifier field, SMS line with
// Learn more, Continue) and nothing else; the code screen keeps its content and behaviour
// in the same shell. Checked as text over the TSX so a later edit cannot quietly add a
// seventh element back to screen one.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = readFileSync(fileURLToPath(new URL('../src/client/Onboarding.tsx', import.meta.url)), 'utf8')
const mark = readFileSync(fileURLToPath(new URL('../src/client/BrandMark.tsx', import.meta.url)), 'utf8')

/** The source between two markers, in file order. */
function between(from, to) {
  const a = src.indexOf(from)
  const b = src.indexOf(to, a)
  assert.ok(a >= 0 && b > a, `${from} .. ${to}`)
  return src.slice(a, b)
}

const identifier = between("signIn === 'identifier'", "signIn === 'code'")
const code = between("signIn === 'code'", "signIn === 'password'")

test('screen one shows exactly the six reference elements, in order', () => {
  const expected = [
    'doorTop(',
    "BrandMark, { size: 64, className: 'nm-login-mark' }",
    "t('obWelcomeTitle')",
    "t('obLoginIdentifier')",
    "t('obSmsNotice')",
    "link(PRIVACY_URL, t('obLearnMore'))",
    "t('obContinue')",
  ]
  let at = -1
  for (const piece of expected) {
    const next = identifier.indexOf(piece, at)
    assert.ok(next > at, `missing or out of order: ${piece}`)
    at = next
  }
})

test('screen one carries no secondary path, no China note and no terms line', () => {
  for (const gone of [
    "t('obOtherWay')",
    "t('obUseCode')",
    "t('obChangeIdentifier')",
    "t('identifierHint')",
    "t('obSignInTitle')",
    "t('obIdentifier')",
    "t('obTermsLead')",
    "t('obPrivacy')",
    "t('obTermsEnd')",
  ]) assert.ok(!identifier.includes(gone), `screen one must not show ${gone}`)
  // one Continue pill, the 48px token button, pale while the field is empty
  assert.ok(identifier.includes("className: 'nm-ob-wide nm-login-cta'"), 'the Continue pill')
  assert.ok(identifier.includes("disabled: busy || identifier.trim().length < 3"), 'Continue needs input')
})

test('the code screen keeps its content and behaviour in the same shell', () => {
  for (const kept of [
    'doorTop(',
    "t('obCodeTitle')",
    "t('obCodeSent'",
    'nm-login-resend',
    'CodeBoxes',
    "t('obHaveInvite')",
    "t('obInviteHint'",
    "t('obNext')",
    "t('obOtherWay')",
    "t('obChangeIdentifier')",
    "className: 'nm-ob-wide nm-login-cta'",
  ]) assert.ok(code.includes(kept), `code screen lost ${kept}`)
})

test('the gear menu holds the privacy policy at the existing target', () => {
  assert.ok(src.includes("t('obPrivacyPolicy')"), 'the menu label')
  assert.ok(src.includes('openLink(PRIVACY_URL)'), 'the existing target')
})

test('the mark on the door is the bare wevvy mark, no tile', () => {
  assert.ok(mark.includes('wevvy-mark-256.png'), 'the official bare mark asset')
  assert.ok(!mark.includes('<rect'), 'no tile behind the mark')
  assert.ok(!mark.includes('015CFB'), 'the old N gradient is gone')
})
