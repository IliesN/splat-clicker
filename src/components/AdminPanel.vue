<!-- Admin only: edit a player's score, reset one player, reset everyone -->
<script setup>
import { ref } from 'vue'
const target = ref('')
const score = ref(0)
</script>

<template>
  <section class="card admin">
    <h2>Admin panel</h2>
    <select v-model="target">
      <option value="" disabled>Choose a player</option>
      <option v-for="p in $store.getters['users/leaderboard']" :key="p.name">{{ p.name }}</option>
    </select>
    <input v-model.number="score" type="number" placeholder="New damage score" />
    <div class="row">
      <button :disabled="!target" @click="$store.dispatch('users/adminSetScore', { username: target, score })">Set score</button>
      <button :disabled="!target" class="secondary" @click="$store.dispatch('users/adminReset', target)">Reset selected</button>
      <button class="secondary" @click="$store.dispatch('users/adminReset', null)">Reset all</button>
    </div>
  </section>
</template>

<style>
.admin { display: flex; flex-direction: column; gap: 10px; }
.admin .row { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
