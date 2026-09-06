<script setup lang="ts">
interface Props {
  path: string
  label?: string
  section?: string
  variant?: string
  collapsed?: boolean
}

const props = defineProps<Props>()

const { data: part } = await useAsyncData(
  () => `subrecipe-${props.path}`,
  () => queryCollection('recipes').path(props.path).first()
)

// Pulls the named section out of the sub-recipe so a composite can show the
// steps inline rather than sending the reader away.
const section = computed(() => {
  const body = (part.value?.body as { value?: unknown[] } | undefined)?.value ?? []
  const want = (props.section ?? 'Ingredients').toLowerCase()

  const flat = (node: unknown): string => {
    if (typeof node === 'string') return node
    if (!Array.isArray(node)) return ''
    return node.slice(2).map(flat).join('')
  }

  const items: string[] = []
  // The source may split a section across variant subsections, so a caller can
  // name which one it wants.
  const variant = props.variant?.toLowerCase()
  let depth = 0
  let skipping = false

  const walk = (node: unknown) => {
    if (!Array.isArray(node)) return
    const [tag, , ...kids] = node as [string, unknown, ...unknown[]]

    const level = /^h([1-6])$/.exec(tag)?.[1]
    if (level) {
      const n = Number(level)
      const label = flat(node).trim().toLowerCase()
      if (label === want) {
        depth = n
        skipping = false
      } else if (depth && n <= depth) {
        depth = 0
        skipping = false
      } else if (depth && variant) {
        skipping = !label.startsWith(variant)
      }
      return
    }

    if (depth && !skipping && (tag === 'ul' || tag === 'ol')) {
      for (const li of kids) {
        if (Array.isArray(li) && li[0] === 'li') {
          const text = flat(li).replace(/\s+/g, ' ').trim()
          if (text) items.push(text)
        }
      }
      return
    }
    kids.forEach(walk)
  }

  body.forEach(walk)
  return items
})
</script>

<template>
  <div
    v-if="part"
    class="sub-recipe"
  >
    <p class="sub-recipe-head">
      <NuxtLink
        :to="recipeUrl(part.path)"
        class="sub-recipe-title"
        :title="`From ${part.title}`"
      >
        <UIcon
          name="i-lucide-link"
          class="size-3 shrink-0"
        />
        {{ label ?? part.title }}
      </NuxtLink>
    </p>

    <ul
      v-if="section.length"
      class="list-disc ps-6 my-5 marker:text-(--ui-border-accented)"
    >
      <li
        v-for="item in section"
        :key="item"
        class="my-1.5 ps-1.5 leading-7"
      >
        {{ item }}
      </li>
    </ul>
  </div>
</template>
