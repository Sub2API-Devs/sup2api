<script setup lang="ts">
// Progress bar (role="progressbar"). `value` of `max` (100); `tone` colours
// the bar (primary); `size` sm 6px / md 10px; `label` names it (shown above
// with `showValue` as a percentage on the right); `indeterminate` animates
// without a value.
import { computed } from 'vue'
import { TONE_FILL, toneOf } from './tones'
import type { StatusTone } from './types'

const props = withDefaults(
  defineProps<{ value?: number | null; max?: number; tone?: StatusTone; size?: 'sm' | 'md'; label?: string; showValue?: boolean; indeterminate?: boolean }>(),
  { value: 0, max: 100, tone: 'primary', size: 'sm' }
)
const pct = computed(() => {
  const m = props.max > 0 ? props.max : 100
  return Math.min(100, Math.max(0, ((props.value ?? 0) / m) * 100))
})
const fill = computed(() => TONE_FILL[toneOf(props.tone)])
</script>

<template>
  <div class="w-full">
    <div v-if="label || showValue || $slots.default" class="mb-1.5 flex items-center justify-between gap-2 text-xs text-fg-muted">
      <span class="truncate"><slot>{{ label }}</slot></span>
      <span v-if="showValue && !indeterminate" class="shrink-0 tabular-nums">{{ Math.round(pct) }}%</span>
    </div>
    <div
      role="progressbar"
      :aria-label="label"
      aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuenow="indeterminate ? undefined : (value ?? 0)"
      class="relative overflow-hidden rounded-full bg-gray-100 dark:bg-dark-700"
      :class="size === 'md' ? 'h-2.5' : 'h-1.5'"
    >
      <div v-if="indeterminate" class="s-progress-indeterminate absolute inset-y-0 w-1/3 rounded-full" :class="fill" />
      <div v-else class="h-full rounded-full transition-all duration-300" :class="fill" :style="{ width: pct + '%' }" />
    </div>
  </div>
</template>

<style scoped>
.s-progress-indeterminate {
  animation: s-progress 1.2s ease-in-out infinite;
}
@keyframes s-progress {
  0% {
    left: -33%;
  }
  100% {
    left: 100%;
  }
}
</style>
