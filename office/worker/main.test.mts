import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createTeamFile } from './main'

test('⚙ Team creates team.json from the defaults once, never over a file, never for a remote workspace', async () => {
  const repo = await mkdtemp(join(tmpdir(), 'office-team-'))
  const teamFile = join(repo, '.agents', 'team.json')
  const defaults = await readFile(new URL('../../skills/dev/team.default.json', import.meta.url), 'utf8')

  assert.equal(await createTeamFile({ path: repo, hostId: 'local' }), true)
  assert.equal(await readFile(teamFile, 'utf8'), defaults)

  await writeFile(teamFile, '{"language":"en"}')
  assert.equal(await createTeamFile({ path: repo, hostId: null }), false)
  assert.equal(await readFile(teamFile, 'utf8'), '{"language":"en"}')

  const remote = join(repo, 'remote')
  assert.equal(await createTeamFile({ path: remote, hostId: 'ssh:box' }), false)
  assert.equal(existsSync(remote), false)
})
