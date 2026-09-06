<script setup lang="ts">
const route = useRoute()
const segments = computed(() => (route.params.slug as string[]) ?? [])
const path = computed(() => `/${segments.value.join('/')}`)

// One namespace holds both, so a path is a recipe if a document sits there and
// a category otherwise.
const { data: recipe } = await useAsyncData(
  () => `entry-${path.value}`,
  () => queryCollection('recipes').path(`/recipes${path.value}`).first()
)

const isRecipe = computed(() => Boolean(recipe.value))

// The sidebar and filters need to know which kind of page this is.
watchEffect(() => {
  route.meta.isRecipe = isRecipe.value
})
</script>

<template>
  <RecipeDetail
    v-if="isRecipe"
    :recipe="recipe"
  />
  <RecipeIndex v-else />
</template>
