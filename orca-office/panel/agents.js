// Agent state from Orca, read by the plugin's worker through `orca worktree ps` (every workspace, with each session's
// name, AI and tool): refreshed every few seconds while the panel shows, and at once when an agent changes state.
// Exposes window.agentStore = { list(), load(), onChange(fn) }.
;(function () {
  // A finished agent stays at its desk this long, then leaves the office.
  const DONE_LINGER_MS = 10 * 60 * 1000
  const POLL_MS = 3000
  // Workers are titled "<role> · <part>" by the dev skill; a leading role word wins, else the first one in the title
  // ("SG-1 coder fix …", as orchestrators sometimes name tasks their own way).
  const LEADING_ROLE = /^(orchestrator|researcher|coder|reviewer|skeptic|tester)\b/i
  const ANY_ROLE = /\b(orchestrator|researcher|coder|reviewer|skeptic|tester)\b/i

  let agents = []
  let isRefreshing = false
  const listeners = []

  function roleOf(title) {
    const match = LEADING_ROLE.exec(title || '') || ANY_ROLE.exec(title || '')
    return match ? match[1].toLowerCase() : 'agent'
  }

  function notify() {
    listeners.forEach((listener) => listener())
  }

  function list() {
    const now = Date.now()
    return agents.filter((agent) => agent.state !== 'done' || now - agent.stateStartedAt < DONE_LINGER_MS)
  }

  // One request at a time: a slow Orca must not pile up `orca` processes in the worker.
  async function refresh() {
    if (isRefreshing || document.hidden) return
    isRefreshing = true
    try {
      const snapshot = await orca.plugin.request('agents.snapshot')
      // The orchestrator's tab gets no title of ours (Orca names it after the chat): it is the one workers report to.
      const parents = new Set(snapshot.agents.map((agent) => agent.parentKey).filter(Boolean))
      agents = snapshot.agents
        .map((agent) => {
          const role = roleOf(agent.title)
          return { ...agent, role: role === 'agent' && parents.has(agent.key) ? 'orchestrator' : role }
        })
        .sort((a, b) => a.key.localeCompare(b.key))
      notify()
    } finally {
      isRefreshing = false
    }
  }

  async function load() {
    await refresh()
    setInterval(() => void refresh().catch(() => {}), POLL_MS)
    orca.on('agent.status.changed', () => void refresh().catch(() => {}))
  }

  window.agentStore = {
    list,
    load,
    roleOf,
    onChange: (listener) => listeners.push(listener)
  }
})()
