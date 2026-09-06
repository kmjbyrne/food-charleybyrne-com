// A rotating favicon: the tab cycles through dishes while the page is open.
const EMOJI = ['🍲', '🥐', '🍜', '🥗', '🍰', '🌶️', '🧄', '🥖', '🍳', '🫕']

const svgFor = (glyph: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="26" font-size="26">${glyph}</text></svg>`
  )}`

export default defineNuxtPlugin(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) return

  const original = link.href
  let i = 0

  const timer = setInterval(() => {
    i = (i + 1) % EMOJI.length
    link.href = svgFor(EMOJI[i]!)
  }, 3000)

  window.addEventListener('beforeunload', () => {
    clearInterval(timer)
    link.href = original
  })
})
