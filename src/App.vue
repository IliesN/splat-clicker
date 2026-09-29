<!-- Root component: page layout in the SplatNet 3 style.
       TOP     = black title bar + colored banner
       LEFT    = the Squid Bumper (click target) + stats
       MIDDLE  = leaderboard / admin
       RIGHT   = shop (weapons, Main Weapon Up, specials)
       BOTTOM  = scrolling news ticker
     Add new panels inside the matching <div class="col-..."> below. -->
<script setup>
import { watch } from 'vue'
import { useStore } from 'vuex'
import { GAME_TITLE } from './config'
import { fmt } from './format'
import { setCursorImage } from './cursor'
import AuthPanel from './components/AuthPanel.vue'
import BumperPanel from './components/BumperPanel.vue'
import WeaponsPanel from './components/WeaponsPanel.vue'
import SpecialsPanel from './components/SpecialsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'
import AdminPanel from './components/AdminPanel.vue'
import EventPopup from './components/EventPopup.vue'

// Mouse cursor = equipped weapon (or bomb during Bomb Rush) while logged in
const store = useStore()
watch(
  () => (store.getters['users/isLoggedIn'] ? store.getters['events/cursorImg'] : null),
  (img) => setCursorImage(img),
  { immediate: true },
)
</script>

<template>
  <!-- Black top bar, like the SplatNet 3 app -->
  <header class="top-bar">
    <span></span>
    <h1>{{ GAME_TITLE }}</h1>
    <button v-if="$store.getters['users/isLoggedIn']" class="link-button" @click="$store.dispatch('users/logout')">Exit</button>
    <span v-else></span>
  </header>

  <!-- Colored banner (the "Splatfest Open!" strip) -->
  <div class="banner">
    <div class="banner-colors"><i></i><i></i><i></i></div>
    <span class="banner-label">Squid Bumper Open! ➜</span>
  </div>

  <main class="page">
    <!-- Login form, or the "Online" pill once logged in -->
    <AuthPanel />

    <!-- Game layout: only visible once logged in -->
    <div v-if="$store.getters['users/isLoggedIn']" class="layout">
      <div class="col-left"><BumperPanel /></div>

      <div class="col-middle">
        <LeaderboardPanel />
        <AdminPanel v-if="$store.getters['users/isAdmin']" />
      </div>

      <div class="col-right">
        <WeaponsPanel />
        <SpecialsPanel />
      </div>
    </div>

    <!-- Random event pop-up (Bomb Rush / Rainmaker / Tacticooler) -->
    <EventPopup v-if="$store.getters['users/isLoggedIn']" />
  </main>

  <!-- Bottom news ticker (edit the text freely) -->
  <footer class="ticker">
    <div class="ticker-track">
      <span v-for="n in 2" :key="n">
        <b>Deal as much damage as possible to the Squid Bumper!</b>
        <template v-if="$store.getters['users/isLoggedIn']">
          Total damage dealt: {{ fmt($store.state.game.totalDamage) }} ·
          Passive damage: {{ fmt($store.getters['game/damagePerSecond']) }}/s ·
        </template>
        Stay fresh! ·&nbsp;
      </span>
    </div>
  </footer>
</template>

<style>
/* ===== FONT: Splatoon font for the whole site ===== */
@font-face {
  font-family: 'Splatoon2';
  src: url('/fonts/Splatoon2.otf') format('opentype');
  font-display: swap;
}

/* ===== COLORS: SplatNet 3 palette, edit here ===== */
:root {
  --bg: #2f3136;          /* page background (dark gray) */
  --bar: #000;            /* top bar / nav */
  --card: #41454d;        /* cards and pills */
  --card-hover: #4b5059;
  --text: #fff;
  --muted: #a9adb5;
  --accent: #eaff3d;      /* SplatNet lime yellow */
  --online: #3ddc84;      /* "Online" green dot */
  --ticker: #6de4c4;      /* teal ticker text */
  /* app-icon tile colors */
  --tile-red: #e0585a;
  --tile-blue: #5433e0;
  --tile-orange: #e38c46;
  --tile-purple: #8b4fdc;
  --tile-gray: #60656e;
  --radius: 22px;
}

