<script setup lang="ts">
definePageMeta({})

const { filtered: recipes, allRecipes } = useRecipeList()
const { recent, load: loadRecent } = useRecentRecipes()
const { activeCategory, activeTag, search } = useRecipeFilters()

// Recently viewed is a shortcut back, not a search result, so it only shows on
// the unfiltered index.
const showRecent = computed(() =>
  recent.value.length > 0
  && !activeCategory.value
  && !activeTag.value
  && !search.value
)

const route = useRoute()

// Breadcrumbs let you step back up without opening the sidebar.
const tree = useCategoryTree(computed(() => allRecipes.value ?? []))

const crumbs = computed(() => {
  const out: { label: string, to: string, query?: Record<string, string> }[] = [
    { label: 'All recipes', to: '/' }
  ]
  for (const node of categoryTrail(tree.value, activeCategory.value)) {
    out.push({ label: node.label, to: `/c/${node.path}` })
  }
  if (activeTag.value) {
    out.push({
      label: `#${activeTag.value}`,
      to: route.path,
      query: { tag: activeTag.value }
    })
  }
  if (search.value) {
    out.push({ label: `"${search.value}"`, to: route.path, query: route.query as Record<string, string> })
  }
  return out
})

onMounted(loadRecent)
</script>

<template>
  <div class="px-6 lg:px-12 xl:px-20 2xl:px-28 py-8">
    <div class="max-w-[1800px] mx-auto">
      <section
        v-if="showRecent"
        class="mb-8"
      >
        <h2 class="text-[11px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) mb-3">
          Recently viewed
        </h2>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="r in recent"
            :key="r.path"
            :to="r.path"
            class="group flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg border border-(--ui-border) bg-(--ui-bg) text-[13px] text-(--ui-text-muted) hover:border-primary-500 hover:text-(--ui-text) transition-colors"
          >
            <UIcon
              name="i-lucide-clock"
              class="size-3 shrink-0 opacity-50 group-hover:text-primary-500 group-hover:opacity-100"
            />
            <span class="truncate max-w-52">{{ r.title }}</span>
          </NuxtLink>
        </div>
      </section>

      <nav
        v-if="crumbs.length > 1"
        class="flex items-center gap-1.5 text-sm text-(--ui-text-muted) mb-2 flex-wrap"
      >
        <template
          v-for="(crumb, i) in crumbs"
          :key="crumb.label"
        >
          <UIcon
            v-if="i > 0"
            name="i-lucide-chevron-right"
            class="size-3.5 shrink-0 text-(--ui-text-dimmed)"
          />
          <span
            v-if="i === crumbs.length - 1"
            class="text-(--ui-text) font-medium"
          >{{ crumb.label }}</span>
          <NuxtLink
            v-else
            :to="{ path: crumb.to, query: crumb.query }"
            class="hover:text-primary-500 transition-colors"
          >{{ crumb.label }}</NuxtLink>
        </template>
      </nav>

      <h1 class="text-2xl font-bold tracking-tight mb-6">
        {{ recipes.length }} recipes
      </h1>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        <div
          v-for="recipe in recipes"
          :key="recipe.path"
          class="flex flex-col gap-1.5 p-1.5 rounded-lg border border-(--ui-border) bg-(--ui-bg) transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary-500 cursor-pointer"
          @click="navigateTo(recipe.path)"
        >
          <RecipeThumb
            :title="recipe.title"
            :category="recipe.category"
            :image="recipe.image"
            :cover="recipe.cover"
          />
          <div class="px-1 pb-0.5 flex flex-col gap-0.5">
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
              class="text-xs/snug text-(--ui-text-dimmed) line-clamp-2"
            >
              {{ recipe.description }}
            </p>
            <div
              v-if="recipe.tags?.length"
              class="flex flex-wrap gap-1 mt-1"
            >
              <NuxtLink
                v-for="tag in (recipe.tags ?? []).slice(0, 3)"
                :key="tag"
                :to="{ path: '/', query: { tag: tag.toLowerCase() } }"
                class="text-[10px] px-1.5 py-px rounded-full bg-(--ui-bg-elevated) text-(--ui-text-muted) hover:bg-primary-500/12 hover:text-primary-500 transition-colors"
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
