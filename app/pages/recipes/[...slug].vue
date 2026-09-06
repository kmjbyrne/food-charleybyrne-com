<script setup lang="ts">
import type { RecipeMeta } from '~/types/recipe'

definePageMeta({})

const route = useRoute()
const slug = computed(() => {
  const parts = route.params.slug as string[]
  return '/recipes/' + parts.join('/')
})

const { data: recipe } = await useAsyncData(`recipe-${slug.value}`, () =>
  queryCollection('recipes').path(slug.value).first()
)

if (!recipe.value) {
  throw createError({ statusCode: 404, statusMessage: 'Recipe not found' })
}

const { data: related } = await useAsyncData(`related-${slug.value}`, () =>
  queryCollection('recipes')
    .where('category', '=', recipe.value?.category ?? '')
    .where('path', '<>', slug.value)
    .select('path', 'stem', 'title', 'category', 'image', 'description')
    .limit(3)
    .all()
)

useSeoMeta({
  title: () => `${recipe.value?.title}`,
  description: () => recipe.value?.description ?? ''
})

const cookingMode = ref(false)
const nutritionOpen = ref(false)

const goToCategory = (category: string) => {
  navigateTo({ path: '/', query: { category } })
}

// Nested children make the circuit highlight span the whole branch; the top
// level is enough to navigate a recipe.
const tocLinks = computed(() =>
  (recipe.value?.body?.toc?.links ?? []).map(({ children, ...link }) => link)
)

// Most recipes are just Ingredients + Method; a two-item TOC is noise.
const showToc = computed(() => tocLinks.value.length >= 3)

const heroArt = computed(() => useRecipeArt(recipe.value))

const prose = useTemplateRef<HTMLElement>('prose')
const storageKey = computed(() => `recipe-checks:${slug.value}`)

const itemKey = (li: Element) => (li.textContent ?? '').trim()

const persistChecks = () => {
  if (!prose.value) return
  const checked = [...prose.value.querySelectorAll('ul li.checked, ol li.checked')].map(itemKey)
  try {
    if (checked.length) {
      localStorage.setItem(storageKey.value, JSON.stringify(checked))
    } else {
      localStorage.removeItem(storageKey.value)
    }
  } catch {
    // private mode / storage disabled
  }
}

const restoreChecks = () => {
  if (!prose.value) return
  let saved: string[] = []
  try {
    saved = JSON.parse(localStorage.getItem(storageKey.value) ?? '[]')
  } catch {
    return
  }
  if (!saved.length) return
  for (const li of prose.value.querySelectorAll('ul li, ol li')) {
    if (saved.includes(itemKey(li))) li.classList.add('checked')
  }
}

// Ingredients come from rendered markdown, so handle clicks by delegation.
const onProseClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.closest('a')) return

  const heading = target.closest('.recipe-prose h2, .recipe-prose h3')
  // anchor clicks are handled above; everything else toggles the section
  if (heading) {
    heading.classList.toggle('collapsed')
    return
  }

  const li = target.closest('.recipe-prose ul li, .recipe-prose ol li')
  if (li && !li.querySelector('ul, ol')) {
    li.classList.toggle('checked')
    persistChecks()
  }
}

// Collapsed headings show what they are hiding.
const labelSections = () => {
  if (!prose.value) return
  const headings = prose.value.querySelectorAll('h2, h3')
  for (const h of headings) {
    let count = 0
    let node = h.nextElementSibling
    while (node && !['H2', 'H3'].includes(node.tagName)) {
      if (node.tagName === 'UL' || node.tagName === 'OL') {
        count += node.querySelectorAll(':scope > li').length
      }
      node = node.nextElementSibling
    }
    if (count) h.setAttribute('data-count', `${count} item${count === 1 ? '' : 's'}`)
    else h.removeAttribute('data-count')
  }
}

const { visit } = useRecentRecipes()

const multiplier = ref(1)
const SCALES = [0.5, 1, 2, 3]

// Ingredient lists only; method steps must never be rewritten.
const applyScaling = () => {
  if (!prose.value) return
  const lists = prose.value.querySelectorAll('ul')
  for (const list of lists) {
    for (const li of list.querySelectorAll(':scope > li')) {
      const original = li.getAttribute('data-original') ?? li.textContent ?? ''
      if (!li.hasAttribute('data-original')) li.setAttribute('data-original', original)

      const child = li.querySelector('ul')
      if (child) continue

      const { text, rule, scaled } = scaleLine(original, multiplier.value)
      // Write into the first text node so checkboxes and links survive.
      const node = [...li.childNodes].find(n => n.nodeType === 3 && n.textContent?.trim())
      if (node) node.textContent = text
      li.classList.toggle('scaled', scaled)
      li.classList.toggle('unscaled', multiplier.value !== 1 && !scaled && rule === 'manual')
    }
  }
}

