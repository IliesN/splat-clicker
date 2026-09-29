<!-- Register / log in, then the SplatNet-style "Online" pill with save / load.
     (Log out = the "Exit" button in the top bar, see App.vue) -->
<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
const store = useStore()
const username = ref('')
const password = ref('')

// Other players shown as round avatars in the "Online" pill (first 3, then "+N")
const others = computed(() => store.getters['users/leaderboard'].filter((p) => p.name !== store.state.users.currentUser))
</script>

<template>
  <!-- Logged out: login card -->
  <section v-if="!$store.getters['users/isLoggedIn']" class="card login">
    <h2>Log in to deal damage</h2>
    <input v-model="username" placeholder="Username" />
    <input v-model="password" type="password" placeholder="Password" @keyup.enter="$store.dispatch('users/login', { username, password })" />
    <div class="row">
      <button @click="$store.dispatch('users/login', { username, password })">Log in</button>
      <button class="secondary" @click="$store.dispatch('users/register', { username, password })">Register</button>
    </div>
    <p class="message">{{ $store.state.users.message }}</p>
  </section>

  <!-- Logged in: "Online" pill -->
  <section v-else class="card online">
    <span class="dot"></span>
    <span class="who">{{ $store.state.users.currentUser }} <small>({{ $store.state.users.role }})</small></span>
    <button @click="$store.dispatch('users/saveGame')">Save</button>
    <button class="secondary" @click="$store.dispatch('users/loadGame')">Load</button>
    <span class="message">{{ $store.state.users.message }}</span>

    <div class="avatars">
      <span v-for="p in others.slice(0, 3)" :key="p.name" class="avatar" :title="p.name">{{ p.name[0] }}</span>
      <span v-if="others.length > 3">+{{ others.length - 3 }}</span>
    </div>
  </section>
</template>

<style>
.login { max-width: 380px; margin: 20px auto; display: flex; flex-direction: column; gap: 10px; }
.login .row { display: flex; gap: 10px; }
.message { color: var(--accent); margin: 0; }

.online { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 20px; }
.online .dot { width: 14px; height: 14px; border-radius: 50%; background: var(--online); }
.online .who { font-size: 1.4rem; }
.online small { color: var(--muted); }
.avatars { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 1.3rem; }
.avatar {
  display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
  background: var(--tile-orange); text-transform: uppercase;
}
.avatar:nth-child(2) { background: var(--tile-blue); }
.avatar:nth-child(3) { background: var(--tile-red); }
</style>
