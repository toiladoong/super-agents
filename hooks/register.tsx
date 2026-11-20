import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { OfficeView } from '../types'
import { MAIN_KEY, newActivity, officeAgents } from './agents'
import { OFFICE_HELP } from './help'
import { TEAM_FILE, TEXT, languageOf } from './i18n'
import type { Lang } from './i18n'
import { DENY_REASON, EDIT_TOOLS, afterPrompt, afterReviewCommand, afterTurn, guardStatus, suggestionAfterTurn } from './review-guard'
import type { ReviewGuard } from './review-guard'
import { elapsed, officeSvg } from './office-svg'

const PANE = 'agent-office'
// $.agent.list is in-process and cheap; 2 s keeps the desks live while the pane is open.
const POLL_MS = 2000

const showHelp = atom({ plugin: 'super-agents', key: 'showHelp' } as const, true)
// The answer to propose after the last turn while review --here runs; null otherwise.
const reviewSuggestion = atom({ plugin: 'super-agents', key: 'reviewSuggestion' } as const, null as string | null)
const reviewGuard = atom({ plugin: 'super-agents', key: 'reviewGuard' } as const, { isActive: false, isTurnAllowed: false })
const view = atom({ plugin: 'super-agents', key: 'view' } as const, { agents: [], error: null, now: 0, lang: 'vi' as Lang })

// What the hooks saw of each loop; module memory, so a reload starts it over (desks reappear on the next refresh).
const activity = newActivity()
// Polls only while the pane is open; a reload starts the module over, and the next draw of the pane starts it again.
let pollTimer: Timer | undefined

const loopKey = (agentId: string | undefined) => agentId ?? MAIN_KEY

// The repo's `language` in .agents/team.json (Vietnamese when there is none).
async function readLanguage($: EngineInterface): Promise<Lang> {
  return languageOf(await $.fs.read(TEAM_FILE).catch(() => null))
}

async function refresh($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const lang = await readLanguage($)
  let next: OfficeView
  try {
    next = { agents: officeAgents(await $.agent.list(), activity, now, lang), error: null, now, lang }
  } catch (error) {
    next = { agents: [], error: `${TEXT[lang].readFailed}${String(error).slice(0, 200)}`, now, lang }
  }
  // Redraw only when something a reader sees changed (elapsed times move by the minute).
  const minute = (value: OfficeView) => JSON.stringify({ ...value, now: Math.floor(value.now / 60000) })
  await update($, view, (previous) => (minute(previous) === minute(next) ? previous : next))
}

async function setReviewGuard($: EngineInterface, next: ReviewGuard): Promise<void> {
  await update($, reviewGuard, () => next)
  await $.ui.status(guardStatus(next, await readLanguage($)))
}

