<script setup lang="ts">
// Column picker status: how many columns show, "Saving…", and a sync failure
// with Retry (`menu`: Retry is an item of the dropdown menu). Internal to
// STableColumnSettings.
import SButton from '../SButton.vue'
import { useUiT } from '../i18n'
import type { TableColumnState } from '../tableColumns'

defineProps<{ state: TableColumnState; menu?: boolean }>()
const t = useUiT()
</script>

<template>
  {{ t('ui.visibleColumns', { visible: state.visibleColumns.value.length, total: state.columns.value.length }) }}
  <span v-if="state.saving.value" role="status" class="ms-2">{{ t('ui.savingColumns') }}</span>
  <div v-if="state.error.value" class="mt-1 flex items-center gap-1">
    <span role="alert" class="text-red-600">{{ t('ui.columnStorageFailed') }}</span>
    <SButton
      size="sm"
      variant="ghost"
      :role="menu ? 'menuitem' : undefined"
      :tabindex="menu ? -1 : undefined"
      :disabled="state.saving.value"
      @click="state.retry()"
    >
      {{ t('ui.retry') }}
    </SButton>
  </div>
</template>
