// The office canvas: lays out one desk per agent, animates at a low frame rate, shows a tooltip on hover.
;(function () {
  // 6 frames a second is enough for pixel animation and keeps the panel cheap.
  const FRAME_MS = 166
  const LABEL_H = 14
  const i18n = window.officeI18n

  const canvas = document.getElementById('office')
  const ctx = canvas.getContext('2d')
  const tip = document.getElementById('tip')
  const status = document.getElementById('status')
  const { CELL_W, CELL_H, WALL_H, drawWall, drawFloor, drawCell } = window.sprites

  let tick = 0
  let layout = { scale: 2, columns: 1, rows: 1, offsetX: 0, agents: [] }

  function elapsed(since) {
    const minutes = Math.floor((Date.now() - since) / 60000)
    return i18n.t.elapsed(minutes)
  }

  function shortTitle(agent) {
    const title = agent.title || agent.agent || 'agent'
    return title.length > 18 ? `${title.slice(0, 17)}…` : title
  }

  function computeLayout() {
    const cssWidth = canvas.clientWidth || 200
    // 2–3x keeps several desks per row even in a wide sidebar.
    const scale = Math.min(3, Math.max(2, Math.floor(cssWidth / (CELL_W * 2))))
    const columns = Math.max(1, Math.floor(cssWidth / scale / CELL_W))
    const agents = window.agentStore.list()
    const rows = Math.max(1, Math.ceil(agents.length / columns))
    const height = WALL_H + rows * (CELL_H + LABEL_H)
    canvas.width = Math.floor(cssWidth * devicePixelRatio)
    canvas.height = Math.floor(height * scale * devicePixelRatio)
    canvas.style.height = `${height * scale}px`
    // Center the desks; the floor fills the whole width.
    const offsetX = Math.floor((cssWidth / scale - columns * CELL_W) / 2)
    layout = { scale, columns, rows, offsetX, agents }
  }

  function cellOrigin(index) {
    const column = index % layout.columns
    const row = Math.floor(index / layout.columns)
    return { x: layout.offsetX + column * CELL_W, y: WALL_H + row * (CELL_H + LABEL_H) }
  }

  function draw() {
    const pixel = layout.scale * devicePixelRatio
    ctx.imageSmoothingEnabled = false
    ctx.setTransform(pixel, 0, 0, pixel, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const logicalWidth = canvas.width / pixel
    drawWall(ctx, logicalWidth, tick)
    for (let row = 0; row < layout.rows; row++) {
      for (let x = layout.offsetX - CELL_W; x < logicalWidth; x += CELL_W) {
        drawFloor(ctx, x, WALL_H + row * (CELL_H + LABEL_H))
      }
    }
    layout.agents.forEach((agent, index) => {
      const { x, y } = cellOrigin(index)
      drawCell(ctx, x, y, agent, tick)
    })
    // Labels in device pixels so text stays sharp.
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = getComputedStyle(document.body).color
    layout.agents.forEach((agent, index) => {
      const { x, y } = cellOrigin(index)
      const centerX = (x + CELL_W / 2) * layout.scale
      const labelY = (y + CELL_H + 10) * layout.scale
      ctx.fillText(`${shortTitle(agent)} · ${elapsed(agent.stateStartedAt)}`, centerX, labelY)
    })
    status.textContent = layout.agents.length ? '' : i18n.t.noAgents
  }

  function handleFrame() {
    if (document.hidden) return
    tick += 1
    // Re-layout about once a minute so finished agents leave and elapsed times stay right.
    if (tick % 360 === 0) computeLayout()
    draw()
  }

  function handleAgentsChanged() {
    computeLayout()
    draw()
  }

  function agentAt(event) {
    const box = canvas.getBoundingClientRect()
    const x = (event.clientX - box.left) / layout.scale - layout.offsetX
    const y = (event.clientY - box.top) / layout.scale - WALL_H
    const column = Math.floor(x / CELL_W)
    const row = Math.floor(y / (CELL_H + LABEL_H))
    return x >= 0 && y >= 0 && column < layout.columns ? layout.agents[row * layout.columns + column] ?? null : null
  }

  function handlePointerMove(event) {
    const agent = agentAt(event)
    if (!agent) {
      tip.style.display = 'none'
      return
    }
    tip.textContent = [
      agent.title || i18n.t.unnamed,
      `${agent.agent || 'agent'} · ${i18n.t.role} ${agent.role}${agent.workspace ? ` · ${agent.workspace}` : ''}`,
      `${i18n.t.states[agent.state] || agent.state} ${elapsed(agent.stateStartedAt)}${agent.tool ? ` · ${agent.tool}` : ''}`
    ].join('\n')
    tip.style.left = `${Math.min(event.clientX + 12, innerWidth - 250)}px`
    tip.style.top = `${event.clientY + 12}px`
    tip.style.display = 'block'
  }

  function handlePointerLeave() {
    tip.style.display = 'none'
  }

  async function handleOpenTeam() {
    try {
      const { message } = await orca.plugin.request('team.open')
      status.textContent = message
    } catch (error) {
      status.textContent = `${i18n.t.teamOpenFailed}${error.code || ''} ${error.message}`
    }
  }

  document.getElementById('open-team').addEventListener('click', handleOpenTeam)
  canvas.addEventListener('pointermove', handlePointerMove)
  canvas.addEventListener('pointerleave', handlePointerLeave)
  new ResizeObserver(handleAgentsChanged).observe(canvas)
  window.agentStore.onChange(handleAgentsChanged)
  setInterval(handleFrame, FRAME_MS)
  window.agentStore.load().catch((error) => {
    status.textContent = `${i18n.t.readFailed}${error.code || ''} ${error.message}`
  })

  // The guide and labels follow the plugin's language setting, and switch when the person changes it.
  function handleLanguageChanged() {
    document.getElementById('guide-title').textContent = i18n.t.guideTitle
    document.getElementById('guide-body').innerHTML = i18n.guide
    document.getElementById('open-team').title = i18n.t.teamButtonTitle
    window.petCorner.handleLanguageChanged()
    draw()
  }

  i18n.load(handleLanguageChanged).then(handleLanguageChanged)
  handleAgentsChanged()
})()
