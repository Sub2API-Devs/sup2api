<script setup lang="ts">
// Tooltip on hover and keyboard focus of the default slot (wrapped in an
// inline <span>). Text from `content` or #content; teleported to <body>,
// placed `placement` (top) and flipped when there is no room; shown after
// `delay` ms (300); Escape hides it. The trigger gets aria-describedby
// pointing at the tooltip while it is shown. `disabled` (or no content)
// renders only the slot.
import { nextTick, onBeforeUnmount, ref, useId, useSlots, computed } from 'vue'
import { useFloating, type Placement } from './floating'

const props = withDefaults(defineProps<{ content?: string; placement?: Placement; delay?: number; disabled?: boolean; maxWidth?: string }>(), {
  placement: 'top',
  delay: 300,
  maxWidth: '20rem'
})
const slots = useSlots()
const anchor = ref<HTMLElement>()
const tip = ref<HTMLElement>()
const shown = ref(false)
const id = useId()
const active = computed(() => !props.disabled && (!!props.content || !!slots.content))
const floating = useFloating(anchor, tip, { placement: props.placement, align: 'center', offset: 6, onLost: () => hide() })
let timer: ReturnType<typeof setTimeout> | null = null

function show(immediate = false) {
  if (!active.value) return
  if (timer) clearTimeout(timer)
  const open = () => {
    shown.value = true
    nextTick(() => floating.start())
  }
  if (immediate || props.delay <= 0) open()
  else timer = setTimeout(open, props.delay)
}
function hide() {
  if (timer) clearTimeout(timer)
  timer = null
  shown.value = false
  floating.stop()
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && shown.value) {
    e.stopPropagation()
    hide()
  }
}
onBeforeUnmount(hide)
</script>

<template>
  <span
    ref="anchor"
    class="inline-flex max-w-full"
    :aria-describedby="shown ? id : undefined"
    @mouseenter="show()"
    @mouseleave="hide"
    @focusin="show(true)"
    @focusout="hide"
    @keydown="onKey"
  >
    <slot />
    <Teleport to="body">
      <div
        v-if="shown"
        :id="id"
        ref="tip"
        role="tooltip"
        class="pointer-events-none fixed z-popover whitespace-pre-line break-words rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs leading-5 text-white shadow-popover dark:bg-dark-600"
        :style="{ ...floating.style.value, maxWidth }"
      >
        <slot name="content">{{ content }}</slot>
      </div>
    </Teleport>
  </span>
</template>
