<script setup lang="ts">
const route = useRoute()
const slug = computed(() => `/techniques/${(route.params.slug as string[]).join('/')}`)

const { data: technique } = await useAsyncData(() => `technique-${slug.value}`, () =>
  queryCollection('techniques').path(slug.value).first()
)

if (!technique.value) {
  throw createError({ statusCode: 404, statusMessage: 'Technique not found' })
}

useSeoMeta({
  title: () => technique.value?.title ?? '',
  description: () => technique.value?.description ?? ''
})
</script>

<template>
  <div class="px-6 py-8 flex justify-center">
    <article class="w-full max-w-[760px] flex flex-col gap-6">
      <nav class="flex items-center gap-2 text-sm text-(--ui-text-muted)">
        <NuxtLink
          to="/techniques"
          class="hover:text-primary-500 transition-colors"
        >Techniques</NuxtLink>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-3.5"
        />
        <span
          v-if="technique?.category"
          class="text-(--ui-text)"
        >{{ technique.category }}</span>
      </nav>

      <div class="flex flex-col gap-2">
        <h1 class="text-3xl/tight font-bold tracking-tight text-(--ui-text-highlighted)">
          {{ technique?.title }}
        </h1>
        <p
          v-if="technique?.description"
          class="text-base/relaxed text-(--ui-text-muted)"
        >
          {{ technique.description }}
        </p>
      </div>

      <div
        v-if="technique?.body"
        class="recipe-prose"
      >
        <ContentRenderer :value="technique" />
      </div>
    </article>
  </div>
</template>
