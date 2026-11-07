<script setup lang="ts">
// Side panel teleported to <body> (details next to a list, long forms), or
// with `side` bottom a bottom sheet (phone menus, pickers, short forms): full
// width, at most 92% of the screen high, clear of the home indicator, closed
// by swiping it down. On phones a left / right panel becomes a full-screen
// page sliding in from the right, with a back arrow instead of the ×.
// Shares the modal layer stack with SModal: Escape closes only the topmost
// layer, Tab stays inside, page scroll is locked, focus moves in and back.
// `side` right (default) / left / bottom; `width` sm 24rem, md 32rem
// (default), lg 42rem, xl 56rem or any CSS width (ignored by a bottom sheet). `persistent`: Escape and the backdrop
// do not close it; `closable` = false hides the × (and implies persistent).
import { computed } from 'vue'
import OverlaySurface from './internal/OverlaySurface.vue'
import { useViewport } from './viewport'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    side?: 'right' | 'left' | 'bottom'
    width?: 'sm' | 'md' | 'lg' | 'xl' | string
    closable?: boolean
    persistent?: boolean
  }>(),
  { side: 'right', width: 'md', closable: true }
)
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'close'): void }>()
const { compact } = useViewport()
const form = computed(() => (props.side === 'bottom' ? 'sheet' : compact.value ? 'page' : props.side))
</script>

<template>
  <OverlaySurface
    :open="open"
    :form="form"
    :title="title"
    :description="description"
    :width="width"
    :closable="closable"
    :persistent="persistent"
    @update:open="emit('update:open', $event)"
    @close="emit('close')"
  >
    <template v-if="$slots.header" #header><slot name="header" /></template>
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </OverlaySurface>
</template>
