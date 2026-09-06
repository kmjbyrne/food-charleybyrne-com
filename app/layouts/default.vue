<script setup lang="ts">
import type { RecipeMeta } from '~/types/recipe'

const { allRecipes, filtered } = useRecipeList()
const route = useRoute()

// Rendered closed so mobile never flashes an open overlay; desktop opens it on
// mount.
const sidebarOpen = ref(false)
const isDesktop = () => window.matchMedia('(min-width: 768px)').matches

onMounted(() => {
  sidebarOpen.value = isDesktop()
})

watch(() => route.fullPath, () => {
  if (!isDesktop()) sidebarOpen.value = false
})
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <RecipeTopbar
      :sidebar-open="sidebarOpen"
      @toggle-sidebar="sidebarOpen = !sidebarOpen"
    />

    <div class="flex flex-1 min-h-0">
      <RecipeSidebar
        :recipes="filtered"
        :all-recipes="(allRecipes ?? []) as RecipeMeta[]"
        :open="sidebarOpen"
        @close="sidebarOpen = false"
      />

      <main class="flex-1 min-w-0">
        <slot />
      </main>
    </div>
  </div>
</template>
