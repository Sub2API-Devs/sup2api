<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useList } from '@sub2api/host'
import { SAlert, SBadge, SBulkBar, SButton, SCard, SField, SHint, SInput, SPagination, SSelect, STable, STimeRange, type RangeKey, type TableColumn } from '@sub2api/ui'
import ResultBadge from './ResultBadge.vue'
import CategoryChips from './CategoryChips.vue'
import EventDetail from './EventDetail.vue'
import VerdictBadge from './VerdictBadge.vue'
import FlowLabel from './pages/FlowLabel.vue'
import ScoreChips from './pages/ScoreChips.vue'
import StagePath from './pages/StagePath.vue'
import UserCell from './pages/UserCell.vue'
import { topScores } from './pages/scores'
import { loadAuditors, loadFlows } from './pages/catalog'
import { canManage, enumLabel, errorMessage, reviewEvents, score, useModHost, type ModEvent, type ReviewStatus } from './host'
import { groupList, groupName, loadGroups } from './directory'

// Records: filters + paginated table (useList); a row opens the detail modal,
// selected rows can be reviewed in bulk.
const props = defineProps<{ preset?: { user_id: number; n: number } | null }>()
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const emptyForm = () => ({ result: 'suspicious', timing: '', review_status: '', ai_verdict: '', verdict: '', severity: '', watch_level: '', group_id: '' as string | number, flow_id: '', user_id: '', request_id: '', q: '' })
const form = reactive(emptyForm())
if (props.preset) form.user_id = String(props.preset.user_id)
const range = ref<RangeKey>('all')
const from = ref('')
const to = ref('')
const rangeKeys: RangeKey[] = ['all', 'today', '7d', '30d', 'custom']

function query() {
  return {
    result: form.result,
    timing: form.timing,
    review_status: form.review_status,
    ai_verdict: form.ai_verdict,
    verdict: form.verdict,
    severity: form.severity,
    watch_level: form.watch_level,
    group_id: String(form.group_id).trim(),
    flow_id: form.flow_id.trim(),
    user_id: form.user_id.trim(),
    request_id: form.request_id.trim(),
    q: form.q.trim(),
    from: from.value,
    to: to.value
  }
}

const list = useList<ModEvent>(host.pluginApi, '/events', query())
const error = computed(() => (list.error.value ? errorMessage(list.error.value, t('events.loadFailed')) : ''))

function apply(): boolean {
  const next = query()
  if (Object.entries(next).every(([k, v]) => list.filters[k] === v)) return false
  Object.assign(list.filters, next)
  return true
}

function search() {
  if (!apply()) list.reload()
}

function reset(userId = '') {
  Object.assign(form, emptyForm(), { user_id: userId })
  range.value = 'all'
  from.value = ''
  to.value = ''
  search()
}

const withAll = (opts: Array<{ value: string; label: string }>) => [{ value: '', label: t('events.all') }, ...opts]
const opts = (group: string, values: string[]) => values.map((v) => ({ value: v, label: t(`${group}.${v}`) }))
const resultOptions = computed(() => withAll([{ value: 'suspicious', label: t('events.suspicious') }, ...opts('result', ['block', 'hit', 'overturned', 'error', 'pass'])]))
const timingOptions = computed(() => withAll(opts('timing', ['pre', 'post'])))
const reviewOptions = computed(() => withAll(opts('review', ['pending', 'false_positive', 'confirmed'])))
const severityOptions = computed(() => withAll(opts('severity', ['high', 'medium', 'low'])))
const watchOptions = computed(() => withAll([{ value: 'any', label: t('events.watched') }, ...opts('level', ['observe', 'enforce'])]))
const aiVerdictOptions = computed(() => withAll(opts('aiVerdict', ['violation', 'false_positive', 'unsure', 'none'])))
const verdictOptions = computed(() => withAll([{ value: 'needs_review', label: t('events.needsReview') }, { value: 'disagree', label: t('events.disagree') }]))
// Groups come from the core (group:read); without it the filter takes an id.
loadGroups()
const groupOptions = computed(() => withAll([0, ...(groupList() || []).map((g) => g.id)].map((id) => ({ value: String(id), label: groupName(id) }))))
const hasGroups = computed(() => !!groupList()?.length)

