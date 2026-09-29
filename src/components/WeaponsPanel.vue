<!-- Weapon shop: unlock a class, upgrade it tier by tier, equip one at a time.
     Content comes from WEAPONS in src/config.js -->
<script setup>
import { WEAPONS } from '../config'
import { fmt } from '../format'

// One-line stats of a tier, depending on the weapon type
const describe = (type, t) => {
  if (type === 'brush') return `${t.damage} dmg / click`
  if (type === 'shooter') return `${t.damage} dmg every ${t.fireRate} ms`
  if (type === 'charger') return `${t.maxDamage} dmg full charge (${t.chargeTime / 1000}s) · ${t.failDamage[0]}-${t.failDamage[1]} early`
}
</script>

<template>
  <section class="card">
    <h2>Weapons</h2>

    <div v-for="w in WEAPONS" :key="w.id" class="weapon-row" :class="{ equipped: $store.state.game.equipped === w.id }">
      <!-- Current tier (or base weapon, dimmed, if locked) -->
      <div class="tile" :class="$store.getters['game/ownedTier'](w.id) ? w.color : 'gray locked'">
        <img :src="($store.getters['game/ownedTier'](w.id) || w.tiers[0]).img" alt="" />
      </div>

      <div class="weapon-info">
        <strong>{{ ($store.getters['game/ownedTier'](w.id) || w.tiers[0]).name }}</strong>
        <small>{{ describe(w.type, $store.getters['game/ownedTier'](w.id) || w.tiers[0]) }}</small>

        <!-- Upgrade path: the 4 tiers, owned ones lit up -->
        <div class="tier-path">
          <img
            v-for="(t, i) in w.tiers" :key="t.name" :src="t.img" :title="t.name"
            :class="{ owned: i <= $store.state.game.weaponTiers[w.id] }"
          />
        </div>

        <div class="weapon-buttons">
          <!-- Equip (only one weapon at a time) -->
          <button
            v-if="$store.getters['game/ownedTier'](w.id)"
            class="secondary"
            :disabled="$store.state.game.equipped === w.id"
            @click="$store.dispatch('game/equipWeapon', w.id)"
          >{{ $store.state.game.equipped === w.id ? 'Equipped' : 'Equip' }}</button>

          <!-- Unlock / next tier / maxed -->
          <button
            v-if="$store.getters['game/nextTierCost'](w.id) !== null"
            :disabled="$store.state.game.damage < $store.getters['game/nextTierCost'](w.id)"
            @click="$store.dispatch('game/buyWeaponTier', w.id)"
          >
            {{ $store.getters['game/ownedTier'](w.id) ? 'Upgrade to ' + w.tiers[$store.state.game.weaponTiers[w.id] + 1].name : 'Unlock' }}
            · {{ fmt($store.getters['game/nextTierCost'](w.id)) }}
          </button>
          <small v-else class="maxed">MAX</small>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
.weapon-row { display: flex; gap: 14px; padding: 12px; border-radius: var(--radius); }
.weapon-row.equipped { background: var(--card-hover); outline: 2px solid var(--accent); }
.weapon-row .tile { width: 80px; height: 80px; }
.tile.locked img { filter: brightness(0) opacity(0.5); } /* silhouette while locked */
.weapon-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.weapon-info small { color: var(--muted); }
.tier-path { display: flex; gap: 4px; }
.tier-path img { width: 30px; height: 30px; object-fit: contain; filter: grayscale(1) opacity(0.35); }
.tier-path img.owned { filter: none; }
.weapon-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.maxed { color: var(--accent) !important; align-self: center; }
</style>
