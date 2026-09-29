<!-- The event pop-up (golden cookie equivalent): appears at a random place,
     click it before it disappears to start the event. -->
<script setup>
import { EVENTS } from '../config'
import { popupImg } from '../modules/events'
</script>

<template>
  <button
    v-if="$store.state.events.popup"
    class="event-popup"
    :style="{ left: $store.state.events.popup.x + '%', top: $store.state.events.popup.y + '%' }"
    :title="EVENTS[$store.state.events.popup.type].name"
    @click="$store.dispatch('events/clickPopup')"
  >
    <img :src="popupImg($store.state.events.popup)" alt="" draggable="false" />
  </button>
</template>

<style>
.event-popup {
  position: fixed; z-index: 50;
  width: 90px; height: 90px; padding: 10px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff9 0%, #eaff3d66 50%, transparent 70%);
  animation: popup-bob 1s ease-in-out infinite alternate, popup-in 0.3s ease-out;
}
.event-popup:hover { filter: brightness(1.2); }
.event-popup img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 0 6px #fff); }
@keyframes popup-bob { from { transform: translateY(-6px) rotate(-6deg); } to { transform: translateY(6px) rotate(6deg); } }
@keyframes popup-in { from { scale: 0; } }
</style>
