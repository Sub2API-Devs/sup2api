<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SHint, SInput, SLink, SSelect, SSwitch, STable, type TableColumn } from '@sub2api/ui'
import FlowEditor from './FlowEditor.vue'
import FlowGroupsCell from './FlowGroupsCell.vue'
import FlowVersions from './FlowVersions.vue'
import FlowSimulate from './FlowSimulate.vue'
import ImportDialog from './ImportDialog.vue'
import { useCatalog } from './catalog'
import { dt, enumLabel, joinList, ms, num, pct } from './format'
import { canManage, confirmDelete, deleteFlow, errorMessage, setFlowEnabled, toastError, useModHost } from './host'
import type { Flow, Group, Spec, TabKey } from './types'
import { groupCoverage, type GroupOwner } from './flowOps'

// Flows (CONTRACTS §72.7): the list (groups edited in place, 24 h stats) and
// the full-width canvas editor of one flow (?flow=<id> or ?flow=new). Flows,
// auditors and groups come from the shared catalog; flow changes refresh the
// flows. Manage users import a configuration (channels, auditors) here.
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())
const emit = defineEmits<{ (e: 'go-tab', tab: TabKey): void }>()

const catalog = useCatalog()
const rows = computed(() => catalog.state.flows)
const groups = computed(() => catalog.state.groups)
const loading = computed(() => catalog.state.loading)
const error = computed(() => (catalog.state.errors.flows ? errorMessage(catalog.state.errors.flows, t('flows.loadFailed')) : ''))
const refreshFlows = () => catalog.refresh(['flows'])
defineExpose({ reload: () => catalog.refresh() })

const groupLabel = (id: number) => (id === 0 ? t('flows.defaultGroup') : catalog.groupName(id))

/** Every group incl. the default; [] when the group list is not readable. */
const allGroups = computed<Group[]>(() => (groups.value.length ? [{ id: 0, name: t('flows.defaultGroup') }, ...groups.value] : []))
const owners = computed(() => {
  const m = new Map<number, GroupOwner>()
  for (const f of rows.value) for (const g of f.groups) m.set(g, { flowId: f.id, flowName: f.name })
  return m
})

function stagesSummary(s: Spec | null): string {
  if (!s?.stages?.length) return '—'
  return s.stages.map((st) => `${st.auditors.map(catalog.auditorName).join(' ∥ ')}${st.auditors.length > 1 ? ` (${enumLabel('combine', st.combine || 'any')}${st.combine === 'at_least' ? ' ' + st.n : ''})` : ''}`).join(' → ')
}

// ---- filters
const nameQuery = ref('')
const groupFilter = ref<number | null>(null)
const groupOptions = computed(() => {
  const ids = allGroups.value.length ? allGroups.value.map((g) => g.id) : [...owners.value.keys()].sort((a, b) => a - b)
  return [{ value: null, label: t('flows.allGroups') }, ...ids.map((id) => ({ value: id, label: groupLabel(id) }))]
})
const filtered = computed(() => {
  const q = nameQuery.value.trim().toLowerCase()
  return rows.value.filter((f) => (groupFilter.value === null || f.groups.includes(groupFilter.value)) && (!q || f.name.toLowerCase().includes(q)))
})

const hasStats = computed(() => rows.value.some((f) => f.stats_24h))
const columns = computed<TableColumn[]>(() => {
  const c: TableColumn[] = [
    { key: 'name', label: t('flows.col.name'), nowrap: true },
    { key: 'status', label: t('flows.col.status'), nowrap: true },
    { key: 'groups', label: t('flows.col.groups') },
    { key: 'stages', label: t('flows.col.stages'), ellipsis: '24rem' }
  ]
  if (hasStats.value) {
    c.push(
      { key: 'audited', label: t('flows.col.audited'), align: 'right', nowrap: true },
      { key: 'rate', label: t('flows.col.suspiciousRate'), align: 'right', nowrap: true },
      { key: 'pre', label: t('flows.col.preAvg'), align: 'right', nowrap: true }
    )
  }
  c.push({ key: 'published_at', label: t('flows.col.published'), nowrap: true }, { key: 'actions', label: '', align: 'right' })
  return c
})

