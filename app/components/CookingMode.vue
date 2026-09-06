<script setup lang="ts">
import { useRecipeContent } from '~/composables/useRecipeContent'

interface Props {
  recipe: {
    title?: string
    description?: string
    image?: string
    category?: string
    time?: number
    prep?: number
    cook?: number
    servings?: number
    meta?: { data?: Record<string, string[]> }
    body?: { type?: string, value?: unknown[] }
  } | null
}

interface Emits {
  (e: 'exit'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const recipeRef = computed(() => props.recipe)

const heroStyle = computed(() => {
  const art = useRecipeArt(props.recipe)
  return {
    background: art ? `url(${art})` : useRecipeColor(props.recipe?.title ?? ''),
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }
})
const content = useRecipeContent(
  recipeRef as Parameters<typeof useRecipeContent>[0]
)

const checkedIngredients = ref<Set<string>>(new Set())
const activeStep = ref(0)

const toggleIngredient = (key: string) => {
  const next = new Set(checkedIngredients.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  checkedIngredients.value = next
}

const stepRefs = ref<HTMLElement[]>([])

const goToStep = (index: number) => {
  activeStep.value = index
  stepRefs.value[index]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  })
}
</script>

<template>
  <div
    class="cooking-mode fixed inset-0 z-50 flex flex-col overflow-hidden"
    style="background: var(--ui-bg)"
  >
    <header
      class="relative z-10 flex items-center gap-3 px-5 h-12 border-b border-(--ui-border) bg-(--ui-bg)/80 backdrop-blur-md shrink-0"
    >
      <NuxtLink
        to="/"
        class="flex items-center gap-1.5 px-1 font-bold tracking-tight text-(--ui-text-muted) hover:text-(--ui-text) transition-colors"
        @click.prevent="emit('exit')"
      >
        <span
          class="size-6 grid place-items-center bg-primary-500 text-white rounded-md text-xs"
        >
          <UIcon name="i-lucide-cooking-pot" />
        </span>
        <span class="text-sm">Recipes</span>
      </NuxtLink>

      <UIcon
        name="i-lucide-chevron-right"
        class="size-3.5 text-(--ui-text-dimmed)"
      />
      <span class="text-sm font-medium text-(--ui-text) truncate max-w-xs">{{
        recipe?.title
      }}</span>

      <div class="ml-auto flex items-center gap-4">
        <div
          v-if="
            recipe?.servings || recipe?.prep || recipe?.cook || recipe?.time
          "
          class="hidden sm:flex items-center gap-3 text-xs text-(--ui-text-dimmed)"
        >
          <span
            v-if="recipe?.servings"
            class="flex items-center gap-1.5"
          >
            <UIcon
              name="i-lucide-users"
              class="size-3.5"
            />
            {{ recipe.servings }} servings
          </span>
          <span
            v-if="recipe?.prep"
            class="flex items-center gap-1.5"
          >
            <UIcon
              name="i-lucide-timer"
              class="size-3.5"
            />
            Prep {{ recipe.prep }}m
          </span>
          <span
            v-if="recipe?.cook"
            class="flex items-center gap-1.5"
          >
            <UIcon
              name="i-lucide-flame"
              class="size-3.5"
            />
            Cook {{ recipe.cook }}m
          </span>
          <span
            v-else-if="recipe?.time"
            class="flex items-center gap-1.5"
          >
            <UIcon
              name="i-lucide-clock"
              class="size-3.5"
            />
            {{ recipe.time }}m
          </span>
        </div>

        <button
          class="flex items-center gap-1.5 text-xs text-(--ui-text-muted) hover:text-(--ui-text) transition-colors px-2.5 py-1.5 rounded-md hover:bg-(--ui-bg-elevated)"
          @click="emit('exit')"
        >
          <UIcon
            name="i-lucide-x"
            class="size-3.5"
          />
          Exit
        </button>
      </div>
    </header>

    <div class="flex flex-1 min-h-0 overflow-hidden">
      <div class="flex flex-1 min-w-0 overflow-y-auto">
        <div class="cooking-layout w-full">
          <div class="cooking-left-col">
            <div class="sticky top-8 flex flex-col gap-8 pb-16">
              <div class="cooking-intro">
                <div
                  class="aspect-square w-full rounded-2xl overflow-hidden mb-5"
                  :style="heroStyle"
                />
                <h1
                  class="text-2xl/tight font-bold tracking-tight mb-1.5"
                >
                  {{ recipe?.title }}
                </h1>
                <p
                  v-if="recipe?.description"
                  class="text-sm/relaxed text-(--ui-text-muted)"
                >
                  {{ recipe?.description }}
                </p>

