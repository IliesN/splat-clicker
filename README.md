# Splat Clicker – Vue 3 + Vuex

Deal as much damage as possible to the Squid Bumper. Damage is both your score and your currency.

    npm install
    npm run dev

Where to edit:
- src/config.js              -> weapons + tiers, Main Weapon Up, specials, prices, timings (game content)
- src/modules/game.js        -> game logic (state / getters / mutations / actions)
- src/modules/users.js       -> accounts, save/load, leaderboard, admin, challenge
- src/components/*.vue       -> screen panels
- src/App.vue <style>        -> SplatNet 3 colors (:root variables), font, layout
- public/img, public/fonts   -> images and the Splatoon font

Weapons (one equipped at a time):
- Brush   (Inkbrush line)      : click = one hit
- Shooter (Splattershot line)  : hold the mouse button to fire
- Charger (Splat Charger line) : hold to charge, release to fire

The first account you register becomes the Admin.
Accounts and saves live in localStorage (fake server) - replace the
`readAccounts` / `writeAccounts` helpers in users.js with real API calls later.
"# splat-clicker" 
