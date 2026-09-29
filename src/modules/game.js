// Game module: damage, weapons, Main Weapon Up and passive specials.
import { WEAPONS, STARTING_WEAPON, WEAPON_UP, SPECIALS, COST_GROWTH, TICK_MS, EVENTS, CLICKS_PER_SECOND, SOUNDS } from '../config'
import { playSound } from '../sound'

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
let fireTimer = null // setTimeout id while a shooter is firing
let stopChargeSound = () => {} // stops the charge-up sound of the current charge

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

    // --- Damage helpers (they read the running event from the `events` module) ---
    // Tacticooler multiplier, or 1 when no Tacticooler is running
    eventMultiplier: (s, g, rootState) => (rootState.events.active?.type === 'tacticooler' ? rootState.events.active.multiplier : 1),
    // Final damage of one hit: base x Main Weapon Up x event
    hitDamage: (s, g) => (base) => Math.round(base * g.weaponUpMultiplier * g.eventMultiplier),
    // Biggest single hit of the equipped weapon (base for Bomb Rush bombs)
    maxHitDamage: (s, g) => g.currentWeapon.tier.maxDamage ?? g.currentWeapon.tier.damage,
    // Shooter fire rate (ms), faster during Tacticooler
    fireRate: (s, g, rootState) => {
      const rate = g.currentWeapon.tier.fireRate
      return rootState.events.active?.type === 'tacticooler' ? Math.min(rate, EVENTS.tacticooler.shooterFireRate) : rate
    },
    // Rough damage per second (weapon + passive), used to size the Rainmaker
    estimatedDps: (s, g) => {
      const { type, tier } = g.currentWeapon
      const perSecond = {
        brush: () => tier.damage * CLICKS_PER_SECOND,
        shooter: () => tier.damage * 1000 / tier.fireRate,
        charger: () => tier.maxDamage * 1000 / tier.chargeTime,
      }[type]()
      return perSecond * g.weaponUpMultiplier + g.damagePerSecond
    },

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
      commit('hit', getters.hitDamage(getters.currentWeapon.tier.damage))
      playSound(SOUNDS.brush)
    },

    // --- Bomb Rush: one click = one bomb ---
    bombHit({ commit, getters, rootState }) {
      commit('hit', getters.hitDamage(getters.maxHitDamage * rootState.events.active.bomb.multiplier))
      playSound(SOUNDS.bomb)
    },

    // --- Shooter: hit every `fireRate` ms while the mouse button is held ---
    startFiring({ commit, getters, dispatch }) {
      dispatch('stopFiring')
      const shoot = () => {
        commit('hit', getters.hitDamage(getters.currentWeapon.tier.damage))
        playSound(SOUNDS.shooter) // random splash each shot
        fireTimer = setTimeout(shoot, getters.fireRate) // re-read every shot: Tacticooler can change it
      }
      shoot() // first shot fires immediately
    },
    stopFiring() {
      clearTimeout(fireTimer)
      fireTimer = null
    },

    // --- Charger: hold, then release ---
    startCharge({ commit, getters, rootState }) {
      // Tacticooler: no charge needed, every click is a full-charge shot
      if (rootState.events.active?.type === 'tacticooler') {
        commit('hit', getters.hitDamage(getters.currentWeapon.tier.maxDamage))
        return playSound(SOUNDS.chargerFull)
      }
      commit('setChargeStart', Date.now())
      stopChargeSound = playSound(SOUNDS.chargerCharging)
    },
    releaseCharge({ state, commit, getters }) {
      if (state.chargeStartedAt === null) return
      const { maxDamage, failDamage, chargeTime } = getters.currentWeapon.tier
      const progress = Math.min((Date.now() - state.chargeStartedAt) / chargeTime, 1) // 0..1
      stopChargeSound() // cut the charge-up sound if released early
      commit('setChargeStart', null)
      const base = progress >= 1
        ? maxDamage                                                  // full charge
        : failDamage[0] + (failDamage[1] - failDamage[0]) * progress // partial charge
      commit('hit', getters.hitDamage(base))
      playSound(progress >= 1 ? SOUNDS.chargerFull : SOUNDS.chargerPartial)
    },
    cancelCharge({ commit }) {
      stopChargeSound()
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
    equipWeapon({ state, commit, dispatch, rootState }, id) {
      if (state.weaponTiers[id] < 0) return // not unlocked
      if (rootState.events.active?.type === 'bombRush') return // weapons are locked during Bomb Rush
      dispatch('stopFiring')
      dispatch('cancelCharge')
      commit('equipWeapon', id)
    },
  },
}
