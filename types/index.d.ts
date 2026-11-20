export type OfficeState = 'working' | 'blocked' | 'waiting' | 'done'

export type OfficeAgent = {
  key: string
  title: string
  agent: string
  role: string
  state: OfficeState
  since: number
  tool: string | null
  workspace: string
}

export type OfficeView = { agents: OfficeAgent[]; error: string | null; now: number }

declare module 'claude-code' {
  interface PluginState {
    'super-agents': { view: OfficeView; showHelp: boolean; reviewGuard: { isActive: boolean; isTurnAllowed: boolean }; reviewSuggestion: string | null }
  }
}
