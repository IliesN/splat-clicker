// Root store: it only assembles the modules.
// Add a new module here (e.g. `shop`, `achievements`) when the game grows.
import { createStore } from 'vuex'
import game from './modules/game'
import users from './modules/users'

export default createStore({
  modules: { game, users }, // both are namespaced: 'game/...' and 'users/...'
})
