import type { RecipeMeta } from '~/types/recipe'

// Frontmatter carries placeholders ("ADD"), empty strings and a legacy
// coverImage key; only real-looking paths count as art.
export const useRecipeArt = (recipe?: Partial<RecipeMeta> | null): string | null => {
  const candidates = [recipe?.image, recipe?.cover]
  return candidates.find(v => v && /^(\/|https?:|data:)/.test(v)) || null
}
