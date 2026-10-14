<script setup lang="ts">
// Content behind a toggle. variant "inline" (default): a small
// "Details" / "Hide details" link (`label` / `openLabel` replace the texts)
// above a tinted explanation block. variant "section": a full-width header
// (`label` or #title, optional `description`) with a chevron, for collapsible
// blocks of a page or form. `open` supports v-model:open; uncontrolled
// (closed, or `defaultOpen`) without it.
import { computed, ref, useId } from 'vue'
import { useUiT } from './i18n'
import SIcon from './SIcon.vue'

const props = withDefaults(
  defineProps<{
    label?: string
    openLabel?: string
    open?: boolean
    defaultOpen?: boolean
    variant?: 'inline' | 'section'
    description?: string
  }>(),
  { open: undefined, variant: 'inline' }
)
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
const t = useUiT()
const inner = ref(!!props.defaultOpen)
const isOpen = computed(() => props.open ?? inner.value)
const panelId = useId()

function toggle() {
  const v = !isOpen.value
  inner.value = v
  emit('update:open', v)
}
</script>

<template>
  <div v-if="variant === 'section'">
    <button
      type="button"
      class="flex w-full items-start justify-between gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      @click="toggle"
    >
      <span class="min-w-0">
        <span class="block text-sm font-semibold text-fg"><slot name="title">{{ label }}</slot></span>
        <span v-if="description" class="mt-0.5 block text-xs leading-5 text-fg-muted">{{ description }}</span>
      </span>
      <SIcon name="chevron-down" class="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-150" :class="isOpen ? 'rotate-180' : ''" />
    </button>
    <div v-if="isOpen" :id="panelId" class="mt-3">
      <slot />
    </div>
  </div>
  <div v-else>
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded text-xs font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:text-primary-400 dark:hover:text-primary-300"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      @click="toggle"
    >
      {{ isOpen ? openLabel || t('ui.lessDetails') : label || t('ui.moreDetails') }}
      <SIcon name="chevron-down" class="h-3.5 w-3.5 transition-transform duration-150" :class="isOpen ? 'rotate-180' : ''" />
    </button>
    <div v-if="isOpen" :id="panelId" class="mt-2 max-w-3xl rounded-lg bg-surface-2 px-3 py-2.5 text-xs leading-5 text-fg-muted">
      <slot />
    </div>
  </div>
</template>
