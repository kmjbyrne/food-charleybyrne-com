export const PALETTES = [
  { id: 'olive', label: 'Olive', swatch: '#4F6B3A' },
  { id: 'ink', label: 'Ink', swatch: '#1E3A5F' },
  { id: 'terracotta', label: 'Terracotta', swatch: '#C2410C' },
  { id: 'plum', label: 'Plum', swatch: '#7B2D5E' }
] as const

export type PaletteId = typeof PALETTES[number]['id']

const KEY = 'palette'

export const usePalette = () => {
  const palette = useState<PaletteId>('palette', () => 'olive')

  const apply = (id: PaletteId) => {
    palette.value = id
    document.documentElement.setAttribute('data-palette', id)
    try {
      localStorage.setItem(KEY, id)
    } catch {
      // storage unavailable
    }
  }

  const load = () => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(KEY)
    } catch {
      return
    }
    const known = PALETTES.some(p => p.id === saved)
    apply(known ? saved as PaletteId : 'olive')
  }

  return { palette, apply, load }
}
