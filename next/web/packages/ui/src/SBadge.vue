<script setup lang="ts">
// Pill label. `tone` picks the colour (purple = accent); `size` xs is the
// compact table-cell variant.
import type { Tone } from './types'
withDefaults(defineProps<{ tone?: Tone; dot?: boolean; size?: 'xs' | 'sm' }>(), { tone: 'gray', size: 'sm' })
</script>

<template>
  <span class="badge" :class="[`badge-${tone}`, size === 'xs' ? 'badge-xs' : '']">
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full bg-current" />
    <slot />
  </span>
</template>
