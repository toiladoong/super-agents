// The pet corner's rules, with no drawing: how bowls empty, when a pet leaves home or a plant dies, how a plant
// grows, and what costs coins. Levels are worked out from timestamps, so they keep going while Orca is closed.
// Exposes window.petRules = { HOUR, LEAVE_MS, PRICES, EMPTY, needs, neglect, adoptCost, seedCost, feed, drink,
// choosePet, choosePlant, water, wantsWater }.
;(function () {
  const HOUR = 60 * 60 * 1000
  const FOOD_MS = 8 * HOUR // a full bowl lasts this long
  const DRINK_MS = 6 * HOUR
  const DRY_MS = 24 * HOUR // a plant not watered for this long wilts (and grows no more until watered)
  const GROW_MS = 4 * HOUR // watering at least this long after its last growth grows the plant one stage
  const LEAVE_MS = 24 * HOUR // an empty food or water bowl for this long: the pet leaves home
  const DIE_MS = 3 * 24 * HOUR // a plant not watered for this long dies
  const LOW = 0.3
  const PRICES = {
    pets: { none: 0, mouse: 20, bird: 30, cat: 40, dog: 50 },
    plants: { none: 0, cactus: 10, pothos: 15, sunflower: 20, rose: 30 },
    feed: 5,
    drink: 2,
    water: 1
  }

  const EMPTY = {
    pet: 'none',
    leftPet: null, // the pet that left home: the next one costs
    fedAt: 0,
    drankAt: 0,
    plant: 'none',
    deadPlant: null, // the plant that died: the next one costs
    stage: 0,
    wateredAt: 0,
    grewAt: 0
  }

  const level = (at, span, now) => Math.min(1, Math.max(0, 1 - (now - at) / span))

  function needs(state, now) {
    const food = level(state.fedAt, FOOD_MS, now)
    const water = level(state.drankAt, DRINK_MS, now)
    // Since when the first bowl has been empty (in the future while both still have some).
    const emptySince = Math.min(state.fedAt + FOOD_MS, state.drankAt + DRINK_MS)
    return {
      food,
      water,
      isHungry: food < LOW,
      isThirsty: water < LOW,
      isDry: now - state.wateredAt > DRY_MS,
      leavesIn: emptySince + LEAVE_MS - now,
      diesIn: state.wateredAt + DIE_MS - now
    }
  }

  // The pet gone after a bowl was empty for LEAVE_MS, the plant dead after DIE_MS dry; who left / died is kept for the
  // message and the price of the next one.
  function neglect(state, now) {
    const { leavesIn, diesIn } = needs(state, now)
    const isLeaving = state.pet !== 'none' && leavesIn <= 0
    const isDying = state.plant !== 'none' && diesIn <= 0
    if (!isLeaving && !isDying) return state
    return {
      ...state,
      ...(isLeaving ? { pet: 'none', leftPet: state.pet } : {}),
      ...(isDying ? { plant: 'none', deadPlant: state.plant, stage: 0 } : {})
    }
  }

  // Free, except right after a pet left / a plant died.
  const adoptCost = (state, pet) => (state.leftPet && pet !== 'none' ? PRICES.pets[pet] : 0)
  const seedCost = (state, plant) => (state.deadPlant && plant !== 'none' ? PRICES.plants[plant] : 0)

  const feed = (state, now) => ({ ...state, fedAt: now })
  const drink = (state, now) => ({ ...state, drankAt: now })
  // Switching keeps the bowls / the soil as they are (no free refill); the first pet or plant, and the one bought after
  // a loss, starts fed / watered.
  function choosePet(state, pet, now) {
    const isFresh = !state.fedAt || Boolean(state.leftPet)
    const leftPet = pet === 'none' ? state.leftPet : null
    return { ...state, pet, leftPet, ...(isFresh && pet !== 'none' ? { fedAt: now, drankAt: now } : {}) }
  }
  function choosePlant(state, plant, now) {
    const isFresh = !state.wateredAt || Boolean(state.deadPlant)
    const deadPlant = plant === 'none' ? state.deadPlant : null
    return { ...state, plant, deadPlant, stage: 0, grewAt: now, ...(isFresh && plant !== 'none' ? { wateredAt: now } : {}) }
  }

  // A cared-for plant grows a stage per watering, at most one every GROW_MS; a dry one only recovers.
  function water(state, now) {
    const canGrow = !needs(state, now).isDry && state.stage < 3 && now - state.grewAt >= GROW_MS
    return { ...state, wateredAt: now, ...(canGrow ? { stage: state.stage + 1, grewAt: now } : {}) }
  }

  // Watering helps now: the plant would grow a stage, or it is dry.
  function wantsWater(state, now) {
    if (state.plant === 'none') return false
    return needs(state, now).isDry || (state.stage < 3 && now - state.grewAt >= GROW_MS)
  }

  window.petRules = {
    HOUR,
    LEAVE_MS,
    PRICES,
    EMPTY,
    needs,
    neglect,
    adoptCost,
    seedCost,
    feed,
    drink,
    choosePet,
    choosePlant,
    water,
    wantsWater
  }
})()