/* ===== BASE ===== */
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: 'Splatoon2', system-ui, sans-serif;
  letter-spacing: 0.02em;
  cursor: var(--cursor, auto); /* weapon cursor, set by src/cursor.js */
  padding-bottom: 48px; /* room for the ticker */
}
h1, h2, h3 { font-weight: normal; margin: 0 0 10px; }
h2 { font-size: 1.4rem; }

button, input, select { font: inherit; }
/* Default button: lime pill */
button {
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 999px;
  padding: 6px 16px;
  cursor: var(--cursor, pointer);
}
button:hover:not(:disabled) { filter: brightness(1.1); }
button:disabled { background: var(--tile-gray); color: var(--muted); cursor: not-allowed; }
button.secondary { background: var(--card-hover); color: var(--text); }
.link-button { background: none; color: var(--text); font-size: 1.3rem; padding: 0; }

input, select {
  background: var(--bg);
  color: var(--text);
  border: 2px solid var(--card-hover);
  border-radius: 999px;
  padding: 6px 14px;
}

/* Card = the rounded dark-gray blocks of SplatNet */
.card { background: var(--card); border-radius: var(--radius); padding: 16px; margin-bottom: 16px; }

/* Squircle "app icon" tile. Add a color class: .tile.red / .blue / ... */
.tile {
  display: grid; place-items: center;
  width: 64px; height: 64px; flex-shrink: 0;
  border-radius: 30%;
  background: var(--tile-gray);
}
.tile img { width: 80%; height: 80%; object-fit: contain; }
.tile.red { background: var(--tile-red); }
.tile.blue { background: var(--tile-blue); }
.tile.orange { background: var(--tile-orange); }
.tile.purple { background: var(--tile-purple); }
.tile.gray { background: var(--tile-gray); }

/* ===== TOP BAR + BANNER ===== */
.top-bar {
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  background: var(--bar); padding: 14px 20px;
}
.top-bar h1 { margin: 0; font-size: 2rem; }
.top-bar .link-button { justify-self: end; }

.banner { position: relative; height: 56px; background: var(--bar); overflow: hidden; }
.banner-colors { display: flex; height: 100%; }
.banner-colors i { flex: 1; }
.banner-colors i:nth-child(1) { background: var(--tile-purple); }
.banner-colors i:nth-child(2) { background: var(--tile-orange); }
.banner-colors i:nth-child(3) { background: #3aa99f; }
.banner-label {
  position: absolute; left: 16px; bottom: 6px;
  background: #111; padding: 4px 18px; font-size: 1.5rem;
  transform: rotate(-2deg);
}

/* ===== LAYOUT: edit column widths here ===== */
.page { max-width: 1300px; margin: 0 auto; padding: 20px 16px; }
.layout {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1.1fr; /* left | middle | right */
  gap: 16px;
  align-items: start;
}
/* Right column scrolls on its own, like the Cookie Clicker store */
.col-right { max-height: calc(100vh - 120px); overflow-y: auto; }

/* Small screens: stack as bumper -> shop -> leaderboard */
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .col-left { order: 1; }
  .col-right { order: 2; max-height: none; }
  .col-middle { order: 3; }
}

/* ===== BOTTOM TICKER ===== */
.ticker {
  position: fixed; left: 0; right: 0; bottom: 0; height: 40px;
  background: #5c5f65; overflow: hidden; white-space: nowrap;
  display: flex; align-items: center; font-family: system-ui, sans-serif; font-size: 1.05rem;
}
.ticker-track { display: inline-flex; animation: ticker 30s linear infinite; }
.ticker b { color: var(--ticker); margin-right: 8px; }
@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
</style>
