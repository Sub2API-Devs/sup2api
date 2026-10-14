<script setup lang="ts">
// A longer explanation behind a small toggle ("Details" / "Hide details",
// or `label`). Closed by default.
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{ label?: string }>()
const { t } = useI18n()
const open = ref(false)
</script>

<template>
  <div>
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded text-xs font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:text-primary-400 dark:hover:text-primary-300"
      :aria-expanded="open"
      @click="open = !open"
    >
      {{ open ? t('ui.lessDetails') : label || t('ui.moreDetails') }}
      <svg class="h-3.5 w-3.5 transition-transform duration-150" :class="open ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" /></svg>
    </button>
    <div v-if="open" class="mt-2 max-w-3xl rounded-lg bg-surface-2 px-3 py-2.5 text-xs leading-5 text-fg-muted">
      <slot />
    </div>
  </div>
</template>
