<script setup lang="ts">
const route = useRoute()
const segments = computed(() => (route.params.slug as string[]) ?? [])
const path = computed(() => `/${segments.value.join('/')}`)

// One namespace holds both, so a path is a recipe if a document sits there and
// a category otherwise.
// Every recipe answers to its full path and to a short one: /soubise as well as
// /sauces/bechamel/soubise. The full path stays canonical.
const { data: recipe } = await useAsyncData(
  () => `entry-${path.value}`,
  async () => {
    const exact = await queryCollection('recipes').path(`/recipes${path.value}`).first()
    if (exact) return exact

    // A variant also answers on its own path (/sauces/bechamel/soubise/keto),
    // so search engines have something to index for it.
    const parent = segments.value.slice(0, -1).join('/')
    const leaf = segments.value.at(-1)!
    if (parent) {
      const withVariant = await queryCollection('recipes').path(`/recipes/${parent}`).first()
      const groups = withVariant?.variants ?? []
      const match = groups.some(g =>
        (g.options ?? []).some(o => o.toLowerCase().replace(/\s+/g, '-') === leaf)
      )
      if (match) return withVariant
    }

    if (segments.value.length !== 1) return null
    const all = await queryCollection('recipes').all()
    return all.find(r => (r.slug ?? (r.path ?? '').split('/').pop()) === leaf) ?? null
  }
)

const entry = computed(() => recipe.value ?? null)
const isRecipe = computed(() => Boolean(entry.value))

// The sidebar and filters need to know which kind of page this is.
watchEffect(() => {
  route.meta.isRecipe = isRecipe.value
})
</script>

<template>
  <RecipeDetail
    v-if="isRecipe"
    :recipe="entry"
  />
  <RecipeIndex v-else />
</template>
