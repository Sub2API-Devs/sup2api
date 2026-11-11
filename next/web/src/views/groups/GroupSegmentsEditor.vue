<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SHint, SLink, SSwitch, STable, toast, type TableColumn } from '@sub2api/ui'
import type { Group } from '@/api/types'
import type { Segment, SegmentGroupSetting, SegmentRef } from '@/api/pricing'
import RateOverrideField from '@/components/pricing/RateOverrideField.vue'
import SegmentBadge from '@/components/pricing/SegmentBadge.vue'
import { rateText } from '@/components/pricing/pricingFormat'
import { fetchFirstPage } from '@/composables/lookups'
import PersonalSegmentPicker from './PersonalSegmentPicker.vue'
import { blankRow, invalidDraft, rowOfSetting, segmentPatches, setDraft, viewRow, type SegmentDraft, type SegmentDrafts, type SegmentRow, type SegmentView } from './segmentDrafts'

// Who may use a group and at which rate: one row per user group, the named
// ones first, then the personal ones that have something in this group or
// were picked here. Edits stay in drafts until the parent calls save(gid)
// after saving the group itself, as it does with the accounts editor. The
// rows follow the visibility and the default rate of the form being edited,
// and go to the parent (`rows`) for the tabs that price per user group.
// A group not created yet (groupId null) starts from every named user group
// with nothing set.
const props = defineProps<{ groupId: number | null; visibility: Group['visibility']; defaultRate: string; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'rows', rows: SegmentView[]): void; (e: 'pricing', segment: SegmentRef): void }>()
const { t } = useI18n()

const saved = ref<SegmentRow[]>([])
const drafts = ref<SegmentDrafts>(new Map())
/** Personal segments picked here: listed although the group has nothing for them yet. */
const included = ref<number[]>([])
const loading = ref(false)
const error = ref<unknown>(null)
let request = 0

const query = computed(() => (included.value.length ? { include: included.value.join(',') } : undefined))

async function fetchRows(): Promise<SegmentRow[]> {
  if (props.groupId !== null) return (await api.get<SegmentGroupSetting[]>(`/groups/${props.groupId}/segments`, query.value)).map(rowOfSetting)
  const [named, personal] = await Promise.all([fetchFirstPage<Segment>('/segments'), Promise.all(included.value.map((id) => api.get<Segment>(`/segments/${id}`)))])
  return [...named, ...personal].map(blankRow)
}

/** Fetches the rows again; the drafts stay on them. */
async function refresh() {
  const current = ++request
  loading.value = true
  error.value = null
  try {
    const rows = await fetchRows()
    if (current === request) saved.value = rows
  } catch (e) {
    if (current === request) error.value = e
  } finally {
    if (current === request) loading.value = false
  }
}

function load() {
  drafts.value = new Map()
  included.value = []
  saved.value = []
  return refresh()
}
watch(() => props.groupId, load, { immediate: true })

/** Lists a personal segment that has nothing in this group yet. */
function include(segment: SegmentRef) {
  if (saved.value.some((r) => r.segment.id === segment.id)) return
  included.value = [...included.value, segment.id]
  return refresh()
}

const rows = computed(() => saved.value.map((row) => viewRow(row, drafts.value, { visibility: props.visibility, defaultRate: props.defaultRate })))
watch(rows, (v) => emit('rows', v), { immediate: true })
const dirty = computed(() => drafts.value.size > 0)
/** A private group nobody is granted: nobody can use it. */
const nobody = computed(() => props.visibility === 'restricted' && !loading.value && !error.value && !rows.value.some((r) => r.granted))

const columns = computed<TableColumn[]>(() => [
  { key: 'segment', label: t('groups.segments.segment'), mobile: 'title' },
  { key: 'access', label: t('groups.segments.access'), mobile: 'meta' },
  { key: 'rate_override', label: t('groups.segments.rateOverride'), mobile: 'meta', mobileSpan: 2 },
  { key: 'rate', label: t('groups.segments.rate'), align: 'right', mobile: 'meta' },
  { key: 'prices', label: t('groups.segments.prices'), align: 'right', mobile: 'meta' }
])
const rowAttrs = (row: SegmentView) => ({ 'data-testid': 'group-segment-row', 'data-segment': row.id })

