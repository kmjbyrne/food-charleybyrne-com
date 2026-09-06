import type { RecipeMeta } from '~/types/recipe'

export const useRecipeFilters = () => {
  const route = useRoute()
  const router = useRouter()

  // Category lives in the path (/c/keto/desserts); tag and search stay as query
  // params so they compose on top of any category.
  const onIndex = () => route.path === '/' || route.path.startsWith('/c/')

  const categoryPath = computed(() =>
    route.path.startsWith('/c/') ? route.path.slice(3).replace(/\/$/, '') : ''
  )

  const applyFilters = (query: Record<string, string | undefined>, path?: string) => {
    const next = { ...route.query, ...query }
    const target = path ?? (onIndex() ? route.path : '/')
    if (onIndex()) return router.replace({ path: target, query: next })
    return router.push({ path: target, query: next })
  }

  const search = computed({
    get: () => (onIndex() ? (route.query.q as string) ?? '' : ''),
    set: (v: string) => applyFilters({ q: v || undefined })
  })

  const activeCategory = computed({
    get: () => categoryPath.value,
    set: (v: string) => applyFilters({ tag: undefined }, v ? `/c/${v}` : '/')
  })

  const activeTag = computed({
    get: () => (onIndex() ? (route.query.tag as string)?.toLowerCase() ?? null : null),
    set: (v: string | null) => applyFilters({ tag: v?.toLowerCase() ?? undefined })
  })

  return { search, activeCategory, activeTag, categoryPath }
}

// A category is a path, and a recipe can sit at several: its own directory plus
// any facet paths declared in frontmatter.
export const inCategory = (r: RecipeMeta, path: string) => {
  const needle = path.toLowerCase()
  if ((r.path ?? '').toLowerCase().startsWith(`/recipes/${needle}/`)) return true
  return (r.paths ?? []).some(p => `${p.toLowerCase()}/`.startsWith(`${needle}/`))
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
      if (activeCategory.value && !inCategory(r, activeCategory.value)) return false
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
