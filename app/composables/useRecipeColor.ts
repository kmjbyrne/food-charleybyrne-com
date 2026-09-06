const PALETTES: [string, string, string][] = [
  ['#a7f3d0', '#10b981', '#047857'],
  ['#fde68a', '#f59e0b', '#b45309'],
  ['#bbf7d0', '#16a34a', '#14532d'],
  ['#fecaca', '#f87171', '#991b1b'],
  ['#bfdbfe', '#3b82f6', '#1d4ed8'],
  ['#e9d5ff', '#a855f7', '#6b21a8'],
  ['#fbcfe8', '#ec4899', '#9d174d'],
  ['#fed7aa', '#f97316', '#c2410c'],
  ['#d9f99d', '#84cc16', '#3f6212'],
  ['#fef3c7', '#eab308', '#854d0e'],
  ['#cffafe', '#06b6d4', '#155e75'],
  ['#fce7f3', '#f472b6', '#831843']
]

function hashTitle(title: string): number {
  let h = 0
  for (let i = 0; i < title.length; i++) {
    h = (Math.imul(31, h) + title.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export const useRecipeColor = (title: string): string => {
  const [a, b, c] = PALETTES[hashTitle(title) % PALETTES.length]
  return `linear-gradient(135deg, ${a}, ${b} 60%, ${c})`
}
