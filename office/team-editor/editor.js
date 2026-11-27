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
  const environmentsBox = document.getElementById('environments')
  const errorBox = document.getElementById('error')
  const changeBox = document.getElementById('change')
  const t = () => window.officeI18n.t

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

  // Any other edit retires the last notice, so an old Undo never reverts later edits.
  function commit(team) {
    session.change({ team, error: null })
    changeBox.hidden = true
  }

  function roleNames(team) {
    const extraRoles = Object.keys(team.roles || {}).filter((role) => !ROLE_ORDER.includes(role))
    return [...ROLE_ORDER, ...extraRoles]
  }

  // A short notice under the roles, with an optional undo.
  function showChange(message, handleUndo) {
    changeBox.hidden = false
    changeBox.replaceChildren(message)
    // The notice sits above the roles: bring it into view when the edit was further down (an environment).
    changeBox.scrollIntoView({ block: 'nearest' })
    if (!handleUndo) return
    const undo = document.createElement('button')
    undo.textContent = t().undo
    undo.addEventListener('click', handleUndo)
    changeBox.append(' ', undo)
  }

  function handleRoleFieldChange(role, field, value) {
    const team = currentTeam()
    team.roles = team.roles || {}
    const before = team.roles[role]
    const roleConfig = { ...(team.roles[role] || {}) }
    if (value) roleConfig[field] = value
    else delete roleConfig[field]
    // A model name belongs to one AI: drop it whenever the AI changes.
    if (field === 'agent') delete roleConfig.model
    team.roles[role] = roleConfig
    commit(team)
    if (field === 'agent') {
      const handleUndo = () => {
        const restored = currentTeam()
        if (before) restored.roles[role] = before
        else delete restored.roles[role]
        commit(restored)
        changeBox.hidden = true
        render()
      }
      showChange(t().agentChanged(role, before?.agent || 'claude', value || 'claude'), handleUndo)
    }
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

  // Test environments (`environments` in team.json: name → URL), what `env <name>` of /dev and /review picks.
  const ENVIRONMENT_NAMES = ['develop', 'staging', 'production']
  // Kept as an object; edited as rows so a rename keeps the order.
  function handleEnvironmentChange(index, name, url) {
    const team = currentTeam()
    const rows = Object.entries(team.environments || {})
    const newName = name.trim()
    // `env <name>` needs one plain word; a name taken by another row would overwrite that row's URL.
    const isTaken = rows.some(([other], at) => at !== index && other === newName)
    if (!/^[A-Za-z0-9_-]+$/.test(newName) || isTaken) {
      showChange(t().environmentNameRefused(newName), null)
      render()
      return
    }
    rows[index] = [newName, url.trim()]
    team.environments = Object.fromEntries(rows)
    commit(team)
  }

  function handleEnvironmentRemove(index) {
    const team = currentTeam()
    team.environments = Object.fromEntries(Object.entries(team.environments || {}).filter((_, at) => at !== index))
    commit(team)
    render()
  }

  function handleEnvironmentAdd() {
    const team = currentTeam()
    const names = Object.keys(team.environments || {})
    const name = ENVIRONMENT_NAMES.find((candidate) => !names.includes(candidate)) || `env${names.length + 1}`
    team.environments = { ...(team.environments || {}), [name]: '' }
    commit(team)
    render()
    environmentsBox.querySelector('.environment:last-child input[type=url]')?.focus()
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
    const input = field(role, 'model', '', t().modelPlaceholder)
    select.replaceWith(input)
    input.focus()
  }

  function modelField(role, agent, value) {
    const options = [['', t().modelDefault], ...(MODELS[agent] || []).map((name) => [name, name]), [CUSTOM, t().modelCustom]]
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
          field(role, 'role', roleConfig.role, t().rolePlaceholder)
        )
        return row
      })
    )
  }

  function renderEnvironments(team) {
    environmentsBox.replaceChildren(
      ...Object.entries(team.environments || {}).map(([name, url], index) => {
        const row = document.createElement('div')
        row.className = 'environment'
        const nameInput = document.createElement('input')
        nameInput.value = name
        nameInput.placeholder = t().environmentName
        nameInput.setAttribute('list', 'environment-names')
        const urlInput = document.createElement('input')
        urlInput.type = 'url'
        urlInput.value = url
        urlInput.placeholder = 'https://…'
        const handleChange = () => handleEnvironmentChange(index, nameInput.value, urlInput.value)
        nameInput.addEventListener('change', handleChange)
        urlInput.addEventListener('change', handleChange)
        const remove = document.createElement('button')
        remove.textContent = '✕'
        remove.title = t().removeEnvironment
        remove.addEventListener('click', () => handleEnvironmentRemove(index))
        for (const control of [nameInput, urlInput, remove]) control.disabled = session.readOnly
        row.append(nameInput, urlInput, remove)
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
        remove.title = t().removeNote
        remove.disabled = session.readOnly
        remove.addEventListener('click', () => handleNoteRemove(index))
        row.append(text, remove)
        return row
      })
    )
  }

  // The repo's reply language (`language` in team.json): Vietnamese unless set to English.
  function handleLanguageChange(select) {
    const team = currentTeam()
    team.language = select.value
    commit(team)
  }

  function renderLanguage(team) {
    const select = choice(team.language === 'en' ? 'en' : 'vi', [['vi', 'Tiếng Việt'], ['en', 'English']], handleLanguageChange)
    document.getElementById('language').replaceChildren(select)
  }

  function render() {
    const { team, error } = session.value
    errorBox.style.display = error ? 'block' : 'none'
    errorBox.textContent = error ? t().badJson(error) : ''
    for (const id of ['language', 'roles', 'environments', 'notes']) {
      document.getElementById(`${id}-title`).textContent = t()[`${id}Title`]
      document.getElementById(`${id}-hint`).textContent = t()[`${id}Hint`]
    }
    document.getElementById('add-note').textContent = t().addNote
    document.getElementById('add-environment').textContent = t().addEnvironment
    if (!team) return
    renderLanguage(team)
    renderRoles(team)
    renderEnvironments(team)
    renderNotes(team)
  }

  document.getElementById('add-note').addEventListener('click', handleNoteAdd)
  document.getElementById('add-environment').addEventListener('click', handleEnvironmentAdd)
  session.onReplace(render)
  // The editor's own words follow the focused workspace's team.json `language` (else the plugin setting).
  await window.officeI18n.load(render)
  render()
})()