// group coverage under the table (new-api flows-table.tsx)
const coverage = computed(() => {
  if (!groups.value.length) return null
  const c = groupCoverage(groups.value.map((g) => g.id), rows.value)
  const names = (ids: number[]) => joinList(ids.map(groupLabel))
  return { total: groups.value.length, bound: c.own.length, unbound: names(c.unbound), disabled: names(c.inactive), stale: names(c.stale) }
})

// ---- versions drawer, simulation
const versionsOpen = ref(false)
const importOpen = ref(false)
const simulateOpen = ref(false)
const target = ref<Flow | null>(null)
function openVersions(f: Flow) {
  target.value = f
  versionsOpen.value = true
}
function openSimulate(f: Flow) {
  target.value = f
  simulateOpen.value = true
}

/** Groups this flow moderates now and would not once disabled (the default group's flow may take them over). */
function lostGroups(f: Flow): number[] {
  const ids = groups.value.length ? [0, ...groups.value.map((g) => g.id)] : f.groups
  const before = new Set(groupCoverage(ids, rows.value).moderated)
  const after = new Set(groupCoverage(ids, rows.value.map((x) => (x.id === f.id ? { ...x, enabled: false } : x))).moderated)
  return [...before].filter((id) => !after.has(id))
}

async function toggle(f: Flow, on: boolean) {
  if (!on) {
    const lost = lostGroups(f)
    const message = t('flows.disableConfirm', { name: f.name }) + (lost.length ? ' ' + t('flows.disableLoses', { groups: joinList(lost.map(groupLabel)) }) : '')
    if (!(await host.confirm({ message, danger: lost.length > 0, confirmText: t('flows.disable') }))) return
  }
  try {
    await setFlowEnabled(f.id, on)
    await refreshFlows()
  } catch (e) {
    toastError(e)
  }
}

const deleteBlocked = (f: Flow) => f.enabled && f.groups.length > 0

const remove = (f: Flow) =>
  confirmDelete(
    t('flows.deleteConfirm', { name: f.name }),
    () => deleteFlow(f.id),
    () => void refreshFlows(),
    (e) => (isApiError(e) && e.code === 'flow_in_use' ? t('flows.deleteBlocked') : errorMessage(e, t('actionFailed')))
  )

// ---- editor (?flow=<id> | ?flow=new)
const route = host.router.currentRoute
const editor = ref<{ id: number | null; key: number } | null>(null)
let editorKey = 0

/** undefined = no editor, null = a new flow */
function parseFlow(v: unknown): number | null | undefined {
  if (v === 'new') return null
  const n = typeof v === 'string' ? Number(v) : NaN
  return Number.isSafeInteger(n) && n > 0 ? n : undefined
}

watch(
  () => route.value.query.flow,
  (v) => {
    const want = parseFlow(v)
    if (want === undefined) editor.value = null
    else if (!editor.value || editor.value.id !== want) editor.value = { id: want, key: ++editorKey }
  },
  { immediate: true }
)

function openEditor(id: number | null) {
  host.router.push({ query: { ...route.value.query, flow: id === null ? 'new' : String(id) } })
}

function closeEditor() {
  editor.value = null
  const { flow: _drop, ...query } = route.value.query
  host.router.replace({ query })
  void refreshFlows()
}

function onCreated(id: number) {
  if (editor.value) editor.value = { ...editor.value, id }
  host.router.replace({ query: { ...route.value.query, flow: String(id) } })
}
</script>

