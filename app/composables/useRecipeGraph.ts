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
  count?: number
}

export interface GraphEdge {
  a: GraphNode
  b: GraphNode
  weight: number
  kind: 'tag' | 'link' | 'spoke'
  shared: string[]
}

// A radial layout: categories become hubs on an inner ring, their recipes fan
// out around them, and shared tags draw the links between dishes.
export const useRecipeGraph = (recipes: Ref<RecipeMeta[]> | ComputedRef<RecipeMeta[]>) =>
  computed(() => {
    const list = recipes.value.filter(r => r.title)
    const byHub = new Map<string, RecipeMeta[]>()

    for (const recipe of list) {
      // The full directory path is the hub, so keto/desserts is its own group
      // rather than being folded into keto.
      const dirs = (recipe.path ?? '').split('/').filter(Boolean).slice(1, -1)
      const hub = dirs.length
        ? dirs.join('/')
        : (recipe.category ?? 'other').toLowerCase().replace(/\s+/g, '-')
      if (!byHub.has(hub)) byHub.set(hub, [])
      byHub.get(hub)!.push(recipe)
    }

    // Sort by path so a child hub (keto/desserts) sits next to its parent.
    const hubs = [...byHub.entries()].sort((a, b) => {
      const rootA = a[0].split('/')[0]!
      const rootB = b[0].split('/')[0]!
      if (rootA !== rootB) {
        const sizeA = [...byHub.entries()].filter(([k]) => k.split('/')[0] === rootA)
          .reduce((n, [, v]) => n + v.length, 0)
        const sizeB = [...byHub.entries()].filter(([k]) => k.split('/')[0] === rootB)
          .reduce((n, [, v]) => n + v.length, 0)
        return sizeB - sizeA || rootA.localeCompare(rootB)
      }
      return a[0].split('/').length - b[0].split('/').length || a[0].localeCompare(b[0])
    })
    const nodes: GraphNode[] = []
    const total = list.length || 1

    // Hubs get an arc proportional to their size, so a big category is not
    // crammed into the same wedge as a single-recipe one.
    let cursor = -Math.PI / 2
    const gap = 0.06

    hubs.forEach(([hub, members]) => {
      const share = (members.length / total) * (Math.PI * 2 - gap * hubs.length)
      const angle = cursor + share / 2
      cursor += share + gap

      // Push crowded hubs further out, and child hubs further still so they
      // orbit their parent rather than competing with it.
      const depth = hub.split('/').length - 1
      const hubRadius = 420 + Math.sqrt(members.length) * 105 + depth * 420
      const hx = Math.cos(angle) * hubRadius
      const hy = Math.sin(angle) * hubRadius

      nodes.push({
        id: `hub:${hub}`,
        // Only the last segment: the parent is carried by the edge, so a child
        // hub reads as "Desserts" hanging off "Keto".
        title: hub
          .split('/')
          .pop()!
          .split('-')
          .map(w => w[0]!.toUpperCase() + w.slice(1))
          .join(' '),
        category: hub,
        tags: [],
        x: hx,
        y: hy,
        r: 11 + Math.min(members.length, 14),
        kind: 'hub',
        count: members.length
      })

      // Fan the members outward from the hub, in rings so dense hubs stay legible.
      const perRing = 6
      members.forEach((recipe, j) => {
        const ring = Math.floor(j / perRing)
        const slot = j % perRing
        const count = Math.min(perRing, members.length - ring * perRing)
        const spread = Math.min(Math.PI * 0.9, Math.max(share * 1.1, 0.5))
        const step = count > 1 ? spread / (count - 1) : 0
        const a = angle - spread / 2 + slot * step + (ring % 2 ? step / 2 : 0)
        const dist = 200 + ring * 130

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

    // Spokes tie each recipe back to its category hub, so the grouping reads as
    // structure rather than as an accident of position.
    const hubNodes = new Map(
      nodes.filter(n => n.kind === 'hub').map(n => [n.category, n])
    )
    for (const node of recipeNodes) {
      const hub = hubNodes.get(node.hub ?? '')
      if (hub) edges.push({ a: hub, b: node, weight: 1, kind: 'spoke', shared: [] })
    }

    // A nested category hangs off its parent hub.
    for (const [key, hub] of hubNodes) {
      const parentKey = key.split('/').slice(0, -1).join('/')
      const parent = parentKey ? hubNodes.get(parentKey) : null
      if (parent) edges.push({ a: parent, b: hub, weight: 2, kind: 'spoke', shared: [] })
    }

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
