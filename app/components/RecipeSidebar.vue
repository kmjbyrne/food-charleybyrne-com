<script setup lang="ts">
import type { RecipeMeta } from '~/types/recipe'

interface Props {
  recipes: RecipeMeta[]
  allRecipes: RecipeMeta[]
  open: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { activeCategory, activeTag } = useRecipeFilters()
const { recent, load: loadRecent, clear: clearRecent } = useRecentRecipes()

// The tabs sit over the content column, which only has room on a detail page.
const isRecipePage = computed(() => route.meta.isRecipe === true)

const { expand } = useCategoryExpansion()

const surpriseMe = async () => {
  const list = props.allRecipes
  if (!list.length) return
  const pick = list[Math.floor(Math.random() * list.length)]
  if (pick?.path) await router.push(recipeUrl(pick.path))
}

onMounted(() => {
  loadRecent()
  if (activeCategory.value) expand(activeCategory.value)
})

watch(activeCategory, (path) => {
  if (path) expand(path)
})
const router = useRouter()
const route = useRoute()

const allRef = computed(() => props.allRecipes)
const sortBy = useCategorySort()
const tree = useCategoryTree(allRef, sortBy)

const toggleSort = () => {
  sortBy.value = sortBy.value === 'alpha' ? 'count' : 'alpha'
}
const tagCounts = computed(() => {
  const map: Record<string, number> = {}
  for (const r of props.allRecipes) {
    for (const t of r.tags ?? []) {
      const key = t.toLowerCase()
      map[key] = (map[key] ?? 0) + 1
    }
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 16)
})

const openCategory = (path: string) => {
  router.push({ path: path ? `/${path}` : '/' })
}

const filterByTag = (tag: string) => {
  activeTag.value = activeTag.value === tag ? null : tag
}

const openTag = (tag: string) => {
  const next = activeTag.value === tag ? null : tag
  router.push({ path: route.meta.isRecipe ? '/' : route.path, query: { tag: next ?? undefined } })
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 top-14 bg-black/40 z-30 md:hidden"
      @click="emit('close')"
    />
  </Transition>

  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="-translate-x-full"
    enter-to-class="translate-x-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-x-0"
    leave-to-class="-translate-x-full"
  >
    <aside
      v-show="open"
      class="fixed md:sticky top-14 left-0 z-35 w-[300px] h-[calc(100vh-3.5rem)] flex flex-col overflow-y-auto border-r border-(--ui-border) bg-(--ui-bg-muted) px-3 py-4 gap-4"
    >
      <button
        class="sm:hidden flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-(--ui-text-muted) border border-(--ui-border) hover:text-(--ui-text) hover:border-primary-500 transition-colors"
        @click="surpriseMe"
      >
        <UIcon
          name="i-lucide-dices"
          class="size-4 shrink-0"
        />
        Surprise me
      </button>

      <div class="flex flex-col gap-1.5">
        <p class="text-[11px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) px-2 pb-1 flex items-center justify-between">
          Categories
          <button
            class="flex items-center gap-1 font-medium tracking-normal normal-case hover:text-(--ui-text) transition-colors"
            :title="sortBy === 'alpha' ? 'Sort by count' : 'Sort A to Z'"
            @click="toggleSort"
          >
            <UIcon
              :name="sortBy === 'alpha' ? 'i-lucide-arrow-down-a-z' : 'i-lucide-arrow-down-1-0'"
              class="size-3.5"
            />
          </button>
        </p>
        <ul class="flex flex-col gap-0.5">
          <li>
            <button
              class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all"
              :class="!activeCategory
                ? 'bg-primary-500/12 text-primary-500'
                : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text)'"
              @click="openCategory('')"
            >
              <UIcon
                name="i-lucide-grid-2x2"
                class="size-4 shrink-0"
              />
              <span class="flex-1 text-left">All</span>
              <span
                class="text-xs font-medium px-1.5 py-0.5 rounded-full"
                :class="!activeCategory ? 'bg-(--ui-bg) text-primary-500' : 'bg-(--ui-bg-elevated) text-(--ui-text-dimmed)'"
              >{{ allRecipes.length }}</span>
            </button>
          </li>
          <CategoryTreeItem
            v-for="node in tree"
            :key="node.path"
            :node="node"
            :active="activeCategory"
            :depth="0"
          />
        </ul>
      </div>

