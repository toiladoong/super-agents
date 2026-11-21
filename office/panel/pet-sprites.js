// Pixel art of the pet corner: the pets (facing right), their bowls and the plants at each growth stage.
// Exposes window.petSprites = { PETS, drawPet, drawBowl, drawPlant, drawBubble }.
;(function () {
  // One letter per pixel, colours per pet; '.' is empty.
  const PETS = {
    dog: {
      rows: ['........dd..', '.......bbbb.', '.......bebbn', 'd......bbbb.', '.dbbbbbbbb..', '..bbbbbbbb..', '..b.b..b.b..', '..d.d..d.d..'],
      colors: { b: '#c8915a', d: '#7a5230', e: '#1a1a1a', n: '#1a1a1a' }
    },
    cat: {
      rows: ['.......d.d..', '.......bbbb.', '.......bebe.', 'd......bbnb.', 'd.bbbbbbbb..', '.dbbbbbbbb..', '..b.b..b.b..', '..b.b..b.b..'],
      colors: { b: '#9aa0a6', d: '#5c6166', e: '#7cb342', n: '#f4a4b4' }
    },
    mouse: {
      rows: ['.....dd.', '....bbbb', '.bbbbbeb', 'dbbbbbbn', '..d..d..'],
      colors: { b: '#b0b0b0', d: '#e6a0a8', e: '#111111', n: '#f4a4b4' }
    },
    bird: {
      rows: ['..bb...', '.bbebo.', 'bbbbb..', '.wwbb..', '..bb...', '..d.d..'],
      colors: { b: '#4fc3f7', w: '#0288d1', e: '#111111', o: '#ff9800', d: '#ff9800' }
    }
  }

  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }

  // `x, y`: top-left; `isFacingLeft` mirrors it; `bob` lifts it a pixel (walking, eating).
  function drawPet(ctx, kind, x, y, isFacingLeft, bob) {
    const pet = PETS[kind]
    const width = pet.rows[0].length
    pet.rows.forEach((row, dy) =>
      [...row].forEach((letter, dx) => {
        if (letter === '.') return
        // The legs (last row) stay on the floor while the body bobs.
        const lift = dy < pet.rows.length - 1 ? bob : 0
        rect(ctx, x + (isFacingLeft ? width - 1 - dx : dx), y + dy - lift, 1, 1, pet.colors[letter])
      })
    )
  }

  // A bowl 7 pixels wide, filled to `level` (0..1) with food or water.
  function drawBowl(ctx, x, y, level, fill) {
    rect(ctx, x, y + 1, 7, 2, '#d0d4da')
    rect(ctx, x + 1, y + 3, 5, 1, '#9aa0a6')
    if (level > 0) rect(ctx, x + 1, y + (level > 0.5 ? 0 : 1), Math.max(1, Math.round(level * 5)), 1, fill)
  }

  // A speech bubble with a tiny icon: food, water or a heart.
  function drawBubble(ctx, x, y, icon) {
    rect(ctx, x, y, 7, 6, '#ffffff')
    rect(ctx, x + 1, y + 6, 2, 1, '#ffffff')
    const color = { food: '#7a5230', water: '#2f80ed', heart: '#ff5c7a' }[icon]
    if (icon === 'heart') {
      rect(ctx, x + 1, y + 1, 2, 2, color)
      rect(ctx, x + 4, y + 1, 2, 2, color)
      rect(ctx, x + 2, y + 3, 3, 1, color)
      rect(ctx, x + 3, y + 4, 1, 1, color)
    } else if (icon === 'water') {
      rect(ctx, x + 3, y + 1, 1, 1, color)
      rect(ctx, x + 2, y + 2, 3, 3, color)
    } else {
      rect(ctx, x + 2, y + 2, 3, 3, color)
      rect(ctx, x + 1, y + 1, 1, 1, color)
      rect(ctx, x + 5, y + 4, 1, 1, color)
    }
  }

  const LEAF = '#3cc46b'
  const DRY_LEAF = '#a89a5c'
  const FLOWER = { sunflower: '#ffd23c', rose: '#e53950', cactus: '#ff7fb0' }

  // A pot whose rim is at `y`, centered on `x`; the plant grows up from the rim. `stage` 0..3 (seed → in flower),
  // `isDry` turns it yellow-brown and bends its top.
  function drawPlant(ctx, kind, x, y, stage, isDry) {
    rect(ctx, x - 5, y, 10, 2, '#b5653a')
    rect(ctx, x - 4, y + 2, 8, 5, '#a0522d')
    rect(ctx, x - 3, y, 6, 1, '#5d4030')
    const leaf = isDry ? DRY_LEAF : LEAF
    if (stage === 0) {
      rect(ctx, x - 1, y - 1, 2, 1, '#7a5230')
      return
    }
    const height = [0, 4, 8, 12][stage]
    const lean = isDry ? 1 : 0
    if (kind === 'cactus') {
      rect(ctx, x - 1, y - height, 3, height, leaf)
      if (stage >= 2) rect(ctx, x - 3, y - height + 3, 2, 3, leaf)
      if (stage >= 2) rect(ctx, x + 2, y - height + 5, 2, 3, leaf)
      for (let dy = 2; dy < height; dy += 3) rect(ctx, x + 2, y - dy, 1, 1, '#e8f5e9')
      if (stage === 3 && !isDry) rect(ctx, x - 1, y - height - 2, 3, 2, FLOWER.cactus)
      return
    }
    if (kind === 'pothos') {
      // Trailing heart leaves over the pot's sides, more each stage.
      for (let i = 0; i < stage * 2; i++) {
        const side = i % 2 ? 1 : -1
        rect(ctx, x + side * (3 + Math.floor(i / 2) * 2), y - 2 + Math.floor(i / 2) * 3, 2, 2, leaf)
      }
      rect(ctx, x - 1, y - height / 2, 2, height / 2, leaf)
      return
    }
    // sunflower, rose: a stem with leaves and, fully grown, a flower.
    rect(ctx, x, y - height, 1, height, '#2e7d32')
    for (let dy = 3; dy < height; dy += 4) rect(ctx, x + (dy % 8 === 3 ? -2 : 1), y - dy, 2, 1, leaf)
    if (stage < 3) return
    const top = y - height - 2
    if (kind === 'sunflower') {
      rect(ctx, x - 2 + lean, top - 1, 5, 5, isDry ? DRY_LEAF : FLOWER.sunflower)
      rect(ctx, x - 1 + lean, top, 3, 3, '#6d4c2f')
    } else {
      rect(ctx, x - 1 + lean, top, 3, 3, isDry ? DRY_LEAF : FLOWER.rose)
      rect(ctx, x + lean, top - 1, 1, 1, isDry ? DRY_LEAF : FLOWER.rose)
    }
  }

  window.petSprites = { PETS, drawPet, drawBowl, drawPlant, drawBubble }
})()
