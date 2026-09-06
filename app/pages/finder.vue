<script setup lang="ts">
const query = ref('')

const { data: recipes } = await useAsyncData('finder-recipes', () =>
  queryCollection('recipes')
    .select('path', 'title', 'description', 'category', 'body')
    .all()
)

const pantry = computed(() =>
  query.value
    .split(/[,\n]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
)

const flat = (node: unknown): string => {
  if (typeof node === 'string') return node
  if (!Array.isArray(node)) return ''
  return node.slice(2).map(flat).join('')
}

const ingredientsOf = (body: unknown): string[] => {
  const out: string[] = []
  let depth = 0

  const walk = (node: unknown) => {
    if (!Array.isArray(node)) return
    const [tag, , ...kids] = node as [string, unknown, ...unknown[]]

    const level = /^h([1-6])$/.exec(tag)?.[1]
    if (level) {
      const n = Number(level)
      const label = flat(node).trim().toLowerCase()
      if (label === 'ingredients') depth = n
      else if (depth && n <= depth) depth = 0
      return
    }
    if (depth && tag === 'ul') {
      for (const li of kids) {
        if (Array.isArray(li) && li[0] === 'li') {
          const text = flat(li).replace(/\s+/g, ' ').trim()
          if (text) out.push(text)
        }
      }
      return
    }
    kids.forEach(walk)
  }

  ;((body as { value?: unknown[] })?.value ?? []).forEach(walk)
  return out
}

const results = computed(() => {
  if (!pantry.value.length) return []

  return (recipes.value ?? [])
    .map((recipe) => {
      const lines = ingredientsOf(recipe.body)
      const have = new Set<string>()
      const missing: string[] = []

      for (const line of lines) {
        const hit = matchesPantry(line, pantry.value)
        if (hit) have.add(hit)
        else missing.push(foodName(line) || line)
      }

      return {
        recipe,
        matched: [...have],
        missing,
        total: lines.length,
        score: have.size / Math.max(pantry.value.length, 1)
      }
    })
    .filter(r => r.matched.length)
    .sort((a, b) =>
      b.matched.length - a.matched.length
      || a.missing.length - b.missing.length
    )
    .slice(0, 40)
})

const examples = ['chicken, tomato, garlic', 'eggs, butter, lemon', 'almond flour, cream cheese']

useSeoMeta({
  title: 'What can I make?',
  description: 'Find recipes from the ingredients you already have.'
})
</script>

<template>
  <div class="px-6 lg:px-12 xl:px-20 py-8">
    <div class="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          What can I make?
        </h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          List what you have and this checks it against every recipe.
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <textarea
          v-model="query"
          rows="2"
          placeholder="chicken, tomato, garlic, parsley"
          class="w-full px-3 py-2.5 rounded-lg border border-(--ui-border) bg-(--ui-bg) text-sm resize-y focus:outline-none focus:border-primary-500"
        />
        <div class="flex flex-wrap items-center gap-2 text-xs text-(--ui-text-dimmed)">
          <span>Try</span>
          <button
            v-for="example in examples"
            :key="example"
            class="px-2 py-0.5 rounded-full border border-(--ui-border) hover:border-primary-500 hover:text-primary-500 transition-colors"
            @click="query = example"
          >
            {{ example }}
          </button>
        </div>
      </div>

      <p
        v-if="pantry.length && !results.length"
        class="text-sm text-(--ui-text-muted) py-8 text-center"
      >
        Nothing matched. Try fewer or more common ingredients.
      </p>

      <ul
        v-if="results.length"
        class="flex flex-col gap-2"
      >
        <li
          v-for="result in results"
          :key="result.recipe.path"
        >
          <NuxtLink
            :to="recipeUrl(result.recipe.path)"
            class="block p-3.5 rounded-lg border border-(--ui-border) bg-(--ui-bg) hover:border-primary-500 transition-colors"
          >
            <div class="flex items-baseline justify-between gap-3">
              <span class="text-[15px] font-semibold text-(--ui-text-highlighted)">
                {{ result.recipe.title }}
              </span>
              <span class="text-[11px] text-(--ui-text-dimmed) shrink-0 tabular-nums">
                {{ result.matched.length }} of {{ pantry.length }} used,
                {{ result.missing.length }} to buy
              </span>
            </div>

            <div class="flex flex-wrap gap-1 mt-2">
              <span
                v-for="item in result.matched"
                :key="item"
                class="text-[11px] px-1.5 py-0.5 rounded-full bg-primary-500/12 text-primary-500 font-medium"
              >{{ item }}</span>
              <span
                v-for="item in result.missing.slice(0, 6)"
                :key="item"
                class="text-[11px] px-1.5 py-0.5 rounded-full bg-(--ui-bg-elevated) text-(--ui-text-dimmed)"
              >{{ item }}</span>
              <span
                v-if="result.missing.length > 6"
                class="text-[11px] px-1.5 py-0.5 text-(--ui-text-dimmed)"
              >+{{ result.missing.length - 6 }} more</span>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
