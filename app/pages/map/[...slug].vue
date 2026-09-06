<script setup lang="ts">
import type { GraphNode } from '~/composables/useRecipeGraph'
import type { RecipeMeta } from '~/types/recipe'

const { data: all } = await useAsyncData('map-recipes', () =>
  queryCollection('recipes')
    .select('path', 'title', 'category', 'tags')
    .all()
)

const recipes = computed(() => (all.value ?? []) as RecipeMeta[])
const graph = useRecipeGraph(recipes)

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const hovered = ref<GraphNode | null>(null)
const route = useRoute()
const router = useRouter()

// /map/<category>/<recipe> selects a node, so a flyout is shareable and the
// back button closes it.
const selectedPath = computed(() => {
  const parts = (route.params.slug as string[]) ?? []
  return parts.length ? `/recipes/${parts.join('/')}` : ''
})

const active = computed(() => {
  const path = selectedPath.value
  if (!path) return null
  const key = path.replace('/recipes/', '')
  return graph.value.nodes.find(n => n.id === path)
    ?? graph.value.nodes.find(n => n.id === `hub:${key}`)
    ?? graph.value.nodes.find(n => n.recipePath === path)
    ?? null
})

const select = (node: GraphNode | null) => {
  if (!node) return router.push('/map')
  const target = node.kind === 'hub'
    ? `/map/${node.category}`
    : `/map${recipeUrl(node.id)}`
  return router.push(target)
}

// Everything hanging off the selected hub: its child hubs and their recipes.
const subtree = computed(() => {
  const node = active.value
  if (node?.kind !== 'hub') return new Set<string>()
  const prefix = node.category
  const ids = new Set<string>([node.id])
  for (const other of graph.value.nodes) {
    if (other.kind === 'hub' && other.category.startsWith(`${prefix}/`)) ids.add(other.id)
    if (other.kind === 'recipe' && (other.hub === prefix || other.hub?.startsWith(`${prefix}/`))) {
      ids.add(other.id)
    }
  }
  return ids
})

// The full body is only fetched when the reader opens the second drawer, so
// the map itself stays a light query.
const expanded = ref(false)

const { data: full } = await useAsyncData(
  () => `map-full-${selectedPath.value}`,
  () => (expanded.value && (active.value?.recipePath ?? selectedPath.value)
    ? queryCollection('recipes').path(active.value?.recipePath ?? selectedPath.value).first()
    : Promise.resolve(null)),
  { watch: [selectedPath, expanded] }
)

watch(selectedPath, () => {
  expanded.value = false
})

const onDrawerKey = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return
  if (expanded.value) expanded.value = false
  else if (active.value) select(null)
}

const detail = computed(() => {
  const node = active.value
  if (!node) return null
  const path = node.recipePath ?? node.id
  return recipes.value.find(r => r.path === path) ?? null
})

// A hub's drawer lists its child categories and the recipes it holds.
const hubChildren = computed(() => {
  const node = active.value
  if (node?.kind !== 'hub') return { groups: [] as GraphNode[], items: [] as GraphNode[] }
  const prefix = node.category
  return {
    groups: graph.value.nodes.filter(
      n => n.kind === 'hub' && n.category.startsWith(`${prefix}/`)
        && n.category.split('/').length === prefix.split('/').length + 1
    ),
    items: graph.value.nodes.filter(n => n.kind === 'recipe' && n.hub === prefix)
  }
})

const parentHub = computed(() => {
  const node = active.value
  if (node?.kind !== 'hub') return null
  const parent = node.category.split('/').slice(0, -1).join('/')
  return parent
    ? graph.value.nodes.find(n => n.id === `hub:${parent}`) ?? null
    : null
})

// A mother sauce lists what derives from it, so those become links too.
const derivedFrom = computed(() => {
  const node = active.value
  if (!node) return []
  const base = node.recipePath ?? node.id
  return graph.value.nodes.filter(n =>
    n.kind === 'recipe' && (n.id ?? '').startsWith(`${base}/`)
  )
})

const related = computed(() => {
  const node = active.value
  if (!node || node.kind === 'hub') return []
  return graph.value.edges
    .filter(e => e.kind !== 'spoke')
    .filter(e => e.a.id === node.id || e.b.id === node.id)
    .map(e => ({
      node: e.a.id === node.id ? e.b : e.a,
      kind: e.kind,
      shared: e.shared
    }))
    .sort((a, b) => (a.kind === b.kind ? b.shared.length - a.shared.length : a.kind === 'link' ? -1 : 1))
    .slice(0, 10)
})
const activeTag = ref<string | null>(null)