export const register: Register = (on) => {
  // review --here: lock edits until the person answers "sửa …" (rules in review-guard.ts).
  // Claude Code's own after-turn suggestion (what Orca's chat box shows): replaced by the review's next answer.
  on('prompt.suggest', async ($, e, next) => {
    const suggestion = await read($, reviewSuggestion)
    return suggestion ? next({ ...e, text: suggestion }) : next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const state = await read($, reviewGuard)
    const nextState = afterPrompt(state, e.text)
    if (nextState !== state) await setReviewGuard($, nextState)
    return next(e)
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'office', description: 'Mở văn phòng pixel: phiên Claude Code này và các subagent của nó' })
    return next(e)
  })

  on('command.run', { command: 'office' }, async ($) => {
    await $.ui.open({ id: PANE, title: 'Agent Office' })
    await refresh($)
    return { text: TEXT[await readLanguage($)].opened }
  })

  // turn.start carries no agentId: it is the main loop's turn.
  on('turn.start', async ($, e, next) => {
    activity.mainState = 'working'
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) activity.mainState = 'waiting'
    activity.asking.delete(loopKey(e.agentId))
    if (!e.agentId) {
      const guardState = await read($, reviewGuard)
      const nextGuard = afterTurn(guardState, e.answer)
      if (nextGuard !== guardState) await setReviewGuard($, nextGuard)
      const suggestion = suggestionAfterTurn(guardState, e.answer, await readLanguage($))
      await update($, reviewSuggestion, () => suggestion)
      // The box takes a suggestion only once the turn has ended, so offer it a moment after.
      if (suggestion) $.clock.after(400, () => void $.prompt.suggest({ text: suggestion }))
    }
    return next(e)
  })

  // An `ask` puts the call to the person: that loop raises its hand until the call runs or the turn ends.
  // Also the review --here guard: if this hook fails before deciding, the call is refused rather than let through.
  on('tool.check', async ($, e, next) => {
    if (EDIT_TOOLS.has(e.tool)) {
      const guardState = await read($, reviewGuard)
      if (guardState.isActive && !guardState.isTurnAllowed) return { decision: 'deny' as const, reason: DENY_REASON }
    }
    const result = await next(e)
    if (result.decision === 'ask') activity.asking.add(loopKey(e.agentId))
    return result
  }).catch(($, e, next) => (next.called ? next(e) : { decision: 'deny' as const, reason: 'super-agents: không kiểm tra được khoá review, tạm không cho chạy.' }))

  on('tool.call', async ($, e, next) => {
    const key = loopKey(e.agentId)
    activity.asking.delete(key)
    activity.lastTool.set(key, e.tool)
    if (e.tool === 'Skill') {
      // Claude calling the review skill with --here / --off switches the review guard.
      const state = await read($, reviewGuard)
      const nextState = afterReviewCommand(state, e.skill, e.args ?? '')
      if (nextState !== state) await setReviewGuard($, nextState)
    }
    return next(e)
  })

  // Closing must never be blocked by this hook failing.
  on('ui.close', { id: PANE }, async ($, e, next) => {
    pollTimer?.cancel()
    pollTimer = undefined
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    // Started here, not on /office: a plugin reload drops timers while the pane stays open, and the pane is drawn again.
    pollTimer ??= $.clock.every(POLL_MS, () => void refresh($))
    const office = await read($, view)
    const isHelpShown = await read($, showHelp)
    const handleToggleHelp = () => void update($, showHelp, (shown) => !shown)
    if (e.surface === 'terminal') {
      const { Box, Button, Markdown, Text } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          {office.error && <Text color="red">{office.error}</Text>}
          {office.agents.map((agent) => (
            <Text dimColor={agent.state === 'done'}>
              {agent.state === 'blocked' ? '!' : '•'} {agent.role.padEnd(12)} {TEXT[office.lang].states[agent.state].padEnd(9)}{' '}
              {elapsed(agent.since, office.now).padEnd(6)} {agent.title}
            </Text>
          ))}
          <Button key="help" onPress={handleToggleHelp}>{isHelpShown ? TEXT[office.lang].hideHelp : TEXT[office.lang].showHelp}</Button>
          {isHelpShown && <Markdown text={OFFICE_HELP[office.lang]} />}
        </Box>
      )
    }
    const { Box, Button, Markdown, Svg, Text } = $.ui.resolve(e)
    // About 24 cells hold one desk at the drawn scale; 1 to 4 desks a row.
    const columns = Math.min(4, Math.max(1, Math.floor((e.props.bodyColumns ?? 48) / 24)))
    return (
      <Box flexDirection="column">
        {office.error && <Text color="red">{office.error}</Text>}
        <Svg
          source={officeSvg(office.agents, columns, office.now, office.lang)}
          alt={`${office.agents.length} agent: ${office.agents.map((agent) => `${agent.role} ${TEXT[office.lang].states[agent.state]}`).join(', ')}`}
          isInteractive
        />
          <Button key="help" onPress={handleToggleHelp}>{isHelpShown ? TEXT[office.lang].hideHelp : TEXT[office.lang].showHelp}</Button>
          {isHelpShown && <Markdown text={OFFICE_HELP[office.lang]} />}
      </Box>
    )
  })
}