<template>
  <div>
    <FlowEditor v-if="editor" :key="editor.key" :flow-id="editor.id" :group-label="groupLabel" @close="closeEditor" @created="onCreated" @changed="refreshFlows" @manage="emit('go-tab', 'auditors')" />
    <template v-else>
      <SHint class="mod-hint">{{ t('flows.hint') }}</SHint>
      <div class="mod-toolbar mod-flows-toolbar">
        <SInput v-model="nameQuery" type="search" icon="search" :placeholder="t('flows.searchName')" :aria-label="t('flows.searchName')" class="mod-flows-search" clearable />
        <SSelect :model-value="groupFilter" :options="groupOptions" :aria-label="t('flows.groupFilter')" class="mod-flows-group" @update:model-value="groupFilter = $event as number | null" />
        <SButton v-if="manage" icon="upload" class="mod-ml-auto" @click="importOpen = true">{{ t('import.button') }}</SButton>
        <SButton
          v-if="manage"
          variant="primary"
          icon="plus"
          :disabled="!catalog.state.auditors.length"
          :title="catalog.state.auditors.length ? '' : t('flows.needAuditor')"
          @click="openEditor(null)"
        >{{ t('flows.add') }}</SButton>
      </div>
      <SAlert v-if="error" tone="danger" class="mod-block">{{ error }}</SAlert>

      <SCard :padded="false">
        <STable :columns="columns" :rows="filtered" :loading="loading" :empty-text="rows.length ? t('flows.noMatch') : t('flows.empty')" dense>
          <template #cell-name="{ row }">
            <SLink as="button" @click="openEditor(row.id)">{{ row.name }}</SLink>
            <span class="mod-sub mod-num mod-ml">#{{ row.id }}</span>
            <SBadge v-if="!row.enabled" tone="gray" class="mod-ml">{{ t('disabled') }}</SBadge>
          </template>
          <template #cell-status="{ row }">
            <SSwitch v-if="manage" :model-value="row.enabled" size="sm" :aria-label="t('enabled')" @update:model-value="toggle(row, $event)" />
            <SBadge v-if="row.version" tone="info">v{{ row.version }}</SBadge>
            <SBadge v-else tone="gray">{{ t('flows.unpublished') }}</SBadge>
            <SBadge v-if="row.version && row.dirty" tone="warning">{{ t('flows.badgeChanges') }}</SBadge>
          </template>
          <template #cell-groups="{ row }">
            <FlowGroupsCell :flow="row" :all-groups="allGroups" :owners="owners" :can-write="manage" :group-label="groupLabel" @saved="refreshFlows" />
          </template>
          <template #cell-stages="{ row }"><span :title="stagesSummary(row.draft)">{{ stagesSummary(row.published || row.draft) }}</span></template>
          <template #cell-audited="{ row }"><span class="mod-num">{{ row.stats_24h ? num(row.stats_24h.audited) : '—' }}</span></template>
          <template #cell-rate="{ row }">
            <span class="mod-num">{{ row.stats_24h?.audited ? pct(row.stats_24h.suspicious_rate) : '—' }}</span>
          </template>
          <template #cell-pre="{ row }">
            <span class="mod-num">{{ row.stats_24h?.pre_avg_ms ? ms(Math.round(row.stats_24h.pre_avg_ms)) : '—' }}</span>
          </template>
          <template #cell-published_at="{ row }">{{ dt(row.published_at) }}</template>
          <template #cell-actions="{ row }">
            <SButton size="sm" variant="ghost" @click="openEditor(row.id)">{{ manage ? t('edit') : t('flows.view') }}</SButton>
            <SButton v-if="manage" size="sm" variant="ghost" @click="openSimulate(row)">{{ t('flows.simulate') }}</SButton>
            <SButton v-if="row.version" size="sm" variant="ghost" @click="openVersions(row)">{{ t('flows.versions') }}</SButton>
            <span v-if="manage" :title="deleteBlocked(row) ? t('flows.deleteBlocked') : ''">
              <SButton size="sm" variant="ghost" :disabled="deleteBlocked(row)" @click="remove(row)">{{ t('delete') }}</SButton>
            </span>
          </template>
        </STable>
      </SCard>

      <p v-if="coverage" class="mod-sub mod-flows-coverage">
        {{ t('flows.groupsSummary', { total: coverage.total, bound: coverage.bound }) }}
        <template v-if="coverage.disabled">{{ t('flows.disabledGroups', { groups: coverage.disabled }) }}</template>
        <span v-if="coverage.unbound" class="mod-text-warning"> · {{ t('flows.unboundGroups', { groups: coverage.unbound }) }}</span>
        <span v-if="coverage.stale" class="mod-text-danger"> · {{ t('flows.staleGroups', { groups: coverage.stale }) }}</span>
        · {{ t('flows.statsNote') }}
      </p>

      <FlowVersions v-model:open="versionsOpen" :flow="target" @rolled-back="refreshFlows" />
      <FlowSimulate v-model:open="simulateOpen" :flow="target" />
      <ImportDialog v-model:open="importOpen" />
    </template>
  </div>
</template>
