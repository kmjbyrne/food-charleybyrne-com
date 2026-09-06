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
const activeTag = ref<string | null>(null)

const view = reactive({ x: 0, y: 0, scale: 1 })
let dragging = false
let last = { x: 0, y: 0 }

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
  const line = styles.getPropertyValue('--ui-border').trim() || '#dfe4d5'

  ctx.clearRect(0, 0, w, h)
  ctx.save()
  ctx.translate(w / 2 + view.x, h / 2 + view.y)
  ctx.scale(view.scale, view.scale)

  const focus = hovered.value
  const tag = activeTag.value

  for (const edge of graph.value.edges) {
    const lit = tag
      ? edge.a.tags.includes(tag) && edge.b.tags.includes(tag)
      : focus
        ? edge.a === focus || edge.b === focus
        : false
    if (!lit && (tag || focus)) continue

    ctx.beginPath()
    ctx.moveTo(edge.a.x, edge.a.y)
    ctx.lineTo(edge.b.x, edge.b.y)
    ctx.strokeStyle = lit ? 'rgba(120,160,90,0.55)' : line
    ctx.globalAlpha = lit ? 1 : 0.22
    ctx.lineWidth = lit ? 1.4 : 0.6
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
    const inTag = tag ? node.tags.includes(tag) : true

    ctx.beginPath()
    ctx.arc(node.x, node.y, isFocus ? node.r + 2.5 : node.r, 0, Math.PI * 2)
    ctx.fillStyle = inTag
      ? `hsl(${hueFor(node.hub ?? '')} 50% 55%)`
      : 'rgba(140,140,140,0.25)'
    ctx.fill()

    if (isFocus || view.scale > 1.6) {
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
    view.x += e.clientX - last.x
    view.y += e.clientY - last.y
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
  view.scale = Math.min(4, Math.max(0.35, next))
  draw()
}

const onClick = (e: MouseEvent) => {
  const el = canvas.value
  if (!el) return
  const box = el.getBoundingClientRect()
  const found = nodeAt(e.clientX - box.left, e.clientY - box.top)
  if (found?.kind === 'recipe') navigateTo(recipeUrl(found.id))
  if (found?.kind === 'hub') navigateTo(`/${found.category}`)
}

const reset = () => {
  view.x = 0
  view.y = 0
  view.scale = 1
  activeTag.value = null
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
  const observer = new ResizeObserver(draw)
  if (canvas.value) observer.observe(canvas.value)
  const themeWatch = new MutationObserver(draw)
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  onBeforeUnmount(() => {
    observer.disconnect()
    themeWatch.disconnect()
  })
})

watch(graph, draw)

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

    <div class="absolute bottom-4 right-4 flex items-center gap-2 pointer-events-auto">
      <UButton
        icon="i-lucide-rotate-ccw"
        color="neutral"
        variant="subtle"
        size="sm"
        label="Reset"
        @click="reset"
      />
    </div>

    <div
      v-if="hovered"
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