// Selecting a node changes the route, which remounts this page. Keeping the
// viewport in shared state stops the map jumping back to its start position.
const view = useState('map-view', () => reactive({ x: 0, y: 0, scale: 0.55 })).value
let dragging = false
let last = { x: 0, y: 0 }
// A pan ends in a click event, so only treat it as a click if nothing moved.
let moved = 0

const CATEGORY_HUE: Record<string, number> = {}
const hueFor = (key: string) => {
  if (!(key in CATEGORY_HUE)) {
    const keys = Object.keys(CATEGORY_HUE).length
    CATEGORY_HUE[key] = (keys * 47) % 360
  }
  return CATEGORY_HUE[key]!
}

const draw = () => {
  const el = canvas.value
  if (!el) return
  const ctx = el.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const w = el.clientWidth
  const h = el.clientHeight
  el.width = w * dpr
  el.height = h * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const styles = getComputedStyle(document.documentElement)
  const ink = styles.getPropertyValue('--ui-text').trim() || '#1e2416'
  const dim = styles.getPropertyValue('--ui-text-dimmed').trim() || '#95a07e'
  const dark = document.documentElement.classList.contains('dark')
  const tagLine = dark ? 'rgba(150,180,120,0.55)' : 'rgba(90,120,60,0.42)'
  const tagLit = dark ? 'rgba(190,225,150,0.95)' : 'rgba(60,95,35,0.9)'
  const linkLine = dark ? 'rgba(235,160,90,0.8)' : 'rgba(180,90,25,0.75)'
  const linkLit = dark ? 'rgba(255,185,115,1)' : 'rgba(150,70,10,1)'
  const spokeLine = dark ? 'rgba(140,150,130,0.35)' : 'rgba(90,100,80,0.28)'

  ctx.clearRect(0, 0, w, h)
  ctx.save()
  ctx.translate(w / 2 + view.x, h / 2 + view.y)
  ctx.scale(view.scale, view.scale)

  const focus = hovered.value
  const tag = activeTag.value

  // Tag edges stay faint so the whole web is visible without drowning the
  // nodes; explicit recipe links are drawn solid because they mean more.
  const selected = active.value
  for (const edge of graph.value.edges) {
    const touches = focus && (edge.a === focus || edge.b === focus)
    const tree = subtree.value
    const picked = tree.size
      ? tree.has(edge.a.id) && tree.has(edge.b.id)
      : selected && (edge.a.id === selected.id || edge.b.id === selected.id)
    const tagged = tag && edge.a.tags.includes(tag) && edge.b.tags.includes(tag)
    const lit = Boolean(touches || picked || tagged)
    const dimmed = Boolean((tag || focus || selected) && !lit)

    ctx.beginPath()
    ctx.moveTo(edge.a.x, edge.a.y)
    ctx.lineTo(edge.b.x, edge.b.y)

    if (edge.kind === 'spoke') {
      ctx.strokeStyle = spokeLine
      ctx.globalAlpha = dimmed ? 0.12 : lit ? 0.9 : 0.55
      ctx.lineWidth = lit ? 1.4 : 0.8
    } else if (edge.kind === 'link') {
      ctx.strokeStyle = lit ? linkLit : linkLine
      ctx.globalAlpha = dimmed ? 0.15 : 1
      ctx.lineWidth = lit ? 2.6 : 1.9
    } else {
      ctx.strokeStyle = lit ? tagLit : tagLine
      ctx.globalAlpha = dimmed ? 0.07 : 1
      ctx.lineWidth = lit ? 1.8 : 0.9
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  for (const node of graph.value.nodes) {
    if (node.kind === 'hub') {
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
      ctx.fillStyle = `hsl(${hueFor(node.category)} 45% 45% / 0.9)`
      ctx.fill()

      ctx.font = '600 13px system-ui, sans-serif'
      ctx.fillStyle = ink
      ctx.textAlign = 'center'
      ctx.fillText(node.title, node.x, node.y - node.r - 8)
      continue
    }

    const isFocus = focus === node
    const tree = subtree.value
    const inTag = tag
      ? node.tags.includes(tag)
      : tree.size
        ? tree.has(node.id)
        : true

    ctx.beginPath()
    ctx.arc(node.x, node.y, isFocus ? node.r + 2.5 : node.r, 0, Math.PI * 2)
    ctx.fillStyle = inTag
      ? `hsl(${hueFor(node.hub ?? '')} 50% 55%)`
      : 'rgba(140,140,140,0.25)'
    ctx.fill()

    if (isFocus || node === selected || view.scale > 1.1) {
      ctx.font = '11px system-ui, sans-serif'
      ctx.fillStyle = isFocus ? ink : dim
      ctx.textAlign = 'center'
      ctx.fillText(node.title, node.x, node.y - node.r - 6)
    }
  }

  ctx.restore()
}

const nodeAt = (px: number, py: number): GraphNode | null => {
  const el = canvas.value
  if (!el) return null
  const x = (px - el.clientWidth / 2 - view.x) / view.scale
  const y = (py - el.clientHeight / 2 - view.y) / view.scale

  let best: GraphNode | null = null
  let bestDist = Infinity
  for (const node of graph.value.nodes) {
    const d = Math.hypot(node.x - x, node.y - y)
    if (d < node.r + 6 && d < bestDist) {
      best = node
      bestDist = d
    }
  }
  return best
}

const onDown = (e: MouseEvent) => {
  dragging = true
  moved = 0
  last = { x: e.clientX, y: e.clientY }
}

const onUp = () => {
  dragging = false
}

const onLeave = () => {
  dragging = false
  hovered.value = null
  draw()
}

const onMove = (e: MouseEvent) => {
  const el = canvas.value
  if (!el) return
  const box = el.getBoundingClientRect()

  if (dragging) {
    const dx = e.clientX - last.x
    const dy = e.clientY - last.y
    moved += Math.abs(dx) + Math.abs(dy)
    view.x += dx
    view.y += dy
    last = { x: e.clientX, y: e.clientY }
    draw()
    return
  }

  const found = nodeAt(e.clientX - box.left, e.clientY - box.top)
  if (found !== hovered.value) {
    hovered.value = found
    el.style.cursor = found ? 'pointer' : 'grab'
    draw()
  }
}

const onWheel = (e: WheelEvent) => {
  e.preventDefault()
  const next = view.scale * (e.deltaY < 0 ? 1.12 : 0.89)
  view.scale = Math.min(4, Math.max(0.18, next))
  draw()
}

const onClick = (e: MouseEvent) => {
  const el = canvas.value
  if (!el || moved > 4) return
  const box = el.getBoundingClientRect()
  const found = nodeAt(e.clientX - box.left, e.clientY - box.top)
  if (found?.kind === 'recipe') {
    select(found)
    return
  }
  select(found ?? null)
}

const reset = () => {
  view.x = 0
  view.y = 0
  view.scale = 0.55
  activeTag.value = null
  select(null)
  draw()
}

const topTags = computed(() => {
  const counts: Record<string, number> = {}
  for (const node of graph.value.nodes) {
    for (const t of node.tags) counts[t] = (counts[t] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)
})

const pickTag = (tag: string) => {
  activeTag.value = activeTag.value === tag ? null : tag
  draw()
}

onMounted(() => {
  draw()
  window.addEventListener('keydown', onDrawerKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onDrawerKey))
  const observer = new ResizeObserver(draw)
  if (canvas.value) observer.observe(canvas.value)
  const themeWatch = new MutationObserver(draw)
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  onBeforeUnmount(() => {
    observer.disconnect()
    themeWatch.disconnect()
  })
})

watch([graph, active], draw)

useSeoMeta({
  title: 'Recipe map',
  description: 'Every recipe as a connected map, linked by shared ingredients and tags.'
})
</script>

<template>
  <div class="relative h-[calc(100vh-3.5rem)] overflow-hidden">
    <canvas
      ref="canvas"
      class="size-full block cursor-grab"
      @mousedown="onDown"
      @mouseup="onUp"
      @mouseleave="onLeave"
      @mousemove="onMove"
      @wheel="onWheel"
      @click="onClick"
    />

    <div class="absolute top-4 left-4 flex flex-col gap-3 max-w-xs pointer-events-none">
      <div class="pointer-events-auto">
        <h1 class="text-lg font-bold tracking-tight text-(--ui-text-highlighted)">
          Recipe map
        </h1>
        <p class="text-xs text-(--ui-text-muted) mt-0.5">
          {{ graph.nodes.length - graph.hubs.length }} recipes,
          {{ graph.edges.length }} shared-tag links. Drag to pan, scroll to zoom.
        </p>
      </div>

      <div class="flex flex-wrap gap-1 pointer-events-auto">
        <button
          v-for="[tag, count] in topTags"
          :key="tag"
          class="text-[11px] px-1.5 py-0.5 rounded-full border transition-colors"
          :class="activeTag === tag
            ? 'bg-primary-500 border-primary-500 text-white'
            : 'bg-(--ui-bg)/80 border-(--ui-border) text-(--ui-text-muted) hover:text-(--ui-text)'"
          @click="pickTag(tag)"
        >
          {{ tag }} {{ count }}
        </button>
      </div>
    </div>

    <div class="absolute bottom-4 right-4 flex items-center gap-3 pointer-events-auto">
      <div class="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-(--ui-border) bg-(--ui-bg)/90 text-[11px] text-(--ui-text-muted)">
        <span class="flex items-center gap-1.5">
          <span class="w-4 h-0.5 rounded-full bg-orange-600 dark:bg-orange-400" />
          Referenced
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-4 h-px rounded-full bg-primary-700 dark:bg-primary-300" />
          Shared tags
        </span>
      </div>
      <UButton
        icon="i-lucide-rotate-ccw"
        color="neutral"
        variant="subtle"
        size="sm"
        label="Reset view"
        @click="reset"
      />
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-x-full"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="active && detail"
        class="absolute top-0 right-0 size-full sm:w-80 z-20 flex flex-col border-l border-(--ui-border) bg-(--ui-bg) shadow-xl overflow-y-auto"
      >
        <div class="p-4 flex items-start justify-between gap-3 border-b border-(--ui-border)">
          <div class="min-w-0">
            <button
              v-if="parentHub"
              class="text-[10px] font-semibold uppercase tracking-wider text-primary-500 hover:underline"
              @click="select(parentHub)"
            >
              {{ parentHub.title }}
            </button>
            <p
              v-else-if="detail?.category"
              class="text-[10px] font-semibold uppercase tracking-wider text-primary-500"
            >
              {{ detail.category }}
            </p>
            <h2 class="text-base font-bold tracking-tight text-(--ui-text-highlighted) mt-0.5">
              {{ detail?.title ?? active.title }}
            </h2>
            <p
              v-if="active.kind === 'hub'"
              class="text-[11px] text-(--ui-text-dimmed) mt-0.5"
            >
              {{ active.count }} recipes
            </p>
          </div>
          <button
            class="shrink-0 size-7 grid place-items-center rounded-md border border-(--ui-border) text-(--ui-text-muted) hover:text-(--ui-text) transition-colors"
            title="Close"
            @click="select(null)"
          >
            <UIcon
              name="i-lucide-x"
              class="size-4"
            />
          </button>
        </div>

        <div
          v-if="active.kind === 'hub'"
          class="p-4 flex flex-col gap-4"
        >
          <div v-if="hubChildren.groups.length">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) mb-2">
              Sub-categories
            </p>
            <ul class="flex flex-col gap-0.5">
              <li
                v-for="group in hubChildren.groups"
                :key="group.id"
              >
                <button
                  class="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text) transition-colors"
                  @click="select(group)"
                >
                  <UIcon
                    name="i-lucide-folder"
                    class="size-3.5 shrink-0 opacity-60"
                  />
                  <span class="flex-1 truncate">{{ group.title }}</span>
                  <span class="text-[11px] text-(--ui-text-dimmed)">{{ group.count }}</span>
                </button>
              </li>
            </ul>
          </div>

          <div v-if="derivedFrom.length">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) mb-2">
              Derivatives
            </p>
            <ul class="flex flex-col gap-0.5 mb-4">
              <li
                v-for="item in derivedFrom"
                :key="item.id"
              >
                <button
                  class="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text) transition-colors"
                  @click="select(item)"
                >
                  <UIcon
                    name="i-lucide-git-branch"
                    class="size-3.5 shrink-0 opacity-60"
                  />
                  <span class="truncate">{{ item.title }}</span>
                </button>
              </li>
            </ul>
          </div>

          <div v-if="hubChildren.items.length">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) mb-2">
              Recipes
            </p>
            <ul class="flex flex-col gap-0.5">
              <li
                v-for="item in hubChildren.items"
                :key="item.id"
              >
                <button
                  class="w-full text-left px-2 py-1.5 rounded-md text-[13px] text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text) transition-colors truncate"
                  @click="select(item)"
                >
                  {{ item.title }}
                </button>
              </li>
            </ul>
          </div>

          <UButton
            v-if="detail"
            icon="i-lucide-maximize-2"
            trailing
            color="primary"
            variant="soft"
            size="sm"
            label="Open recipe"
            block
            @click="expanded = true"
          />
          <UButton
            :to="`/${active.category}`"
            icon="i-lucide-arrow-right"
            trailing
            color="neutral"
            variant="subtle"
            size="sm"
            label="Browse category"
            block
          />
        </div>

        <div
          v-else
          class="p-4 flex flex-col gap-4"
        >
          <p
            v-if="detail?.description"
            class="text-[13px]/relaxed text-(--ui-text-muted)"
          >
            {{ detail?.description }}
          </p>

          <div
            v-if="active.tags.length"
            class="flex flex-wrap gap-1"
          >
            <button
              v-for="t in active.tags"
              :key="t"
              class="text-[11px] px-1.5 py-0.5 rounded-full border transition-colors"
              :class="activeTag === t
                ? 'bg-primary-500 border-primary-500 text-white'
                : 'bg-(--ui-bg-elevated) border-transparent text-(--ui-text-muted) hover:text-(--ui-text)'"
              @click="pickTag(t)"
            >
              {{ t }}
            </button>
          </div>

          <div v-if="related.length">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) mb-2">
              Connected
            </p>
            <ul class="flex flex-col gap-0.5">
              <li
                v-for="item in related"
                :key="item.node.id"
              >
                <button
                  class="w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-md text-[13px] text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text) transition-colors"
                  @click="select(item.node)"
                >
                  <span
                    class="mt-1.5 size-1.5 rounded-full shrink-0"
                    :class="item.kind === 'link' ? 'bg-orange-500' : 'bg-primary-500/60'"
                  />
                  <span class="min-w-0">
                    <span class="block truncate">{{ item.node.title }}</span>
                    <span
                      v-if="item.shared.length"
                      class="block text-[11px] text-(--ui-text-dimmed) truncate"
                    >{{ item.shared.join(', ') }}</span>
                    <span
                      v-else
                      class="block text-[11px] text-(--ui-text-dimmed)"
                    >referenced in the recipe</span>
                  </span>
                </button>
              </li>
            </ul>
          </div>

          <UButton
            icon="i-lucide-maximize-2"
            trailing
            color="primary"
            variant="soft"
            size="sm"
            label="Open recipe"
            block
            @click="expanded = true"
          />
        </div>
      </aside>
    </Transition>

    <Transition
      enter-active-class="transition duration-250 ease-out"
      enter-from-class="translate-x-full"
      leave-active-class="transition duration-200 ease-in"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="expanded && full"
        class="absolute top-0 right-0 size-full md:w-[620px] z-30 flex flex-col border-l border-(--ui-border) bg-(--ui-bg) shadow-2xl overflow-y-auto"
      >
        <div class="sticky top-0 z-10 px-5 py-3 flex items-center justify-between gap-3 border-b border-(--ui-border) bg-(--ui-bg)">
          <div class="flex items-center gap-2 min-w-0">
            <button
              class="shrink-0 size-7 grid place-items-center rounded-md border border-(--ui-border) text-(--ui-text-muted) hover:text-(--ui-text) transition-colors"
              title="Back to connections"
              @click="expanded = false"
            >
              <UIcon
                name="i-lucide-chevron-left"
                class="size-4"
              />
            </button>
            <p class="text-sm font-semibold truncate text-(--ui-text-highlighted)">
              {{ full.title }}
            </p>
          </div>
          <UButton
            :to="recipeUrl(full.path)"
            icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            size="xs"
            label="Full page"
          />
        </div>

        <div class="px-5 py-4 flex flex-col gap-4">
          <p
            v-if="full.description"
            class="text-sm/relaxed text-(--ui-text-muted)"
          >
            {{ full.description }}
          </p>
          <div class="recipe-prose">
            <ContentRenderer :value="full" />
          </div>
        </div>
      </aside>
    </Transition>

    <div
      v-if="hovered && !active"
      class="absolute bottom-4 left-4 px-3 py-2 rounded-lg border border-(--ui-border) bg-(--ui-bg)/95 shadow-sm max-w-xs pointer-events-none"
    >
      <p class="text-sm font-semibold text-(--ui-text-highlighted)">
        {{ hovered.title }}
      </p>
      <p
        v-if="hovered.tags.length"
        class="text-[11px] text-(--ui-text-dimmed) mt-0.5"
      >
        {{ hovered.tags.join(' · ') }}
      </p>
    </div>
  </div>
</template>
