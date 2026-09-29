import { createApp } from 'vue'
import store from './store'
import App from './App.vue'

// Plug the Vuex store into the app so every component can use $store
createApp(App).use(store).mount('#app')
