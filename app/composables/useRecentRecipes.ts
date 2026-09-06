import type { RecipeMeta } from '~/types/recipe'

export interface RecentRecipe {
  path: string
  title: string
  category?: string
}

const KEY = 'recent-recipes'
const LIMIT = 10

export const useRecentRecipes = () => {
  const recent = useState<RecentRecipe[]>('recent-recipes', () => [])

  const load = () => {
    try {
      recent.value = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    } catch {
      recent.value = []
    }
  }

  const visit = (recipe: Partial<RecipeMeta> | null | undefined) => {
    if (!recipe?.path || !recipe.title) return
    const entry: RecentRecipe = {
      path: recipe.path,
      title: recipe.title,
      category: recipe.category
    }
    const next = [entry, ...recent.value.filter(r => r.path !== entry.path)].slice(0, LIMIT)
    recent.value = next
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // storage unavailable
    }
  }

  const clear = () => {
    recent.value = []
    try {
      localStorage.removeItem(KEY)
    } catch {
      // storage unavailable
    }
  }

  return { recent, load, visit, clear }
}
