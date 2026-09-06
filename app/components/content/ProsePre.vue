<script setup lang="ts">
interface Props {
  code?: string
  language?: string
}

const props = defineProps<Props>()

const svg = ref('')
const failed = ref(false)
const expanded = ref(false)
const isMermaid = computed(() => props.language === 'mermaid')

let seq = 0

const render = async () => {
  if (!isMermaid.value || !props.code) return
  const mermaid = await loadMermaid(document.documentElement.classList.contains('dark'))
  if (!mermaid) {
    failed.value = true
    return
  }
  try {
    const { svg: out } = await mermaid.render(`mmd-${++seq}`, props.code)
    svg.value = out
    failed.value = false
  } catch {
    failed.value = true
  }
}

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') expanded.value = false
}

onMounted(() => {
  render()
  const observer = new MutationObserver(render)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => {
    observer.disconnect()
    window.removeEventListener('keydown', onKey)
  })
})

watch(expanded, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})
</script>

<template>
  <div
    v-if="isMermaid && svg && !failed"
    class="mermaid-figure"
  >
    <button
      class="mermaid-expand"
      title="Expand diagram"
      @click="expanded = true"
    >
      <UIcon
        name="i-lucide-maximize-2"
        class="size-3.5"
      />
    </button>
    <!-- eslint-disable vue/no-v-html -- mermaid emits its own sanitised SVG -->
    <div v-html="svg" />
    <!-- eslint-enable vue/no-v-html -->

    <Teleport to="body">
      <div
        v-if="expanded"
        class="mermaid-overlay"
        @click="expanded = false"
      >
        <button
          class="mermaid-close"
          title="Close"
        >
          <UIcon
            name="i-lucide-x"
            class="size-4"
          />
        </button>
        <!-- eslint-disable vue/no-v-html -- mermaid emits its own sanitised SVG -->
        <div
          class="mermaid-overlay-inner"
          @click.stop
          v-html="svg"
        />
        <!-- eslint-enable vue/no-v-html -->
      </div>
    </Teleport>
  </div>
  <pre
    v-else
    :class="$attrs.class"
  ><slot /></pre>
</template>
