<script setup lang="ts">
// Phone form of SBulkBar while rows are selected: a bar fixed to the bottom
// of the screen (clear of the home indicator) with the selection count as a
// menu (select this page / select all N / clear) on the left and the action
// buttons (default slot) on the right.
import { computed } from 'vue'
import { useUiT } from '../i18n'
import type { MenuAction } from '../types'
import SButton from '../SButton.vue'
import SDropdown from '../SDropdown.vue'

const props = defineProps<{
  count: number
  total: number
  pageSelected?: boolean
  allSelected?: boolean
  selectingAll?: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{ (e: 'select-page'): void; (e: 'select-all'): void; (e: 'clear'): void }>()
const t = useUiT()
const label = computed(() => (props.allSelected ? t('ui.bulkSelectedAll', { n: props.count }) : t('ui.bulkSelected', { n: props.count })))
const actions = computed<MenuAction[]>(() => [
  { key: 'select-page', label: t('ui.bulkSelectPage'), hidden: props.pageSelected, disabled: props.disabled },
  {
    key: 'select-all',
    label: props.selectingAll ? t('ui.bulkSelectingAll') : t('ui.bulkSelectAll', { n: props.total }),
    hidden: props.allSelected || props.total <= props.count,
    disabled: props.disabled || props.selectingAll
  },
  { key: 'clear', label: t('ui.bulkClear'), disabled: props.disabled }
])
function pick(key: string) {
  if (key === 'select-page') emit('select-page')
  else if (key === 'select-all') emit('select-all')
  else emit('clear')
}
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-line bg-surface px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-modal"
    role="region"
    :aria-label="label"
  >
    <SDropdown :actions="actions" align="start" width="14rem" @select="pick">
      <template #trigger="{ toggle, attrs }">
        <SButton
          variant="ghost"
          icon-right="chevron-down"
          class="shrink-0 !text-primary-700 dark:!text-primary-300"
          data-testid="bulk-menu"
          v-bind="attrs"
          @click.stop="toggle"
        >
          <span aria-live="polite">{{ label }}</span>
        </SButton>
      </template>
    </SDropdown>
    <div class="ms-auto flex min-w-0 items-center gap-2 overflow-x-auto"><slot /></div>
  </div>
</template>
