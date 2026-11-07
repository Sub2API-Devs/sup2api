<script setup lang="ts">
// Drag handle of an STable row or card: pointer drag and Up / Down / Home /
// End through the table's useTableReorder; `describedby` points at the usage
// help. Internal to STable.
import SIcon from '../SIcon.vue'
import { useUiT } from '../i18n'
import type { TableReorder } from '../tableReorder'

defineProps<{ index: number; reorder: TableReorder; describedby: string }>()
const t = useUiT()
</script>

<template>
  <button
    type="button"
    class="s-table-reorder-handle rounded p-1.5 text-fg-muted hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-40"
    :data-reorder-handle="index"
    :disabled="!reorder.enabled.value"
    :aria-label="t('ui.reorderRow', { n: index + 1 })"
    :aria-describedby="describedby"
    @pointerdown.stop="reorder.pointerDown($event, index)"
    @keydown.stop="reorder.keyDown($event, index)"
    @dragstart.prevent
  >
    <SIcon name="grip-vertical" class="h-4 w-4" />
  </button>
</template>

<style scoped>
.s-table-reorder-handle {
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.s-table-reorder-handle:active {
  cursor: grabbing;
}
.s-table-reorder-handle:disabled {
  cursor: not-allowed;
}
@media (pointer: coarse) {
  .s-table-reorder-handle {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
