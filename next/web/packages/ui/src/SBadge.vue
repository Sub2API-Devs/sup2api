<script setup lang="ts">
// Pill label. `tone` picks the colour (neutral = gray, purple = accent); `size` xs is the
// compact table-cell variant. Literal class names so Tailwind keeps them.
import type { Tone } from './types'
withDefaults(defineProps<{ tone?: Tone; dot?: boolean; size?: 'xs' | 'sm' }>(), { tone: 'gray', size: 'sm' })
const TONE: Record<Tone, string> = {
  primary: 'badge-primary',
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  gray: 'badge-gray',
  neutral: 'badge-gray',
  accent: 'badge-accent',
  purple: 'badge-purple'
}
</script>

<template>
  <span class="badge" :class="[TONE[tone], size === 'xs' ? 'badge-xs' : '']">
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full bg-current" />
    <slot />
  </span>
</template>
