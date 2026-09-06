export interface IngredientGroup {
  label: string
  items: string[]
}

export interface RecipeContent {
  ingredientGroups: IngredientGroup[]
  steps: string[]
}

type MinimarkNode
  = | string
    | [tag: string, attrs: Record<string, unknown>, ...children: MinimarkNode[]]

interface RecipeWithContent {
  meta?: { data?: Record<string, string[]> }
  body?: { type?: string, value?: MinimarkNode[] }
}

function extractMinimarkText(node: MinimarkNode): string {
  if (typeof node === 'string') return node
  const [, , ...children] = node
  return children.map(extractMinimarkText).join('')
}

function extractMinimarkListItems(node: MinimarkNode): string[] {
  if (typeof node === 'string') return []
  const [tag, , ...children] = node
  if (tag !== 'ul' && tag !== 'ol') return []
  return children
    .filter(
      (c): c is MinimarkNode =>
        Array.isArray(c) && (c as MinimarkNode[])[0] === 'li'
    )
    .map(li => extractMinimarkText(li).trim())
    .filter(Boolean)
}

export function useRecipeContent(
  recipe: Ref<RecipeWithContent | null | undefined>
): ComputedRef<RecipeContent> {
  return computed<RecipeContent>(() => {
    const r = recipe.value
    if (!r) return { ingredientGroups: [], steps: [] }

    const ingredientGroups: IngredientGroup[] = []
    const steps: string[] = []

    const metaData = r.meta?.data
    if (metaData && Object.keys(metaData).length > 0) {
      for (const [key, items] of Object.entries(metaData)) {
        if (Array.isArray(items)) {
          ingredientGroups.push({ label: key, items: items.map(String) })
        }
      }
    }

    const bodyNodes = r.body?.value ?? []

    if (ingredientGroups.length === 0) {
      let inIngredients = false
      let currentLabel = 'Ingredients'
      let currentItems: string[] = []

      for (const node of bodyNodes) {
        if (typeof node === 'string') continue
        const [tag] = node

        if (tag === 'h2') {
          const text = extractMinimarkText(node).trim().toLowerCase()
          if (text === 'ingredients') {
            inIngredients = true
            currentLabel = 'Ingredients'
            currentItems = []
            continue
          } else if (inIngredients) {
            if (currentItems.length > 0)
              ingredientGroups.push({
                label: currentLabel,
                items: currentItems
              })
            inIngredients = false
          }
        }

        if (tag === 'h3' && inIngredients) {
          if (currentItems.length > 0)
            ingredientGroups.push({ label: currentLabel, items: currentItems })
          currentLabel = extractMinimarkText(node).trim()
          currentItems = []
          continue
        }

        if (tag === 'ul' && inIngredients) {
          currentItems.push(...extractMinimarkListItems(node))
        }
      }

      if (inIngredients && currentItems.length > 0) {
        ingredientGroups.push({ label: currentLabel, items: currentItems })
      }
    }

    for (const node of bodyNodes) {
      if (typeof node === 'string') continue
      const [tag] = node
      if (tag === 'ol') {
        steps.push(...extractMinimarkListItems(node))
      }
    }

    if (steps.length === 0) {
      let afterMethod = false
      for (const node of bodyNodes) {
        if (typeof node === 'string') continue
        const [tag] = node
        if (
          tag === 'h2'
          && extractMinimarkText(node).trim().toLowerCase() === 'method'
        ) {
          afterMethod = true
          continue
        }
        if (afterMethod && tag === 'ul') {
          steps.push(...extractMinimarkListItems(node))
          break
        }
      }
    }

    return { ingredientGroups, steps }
  })
}
