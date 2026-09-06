<script setup lang="ts">
import type { RecipesCollectionItem } from '@nuxt/content'
import type { RecipeMeta, RecipeVariantGroup } from '~/types/recipe'

interface Props {
  recipe: RecipesCollectionItem | null
}

const props = defineProps<Props>()

const route = useRoute()
const router = useRouter()

const recipe = computed(() => props.recipe)
const slug = computed(() => recipe.value?.path ?? '')

const { data: related } = await useAsyncData(() => `related-${slug.value}`, () =>
  queryCollection('recipes')
    .where('category', '=', recipe.value?.category ?? '')
    .where('path', '<>', slug.value)
    .select('path', 'stem', 'title', 'category', 'image', 'description')
    .limit(3)
    .all()
)

// Structured data must render server-side, so it reads the parsed body rather
// than the DOM.
const flattenText = (node: unknown): string => {
  if (typeof node === 'string') return node
  if (!Array.isArray(node)) return ''
  return node.slice(2).map(flattenText).join('')
}

const flatten = (node: unknown): string => {
  if (typeof node === 'string') return node
  if (!Array.isArray(node)) return ''
  return node.slice(2).map(flatten).join('')
}

const collectList = (tag: 'ul' | 'ol'): string[] => {
  const body = recipe.value?.body as { value?: unknown[] } | undefined
  const out: string[] = []
  const walk = (node: unknown) => {
    if (!Array.isArray(node)) return
    if (node[0] === tag) {
      for (const child of node.slice(2)) {
        if (Array.isArray(child) && child[0] === 'li') {
          const text = flatten(child).replace(/\s+/g, ' ').trim()
          if (text) out.push(text)
        }
      }
      return
    }
    node.slice(2).forEach(walk)
  }
  ;(body?.value ?? []).forEach(walk)
  return out
}

const ingredientList = computed(() => collectList('ul'))
const stepList = computed(() => collectList('ol'))

const site = 'https://food.charleybyrne.com'
const canonical = computed(() => `${site}${recipeUrl(recipe.value?.path)}`)

useSeoMeta({
  title: () => recipe.value?.title ?? '',
  description: () => recipe.value?.description ?? '',
  ogTitle: () => recipe.value?.title ?? '',
  ogDescription: () => recipe.value?.description ?? '',
  ogType: 'article',
  ogUrl: () => canonical.value,
  ogImage: () => (useRecipeArt(recipe.value) ? `${site}${useRecipeArt(recipe.value)}` : undefined),
  twitterCard: 'summary_large_image'
})

useHead({
  link: [{ rel: 'canonical', href: canonical }]
})

// Recipe structured data is what earns rich results: time, yield and nutrition
// shown directly in search.
const minutes = (n?: number) => (n ? `PT${n}M` : undefined)

const jsonLd = computed(() => {
  const r = recipe.value
  if (!r) return null
  const art = useRecipeArt(r)
  const n = r.nutrition
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    'name': r.title,
    'description': r.description,
    'url': canonical.value,
    'image': art ? `${site}${art}` : undefined,
    'recipeCategory': r.category,
    'keywords': r.tags?.join(', '),
    'recipeYield': r.servings ? `${r.servings} servings` : undefined,
    'prepTime': minutes(r.prep),
    'cookTime': minutes(r.cook),
    'totalTime': minutes(r.time ?? (((r.prep ?? 0) + (r.cook ?? 0)) || undefined)),
    'recipeIngredient': ingredientList.value,
    'recipeInstructions': stepList.value.map((text, i) => ({
      '@type': 'HowToStep',
      'position': i + 1,
      text
    })),
    'nutrition': n?.calories
      ? {
          '@type': 'NutritionInformation',
          'calories': `${n.calories} calories`,
          'proteinContent': n.protein ? `${n.protein} g` : undefined,
          'fatContent': n.fat?.saturated ? `${n.fat.saturated} g` : undefined,
          'fiberContent': n.carbs?.fiber ? `${n.carbs.fiber} g` : undefined,
          'sodiumContent': n.sodium ? `${n.sodium} mg` : undefined
        }
      : undefined
  }
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => (jsonLd.value ? JSON.stringify(jsonLd.value) : ''))
    }
  ]
})

const cookingMode = ref(false)
const nutritionOpen = ref(false)

const goToCategory = (category: string) => {
  navigateTo(`/${category.toLowerCase()}`)
}

const tocLinks = computed(() => recipe.value?.body?.toc?.links ?? [])

// Most recipes are just Ingredients + Method; a two-item TOC is noise.
const showToc = computed(() => tocLinks.value.length >= 3)

const heroArt = computed(() => useRecipeArt(recipe.value))

const prose = useTemplateRef<HTMLElement>('prose')
const storageKey = computed(() => `recipe-checks:${slug.value}`)

const itemKey = (li: Element) => (li.textContent ?? '').trim()

const persistChecks = () => {
  if (!prose.value) return
  const checked = [...prose.value.querySelectorAll('ul li.checked, ol li.checked')].map(itemKey)
  try {
    if (checked.length) {
      localStorage.setItem(storageKey.value, JSON.stringify(checked))
    } else {
      localStorage.removeItem(storageKey.value)
    }
  } catch {
    // private mode / storage disabled
  }
}

const restoreChecks = () => {
  if (!prose.value) return
  let saved: string[] = []
  try {
    saved = JSON.parse(localStorage.getItem(storageKey.value) ?? '[]')
  } catch {
    return
  }
  if (!saved.length) return
  for (const li of prose.value.querySelectorAll('ul li, ol li')) {
    if (saved.includes(itemKey(li))) li.classList.add('checked')
  }
}