                <div
                  class="mt-4 flex flex-col gap-1.5 text-xs text-(--ui-text-dimmed)"
                >
                  <div
                    v-if="recipe?.servings"
                    class="flex items-center gap-2"
                  >
                    <UIcon
                      name="i-lucide-users"
                      class="size-3.5 text-primary-500"
                    />
                    <span>{{ recipe.servings }} servings</span>
                  </div>
                  <div
                    v-if="recipe?.prep"
                    class="flex items-center gap-2"
                  >
                    <UIcon
                      name="i-lucide-timer"
                      class="size-3.5 text-primary-500"
                    />
                    <span>Prep {{ recipe.prep }}m</span>
                  </div>
                  <div
                    v-if="recipe?.cook"
                    class="flex items-center gap-2"
                  >
                    <UIcon
                      name="i-lucide-flame"
                      class="size-3.5 text-primary-500"
                    />
                    <span>Cook {{ recipe.cook }}m</span>
                  </div>
                  <div
                    v-else-if="recipe?.time"
                    class="flex items-center gap-2"
                  >
                    <UIcon
                      name="i-lucide-clock"
                      class="size-3.5 text-primary-500"
                    />
                    <span>{{ recipe.time }}m total</span>
                  </div>
                </div>
              </div>

              <div
                v-if="content.ingredientGroups.length > 0"
                class="flex flex-col gap-6"
              >
                <p
                  class="text-[11px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed)"
                >
                  Ingredients
                </p>

                <div
                  v-for="group in content.ingredientGroups"
                  :key="group.label"
                  class="flex flex-col gap-0.5"
                >
                  <p
                    v-if="content.ingredientGroups.length > 1"
                    class="text-[10px] font-semibold uppercase tracking-wider text-primary-500 mb-2"
                  >
                    {{ group.label }}
                  </p>
                  <button
                    v-for="item in group.items"
                    :key="item"
                    class="ingredient-item text-left text-sm/snug py-1.5 px-2 rounded-lg flex items-start gap-2.5 w-full"
                    :class="checkedIngredients.has(item) ? 'checked' : ''"
                    @click="toggleIngredient(item)"
                  >
                    <span class="ingredient-checkbox mt-0.5 shrink-0" />
                    <span>{{ item }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            class="cooking-spine-col"
            aria-hidden="true"
          >
            <div class="cooking-spine-line" />
          </div>

          <div class="cooking-right-col">
            <div class="pb-32">
              <p
                class="text-[11px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) mb-8"
              >
                Method
              </p>

              <div
                v-if="content.steps.length > 0"
                class="flex flex-col gap-0"
              >
                <div
                  v-for="(step, i) in content.steps"
                  :ref="
                    (el) => {
                      if (el) stepRefs[i] = el as HTMLElement;
                    }
                  "
                  :key="i"
                  class="cooking-step-row group cursor-pointer"
                  :class="{ active: activeStep === i, done: activeStep > i }"
                  @click="goToStep(i)"
                >
                  <div class="step-spine-dot">
                    <div class="step-dot-inner">
                      <UIcon
                        v-if="activeStep > i"
                        name="i-lucide-check"
                        class="size-2.5"
                      />
                    </div>
                    <div
                      v-if="i < content.steps.length - 1"
                      class="step-connector"
                    />
                  </div>

                  <div class="step-content">
                    <p
                      class="text-base/relaxed transition-all duration-200"
                      :class="
                        activeStep === i
                          ? 'text-(--ui-text-highlighted) font-medium'
                          : activeStep > i
                            ? 'text-(--ui-text-dimmed) line-through decoration-1'
                            : 'text-(--ui-text-muted) group-hover:text-(--ui-text)'
                      "
                    >
                      {{ step }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="text-sm text-(--ui-text-dimmed) italic"
              >
                No steps found for this recipe.
              </div>

              <div
                v-if="content.steps.length > 0"
                class="mt-12 flex gap-3"
              >
                <button
                  v-if="activeStep < content.steps.length - 1"
                  class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20"
                  @click="goToStep(activeStep + 1)"
                >
                  <span>Next step</span>
                  <UIcon
                    name="i-lucide-arrow-right"
                    class="size-4"
                  />
                </button>
                <button
                  v-if="activeStep > 0"
                  class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-(--ui-bg-elevated) text-(--ui-text) text-sm font-medium hover:bg-(--ui-bg-muted) transition-colors"
                  @click="goToStep(activeStep - 1)"
                >
                  <UIcon
                    name="i-lucide-arrow-left"
                    class="size-4"
                  />
                  <span>Back</span>
                </button>
                <div
                  v-if="activeStep === content.steps.length - 1"
                  class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500/15 text-primary-500 text-sm font-semibold"
                >
                  <UIcon
                    name="i-lucide-party-popper"
                    class="size-4"
                  />
                  Enjoy!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