watch(() => [form.result, form.timing, form.review_status, form.ai_verdict, form.verdict, form.severity, form.watch_level, form.group_id, from.value, to.value], apply)
watch(
  () => props.preset,
  (p) => p && reset(String(p.user_id))
)

// The header refresh also refreshes the flow names and current versions.
defineExpose({ reload: () => Promise.all([list.reload(), loadFlows(true), loadAuditors(true)]) })

const columns = computed<TableColumn[]>(() => [
  { key: 'created_at', label: t('events.col.time'), width: '10.5rem', nowrap: true },
  { key: 'result', label: t('events.col.result'), nowrap: true },
  { key: 'hit_categories', label: t('events.col.categories') },
  { key: 'scores', label: t('pagesP3.events.scores') },
  { key: 'path', label: t('pagesP3.events.path'), nowrap: true },
  { key: 'verdict', label: t('events.col.verdict'), nowrap: true },
  { key: 'text_excerpt', label: t('events.col.text'), ellipsis: '22rem' },
  { key: 'user_id', label: t('events.col.user') },
  { key: 'model', label: t('events.col.model'), ellipsis: '10rem' },
  { key: 'flow', label: t('events.col.flow'), nowrap: true },
  { key: 'latency_ms', label: t('events.col.latency'), align: 'right', nowrap: true }
])

const selected = ref<number | null>(null)
const detailOpen = ref(false)
function open(row: ModEvent) {
  selected.value = row.id
  detailOpen.value = true
}

function onDeleted(id: number) {
  list.items.value = list.items.value.filter((r) => r.id !== id)
  list.total.value = Math.max(0, list.total.value - 1)
  if (!list.items.value.length && list.page.value > 1) list.page.value--
}

function onReviewed(ids: number[], status: ReviewStatus) {
  for (const r of list.items.value) if (ids.includes(r.id)) r.review_status = status
}

function filterUser(id: number | null | undefined) {
  if (!id) return
  form.user_id = String(id)
  search()
}

// Bulk review of the selected rows.
const checked = ref<number[]>([])
const reviewing = ref(false)
watch(() => list.items.value, () => (checked.value = []))
async function review(status: ReviewStatus) {
  const ids = [...checked.value]
  if (!ids.length) return
  reviewing.value = true
  try {
    await reviewEvents(ids, status)
    onReviewed(ids, status)
    checked.value = []
    host.toast(t('review.done', { n: ids.length }), 'success')
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    reviewing.value = false
  }
}
</script>