// Ingredients come from rendered markdown, so handle clicks by delegation.
const onProseClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.closest('a')) return

  const switcher = target.closest('.variant-switch') as HTMLElement | null
  if (switcher) {
    const group = switcher.dataset.variantGroup ?? ''
    if (openSwitcher.value === group) {
      openSwitcher.value = null
      return
    }
    const box = switcher.getBoundingClientRect()
    switcherPos.value = { top: `${box.bottom + 6}px`, left: `${box.left - 8}px` }
    openSwitcher.value = group
    return
  }

  const heading = target.closest('.recipe-prose h2, .recipe-prose h3')
  if (heading) {
    heading.classList.toggle('collapsed')
    setCollapsed(heading, heading.classList.contains('collapsed'))
    return
  }

  const li = target.closest('.recipe-prose ul li, .recipe-prose ol li')
  if (li && !li.querySelector('ul, ol')) {
    li.classList.toggle('checked')
    persistChecks()
  }
}

const copied = ref(false)
const linkCopied = ref(false)

// Variant groups appear in the URL as plain lowercase keys: ?infusion=ginger
const queryKey = (name: string) => name.toLowerCase().replace(/\s+/g, '-')
const slugify = (value: string) => value.toLowerCase().replace(/\s+/g, '-')

// A shared link should open on the same variant and scale the sender was
// looking at, so both ride along as query params.
const shareUrl = computed(() => {
  const query = new URLSearchParams()
  if (multiplier.value !== 1) query.set('scale', String(multiplier.value))
  for (const group of variantGroups.value) {
    const pick = chosen.value[group.name]
    if (pick && pick !== group.default) query.set(queryKey(group.name), slugify(pick))
  }
  const qs = query.toString()
  const origin = import.meta.client ? location.origin : site
  return `${origin}${recipeUrl(recipe.value?.path)}${qs ? `?${qs}` : ''}`
})

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    linkCopied.value = true
    setTimeout(() => (linkCopied.value = false), 2000)
  } catch {
    linkCopied.value = false
  }
}

// ContentRenderer may wrap the rendered markdown, so locate the element that
// actually holds the headings rather than assuming a depth.
const proseBlocks = (): Element[] => {
  const root = prose.value
  if (!root) return []
  const holder = root.querySelector('h1, h2, h3')?.parentElement ?? root
  return [...holder.children]
}
const cardOpen = ref(false)

const onCardKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') cardOpen.value = false
}

onMounted(() => {
  window.addEventListener('keydown', onCardKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onCardKey))
})

watch(cardOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  document.body.classList.toggle('card-open', open)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.body.classList.remove('card-open')
})

// The card mirrors the current selection, so it reads from the rendered prose.
const cardSections = ref<{ heading: string, items: string[], steps: string[] }[]>([])

const buildCard = () => {
  if (!prose.value) return
  const hidden = (el: Element) =>
    el.hasAttribute('data-collapsed')
    || el.hasAttribute('data-variant-hidden')
    || el.hasAttribute('data-scope-hidden')

  const text = (el: Element) => {
    const clone = el.cloneNode(true) as HTMLElement
    clone.querySelectorAll('ul, ol, button, svg').forEach(n => n.remove())
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
  }

  const out: { heading: string, items: string[], steps: string[] }[] = []
  let current: { heading: string, items: string[], steps: string[] } | null = null

  for (const node of proseBlocks()) {
    if (hidden(node)) continue
    if (/^H[23]$/.test(node.tagName)) {
      const label = text(node)
      if (!label) continue
      current = { heading: label, items: [], steps: [] }
      out.push(current)
      continue
    }
    if (!current) continue
    if (node.tagName === 'UL') {
      for (const li of node.querySelectorAll(':scope > li')) {
        if (!hidden(li) && text(li)) current.items.push(text(li))
      }
    } else if (node.tagName === 'OL') {
      for (const li of node.querySelectorAll(':scope > li')) {
        if (!hidden(li) && text(li)) current.steps.push(text(li))
      }
    }
  }
  // Variant sections live at the end of the document, but on a card they
  // belong with the other ingredients rather than after the method.
  const kept = out.filter(s => s.items.length || s.steps.length)
  const ingredients = kept.filter(s => s.items.length && !s.steps.length)
  const rest = kept.filter(s => !(s.items.length && !s.steps.length))
  cardSections.value = [...ingredients, ...rest]
}

const openCard = () => {
  buildCard()
  cardOpen.value = true
}

// Not window.print directly: the template resolves bare names against the
// component instance, and this page also renders on the server.
const printCard = () => {
  if (import.meta.client) window.print()
}

