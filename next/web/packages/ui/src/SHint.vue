<script setup lang="ts">
// Small helper text. `tone` picks the colour; `inline` renders a <span>;
// `size` is sm (text-sm) or xs (text-xs, for `muted text-xs` / `text-[11px]` leftovers).
import { TONE_TEXT } from './tones'

withDefaults(
  defineProps<{ tone?: 'muted' | 'danger' | 'success' | 'warning'; inline?: boolean; size?: 'xs' | 'sm' }>(),
  { tone: 'muted', size: 'sm' }
)
</script>

<template>
  <component :is="inline ? 'span' : 'p'" :class="[size === 'xs' ? 'text-xs' : 'text-sm', tone === 'muted' ? 'muted' : TONE_TEXT[tone]]"><slot /></component>
</template>
