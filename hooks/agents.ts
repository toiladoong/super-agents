// Turns this Claude Code session's agents (the main loop, its subagents and teammates) into the office's desks.
import type { AgentInfo, AgentStatus } from 'claude-code'

import type { OfficeAgent, OfficeState } from '../types'
import { TEXT } from './i18n'
import type { Lang } from './i18n'

// A finished agent stays at its desk this long, then leaves the office.
export const DONE_LINGER_MS = 10 * 60 * 1000
export const MAIN_KEY = 'main'

const ROLES = 'orchestrator|researcher|coder|reviewer|skeptic|tester'
// A description named "<role> · <part>" counts by its leading word, else by a role word in it ("SG-1 coder fix");
// then an agent type counts anywhere ("web-tester").
const LEADING_ROLE = new RegExp(`^(${ROLES})\\b`, 'i')
const ROLE_WORD = new RegExp(`\\b(${ROLES})\\b`, 'i')
const ANY_ROLE = new RegExp(`(${ROLES})`, 'i')

const STATE_OF: Record<AgentStatus, OfficeState> = {
  pending: 'waiting',
  running: 'working',
  waiting: 'waiting',
  idle: 'waiting',
  completed: 'done',
  failed: 'done',
  killed: 'done'
}

export function roleOf(description: string, type = ''): string {
  const match = LEADING_ROLE.exec(description) ?? ROLE_WORD.exec(description) ?? ANY_ROLE.exec(type)
  return match?.[1]?.toLowerCase() ?? 'agent'
}

export type LoopActivity = {
  // Since when each desk is in its state, by key; kept across refreshes so the elapsed time is right.
  since: Map<string, { state: OfficeState; at: number }>
  // Loops waiting on the person's permission (tool.check asked), by key.
  asking: Set<string>
  // The last tool each loop called, by key.
  lastTool: Map<string, string>
  mainState: OfficeState
}

export function newActivity(): LoopActivity {
  return { since: new Map(), asking: new Set(), lastTool: new Map(), mainState: 'waiting' }
}

export function officeAgents(list: AgentInfo[], activity: LoopActivity, now: number, lang: Lang = 'vi'): OfficeAgent[] {
  const desks: Omit<OfficeAgent, 'since'>[] = [
    { key: MAIN_KEY, title: TEXT[lang].mainSession, agent: 'claude', role: 'agent', state: activity.mainState, tool: null, workspace: 'Claude Code' },
    ...list.map((info) => ({
      key: info.id,
      title: info.name ? `${info.description} (${info.name})` : info.description,
      agent: 'claude',
      role: roleOf(info.description, info.type),
      state: STATE_OF[info.status] ?? 'waiting',
      tool: null,
      workspace: info.type
    }))
  ]
  const agents = desks.map((desk) => {
    const state = activity.asking.has(desk.key) ? 'blocked' : desk.state
    const seen = activity.since.get(desk.key)
    const since = seen && seen.state === state ? seen.at : now
    activity.since.set(desk.key, { state, at: since })
    return { ...desk, state, since, tool: activity.lastTool.get(desk.key) ?? null }
  })
  return agents.filter((agent) => agent.state !== 'done' || now - agent.since < DONE_LINGER_MS)
}
