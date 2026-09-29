// Users module: accounts, roles, save/load, leaderboard, admin tools, challenge.
import { ROLES } from '../config'
import { freshState, saveData } from './game'

// ---- Fake server (localStorage). Replace with real API calls later. ----
const KEY = 'splatClickerAccounts'
const readAccounts = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
const writeAccounts = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a)) } catch {} }
// Placeholder hash: NOT secure. Use real server-side auth in production.
const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return String(h) }
const copy = (o) => JSON.parse(JSON.stringify(o))

// Accounts shape: { [username]: { passHash, role, save: { ...game state } } }
const emptySave = () => saveData(freshState())

export default {
  namespaced: true,
  state: () => ({
    accounts: readAccounts(),
    currentUser: null,
    role: null,
    challenge: null, // { opponent, target } while challenging someone
    message: '',
  }),

  getters: {
    isLoggedIn: (s) => !!s.currentUser,
    isAdmin: (s) => s.role === ROLES.ADMIN,
    // Sorted best -> worst by total damage dealt
    leaderboard: (s) => Object.entries(s.accounts)
      .map(([name, a]) => ({ name, role: a.role, score: Math.floor(a.save.totalDamage) }))
      .sort((a, b) => b.score - a.score),
  },

  mutations: {
    setAccounts(s, accounts) { s.accounts = accounts },
    setSession(s, { username, role }) { s.currentUser = username; s.role = role },
    setChallenge(s, challenge) { s.challenge = challenge },
    setMessage(s, text) { s.message = text },
  },

  actions: {
    register({ state, commit }, { username, password }) {
      if (!username || !password) return commit('setMessage', 'Enter a username and password.')
      if (state.accounts[username]) return commit('setMessage', 'Username already taken.')
      const accounts = copy(state.accounts)
      const isFirst = Object.keys(accounts).length === 0 // first account = Admin
      accounts[username] = { passHash: hash(password), role: isFirst ? ROLES.ADMIN : ROLES.PLAYER, save: emptySave() }
      writeAccounts(accounts)
      commit('setAccounts', accounts)
      commit('setMessage', 'Registered. You can log in now.')
    },

    login({ state, commit, dispatch }, { username, password }) {
      const a = state.accounts[username]
      if (!a || a.passHash !== hash(password)) return commit('setMessage', 'Wrong username or password.')
      commit('setSession', { username, role: a.role })
      commit('setMessage', '')
      commit('game/loadGame', a.save, { root: true })
      dispatch('game/startAutoProduction', null, { root: true })
    },

    logout({ commit, dispatch }) {
      dispatch('saveGame')
      dispatch('game/stopAutoProduction', null, { root: true })
      commit('game/resetGame', null, { root: true })
      commit('setSession', { username: null, role: null })
      commit('setChallenge', null)
    },

    // Save the current game into the logged-in user's account
    saveGame({ state, commit, rootState }) {
      if (!state.currentUser) return
      const accounts = copy(state.accounts)
      accounts[state.currentUser].save = saveData(rootState.game)
      writeAccounts(accounts)
      commit('setAccounts', accounts)
      commit('setMessage', 'Game saved.')
    },

    loadGame({ state, commit }) {
      const a = state.accounts[state.currentUser]
      if (a) { commit('game/loadGame', a.save, { root: true }); commit('setMessage', 'Game loaded.') }
    },

    // Challenge: remember the opponent's saved score as a target to beat
    challenge({ state, commit }, opponent) {
      commit('setChallenge', { opponent, target: state.accounts[opponent].save.totalDamage })
    },

    // ---- Admin-only ----
    adminSetScore({ state, getters, commit }, { username, score }) {
      if (!getters.isAdmin) return
      const accounts = copy(state.accounts)
      accounts[username].save.totalDamage = score
      accounts[username].save.damage = score
      writeAccounts(accounts)
      commit('setAccounts', accounts)
      if (username === state.currentUser) commit('game/loadGame', accounts[username].save, { root: true })
    },

    // username = one player, or null = everybody
    adminReset({ state, getters, commit }, username) {
      if (!getters.isAdmin) return
      const accounts = copy(state.accounts)
      for (const name of Object.keys(accounts)) {
        if (!username || name === username) accounts[name].save = emptySave()
      }
      writeAccounts(accounts)
      commit('setAccounts', accounts)
      if (!username || username === state.currentUser) commit('game/resetGame', null, { root: true })
    },
  },
}
