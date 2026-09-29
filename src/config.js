// ===== GAME CONTENT: edit numbers, names and images here =====
// "Damage" is both the score and the currency of Splat Clicker.

export const GAME_TITLE = 'Splat Clicker'
export const TARGET = { name: 'Squid Bumper', img: '/img/squid-bumper.png' }

export const ROLES = { PLAYER: 'Player', ADMIN: 'Admin' }

// ---------------------------------------------------------------------------
// WEAPONS
// Three weapon classes. Only ONE can be equipped at a time.
// Each class has 4 tiers: tiers[0] is the base weapon, tiers[1..3] are upgrades
// that must be bought in order. `cost` of tiers[0] is the price to unlock the class.
//
// `type` decides how the Squid Bumper reacts to the mouse:
//   'brush'   -> every click deals `damage`
//   'shooter' -> while the button is HELD, deals `damage` every `fireRate` ms
//   'charger' -> hold for `chargeTime` ms then release = `maxDamage`;
//                releasing early deals between failDamage[0] and failDamage[1]
//                depending on how far the charge got.
// ---------------------------------------------------------------------------
export const WEAPONS = [
  {
    id: 'inkbrush',
    type: 'brush',
    color: 'red', // tile color (see --tile-* in App.vue)
    tiers: [
      { name: 'Inkbrush',         cost: 0,      img: '/img/weapons/inkbrush.png',         damage: 40 },
      { name: 'Inkbrush Nouveau', cost: 1500,   img: '/img/weapons/inkbrush-nouveau.png', damage: 70 },
      { name: 'Octobrush',        cost: 20000,  img: '/img/weapons/octobrush.png',        damage: 105 },
      { name: 'Painbrush',        cost: 300000, img: '/img/weapons/painbrush.png',        damage: 250 },
    ],
  },
  {
    id: 'splattershot',
    type: 'shooter',
    color: 'blue',
    tiers: [
      { name: 'Splattershot',             cost: 1000,    img: '/img/weapons/splattershot.png',             damage: 30,  fireRate: 100 },
      { name: 'Splattershot Pro',         cost: 12000,   img: '/img/weapons/splattershot-pro.png',         damage: 60,  fireRate: 70 },
      { name: 'Splattershot Nova',        cost: 150000,  img: '/img/weapons/splattershot-nova.png',        damage: 120, fireRate: 55 },
      { name: 'Annaki Splattershot Nova', cost: 2500000, img: '/img/weapons/annaki-splattershot-nova.png', damage: 300, fireRate: 20 },
    ],
  },
  {
    id: 'charger',
    type: 'charger',
    color: 'orange',
    tiers: [
      { name: 'Splat Charger',    cost: 1000,    img: '/img/weapons/splat-charger.png',    maxDamage: 200,  failDamage: [40, 70],    chargeTime: 1000 },
      { name: 'Splatterscope',    cost: 12000,   img: '/img/weapons/splatterscope.png',    maxDamage: 450,  failDamage: [110, 220],  chargeTime: 800 },
      { name: 'E-Liter 4K',       cost: 150000,  img: '/img/weapons/e-liter-4k.png',       maxDamage: 800,  failDamage: [300, 660],  chargeTime: 500 },
      { name: 'E-Liter 4K Scope', cost: 2500000, img: '/img/weapons/e-liter-4k-scope.png', maxDamage: 3000, failDamage: [580, 1920], chargeTime: 333 },
    ],
  },
]

export const STARTING_WEAPON = 'inkbrush'

// ---------------------------------------------------------------------------
// MAIN WEAPON UP (the "multiplier" upgrade)
// Each level multiplies the damage of the equipped weapon (every click / shot / charge).
// It does NOT boost the passive specials below.
// ---------------------------------------------------------------------------
export const WEAPON_UP = { name: 'Main Weapon Up', img: '/img/main-weapon-up.png', baseCost: 1000, costGrowth: 2.5, bonusPerLevel: 0.25 }

