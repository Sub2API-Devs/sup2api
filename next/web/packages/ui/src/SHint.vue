<script setup lang="ts">
// Small helper text. `tone` picks the colour; `inline` renders a <span>.
withDefaults(defineProps<{ tone?: 'muted' | 'danger' | 'success' | 'warning'; inline?: boolean }>(), { tone: 'muted' })

const TONE: Record<string, string> = {
  muted: 'muted',
  danger: 'text-red-600 dark:text-red-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400'
}
</script>

<template>
  <component :is="inline ? 'span' : 'p'" class="text-sm" :class="TONE[tone]"><slot /></component>
</template>
