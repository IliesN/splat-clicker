<!-- The Squid Bumper (click target) + statistics + challenge progress.
     How the mouse works depends on the equipped weapon type (see config.js):
       brush   -> pointer down = one hit
       shooter -> pointer down starts firing, pointer up stops
       charger -> pointer down starts charging, pointer up releases the shot -->
<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import { TARGET } from '../config'
import { fmt } from '../format'

const store = useStore()
const weapon = computed(() => store.getters['game/currentWeapon'])

// ---- Mouse / touch handling ----
const pointer = { x: 0, y: 0 } // last pointer position inside the bumper (for floating numbers)

function onDown(e) {
  if (e.button !== 0) return // left button only
  e.currentTarget.setPointerCapture(e.pointerId) // keep receiving "up" even outside the bumper
  onMove(e)
  if (weapon.value.type === 'brush') store.dispatch('game/brushHit')
  if (weapon.value.type === 'shooter') store.dispatch('game/startFiring')
  if (weapon.value.type === 'charger') { store.dispatch('game/startCharge'); animateCharge() }
}
function onUp() {
  if (weapon.value.type === 'shooter') store.dispatch('game/stopFiring')
  if (weapon.value.type === 'charger') store.dispatch('game/releaseCharge')
}
function onCancel() { // e.g. the window lost focus: stop without dealing damage
  store.dispatch('game/stopFiring')
  store.dispatch('game/cancelCharge')
}
function onMove(e) {
  const box = e.currentTarget.getBoundingClientRect()
  pointer.x = e.clientX - box.left
  pointer.y = e.clientY - box.top
}

// ---- Charger charge bar (0 -> 1), updated every animation frame while charging ----
const charge = ref(0)
function animateCharge() {
  const start = store.state.game.chargeStartedAt
  if (start === null) { charge.value = 0; return }
  charge.value = Math.min((Date.now() - start) / weapon.value.tier.chargeTime, 1)
  requestAnimationFrame(animateCharge)
}

// ---- Floating damage numbers + little "squish" on every hit ----
const floaters = ref([]) // [{ id, x, y, text }]
const squish = ref(false)
watch(() => store.state.game.lastHit, (hit) => {
  if (!hit) return
  const id = hit.seq
  floaters.value.push({ id, text: fmt(hit.amount), x: pointer.x + (Math.random() * 30 - 15), y: pointer.y })
  setTimeout(() => { floaters.value = floaters.value.filter((f) => f.id !== id) }, 700)
  squish.value = true
  setTimeout(() => { squish.value = false }, 60)
})

onBeforeUnmount(onCancel)
</script>

<template>
  <section class="card bumper-panel">
    <h2>{{ TARGET.name }}</h2>

    <!-- Current damage (the currency) -->
    <p class="big-number">{{ fmt($store.state.game.damage) }} <small>damage</small></p>

    <!-- The click target -->
    <div
      class="bumper"
      :class="{ squish }"
      @pointerdown="onDown"
      @pointerup="onUp"
      @pointercancel="onCancel"
      @pointermove="onMove"
      @contextmenu.prevent
    >
      <img :src="TARGET.img" :alt="TARGET.name" draggable="false" />
      <span v-for="f in floaters" :key="f.id" class="floater" :style="{ left: f.x + 'px', top: f.y + 'px' }">{{ f.text }}</span>
    </div>

    <!-- Equipped weapon + how to use it -->
    <div class="equipped">
      <div class="tile" :class="weapon.color"><img :src="weapon.tier.img" :alt="weapon.tier.name" /></div>
      <div>
        <strong>{{ weapon.tier.name }}</strong><br />
        <small v-if="weapon.type === 'brush'">Click to hit</small>
        <small v-if="weapon.type === 'shooter'">Hold to shoot</small>
        <small v-if="weapon.type === 'charger'">Hold to charge, release to fire</small>
      </div>
    </div>

    <!-- Charge bar (chargers only) -->
    <div v-if="weapon.type === 'charger'" class="charge-bar" :class="{ full: charge >= 1 }">
      <div :style="{ width: charge * 100 + '%' }"></div>
    </div>

    <!-- Statistics (from the `stats` getter) -->
    <ul class="stats">
      <li v-for="(value, label) in $store.getters['game/stats']" :key="label">
        <span>{{ label }}</span><b>{{ typeof value === 'number' ? fmt(value) : value }}</b>
      </li>
    </ul>

    <!-- Challenge progress (only while a challenge is active) -->
    <p v-if="$store.state.users.challenge" class="challenge">
      Challenge vs {{ $store.state.users.challenge.opponent }}:
      you {{ fmt($store.state.game.totalDamage) }} / them {{ fmt($store.state.users.challenge.target) }}
      {{ $store.state.game.totalDamage > $store.state.users.challenge.target ? '- Winning!' : '- Keep going!' }}
    </p>
  </section>
</template>

<style>
.bumper-panel { text-align: center; }
.big-number { font-size: 2.4rem; margin: 0; color: var(--accent); }
.big-number small { font-size: 1rem; color: var(--muted); }

/* Click target: replace the image in config.js (TARGET.img) */
.bumper {
  position: relative; width: 260px; max-width: 100%; margin: 8px auto;
  cursor: crosshair; user-select: none; touch-action: none;
  transition: transform 0.06s;
}
.bumper img { width: 100%; display: block; pointer-events: none; filter: drop-shadow(0 8px 12px #0008); }
.bumper.squish { transform: scale(0.94, 0.9); }

.floater {
  position: absolute; pointer-events: none; color: var(--accent);
  font-size: 1.6rem; text-shadow: 0 2px 0 #000;
  transform: translate(-50%, -50%);
  animation: float-up 0.7s ease-out forwards;
}
@keyframes float-up { to { transform: translate(-50%, -250%); opacity: 0; } }

.equipped { display: flex; align-items: center; gap: 12px; justify-content: center; text-align: left; margin: 8px 0; }
.equipped small { color: var(--muted); }

.charge-bar { height: 12px; border-radius: 999px; background: var(--bg); overflow: hidden; margin: 8px 20px; }
.charge-bar div { height: 100%; background: var(--tile-orange); }
.charge-bar.full div { background: var(--accent); }

.stats { list-style: none; padding: 0; margin: 12px 0 0; text-align: left; }
.stats li { display: flex; justify-content: space-between; padding: 6px 4px; border-top: 1px solid var(--card-hover); }
.stats b { font-weight: normal; color: var(--accent); }
.challenge { color: var(--ticker); }
</style>