// ---------------------------------------------------------------------------
// SPECIALS = passive damage (like Cookie Clicker buildings)
// Each one adds `dps` damage per second, forever. Special N stays locked until
// special N-1 has been bought at least once.
// Numbers = Cookie Clicker's first 4 buildings (Cursor, Grandma, Farm, Mine)
// scaled x40, because a base Inkbrush click is worth 40 instead of 1 cookie.
// ---------------------------------------------------------------------------
export const SPECIALS = [
  { name: 'Ink Storm',       baseCost: 600,    dps: 4,    img: '/img/specials/ink-storm.png',       color: 'purple' },
  { name: 'Wave Breaker',    baseCost: 4000,   dps: 40,   img: '/img/specials/wave-breaker.png',    color: 'blue' },
  { name: 'Killer Wail 5.1', baseCost: 44000,  dps: 320,  img: '/img/specials/killer-wail-5-1.png', color: 'orange' },
  { name: 'Booyah Bomb',     baseCost: 480000, dps: 1880, img: '/img/specials/booyah-bomb.png',     color: 'red' },
]

export const COST_GROWTH = 1.15 // every purchase of the same special costs 15% more

export const TICK_MS = 100 // passive damage is added every 100 ms (dps / 10 each tick)

// ---------------------------------------------------------------------------
// EVENTS (like Cookie Clicker's golden cookie)
// Every so often a pop-up appears at a random spot on screen. Click it before it
// disappears to start its event. Only one event can run at a time.
// ---------------------------------------------------------------------------
export const EVENTS = {
  spawnDelay: [60000, 180000], // random wait between two pop-ups (ms): 1 to 3 minutes
  popupLifetime: 13000,        // how long a pop-up stays on screen (ms)
  // Relative chance of each event when a pop-up spawns
  chances: { bombRush: 1, rainmaker: 1, tacticooler: 1 },

  // Bomb Rush: weapons are replaced by bombs. Each click throws one bomb that deals
  // `multiplier` x the biggest single hit of the equipped weapon.
  bombRush: {
    name: 'Bomb Rush',
    duration: 20000,
    bombs: [
      { name: 'Burst Bomb',   img: '/img/events/burst-bomb.png',   multiplier: 1.5 },
      { name: 'Splat Bomb',   img: '/img/events/splat-bomb.png',   multiplier: 2 },
      { name: 'Suction Bomb', img: '/img/events/suction-bomb.png', multiplier: 3 },
    ],
  },

  // Rainmaker: replaces the Squid Bumper. Deal `hp` damage before time runs out to
  // win `reward`. Both scale with the player's estimated damage per second:
  //   hp = hpSeconds x DPS      reward = rewardSeconds x DPS
  rainmaker: {
    name: 'RAINMAKER ALERT',
    img: '/img/events/rainmaker.png',
    duration: 35000,
    hpSeconds: 30,
    rewardSeconds: 600,
  },

  // Tacticooler: weapon damage (clicks, shots, charges) multiplied by a random value.
  // Shooters fire faster, chargers deal full damage on every click (no charging).
  tacticooler: {
    name: 'Tacticooler',
    img: '/img/events/tacticooler.png',
    duration: 15000,
    multipliers: [
      { value: 10,  chance: 60 },
      { value: 100, chance: 35 },
      { value: 333, chance: 5 },
    ],
    shooterFireRate: 77.912, // ms (only used if faster than the shooter's own fire rate)
  },
}

// How long the "event is over" / Rainmaker messages stay: visible, then fading out (ms)
export const EVENT_RESULT_TIMING = { visible: 5000, fade: 3000 }

// ---------------------------------------------------------------------------
// SOUNDS played on every hit (files in public/sounds).
// A list = one file picked at random for each hit.
// ---------------------------------------------------------------------------
export const SOUNDS = {
  shooter: [
    '/sounds/inkHitSplash00.wav',
    '/sounds/inkHitSplash01.wav',
    '/sounds/inkHitSplash02.wav',
    '/sounds/inkHitSplash03.wav',
  ],
  brush: '/sounds/HitEffectiveCommon02.wav',
  chargerCharging: '/sounds/ChargeShotPosed00.wav', // plays when a charge starts
  chargerPartial: '/sounds/ChargeLight00.wav',
  chargerFull: '/sounds/ShotExplosionDirect00.wav',
  bomb: '/sounds/ShotExplosionDirect00.wav',
}

// Assumed clicks per second for brushes, only used to estimate DPS (Rainmaker size)
export const CLICKS_PER_SECOND = 8
