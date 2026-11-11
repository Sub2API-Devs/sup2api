<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SHint, SRowAction, SSwitch, STable, type TableColumn } from '@sub2api/ui'
import RateOverrideField from './RateOverrideField.vue'
import { rateText } from './pricingFormat'
import type { DraftedSetting, SettingDraft, SettingSide } from './accessRateDrafts'

// Grants and rates as a table: the segments of one group or the groups of one
// segment (`side`: the end the rows differ in), with the same columns either
// way. The caller names a row in #lead (chips on one line) and #note (a line
// under them). Editable, a row has a switch and a rate field and reports what
// they change (`change`); read-only it says the same in words. `prices` asks
// for the model prices of a row; `noPrices` leaves that column out. Other
// attributes (loading, error, @retry) are STable's.
defineOptions({ inheritAttrs: false })
const props = defineProps<{ rows: DraftedSetting[]; side: SettingSide; editable?: boolean; disabled?: boolean; noPrices?: boolean }>()
const emit = defineEmits<{ (e: 'change', row: DraftedSetting, draft: SettingDraft): void; (e: 'prices', row: DraftedSetting): void }>()
const { t } = useI18n()

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    // The names take the width the fixed columns leave, down to a readable minimum.
    { key: 'lead', label: props.side === 'segment' ? t('pricingAccess.segment') : t('common.group'), grow: true, class: 'min-w-[11rem]', mobile: 'title' },
    { key: 'access', label: t('pricingAccess.access'), nowrap: true, mobile: 'meta' }
  ]
  if (props.editable) cols.push({ key: 'rate_override', label: t('pricingAccess.rateOverride'), mobile: 'meta', mobileSpan: 2 })
  cols.push({ key: 'rate', label: t('pricingAccess.rate'), nowrap: true, mobile: 'meta' })
  if (!props.noPrices) cols.push({ key: 'prices', label: t('pricingAccess.prices'), align: 'right', nowrap: true, mobile: 'meta' })
  return cols
})
const rowAttrs = (row: DraftedSetting) => ({ 'data-testid': 'access-rate-row', [`data-${props.side}`]: row.id })
const nameOf = (row: DraftedSetting) => row[props.side].name
</script>

<template>
  <STable v-bind="$attrs" :columns="columns" :rows="rows" dense :row-attrs="rowAttrs">
    <template #cell-lead="{ row }">
      <span class="inline-flex max-w-full flex-wrap items-center gap-1.5">
        <slot name="lead" :row="row" />
        <SBadge v-if="row.dirty" tone="warning" size="xs" data-testid="access-rate-unsaved">{{ t('pricingAccess.unsaved') }}</SBadge>
      </span>
      <slot name="note" :row="row" />
    </template>
    <template #cell-access="{ row }">
      <SBadge v-if="row.group.visibility === 'public'" tone="success" data-testid="access-rate-access">{{ t('pricingAccess.public') }}</SBadge>
      <SSwitch
        v-else-if="editable"
        size="sm"
        :model-value="row.granted"
        :disabled="disabled"
        :label="t(row.granted ? 'pricingAccess.granted' : 'pricingAccess.notGranted')"
        :aria-label="t(`pricingAccess.grant.${side}`, { name: nameOf(row) })"
        data-testid="access-rate-grant"
        @update:model-value="emit('change', row, { granted: $event })"
      />
      <SBadge v-else-if="row.granted" tone="primary" data-testid="access-rate-access">{{ t('pricingAccess.granted') }}</SBadge>
      <SHint v-else inline size="xs" data-testid="access-rate-access">{{ t('pricingAccess.notGranted') }}</SHint>
    </template>
    <template #cell-rate_override="{ row }">
      <RateOverrideField
        :model-value="row.rate_override"
        :rate="row.rate"
        :disabled="disabled"
        :aria-label="t('pricingAccess.rateOf', { name: nameOf(row) })"
        @update:model-value="emit('change', row, { rate_override: $event })"
      />
    </template>
    <template #cell-rate="{ row }">
      <span class="font-mono font-medium" :class="row.accessible ? '' : 'text-fg-muted'" data-testid="access-rate-value">{{ rateText(row.rate.value) }}</span>
      <SHint size="xs" data-testid="access-rate-source">{{ row.accessible ? t(`pricingAccess.source.${row.rate.source}`) : t('pricingAccess.inactive') }}</SHint>
    </template>
    <template #cell-prices="{ row }">
      <span class="inline-flex items-center justify-end gap-2">
        <span class="text-xs" :class="row.price_rule_count ? '' : 'text-fg-muted'" data-testid="access-rate-price-count">
          {{ row.price_rule_count ? t('pricingAccess.priceCount', row.price_rule_count) : t('common.none') }}
        </span>
        <SRowAction :label="t(editable ? 'pricingAccess.setPrices' : 'common.view')" data-testid="access-rate-prices" @click="emit('prices', row)" />
      </span>
    </template>
  </STable>
</template>
