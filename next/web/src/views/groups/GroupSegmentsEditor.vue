<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SHint } from '@sub2api/ui'
import type { Group } from '@/api/types'
import type { Segment, SegmentGroupSetting, SegmentRef } from '@/api/pricing'
import AccessRateTable from '@/components/pricing/AccessRateTable.vue'
import PersonalSegmentPicker from '@/components/pricing/PersonalSegmentPicker.vue'
import SegmentBadge from '@/components/pricing/SegmentBadge.vue'
import { blankSetting, type DraftedSetting } from '@/components/pricing/accessRateDrafts'
import { fetchNamedSegments } from '@/components/pricing/segmentLookup'
import { useAccessRateDrafts } from '@/components/pricing/useAccessRateDrafts'

// Who may use a group and at which rate: one row per user group, the named
// ones first, then the personal ones that have something in this group or
// were picked here. Edits stay in drafts until the parent calls save(gid)
// after saving the group itself, as it does with the accounts editor. The
// rows follow the visibility and the default rate of the form being edited,
// and go to the parent (`rows`) for the tabs that price per user group.
// A group not created yet (groupId null) starts from every named user group
// with nothing set. Without `editable` the rows are only shown.
const props = defineProps<{ groupId: number | null; visibility: Group['visibility']; defaultRate: string; editable?: boolean; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'rows', rows: DraftedSetting[]): void; (e: 'pricing', segment: SegmentRef): void }>()
const { t } = useI18n()

/** Personal segments picked here: listed although the group has nothing for them yet. */
const included = ref<number[]>([])
const query = computed(() => (included.value.length ? { include: included.value.join(',') } : undefined))

async function fetchSettings(): Promise<SegmentGroupSetting[]> {
  if (props.groupId !== null) return api.get<SegmentGroupSetting[]>(`/groups/${props.groupId}/segments`, query.value)
  const [named, personal] = await Promise.all([fetchNamedSegments(), Promise.all(included.value.map((id) => api.get<Segment>(`/segments/${id}`)))])
  return [...named, ...personal].map(blankSetting)
}

const drafts = useAccessRateDrafts({ side: 'segment', fetch: fetchSettings, terms: () => ({ visibility: props.visibility, groupDefault: props.defaultRate }) })
const { rows, loading, error, dirty, refresh, change } = drafts

function load() {
  included.value = []
  return drafts.load()
}
watch(() => props.groupId, load, { immediate: true })
watch(rows, (v) => emit('rows', v), { immediate: true })

/** Lists a personal segment that has nothing in this group yet. */
function include(segment: SegmentRef) {
  if (rows.value.some((r) => r.id === segment.id)) return
  included.value = [...included.value, segment.id]
  return refresh()
}

/** A private group nobody is granted: nobody can use it. */
const nobody = computed(() => props.visibility === 'restricted' && !loading.value && !error.value && !rows.value.some((r) => r.granted))

/** Saves the changed rows for group `gid`: false when a rate cannot be saved yet, a failed request rejects. */
const save = (gid: number) => drafts.save((items) => api.put<SegmentGroupSetting[]>(`/groups/${gid}/segments`, { items }, { query: query.value }))

defineExpose({ save, dirty, include })
</script>

<template>
  <div class="space-y-3" data-testid="group-segments">
    <SAlert v-if="nobody" tone="warning" dense data-testid="group-segments-nobody">
      {{ t('groups.segments.nobody') }}
      <template v-if="editable">{{ t('groups.segments.nobodyHint') }}</template>
    </SAlert>
    <!-- The user search sits above the table: its results open downwards, where the dialog would clip them. -->
    <div v-if="editable" class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <SHint size="xs" class="min-w-0 flex-1 basis-96">{{ t('groups.segments.hint') }}</SHint>
      <PersonalSegmentPicker class="w-72 max-w-full" :label="t('groups.pickUser')" :disabled="disabled" @select="include" />
    </div>
    <AccessRateTable
      side="segment"
      :rows="rows"
      :editable="editable"
      :disabled="disabled"
      :no-prices="groupId === null"
      :loading="loading"
      :error="error"
      @retry="refresh"
      @change="change"
      @prices="emit('pricing', $event.segment)"
    >
      <template #lead="{ row }">
        <SegmentBadge :segment="row.segment" with-name />
        <SHint v-if="row.segment.kind === 'named'" inline size="xs" class="whitespace-nowrap">{{ t('groups.segments.members', { n: row.member_count ?? 0 }, row.member_count ?? 0) }}</SHint>
      </template>
    </AccessRateTable>
  </div>
</template>