      <div class="flex flex-col gap-1.5">
        <p class="text-[11px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) px-2 pb-1">
          Tags
        </p>
        <div class="flex flex-wrap gap-1 px-1">
          <div
            v-for="[tag, count] in tagCounts"
            :key="tag"
            class="group/tag inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium border transition-all"
            :class="activeTag === tag
              ? 'bg-primary-500/12 text-primary-500 border-primary-500/40'
              : 'bg-(--ui-bg-elevated) text-(--ui-text-muted) border-transparent hover:text-(--ui-text) hover:bg-(--ui-bg-accented)'"
          >
            <button
              class="inline-flex items-center gap-1"
              @click="filterByTag(tag)"
            >
              <UIcon
                name="i-lucide-tag"
                class="size-2.5"
              />
              {{ tag }}
              <span class="text-[10px] text-(--ui-text-dimmed)">{{ count }}</span>
            </button>
            <button
              class="opacity-0 group-hover/tag:opacity-100 size-3.5 grid place-items-center transition-opacity"
              :title="`Browse ${tag}`"
              @click="openTag(tag)"
            >
              <UIcon
                name="i-lucide-arrow-right"
                class="size-2.5"
              />
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <p class="text-[11px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) px-2 pb-1 flex justify-between">
          Recipes
          <span class="font-medium tracking-normal normal-case">{{ recipes.length }}</span>
        </p>
        <ul class="flex flex-col gap-0.5">
          <li
            v-for="recipe in recipes"
            :key="recipe.path"
          >
            <NuxtLink
              :to="recipeUrl(recipe.path)"
              class="flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all group"
              :class="$route.path === recipeUrl(recipe.path)
                ? 'bg-(--ui-bg) shadow-sm outline outline-1 outline-(--ui-border)'
                : 'hover:bg-(--ui-bg-elevated)'"
            >
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-semibold text-(--ui-text) truncate leading-snug">
                  {{ recipe.title }}
                </p>
                <p class="text-[11px] text-(--ui-text-dimmed) flex items-center gap-1 mt-0.5">
                  <UIcon
                    name="i-lucide-tag"
                    class="size-2.5 shrink-0"
                  />
                  {{ recipe.category }}
                </p>
              </div>
              <UIcon
                name="i-lucide-arrow-right"
                class="size-3.5 text-(--ui-text-dimmed) opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              />
            </NuxtLink>
          </li>
          <li
            v-if="recipes.length === 0"
            class="py-4 text-center text-sm text-(--ui-text-dimmed)"
          >
            No recipes match.
          </li>
        </ul>
      </div>
    </aside>
  </Transition>

  <div
    v-if="recent.length && isRecipePage && open"
    class="hidden min-[1400px]:flex fixed left-[300px] top-24 z-30 flex-col gap-1.5 pointer-events-none"
  >
    <NuxtLink
      v-for="r in recent"
      :key="r.path"
      :to="recipeUrl(r.path)"
      class="recipe-tab pointer-events-auto flex items-center h-6 pl-1.5 pr-2 w-[190px] overflow-hidden whitespace-nowrap text-[11px] border border-l-0 rounded-r-md shadow-sm transition-all duration-200 hover:translate-x-1"
      :class="$route.path === recipeUrl(r.path)
        ? 'bg-primary-500 border-primary-500 text-white'
        : 'bg-(--ui-bg) border-(--ui-border) text-(--ui-text-muted) hover:text-(--ui-text)'"
      :title="r.title"
    >
      <span
        class="w-1 h-3 rounded-full shrink-0 mr-1.5"
        :class="$route.path === recipeUrl(r.path) ? 'bg-white/70' : 'bg-primary-500/50'"
      />
      <span class="truncate">{{ r.title }}</span>
    </NuxtLink>
    <button
      class="recipe-tab pointer-events-auto flex items-center h-6 pl-1.5 pr-2 w-[190px] overflow-hidden whitespace-nowrap text-[11px] border border-l-0 rounded-r-md shadow-sm bg-(--ui-bg) border-(--ui-border) text-(--ui-text-dimmed) hover:text-(--ui-text) transition-all duration-200"
      @click="clearRecent"
    >
      <UIcon
        name="i-lucide-x"
        class="size-3 shrink-0 mr-1.5"
      />
      <span class="truncate">Clear</span>
    </button>
  </div>
</template>
