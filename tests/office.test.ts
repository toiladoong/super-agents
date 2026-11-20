import { expect, test } from 'claude-code/testing'

import { newActivity, officeAgents, roleOf } from '../hooks/agents'
import { MAX_DESKS, officeSvg } from '../hooks/office-svg'

const NOW = 1_800_000_000_000

test('role: leading word of the description, or anywhere in the agent type', async () => {
  expect(roleOf('reviewer · sửa lỗi coder A')).toBe('reviewer')
  expect(roleOf('Review the coder diff')).toBe('agent')
  expect(roleOf('Check the header', 'web-tester')).toBe('tester')
})

test('desks: main loop first, subagents by status, asking loops blocked, long-done ones gone', async () => {
  const activity = newActivity()
  activity.mainState = 'working'
  activity.asking.add('b')
  activity.since.set('c', { state: 'done', at: NOW - 11 * 60_000 })
  const agents = officeAgents(
    [
      { id: 'a', description: 'coder · webApp', type: 'general-purpose', status: 'running' },
      { id: 'b', description: 'Check header', type: 'web-tester', status: 'running' },
      { id: 'c', description: 'old', type: 'Explore', status: 'completed' }
    ],
    activity,
    NOW
  )
  expect(agents.map((agent) => [agent.key, agent.state, agent.role])).toEqual([
    ['main', 'working', 'agent'],
    ['a', 'working', 'coder'],
    ['b', 'blocked', 'tester']
  ])
})

test('the office svg escapes titles and stays under the Svg size limit', async () => {
  const many = Array.from({ length: 30 }, (_, index) => ({
    key: `k${index}`,
    title: `coder · <b>&"${index}`,
    agent: 'claude',
    role: 'coder',
    state: 'working' as const,
    since: NOW,
    tool: 'Bash',
    workspace: 'wt'
  }))
  const svg = officeSvg(many, 4, NOW)
  expect(svg.length).toBeLessThan(131072)
  expect(svg.includes('<b>')).toBe(false)
  expect(svg.includes(`+${30 - MAX_DESKS} agent nữa`)).toBe(true)
})

test('over the desk limit, a blocked agent still gets a desk', async () => {
  const working = Array.from({ length: MAX_DESKS }, (_, index) => ({
    key: `a${index}`, title: `coder · ${index}`, agent: 'claude', role: 'coder', state: 'working' as const, since: NOW, tool: null, workspace: 'wt'
  }))
  const blocked = { key: 'z', title: 'reviewer · cần duyệt', agent: 'claude', role: 'reviewer', state: 'blocked' as const, since: NOW, tool: null, workspace: 'wt' }
  expect(officeSvg([...working, blocked], 4, NOW).includes('reviewer · cần duyệt')).toBe(true)
})

test('the guide is open by default and the Hướng dẫn button hides and shows it on every surface', async ($) => {
  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const props = { title: 'Agent Office', isFocused: false, bodyColumns: 60, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 30 }, view: {} }
    const ui = await $.ui.mount({ plugin: 'super-agents', surface, component: 'Pane', requestId: 'agent-office', props, viewport: { columns: 60, rows: 30 } })
    expect((await ui.find({ type: 'Markdown' }))?.text).toContain('**`/super-agents:dev <ticket>`**')
    await ui.press({ key: 'help' })
    expect(await ui.find({ type: 'Markdown' })).toBeUndefined()
    await ui.press({ key: 'help' })
    expect((await ui.find({ type: 'Markdown' }))?.text).toContain('Cách đọc văn phòng')
    await ui.unmount()
  }
})
