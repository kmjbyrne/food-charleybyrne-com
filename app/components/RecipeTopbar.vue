<script setup lang="ts">
interface Props {
  sidebarOpen: boolean
}

interface Emits {
  (e: 'toggle-sidebar'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { search } = useRecipeFilters()
const { recent, load: loadRecent, clear: clearRecent } = useRecentRecipes()

onMounted(loadRecent)

const { data: allPaths } = await useAsyncData('all-paths', () =>
  queryCollection('recipes').select('path').all()
)

const surpriseMe = async () => {
  const list = allPaths.value ?? []
  if (!list.length) return
  const pick = list[Math.floor(Math.random() * list.length)]
  if (pick?.path) await navigateTo(recipeUrl(pick.path))
}
const colorMode = useColorMode()

const { palette, apply: applyPalette, load: loadPalette } = usePalette()

onMounted(loadPalette)

const SCHEMES = [
  { id: 'light', label: 'Light', icon: 'i-lucide-sun' },
  { id: 'dark', label: 'Dark', icon: 'i-lucide-moon' },
  { id: 'system', label: 'System', icon: 'i-lucide-monitor' }
]

const schemeIcon = computed(() =>
  SCHEMES.find(s => s.id === colorMode.preference)?.icon ?? 'i-lucide-monitor'
)

const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const isApple = ref(false)

onMounted(() => {
  isApple.value = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
})

const isTypingTarget = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

const onKeydown = (e: KeyboardEvent) => {
  const focusSearch = () => {
    e.preventDefault()
    searchInput.value?.focus()
    searchInput.value?.select()
  }

  if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) return focusSearch()
  if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) return focusSearch()
  if (e.key === 'Escape' && document.activeElement === searchInput.value) searchInput.value?.blur()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header
    class="sticky top-0 z-40 h-14 flex items-center gap-4 px-4 border-b border-(--ui-border) bg-(--ui-bg)/85 backdrop-blur-md backdrop-saturate-180"
  >
    <div class="flex items-center gap-1.5 shrink-0">
      <UButton
        :icon="props.sidebarOpen ? 'i-lucide-panel-left' : 'i-lucide-menu'"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Toggle sidebar"
        @click="emit('toggle-sidebar')"
      />
      <NuxtLink
        to="/"
        class="flex items-center gap-2 px-1.5 font-bold tracking-tight"
      >
        <span
          class="size-7 grid place-items-center bg-primary-500 text-white rounded-lg text-sm"
        >
          <CookingPotMark class="text-base" />
        </span>
        <span class="hidden sm:inline text-base">Recipes</span>
      </NuxtLink>
    </div>

    <div
      class="flex-1 min-w-0 max-w-xl flex items-center gap-2 px-2.5 h-[34px] bg-(--ui-bg-elevated) border border-transparent rounded-lg text-(--ui-text-muted) transition-all focus-within:bg-(--ui-bg) focus-within:border-primary-500 focus-within:ring-3 focus-within:ring-primary-500/20"
    >
      <UIcon
        name="i-lucide-search"
        class="size-4 shrink-0"
      />
      <input
        ref="searchInput"
        :value="search"
        type="search"
        placeholder="Search recipes…"
        :aria-label="isApple ? 'Search recipes. Press slash or Command K' : 'Search recipes. Press slash or Control K'"
        class="flex-1 bg-transparent border-none outline-none text-sm text-(--ui-text) placeholder:text-(--ui-text-dimmed)"
        @input="search = ($event.target as HTMLInputElement).value"
      >
      <kbd
        v-if="!search"
        class="hidden sm:block text-xs px-1.5 py-0.5 rounded bg-(--ui-bg) border border-(--ui-border) text-(--ui-text-muted)"
        :title="isApple ? 'Press / or ⌘K to search' : 'Press / or Ctrl+K to search'"
      >/</kbd>
      <button
        v-else
        class="hover:text-(--ui-text) transition-colors"
        @click="search = ''"
      >
        <UIcon
          name="i-lucide-x"
          class="size-3.5"
        />
      </button>
    </div>

    <UButton
      icon="i-lucide-dices"
      color="neutral"
      variant="ghost"
      size="sm"
      class="hidden sm:flex shrink-0"
      aria-label="Pick a random recipe"
      title="Pick a random recipe"
      @click="surpriseMe"
    />

    <div class="flex items-center gap-1 ml-auto shrink-0">
      <UPopover>
        <UButton
          icon="i-lucide-history"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Recently viewed"
          title="Recently viewed"
        />
        <template #content>
          <div class="p-2 w-64">
            <p class="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed) flex items-center justify-between">
              Recently viewed
              <button
                v-if="recent.length"
                class="font-medium tracking-normal normal-case hover:text-(--ui-text) transition-colors"
                @click="clearRecent"
              >
                Clear
              </button>
            </p>
            <p
              v-if="!recent.length"
              class="px-2 py-3 text-[13px] text-(--ui-text-dimmed)"
            >
              Nothing yet. Recipes you open show up here.
            </p>
            <ul
              v-else
              class="flex flex-col gap-0.5"
            >
              <li
                v-for="r in recent"
                :key="r.path"
              >
                <NuxtLink
                  :to="r.path"
                  class="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors"
                  :class="$route.path === r.path
                    ? 'bg-primary-500/12 text-primary-500 font-medium'
                    : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text)'"
                >
                  <UIcon
                    name="i-lucide-clock"
                    class="size-3 shrink-0 opacity-50"
                  />
                  <span class="truncate">{{ r.title }}</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </template>
      </UPopover>

      <UButton
        to="/finder"
        icon="i-lucide-search-check"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="What can I make?"
        title="What can I make?"
      />

      <UButton
        to="/map"
        icon="i-lucide-git-fork"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Recipe map"
        title="Recipe map"
      />
      <UButton
        to="/techniques"
        icon="i-lucide-book-open"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Techniques"
        title="Techniques"
      />
      <UPopover>
        <UButton
          :icon="schemeIcon"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Appearance"
        />
        <template #content>
          <div class="p-3 w-56 flex flex-col gap-3">
            <div class="flex flex-col gap-1.5">
              <p class="text-[11px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed)">
                Appearance
              </p>
              <div class="grid grid-cols-3 gap-1">
                <button
                  v-for="s in SCHEMES"
                  :key="s.id"
                  class="flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] border transition-colors"
                  :class="colorMode.preference === s.id
                    ? 'border-primary-500 bg-primary-500/10 text-primary-500 font-medium'
                    : 'border-(--ui-border) text-(--ui-text-muted) hover:bg-(--ui-bg-elevated)'"
                  @click="colorMode.preference = s.id"
                >
                  <UIcon
                    :name="s.icon"
                    class="size-4"
                  />
                  {{ s.label }}
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <p class="text-[11px] font-semibold uppercase tracking-widest text-(--ui-text-dimmed)">
                Colour
              </p>
              <div class="flex flex-col gap-0.5">
                <button
                  v-for="p in PALETTES"
                  :key="p.id"
                  class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] transition-colors"
                  :class="palette === p.id
                    ? 'bg-primary-500/10 text-primary-500 font-medium'
                    : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text)'"
                  @click="applyPalette(p.id)"
                >
                  <span
                    class="size-3.5 rounded-full shrink-0 ring-1 ring-black/10"
                    :style="{ background: p.swatch }"
                  />
                  <span class="flex-1 text-left">{{ p.label }}</span>
                  <UIcon
                    v-if="palette === p.id"
                    name="i-lucide-check"
                    class="size-3.5"
                  />
                </button>
              </div>
            </div>
          </div>
        </template>
      </UPopover>
    </div>
  </header>
</template>
