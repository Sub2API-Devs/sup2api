<script setup lang="ts">
// Bulk action bar above a selectable table: the selection count, "select
// this page", "select all N results" (across pages; the caller loads the
// keys), "clear" and the action buttons (default slot). `count` is the number
// of selected rows, `total` the number of results matching the filters,
// `pageSelected` whether every selectable row of the current page is in the
// selection, `allSelected` whether the selection is the whole result set.
// Hidden while nothing is selected unless `persistent`; the #idle slot then
// replaces the count (e.g. a hint).
import { useUiT } from './i18n'
import SLink from './SLink.vue'

withDefaults(
  defineProps<{
    count: number
    total?: number
    pageSelected?: boolean
    allSelected?: boolean
    selectingAll?: boolean
    disabled?: boolean
    persistent?: boolean
  }>(),
  { total: 0 }
)
const emit = defineEmits<{ (e: 'select-page'): void; (e: 'select-all'): void; (e: 'clear'): void }>()
const t = useUiT()
</script>

<template>
  <div
    v-if="count > 0 || persistent"
    class="s-bulk-bar flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-1 text-xs"
    :class="count > 0 ? 'border-primary-200 bg-primary-50/70 dark:border-primary-800 dark:bg-primary-900/20' : 'border-line bg-surface'"
    role="region"
    :aria-label="t('ui.bulkSelected', { n: count })"
  >
    <template v-if="count > 0">
      <span class="font-semibold text-primary-800 dark:text-primary-200" aria-live="polite">{{ allSelected ? t('ui.bulkSelectedAll', { n: count }) : t('ui.bulkSelected', { n: count }) }}</span>
      <SLink v-if="!pageSelected" as="button" :disabled="disabled" @click="emit('select-page')">{{ t('ui.bulkSelectPage') }}</SLink>
      <SLink v-if="!allSelected && total > count" as="button" :disabled="disabled || selectingAll" data-testid="bulk-select-all" @click="emit('select-all')">{{ selectingAll ? t('ui.bulkSelectingAll') : t('ui.bulkSelectAll', { n: total }) }}</SLink>
      <SLink as="button" :disabled="disabled" data-testid="bulk-clear" @click="emit('clear')">{{ t('ui.bulkClear') }}</SLink>
    </template>
    <span v-else class="text-fg-muted"><slot name="idle">{{ t('ui.bulkHint') }}</slot></span>
    <div class="ms-auto flex flex-wrap items-center gap-2"><slot /></div>
  </div>
</template>
