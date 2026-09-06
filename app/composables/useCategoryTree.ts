import type { RecipeMeta } from '~/types/recipe'

export interface CategoryNode {
  slug: string
  path: string
  label: string
  icon: string
  count: number
  children: CategoryNode[]
}

const ICONS: Record<string, string> = {
  sauces: 'i-lucide-droplet',
  curry: 'i-lucide-flame',
  mains: 'i-lucide-utensils',
  chicken: 'i-lucide-drumstick',
  fish: 'i-lucide-fish',
  seafood: 'i-lucide-shell',
  sides: 'i-lucide-salad',
  bread: 'i-lucide-sandwich',
  snacks: 'i-lucide-cookie',
  desserts: 'i-lucide-cake',
  beverages: 'i-lucide-coffee',
  condiments: 'i-lucide-flask-round',
  marinades: 'i-lucide-flask-conical',
  pastes: 'i-lucide-blend',
  keto: 'i-lucide-leaf'
}

const toLabel = (slug: string) =>
  slug.split('-').map(w => w[0]!.toUpperCase() + w.slice(1)).join(' ')

// The directory tree under content/recipes is the category hierarchy, so the
// nav stays honest when files move.
export const useCategoryTree = (recipes: Ref<RecipeMeta[]> | ComputedRef<RecipeMeta[]>) =>
  computed<CategoryNode[]>(() => {
    const roots: CategoryNode[] = []

    for (const recipe of recipes.value) {
      const segments = (recipe.path ?? '').split('/').filter(Boolean).slice(1, -1)
      let siblings = roots
      const trail: string[] = []

      for (const slug of segments) {
        trail.push(slug)
        let node = siblings.find(n => n.slug === slug)
        if (!node) {
          node = {
            slug,
            path: trail.join('/'),
            label: toLabel(slug),
            icon: ICONS[slug] ?? 'i-lucide-folder',
            count: 0,
            children: []
          }
          siblings.push(node)
        }
        node.count++
        siblings = node.children
      }
    }

    const sort = (nodes: CategoryNode[]): CategoryNode[] => {
      nodes.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      nodes.forEach(n => sort(n.children))
      return nodes
    }

    return sort(roots)
  })

export const categoryTrail = (tree: CategoryNode[], path: string): CategoryNode[] => {
  const trail: CategoryNode[] = []
  let level = tree
  for (const slug of path.split('/').filter(Boolean)) {
    const node = level.find(n => n.slug === slug)
    if (!node) break
    trail.push(node)
    level = node.children
  }
  return trail
}
