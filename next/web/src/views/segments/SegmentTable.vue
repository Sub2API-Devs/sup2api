<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChipList, SHint, STable, type ChipListItem, type TableColumn } from '@sub2api/ui'
import type { Segment } from '@/api/pricing'
import { rateText } from '@/components/pricing/pricingFormat'
import { hasDiscount } from './segmentForm'

// A table of segments. What a segment gets reads the same for a named and a
// personal one, so those columns are here: its discount, the private groups
// it may use and how much it has set of its own. The caller brings the
// columns before them (`lead`: who the segment is) and their `cell-<key>`
// slots, and `cell-actions` when it has actions. Other attributes and slots
// (card, loading, #footer, …) are STable's.
defineOptions({ inheritAttrs: false })
const props = defineProps<{ lead: TableColumn[]; rows: Segment[]; actions?: boolean }>()
const { t } = useI18n()

/** Private groups shown before the rest folds into "+N". */
const GROUPS_SHOWN = 3

const columns = computed<TableColumn[]>(() => [
  ...props.lead,
  { key: 'discount', label: t('segments.discount.label'), mobile: 'meta' },
  { key: 'granted_groups', label: t('segments.columns.granted'), mobile: 'meta', mobileSpan: 2 },
  { key: 'custom', label: t('segments.columns.custom'), mobile: 'meta', mobileSpan: 2 },
  ...(props.actions ? [{ key: 'actions', label: t('common.actions'), align: 'right' } satisfies TableColumn] : [])
])

const groupChips = (s: Segment): ChipListItem[] => s.granted_groups.map((g) => ({ key: String(g.id), label: g.name }))

/** "2 own rates · 3 own prices"; '' when the segment follows the groups everywhere. */
function customText(s: Segment): string {
  const parts = [s.rate_override_count && t('segments.customRates', s.rate_override_count), s.price_rule_count && t('segments.customPrices', s.price_rule_count)]
  return parts.filter(Boolean).join(' · ')
}
const rowAttrs = (s: Segment) => ({ 'data-testid': 'segment-row', 'data-segment': s.id })
</script>

<template>
  <STable v-bind="$attrs" :columns="columns" :rows="rows" :row-attrs="rowAttrs">
    <template v-for="(_, name) in $slots" #[name]="scope">
      <slot :name="name" v-bind="scope ?? {}" />
    </template>
    <template #cell-discount="{ row }">
      <span v-if="hasDiscount(row)" class="font-mono font-medium" data-testid="segment-discount-cell">{{ rateText(row.discount) }}</span>
      <SHint v-else inline data-testid="segment-discount-cell">{{ t('common.none') }}</SHint>
    </template>
    <template #cell-granted_groups="{ row }">
      <SChipList v-if="row.granted_groups.length" :items="groupChips(row)" :max="GROUPS_SHOWN" />
      <SHint v-else inline>{{ t('segments.publicOnly') }}</SHint>
    </template>
    <template #cell-custom="{ row }">
      <span v-if="customText(row)" class="text-xs" data-testid="segment-custom-cell">{{ customText(row) }}</span>
      <SHint v-else inline data-testid="segment-custom-cell">{{ t('common.none') }}</SHint>
    </template>
  </STable>
</template>
