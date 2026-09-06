import type { RecipeMeta } from '~/types/recipe'

export interface GraphNode {
  id: string
  title: string
  category: string
  tags: string[]
  x: number
  y: number
  r: number
  kind: 'hub' | 'recipe'
  hub?: string
}

export interface GraphEdge {
  a: GraphNode
  b: GraphNode
  weight: number
}

// A radial layout: categories become hubs on an inner ring, their recipes fan
// out around them, and shared tags draw the links between dishes.
export const useRecipeGraph = (recipes: Ref<RecipeMeta[]> | ComputedRef<RecipeMeta[]>) =>
  computed(() => {
    const list = recipes.value.filter(r => r.title)
    const byHub = new Map<string, RecipeMeta[]>()

    for (const recipe of list) {
      const hub = (recipe.path ?? '').split('/').filter(Boolean).slice(1, -1)[0] ?? 'other'
      if (!byHub.has(hub)) byHub.set(hub, [])
      byHub.get(hub)!.push(recipe)
    }

    const hubs = [...byHub.entries()].sort((a, b) => b[1].length - a[1].length)
    const nodes: GraphNode[] = []
    const hubRadius = 260

    hubs.forEach(([hub, members], i) => {
      const angle = (i / hubs.length) * Math.PI * 2 - Math.PI / 2
      const hx = Math.cos(angle) * hubRadius
      const hy = Math.sin(angle) * hubRadius

      nodes.push({
        id: `hub:${hub}`,
        title: hub.split('-').map(w => w[0]!.toUpperCase() + w.slice(1)).join(' '),
        category: hub,
        tags: [],
        x: hx,
        y: hy,
        r: 9 + Math.min(members.length, 12),
        kind: 'hub'
      })

      // Fan the members outward from the hub, in rings so dense hubs stay legible.
      const perRing = 10
      members.forEach((recipe, j) => {
        const ring = Math.floor(j / perRing)
        const slot = j % perRing
        const count = Math.min(perRing, members.length - ring * perRing)
        const spread = Math.PI * 0.85
        const step = count > 1 ? spread / (count - 1) : 0
        const a = angle - spread / 2 + slot * step
        const dist = 95 + ring * 52

        nodes.push({
          id: recipe.path ?? recipe.title,
          title: recipe.title,
          category: recipe.category ?? hub,
          tags: (recipe.tags ?? []).map(t => t.toLowerCase()),
          x: hx + Math.cos(a) * dist,
          y: hy + Math.sin(a) * dist,
          r: 5,
          kind: 'recipe',
          hub
        })
      })
    })

    const recipeNodes = nodes.filter(n => n.kind === 'recipe')
    const edges: GraphEdge[] = []

    for (let i = 0; i < recipeNodes.length; i++) {
      for (let j = i + 1; j < recipeNodes.length; j++) {
        const a = recipeNodes[i]!
        const b = recipeNodes[j]!
        const shared = a.tags.filter(t => b.tags.includes(t))
        if (shared.length) edges.push({ a, b, weight: shared.length })
      }
    }

    return { nodes, edges, hubs: nodes.filter(n => n.kind === 'hub') }
  })
