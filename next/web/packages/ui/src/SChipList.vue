<script setup lang="ts">
// A one-line list of chips for a table cell: the first `max` (2) items as
// SChips, the rest folded into a "+N" chip whose tooltip (hover or keyboard
// focus) shows every item, wrapping. The list itself never wraps. `size`
// xs (default) / sm; an item's `tone` colours it, `title` is its native tooltip.
import { computed } from 'vue'
import SChip from './SChip.vue'
import STooltip from './STooltip.vue'
import type { ChipListItem } from './types'

const props = withDefaults(defineProps<{ items: ChipListItem[]; max?: number; size?: 'xs' | 'sm' }>(), { max: 2, size: 'xs' })
const shown = computed(() => props.items.slice(0, Math.max(0, props.max)))
const rest = computed(() => props.items.length - shown.value.length)
</script>

<template>
  <span v-if="items.length" class="inline-flex max-w-full items-center gap-1 whitespace-nowrap" data-testid="chip-list">
    <SChip v-for="item in shown" :key="item.key" :size="size" :tone="item.tone" :title="item.title" class="min-w-0">{{ item.label }}</SChip>
    <STooltip v-if="rest > 0" variant="card" class="shrink-0">
      <SChip :size="size" tabindex="0" class="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40" data-testid="chip-list-more">+{{ rest }}</SChip>
      <template #content>
        <span class="flex flex-wrap gap-1 whitespace-normal">
          <SChip v-for="item in items" :key="item.key" :size="size" :tone="item.tone">{{ item.label }}</SChip>
        </span>
      </template>
    </STooltip>
  </span>
</template>
