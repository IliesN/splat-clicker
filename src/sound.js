// Sound effects player (Web Audio API).
// Every file is downloaded and decoded ONCE, then each play is a cheap copy, so
// sounds can overlap and play very fast (e.g. a shooter firing every 20 ms).
const VOLUME = 0.5 // 0 = mute, 1 = full volume

let ctx = null      // AudioContext, created on first play (browsers require a user click first)
const buffers = {}  // file path -> decoded sound (or a Promise while loading)

function load(src) {
  if (!buffers[src]) {
    buffers[src] = fetch(src)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => (buffers[src] = buffer))
      .catch(() => (buffers[src] = null)) // missing file: stay silent
  }
  return buffers[src]
}

// Play one file. `src` can also be an array: one of them is picked at random.
// Returns a function that stops the sound early.
export function playSound(src) {
  if (Array.isArray(src)) src = src[Math.floor(Math.random() * src.length)]
  if (!src) return () => {}
  ctx = ctx || new AudioContext()
  if (ctx.state === 'suspended') ctx.resume() // was created before any click

  const buffer = buffers[src]
  if (!buffer || buffer instanceof Promise) { load(src); return () => {} } // not ready yet: skip this one
  const source = ctx.createBufferSource()
  const gain = ctx.createGain()
  gain.gain.value = VOLUME
  source.buffer = buffer
  source.connect(gain).connect(ctx.destination)
  source.start()
  return () => source.stop()
}

// Download sounds in advance so the very first hit isn't silent
export function preloadSounds(list) {
  ctx = ctx || new AudioContext()
  list.flat().forEach(load)
}
