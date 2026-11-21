// Pixel drawing for the office, in logical pixels (the canvas is scaled up with smoothing off).
// Exposes window.sprites = { CELL_W, CELL_H, WALL_H, SHIRT, drawWall, drawFloor, drawCell, drawPerson }.
;(function () {
  const CELL_W = 64
  const CELL_H = 44
  const WALL_H = 16

  const SHIRT = {
    orchestrator: '#9b6bff',
    researcher: '#4aa3ff',
    coder: '#3cc46b',
    reviewer: '#ff9f3c',
    skeptic: '#ffd23c',
    tester: '#ff5c7a',
    agent: '#8a8f98'
  }
  const HAIR = { claude: '#c96442', codex: '#2b2b2b', antigravity: '#4285f4', cursor: '#4b4bd8', opencode: '#7a5230' }
  const SCREEN = { working: '#1d3b52', blocked: '#4a1f24', waiting: '#2a2d36', done: '#121316' }
  const SKIN = '#f1c27d'
  // A 3x5 pixel letter or two on the shirt per role (researcher and reviewer both start with R: RS and RV).
  const ROLE_LETTER = { orchestrator: 'O', researcher: 'RS', coder: 'C', reviewer: 'RV', skeptic: 'S', tester: 'T' }
  const GLYPHS = {
    O: ['111', '101', '101', '101', '111'],
    R: ['110', '101', '110', '101', '101'],
    C: ['111', '100', '100', '100', '111'],
    V: ['101', '101', '101', '101', '010'],
    S: ['111', '100', '111', '001', '111'],
    T: ['111', '010', '010', '010', '010']
  }

  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }

  function drawWall(ctx, width, tick) {
    rect(ctx, 0, 0, width, WALL_H, '#3b4252')
    rect(ctx, 0, WALL_H - 2, width, 2, '#2e3440')
    for (let x = 10; x < width - 20; x += 70) {
      rect(ctx, x, 3, 22, 9, '#88c0d0')
      rect(ctx, x + 10, 3, 2, 9, '#3b4252')
      rect(ctx, x, 7, 22, 1, '#3b4252')
    }
    // Clock: the hand turns once a minute.
    const cx = width - 10
    rect(ctx, cx - 4, 3, 9, 9, '#eceff4')
    const angle = ((Date.now() / 60000) % 1) * Math.PI * 2
    rect(ctx, cx + Math.round(Math.sin(angle) * 3), 7 - Math.round(Math.cos(angle) * 3), 1, 1, '#bf616a')
    rect(ctx, cx, 7, 1, 1, '#2e3440')
  }

  function drawFloor(ctx, x, y) {
    for (let ty = 0; ty < CELL_H; ty += 8) {
      for (let tx = 0; tx < CELL_W; tx += 8) {
        rect(ctx, x + tx, y + ty, 8, 8, (tx + ty) % 16 === 0 ? '#c8b28e' : '#bfa882')
      }
    }
  }

  function drawPerson(ctx, x, y, agent, tick) {
    const shirt = SHIRT[agent.role] || SHIRT.agent
    const hair = HAIR[agent.agent] || HAIR.claude
    const lean = agent.state === 'done' ? -1 : 0
    // Chair back, then the person seated behind the desk.
    rect(ctx, x + 1, y + 6, 12, 10, '#4c566a')
    rect(ctx, x + 3 + lean, y, 8, 7, SKIN)
    rect(ctx, x + 3 + lean, y, 8, 2, hair)
    rect(ctx, x + 3 + lean, y + 2, 1, 3, hair)
    rect(ctx, x + 5 + lean, y + 3, 1, 1, '#2e3440')
    rect(ctx, x + 9 + lean, y + 3, 1, 1, '#2e3440')
    rect(ctx, x + 2, y + 7, 10, 8, shirt)
    if (agent.role === 'tester') {
      // The tester is a woman: long hair over the shoulders, a bow and pink lips.
      rect(ctx, x + 2 + lean, y, 2, 11, hair)
      rect(ctx, x + 10 + lean, y, 2, 11, hair)
      rect(ctx, x + 3 + lean, y - 1, 8, 2, hair)
      rect(ctx, x + 9 + lean, y - 2, 3, 2, '#ff8fb1')
      rect(ctx, x + 7 + lean, y + 5, 1, 1, '#d9536f')
    }
    // Dark on the yellow skeptic shirt, white on the others; letters 4 pixels apart, centered on the 10-pixel shirt.
    const ink = agent.role === 'skeptic' ? '#2e3440' : '#ffffff'
    const letters = [...(ROLE_LETTER[agent.role] || '')]
    const left = x + 2 + Math.floor((10 - (letters.length * 4 - 1)) / 2)
    letters.forEach((letter, index) =>
      GLYPHS[letter].forEach((row, dy) =>
        [...row].forEach((bit, dx) => bit === '1' && rect(ctx, left + index * 4 + dx, y + 9 + dy, 1, 1, ink))
      )
    )
    if (agent.state === 'working') {
      // Typing: hands bob on the keyboard in turn.
      const up = tick % 2
      rect(ctx, x + 12, y + 10 + up, 4, 2, shirt)
      rect(ctx, x + 16, y + 10 + up, 2, 2, SKIN)
      rect(ctx, x + 12, y + 12 - up, 6, 2, shirt)
    } else if (agent.state === 'blocked') {
      // Hand raised: asking for permission or an answer.
      rect(ctx, x + 12, y + 2, 2, 8, shirt)
      rect(ctx, x + 12, y, 2, 2, SKIN)
    } else {
      rect(ctx, x + 12, y + 11, 5, 2, shirt)
    }
  }

  function drawMonitor(ctx, x, y, state, tick) {
    rect(ctx, x, y, 18, 12, '#2e3440')
    rect(ctx, x + 1, y + 1, 16, 10, SCREEN[state] || SCREEN.waiting)
    if (state === 'working') {
      for (let line = 0; line < 4; line++) {
        const width = 3 + ((tick + line * 3) % 9)
        rect(ctx, x + 2 + (line % 2) * 2, y + 2 + line * 2, width, 1, line % 3 ? '#88c0d0' : '#a3be8c')
      }
    } else if (state === 'blocked' && tick % 2) {
      rect(ctx, x + 8, y + 3, 2, 4, '#bf616a')
      rect(ctx, x + 8, y + 8, 2, 1, '#bf616a')
    }
    rect(ctx, x + 8, y + 12, 2, 2, '#2e3440')
  }

  function drawBubble(ctx, x, y, state, tick) {
    const marks = { blocked: '#bf616a', waiting: '#e5e9f0', done: '#a3be8c' }
    if (!marks[state] || (state === 'blocked' && tick % 4 === 3)) return
    rect(ctx, x, y, 11, 8, '#eceff4')
    rect(ctx, x + 2, y + 8, 2, 2, '#eceff4')
    if (state === 'blocked') {
      rect(ctx, x + 5, y + 1, 2, 4, marks.blocked)
      rect(ctx, x + 5, y + 6, 2, 1, marks.blocked)
    } else if (state === 'waiting') {
      for (let dot = 0; dot < 3; dot++) {
        rect(ctx, x + 2 + dot * 3, y + 4, 1, 1, dot <= tick % 3 ? '#4c566a' : '#d8dee9')
      }
    } else {
      rect(ctx, x + 3, y + 4, 1, 1, marks.done)
      rect(ctx, x + 4, y + 5, 1, 1, marks.done)
      rect(ctx, x + 5, y + 4, 1, 1, marks.done)
      rect(ctx, x + 6, y + 3, 1, 1, marks.done)
      rect(ctx, x + 7, y + 2, 1, 1, marks.done)
    }
  }

  function drawMug(ctx, x, y, tick) {
    rect(ctx, x, y, 4, 4, '#eceff4')
    rect(ctx, x + 4, y + 1, 1, 2, '#eceff4')
    rect(ctx, x + 1 + (tick % 2), y - 3, 1, 2, '#d8dee9')
  }

  // One desk: floor, person behind the desk, desk, monitor, bubble.
  function drawCell(ctx, x, y, agent, tick) {
    drawFloor(ctx, x, y)
    drawPerson(ctx, x + 6, y + 10, agent, tick)
    rect(ctx, x + 4, y + 26, 56, 4, '#8b5a2b')
    rect(ctx, x + 4, y + 30, 56, 2, '#6b4423')
    rect(ctx, x + 6, y + 32, 2, 6, '#6b4423')
    rect(ctx, x + 56, y + 32, 2, 6, '#6b4423')
    drawMonitor(ctx, x + 30, y + 12, agent.state, tick)
    rect(ctx, x + 22, y + 24, 8, 2, '#4c566a')
    if (agent.state === 'waiting') drawMug(ctx, x + 52, y + 22, tick)
    drawBubble(ctx, x + 18, y + 1, agent.state, tick)
  }

  window.sprites = { CELL_W, CELL_H, WALL_H, SHIRT, drawWall, drawFloor, drawCell, drawPerson }
})()
