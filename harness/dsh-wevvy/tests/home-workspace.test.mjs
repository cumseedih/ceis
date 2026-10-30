// The home workspace folder moves once from the old name to the new one.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { homeWorkspaceDir } from '../lib/cloud.js'

const makeHome = () => mkdtemp(join(tmpdir(), 'wevvy-home-'))

test('happy path: the old folder moves and the app uses the new location', async () => {
  const home = await makeHome()
  const prev = join(home, 'nanoMuse')
  const { mkdir } = await import('node:fs/promises')
  await mkdir(prev, { recursive: true })
  await writeFile(join(prev, 'keep.txt'), 'mine')
  const folder = await homeWorkspaceDir(home)
  assert.equal(folder, join(home, 'wevvy'))
  assert.equal(await readFile(join(folder, 'keep.txt'), 'utf8'), 'mine')
  await rm(home, { recursive: true, force: true })
})

test('failure path: the move throws, the app falls back to the old location', async () => {
  const home = await makeHome()
  const prev = join(home, 'nanoMuse')
  const { mkdir } = await import('node:fs/promises')
  await mkdir(prev, { recursive: true })
  await writeFile(join(prev, 'keep.txt'), 'mine')
  const boom = async () => { throw new Error('EACCES') }
  const folder = await homeWorkspaceDir(home, boom)
  assert.equal(folder, prev)
  assert.equal(await readFile(join(folder, 'keep.txt'), 'utf8'), 'mine')
  await rm(home, { recursive: true, force: true })
})

test('both exist: nothing moves, nothing is deleted, the new location wins', async () => {
  const home = await makeHome()
  const { mkdir } = await import('node:fs/promises')
  await mkdir(join(home, 'nanoMuse'), { recursive: true })
  await mkdir(join(home, 'wevvy'), { recursive: true })
  await writeFile(join(home, 'nanoMuse', 'old.txt'), 'old')
  await writeFile(join(home, 'wevvy', 'new.txt'), 'new')
  const folder = await homeWorkspaceDir(home)
  assert.equal(folder, join(home, 'wevvy'))
  assert.equal(await readFile(join(home, 'nanoMuse', 'old.txt'), 'utf8'), 'old')
  assert.equal(await readFile(join(home, 'wevvy', 'new.txt'), 'utf8'), 'new')
  await rm(home, { recursive: true, force: true })
})
