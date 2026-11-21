// The plugin's worker: it opens files (editor.open needs workspace:write; panels get none) and reads the agents of
// every workspace through the orca CLI, which knows each session's name, AI and tool (the panel host API does not).
// Orca transpiles this file when it loads: no build step.
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { OrcaWorkerApi } from 'orca/worker'

const TEAM_PATH = '.agents/team.json'

const MESSAGES = {
  vi: {
    noWorkspace: 'Chưa có workspace nào đang mở.',
    noMatch: (name: string) => `Không tìm thấy workspace "${name}".`,
    opened: `Đã mở ${TEAM_PATH}. Nếu đang hiện JSON, chọn "Team" ở nút chuyển cạnh Source.`,
    failed: (reason: string) =>
      `Không mở được ${TEAM_PATH} (${reason}). Repo chưa có file này thì chép team.default.json của plugin super-agents vào.`
  },
  en: {
    noWorkspace: 'No workspace is open.',
    noMatch: (name: string) => `Workspace "${name}" not found.`,
    opened: `Opened ${TEAM_PATH}. If it shows JSON, pick "Team" in the toggle next to Source.`,
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
// setting, else Vietnamese.
async function panelLanguage(orca: OrcaWorkerApi): Promise<'vi' | 'en'> {
  const { workspace } = await focusedWorkspace(orca).catch(() => ({ workspace: undefined }))
  const teamJson = workspace ? await readFile(join(workspace.path, TEAM_PATH), 'utf8').catch(() => null) : null
  let language: unknown
  try {
    language = teamJson ? JSON.parse(teamJson).language : undefined
  } catch {}
  language ??= await orca.settings.get('language').catch(() => 'vi')
  return language === 'en' ? 'en' : 'vi'
}

export default function activate(orca: OrcaWorkerApi): void {
  orca.panels.handle('agents.snapshot', async () => ({ agents: await agentsSnapshot() }))
  orca.panels.handle('language.get', async () => ({ language: await panelLanguage(orca) }))

  // Opens the focused workspace's team.json; the panel shows the answer in the panel's language.
  orca.panels.handle('team.open', async () => {
    const say = MESSAGES[await panelLanguage(orca)]
    const { context, workspace } = await focusedWorkspace(orca)
    if (!context) return { opened: false, message: say.noWorkspace }
    if (!workspace) return { opened: false, message: say.noMatch(context.displayName) }
    try {
      await orca.host.call('editor.open', { workspaceId: workspace.id, path: TEAM_PATH })
      return { opened: true, message: say.opened }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      return { opened: false, message: say.failed(reason) }
    }
  })
}
