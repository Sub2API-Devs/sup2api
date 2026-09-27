<script setup lang="ts">
// Flex stack, vertical by default. Every option maps to a literal class so
// Tailwind generates it.
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    direction?: 'row' | 'col'
    gap?: 1 | 2 | 3 | 4 | 6
    align?: 'start' | 'center' | 'end' | 'stretch'
    justify?: 'start' | 'between' | 'end'
    wrap?: boolean
  }>(),
  { direction: 'col', gap: 3 }
)

const GAP: Record<number, string> = { 1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 6: 'gap-6' }
const ALIGN: Record<string, string> = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' }
const JUSTIFY: Record<string, string> = { start: 'justify-start', between: 'justify-between', end: 'justify-end' }

const cls = computed(() => [
  props.direction === 'row' ? 'flex-row' : 'flex-col',
  GAP[props.gap] ?? 'gap-3',
  props.align ? ALIGN[props.align] : '',
  props.justify ? JUSTIFY[props.justify] : '',
  props.wrap ? 'flex-wrap' : ''
])
</script>

<template>
  <div class="flex" :class="cls"><slot /></div>
</template>