watch(multiplier, () => applyScaling())

onMounted(() => {
  restoreChecks()
  labelSections()
  visit(recipe.value)
  applyScaling()
})
watch(slug, () => nextTick(() => {
  restoreChecks()
  labelSections()
  visit(recipe.value)
}))

const nutrition = computed(() => recipe.value?.nutrition)

const totalFat = computed(() => {
  const f = nutrition.value?.fat
  if (!f) return 0
  return (f.saturated ?? 0) + (f.mono ?? 0) + (f.poly ?? 0)
})

const totalCarbs = computed(() => {
  const c = nutrition.value?.carbs
  if (!c) return 0
  return (c.fiber ?? 0) + (c.sugars ?? 0)
})

const macroTotal = computed(
  () => (nutrition.value?.protein ?? 0) + totalCarbs.value + totalFat.value
)

const proteinPct = computed(() =>
  macroTotal.value
    ? Math.round(((nutrition.value?.protein ?? 0) / macroTotal.value) * 100)
    : 0
)
const carbsPct = computed(() =>
  macroTotal.value
    ? Math.round((totalCarbs.value / macroTotal.value) * 100)
    : 0
)
const fatPct = computed(() =>
  macroTotal.value ? Math.round((totalFat.value / macroTotal.value) * 100) : 0
)
</script>

