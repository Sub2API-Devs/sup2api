<script setup lang="ts">
// Bulk action bar above a selectable table: the selection count, "select
// this page", "select all N results" (across pages; the caller loads the
// keys), "clear" and the action buttons (default slot). `count` is the number
// of selected rows, `total` the number of results matching the filters,
// `pageSelected` whether every selectable row of the current page is in the
// selection, `allSelected` whether the selection is the whole result set.
// Hidden while nothing is selected unless `persistent`; the #idle slot then
// replaces the count (e.g. a hint).
// On a compact screen a selection shows as a bar fixed to the bottom of the
// screen: the count opens a menu with the select / clear choices, the action
// buttons sit on the right; the idle `persistent` strip is not shown there.
// The bar takes no room where the component stands (`contents`: the caller's
// margin classes are meant for the wide bar); its height is kept free at the
// end of the element holding it (see the style below), so place it beside
// the list it acts on.
import { computed } from 'vue'
import { useUiT } from './i18n'
import SLink from './SLink.vue'
import BulkDock from './internal/BulkDock.vue'
import type { MenuAction } from './types'
import { useViewport } from './viewport'

const props = withDefaults(
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
const { compact } = useViewport()
const label = computed(() => (props.allSelected ? t('ui.bulkSelectedAll', { n: props.count }) : t('ui.bulkSelected', { n: props.count })))
// The selection choices: links on a wide screen, the dock's menu on a compact one.
const choices = computed<MenuAction[]>(() =>
  [
    { key: 'select-page', label: t('ui.bulkSelectPage'), hidden: props.pageSelected, disabled: props.disabled },
    {
      key: 'select-all',
      label: props.selectingAll ? t('ui.bulkSelectingAll') : t('ui.bulkSelectAll', { n: props.total }),
      hidden: props.allSelected || props.total <= props.count,
      disabled: props.disabled || props.selectingAll
    },
    { key: 'clear', label: t('ui.bulkClear'), disabled: props.disabled }
  ].filter((a) => !a.hidden)
)
function choose(key: string) {
  if (key === 'select-page') emit('select-page')
  else if (key === 'select-all') emit('select-all')
  else emit('clear')
}
</script>

<template>
  <div v-if="compact && count > 0" class="contents" data-bulk-dock>
    <BulkDock :label="label" :actions="choices" @select="choose">
      <slot />
    </BulkDock>
  </div>
  <div
    v-else-if="!compact && (count > 0 || persistent)"
    class="s-bulk-bar flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-1 text-xs"
    :class="count > 0 ? 'border-primary-200 bg-primary-50/70 dark:border-primary-800 dark:bg-primary-900/20' : 'border-line bg-surface'"
    role="region"
    :aria-label="t('ui.bulkSelected', { n: count })"
  >
    <template v-if="count > 0">
      <span class="font-semibold text-primary-800 dark:text-primary-200" aria-live="polite">{{ label }}</span>
      <SLink v-for="a in choices" :key="a.key" as="button" :disabled="a.disabled" :data-testid="`bulk-${a.key}`" @click="choose(a.key)">{{ a.label }}</SLink>
    </template>
    <span v-else class="text-fg-muted"><slot name="idle">{{ t('ui.bulkHint') }}</slot></span>
    <div class="ms-auto flex flex-wrap items-center gap-2"><slot /></div>
  </div>
</template>

<style>
/* The docked bar covers the bottom of the screen. The element holding it ends
   with that much empty room, so its last rows and the pager can scroll clear. */
:has(> [data-bulk-dock])::after {
  content: '';
  display: block;
  flex: none;
  height: calc(4rem + env(safe-area-inset-bottom));
}
</style>
