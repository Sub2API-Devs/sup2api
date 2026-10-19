<script setup lang="ts">
import { computed } from 'vue'
import SButton from './SButton.vue'
import SDropdown from './SDropdown.vue'
import { useUiT } from './i18n'
import type { MenuAction } from './types'
import type { TableColumnState } from './tableColumns'

const props = defineProps<{ state: TableColumnState }>()
const t = useUiT()
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
  <SDropdown :actions="actions" :close-on-select="false" width="15rem" max-height="min(24rem, calc(100vh - 1rem))" @select="select">
    <template #trigger="{ attrs, toggle }">
      <SButton v-bind="attrs" size="sm" icon="settings" :loading="state.loading.value" data-testid="table-column-settings" @click="toggle">
        {{ t('ui.columnSettings') }}
      </SButton>
    </template>
    <template #header>
      {{ t('ui.visibleColumns', { visible: state.visibleColumns.value.length, total: state.columns.value.length }) }}
      <span v-if="state.saving.value" role="status" class="ms-2">{{ t('ui.savingColumns') }}</span>
      <div v-if="state.error.value" class="mt-1 flex items-center gap-1">
        <span role="alert" class="text-red-600">{{ t('ui.columnStorageFailed') }}</span>
        <SButton size="sm" variant="ghost" role="menuitem" tabindex="-1" :disabled="state.saving.value" @click="state.retry()">{{ t('ui.retry') }}</SButton>
      </div>
    </template>
  </SDropdown>
</template>
