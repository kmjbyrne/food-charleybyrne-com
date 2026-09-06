// Ingredient lines are free text, so scaling works on a parsed leading quantity
// and a per-ingredient rule. Anything unparsed is left exactly as written.

export type ScaleRule = 'linear' | 'sublinear' | 'manual'

const INTENSE = /stevia|monk ?fruit|sucralose|saccharin|aspartame|xanthan|guar gum|psyllium|cream of tartar|bicarb|baking soda|baking powder|active dry yeast|\byeast\b|gelatin|agar|rennet|liquid smoke|food colouring|food coloring|essence|extract/i

// Countable whole items scale linearly and must round to whole numbers.
const COUNTABLE = /\b(clove|cloves|egg|eggs|onion|onions|lemon|lemons|lime|limes|chilli|chillies|chili|chilies|pepper|peppers|tomato|tomatoes|potato|potatoes|carrot|carrots|shallot|shallots|breast|breasts|thigh|thighs|fillet|fillets|bean|leaf|leaves|stick|sticks|packet|packets|can|cans|pack|packs)\b/i

const SUBLINEAR = /\bsalt\b|ground pepper|black pepper|white pepper|cayenne|\bspice\b|garam|turmeric|\bcumin\b|ground coriander|coriander seed|paprika|nutmeg|cinnamon|cardamom|ground clove|fennel|timur|jimbu|szechuan|sichuan|chilli powder|chili powder|chilli flakes|chili flakes/i

export const ruleFor = (text: string): ScaleRule => {
  if (INTENSE.test(text)) return 'manual'
  if (COUNTABLE.test(text)) return 'linear'
  if (SUBLINEAR.test(text)) return 'sublinear'
  return 'linear'
}

const FRACTIONS: Record<string, number> = {
  '1/8': 0.125, '1/4': 0.25, '1/3': 1 / 3, '1/2': 0.5,
  '2/3': 2 / 3, '3/4': 0.75, '1/5': 0.2, '2/5': 0.4, '3/5': 0.6, '4/5': 0.8
}

// Matches "1", "1.5", "1/2", "1 1/2", "100" at the start of a line.
const QTY = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/

export const parseQuantity = (text: string): number | null => {
  const m = text.match(QTY)
  if (!m) return null
  const raw = m[1]!.trim()
  if (raw.includes('/')) {
    const parts = raw.split(/\s+/)
    if (parts.length === 2) {
      return Number(parts[0]) + (FRACTIONS[parts[1]!] ?? 0)
    }
    return FRACTIONS[raw] ?? null
  }
  return Number(raw)
}

const NICE = [
  [0.125, '1/8'], [1 / 3, '1/3'], [0.25, '1/4'], [0.5, '1/2'],
  [2 / 3, '2/3'], [0.75, '3/4']
] as const

export const formatQuantity = (n: number): string => {
  if (n >= 10) return String(Math.round(n))
  if (n >= 1) {
    const whole = Math.floor(n)
    const rem = n - whole
    if (rem < 0.06) return String(whole)
    for (const [val, label] of NICE) {
      if (Math.abs(rem - val) < 0.06) return `${whole} ${label}`
    }
    return String(Math.round(n * 10) / 10)
  }
  for (const [val, label] of NICE) {
    if (Math.abs(n - val) < 0.04) return label
  }
  return String(Math.round(n * 100) / 100)
}

export const scaleLine = (text: string, multiplier: number) => {
  const rule = ruleFor(text)
  if (multiplier === 1) return { text, rule, scaled: false }
  if (rule === 'manual') return { text, rule, scaled: false }

  const qty = parseQuantity(text)
  if (qty === null) return { text, rule, scaled: false }

  const factor = rule === 'sublinear' ? 1 + (multiplier - 1) * 0.8 : multiplier
  const raw = qty * factor
  // Half a clove of garlic is a fraction; half an egg is not.
  const next = COUNTABLE.test(text)
    ? String(Math.max(1, Math.round(raw)))
    : formatQuantity(raw)
  return {
    text: text.replace(QTY, next),
    rule,
    scaled: true
  }
}
