<script setup lang="ts">
// Phone form of SBulkBar while rows are selected: a bar fixed to the bottom
// of the screen (clear of the home indicator) with the selection `label` as
// a menu of `actions` on the left and the action buttons (default slot) on
// the right. It stacks above a floating action button (SButton fab).
import type { MenuAction } from '../types'
import SButton from '../SButton.vue'
import SDropdown from '../SDropdown.vue'

defineProps<{ label: string; actions: MenuAction[] }>()
const emit = defineEmits<{ (e: 'select', key: string): void }>()
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-line bg-surface px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-modal"
    role="region"
    :aria-label="label"
  >
    <SDropdown :actions="actions" align="start" width="14rem" @select="emit('select', $event)">
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
