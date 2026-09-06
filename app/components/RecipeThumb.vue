<script setup lang="ts">
interface Props {
  title: string
  category?: string
  image?: string
  cover?: string
  rounded?: string
}

const props = defineProps<Props>()

const CATEGORY_ICONS: Record<string, string> = {
  sauces: 'i-lucide-droplet',
  dressing: 'i-lucide-droplet',
  dips: 'i-lucide-droplet',
  condiments: 'i-lucide-flask-round',
  marinades: 'i-lucide-flask-conical',
  seasoning: 'i-lucide-shaker',
  pastes: 'i-lucide-blend',
  curry: 'i-lucide-flame',
  indian: 'i-lucide-flame',
  mains: 'i-lucide-utensils',
  chicken: 'i-lucide-drumstick',
  fish: 'i-lucide-fish',
  seafood: 'i-lucide-shell',
  eggs: 'i-lucide-egg',
  sides: 'i-lucide-salad',
  salad: 'i-lucide-salad',
  vegan: 'i-lucide-leaf',
  bread: 'i-lucide-sandwich',
  pizza: 'i-lucide-pizza',
  snacks: 'i-lucide-cookie',
  bites: 'i-lucide-cookie',
  desserts: 'i-lucide-cake',
  beverages: 'i-lucide-coffee',
  cocktail: 'i-lucide-martini',
  breakfast: 'i-lucide-egg-fried',
  brunch: 'i-lucide-croissant',
  italian: 'i-lucide-wheat',
  chinese: 'i-lucide-soup',
  japanese: 'i-lucide-soup',
  asian: 'i-lucide-soup',
  french: 'i-lucide-croissant'
}

const art = computed(() => useRecipeArt({ image: props.image, cover: props.cover }))

const icon = computed(() =>
  CATEGORY_ICONS[props.category?.toLowerCase() ?? ''] ?? 'i-lucide-cooking-pot'
)
</script>

<template>
  <div
    v-if="art"
    class="aspect-16/10 bg-(--ui-bg-elevated) bg-cover bg-center"
    :class="props.rounded ?? 'rounded-lg'"
    :style="{ backgroundImage: `url(${art})` }"
  />
  <div
    v-else
    class="aspect-16/10 grid place-items-center bg-(--ui-bg-elevated) border border-(--ui-border)"
    :class="props.rounded ?? 'rounded-lg'"
  >
    <UIcon
      :name="icon"
      class="size-8 text-(--ui-text-dimmed) opacity-60"
    />
  </div>
</template>
