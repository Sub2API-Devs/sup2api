<script setup lang="ts">
// Read-only label / value list (details panels; replaces the console's .kv
// class for plugins). Either `items` ({key, label, value?, mono?, copyable?,
// full?}; slot `item-<key>` replaces a value, slot props {item, value}) or
// SDescItem children in the default slot. `columns` 1 (default) or 2 from
// sm: up; `labelWidth` the label column (8rem); `dense` tighter rows;
// `stacked` puts labels above values; `divided` draws lines between rows.
import { computed, provide } from 'vue'
import SDescItem from './SDescItem.vue'
import { DESC_KEY } from './descriptions'
import type { DescItem } from './types'

const props = withDefaults(defineProps<{ items?: DescItem[]; columns?: 1 | 2 | 3; labelWidth?: string; dense?: boolean; stacked?: boolean; divided?: boolean }>(), {
  items: () => [],
  columns: 1,
  labelWidth: '8rem'
})
provide(DESC_KEY, {
  labelWidth: computed(() => props.labelWidth),
  dense: computed(() => !!props.dense),
  stacked: computed(() => !!props.stacked)
})
const COLS: Record<number, string> = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' }
</script>

<template>
  <dl class="grid grid-cols-1 gap-x-8" :class="[COLS[columns], divided ? 'divide-y divide-line sm:divide-y-0' : '']">
    <SDescItem v-for="it in items" :key="it.key" :label="it.label" :value="it.value" :mono="it.mono" :copyable="it.copyable" :full="it.full">
      <slot v-if="$slots[`item-${it.key}`]" :name="`item-${it.key}`" :item="it" :value="it.value" />
    </SDescItem>
    <slot />
  </dl>
</template>
