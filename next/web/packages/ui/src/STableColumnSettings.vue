<script setup lang="ts">
// Column picker of a useTableColumns() state: a menu of column checkboxes and
// Restore defaults; on a phone (useViewport compact) a "Fields" bottom sheet.
import { computed } from 'vue'
import SButton from './SButton.vue'
import SDropdown from './SDropdown.vue'
import { useUiT } from './i18n'
import type { MenuAction } from './types'
import type { TableColumnState } from './tableColumns'
import { useViewport } from './viewport'
import TableColumnSheet from './internal/TableColumnSheet.vue'
import TableColumnStatus from './internal/TableColumnStatus.vue'

const props = defineProps<{ state: TableColumnState }>()
const t = useUiT()
const { compact } = useViewport()
const actions = computed<MenuAction[]>(() => [
  ...props.state.columns.value.map(column => ({
    key: `column:${column.key}`,
    label: column.label,
    checked: props.state.isVisible(column.key),
    disabled: !props.state.canToggle(column.key)
  })),
  { key: 'reset', label: t('ui.resetColumns'), divider: true, icon: 'refresh' }
])
function select(key: string) {
  if (key === 'reset') props.state.reset()
  else {
    const column = key.slice('column:'.length)
    props.state.setVisible(column, !props.state.isVisible(column))
  }
}
</script>

<template>
  <TableColumnSheet v-if="compact" :state="state" />
  <SDropdown v-else :actions="actions" :close-on-select="false" width="15rem" max-height="min(24rem, calc(100vh - 1rem))" @select="select">
    <template #trigger="{ attrs, toggle }">
      <SButton v-bind="attrs" size="sm" icon="settings" :loading="state.loading.value" data-testid="table-column-settings" @click="toggle">
        {{ t('ui.columnSettings') }}
      </SButton>
    </template>
    <template #header><TableColumnStatus :state="state" menu /></template>
  </SDropdown>
</template>
