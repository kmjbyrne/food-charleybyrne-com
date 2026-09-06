// The tab icon rotates through the set on each load, so a fresh visit gets a
// different dish rather than the icon animating in place.
const EMOJI = ['🍲', '🥐', '🍜', '🥗', '🍰', '🌶️', '🧄', '🥖', '🍳', '🫕']

const KEY = 'favicon-index'

const svgFor = (glyph: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="26" font-size="26">${glyph}</text></svg>`
  )}`

export default defineNuxtPlugin(() => {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) return

  const pick = () => {
    try {
      const next = (Number(localStorage.getItem(KEY) ?? -1) + 1) % EMOJI.length
      localStorage.setItem(KEY, String(next))
      return next
    } catch {
      return Math.floor(Math.random() * EMOJI.length)
    }
  }

  link.href = svgFor(EMOJI[pick()]!)
})
