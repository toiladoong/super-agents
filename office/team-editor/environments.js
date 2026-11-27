// The "Test environments" section of the Team editor: `environments` in team.json (name → URL), what `env <name>` of
// /dev and /review picks. Kept as an object; edited as rows so a rename keeps the order.
// Exposes window.environmentsSection(editor) → { render(team), handleAdd() }; `editor` gives the shared helpers.
;(function () {
  const ENVIRONMENT_NAMES = ['develop', 'staging', 'production']

  window.environmentsSection = function environmentsSection({ box, session, currentTeam, commit, render, showChange, t }) {
    function handleChange(index, name, url) {
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

    function handleRemove(index) {
      const team = currentTeam()
      team.environments = Object.fromEntries(Object.entries(team.environments || {}).filter((_, at) => at !== index))
      commit(team)
      render()
    }

    function handleAdd() {
      const team = currentTeam()
      const names = Object.keys(team.environments || {})
      const name = ENVIRONMENT_NAMES.find((candidate) => !names.includes(candidate)) || `env${names.length + 1}`
      team.environments = { ...(team.environments || {}), [name]: '' }
      commit(team)
      render()
      box.querySelector('.environment:last-child input[type=url]')?.focus()
    }

    function renderRows(team) {
      box.replaceChildren(
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
          const handleRowChange = () => handleChange(index, nameInput.value, urlInput.value)
          nameInput.addEventListener('change', handleRowChange)
          urlInput.addEventListener('change', handleRowChange)
          const remove = document.createElement('button')
          remove.textContent = '✕'
          remove.title = t().removeEnvironment
          remove.addEventListener('click', () => handleRemove(index))
          for (const control of [nameInput, urlInput, remove]) control.disabled = session.readOnly
          row.append(nameInput, urlInput, remove)
          return row
        })
      )
    }

    return { render: renderRows, handleAdd }
  }
})()
