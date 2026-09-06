<script setup lang="ts">
const { data: techniques } = await useAsyncData('techniques', () =>
  queryCollection('techniques')
    .select('path', 'title', 'description', 'category', 'tags', 'time', 'difficulty')
    .all()
)

useSeoMeta({
  title: 'Techniques',
  description: 'Kitchen techniques worth getting right once.'
})
</script>

<template>
  <div class="px-6 lg:px-12 xl:px-20 2xl:px-28 py-8">
    <div class="max-w-[1800px] mx-auto">
      <nav class="flex items-center gap-1.5 text-sm text-(--ui-text-muted) mb-2">
        <NuxtLink
          to="/"
          class="hover:text-primary-500 transition-colors"
        >All recipes</NuxtLink>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-3.5 shrink-0 text-(--ui-text-dimmed)"
        />
        <span class="text-(--ui-text) font-medium">Techniques</span>
      </nav>

      <h1 class="text-2xl font-bold tracking-tight mb-6">
        {{ techniques?.length ?? 0 }} techniques
      </h1>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <NuxtLink
          v-for="t in techniques"
          :key="t.path"
          :to="t.path"
          class="flex flex-col gap-1.5 p-3.5 rounded-lg border border-(--ui-border) bg-(--ui-bg) transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary-500"
        >
          <p
            v-if="t.category"
            class="text-[10px] font-semibold uppercase tracking-wider text-primary-500"
          >
            {{ t.category }}
          </p>
          <p class="text-sm/snug font-semibold">
            {{ t.title }}
          </p>
          <p
            v-if="t.description"
            class="text-xs/snug text-(--ui-text-dimmed) line-clamp-3"
          >
            {{ t.description }}
          </p>
          <div
            v-if="t.difficulty || t.time"
            class="flex items-center gap-3 mt-1 text-[11px] text-(--ui-text-dimmed)"
          >
            <span
              v-if="t.difficulty"
              class="flex items-center gap-1"
            >
              <UIcon
                name="i-lucide-gauge"
                class="size-3"
              />
              {{ t.difficulty }}
            </span>
            <span
              v-if="t.time"
              class="flex items-center gap-1"
            >
              <UIcon
                name="i-lucide-clock"
                class="size-3"
              />
              {{ t.time }} min
            </span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
