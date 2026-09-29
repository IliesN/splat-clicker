// Turns any image into the mouse cursor of the whole site.
// Browsers ignore cursor images bigger than 128px, so the image is first shrunk
// to SIZE x SIZE on a canvas. The result is put in the CSS variable --cursor
// (used in App.vue: `cursor: var(--cursor, auto)`).
const SIZE = 48
const cache = {}  // image path -> shrunk data URL
let wanted = null // latest requested image (ignore slower, older loads)

const apply = (url) =>
  document.documentElement.style.setProperty('--cursor', `url(${url}) ${SIZE / 2} ${SIZE / 2}, auto`)

export function setCursorImage(src) {
  wanted = src
  if (!src) return document.documentElement.style.removeProperty('--cursor') // back to normal cursor
  if (cache[src]) return apply(cache[src])

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    canvas.getContext('2d').drawImage(img, 0, 0, SIZE, SIZE)
    cache[src] = canvas.toDataURL()
    if (wanted === src) apply(cache[src])
  }
  img.src = src
}
