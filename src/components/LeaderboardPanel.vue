<!-- Ranking of all players by total damage dealt + "Challenge" button -->
<script setup>
import { fmt } from '../format'
</script>

<template>
  <section class="card">
    <h2>Leaderboard</h2>
    <table class="leaderboard">
      <tr v-for="(p, i) in $store.getters['users/leaderboard']" :key="p.name" :class="{ me: p.name === $store.state.users.currentUser }">
        <td class="rank">#{{ i + 1 }}</td>
        <td>{{ p.name }} <small v-if="p.role === 'Admin'">(Admin)</small></td>
        <td class="score">{{ fmt(p.score) }}</td>
        <td>
          <button v-if="p.name !== $store.state.users.currentUser" class="secondary" @click="$store.dispatch('users/challenge', p.name)">
            Challenge
          </button>
        </td>
      </tr>
    </table>
    <small class="note">Scores are the last saved total damage.</small>
  </section>
</template>

<style>
.leaderboard { width: 100%; border-collapse: collapse; }
.leaderboard td { padding: 8px 6px; border-top: 1px solid var(--card-hover); }
.leaderboard tr.me { color: var(--accent); }
.leaderboard .rank { width: 40px; color: var(--muted); }
.leaderboard .score { text-align: right; }
.leaderboard small, .note { color: var(--muted); }
</style>
