// Events module: random pop-ups (like golden cookies) and the event they start.
// Event types: 'bombRush', 'rainmaker', 'tacticooler' (settings in EVENTS, config.js)
import { EVENTS, EVENT_RESULT_TIMING } from '../config'
import { fmt } from '../format'

const TICK = 100 // how often the running event is checked (ms)
let spawnTimer = null // waits before the next pop-up
let popupTimer = null // removes the pop-up if not clicked in time
let tickTimer = null  // runs while an event is active
let resultTimer = null // clears the end-of-event message

// Picks one item from a list of { chance } (chances don't need to add up to 100)
const pickWeighted = (list) => {
  let roll = Math.random() * list.reduce((sum, item) => sum + item.chance, 0)
  return list.find((item) => (roll -= item.chance) < 0) || list[list.length - 1]
}
const randomBetween = (min, max) => min + Math.random() * (max - min)
const randomItem = (list) => list[Math.floor(Math.random() * list.length)]

// Image shown for a pop-up (Bomb Rush shows the bomb that was rolled)
export const popupImg = (popup) => (popup.type === 'bombRush' ? popup.bomb.img : EVENTS[popup.type].img)

export default {
  namespaced: true,
  state: () => ({
    popup: null,  // { type, bomb, x, y } while a pop-up is on screen (x / y in % of the screen)
    active: null, // running event: { type, name, endsAt, + bomb | multiplier | hp, reward, startTotal }
    now: Date.now(), // refreshed every tick so countdowns update on screen
    result: '',   // message shown after an event ends
  }),

  getters: {
    activeType: (s) => s.active?.type || null,
    secondsLeft: (s) => (s.active ? Math.max(0, Math.ceil((s.active.endsAt - s.now) / 1000)) : 0),
    // Rainmaker: damage dealt since it appeared (clicks AND passive damage count)
    rainmakerDealt: (s, g, rootState) => (s.active?.type === 'rainmaker' ? rootState.game.totalDamage - s.active.startTotal : 0),
    // Image used as the mouse cursor: the bomb during Bomb Rush, otherwise the equipped weapon
    cursorImg: (s, g, rootState, rootGetters) =>
      s.active?.type === 'bombRush' ? s.active.bomb.img : rootGetters['game/currentWeapon'].tier.img,
  },

  mutations: {
    setPopup(s, popup) { s.popup = popup },
    setActive(s, active) { s.active = active },
    setNow(s, time) { s.now = time },
    setResult(s, text) { s.result = text },
  },

  actions: {
    // Called on login / logout
    startEvents({ dispatch }) { dispatch('scheduleSpawn') },
    stopEvents({ commit }) {
      clearTimeout(spawnTimer); clearTimeout(popupTimer); clearInterval(tickTimer); clearTimeout(resultTimer)
      commit('setPopup', null); commit('setActive', null); commit('setResult', '')
    },

    // Wait a random time, then show a pop-up
    scheduleSpawn({ dispatch }) {
      clearTimeout(spawnTimer)
      spawnTimer = setTimeout(() => dispatch('spawnPopup'), randomBetween(...EVENTS.spawnDelay))
    },

    // Show a pop-up at a random position. `type` is optional (random if not given).
    spawnPopup({ state, commit, dispatch }, type) {
      if (state.active || state.popup) return // one thing at a time
      const types = Object.entries(EVENTS.chances).map(([t, chance]) => ({ t, chance }))
      type = type || pickWeighted(types).t
      commit('setPopup', {
        type,
        bomb: type === 'bombRush' ? randomItem(EVENTS.bombRush.bombs) : null,
        x: randomBetween(5, 85),
        y: randomBetween(15, 75),
      })
      clearTimeout(popupTimer)
      popupTimer = setTimeout(() => { // missed it!
        commit('setPopup', null)
        dispatch('scheduleSpawn')
      }, EVENTS.popupLifetime)
    },

    // Player clicked the pop-up: start its event
    clickPopup({ state, commit, dispatch, rootState, rootGetters }) {
      const popup = state.popup
      if (!popup) return
      clearTimeout(popupTimer)
      commit('setPopup', null)
      dispatch('game/stopFiring', null, { root: true })
      dispatch('game/cancelCharge', null, { root: true })

      const cfg = EVENTS[popup.type]
      const active = { type: popup.type, name: cfg.name, endsAt: Date.now() + cfg.duration }
      if (popup.type === 'bombRush') active.bomb = popup.bomb
      if (popup.type === 'tacticooler') active.multiplier = pickWeighted(cfg.multipliers).value
      if (popup.type === 'rainmaker') {
        const dps = rootGetters['game/estimatedDps']
        active.hp = Math.ceil(dps * cfg.hpSeconds)
        active.reward = Math.ceil(dps * cfg.rewardSeconds)
        active.startTotal = rootState.game.totalDamage
      }

      commit('setActive', active)
      commit('setResult', '')
      commit('setNow', Date.now())
      clearInterval(tickTimer)
      tickTimer = setInterval(() => dispatch('tick'), TICK)
    },

    // Runs every TICK while an event is active: countdown + Rainmaker check
    tick({ state, getters, commit, dispatch }) {
      commit('setNow', Date.now())
      const a = state.active
      if (a.type === 'rainmaker' && getters.rainmakerDealt >= a.hp) {
        commit('game/hit', a.reward, { root: true })
        return dispatch('endEvent', `The Rainmaker exploded! +${fmt(a.reward)} damage`)
      }
      if (state.now >= a.endsAt) {
        dispatch('endEvent', a.type === 'rainmaker' ? 'The Rainmaker got away...' : `${a.name} is over.`)
      }
    },

    endEvent({ commit, dispatch }, message) {
      clearInterval(tickTimer)
      commit('setActive', null)
      commit('setResult', message)
      // Remove the message once it has faded out (the fade itself is CSS, see BumperPanel.vue)
      clearTimeout(resultTimer)
      resultTimer = setTimeout(() => commit('setResult', ''), EVENT_RESULT_TIMING.visible + EVENT_RESULT_TIMING.fade)
      dispatch('scheduleSpawn')
    },
  },
}
