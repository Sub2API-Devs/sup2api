<script setup lang="ts">
import { SButton } from '@sub2api/ui'
import { useDwHost } from './host'

// Move up / down (the order of rules and strategies is meaningful), copy and
// remove buttons of an item at `index` among `count`.
defineProps<{ index: number; count: number }>()
const emit = defineEmits<{ (e: 'move', by: number): void; (e: 'duplicate'): void; (e: 'remove'): void }>()
const t = useDwHost().t
</script>

<template>
  <div class="dw-end dw-item-actions">
    <SButton class="dw-up" size="sm" variant="ghost" icon="chevron-down" icon-only :aria-label="t('item.up')" :title="t('item.up')" :disabled="index === 0" @click="emit('move', -1)" />
    <SButton size="sm" variant="ghost" icon="chevron-down" icon-only :aria-label="t('item.down')" :title="t('item.down')" :disabled="index >= count - 1" @click="emit('move', 1)" />
    <SButton size="sm" variant="ghost" icon="copy" icon-only :aria-label="t('item.duplicate')" :title="t('item.duplicate')" @click="emit('duplicate')" />
    <SButton size="sm" variant="ghost" icon="trash" icon-only :aria-label="t('remove')" :title="t('remove')" @click="emit('remove')" />
  </div>
</template>
