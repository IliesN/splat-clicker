<!-- The Squid Bumper (click target) + running event + statistics + challenge progress.
     How the mouse works depends on the equipped weapon type (see config.js):
       brush   -> pointer down = one hit
       shooter -> pointer down starts firing, pointer up stops
       charger -> pointer down starts charging, pointer up releases the shot
     During Bomb Rush every pointer down throws one bomb instead. -->
<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import { TARGET, EVENTS, EVENT_RESULT_TIMING } from '../config'
import { fmt } from '../format'

const store = useStore()
const weapon = computed(() => store.getters['game/currentWeapon'])
const event = computed(() => store.state.events.active) // running event or null
const isBombRush = computed(() => event.value?.type === 'bombRush')
const isTacticooler = computed(() => event.value?.type === 'tacticooler')

// The Rainmaker replaces the Squid Bumper while its event runs
const target = computed(() => (event.value?.type === 'rainmaker' ? { name: 'Rainmaker', img: EVENTS.rainmaker.img } : TARGET))

// ---- Mouse / touch handling ----
const pointer = { x: 0, y: 0 } // last pointer position inside the bumper (for floating numbers)

function onDown(e) {
  if (e.button !== 0) return // left button only
  e.currentTarget.setPointerCapture(e.pointerId) // keep receiving "up" even outside the bumper
  onMove(e)
  if (isBombRush.value) return store.dispatch('game/bombHit')
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

// Alt-Tab / switching tab while holding: the browser never sends "pointerup",
// so stop shooting (and drop the charge) as soon as the window loses focus.
onMounted(() => {
  window.addEventListener('blur', onCancel)
  document.addEventListener('visibilitychange', onCancel)
})
onBeforeUnmount(() => {
  window.removeEventListener('blur', onCancel)
  document.removeEventListener('visibilitychange', onCancel)
  onCancel()
})
</script>

<template>
  <section class="card bumper-panel">
    <h2>{{ target.name }}</h2>

    <!-- Current damage (the currency) -->
    <p class="big-number">{{ fmt($store.state.game.damage) }} <small>damage</small></p>

    <!-- Running event: name + countdown -->
    <div v-if="event" class="event-banner" :class="event.type">
      <span>{{ event.name }}<template v-if="isBombRush">: {{ event.bomb.name }}s</template>!</span>
      <b>{{ $store.getters['events/secondsLeft'] }}s</b>
    </div>
    <!-- Message after an event ended -->
    <!-- (fades out: waits `visible` ms, then fades for `fade` ms, see EVENT_RESULT_TIMING) -->
    <p
      v-else-if="$store.state.events.result"
      :key="$store.state.events.result"
      class="event-result"
      :style="{ animationDelay: EVENT_RESULT_TIMING.visible + 'ms', animationDuration: EVENT_RESULT_TIMING.fade + 'ms' }"
    >{{ $store.state.events.result }}</p>

    <!-- The click target -->
    <div
      class="bumper"
      :class="{ squish }"
      @pointerdown="onDown"
      @pointerup="onUp"
      @pointercancel="onCancel"
      @lostpointercapture="onCancel"
      @pointermove="onMove"
      @contextmenu.prevent
    >
      <img :src="target.img" :alt="target.name" draggable="false" />
      <!-- Tacticooler multiplier label (upper right) -->
      <span v-if="isTacticooler" class="multiplier-label">x{{ event.multiplier }}</span>
      <span v-for="f in floaters" :key="f.id" class="floater" :style="{ left: f.x + 'px', top: f.y + 'px' }">{{ f.text }}</span>
    </div>

    <!-- Rainmaker health bar -->
    <div v-if="event?.type === 'rainmaker'" class="rainmaker-hp">
      <div class="hp-bar"><div :style="{ width: Math.max(0, 1 - $store.getters['events/rainmakerDealt'] / event.hp) * 100 + '%' }"></div></div>
      <small>{{ fmt(Math.max(0, event.hp - $store.getters['events/rainmakerDealt'])) }} HP left · Reward: {{ fmt(event.reward) }}</small>
    </div>

    <!-- Equipped weapon (or bomb) + how to use it -->
    <div class="equipped">
      <div v-if="isBombRush" class="tile purple"><img :src="event.bomb.img" :alt="event.bomb.name" /></div>
      <div v-else class="tile" :class="weapon.color"><img :src="weapon.tier.img" :alt="weapon.tier.name" /></div>
      <div>
        <strong>{{ isBombRush ? event.bomb.name : weapon.tier.name }}</strong><br />
        <small v-if="isBombRush">Click to throw bombs (x{{ event.bomb.multiplier }} max damage)</small>
        <small v-else-if="weapon.type === 'brush'">Click to hit</small>
        <small v-else-if="weapon.type === 'shooter'">Hold to shoot</small>
        <small v-else-if="isTacticooler">Click = full charge!</small>
        <small v-else>Hold to charge, release to fire</small>
      </div>
    </div>

    <!-- Charge bar (chargers only, not needed during Tacticooler / Bomb Rush) -->
    <div v-if="weapon.type === 'charger' && !event" class="charge-bar" :class="{ full: charge >= 1 }">
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
  cursor: var(--cursor, crosshair); user-select: none; touch-action: none;
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

/* ===== EVENTS ===== */
.event-banner {
  display: flex; justify-content: space-between; align-items: center;
  margin: 8px 0; padding: 6px 16px; border-radius: 999px; font-size: 1.3rem;
  background: var(--tile-purple);
  animation: pulse 0.8s ease-in-out infinite alternate;
}
.event-banner.rainmaker { background: #c9a227; color: #000; }
.event-banner.tacticooler { background: #22b5c9; color: #000; }
@keyframes pulse { to { filter: brightness(1.25); } }
.event-result { color: var(--ticker); margin: 8px 0; animation: fade-out linear forwards; }
@keyframes fade-out { to { opacity: 0; } }

/* Tacticooler label: black box, white text, upper right of the bumper */
.multiplier-label {
  position: absolute; top: 4px; right: -10px;
  background: #000; color: #fff; padding: 4px 12px; border-radius: 6px;
  font-size: 1.6rem; transform: rotate(6deg);
}

.rainmaker-hp { margin: 4px 20px 8px; }
.rainmaker-hp small { color: var(--muted); }
.hp-bar { height: 14px; border-radius: 999px; background: var(--bg); overflow: hidden; }
.hp-bar div { height: 100%; background: #c9a227; transition: width 0.1s; }

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
