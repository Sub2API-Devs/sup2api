<script setup lang="ts">
// Small helper text. `tone` picks the colour; `inline` renders a <span>;
// `size` is sm (text-sm) or xs (text-xs, for `muted text-xs` / `text-[11px]` leftovers).
withDefaults(
  defineProps<{ tone?: 'muted' | 'danger' | 'success' | 'warning'; inline?: boolean; size?: 'xs' | 'sm' }>(),
  { tone: 'muted', size: 'sm' }
)

const TONE: Record<string, string> = {
  muted: 'muted',
  danger: 'text-red-600 dark:text-red-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400'
}
</script>

<template>
  <component :is="inline ? 'span' : 'p'" :class="[size === 'xs' ? 'text-xs' : 'text-sm', TONE[tone]]"><slot /></component>
</template>
