<script setup lang="ts">
// The applied filters as removable chips ("label: value ×") with a trailing
// "Clear all" link, under a filter bar: also the conditions the form has no
// field for (brought in by a link or a details view). The × emits
// `remove(key)`, Clear all emits `clear`. Renders nothing without items.
import SChip from './SChip.vue'
import { useUiT } from './i18n'
import type { FilterChipItem } from './types'

defineProps<{ items: FilterChipItem[] }>()
const emit = defineEmits<{ remove: [key: string]; clear: [] }>()
const t = useUiT()
</script>

<template>
  <div v-if="items.length" class="flex flex-wrap items-center gap-1.5" data-testid="filter-chips">
    <SChip
      v-for="item in items"
      :key="item.key"
      closable
      :close-label="t('ui.removeFilter', { label: item.label })"
      :data-filter-key="item.key"
      @close="emit('remove', item.key)"
    >
      {{ t('ui.filterChip', { label: item.label, value: item.value }) }}
    </SChip>
    <button
      type="button"
      class="link rounded px-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
      data-testid="filter-chips-clear"
      @click="emit('clear')"
    >
      {{ t('ui.clearAll') }}
    </button>
  </div>
</template>