function change(row: SegmentView, patch: Partial<SegmentDraft>) {
  drafts.value = setDraft(drafts.value, row, patch)
}

/**
 * Saves the changed rows for group `gid` and shows what the server answers.
 * False when a rate cannot be saved yet. A failed request rejects and keeps
 * the drafts.
 */
async function save(gid: number): Promise<boolean> {
  if (!dirty.value) return true
  const invalid = rows.value.find((r) => r.id === invalidDraft(drafts.value))
  if (invalid) {
    toast(t('groups.segments.rateInvalid', { name: invalid.segment.name }), 'error')
    return false
  }
  const result = await api.put<SegmentGroupSetting[]>(`/groups/${gid}/segments`, { items: segmentPatches(saved.value, drafts.value) }, { query: query.value })
  drafts.value = new Map()
  saved.value = result.map(rowOfSetting)
  return true
}

defineExpose({ load, save, dirty, include })
</script>

<template>
  <div class="space-y-3" data-testid="group-segments">
    <SAlert v-if="nobody" tone="warning" dense data-testid="group-segments-nobody">{{ t('groups.segments.nobody') }}</SAlert>
    <!-- The user search sits above the table: its results open downwards, where the dialog would clip them. -->
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <SHint size="xs" class="min-w-0 flex-1 basis-96">{{ t('groups.segments.hint') }}</SHint>
      <PersonalSegmentPicker class="w-72 max-w-full" :label="t('groups.pickUser')" :disabled="disabled" @select="include" />
    </div>
    <STable :columns="columns" :rows="rows" :loading="loading" :error="error" dense :row-attrs="rowAttrs" @retry="refresh">
      <template #cell-segment="{ row }">
        <span class="inline-flex max-w-full items-center gap-1.5">
          <SegmentBadge :segment="row.segment" with-name />
          <SHint v-if="row.segment.kind === 'named'" inline size="xs" class="whitespace-nowrap">{{ t('groups.segments.members', { n: row.member_count ?? 0 }) }}</SHint>
          <SBadge v-if="row.dirty" tone="warning" size="xs" data-testid="group-segment-unsaved">{{ t('groups.unsaved') }}</SBadge>
        </span>
      </template>
      <template #cell-access="{ row }">
        <SHint v-if="visibility === 'public'" inline size="xs" class="whitespace-nowrap">{{ t('groups.segments.publicAccess') }}</SHint>
        <SSwitch
          v-else
          size="sm"
          :model-value="row.granted"
          :disabled="disabled"
          :aria-label="t('groups.segments.grant', { name: row.segment.name })"
          data-testid="group-segment-grant"
          @update:model-value="change(row, { granted: $event })"
        />
      </template>
      <template #cell-rate_override="{ row }">
        <RateOverrideField
          :model-value="row.rate_override"
          :rate="{ group_default: defaultRate, discount: row.discount }"
          :disabled="disabled"
          :aria-label="t('groups.segments.rateOf', { name: row.segment.name })"
          @update:model-value="change(row, { rate_override: $event })"
        />
      </template>
      <template #cell-rate="{ row }">
        <span class="font-mono font-medium" :class="row.accessible ? '' : 'text-fg-subtle'" :title="row.accessible ? undefined : t('groups.segments.notGranted')" data-testid="group-segment-rate">{{ rateText(row.accessible ? row.rate : null) }}</span>
      </template>
      <template #cell-prices="{ row }">
        <SLink v-if="groupId !== null" as="button" class="whitespace-nowrap text-xs" data-testid="group-segment-prices" @click="emit('pricing', row.segment)">
          {{ row.price_rule_count ? t('groups.segments.priceRules', { n: row.price_rule_count }) : t('groups.segments.setPrices') }}
        </SLink>
        <span v-else class="text-fg-subtle">—</span>
      </template>
    </STable>
  </div>
</template>
