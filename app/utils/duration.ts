// Ferments run for days, so minutes alone stop being readable past a few hours.
export const formatDuration = (minutes?: number): string => {
  if (!minutes || minutes <= 0) return ''
  if (minutes < 60) return `${minutes} min`

  const units: [string, number][] = [
    ['week', 60 * 24 * 7],
    ['day', 60 * 24],
    ['hr', 60],
    ['min', 1]
  ]

  const parts: string[] = []
  let left = minutes

  for (const [label, size] of units) {
    const n = Math.floor(left / size)
    if (!n) continue
    left -= n * size
    parts.push(label === 'hr' || label === 'min' ? `${n} ${label}` : `${n} ${label}${n === 1 ? '' : 's'}`)
    if (parts.length === 2) break
  }

  return parts.join(' ')
}
