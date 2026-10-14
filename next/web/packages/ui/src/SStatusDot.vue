<script setup lang="ts">
// Coloured status dot with an optional label (online / degraded / down).
// `pulse` animates a halo (live / in progress). Without a visible label,
// pass `label` with `srOnly` so it is still announced.
import { computed } from 'vue'
import { TONE_FILL, toneOf } from './tones'
import type { StatusTone } from './types'

const props = withDefaults(defineProps<{ tone?: StatusTone | 'error' | 'gray'; pulse?: boolean; label?: string; srOnly?: boolean; size?: 'sm' | 'md' }>(), { tone: 'neutral', size: 'sm' })
const fill = computed(() => TONE_FILL[toneOf(props.tone)])
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-sm text-fg">
    <span class="relative inline-flex shrink-0" :class="size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2'" aria-hidden="true">
      <span v-if="pulse" class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" :class="fill" />
      <span class="relative inline-flex h-full w-full rounded-full" :class="fill" />
    </span>
    <span v-if="label || $slots.default" :class="srOnly ? 'sr-only' : ''"><slot>{{ label }}</slot></span>
  </span>
</template>