<template>
  <div class="px-6 md:pl-56 py-8 flex justify-center gap-8">
    <article class="w-full max-w-[760px] flex flex-col gap-6">
      <div class="flex items-center gap-2 text-sm text-(--ui-text-muted)">
        <NuxtLink
          to="/"
          class="hover:text-primary-500 transition-colors"
        >Recipes</NuxtLink>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-3.5"
        />
        <button
          v-if="recipe?.category"
          class="text-(--ui-text) hover:text-primary-500 transition-colors"
          @click="goToCategory(recipe!.category!)"
        >
          {{ recipe.category }}
        </button>
      </div>

      <div
        v-if="heroArt"
        class="aspect-21/9 rounded-xl bg-(--ui-bg-elevated) bg-cover bg-center"
        :style="{ backgroundImage: `url(${heroArt})` }"
      />

      <div class="flex flex-col gap-2">
        <h1 class="text-3xl/tight font-bold tracking-tight text-(--ui-text-highlighted)">
          {{ recipe?.title }}
        </h1>
        <p
          v-if="recipe?.description"
          class="text-base/relaxed text-(--ui-text-muted)"
        >
          {{ recipe?.description }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div
          v-if="recipe?.tags?.length"
          class="flex flex-wrap gap-1.5 flex-1"
        >
          <NuxtLink
            v-for="tag in recipe.tags"
            :key="tag"
            :to="{ path: '/', query: { tag: tag.toLowerCase() } }"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--ui-bg-elevated) text-(--ui-text-muted) text-xs font-medium border border-transparent hover:bg-primary-500/12 hover:text-primary-500 transition-colors"
          >
            <UIcon
              name="i-lucide-tag"
              class="size-2.5"
            />
            {{ tag }}
          </NuxtLink>
        </div>
        <UButton
          icon="i-lucide-chef-hat"
          label="Cook"
          color="primary"
          variant="soft"
          size="sm"
          class="hidden md:flex shrink-0 ml-auto"
          @click="cookingMode = true"
        />
      </div>

      <div
        v-if="recipe?.body"
        class="flex items-center gap-2 text-sm"
      >
        <span class="text-(--ui-text-dimmed)">Scale</span>
        <div class="flex rounded-lg border border-(--ui-border) overflow-hidden">
          <button
            v-for="s in SCALES"
            :key="s"
            class="px-2.5 py-1 text-xs font-medium transition-colors"
            :class="multiplier === s
              ? 'bg-primary-500 text-white'
              : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated)'"
            @click="multiplier = s"
          >
            {{ s === 0.5 ? '½×' : `${s}×` }}
          </button>
        </div>
        <span
          v-if="multiplier !== 1"
          class="text-xs text-(--ui-text-dimmed)"
        >
          Times and pan sizes do not scale. Marked items need judgement.
        </span>
      </div>

      <div
        v-if="recipe?.body"
        ref="prose"
        class="recipe-prose"
        @click="onProseClick"
      >
        <ContentRenderer :value="recipe" />
      </div>

      <section
        v-if="related?.length"
        class="flex flex-col gap-3"
      >
        <h2 class="text-lg font-bold tracking-tight">
          Other related recipes
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <NuxtLink
            v-for="r in related as RecipeMeta[]"
            :key="r.path"
            :to="r.path"
            class="flex flex-col gap-2 p-2 rounded-xl border border-(--ui-border) bg-(--ui-bg) transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary-500"
          >
            <RecipeThumb
              :title="r.title"
              :category="r.category"
              :image="r.image"
              :cover="r.cover"
            />
            <div class="px-1 pb-1">
              <p
                class="text-[10px] font-semibold uppercase tracking-wider text-primary-500"
              >
                {{ r.category }}
              </p>
              <p class="text-sm/snug font-semibold">{{ r.title }}</p>
            </div>
          </NuxtLink>
        </div>
      </section>
    </article>

    <aside
      v-if="showToc"
      class="hidden xl:block w-56 shrink-0"
    >
      <UContentToc
        :links="tocLinks"
        highlight
        highlight-variant="circuit"
        class="sticky top-20"
      />
    </aside>
  </div>

  <Teleport
    v-if="nutrition?.calories"
    to="body"
  >
    <!-- Tab -->
    <button
      class="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 py-3 px-2 bg-(--ui-bg) border border-r-0 border-(--ui-border) rounded-l-xl shadow-md text-primary-500 transition-transform"
      :class="nutritionOpen ? 'translate-x-full' : ''"
      @click="nutritionOpen = true"
    >
      <UIcon
        name="i-lucide-activity"
        class="size-4"
      />
      <span
        class="text-[10px] font-semibold uppercase tracking-widest"
        style="writing-mode: vertical-rl; text-orientation: mixed"
      >Nutrition</span>
      <UIcon
        name="i-lucide-chevron-left"
        class="size-3.5"
      />
    </button>

    <!-- Backdrop -->
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="nutritionOpen"
        class="fixed inset-0 z-40 bg-black/30"
        @click="nutritionOpen = false"
      />
    </Transition>

    <!-- Drawer -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="nutritionOpen"
        class="fixed right-0 top-0 h-full w-[360px] z-50 bg-(--ui-bg) border-l border-(--ui-border) shadow-2xl flex flex-col overflow-y-auto"
      >
        <!-- Header -->
        <div
          class="px-5 pt-5 pb-4 border-b border-(--ui-border) flex items-start justify-between"
        >
          <div>
            <p
              class="text-[11px] font-semibold uppercase tracking-widest text-primary-500 mb-0.5"
            >
              Nutrition
            </p>
            <p class="text-xl font-bold text-(--ui-text)">
              Per serving
            </p>
          </div>
          <button
            class="text-(--ui-text-muted) hover:text-(--ui-text) transition-colors mt-0.5"
            @click="nutritionOpen = false"
          >
            <UIcon
              name="i-lucide-x"
              class="size-5"
            />
          </button>
        </div>

        <div class="p-5 flex flex-col gap-5">
          <!-- Calories card -->
          <div
            class="rounded-xl p-4 bg-primary-500/8 border border-primary-500/15"
          >
            <div class="flex items-baseline gap-1.5">
              <span class="text-5xl font-bold text-primary-500">{{
                nutrition.calories
              }}</span>
              <span class="text-lg text-(--ui-text-muted)">kcal</span>
            </div>
            <p class="text-sm text-(--ui-text-dimmed) mt-1">
              per serving{{
                nutrition.servings ? ` · ${nutrition.servings} servings` : ""
              }}
            </p>
          </div>

          <!-- Macro bar -->
          <div class="flex flex-col gap-2.5">
            <div class="flex h-3 rounded-full overflow-hidden gap-px">
              <div
                class="bg-blue-500 transition-all"
                :style="`width: ${proteinPct}%`"
              />
              <div
                class="bg-amber-400 transition-all"
                :style="`width: ${carbsPct}%`"
              />
              <div
                class="bg-red-500 transition-all"
                :style="`width: ${fatPct}%`"
              />
            </div>
            <div class="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span
                  class="inline-block size-2 rounded-full bg-blue-500 mr-1.5"
                />
                <span
                  class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
                >Protein</span>
                <p class="font-bold text-(--ui-text) mt-0.5">
                  {{ nutrition.protein ?? 0 }}g
                  <span class="text-(--ui-text-dimmed) font-normal text-xs">{{ proteinPct }}%</span>
                </p>
              </div>
              <div>
                <span
                  class="inline-block size-2 rounded-full bg-amber-400 mr-1.5"
                />
                <span
                  class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
                >Carbs</span>
                <p class="font-bold text-(--ui-text) mt-0.5">
                  {{ totalCarbs }}g
                  <span class="text-(--ui-text-dimmed) font-normal text-xs">{{ carbsPct }}%</span>
                </p>
              </div>
              <div>
                <span
                  class="inline-block size-2 rounded-full bg-red-500 mr-1.5"
                />
                <span
                  class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
                >Fat</span>
                <p class="font-bold text-(--ui-text) mt-0.5">
                  {{ totalFat }}g
                  <span class="text-(--ui-text-dimmed) font-normal text-xs">{{ fatPct }}%</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Secondary stats -->
          <div class="grid grid-cols-3 gap-2">
            <div
              v-if="nutrition.carbs?.fiber"
              class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) px-3 py-2.5"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
              >
                Fiber
              </p>
              <p class="font-bold text-(--ui-text) mt-0.5">
                {{ nutrition.carbs.fiber
                }}<span class="text-xs font-normal text-(--ui-text-dimmed)">g</span>
              </p>
            </div>
            <div
              v-if="nutrition.carbs?.sugars"
              class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) px-3 py-2.5"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
              >
                Sugar
              </p>
              <p class="font-bold text-(--ui-text) mt-0.5">
                {{ nutrition.carbs.sugars
                }}<span class="text-xs font-normal text-(--ui-text-dimmed)">g</span>
              </p>
            </div>
            <div
              v-if="nutrition.sodium"
              class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) px-3 py-2.5"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
              >
                Sodium
              </p>
              <p class="font-bold text-(--ui-text) mt-0.5">
                {{ nutrition.sodium
                }}<span class="text-xs font-normal text-(--ui-text-dimmed)">mg</span>
              </p>
            </div>
            <div
              v-if="nutrition.potassium"
              class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) px-3 py-2.5"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
              >
                Potassium
              </p>
              <p class="font-bold text-(--ui-text) mt-0.5">
                {{ nutrition.potassium
                }}<span class="text-xs font-normal text-(--ui-text-dimmed)">mg</span>
              </p>
            </div>
            <div
              v-if="nutrition.cholesterol"
              class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) px-3 py-2.5"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
              >
                Cholesterol
              </p>
              <p class="font-bold text-(--ui-text) mt-0.5">
                {{ nutrition.cholesterol
                }}<span class="text-xs font-normal text-(--ui-text-dimmed)">mg</span>
              </p>
            </div>
            <div
              v-if="nutrition.fat?.saturated"
              class="rounded-lg border border-(--ui-border) bg-(--ui-bg-muted) px-3 py-2.5"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide text-(--ui-text-dimmed)"
              >
                Sat. fat
              </p>
              <p class="font-bold text-(--ui-text) mt-0.5">
                {{ nutrition.fat.saturated
                }}<span class="text-xs font-normal text-(--ui-text-dimmed)">g</span>
              </p>
            </div>
          </div>

          <!-- Vitamins -->
          <div
            v-if="nutrition.vitamins && Object.keys(nutrition.vitamins).length"
          >
            <p
              class="text-[10px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) mb-3 flex justify-between"
            >
              Micronutrients
              <span class="normal-case tracking-normal">% daily value</span>
            </p>
            <div class="flex flex-col gap-2.5">
              <div
                v-for="(val, key) in nutrition.vitamins"
                :key="key"
                class="flex items-center gap-3"
              >
                <span
                  class="text-sm text-(--ui-text) w-20 capitalize shrink-0"
                >{{
                  key === "a" ? "Vit. A" : key === "c" ? "Vit. C" : key
                }}</span>
                <div
                  class="flex-1 h-1.5 bg-(--ui-bg-elevated) rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-primary-500 rounded-full"
                    :style="`width: ${Math.min(val, 100)}%`"
                  />
                </div>
                <span
                  class="text-sm font-medium text-(--ui-text-muted) w-9 text-right shrink-0"
                >{{ val }}%</span>
              </div>
            </div>
          </div>

          <p
            class="text-xs text-(--ui-text-dimmed) flex items-center gap-1.5 pt-1 border-t border-(--ui-border) border-dashed"
          >
            <UIcon
              name="i-lucide-sparkles"
              class="size-3 shrink-0 text-primary-500"
            />
            Values are estimates. Scaled to
            {{ nutrition.servings ?? 1 }} serving{{
              (nutrition.servings ?? 1) !== 1 ? "s" : ""
            }}.
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <CookingMode
      v-if="cookingMode"
      :recipe="recipe ?? null"
      @exit="cookingMode = false"
    />
  </Teleport>
</template>
