<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SEmpty, SHint, SIcon, SStatusBadge } from '@sub2api/ui'
import type { SegmentGroupSetting } from '@/api/pricing'
import GroupBadge from '@/components/platform/GroupBadge.vue'
import AccessRateTable from '@/components/pricing/AccessRateTable.vue'
import { useAccessRateDrafts } from '@/components/pricing/useAccessRateDrafts'
import { useAuthStore } from '@/stores/auth'
import SegmentGroupPricesModal from './SegmentGroupPricesModal.vue'

// What a segment (a user group, or the personal one of a user) gets in every
// group: whether it may use a private group, the rate it pays there and its
// own model prices. Grants and rates stay in drafts (the rate that applies
// follows them at once) until the parent calls save(), as it does with its
// other sub-editors after saving the main form. Model prices are saved by
// their own dialog, and `changed` says their count is another now. They are
// the group's to read and to set (GET / PUT /groups/:id/model-prices): the
// column takes group:read and setting them group:manage, whatever the caller
// may do to segments. `discount` is the segment's discount as the parent's
// form has it now, so the rates here follow it before it is saved; `disabled`
// holds the fields still while the parent saves.
const props = defineProps<{ segmentId: number | null; editable?: boolean; disabled?: boolean; discount?: string }>()
const emit = defineEmits<{ (e: 'changed'): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const canReadPrices = computed(() => auth.has('group:read'))
const canSetPrices = computed(() => !!props.editable && auth.has('group:manage'))

const path = computed(() => `/segments/${props.segmentId}/groups`)
// A segment not saved yet has no settings to ask for.
const fetchSettings = async () => (props.segmentId === null ? [] : api.get<SegmentGroupSetting[]>(path.value))

const drafts = useAccessRateDrafts({ side: 'group', fetch: fetchSettings, terms: () => ({ discount: props.discount }) })
const { rows, loading, error, dirty, refresh, load, change } = drafts
watch(() => props.segmentId, load, { immediate: true })

/** Saves the drafts: false when a rate cannot be saved yet, a failed request rejects. */
async function save(): Promise<boolean> {
  if (props.segmentId === null || !props.editable) return true
  return drafts.save((items) => api.put<SegmentGroupSetting[]>(path.value, { items }))
}

// ------------------------------------------------------------------ model prices

const pricing = ref<SegmentGroupSetting | null>(null)
const pricesOpen = ref(false)

function openPrices(row: SegmentGroupSetting) {
  pricing.value = row
  pricesOpen.value = true
}

/** The rows count the rules again, and so does whoever lists the segment. */
function pricesSaved() {
  refresh()
  emit('changed')
}

defineExpose({ save, dirty })
</script>

<template>
  <div data-testid="segment-groups">
    <SEmpty v-if="segmentId === null" size="sm" icon="group" :text="t('segments.groups.emptyNew')" data-testid="segment-groups-empty" />
    <AccessRateTable v-else side="group" :rows="rows" :editable="editable" :disabled="disabled" :no-prices="!canReadPrices" :readonly-prices="!canSetPrices" :loading="loading" :error="error" @retry="refresh" @change="change" @prices="openPrices">
      <template #lead="{ row }">
        <GroupBadge :name="row.group.name" :platforms="row.group.platforms" :rate="row.group.rate_multiplier" />
        <SBadge v-if="row.group.visibility === 'restricted'" size="xs" data-testid="segment-group-private">
          <SIcon name="lock" class="h-3 w-3" />
          {{ t('segments.groups.private') }}
        </SBadge>
        <SStatusBadge v-if="row.group.status !== 'active'" :status="row.group.status" size="xs" />
      </template>
      <template #note="{ row }">
        <SHint v-if="row.group.description" size="xs" class="truncate">{{ row.group.description }}</SHint>
      </template>
    </AccessRateTable>
    <SegmentGroupPricesModal v-if="canReadPrices" v-model:open="pricesOpen" :setting="pricing" :editable="canSetPrices" @saved="pricesSaved" />
  </div>
</template>
