// Game module: damage, weapons, Main Weapon Up and passive specials.
import { WEAPONS, STARTING_WEAPON, WEAPON_UP, SPECIALS, COST_GROWTH, TICK_MS } from '../config'

// ---- Plain helpers (shared by getters, mutations and actions) ----
const weaponById = (id) => WEAPONS.find((w) => w.id === id)
const specialCostFor = (s, i) => Math.ceil(SPECIALS[i].baseCost * Math.pow(COST_GROWTH, s.specialLevels[i]))
const weaponUpCostFor = (s) => Math.ceil(WEAPON_UP.baseCost * Math.pow(WEAPON_UP.costGrowth, s.weaponUpLevel))
// Price of the next tier of a weapon class, or null when it is maxed out
const nextTierCostFor = (s, id) => {
  const next = weaponById(id).tiers[s.weaponTiers[id] + 1]
  return next ? next.cost : null
}

// A brand-new game. Add new fields here and they'll be saved/reset automatically.
export const freshState = () => ({
  damage: 0,          // spendable damage (the currency)
  totalDamage: 0,     // all damage ever dealt (used for the leaderboard)
  autoProduction: 0,  // passive damage per second from specials
  specialLevels: SPECIALS.map(() => 0), // how many of each special are owned
  weaponUpLevel: 0,
  // Highest tier owned per weapon class. -1 = class not unlocked yet.
  weaponTiers: Object.fromEntries(WEAPONS.map((w) => [w.id, w.id === STARTING_WEAPON ? 0 : -1])),
  equipped: STARTING_WEAPON,
  // --- Temporary fields (not saved, see `saveData`) ---
  chargeStartedAt: null, // timestamp while a charger is being held
  lastHit: null,         // { amount, seq } of the latest hit (used to show floating numbers)
})

// What gets written into the account save (temporary fields removed)
export const saveData = (s) => {
  const { chargeStartedAt, lastHit, ...rest } = s
  return JSON.parse(JSON.stringify(rest))
}

let autoTimer = null // setInterval id for passive damage
let fireTimer = null // setInterval id while a shooter is firing

export default {
  namespaced: true,
  state: freshState,

  // GETTERS: computed values for display
  getters: {
    weaponUpMultiplier: (s) => 1 + s.weaponUpLevel * WEAPON_UP.bonusPerLevel,
    damagePerSecond: (s) => s.autoProduction,

    // Currently equipped weapon: class info + stats of its highest owned tier
    currentWeapon: (s) => {
      const w = weaponById(s.equipped)
      return { ...w, tier: w.tiers[s.weaponTiers[w.id]] }
    },
    // Tier currently used for any class (null if not unlocked)
    ownedTier: (s) => (id) => weaponById(id).tiers[s.weaponTiers[id]] || null,
    nextTierCost: (s) => (id) => nextTierCostFor(s, id),
    specialCost: (s) => (i) => specialCostFor(s, i),
    weaponUpCost: (s) => weaponUpCostFor(s),
    isSpecialUnlocked: (s) => (i) => i === 0 || s.specialLevels[i - 1] > 0, // progressive purchase rule

    // Game statistics shown on screen
    stats: (s, g) => ({
      'Damage': Math.floor(s.damage),
      'Total damage dealt': Math.floor(s.totalDamage),
      'Passive damage / s': g.damagePerSecond,
      'Main Weapon Up': 'x' + g.weaponUpMultiplier.toFixed(2),
    }),
  },

  // MUTATIONS: the only place allowed to change state (synchronous)
  mutations: {
    addDamage(s, amount) {
      s.damage += amount
      s.totalDamage += amount
    },
    // Same as addDamage, but also remembered as a visible "hit" (floating number)
    hit(s, amount) {
      s.damage += amount
      s.totalDamage += amount
      s.lastHit = { amount, seq: (s.lastHit?.seq || 0) + 1 }
    },
    buySpecial(s, i) {
      const cost = specialCostFor(s, i)
      if (s.damage < cost) return
      s.damage -= cost
      s.specialLevels[i]++
      s.autoProduction += SPECIALS[i].dps
    },
    buyWeaponTier(s, id) {
      const cost = nextTierCostFor(s, id)
      if (cost === null || s.damage < cost) return
      s.damage -= cost
      s.weaponTiers[id]++
    },
    buyWeaponUp(s) {
      const cost = weaponUpCostFor(s)
      if (s.damage < cost) return
      s.damage -= cost
      s.weaponUpLevel++
    },
    equipWeapon(s, id) { s.equipped = id },
    setChargeStart(s, time) { s.chargeStartedAt = time },
    loadGame(s, save) {
      const fresh = freshState()
      Object.assign(s, fresh, save || {})
      // Keep weapons added to config.js after the save was made
      s.weaponTiers = { ...fresh.weaponTiers, ...(save?.weaponTiers || {}) }
    },
    resetGame(s) { Object.assign(s, freshState()) },
  },

  // ACTIONS: timers, conditions and weapon behaviour, then commit mutations
  actions: {
    // --- Brush: one click = one hit ---
    brushHit({ commit, getters }) {
      commit('hit', Math.round(getters.currentWeapon.tier.damage * getters.weaponUpMultiplier))
    },

    // --- Shooter: hit every `fireRate` ms while the mouse button is held ---
    startFiring({ commit, getters, dispatch }) {
      dispatch('stopFiring')
      const { damage, fireRate } = getters.currentWeapon.tier
      const shoot = () => commit('hit', Math.round(damage * getters.weaponUpMultiplier))
      shoot() // first shot fires immediately
      fireTimer = setInterval(shoot, fireRate)
    },
    stopFiring() {
      clearInterval(fireTimer)
      fireTimer = null
    },

    // --- Charger: hold, then release ---
    startCharge({ commit }) {
      commit('setChargeStart', Date.now())
    },
    releaseCharge({ state, commit, getters }) {
      if (state.chargeStartedAt === null) return
      const { maxDamage, failDamage, chargeTime } = getters.currentWeapon.tier
      const progress = Math.min((Date.now() - state.chargeStartedAt) / chargeTime, 1) // 0..1
      commit('setChargeStart', null)
      const base = progress >= 1
        ? maxDamage                                                  // full charge
        : failDamage[0] + (failDamage[1] - failDamage[0]) * progress // partial charge
      commit('hit', Math.round(base * getters.weaponUpMultiplier))
    },
    cancelCharge({ commit }) {
      commit('setChargeStart', null)
    },

    // --- Passive damage loop (specials) ---
    startAutoProduction({ commit, getters }) {
      if (autoTimer) return
      autoTimer = setInterval(() => commit('addDamage', getters.damagePerSecond * TICK_MS / 1000), TICK_MS)
    },
    stopAutoProduction({ dispatch }) {
      clearInterval(autoTimer)
      autoTimer = null
      dispatch('stopFiring')
    },

    // --- Shop rules ---
    buySpecial({ commit, getters }, i) {
      if (getters.isSpecialUnlocked(i)) commit('buySpecial', i)
    },
    buyWeaponTier({ commit }, id) {
      commit('buyWeaponTier', id) // tiers are always bought in order (next tier only)
    },
    equipWeapon({ state, commit, dispatch }, id) {
      if (state.weaponTiers[id] < 0) return // not unlocked
      dispatch('stopFiring')
      commit('setChargeStart', null)
      commit('equipWeapon', id)
    },
  },
}
