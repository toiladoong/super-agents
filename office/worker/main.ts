// The plugin's worker: it opens files (editor.open needs workspace:write; panels get none) and reads the agents of
// every workspace through the orca CLI, which knows each session's name, AI and tool (the panel host API does not).
// Orca transpiles this file when it loads: no build step.
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { OrcaWorkerApi } from 'orca/worker'

import { NEW_WALLET, checkIn, checkInCoins, liveStreak, reward, spend } from './wallet'
import type { RunTasks, Wallet } from './wallet'

const TEAM_PATH = '.agents/team.json'
// The super-agents defaults, next to this plugin in the same repo (missing when only this folder was installed).
const DEFAULT_TEAM_URL = new URL('../../skills/dev/team.default.json', import.meta.url)

const MESSAGES = {
  vi: {
    noWorkspace: 'Chưa có workspace nào đang mở.',
    noMatch: (name: string) => `Không tìm thấy workspace "${name}".`,
    opened: `Đã mở ${TEAM_PATH}. Nếu đang hiện JSON, chọn "Team" ở nút chuyển cạnh Source.`,
    created: `Repo chưa có ${TEAM_PATH}: đã tạo từ bản mặc định của super-agents (chưa commit) và mở ra.`,
    failed: (reason: string) =>
      `Không mở được ${TEAM_PATH} (${reason}). Repo chưa có file này thì chép team.default.json của plugin super-agents vào.`
  },
  en: {
    noWorkspace: 'No workspace is open.',
    noMatch: (name: string) => `Workspace "${name}" not found.`,
    opened: `Opened ${TEAM_PATH}. If it shows JSON, pick "Team" in the toggle next to Source.`,
    created: `The repo had no ${TEAM_PATH}: created it from the super-agents defaults (not committed) and opened it.`,
    failed: (reason: string) =>
      `Could not open ${TEAM_PATH} (${reason}). If the repo has no such file, copy the super-agents plugin's team.default.json there.`
  }
}

type PsAgent = {
  paneKey: string
  parentPaneKey?: string | null
  state: string
  agentType?: string | null
  displayName?: string | null
  taskTitle?: string | null
  conversationName?: string | null
  toolName?: string | null
  stateStartedAt?: number
}
type PsWorktree = { displayName?: string; agents?: PsAgent[] }

// Orca's own CLI beside the Orca app this worker runs in (resources/bin); ORCA_BIN overrides, PATH is the last resort.
function orcaCommand(): string {
  const appDir = dirname(process.execPath)
  const candidates = [
    process.env.ORCA_BIN,
    join(appDir, 'resources', 'bin', 'orca.exe'),
    join(appDir, '..', 'Resources', 'bin', 'orca')
  ]
  return candidates.find((candidate): candidate is string => Boolean(candidate && existsSync(candidate))) ?? 'orca'
}

function runOrca(args: string[]): Promise<string> {
  // The worker inherits ELECTRON_RUN_AS_NODE, which would make orca.exe run its arguments as a Node script.
  const { ELECTRON_RUN_AS_NODE: _runAsNode, ...inherited } = process.env
  // The worker's environment is trimmed; the CLI finds the Orca runtime through APPDATA on Windows.
  const home = homedir()
  const env =
    process.platform === 'win32'
      ? { ...inherited, USERPROFILE: inherited.USERPROFILE ?? home, APPDATA: inherited.APPDATA ?? join(home, 'AppData', 'Roaming'), LOCALAPPDATA: inherited.LOCALAPPDATA ?? join(home, 'AppData', 'Local') }
      : { ...inherited, HOME: inherited.HOME ?? home }
  return new Promise((resolve, reject) => {
    execFile(
      orcaCommand(),
      args,
      { env, timeout: 10000, maxBuffer: 16 * 1024 * 1024 },
      (error: Error | null, stdout: string, stderr: string) =>
        error ? reject(new Error(`${error.message} ${String(stderr).slice(0, 300)} ${String(stdout).slice(0, 300)}`)) : resolve(stdout)
    )
  })
}

async function agentsSnapshot() {
  const worktrees: PsWorktree[] = JSON.parse(await runOrca(['worktree', 'ps', '--json']))?.result?.worktrees ?? []
  return worktrees.flatMap((worktree) =>
    (worktree.agents ?? []).map((agent) => ({
      key: agent.paneKey,
      parentKey: agent.parentPaneKey ?? null,
      title: agent.displayName || agent.taskTitle || agent.conversationName || '',
      // The chat's own name keeps the role when a reused worker gets a task titled without it.
      chatName: agent.conversationName ?? '',
      agent: agent.agentType || 'agent',
      state: agent.state,
      stateStartedAt: agent.stateStartedAt ?? Date.now(),
      tool: agent.toolName ?? null,
      workspace: worktree.displayName ?? ''
    }))
  )
}

// The focused workspace: by the id readContext gives since host API 1.7, else by name, then by branch.
async function focusedWorkspace(orca: OrcaWorkerApi) {
  const context = await orca.host.call('workspace.readContext', {})
  if (!context) return { context, workspace: undefined }
  const { workspaces } = await orca.host.call('workspace.list', {})
  const workspace =
    workspaces.find((candidate) => candidate.id === context.workspaceId) ??
    workspaces.find((candidate) => candidate.name === context.displayName) ??
    workspaces.find((candidate) => candidate.branch === context.branch)
  return { context, workspace }
}

