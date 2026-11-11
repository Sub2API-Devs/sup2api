<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SEmpty, SHint, SIcon, SRowAction, SStatusBadge, SSwitch, STable, toast, type TableColumn } from '@sub2api/ui'
import type { SegmentGroupSetting } from '@/api/pricing'
import GroupBadge from '@/components/platform/GroupBadge.vue'
import RateOverrideField from '@/components/pricing/RateOverrideField.vue'
import { rateText } from '@/components/pricing/pricingFormat'
import SegmentGroupPricesModal from './SegmentGroupPricesModal.vue'
import { draftedSetting, groupPatches, setDraft, validOverride, type DraftedSetting, type GroupDraft, type GroupDrafts } from './segmentGroupDrafts'

// What a segment (a user group, or the personal one of a user) gets in every
// group: whether it may use a private group, the rate it pays there and its
// own model prices. Grants and rates stay in drafts (the rate that applies
// follows them at once) until the parent calls save(), as it does with its
// other sub-editors after saving the main form. Model prices are saved by
// their own dialog. `discount` is the segment's discount as the parent's
// form has it now, so the rates here follow it before it is saved.
const props = defineProps<{ segmentId: number | null; editable?: boolean; discount?: string }>()
const { t } = useI18n()

const settings = ref<SegmentGroupSetting[]>([])
const loading = ref(false)
const error = ref<unknown>(null)
const drafts = ref<GroupDrafts>(new Map())
let request = 0

const path = computed(() => `/segments/${props.segmentId}/groups`)

/** Asks the server for the settings again; the drafts stay on top of them. */
async function refresh() {
  const current = ++request
  error.value = null
  loading.value = props.segmentId !== null
  if (props.segmentId === null) return
  try {
    const result = await api.get<SegmentGroupSetting[]>(path.value)
    if (current === request) settings.value = result
  } catch (e) {
    if (current === request) error.value = e
  } finally {
    if (current === request) loading.value = false
  }
}

function load() {
  drafts.value = new Map()
  settings.value = []
  return refresh()
}
watch(() => props.segmentId, load, { immediate: true })

const rows = computed(() => settings.value.map((s) => draftedSetting(s, drafts.value.get(s.group.id), props.discount)))
const dirty = computed(() => drafts.value.size > 0)

const columns = computed<TableColumn[]>(() => [
  { key: 'group', label: t('common.group'), mobile: 'title' },
  { key: 'access', label: t('segments.groups.access'), mobile: 'meta' },
  ...(props.editable ? [{ key: 'rate_override', label: t('pricing.rate.label'), mobile: 'meta', mobileSpan: 2 } satisfies TableColumn] : []),
  { key: 'rate', label: t('segments.groups.rate'), mobile: 'meta' },
  { key: 'prices', label: t('segments.groups.prices'), align: 'right', mobile: 'meta' }
])
const rowAttrs = (row: DraftedSetting) => ({ 'data-testid': 'segment-group-row', 'data-group': row.group.id })

function edit(row: DraftedSetting, change: GroupDraft) {
  drafts.value = setDraft(drafts.value, row.saved, change)
}

/**
 * Saves the drafts and shows what the server answers. False when a rate
 * cannot be saved yet: its field says why. A failed request rejects and
 * keeps the drafts.
 */
async function save(): Promise<boolean> {
  if (props.segmentId === null || !props.editable || !dirty.value) return true
  const invalid = rows.value.find((r) => !validOverride(r.rate_override))
  if (invalid) {
    toast(t('segments.groups.invalidRate', { group: invalid.group.name }), 'error')
    return false
  }
  settings.value = await api.put<SegmentGroupSetting[]>(path.value, { items: groupPatches(drafts.value) })
  drafts.value = new Map()
  return true
}

// ------------------------------------------------------------------ model prices

const pricing = ref<SegmentGroupSetting | null>(null)
const pricesOpen = ref(false)

function openPrices(row: DraftedSetting) {
  pricing.value = row
  pricesOpen.value = true
}

defineExpose({ load, save, dirty })
</script>

<template>
  <div data-testid="segment-groups">
    <SEmpty v-if="segmentId === null" size="sm" icon="group" :text="t('segments.groups.emptyNew')" data-testid="segment-groups-empty" />
    <STable v-else :columns="columns" :rows="rows" :loading="loading" :error="error" dense :row-attrs="rowAttrs" @retry="refresh">
      <template #cell-group="{ row }">
        <span class="inline-flex max-w-full flex-wrap items-center gap-1.5">
          <GroupBadge :name="row.group.name" :platforms="row.group.platforms" :rate="row.group.rate_multiplier" />
          <SBadge v-if="row.group.visibility === 'restricted'" size="xs" data-testid="segment-group-private">
            <SIcon name="lock" class="h-3 w-3" />
            {{ t('segments.groups.private') }}
          </SBadge>
          <SStatusBadge v-if="row.group.status !== 'active'" :status="row.group.status" size="xs" />
          <SBadge v-if="row.dirty" tone="warning" size="xs" data-testid="segment-group-unsaved">{{ t('segments.unsaved') }}</SBadge>
        </span>
        <SHint v-if="row.group.description" size="xs" class="max-w-xs truncate">{{ row.group.description }}</SHint>
      </template>
      <template #cell-access="{ row }">
        <SBadge v-if="row.group.visibility === 'public'" tone="success" data-testid="segment-group-access">{{ t('segments.groups.public') }}</SBadge>
        <SSwitch
          v-else-if="editable"
          :model-value="row.granted"
          size="sm"
          :label="t(row.granted ? 'segments.groups.granted' : 'segments.groups.notGranted')"
          :aria-label="t('segments.groups.grant', { group: row.group.name })"
          data-testid="segment-group-grant"
          @update:model-value="edit(row, { granted: $event })"
        />
        <SBadge v-else-if="row.granted" tone="primary" data-testid="segment-group-access">{{ t('segments.groups.granted') }}</SBadge>
        <span v-else class="text-xs text-fg-muted" data-testid="segment-group-access">{{ t('segments.groups.notGranted') }}</span>
      </template>
      <template #cell-rate_override="{ row }">
        <RateOverrideField
          :model-value="row.rate_override"
          :rate="row.rate"
          :aria-label="t('segments.groups.rateOf', { group: row.group.name })"
          @update:model-value="edit(row, { rate_override: $event })"
        />
      </template>
      <template #cell-rate="{ row }">
        <span class="font-mono font-medium" :class="row.accessible ? '' : 'text-fg-muted'" data-testid="segment-group-rate">{{ rateText(row.rate.value) }}</span>
        <SHint size="xs" class="whitespace-nowrap" data-testid="segment-group-rate-source">
          {{ row.accessible ? t(`segments.groups.source.${row.rate.source}`) : t('segments.groups.inactive') }}
        </SHint>
      </template>
      <template #cell-prices="{ row }">
        <span class="inline-flex items-center justify-end gap-2 whitespace-nowrap">
          <span class="text-xs" :class="row.price_rule_count ? '' : 'text-fg-muted'" data-testid="segment-group-price-count">
            {{ row.price_rule_count ? t('segments.groups.priceCount', row.price_rule_count) : t('common.none') }}
          </span>
          <SRowAction :label="t(editable ? 'segments.groups.setPrices' : 'common.view')" data-testid="segment-group-prices" @click="openPrices(row)" />
        </span>
      </template>
    </STable>
    <SegmentGroupPricesModal v-model:open="pricesOpen" :setting="pricing" :editable="editable" @saved="refresh" />
  </div>
</template>
