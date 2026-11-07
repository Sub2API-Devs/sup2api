<script setup lang="ts">
// Dialog teleported to <body>. Open modals and drawers form a stack: only
// the topmost one closes on Escape, Tab stays inside it, the page behind does
// not scroll, focus moves in on open ([data-autofocus] / [autofocus], else
// the first focusable control of the body, else the dialog) and returns to
// the opener on close. `persistent`: Escape and the backdrop do not close it
// (the × still does). `closable` = false hides the × and also implies
// persistent (the parent closes it). `top` stacks it above everything else
// (confirmations asked from inside a modal; later modals stack above earlier
// ones anyway).
// `mobile` is its form on phones: `sheet` a bottom sheet, `fullscreen` a
// full-height page, `center` the floating dialog of wide screens; `auto`
// (default) is a sheet for width sm / md and a page for lg and wider. The
// footer stays at the bottom, clear of the home indicator, and the
// browser Back button closes it.
import { computed } from 'vue'
import OverlaySurface from './internal/OverlaySurface.vue'
import { useViewport } from './viewport'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
    closable?: boolean
    persistent?: boolean
    /** Stacks above other open modals (confirmations asked from inside a modal). */
    top?: boolean
    /** Accessible description: id of an element inside the body. */
    describedby?: string
    /** Form on phones (compact viewport). */
    mobile?: 'auto' | 'sheet' | 'fullscreen' | 'center'
  }>(),
  { width: 'md', closable: true, mobile: 'auto' }
)
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'close'): void }>()
const { compact } = useViewport()
const form = computed(() => {
  if (!compact.value) return 'center'
  if (props.mobile !== 'auto') return props.mobile
  return props.width === 'sm' || props.width === 'md' ? 'sheet' : 'fullscreen'
})
</script>

<template>
  <OverlaySurface
    :open="open"
    :form="form"
    :title="title"
    :width="width"
    :closable="closable"
    :persistent="persistent"
    :top="top"
    :describedby="describedby"
    @update:open="emit('update:open', $event)"
    @close="emit('close')"
  >
    <template v-if="$slots.header" #header><slot name="header" /></template>
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </OverlaySurface>
</template>
