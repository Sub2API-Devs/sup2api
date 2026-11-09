<script setup lang="ts">
// A table row action: a short word on a small button (secondary xs; `tone`
// danger / info turns the word red / blue), so every action reads at a
// glance: the console's row actions are words, not icons. Inside an STable
// phone card (TABLE_CARD) it is a small ghost button instead. `icon` is
// declared and not drawn (UI 3.7): undeclared, it would fall through to
// SButton's own `icon` and draw again. Plugins whose hostUICompat is below
// 3.7 still pass it, so older hosts keep their icon. `loading` shows a
// spinner before the label. Attrs (aria-haspopup, data-testid, ...) go to
// the <button>.
import { inject } from 'vue'
import SButton from './SButton.vue'
import { TABLE_CARD } from './tableCard'

withDefaults(
  defineProps<{
    label: string
    icon?: string
    tone?: 'default' | 'danger' | 'info'
    disabled?: boolean
    loading?: boolean
    title?: string
  }>(),
  { tone: 'default' }
)
defineEmits<{ (e: 'click', ev: MouseEvent): void }>()
const inCard = inject(TABLE_CARD, false)
</script>

<template>
  <SButton
    :variant="inCard ? 'ghost' : 'secondary'"
    :size="inCard ? 'sm' : 'xs'"
    :tone="tone"
    :disabled="disabled"
    :loading="loading"
    :title="title || label"
    @click.stop="$emit('click', $event)"
  >
    {{ label }}
  </SButton>
</template>