<template>
  <div>
    <SCard>
      <form class="mod-filters" @submit.prevent="search">
        <SField class="mod-filter" :label="t('events.result')">
          <SSelect v-model="form.result" :options="resultOptions" />
        </SField>
        <SField class="mod-filter" :label="t('events.review')">
          <SSelect v-model="form.review_status" :options="reviewOptions" />
        </SField>
        <SField class="mod-filter" :label="t('events.aiVerdict')">
          <SSelect v-model="form.ai_verdict" :options="aiVerdictOptions" />
        </SField>
        <SField class="mod-filter" :label="t('events.verdict')">
          <SSelect v-model="form.verdict" :options="verdictOptions" />
        </SField>
        <SField class="mod-filter" :label="t('events.timing')">
          <SSelect v-model="form.timing" :options="timingOptions" />
        </SField>
        <SField class="mod-filter" :label="t('events.severity')">
          <SSelect v-model="form.severity" :options="severityOptions" />
        </SField>
        <SField class="mod-filter" :label="t('events.watch')">
          <SSelect v-model="form.watch_level" :options="watchOptions" />
        </SField>
        <SField class="mod-filter" :label="t('pagesP3.events.group')">
          <SSelect v-if="hasGroups" v-model="form.group_id" :options="groupOptions" searchable />
          <SInput v-else v-model="form.group_id" inputmode="numeric" :placeholder="t('pagesP3.events.groupId')" />
        </SField>
        <SField class="mod-filter" :label="t('events.userId')">
          <SInput v-model="form.user_id" inputmode="numeric" />
        </SField>
        <SField class="mod-filter" :label="t('events.flowId')">
          <SInput v-model="form.flow_id" inputmode="numeric" />
        </SField>
        <SField class="mod-filter" :label="t('events.requestId')">
          <SInput v-model="form.request_id" />
        </SField>
        <SField class="mod-filter mod-filter-wide" :label="t('events.q')">
          <SInput v-model="form.q" type="search" />
        </SField>
        <STimeRange v-model:range="range" v-model:from="from" v-model:to="to" :keys="rangeKeys" />
        <div class="mod-filter-actions">
          <SButton type="submit" variant="primary" icon="search" :loading="list.loading.value">{{ t('events.search') }}</SButton>
          <SButton @click="reset()">{{ t('events.reset') }}</SButton>
        </div>
      </form>
    </SCard>

    <SAlert v-if="error" tone="danger" class="mod-section">{{ error }}</SAlert>

    <SBulkBar v-if="manage" :count="checked.length" :total="list.total.value" :page-selected="checked.length === list.items.value.length" class="mod-section" @select-page="checked = list.items.value.map((r) => r.id)" @clear="checked = []">
      <template #idle>{{ t('review.hint') }}</template>
      <SButton size="sm" :loading="reviewing" @click="review('false_positive')">{{ t('review.falsePositive') }}</SButton>
      <SButton size="sm" variant="danger" :loading="reviewing" @click="review('confirmed')">{{ t('review.confirmed') }}</SButton>
      <SButton size="sm" variant="ghost" :loading="reviewing" @click="review('pending')">{{ t('review.reset') }}</SButton>
    </SBulkBar>

    <SCard :padded="false" class="mod-section">
      <STable
        v-model:selected="checked"
        :columns="columns"
        :rows="list.items.value"
        :loading="list.loading.value"
        :empty-text="t('events.empty')"
        :selectable="manage"
        dense
        clickable
        @row-click="open"
      >
        <template #cell-created_at="{ row }">{{ host.i18n.formatDateTime(row.created_at) }}</template>
        <template #cell-result="{ row }">
          <ResultBadge :result="row.result" />
          <div class="mod-sub">{{ enumLabel('timing', row.timing) }}</div>
        </template>
        <template #cell-hit_categories="{ row }"><CategoryChips :categories="row.hit_categories" /></template>
        <template #cell-scores="{ row }">
          <ScoreChips v-if="topScores(row.trace).length" :scores="topScores(row.trace)" />
          <span v-else class="mod-num">{{ row.highest_category ? score(row.highest_score) : '—' }}</span>
          <div v-if="row.severity" class="mod-sub">{{ enumLabel('severity', row.severity) }}</div>
        </template>
        <template #cell-path="{ row }">
          <StagePath v-if="row.trace" :trace="row.trace" :result="row.result" compact />
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-verdict="{ row }"><VerdictBadge :event="row" /></template>
        <template #cell-text_excerpt="{ row }">
          <span :title="row.text_excerpt">{{ row.text_excerpt || '—' }}</span>
          <SBadge v-if="row.image_count" size="xs" tone="gray" class="mod-ml">{{ t('events.images', { n: row.image_count }) }}</SBadge>
        </template>
        <template #cell-user_id="{ row }">
          <UserCell :id="row.user_id" link :title="t('events.filterUser')" @open="filterUser" />
          <div v-if="row.group_id || hasGroups" class="mod-sub">{{ groupName(row.group_id) }}</div>
        </template>
        <template #cell-flow="{ row }"><FlowLabel :flow-id="row.flow_id" :version="row.flow_version" /></template>
        <template #cell-latency_ms="{ row }">
          <span class="mod-num">{{ t('ms', { n: host.i18n.formatNumber(row.latency_ms) }) }}</span>
          <div v-if="row.queue_ms" class="mod-sub mod-num" :title="t('pagesP3.events.queueHint')">{{ t('detail.queued', { n: host.i18n.formatNumber(row.queue_ms) }) }}</div>
        </template>
      </STable>
      <div class="mod-pager">
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </div>
    </SCard>

    <EventDetail v-model:open="detailOpen" :event-id="selected" @deleted="onDeleted" @reviewed="onReviewed" />
  </div>
</template>
