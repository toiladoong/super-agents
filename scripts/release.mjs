// Releases a version in one go: `node scripts/release.mjs 0.13.0`.
// Sets the version of the Claude, Codex and Orca plugins, commits and tags it, adds that commit as the newest release of
// orca-catalog.json (what the orca:// install link reads), commits, and pushes the branch and the tag.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error('Usage: node scripts/release.mjs <x.y.z>')
  process.exit(1)
}
// `shell` finds orca / git as .cmd on Windows too; the arguments are fixed strings and a checked version.
const run = (command, args) => execFileSync(command, args, { encoding: 'utf8', shell: true }).trim()
if (run('git', ['status', '--porcelain'])) {
  console.error('Commit or stash your changes first.')
  process.exit(1)
}
// A push rejected after the tag would leave a half release behind: check the remote first.
run('git', ['fetch', '-q'])
if (/\bbehind\b/.test(run('git', ['status', '-sb']).split('\n')[0])) {
  console.error('The branch is behind its remote: git pull first.')
  process.exit(1)
}

const editJson = (file, change) => {
  const json = JSON.parse(readFileSync(file, 'utf8'))
  change(json)
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`)
}
for (const file of ['orca-plugin.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json']) {
  editJson(file, (json) => (json.version = version))
}
run('git', ['commit', '-qam', `"Release v${version}"`])
run('git', ['tag', `v${version}`])

// The release entry hashes the files of HEAD, the tagged commit.
const { entry } = JSON.parse(run('orca', ['plugin', 'release-entry', '.', '--json'])).result
editJson('orca-catalog.json', (catalog) => {
  const plugin = catalog.plugins[0]
  plugin.releases = [entry, ...plugin.releases.filter((release) => release.version !== version)].slice(0, 32)
})
run('git', ['commit', '-qam', `"orca-catalog: v${version}"`])
run('git', ['push', '-q'])
run('git', ['push', '-q', 'origin', `v${version}`])
console.log(`Released v${version} (${entry.commit.slice(0, 7)}).`)
