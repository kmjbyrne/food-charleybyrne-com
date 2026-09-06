<script setup lang="ts">
definePageMeta({ alias: [] })

const route = useRoute()
const segments = computed(() => (route.params.slug as string[]) ?? [])
const label = computed(() =>
  segments.value.map(s => s.split('-').map(w => w[0]!.toUpperCase() + w.slice(1)).join(' ')).join(' · ')
)

useSeoMeta({
  title: () => label.value || 'Recipes',
  description: () => `Recipes in ${label.value}.`
})
</script>

<template>
  <RecipeIndex />
</template>
