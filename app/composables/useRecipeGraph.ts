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
  kind: 'tag' | 'link'
  shared: string[]
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
    const hubRadius = 520

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
        r: 11 + Math.min(members.length, 14),
        kind: 'hub'
      })

      // Fan the members outward from the hub, in rings so dense hubs stay legible.
      const perRing = 8
      members.forEach((recipe, j) => {
        const ring = Math.floor(j / perRing)
        const slot = j % perRing
        const count = Math.min(perRing, members.length - ring * perRing)
        const spread = Math.PI * 0.7
        const step = count > 1 ? spread / (count - 1) : 0
        const a = angle - spread / 2 + slot * step
        const dist = 165 + ring * 86

        nodes.push({
          id: recipe.path ?? recipe.title,
          title: recipe.title,
          category: recipe.category ?? hub,
          tags: (recipe.tags ?? []).map(t => t.toLowerCase()),
          x: hx + Math.cos(a) * dist,
          y: hy + Math.sin(a) * dist,
          r: 6,
          kind: 'recipe',
          hub
        })
      })
    })

    const recipeNodes = nodes.filter(n => n.kind === 'recipe')
    const edges: GraphEdge[] = []

    // A tag on a dozen recipes connects everything to everything and the graph
    // turns into a hairball, so only the discriminating ones draw an edge.
    const tagCounts: Record<string, number> = {}
    for (const node of recipeNodes) {
      for (const t of node.tags) tagCounts[t] = (tagCounts[t] ?? 0) + 1
    }
    const MAX_TAG_SPREAD = 6

    for (let i = 0; i < recipeNodes.length; i++) {
      for (let j = i + 1; j < recipeNodes.length; j++) {
        const a = recipeNodes[i]!
        const b = recipeNodes[j]!
        const shared = a.tags
          .filter(t => b.tags.includes(t))
          .filter(t => (tagCounts[t] ?? 0) <= MAX_TAG_SPREAD)
        if (shared.length) edges.push({ a, b, weight: shared.length, kind: 'tag', shared })
      }
    }

    // A recipe that references another is a stronger relationship than a shared
    // tag. The edge is undirected, so a dressing shows its salad and vice versa.
    const byId = new Map(recipeNodes.map(n => [n.id, n]))
    const seen = new Set<string>()
    for (const recipe of list) {
      const from = byId.get(recipe.path ?? '')
      if (!from) continue
      for (const target of recipe.links ?? []) {
        const to = byId.get(target)
        if (!to || to === from) continue
        const key = [from.id, to.id].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({ a: from, b: to, weight: 3, kind: 'link', shared: [] })
      }
    }

    return { nodes, edges, hubs: nodes.filter(n => n.kind === 'hub') }
  })
