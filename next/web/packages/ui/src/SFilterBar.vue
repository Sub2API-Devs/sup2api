<script setup lang="ts">
// Filter strip of a page or a chart area: the filter controls in the
// default slot, wrapping on narrow screens; `#end` content sits on the
// right (a time zone note, an export button). With @reset bound a Reset
// button appears, disabled only when `dirty` is passed as false (filters
// equal the defaults).
// `card` (default true) draws the card frame; false for a strip inside one.
// `#primary` holds the filters that stay in sight on a phone (a search box);
// on wide screens they come first, before the default slot. On a compact
// screen with `mobileCollapse` (default true) the strip folds into one row:
// the #primary filters and a Filters button (badge `activeCount`, the number
// of filters off their default) opening a bottom sheet with the rest, #end
// and Reset; `#chips` (e.g. the active filters as removable chips) shows
// under that row. `mobileCollapse` false keeps the wrapping strip on phones.
import { computed } from 'vue'
import { useUiT } from './i18n'
import SButton from './SButton.vue'
import FilterSheet from './internal/FilterSheet.vue'
import { useViewport } from './viewport'

const props = withDefaults(
  defineProps<{ card?: boolean; dirty?: boolean; ariaLabel?: string; onReset?: () => void; activeCount?: number; mobileCollapse?: boolean }>(),
  {
    card: true,
    dirty: undefined,
    ariaLabel: undefined,
    onReset: undefined,
    activeCount: 0,
    mobileCollapse: true
  }
)
const t = useUiT()
const { compact } = useViewport()
const folded = computed(() => compact.value && props.mobileCollapse)
</script>

<template>
  <div role="group" :aria-label="ariaLabel" :class="[card ? 'card p-3' : '', folded ? '' : 'flex flex-wrap items-center gap-2']" data-testid="filter-bar">
    <template v-if="folded">
      <FilterSheet :title="ariaLabel" :active-count="activeCount" :dirty="dirty" :on-reset="onReset">
        <template v-if="$slots.primary" #primary><slot name="primary" /></template>
        <slot />
        <template v-if="$slots.end" #end><slot name="end" /></template>
      </FilterSheet>
      <div v-if="$slots.chips" class="mt-2 flex flex-wrap gap-1.5" data-testid="filter-chips"><slot name="chips" /></div>
    </template>
    <template v-else>
      <slot name="primary" />
      <slot />
      <SButton v-if="onReset" size="sm" variant="ghost" icon="refresh" :disabled="dirty === false" data-testid="filter-reset" @click="onReset()">{{ t('ui.resetFilters') }}</SButton>
      <div v-if="$slots.end" class="ms-auto flex items-center gap-2">
        <slot name="end" />
      </div>
    </template>
  </div>
</template>
