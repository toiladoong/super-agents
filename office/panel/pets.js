// The pet corner under the office: a pet (dog, cat, mouse, bird) to feed and give water, and a plant to water so it
// grows; the rules are in pet-rules.js. State lives in the plugin's storage, so it survives Orca restarts; coins come
// from the worker's wallet (worker/wallet.ts).
// Exposes window.petCorner = { handleLanguageChanged }.
;(function () {
  const { HOUR, LEAVE_MS, PRICES, EMPTY, needs, neglect, adoptCost, seedCost, feed, drink, choosePet, choosePlant, water } =
    window.petRules
  const HAPPY_MS = 4000 // the heart after feeding / watering
  const HEIGHT = 30
  const FRAME_MS = 166
  const STORAGE_KEY = 'petCorner'
  const SYNC_MS = 60 * 1000

  window.petCorner = { handleLanguageChanged: () => {} }

  const canvas = document.getElementById('corner')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const info = document.getElementById('corner-info')
  const { drawFloor } = window.sprites
  const { PETS, drawPet, drawBowl, drawPlant, drawBubble } = window.petSprites
  const i18n = window.officeI18n

  let state = { ...EMPTY }
  let wallet = null // { coins, isCheckedIn, streak, nextCheckIn }, unknown until the worker answers
  let notice = ''
  let happyUntil = 0
  let tick = 0
  const walk = { x: 30, target: 30, isFacingLeft: false, restUntil: 0 }

  // A failed save would lose what was just paid for on the next open: say so.
  async function save() {
    try {
      await orca.storage.set(STORAGE_KEY, state)
    } catch {
      notice = i18n.t.corner.saveFailed
      renderInfo()
    }
  }

  function update(next) {
    state = next
    happyUntil = Date.now() + HAPPY_MS
    void save()
    render()
  }

  // Pays through the worker's wallet, then applies the change; not enough coins → says so and changes nothing.
  async function buy(cost, change) {
    if (cost) {
      let answer = null
      try {
        answer = await orca.plugin.request('wallet.spend', { cost })
      } catch {}
      if (answer) wallet = answer
      if (!answer || !answer.ok) {
        notice = i18n.t.corner.notEnough(cost)
        render()
        return
      }
    }
    notice = ''
    update(change(state, Date.now()))
  }

  // Collects the coins of Orca work finished since the last check.
  async function syncCoins() {
    try {
      const answer = await orca.plugin.request('wallet.sync')
      wallet = answer
      if (answer.earned) notice = i18n.t.corner.earned(answer.earned)
      render()
    } catch {}
  }

  async function handleCheckIn() {
    try {
      wallet = await orca.plugin.request('wallet.checkIn')
      if (wallet.earned) notice = i18n.t.corner.checkedIn(wallet.earned, wallet.streak)
      render()
    } catch {}
  }

  const handleFeed = () => buy(PRICES.feed, feed)
  const handleDrink = () => buy(PRICES.drink, drink)
  const handleWater = () => buy(PRICES.water, water)
  const handlePetChange = (event) => {
    const pet = event.target.value
    buy(adoptCost(state, pet), (current, now) => choosePet(current, pet, now))
  }
  const handlePlantChange = (event) => {
    const plant = event.target.value
    buy(seedCost(state, plant), (current, now) => choosePlant(current, plant, now))
  }

  function fillSelect(select, names, costOf, value) {
    select.replaceChildren(
      ...Object.entries(names).map(([key, name]) => {
        const option = document.createElement('option')
        const cost = costOf(key)
        option.value = key
        option.textContent = cost ? `${name} · ${i18n.t.corner.price(cost)}` : name
        option.selected = key === value
        return option
      })
    )
  }

  // Labels, choices and buttons in the panel's language, and which buttons apply.
  function render() {
    const t = i18n.t.corner
    fillSelect(document.getElementById('pet'), t.pets, (pet) => adoptCost(state, pet), state.pet)
    fillSelect(document.getElementById('plant'), t.plants, (plant) => seedCost(state, plant), state.plant)
    const coins = wallet ? wallet.coins : null
    document.getElementById('coins').textContent = coins === null ? '' : t.coins(coins)
    const checkInButton = document.getElementById('check-in')
    checkInButton.hidden = !wallet
    checkInButton.disabled = Boolean(wallet && wallet.isCheckedIn)
    if (wallet) checkInButton.textContent = wallet.isCheckedIn ? t.checkedInToday(wallet.streak) : t.checkIn(wallet.nextCheckIn)
    for (const action of ['feed', 'drink', 'water']) {
      const button = document.getElementById(action)
      button.textContent = `${t[action]} · ${t.price(PRICES[action])}`
      const owns = action === 'water' ? state.plant !== 'none' : state.pet !== 'none'
      button.disabled = !owns || (coins !== null && coins < PRICES[action])
    }
    renderInfo()
  }

  function renderInfo() {
    const t = i18n.t.corner
    const now = Date.now()
    const { food, water: drinkLevel, isDry, leavesIn, diesIn } = needs(state, now)
    const parts = []
    if (state.leftPet) parts.push(t.leftHome(t.pets[state.leftPet]))
    if (state.pet !== 'none') parts.push(t.petInfo(t.pets[state.pet], Math.round(food * 100), Math.round(drinkLevel * 100)))
    if (state.pet !== 'none' && leavesIn < LEAVE_MS) parts.push(t.starving(Math.max(1, Math.ceil(leavesIn / HOUR))))
    if (state.deadPlant) parts.push(t.plantDied(t.plants[state.deadPlant]))
    if (state.plant !== 'none') parts.push(t.plantInfo(t.plants[state.plant], t.stages[state.stage], isDry))
    if (state.plant !== 'none' && isDry) parts.push(t.dying(Math.max(1, Math.ceil(diesIn / HOUR))))
    info.textContent = [notice, ...parts].filter(Boolean).join(' · ')
  }

  // The pet walks about; hungry or thirsty, it waits at that bowl; just fed, it stays there with a heart.
  function moveTo(width, bowlX, now, isNeedy) {
    if (isNeedy || now < happyUntil) walk.target = bowlX
    else if (walk.x === walk.target && now > walk.restUntil) {
      walk.target = 22 + Math.floor(Math.random() * Math.max(1, width - 60))
      walk.restUntil = now + 2000 + Math.random() * 4000
    }
    if (walk.x !== walk.target) {
      walk.isFacingLeft = walk.target < walk.x
      walk.x += walk.isFacingLeft ? -1 : 1
    }
  }

  function draw() {
    const cssWidth = canvas.clientWidth || 200
    const scale = Math.min(3, Math.max(2, Math.floor(cssWidth / 128)))
    const width = Math.floor(cssWidth / scale)
    canvas.width = Math.floor(cssWidth * devicePixelRatio)
    canvas.height = Math.floor(HEIGHT * scale * devicePixelRatio)
    canvas.style.height = `${HEIGHT * scale}px`
    ctx.imageSmoothingEnabled = false
    ctx.setTransform(scale * devicePixelRatio, 0, 0, scale * devicePixelRatio, 0, 0)
    for (let x = 0; x < width; x += 64) drawFloor(ctx, x, 0)

    const now = Date.now()
    const status = needs(state, now)
    if (state.plant !== 'none') drawPlant(ctx, state.plant, 10, HEIGHT - 9, state.stage, status.isDry)
    if (state.pet === 'none') return
    const foodX = width - 22
    const waterX = width - 12
    drawBowl(ctx, foodX, HEIGHT - 6, status.food, '#7a5230')
    drawBowl(ctx, waterX, HEIGHT - 6, status.water, '#2f80ed')

    const petWidth = PETS[state.pet].rows[0].length
    const petHeight = PETS[state.pet].rows.length
    const bowlX = (status.isThirsty && !status.isHungry ? waterX : foodX) - petWidth
    moveTo(width, bowlX, now, status.isHungry || status.isThirsty)
    const isMoving = walk.x !== walk.target
    const bob = (isMoving || now < happyUntil) && tick % 2 ? 1 : 0
    const y = HEIGHT - 1 - petHeight
    drawPet(ctx, state.pet, walk.x, y, walk.isFacingLeft, bob)
    const bubble = now < happyUntil ? 'heart' : status.isHungry ? 'food' : status.isThirsty ? 'water' : null
    if (bubble) drawBubble(ctx, walk.x + petWidth - 3, y - 8, bubble)
  }

  function handleFrame() {
    if (document.hidden) return
    tick += 1
    draw()
    // The levels change slowly: check on the pet and refresh the text about once a minute.
    if (tick % 360 === 0) checkOnPet()
  }

  function checkOnPet() {
    const after = neglect(state, Date.now())
    if (after !== state) {
      state = after
      void save()
      render()
    } else renderInfo()
  }

  window.petCorner.handleLanguageChanged = render
  document.getElementById('check-in').addEventListener('click', handleCheckIn)
  document.getElementById('feed').addEventListener('click', handleFeed)
  document.getElementById('drink').addEventListener('click', handleDrink)
  document.getElementById('water').addEventListener('click', handleWater)
  document.getElementById('pet').addEventListener('change', handlePetChange)
  document.getElementById('plant').addEventListener('change', handlePlantChange)
  setInterval(handleFrame, FRAME_MS)
  setInterval(syncCoins, SYNC_MS)
  render()
  ;(async () => {
    try {
      state = { ...EMPTY, ...((await orca.storage.get(STORAGE_KEY)) || {}) }
    } catch {}
    render()
    checkOnPet()
    await syncCoins()
  })()
})()
