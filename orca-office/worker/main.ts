// The plugin's worker: it opens files (editor.open needs workspace:write; panels get none) and reads the agents of
// every workspace through the orca CLI, which knows each session's name, AI and tool (the panel host API does not).
// Orca transpiles this file when it loads: no build step.
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { OrcaWorkerApi } from 'orca/worker'

const TEAM_PATH = '.agents/team.json'

type PsAgent = {
  paneKey: string
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
      title: agent.displayName || agent.taskTitle || agent.conversationName || '',
      agent: agent.agentType || 'agent',
      state: agent.state,
      stateStartedAt: agent.stateStartedAt ?? Date.now(),
      tool: agent.toolName ?? null,
      workspace: worktree.displayName ?? ''
    }))
  )
}

export default function activate(orca: OrcaWorkerApi): void {
  orca.panels.handle('agents.snapshot', async () => ({ agents: await agentsSnapshot() }))

  // Opens the focused workspace's team.json; the panel shows the answer.
  orca.panels.handle('team.open', async () => {
    const context = await orca.host.call('workspace.readContext', {})
    if (!context) return { opened: false, message: 'Chưa có workspace nào đang mở.' }
    const { workspaces } = await orca.host.call('workspace.list', {})
    // readContext gives no id: match the focused workspace by its name, then by branch.
    const workspace =
      workspaces.find((candidate) => candidate.name === context.displayName) ??
      workspaces.find((candidate) => candidate.branch === context.branch)
    if (!workspace) return { opened: false, message: `Không tìm thấy workspace "${context.displayName}".` }
    try {
      await orca.host.call('editor.open', { workspaceId: workspace.id, path: TEAM_PATH })
      return { opened: true, message: `Đã mở ${TEAM_PATH}. Nếu đang hiện JSON, chọn "Team" ở nút chuyển cạnh Source.` }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      return { opened: false, message: `Không mở được ${TEAM_PATH} (${reason}). Repo chưa có file này thì chép team.default.json của plugin super-agents vào.` }
    }
  })
}
