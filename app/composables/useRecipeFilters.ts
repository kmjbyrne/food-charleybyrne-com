import type { RecipeMeta } from '~/types/recipe'

export const useRecipeFilters = () => {
  const route = useRoute()
  const router = useRouter()

  // Filters only render on the index, so applying one from a recipe page has to
  // navigate there rather than leave a dead query param behind.
  const onIndex = () => route.path === '/'

  const applyFilters = (query: Record<string, string | undefined>) => {
    const next = { ...route.query, ...query }
    if (onIndex()) return router.replace({ path: '/', query: next })
    return router.push({ path: '/', query: next })
  }

  const search = computed({
    get: () => (onIndex() ? (route.query.q as string) ?? '' : ''),
    set: (v: string) => applyFilters({ q: v || undefined })
  })

  const activeCategory = computed({
    get: () => (onIndex() ? (route.query.category as string) ?? 'All' : 'All'),
    set: (v: string) => applyFilters({ category: v === 'All' ? undefined : v, tag: undefined })
  })

  const activeTag = computed({
    get: () => (onIndex() ? (route.query.tag as string)?.toLowerCase() ?? null : null),
    set: (v: string | null) => applyFilters({ tag: v?.toLowerCase() ?? undefined })
  })

  return { search, activeCategory, activeTag }
}

// Some categories (Keto) are directories rather than frontmatter values.
export const matchesCategory = (r: RecipeMeta, category: string) => {
  if (r.category === category) return true
  return r.path?.toLowerCase().split('/').includes(category.toLowerCase()) ?? false
}

export const useRecipeList = () => {
  const { search, activeCategory, activeTag } = useRecipeFilters()

  const { data: allRecipes } = useAsyncData('all-recipes', () =>
    queryCollection('recipes')
      .select('path', 'stem', 'title', 'description', 'category', 'tags', 'image', 'cover')
      .all()
  )

  const filtered = computed<RecipeMeta[]>(() => {
    const all = (allRecipes.value ?? []) as RecipeMeta[]
    return all.filter((r) => {
      if (activeCategory.value !== 'All' && !matchesCategory(r, activeCategory.value)) return false
      if (activeTag.value && !r.tags?.map(t => t.toLowerCase()).includes(activeTag.value)) return false
      if (search.value) {
        const q = search.value.toLowerCase()
        const blob = [r.title, r.description, r.category, ...(r.tags ?? [])].join(' ').toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  })

  return { allRecipes, filtered }
}