// Copies what is on screen, so the scale and chosen variants come with it.
const copyRecipe = async () => {
  if (!prose.value) return

  const visible = (el: Element) =>
    !el.hasAttribute('data-collapsed') && !el.hasAttribute('data-variant-hidden')

  // textContent would swallow nested lists and the injected switch button, so
  // take only this element's own text and collapse the source line wraps.
  const ownText = (el: Element) => {
    const clone = el.cloneNode(true) as HTMLElement
    clone.querySelectorAll('ul, ol, button, svg').forEach(n => n.remove())
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
  }

  const lines: string[] = []

  const writeList = (list: Element, depth: number) => {
    let n = 0
    for (const li of list.querySelectorAll(':scope > li')) {
      if (!visible(li)) continue
      const text = ownText(li)
      const indent = '  '.repeat(depth)
      if (text) {
        lines.push(list.tagName === 'OL' ? `${indent}${++n}. ${text}` : `${indent}- ${text}`)
      }
      for (const nested of li.querySelectorAll(':scope > ul, :scope > ol')) {
        writeList(nested, depth + 1)
      }
    }
  }

  for (const node of proseBlocks()) {
    if (!visible(node)) continue

    if (/^H[23]$/.test(node.tagName)) {
      const text = ownText(node)
      if (text) lines.push('', node.tagName === 'H2' ? `## ${text}` : `### ${text}`, '')
      continue
    }
    if (node.tagName === 'UL' || node.tagName === 'OL') {
      writeList(node, 0)
      continue
    }
    if (node.tagName === 'PRE') continue
    if (node.tagName === 'BLOCKQUOTE') {
      const text = ownText(node)
      if (text) lines.push('', `> ${text}`, '')
      continue
    }
    const text = ownText(node)
    if (text) lines.push('', text, '')
  }

  const header = [`# ${displayTitle.value}`]
  if (recipe.value?.description) header.push('', recipe.value.description)
  const meta: string[] = []
  if (multiplier.value !== 1) meta.push(`Scaled ${multiplier.value}x`)
  for (const group of variantGroups.value) {
    const pick = chosen.value[group.name]
    if (pick) meta.push(`${group.name}: ${pick}`)
  }
  if (meta.length) header.push('', `_${meta.join(' · ')}_`)

  const body = [...header, ...lines, '', `${location.origin}${recipeUrl(recipe.value?.path)}`]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  try {
    await navigator.clipboard.writeText(body)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}

// A mother sauce lists what derives from it, pulled from the sibling files.
const { data: derivatives } = await useAsyncData(
  () => `derivatives-${slug.value}`,
  async () => {
    if (!recipe.value?.motherSauce || !slug.value) return []
    const all = await queryCollection('recipes')
      .select('path', 'title', 'description')
      .all()
    return all.filter(r => (r.path ?? '').startsWith(`${slug.value}/`))
  },
  { watch: [slug] }
)

// The path is the real hierarchy, so the trail walks it rather than the flat
// category field.
const trail = computed(() => {
  const segs = recipeUrl(recipe.value?.path).split('/').filter(Boolean).slice(0, -1)
  const out: { label: string, to: string }[] = []
  const acc: string[] = []
  for (const seg of segs) {
    acc.push(seg)
    out.push({
      label: seg.split('-').map(w => w[0]!.toUpperCase() + w.slice(1)).join(' '),
      to: `/${acc.join('/')}`
    })
  }
  return out
})

// A daughter sauce points back up to the mother it derives from.
const { data: parents } = await useAsyncData(
  () => `parents-${slug.value}`,
  async () => {
    const refs = recipe.value?.links ?? []
    if (!refs.length) return []
    const all = await queryCollection('recipes')
      .select('path', 'title', 'motherSauce')
      .all()
    return all.filter(r => refs.includes(r.path ?? ''))
  },
  { watch: [slug] }
)

const motherOf = computed(() => parents.value?.find(p => p.motherSauce) ?? null)

// A derivative can pull its base ingredients from the recipe it inherits, so
// changing the mother updates every daughter.
const { data: inherited } = await useAsyncData(
  () => `inherits-${slug.value}`,
  async () => {
    const from = recipe.value?.inherits
    if (!from) return null
    const base = await queryCollection('recipes').path(from).first()
    if (!base) return null

    const want = (recipe.value?.inheritsSection ?? 'Ingredients').toLowerCase()
    const items: string[] = []
    let capture = false

    const walk = (node: unknown) => {
      if (!Array.isArray(node)) return
      const [tag, , ...kids] = node as [string, unknown, ...unknown[]]
      if (/^h[23]$/.test(tag)) {
        capture = flattenText(node).trim().toLowerCase() === want
        return
      }
      if (capture && tag === 'ul') {
        for (const li of kids) {
          if (Array.isArray(li) && li[0] === 'li') {
            const text = flattenText(li).replace(/\s+/g, ' ').trim()
            if (text) items.push(text)
          }
        }
        return
      }
      kids.forEach(walk)
    }

    ;((base.body as { value?: unknown[] })?.value ?? []).forEach(walk)

    const swaps = recipe.value?.substitutes ?? []
    const rows = items.map((text) => {
      const swap = swaps.find(sub => text.toLowerCase().includes(sub.from.toLowerCase()))
      return { text, swap: swap ?? null }
    })
    // A substitution whose target is not in the base list still needs showing.
    for (const sub of swaps) {
      if (!rows.some(r => r.swap === sub)) rows.push({ text: sub.from, swap: sub })
    }
    return { title: base.title, path: base.path, items, rows }
  },
  { watch: [slug] }
)

const variantGroups = computed(() => recipe.value?.variants ?? [])

// Restore the selection a shared link carried: ?infusion=ginger
watchEffect(() => {
  for (const group of variantGroups.value) {
    const raw = route.query[queryKey(group.name)]
    if (raw && !chosen.value[group.name]) chosen.value[group.name] = String(raw)
  }
})

// A diet-style group can qualify the title, so "Keto BBQ Sauce" reads correctly
// without duplicating the recipe.
const displayTitle = computed(() => {
  const base = recipe.value?.title ?? ''
  const group = variantGroups.value.find(g => g.titlePrefix)
  if (!group) return base
  const pick = chosen.value[group.name]
  if (!pick) return base

  // The canonical title may already carry a diet word; swap it for the choice
  // rather than stacking a second one in front.
  const others = (group.options ?? []).filter(o => o !== pick)
  const carried = others.find(o => new RegExp(`\\b${o}\\b`, 'i').test(base))
  if (carried) {
    return base.replace(new RegExp(`\\s*\\b${carried}\\b`, 'i'), pick === 'Standard' ? '' : ` ${pick}`).replace(/\s+/g, ' ').trim()
  }
  if (base.toLowerCase().includes(pick.toLowerCase())) return base
  return pick === 'Standard' ? base : `${pick} ${base}`
})
const chosen = ref<Record<string, string>>({})

// Variant subsections share everything before them; only the chosen one shows.
const variantOptions = (group: RecipeVariantGroup) => {
  if (!prose.value) return [] as HTMLElement[]
  const headings = [...prose.value.querySelectorAll('h2')]
  const parent = headings.find(h => h.textContent?.trim() === group.section)
  if (!parent) return []

  const out: HTMLElement[] = []
  let node = parent.nextElementSibling
  while (node && node.tagName !== 'H2') {
    if (node.tagName === 'H3' || node.tagName === 'H4') {
      const label = node.textContent?.trim() ?? ''
      const matches = !group.match || label.toLowerCase().includes(group.match.toLowerCase())
      const scope = group.scopeBy ? chosen.value[group.scopeBy] : null
      const inScope = !scope || label.toLowerCase().startsWith(scope.toLowerCase())
      if (matches && inScope) out.push(node as HTMLElement)
    }
    node = node.nextElementSibling
  }
  return out
}

// Headings that belong to a diet the reader did not pick are hidden outright.
const applyScopes = () => {
  if (!prose.value) return
  for (const group of variantGroups.value) {
    if (!group.options) continue
    const wanted = chosen.value[group.name] ?? group.default
    const pick = group.options.find(o => o === wanted)
      ?? group.options.find(o => wanted && slugify(o) === slugify(wanted))
      ?? group.options[0]!
    for (const heading of prose.value.querySelectorAll('h3')) {
      const label = heading.textContent?.trim().toLowerCase() ?? ''
      const owner = group.options.find(o => label.startsWith(o.toLowerCase()))
      if (!owner) continue
      const active = owner === pick
      heading.toggleAttribute('data-scope-hidden', !active)
      let node = heading.nextElementSibling
      while (node && !['H2', 'H3'].includes(node.tagName)) {
        node.toggleAttribute('data-scope-hidden', !active)
        node = node.nextElementSibling
      }
    }
  }
}

const applyVariants = () => {
  if (!prose.value) return
  applyScopes()
  for (const group of variantGroups.value) {
    // A declared-options group (Diet) has no headings of its own; it selects
    // which of another group's headings are eligible.
    if (group.options) {
      const wanted = chosen.value[group.name] ?? group.default
      const pick = group.options.find(o => o === wanted)
        ?? group.options.find(o => wanted && slugify(o) === slugify(wanted))
        ?? group.options[0]!
      chosen.value[group.name] = pick
      continue
    }

    const options = variantOptions(group)
    if (!options.length) continue
    const labels = options.map(h => h.textContent?.trim() ?? '')
    const wanted = chosen.value[group.name] ?? group.default
    const pick = labels.find(l => l === wanted)
      ?? labels.find(l => wanted && slugify(l) === slugify(wanted))
      ?? labels.find(l => wanted && l.toLowerCase().startsWith(wanted.toLowerCase()))
      ?? labels[0]!
    chosen.value[group.name] = pick
    for (const heading of options) {
      const active = (heading.textContent?.trim() ?? '').replace(/\s*⇄\s*$/, '') === pick
      heading.toggleAttribute('data-variant-hidden', !active)
      const level = Number(heading.tagName[1])
      let node = heading.nextElementSibling
      while (node && !(/^H[1-6]$/.test(node.tagName) && Number(node.tagName[1]) <= level)) {
        node.toggleAttribute('data-variant-hidden', !active)
        node = node.nextElementSibling
      }
    }
  }
}

// The heading comes from rendered markdown, so its switch control is injected.
const decorateVariantHeadings = () => {
  if (!prose.value) return
  for (const group of variantGroups.value) {
    for (const heading of variantOptions(group)) {
      if (heading.querySelector('.variant-switch')) continue
      const btn = document.createElement('button')
      btn.className = 'variant-switch'
      btn.type = 'button'
      btn.title = `Switch ${group.name.toLowerCase()}`
      btn.dataset.variantGroup = group.name
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/></svg>'
      heading.appendChild(btn)
    }
  }
}

const openSwitcher = ref<string | null>(null)
const switcherPos = ref<Record<string, string>>({})

const variantLabels = ref<Record<string, string[]>>({})

const indexVariants = () => {
  const map: Record<string, string[]> = {}
  for (const group of variantGroups.value) {
    map[group.name] = group.options
      ? [...group.options]
      : variantOptions(group).map(h => h.textContent?.trim() ?? '')
  }
  variantLabels.value = map
}

const syncQuery = () => {
  const query: Record<string, string> = {}
  if (multiplier.value !== 1) query.scale = String(multiplier.value)
  for (const g of variantGroups.value) {
    const pick = chosen.value[g.name]
    if (pick && pick !== g.default) query[queryKey(g.name)] = slugify(pick)
  }
  router.replace({ query })
}

const selectVariant = (group: string, option: string) => {
  chosen.value[group] = option
  // A scoping change invalidates the dependent group's current pick.
  const stale = variantGroups.value.filter(g => g.scopeBy === group).map(g => g.name)
  if (stale.length) {
    chosen.value = Object.fromEntries(
      Object.entries(chosen.value).filter(([k]) => !stale.includes(k))
    )
  }
  applyVariants()
  indexVariants()
  syncQuery()
}

// A section runs from its heading to the next one of the same or higher level,
// which no CSS sibling selector can express.
const setCollapsed = (heading: Element, hide: boolean) => {
  const level = Number(heading.tagName[1])
  let node = heading.nextElementSibling
  while (node) {
    const tag = node.tagName
    if (/^H[1-6]$/.test(tag) && Number(tag[1]) <= level) break
    if (hide) node.setAttribute('data-collapsed', '')
    else node.removeAttribute('data-collapsed')
    if (/^H[1-6]$/.test(tag)) node.classList.remove('collapsed')
    node = node.nextElementSibling
  }
}

// Collapsed headings show what they are hiding.
const labelSections = () => {
  if (!prose.value) return
  const headings = prose.value.querySelectorAll('h2, h3')
  for (const h of headings) {
    let count = 0
    let node = h.nextElementSibling
    while (node && !['H2', 'H3'].includes(node.tagName)) {
      if (node.tagName === 'UL' || node.tagName === 'OL') {
        count += node.querySelectorAll(':scope > li').length
      }
      node = node.nextElementSibling
    }
    if (count) h.setAttribute('data-count', `${count} item${count === 1 ? '' : 's'}`)
    else h.removeAttribute('data-count')
  }
}

const { visit } = useRecentRecipes()

const multiplier = ref(Number(route.query.scale) || 1)
const SCALES = [0.5, 1, 2, 3]

// Ingredient lists only; method steps must never be rewritten.
const applyScaling = () => {
  if (!prose.value) return
  const lists = prose.value.querySelectorAll('ul')
  for (const list of lists) {
    for (const li of list.querySelectorAll(':scope > li')) {
      const original = li.getAttribute('data-original') ?? li.textContent ?? ''
      if (!li.hasAttribute('data-original')) li.setAttribute('data-original', original)

      const child = li.querySelector('ul')
      if (child) continue

      const { text, rule, scaled } = scaleLine(original, multiplier.value)
      // Write into the first text node so checkboxes and links survive.
      const node = [...li.childNodes].find(n => n.nodeType === 3 && n.textContent?.trim())
      if (node) node.textContent = text
      li.classList.toggle('scaled', scaled)
      li.classList.toggle('unscaled', multiplier.value !== 1 && !scaled && rule === 'manual')
    }
  }
}

watch(multiplier, () => {
  applyScaling()
  syncQuery()
})

onMounted(() => {
  restoreChecks()
  labelSections()
  visit(recipe.value)
  applyScaling()
  indexVariants()
  decorateVariantHeadings()
  applyVariants()
})
watch(slug, () => nextTick(() => {
  restoreChecks()
  labelSections()
  visit(recipe.value)
  indexVariants()
  decorateVariantHeadings()
  applyVariants()
}))

const nutrition = computed(() => recipe.value?.nutrition)

const totalFat = computed(() => {
  const f = nutrition.value?.fat
  if (!f) return 0
  return (f.saturated ?? 0) + (f.mono ?? 0) + (f.poly ?? 0)
})

const totalCarbs = computed(() => {
  const c = nutrition.value?.carbs
  if (!c) return 0
  return (c.fiber ?? 0) + (c.sugars ?? 0)
})

const macroTotal = computed(
  () => (nutrition.value?.protein ?? 0) + totalCarbs.value + totalFat.value
)

const proteinPct = computed(() =>
  macroTotal.value
    ? Math.round(((nutrition.value?.protein ?? 0) / macroTotal.value) * 100)
    : 0
)
const carbsPct = computed(() =>
  macroTotal.value
    ? Math.round((totalCarbs.value / macroTotal.value) * 100)
    : 0
)
const fatPct = computed(() =>
  macroTotal.value ? Math.round((totalFat.value / macroTotal.value) * 100) : 0
)
</script>

<template>
  <div class="px-6 py-8 flex justify-center gap-8">
    <article class="w-full max-w-[760px] flex flex-col gap-6">
      <nav class="flex items-center gap-2 text-sm text-(--ui-text-muted) flex-wrap">
        <NuxtLink
          to="/"
          class="hover:text-primary-500 transition-colors"
        >Recipes</NuxtLink>
        <template
          v-for="crumb in trail"
          :key="crumb.to"
        >
          <UIcon
            name="i-lucide-chevron-right"
            class="size-3.5 shrink-0"
          />
          <NuxtLink
            :to="crumb.to"
            class="hover:text-primary-500 transition-colors"
          >{{ crumb.label }}</NuxtLink>
        </template>
        <template v-if="!trail.length && recipe?.category">
          <UIcon
            name="i-lucide-chevron-right"
            class="size-3.5 shrink-0"
          />
          <button
            class="hover:text-primary-500 transition-colors"
            @click="goToCategory(recipe!.category!)"
          >
            {{ recipe.category }}
          </button>
        </template>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-3.5 shrink-0"
        />
        <span class="text-(--ui-text) font-medium">{{ displayTitle }}</span>
      </nav>

      <div
        v-if="heroArt"
        class="aspect-21/9 rounded-xl bg-(--ui-bg-elevated) bg-cover bg-center"
        :style="{ backgroundImage: `url(${heroArt})` }"
      />

      <div class="flex flex-col gap-2">
        <h1 class="text-3xl/tight font-bold tracking-tight text-(--ui-text-highlighted)">
          {{ displayTitle }}
        </h1>
        <p
          v-if="recipe?.description"
          class="text-base/relaxed text-(--ui-text-muted)"
        >
          {{ recipe?.description }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div
          v-if="recipe?.tags?.length"
          class="flex flex-wrap gap-1.5 flex-1"
        >
          <NuxtLink
            v-for="tag in recipe.tags"
            :key="tag"
            :to="{ path: '/', query: { tag: tag.toLowerCase() } }"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--ui-bg-elevated) text-(--ui-text-muted) text-xs font-medium border border-transparent hover:bg-primary-500/12 hover:text-primary-500 transition-colors"
          >
            <UIcon
              name="i-lucide-tag"
              class="size-2.5"
            />
            {{ tag }}
          </NuxtLink>
        </div>
        <UButton
          :icon="linkCopied ? 'i-lucide-check' : 'i-lucide-link'"
          :label="linkCopied ? 'Copied' : 'Link'"
          color="neutral"
          variant="ghost"
          size="sm"
          class="shrink-0 ml-auto"
          :title="shareUrl"
          @click="copyLink"
        />
        <UButton
          icon="i-lucide-scroll-text"
          label="Card"
          color="neutral"
          variant="ghost"
          size="sm"
          class="shrink-0"
          @click="openCard"
        />
        <UButton
          :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          :label="copied ? 'Copied' : 'Copy'"
          color="neutral"
          variant="ghost"
          size="sm"
          class="shrink-0"
          @click="copyRecipe"
        />
        <UButton
          icon="i-lucide-chef-hat"
          label="Cook"
          color="primary"
          variant="soft"
          size="sm"
          class="hidden md:flex shrink-0"
          @click="cookingMode = true"
        />
      </div>

      <div
        v-for="group in variantGroups"
        :key="group.name"
        class="flex items-center gap-2 text-sm flex-wrap"
      >
        <span class="text-(--ui-text-dimmed)">{{ group.name }}</span>
        <div class="flex rounded-lg border border-(--ui-border) overflow-hidden">
          <button
            v-for="option in variantLabels[group.name] ?? []"
            :key="option"
            class="px-2.5 py-1 text-xs font-medium transition-colors"
            :class="chosen[group.name] === option
              ? 'bg-primary-500 text-white'
              : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated)'"
            @click="selectVariant(group.name, option)"
          >
            {{ option.replace(group.match ?? '', '').replace(/^[\s:.\-\d]+/, '') || option }}
          </button>
        </div>
      </div>

      <div
        v-if="recipe?.body"
        class="flex items-center gap-2 text-sm"
      >
        <span class="text-(--ui-text-dimmed)">Scale</span>
        <div class="flex rounded-lg border border-(--ui-border) overflow-hidden">
          <button
            v-for="s in SCALES"
            :key="s"
            class="px-2.5 py-1 text-xs font-medium transition-colors"
            :class="multiplier === s
              ? 'bg-primary-500 text-white'
              : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated)'"
            @click="multiplier = s"
          >
            {{ s === 0.5 ? '½×' : `${s}×` }}
          </button>
        </div>
        <span
          v-if="multiplier !== 1"
          class="text-xs text-(--ui-text-dimmed)"
        >
          Times and pan sizes do not scale. Marked items need judgement.
        </span>
      </div>

      <div
        v-if="openSwitcher"
        class="fixed inset-0 z-40"
        @click="openSwitcher = null"
      />

      <div
        v-if="motherOf"
        class="flex items-center gap-2.5 p-3 rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) text-[13px]"
      >
        <UIcon
          name="i-lucide-corner-left-up"
          class="size-4 shrink-0 text-(--ui-text-dimmed)"
        />
        <span class="text-(--ui-text-muted)">
          Derives from
          <NuxtLink
            :to="recipeUrl(motherOf.path)"
            class="font-medium text-primary-500 hover:underline"
          >{{ motherOf.title }}</NuxtLink>,
          one of the five French mother sauces.
        </span>
      </div>

      <div
        v-if="recipe?.motherSauce"
        class="flex items-start gap-3 p-3.5 rounded-lg border border-primary-500/25 bg-primary-500/8"
      >
        <UIcon
          name="i-lucide-git-fork"
          class="size-4 shrink-0 mt-0.5 text-primary-500"
        />
        <div class="min-w-0">
          <p class="text-[13px] font-semibold text-(--ui-text-highlighted)">
            One of the five French mother sauces
          </p>
          <p class="text-[13px] text-(--ui-text-muted) mt-0.5">
            Everything below derives from this base.
          </p>
          <div
            v-if="derivatives?.length"
            class="flex flex-wrap gap-1.5 mt-2"
          >
            <NuxtLink
              v-for="d in derivatives"
              :key="d.path"
              :to="recipeUrl(d.path)"
              class="text-[11px] px-2 py-0.5 rounded-full bg-(--ui-bg) border border-(--ui-border) text-(--ui-text-muted) hover:border-primary-500 hover:text-primary-500 transition-colors"
            >
              {{ d.title }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <div
        v-if="inherited?.items.length"
        class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) overflow-hidden"
      >
        <p class="px-3.5 py-2 text-[11px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) border-b border-(--ui-border) flex items-center gap-1.5">
          <UIcon
            name="i-lucide-link"
            class="size-3"
          />
          From
          <NuxtLink
            :to="recipeUrl(inherited.path)"
            class="normal-case tracking-normal font-medium text-primary-500 hover:underline"
          >{{ inherited.title }}</NuxtLink>
        </p>
        <ul class="px-3.5 py-2.5 flex flex-col gap-1.5">
          <li
            v-for="row in inherited.rows"
            :key="row.text"
            class="text-[13px] flex items-start gap-2"
            :class="row.swap ? 'text-(--ui-text)' : 'text-(--ui-text-muted)'"
          >
            <span
              class="mt-1.5 size-1 rounded-full shrink-0"
              :class="row.swap ? 'bg-primary-500' : 'bg-(--ui-border-accented)'"
            />
            <span v-if="row.swap">
              <span class="line-through opacity-55">{{ row.text }}</span>
              <UIcon
                name="i-lucide-arrow-right"
                class="size-3 mx-1 align-middle text-(--ui-text-dimmed)"
              />
              <span class="font-medium">{{ row.swap.to }}</span>
              <span
                v-if="row.swap.note"
                class="text-(--ui-text-dimmed)"
              >, {{ row.swap.note }}</span>
            </span>
            <span v-else>{{ row.text }}</span>
          </li>
        </ul>
      </div>

      <div
        v-if="recipe?.body"
        ref="prose"
        class="recipe-prose"
        @click="onProseClick"
      >
        <ContentRenderer :value="recipe" />
      </div>

      <Teleport to="body">
        <div
          v-if="cardOpen"
          class="recipe-card-overlay"
          @click.self="cardOpen = false"
        >
          <article class="recipe-card">
            <header class="recipe-card-head">
              <div>
                <p
                  v-if="recipe?.category"
                  class="recipe-card-eyebrow"
                >
                  {{ recipe.category }}
                </p>
                <h1>{{ displayTitle }}</h1>
                <p
                  v-if="recipe?.description"
                  class="recipe-card-desc"
                >
                  {{ recipe.description }}
                </p>
              </div>
              <div class="recipe-card-actions">
                <button
                  title="Print"
                  @click="printCard()"
                >
                  <UIcon
                    name="i-lucide-printer"
                    class="size-4"
                  />
                </button>
                <button
                  title="Close"
                  @click="cardOpen = false"
                >
                  <UIcon
                    name="i-lucide-x"
                    class="size-4"
                  />
                </button>
              </div>
            </header>

            <dl
              v-if="recipe?.servings || recipe?.time || multiplier !== 1"
              class="recipe-card-meta"
            >
              <div v-if="recipe?.servings">
                <dt>Serves</dt>
                <dd>{{ recipe.servings }}</dd>
              </div>
              <div v-if="recipe?.time">
                <dt>Time</dt>
                <dd>{{ formatDuration(recipe.time) }}</dd>
              </div>
              <div v-if="multiplier !== 1">
                <dt>Scale</dt>
                <dd>{{ multiplier }}&times;</dd>
              </div>
              <div
                v-for="group in variantGroups"
                v-show="chosen[group.name]"
                :key="group.name"
              >
                <dt>{{ group.name }}</dt>
                <dd>{{ chosen[group.name] }}</dd>
              </div>
            </dl>

            <div class="recipe-card-body">
              <section
                v-for="section in cardSections"
                :key="section.heading"
              >
                <h2>{{ section.heading }}</h2>
                <ul v-if="section.items.length">
                  <li
                    v-for="item in section.items"
                    :key="item"
                  >
                    {{ item }}
                  </li>
                </ul>
                <ol v-if="section.steps.length">
                  <li
                    v-for="step in section.steps"
                    :key="step"
                  >
                    {{ step }}
                  </li>
                </ol>
              </section>
            </div>

            <footer class="recipe-card-foot">
              {{ displayTitle }}
            </footer>
          </article>
        </div>
      </Teleport>

      <Teleport
        v-if="openSwitcher"
        to="body"
      >
        <div
          class="fixed z-50 min-w-44 rounded-lg border border-(--ui-border) bg-(--ui-bg) shadow-lg p-1"
          :style="switcherPos"
        >
          <button
            v-for="option in variantLabels[openSwitcher] ?? []"
            :key="option"
            class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-left transition-colors"
            :class="chosen[openSwitcher] === option
              ? 'bg-primary-500/12 text-primary-500 font-medium'
              : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text)'"
            @click="selectVariant(openSwitcher, option); openSwitcher = null"
          >
            <UIcon
              v-if="chosen[openSwitcher] === option"
              name="i-lucide-check"
              class="size-3.5 shrink-0"
            />
            <span
              v-else
              class="size-3.5 shrink-0"
            />
            {{ option }}
          </button>
        </div>
      </Teleport>

      <section
        v-if="related?.length"
        class="flex flex-col gap-3"
      >
        <h2 class="text-lg font-bold tracking-tight">
          Other related recipes
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <NuxtLink
            v-for="r in related as RecipeMeta[]"
            :key="r.path"
            :to="recipeUrl(r.path)"
            class="flex flex-col gap-2 p-2 rounded-xl border border-(--ui-border) bg-(--ui-bg) transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary-500"
          >
            <RecipeThumb
              :title="r.title"
              :category="r.category"
              :image="r.image"
              :cover="r.cover"
            />
            <div class="px-1 pb-1">
              <p
                class="text-[10px] font-semibold uppercase tracking-wider text-primary-500"
              >
                {{ r.category }}
              </p>
              <p class="text-sm/snug font-semibold">{{ r.title }}</p>
            </div>
          </NuxtLink>
        </div>
      </section>
    </article>

    <aside
      v-if="showToc"
      class="hidden xl:block w-56 shrink-0"
    >
      <UContentToc
        :links="tocLinks"
        highlight
        highlight-variant="circuit"
        class="sticky top-20"
      />
    </aside>
  </div>

  <Teleport
    v-if="nutrition?.calories"
    to="body"
  >
    <!-- Tab -->
    <button
      class="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 py-3 px-2 bg-(--ui-bg) border border-r-0 border-(--ui-border) rounded-l-xl shadow-md text-primary-500 transition-transform"
      :class="nutritionOpen ? 'translate-x-full' : ''"
      @click="nutritionOpen = true"
    >
      <UIcon
        name="i-lucide-activity"
        class="size-4"
      />
      <span
        class="text-[10px] font-semibold uppercase tracking-widest"
        style="writing-mode: vertical-rl; text-orientation: mixed"
      >Nutrition</span>
      <UIcon
        name="i-lucide-chevron-left"
        class="size-3.5"
      />
    </button>

    <!-- Backdrop -->
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="nutritionOpen"
        class="fixed inset-0 z-40 bg-black/30"
        @click="nutritionOpen = false"
      />
    </Transition>

    <!-- Drawer -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="nutritionOpen"
        class="fixed right-0 top-0 h-full w-[360px] z-50 bg-(--ui-bg) border-l border-(--ui-border) shadow-2xl flex flex-col overflow-y-auto"
      >
        <!-- Header -->
        <div
          class="px-5 pt-5 pb-4 border-b border-(--ui-border) flex items-start justify-between"
        >
          <div>
            <p
              class="text-[11px] font-semibold uppercase tracking-widest text-primary-500 mb-0.5"
            >
              Nutrition
            </p>
            <p class="text-xl font-bold text-(--ui-text)">
              Per serving
            </p>
          </div>
          <button
            class="text-(--ui-text-muted) hover:text-(--ui-text) transition-colors mt-0.5"
            @click="nutritionOpen = false"
          >
            <UIcon
              name="i-lucide-x"
              class="size-5"
            />
          </button>
        </div>

        <div class="p-5 flex flex-col gap-5">
          <!-- Calories card -->
          <div
            class="rounded-xl p-4 bg-primary-500/8 border border-primary-500/15"
          >
            <div class="flex items-baseline gap-1.5">
              <span class="text-5xl font-bold text-primary-500">{{
                nutrition.calories
              }}</span>
              <span class="text-lg text-(--ui-text-muted)">kcal</span>
            </div>
            <p class="text-sm text-(--ui-text-dimmed) mt-1">
              per serving{{
                nutrition.servings ? ` · ${nutrition.servings} servings` : ""
              }}
            </p>
          </div>

          <!-- Macro bar -->
          <div class="flex flex-col gap-2.5">
            <div class="flex h-3 rounded-full overflow-hidden gap-px">
              <div
                class="bg-blue-500 transition-all"
                :style="`width: ${proteinPct}%`"
              />
              <div
                class="bg-amber-400 transition-all"
                :style="`width: ${carbsPct}%`"
              />
              <div
                class="bg-red-500 transition-all"
                :style="`width: ${fatPct}%`"
              />
            </div>
            <div class="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span
                  class="inline-block size-2 rounded-full bg-blue-500 mr-1.5"
                />
                <span
                  class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
                >Protein</span>
                <p class="font-bold text-(--ui-text) mt-0.5">
                  {{ nutrition.protein ?? 0 }}g
                  <span class="text-(--ui-text-dimmed) font-normal text-xs">{{ proteinPct }}%</span>
                </p>
              </div>
              <div>
                <span
                  class="inline-block size-2 rounded-full bg-amber-400 mr-1.5"
                />
                <span
                  class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
                >Carbs</span>
                <p class="font-bold text-(--ui-text) mt-0.5">
                  {{ totalCarbs }}g
                  <span class="text-(--ui-text-dimmed) font-normal text-xs">{{ carbsPct }}%</span>
                </p>
              </div>
              <div>
                <span
                  class="inline-block size-2 rounded-full bg-red-500 mr-1.5"
                />
                <span
                  class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
                >Fat</span>
                <p class="font-bold text-(--ui-text) mt-0.5">
                  {{ totalFat }}g
                  <span class="text-(--ui-text-dimmed) font-normal text-xs">{{ fatPct }}%</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Secondary stats -->
          <div class="grid grid-cols-3 gap-2">
            <div
              v-if="nutrition.carbs?.fiber"
              class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) px-3 py-2.5"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
              >
                Fiber
              </p>
              <p class="font-bold text-(--ui-text) mt-0.5">
                {{ nutrition.carbs.fiber
                }}<span class="text-xs font-normal text-(--ui-text-dimmed)">g</span>
              </p>
            </div>
            <div
              v-if="nutrition.carbs?.sugars"
              class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) px-3 py-2.5"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
              >
                Sugar
              </p>
              <p class="font-bold text-(--ui-text) mt-0.5">
                {{ nutrition.carbs.sugars
                }}<span class="text-xs font-normal text-(--ui-text-dimmed)">g</span>
              </p>
            </div>
            <div
              v-if="nutrition.sodium"
              class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) px-3 py-2.5"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
              >
                Sodium
              </p>
              <p class="font-bold text-(--ui-text) mt-0.5">
                {{ nutrition.sodium
                }}<span class="text-xs font-normal text-(--ui-text-dimmed)">mg</span>
              </p>
            </div>
            <div
              v-if="nutrition.potassium"
              class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) px-3 py-2.5"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
              >
                Potassium
              </p>
              <p class="font-bold text-(--ui-text) mt-0.5">
                {{ nutrition.potassium
                }}<span class="text-xs font-normal text-(--ui-text-dimmed)">mg</span>
              </p>
            </div>
            <div
              v-if="nutrition.cholesterol"
              class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) px-3 py-2.5"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
              >
                Cholesterol
              </p>
              <p class="font-bold text-(--ui-text) mt-0.5">
                {{ nutrition.cholesterol
                }}<span class="text-xs font-normal text-(--ui-text-dimmed)">mg</span>
              </p>
            </div>
            <div
              v-if="nutrition.fat?.saturated"
              class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) px-3 py-2.5"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
              >
                Sat. fat
              </p>
              <p class="font-bold text-(--ui-text) mt-0.5">
                {{ nutrition.fat.saturated
                }}<span class="text-xs font-normal text-(--ui-text-dimmed)">g</span>
              </p>
            </div>
          </div>

          <!-- Vitamins -->
          <div
            v-if="nutrition.vitamins && Object.keys(nutrition.vitamins).length"
          >
            <p
              class="text-[10px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) mb-3 flex justify-between"
            >
              Micronutrients
              <span class="normal-case tracking-normal">% daily value</span>
            </p>
            <div class="flex flex-col gap-2.5">
              <div
                v-for="(val, key) in nutrition.vitamins"
                :key="key"
                class="flex items-center gap-3"
              >
                <span
                  class="text-sm text-(--ui-text) w-20 capitalize shrink-0"
                >{{
                  key === "a" ? "Vit. A" : key === "c" ? "Vit. C" : key
                }}</span>
                <div
                  class="flex-1 h-1.5 bg-(--ui-bg-elevated) rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-primary-500 rounded-full"
                    :style="`width: ${Math.min(val, 100)}%`"
                  />
                </div>
                <span
                  class="text-sm font-medium text-(--ui-text-muted) w-9 text-right shrink-0"
                >{{ val }}%</span>
              </div>
            </div>
          </div>

          <p
            class="text-xs text-(--ui-text-dimmed) flex items-center gap-1.5 pt-1 border-t border-(--ui-border) border-dashed"
          >
            <UIcon
              name="i-lucide-sparkles"
              class="size-3 shrink-0 text-primary-500"
            />
            Values are estimates. Scaled to
            {{ nutrition.servings ?? 1 }} serving{{
              (nutrition.servings ?? 1) !== 1 ? "s" : ""
            }}.
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <CookingMode
      v-if="cookingMode"
      :recipe="recipe ?? null"
      @exit="cookingMode = false"
    />
  </Teleport>
</template>
