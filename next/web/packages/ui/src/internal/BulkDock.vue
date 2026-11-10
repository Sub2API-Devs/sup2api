<script setup lang="ts">
// Phone form of SBulkBar while rows are selected: a bar fixed to the bottom
// of the screen (clear of the home indicator) with the selection `label` as
// a menu of `actions` on the left and the action buttons (default slot) on
// the right. A floating action button (SButton fab) is hidden meanwhile.
// Buttons that do not fit scroll sideways (the edge hiding more fades; the
// scrollbar shows only where a mouse needs it to reach them). A tap on a button only partly in view brings it into view instead
// of pressing it: the last one is usually the destructive one.
import { ref } from 'vue'
import type { MenuAction } from '../types'
import SButton from '../SButton.vue'
import SDropdown from '../SDropdown.vue'
import { isCutOff, scrollToCentre, useScrollFade } from '../scrollClip'

defineProps<{ label: string; actions: MenuAction[] }>()
const emit = defineEmits<{ (e: 'select', key: string): void }>()
const scroller = ref<HTMLElement>()
const row = ref<HTMLElement>()
const fade = useScrollFade(scroller, row)

// Keyboard presses (detail 0) pass: focus has already scrolled the button into view.
function reveal(e: MouseEvent) {
  const item = Array.from(row.value?.children ?? []).find(el => el.contains(e.target as Node))
  if (!e.detail || !scroller.value || !(item instanceof HTMLElement) || !isCutOff(scroller.value, item)) return
  e.preventDefault()
  e.stopPropagation()
  scrollToCentre(scroller.value, item, 'smooth')
}
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
    <!-- The padding (taken back by the margin) keeps the buttons' focus rings inside the scroller's clip. -->
    <div
      ref="scroller"
      class="relative -m-1 min-w-0 flex-1 overflow-x-auto p-1 touch:[scrollbar-width:none] touch:[&::-webkit-scrollbar]:hidden"
      :class="fade"
      @click.capture="reveal"
    >
      <div ref="row" class="ms-auto flex w-max items-center gap-2"><slot /></div>
    </div>
  </div>
</template>
