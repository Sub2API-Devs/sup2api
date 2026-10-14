<script setup lang="ts">
// Compact label with a border. Static by default; `pressed` (true / false)
// makes it a toggle button (filter chips: aria-pressed, click emits
// `update:pressed` and `click`); `clickable` makes it a plain button.
// `closable` adds a × that emits `close` (`closeLabel` names it, default
// "Remove"). `tone` colours it (neutral); `icon` is an SIcon name before
// the text; `size` sm (default) / xs.
import { computed } from 'vue'
import SIcon from './SIcon.vue'
import { useUiT } from './i18n'
import { TONE_CHIP, toneOf } from './tones'
import type { StatusTone } from './types'

const props = withDefaults(
  defineProps<{ tone?: StatusTone; closable?: boolean; closeLabel?: string; pressed?: boolean; clickable?: boolean; icon?: string; size?: 'xs' | 'sm'; disabled?: boolean }>(),
  { tone: 'neutral', pressed: undefined, size: 'sm' }
)
const emit = defineEmits<{ (e: 'close'): void; (e: 'click', ev: MouseEvent): void; (e: 'update:pressed', v: boolean): void }>()
const t = useUiT()
const interactive = computed(() => props.clickable || props.pressed !== undefined)
const cls = computed(() => [
  'inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border font-medium transition-colors',
  props.size === 'xs' ? 'h-5 px-2 text-xxs' : 'h-7 px-2.5 text-xs',
  props.pressed === true ? 'border-primary-500 bg-primary-500 text-white dark:border-primary-500' : TONE_CHIP[toneOf(props.tone)],
  interactive.value && !props.disabled ? 'cursor-pointer hover:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40' : '',
  props.disabled ? 'cursor-not-allowed opacity-50' : ''
])
function onClick(e: MouseEvent) {
  if (props.disabled) return
  if (props.pressed !== undefined) emit('update:pressed', !props.pressed)
  emit('click', e)
}
</script>

<template>
  <span v-if="!interactive" :class="cls">
    <SIcon v-if="icon" :name="icon" class="h-3.5 w-3.5 shrink-0" />
    <span class="truncate"><slot /></span>
    <button
      v-if="closable"
      type="button"
      class="-mr-1 shrink-0 rounded-full p-0.5 opacity-60 hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-current disabled:cursor-not-allowed"
      :disabled="disabled"
      :aria-label="closeLabel || t('ui.remove')"
      @click.stop="emit('close')"
    >
      <SIcon name="x" class="h-3 w-3" />
    </button>
  </span>
  <span v-else class="inline-flex max-w-full items-center">
    <button type="button" :class="cls" :disabled="disabled" :aria-pressed="pressed === undefined ? undefined : pressed" @click="onClick">
      <SIcon v-if="icon" :name="icon" class="h-3.5 w-3.5 shrink-0" />
      <span class="truncate"><slot /></span>
    </button>
    <button
      v-if="closable"
      type="button"
      class="ml-0.5 shrink-0 rounded-full p-0.5 text-fg-subtle hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
      :disabled="disabled"
      :aria-label="closeLabel || t('ui.remove')"
      @click.stop="emit('close')"
    >
      <SIcon name="x" class="h-3 w-3" />
    </button>
  </span>
</template>
