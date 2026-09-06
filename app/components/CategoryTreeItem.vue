<script setup lang="ts">
import type { CategoryNode } from '~/composables/useCategoryTree'

interface Props {
  node: CategoryNode
  active: string
  depth: number
}

const props = defineProps<Props>()

const isActive = computed(() => props.active === props.node.path)
const isAncestor = computed(() =>
  props.active.startsWith(`${props.node.path}/`)
)
</script>

<template>
  <li>
    <NuxtLink
      :to="`/c/${node.path}`"
      class="flex items-center gap-2.5 py-1.5 pr-2.5 rounded-md text-sm font-medium transition-all"
      :class="[
        isActive
          ? 'bg-primary-500/12 text-primary-500'
          : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text)',
        depth ? 'pl-7' : 'pl-2.5'
      ]"
    >
      <UIcon
        :name="node.icon"
        class="size-4 shrink-0"
        :class="depth ? 'opacity-60' : ''"
      />
      <span class="flex-1 text-left truncate">{{ node.label }}</span>
      <span
        class="text-xs font-medium px-1.5 py-0.5 rounded-full"
        :class="isActive ? 'bg-(--ui-bg) text-primary-500' : 'bg-(--ui-bg-elevated) text-(--ui-text-dimmed)'"
      >{{ node.count }}</span>
    </NuxtLink>

    <ul
      v-if="node.children.length && (isActive || isAncestor)"
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
