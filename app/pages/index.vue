<script setup lang="ts">
definePageMeta({})

const { filtered: recipes } = useRecipeList()

useSeoMeta({
  title: 'Recipes',
  description: 'A personal recipe collection.'
})
</script>

<template>
  <div class="px-6 py-8">
    <div class="max-w-[2200px] mx-auto">
      <h1 class="text-2xl font-bold tracking-tight mb-6">
        {{ recipes.length }} recipes
      </h1>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2000px]:grid-cols-6 gap-4">
        <div
          v-for="recipe in recipes"
          :key="recipe.path"
          class="flex flex-col gap-2 p-2 rounded-xl border border-(--ui-border) bg-(--ui-bg) transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary-500 cursor-pointer"
          @click="navigateTo(recipe.path)"
        >
          <RecipeThumb
            :title="recipe.title"
            :category="recipe.category"
            :image="recipe.image"
            :cover="recipe.cover"
          />
          <div class="px-1 pb-1 flex flex-col gap-1">
            <p
              class="text-[10px] font-semibold uppercase tracking-wider text-primary-500"
            >
              {{ recipe.category }}
            </p>
            <p class="text-sm/snug font-semibold">
              {{ recipe.title }}
            </p>
            <p
              v-if="recipe.description"
              class="text-xs text-(--ui-text-dimmed) line-clamp-2"
            >
              {{ recipe.description }}
            </p>
            <div
              v-if="recipe.tags?.length"
              class="flex flex-wrap gap-1 mt-0.5"
            >
              <NuxtLink
                v-for="tag in (recipe.tags ?? []).slice(0, 3)"
                :key="tag"
                :to="{ path: '/', query: { tag: tag.toLowerCase() } }"
                class="text-[11px] px-1.5 py-0.5 rounded-full bg-(--ui-bg-elevated) text-(--ui-text-muted) hover:bg-primary-500/12 hover:text-primary-500 transition-colors"
                @click.stop
              >
                {{ tag }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="recipes.length === 0"
        class="py-16 text-center text-(--ui-text-dimmed)"
      >
        <UIcon
          name="i-lucide-search-x"
          class="size-10 mx-auto mb-3 opacity-40"
        />
        <p class="text-sm">
          No recipes match your search.
        </p>
      </div>
    </div>
  </div>
</template>