// The panel's language: `language` in the focused workspace's team.json (the one the AI replies in), else the plugin
// setting, else Vietnamese. `workspace`: the focused one when the caller already looked it up.
async function panelLanguage(orca: OrcaWorkerApi, workspace?: { path: string }): Promise<'vi' | 'en'> {
  workspace ??= (await focusedWorkspace(orca).catch(() => ({ workspace: undefined }))).workspace
  const teamJson = workspace ? await readFile(join(workspace.path, TEAM_PATH), 'utf8').catch(() => null) : null
  let language: unknown
  try {
    language = teamJson ? JSON.parse(teamJson).language : undefined
  } catch {}
  language ??= await orca.settings.get('language').catch(() => 'vi')
  return language === 'en' ? 'en' : 'vi'
}

// A repo without team.json gets the plugin's defaults, so the Team editor has something to edit. Only on this machine:
// a remote (SSH) workspace's path is not a local folder. 'wx' never overwrites a file made in the meantime.
export async function createTeamFile(workspace: { path: string; hostId: string | null }): Promise<boolean> {
  const teamFile = join(workspace.path, TEAM_PATH)
  if ((workspace.hostId ?? 'local') !== 'local' || existsSync(teamFile)) return false
  const defaults = await readFile(DEFAULT_TEAM_URL, 'utf8').catch(() => null)
  if (!defaults) return false
  await mkdir(dirname(teamFile), { recursive: true })
  await writeFile(teamFile, defaults, { flag: 'wx' })
  return true
}

// The Runs (tickets) not paid yet, each with its tasks' status, from the orca CLI.
async function unpaidRuns(paidRuns: string[]): Promise<RunTasks[]> {
  type RunRow = { id: string; legacy?: boolean }
  const runs: RunRow[] = JSON.parse(await runOrca(['orchestration', 'run-list', '--json']))?.result?.runs ?? []
  const open = runs.filter((run) => !run.legacy && !paidRuns.includes(run.id))
  return Promise.all(
    open.map(async (run) => {
      const listing = JSON.parse(await runOrca(['orchestration', 'task-list', '--run', run.id, '--json']))
      return { id: run.id, tasks: listing?.result?.tasks ?? [] }
    })
  )
}

const WALLET_KEY = 'wallet'

// Today on this machine's clock, as 'YYYY-MM-DD'.
function localDay(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// What the panel shows of a wallet: coins, and the check-in button (done today?, streak, what the next one pays).
function walletView(wallet: Wallet) {
  const today = localDay()
  const streak = liveStreak(wallet, today)
  const isCheckedIn = wallet.checkedInOn === today
  return { coins: wallet.coins, isCheckedIn, streak, nextCheckIn: isCheckedIn ? 0 : checkInCoins(streak + 1) }
}

export default function activate(orca: OrcaWorkerApi): void {
  // One wallet change at a time, so a sync and a purchase never overwrite each other.
  let walletQueue: Promise<unknown> = Promise.resolve()
  function withWallet<T>(change: (wallet: Wallet) => Promise<{ wallet: Wallet; answer: T }>): Promise<T> {
    const next = walletQueue.then(async () => {
      const wallet = ((await orca.storage.get(WALLET_KEY)) as Wallet | null) ?? NEW_WALLET
      const result = await change(wallet)
      if (result.wallet !== wallet) await orca.storage.set(WALLET_KEY, result.wallet)
      return result.answer
    })
    walletQueue = next.catch(() => {})
    return next
  }

  // Pays the Orca tasks / Runs finished since the last sync.
  orca.panels.handle('wallet.sync', () =>
    withWallet(async (wallet) => {
      // The orca CLI failing pays nothing this time, but the wallet (coins, check-in) still comes back.
      const paid = reward(wallet, await unpaidRuns(wallet.paidRuns).catch(() => []))
      return { wallet: paid.earned ? paid.wallet : wallet, answer: { ...walletView(paid.wallet), earned: paid.earned } }
    })
  )
  orca.panels.handle('wallet.spend', (input) =>
    withWallet(async (wallet) => {
      const cost = Number((input as { cost?: unknown } | undefined)?.cost)
      const after = spend(wallet, cost)
      return after ? { wallet: after, answer: { ok: true, ...walletView(after) } } : { wallet, answer: { ok: false, ...walletView(wallet) } }
    })
  )
  orca.panels.handle('wallet.checkIn', () =>
    withWallet(async (wallet) => {
      const done = checkIn(wallet, localDay())
      return done
        ? { wallet: done.wallet, answer: { ...walletView(done.wallet), earned: done.earned } }
        : { wallet, answer: { ...walletView(wallet), earned: 0 } }
    })
  )
  orca.panels.handle('agents.snapshot', async () => ({ agents: await agentsSnapshot() }))
  orca.panels.handle('language.get', async () => ({ language: await panelLanguage(orca) }))

  // Opens the focused workspace's team.json; the panel shows the answer in the panel's language.
  orca.panels.handle('team.open', async () => {
    const { context, workspace } = await focusedWorkspace(orca)
    const say = MESSAGES[await panelLanguage(orca, workspace)]
    if (!context) return { opened: false, message: say.noWorkspace }
    if (!workspace) return { opened: false, message: say.noMatch(context.displayName) }
    try {
      const isCreated = await createTeamFile(workspace)
      await orca.host.call('editor.open', { workspaceId: workspace.id, path: TEAM_PATH })
      return { opened: true, message: isCreated ? say.created : say.opened }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      return { opened: false, message: say.failed(reason) }
    }
  })
}
