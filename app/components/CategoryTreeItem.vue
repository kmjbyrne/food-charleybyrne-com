<script setup lang="ts">
import type { CategoryNode } from '~/composables/useCategoryTree'

interface Props {
  node: CategoryNode
  active: string
  depth: number
}

const props = defineProps<Props>()

const { open, toggle } = useCategoryExpansion()

const isActive = computed(() => props.active === props.node.path)
const isAncestor = computed(() =>
  props.active.startsWith(`${props.node.path}/`)
)

const hasChildren = computed(() => props.node.children.length > 0)
const isExpanded = computed(() => open.value[props.node.path] ?? isAncestor.value)
</script>

<template>
  <li>
    <NuxtLink
      :to="`/${node.path}`"
      class="flex items-center gap-2.5 py-1.5 pr-2.5 rounded-md text-sm font-medium transition-all"
      :class="[
        isActive
          ? 'bg-primary-500/12 text-primary-500'
          : hasChildren
            ? 'text-(--ui-text) hover:bg-(--ui-bg-elevated)'
            : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text)',
        hasChildren && !isActive ? 'font-semibold' : ''
      ]"
      :style="{ paddingLeft: `${0.625 + depth * 1.1}rem` }"
    >
      <UIcon
        :name="node.recipe ? 'i-lucide-file-text' : node.icon"
        class="size-4 shrink-0"
        :class="[depth ? 'opacity-60' : '', node.recipe ? 'opacity-45' : '']"
      />
      <span class="flex-1 text-left truncate">{{ node.label }}</span>
      <button
        v-if="hasChildren"
        class="shrink-0 -mr-1 p-0.5 rounded hover:bg-(--ui-bg-accented) transition-colors"
        :aria-label="isExpanded ? 'Collapse' : 'Expand'"
        @click.prevent.stop="toggle(node.path)"
      >
        <UIcon
          name="i-lucide-chevron-right"
          class="size-3 text-(--ui-text-dimmed) transition-transform"
          :class="isExpanded ? 'rotate-90' : ''"
        />
      </button>
      <span
        v-if="!node.recipe"
        class="text-xs font-medium px-1.5 py-0.5 rounded-full"
        :class="isActive ? 'bg-(--ui-bg) text-primary-500' : 'bg-(--ui-bg-elevated) text-(--ui-text-dimmed)'"
      >{{ node.count }}</span>
    </NuxtLink>

    <ul
      v-if="hasChildren && isExpanded"
      class="flex flex-col gap-0.5 mt-0.5"
    >
      <CategoryTreeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :active="active"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>
