// Visual editor for .agents/team.json (super-agents): one row per role, plus the repo's notes.
// Keeps every key it does not show (such as "_comment") and writes the file back as 2-space JSON.
;(async function () {
  const ROLE_ORDER = ['orchestrator', 'researcher', 'coder', 'reviewer', 'tester']
  const AGENTS = ['claude', 'codex', 'antigravity', 'cursor', 'opencode']
  // Suggested models per AI (checked 2026-11-19); the lists drift and depend on the account, so "nhập tên khác…" stays open.
  const MODELS = {
    claude: ['opus', 'sonnet', 'haiku'],
    codex: ['gpt-6.2-sol', 'gpt-6.2-astra', 'gpt-6-astra', 'gpt-6.1-terra', 'gpt-6-luna'],
    antigravity: [],
    cursor: [],
    opencode: ['anthropic/claude-opus-5-5', 'anthropic/claude-sonnet-5-5', 'openai/gpt-6.2-sol']
  }
  const CUSTOM = '__custom__'

  const rolesBox = document.getElementById('roles')
  const notesBox = document.getElementById('notes')
  const errorBox = document.getElementById('error')

  const session = await orca.document.session({
    decode: (content) => {
      try {
        return { team: JSON.parse(content.text), error: null }
      } catch (error) {
        return { team: null, error: error.message, text: content.text }
      }
    },
    // A file that does not parse is written back untouched.
    encode: (value) => ({ kind: 'text', text: value.team ? `${JSON.stringify(value.team, null, 2)}\n` : value.text })
  })

  function currentTeam() {
    return structuredClone(session.value.team)
  }

  function commit(team) {
    session.change({ team, error: null })
  }

  function roleNames(team) {
    const extraRoles = Object.keys(team.roles || {}).filter((role) => !ROLE_ORDER.includes(role))
    return [...ROLE_ORDER, ...extraRoles]
  }

  function handleRoleFieldChange(role, field, value) {
    const team = currentTeam()
    team.roles = team.roles || {}
    const roleConfig = { ...(team.roles[role] || {}) }
    if (value) roleConfig[field] = value
    else delete roleConfig[field]
    // A model name belongs to one AI: drop it whenever the AI changes.
    if (field === 'agent') delete roleConfig.model
    team.roles[role] = roleConfig
    commit(team)
    render()
  }

  function handleNoteChange(index, value) {
    const team = currentTeam()
    team.notes[index] = value
    commit(team)
  }

  function handleNoteRemove(index) {
    const team = currentTeam()
    team.notes.splice(index, 1)
    commit(team)
    render()
  }

  function handleNoteAdd() {
    const team = currentTeam()
    team.notes = [...(team.notes || []), '']
    commit(team)
    render()
    notesBox.querySelector('.note:last-child textarea')?.focus()
  }

  function drawAvatar(canvas, role, agent) {
    const ctx = canvas.getContext('2d')
    canvas.width = 16
    canvas.height = 16
    ctx.imageSmoothingEnabled = false
    const knownRole = window.sprites.SHIRT[role] ? role : 'agent'
    window.sprites.drawPerson(ctx, 1, 2, { role: knownRole, agent, state: 'working' }, 0)
  }

  function field(role, name, value, placeholder) {
    const input = document.createElement('input')
    input.value = value || ''
    input.placeholder = placeholder
    input.disabled = session.readOnly
    input.addEventListener('change', () => handleRoleFieldChange(role, name, input.value.trim()))
    return input
  }

  // options: [value, label] pairs; a value already in the file but not in the list is kept as its own option.
  function choice(value, options, handleChange) {
    const select = document.createElement('select')
    const known = options.some(([optionValue]) => optionValue === value)
    const allOptions = known || !value ? options : [...options, [value, value]]
    select.replaceChildren(...allOptions.map(([optionValue, label]) => new Option(label, optionValue)))
    select.value = value || ''
    select.disabled = session.readOnly
    select.addEventListener('change', () => handleChange(select))
    return select
  }

  function handleModelSelect(role, select) {
    if (select.value !== CUSTOM) return handleRoleFieldChange(role, 'model', select.value)
    const input = field(role, 'model', '', 'tên model')
    select.replaceWith(input)
    input.focus()
  }

  function modelField(role, agent, value) {
    const options = [['', 'mặc định'], ...(MODELS[agent] || []).map((name) => [name, name]), [CUSTOM, 'nhập tên khác…']]
    return choice(value, options, (select) => handleModelSelect(role, select))
  }

  function renderRoles(team) {
    rolesBox.replaceChildren(
      ...roleNames(team).map((role) => {
        const roleConfig = (team.roles || {})[role] || {}
        const agent = roleConfig.agent || 'claude'
        const row = document.createElement('div')
        row.className = 'role'
        const avatar = document.createElement('canvas')
        drawAvatar(avatar, role, agent)
        const label = document.createElement('b')
        label.textContent = role
        row.append(
          avatar,
          label,
          choice(agent, AGENTS.map((name) => [name, name]), (select) => handleRoleFieldChange(role, 'agent', select.value)),
          modelField(role, agent, roleConfig.model),
          field(role, 'role', roleConfig.role, 'vai mặc định của plugin')
        )
        return row
      })
    )
  }

  function renderNotes(team) {
    notesBox.replaceChildren(
      ...(team.notes || []).map((note, index) => {
        const row = document.createElement('div')
        row.className = 'note'
        const text = document.createElement('textarea')
        text.value = note
        text.disabled = session.readOnly
        text.addEventListener('change', () => handleNoteChange(index, text.value))
        const remove = document.createElement('button')
        remove.textContent = '✕'
        remove.title = 'Xoá luật này'
        remove.disabled = session.readOnly
        remove.addEventListener('click', () => handleNoteRemove(index))
        row.append(text, remove)
        return row
      })
    )
  }

  function render() {
    const { team, error } = session.value
    errorBox.style.display = error ? 'block' : 'none'
    errorBox.textContent = error ? `File không phải JSON hợp lệ (${error}). Sửa ở chế độ Source trước.` : ''
    if (!team) return
    renderRoles(team)
    renderNotes(team)
  }

  document.getElementById('add-note').addEventListener('click', handleNoteAdd)
  session.onReplace(render)
  render()
})()
