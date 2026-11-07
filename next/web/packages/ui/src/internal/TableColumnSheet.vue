<script setup lang="ts">
// Phone form of STableColumnSettings: a "Fields" button opening a bottom
// sheet with one 44px checkbox row per column and Restore defaults.
// Internal to STableColumnSettings.
import { ref } from 'vue'
import SButton from '../SButton.vue'
import SCheckbox from '../SCheckbox.vue'
import SDrawer from '../SDrawer.vue'
import { useUiT } from '../i18n'
import type { TableColumnState } from '../tableColumns'
import TableColumnStatus from './TableColumnStatus.vue'

defineProps<{ state: TableColumnState }>()
const t = useUiT()
const open = ref(false)
</script>

<template>
  <div>
    <SButton
      size="sm"
      icon="settings"
      :loading="state.loading.value"
      aria-haspopup="dialog"
      :aria-expanded="open"
      data-testid="table-column-settings"
      @click="open = true"
    >
      {{ t('ui.columnFields') }}
    </SButton>
    <SDrawer v-model:open="open" side="bottom" :title="t('ui.columnFields')">
      <div class="text-xs text-fg-muted"><TableColumnStatus :state="state" /></div>
      <ul role="list" class="mt-2 divide-y divide-line">
        <li v-for="c in state.columns.value" :key="c.key">
          <SCheckbox
            class="min-h-11 w-full"
            :model-value="state.isVisible(c.key)"
            :disabled="!state.canToggle(c.key)"
            :label="c.label"
            @update:model-value="state.setVisible(c.key, $event)"
          />
        </li>
      </ul>
      <template #footer>
        <SButton variant="ghost" icon="refresh" @click="state.reset()">{{ t('ui.resetColumns') }}</SButton>
      </template>
    </SDrawer>
  </div>
</template>
