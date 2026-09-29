<!-- Main Weapon Up (weapon damage multiplier) + passive specials.
     Content comes from WEAPON_UP and SPECIALS in src/config.js -->
<script setup>
import { WEAPON_UP, SPECIALS } from '../config'
import { fmt } from '../format'
</script>

<template>
  <!-- Main Weapon Up: boosts every hit of the equipped weapon -->
  <section class="card">
    <h2>{{ WEAPON_UP.name }}</h2>
    <div class="shop-row">
      <div class="tile gray"><img :src="WEAPON_UP.img" :alt="WEAPON_UP.name" /></div>
      <div class="shop-info">
        <strong>Level {{ $store.state.game.weaponUpLevel }}</strong>
        <small>Weapon damage x{{ $store.getters['game/weaponUpMultiplier'].toFixed(2) }} → x{{ ($store.getters['game/weaponUpMultiplier'] + WEAPON_UP.bonusPerLevel).toFixed(2) }}</small>
      </div>
      <button
        :disabled="$store.state.game.damage < $store.getters['game/weaponUpCost']"
        @click="$store.commit('game/buyWeaponUp')"
      >{{ fmt($store.getters['game/weaponUpCost']) }}</button>
    </div>
  </section>

  <!-- Specials: passive damage per second, unlocked one after the other -->
  <section class="card">
    <h2>Specials</h2>
    <div v-for="(sp, i) in SPECIALS" :key="sp.name" class="shop-row" :class="{ locked: !$store.getters['game/isSpecialUnlocked'](i) }">
      <div class="tile" :class="$store.getters['game/isSpecialUnlocked'](i) ? sp.color : 'gray'">
        <img :src="sp.img" :alt="sp.name" class="icon-white" />
      </div>
      <div class="shop-info">
        <strong>{{ $store.getters['game/isSpecialUnlocked'](i) ? sp.name : '???' }}</strong>
        <small>+{{ fmt(sp.dps) }} dmg/s · Owned {{ $store.state.game.specialLevels[i] }}</small>
      </div>
      <button
        :disabled="!$store.getters['game/isSpecialUnlocked'](i) || $store.state.game.damage < $store.getters['game/specialCost'](i)"
        @click="$store.dispatch('game/buySpecial', i)"
      >{{ fmt($store.getters['game/specialCost'](i)) }}</button>
    </div>
  </section>
</template>

<style>
/* One row per item in the right-hand shop */
.shop-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.shop-row + .shop-row { border-top: 1px solid var(--card-hover); }
.shop-row.locked { opacity: 0.5; }
.shop-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.shop-info small { color: var(--muted); }
.icon-white { filter: invert(1); } /* the special icons are black: turn them white */
</style>
