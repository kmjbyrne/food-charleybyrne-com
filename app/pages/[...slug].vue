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

    if (segments.value.length !== 1) return null
    const wanted = segments.value[0]!
    const all = await queryCollection('recipes').all()
    return all.find(r => (r.slug ?? (r.path ?? '').split('/').pop()) === wanted) ?? null
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
