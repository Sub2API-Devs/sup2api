<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SButton, SDropdown, SHint, SInput, SLink, SPageHeader, SPagination, type MenuAction, type TableColumn } from '@sub2api/ui'
import type { Segment } from '@/api/pricing'
import PriceSimulatorModal from '@/components/pricing/PriceSimulatorModal.vue'
import { useSegmentsLookup } from '@/components/pricing/segmentLookup'
import { deleteWithConfirm } from '@/composables/crud'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import { formatNumber } from '@/utils/format'
import PersonalSegments from './PersonalSegments.vue'
import SegmentEditor, { type SegmentEditorTab } from './SegmentEditor.vue'
import SegmentTable from './SegmentTable.vue'

// User groups ("segments"): every user is in exactly one, and it decides
// which private groups he may use and at what rate and prices. The list has
// the named ones; the users priced individually, each a segment of his own,
// are summed up under it and listed by PersonalSegments. A caller who may
// not manage segments opens them read-only.
const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const canManage = computed(() => auth.has('segment:manage'))
const list = useList<Segment>('/segments', { q: '' })

const lead = computed<TableColumn[]>(() => [
  { key: 'name', label: t('segments.columns.name'), mobile: 'title' },
  { key: 'member_count', label: t('segments.columns.members'), align: 'right', mobile: 'meta' }
])

function rowActions(s: Segment): MenuAction[] {
  return [
    { key: 'members', label: t('segments.tabs.members') },
    { key: 'simulate', label: t('pricingTools.sim.title'), hidden: !auth.has('price:read') },
    { key: 'delete', label: t('common.delete'), danger: true, hidden: !canManage.value, disabled: s.is_default }
  ]
}
function onAction(s: Segment, key: string) {
  if (key === 'members') openEditor(s, 'members')
  else if (key === 'simulate') simulate(s)
  else if (key === 'delete') remove(s)
}

// ------------------------------------------------------------------ personal segments

const personalCount = ref(0)
const personalOpen = ref(false)

async function countPersonal() {
  try {
    personalCount.value = (await api.list<Segment>('/segments', { kind: 'personal', page_size: 1 })).page.total ?? 0
  } catch {
    /* the row keeps the last count */
  }
}
countPersonal()

/** Segments, their members or their settings changed: the list, the count below it and the selects follow. */
function changed() {
  list.reload()
  countPersonal()
  useSegmentsLookup(true)
}

// ------------------------------------------------------------------ create / edit

const editing = ref<Segment | null>(null)
const editorOpen = ref(false)
const editorTab = ref<SegmentEditorTab>('basic')

function openEditor(s: Segment | null, tab: SegmentEditorTab = 'basic') {
  editing.value = s
  editorTab.value = tab
  editorOpen.value = true
}

/** ?edit=<id> opens that user group: other pages link to it this way. The parameter is used once and leaves the address bar. */
async function openFromQuery(id: unknown) {
  if (typeof id !== 'string') return
  router.replace({ query: { ...route.query, edit: undefined } })
  try {
    const s = await api.get<Segment>(`/segments/${id}`)
    // A personal segment is edited where its user is, not in this list.
    if (s.kind === 'named') openEditor(s)
  } catch (e) {
    notifyError(e)
  }
}
watch(() => route.query.edit, openFromQuery, { immediate: true })

// ------------------------------------------------------------------ row menu

const simulatorPreset = ref<{ segmentId: number }>()
const simulatorOpen = ref(false)

function simulate(s: Segment) {
  simulatorPreset.value = { segmentId: s.id }
  simulatorOpen.value = true
}

function remove(s: Segment) {
  return deleteWithConfirm(`/segments/${s.id}`, t('segments.deleteConfirm', { name: s.name, n: s.member_count }), changed)
}
</script>

<template>
  <div>
    <SPageHeader :title="t('segments.title')" :description="t('segments.description')">
      <template #actions>
        <SButton v-if="canManage" variant="primary" icon="plus" fab data-testid="segment-create" @click="openEditor(null)">{{ t('segments.create') }}</SButton>
      </template>
      <template #filters-primary>
        <SInput v-model="list.filters.q" class="w-64" icon="search" clearable :aria-label="t('common.search')" :placeholder="t('segments.searchPlaceholder')" data-testid="segment-search" />
      </template>
    </SPageHeader>

    <SegmentTable card :lead="lead" :rows="list.items.value" actions :loading="list.loading.value" :error="list.error.value" @retry="list.reload">
      <template #cell-name="{ row }">
        <span class="inline-flex max-w-full items-center gap-1.5">
          <span class="truncate font-medium text-fg" data-testid="segment-name-cell">{{ row.name }}</span>
          <SBadge v-if="row.is_default" tone="info" size="xs" :title="t('segments.defaultHint')" data-testid="segment-default">{{ t('segments.default') }}</SBadge>
        </span>
        <SHint v-if="row.description" size="xs" class="max-w-xs truncate">{{ row.description }}</SHint>
      </template>
      <template #cell-member_count="{ row }">
        <SLink as="button" class="font-mono" data-testid="segment-members-link" @click="openEditor(row, 'members')">{{ formatNumber(row.member_count) }}</SLink>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <SButton variant="ghost" size="sm" data-testid="segment-edit" @click="openEditor(row)">{{ t(canManage ? 'common.edit' : 'common.view') }}</SButton>
          <SDropdown :actions="rowActions(row)" @select="onAction(row, $event)" />
        </div>
      </template>
      <template #footer>
        <SAlert tone="accent" icon="user" class="mt-3" data-testid="segments-personal">
          <template #title>{{ t('segments.personal.summary', { n: formatNumber(personalCount) }) }}</template>
          {{ t('segments.personal.summaryHint') }}
          <template #actions>
            <SButton size="sm" data-testid="segments-personal-open" @click="personalOpen = true">{{ t('common.view') }}</SButton>
          </template>
        </SAlert>
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </template>
    </SegmentTable>

    <SegmentEditor v-model:open="editorOpen" :segment="editing" :tab="editorTab" :readonly="!canManage" @changed="changed" />
    <PersonalSegments v-model:open="personalOpen" @changed="changed" />
    <PriceSimulatorModal v-model:open="simulatorOpen" :preset="simulatorPreset" />
  </div>
</template>
