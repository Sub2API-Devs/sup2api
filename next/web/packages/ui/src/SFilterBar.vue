<script setup lang="ts">
// Filter strip of a page or a chart area: the filter controls in the
// default slot, wrapping on narrow screens; `#end` content sits on the
// right (a time zone note, an export button). With @reset bound a Reset
// button appears, disabled only when `dirty` is passed as false (filters
// equal the defaults).
// `card` (default true) draws the card frame; false for a strip inside one.
// `#primary` holds the filters that stay in sight on a phone (a search box);
// on wide screens they come first, before the default slot. On a compact
// screen the default-slot filters fold behind a Filters button (badge
// `activeCount`, the number of filters off their default) that opens a
// bottom sheet with them, #end and Reset. Done in the sheet (or Enter in one
// of its fields) closes it and emits `done`: a page that applies a draft on
// Search applies it then.
// `#advanced` holds the less used filters: on a wide screen a "More filters"
// toggle after the default slot (badge `advancedCount`, the number of them in
// effect; highlighted while folded) shows them as a full-width grid under the
// row; v-model:advancedOpen controls it (kept inside, folded, when unbound).
// On a compact screen they follow the default slot in the sheet (count them
// in `activeCount`).
import { useViewport } from './viewport'
import FilterSheet from './internal/FilterSheet.vue'

withDefaults(
  defineProps<{ card?: boolean; dirty?: boolean; ariaLabel?: string; onReset?: () => void; activeCount?: number; advancedCount?: number }>(),
  {
    card: true,
    dirty: undefined,
    ariaLabel: undefined,
    onReset: undefined,
    activeCount: 0,
    advancedCount: 0
  }
)
const emit = defineEmits<{ done: [] }>()
const advancedOpen = defineModel<boolean>('advancedOpen', { default: false })
const { compact } = useViewport()
</script>

<template>
  <div role="group" :aria-label="ariaLabel" class="flex flex-wrap items-center gap-2" :class="card ? 'card p-3' : ''" data-testid="filter-bar">
    <FilterSheet
      v-model:advanced-open="advancedOpen"
      :collapse="compact"
      :title="ariaLabel"
      :active-count="activeCount"
      :advanced-count="advancedCount"
      :dirty="dirty"
      :on-reset="onReset"
      @done="emit('done')"
    >
      <template v-if="$slots.primary" #primary><slot name="primary" /></template>
      <template v-if="$slots.default" #default><slot /></template>
      <template v-if="$slots.end" #end><slot name="end" /></template>
      <template v-if="$slots.advanced" #advanced><slot name="advanced" /></template>
    </FilterSheet>
  </div>
</template>
