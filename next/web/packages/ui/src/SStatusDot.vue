<script setup lang="ts">
// Coloured status dot with an optional label (online / degraded / down).
// `pulse` animates a halo (live / in progress). Without a visible label,
// pass `label` with `srOnly` so it is still announced. `size` xs is the
// compact variant (text-xs), md a larger dot.
import { computed } from 'vue'
import { TONE_FILL, toneOf } from './tones'
import type { StatusTone } from './types'

const props = withDefaults(defineProps<{ tone?: StatusTone | 'error' | 'gray'; pulse?: boolean; label?: string; srOnly?: boolean; size?: 'xs' | 'sm' | 'md' }>(), { tone: 'neutral', size: 'sm' })
const fill = computed(() => TONE_FILL[toneOf(props.tone)])
const SIZE = { xs: { root: 'text-xs', dot: 'h-2 w-2' }, sm: { root: 'text-sm', dot: 'h-2 w-2' }, md: { root: 'text-sm', dot: 'h-2.5 w-2.5' } }
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-fg" :class="SIZE[size].root">
    <span class="relative inline-flex shrink-0" :class="SIZE[size].dot" aria-hidden="true">
      <span v-if="pulse" class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" :class="fill" />
      <span class="relative inline-flex h-full w-full rounded-full" :class="fill" />
    </span>
    <span v-if="label || $slots.default" :class="srOnly ? 'sr-only' : ''"><slot>{{ label }}</slot></span>
  </span>
</template>
