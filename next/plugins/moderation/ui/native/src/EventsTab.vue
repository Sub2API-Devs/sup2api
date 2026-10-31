<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { SAlert, SBadge, SBulkBar, SButton, SCard, SField, SInput, SPagination, SSelect, STable, STimeRange, type RangeKey, type TableColumn } from '@sub2api/ui'
import ResultBadge from './ResultBadge.vue'
import ReviewActions from './ReviewActions.vue'
import WatchDetail from './WatchDetail.vue'
import ScoreChips from './ScoreChips.vue'
import StagePath from './StagePath.vue'
import EventDetail from './EventDetail.vue'
import FlowRef from './FlowRef.vue'
import UserRef from './UserRef.vue'
import VerdictBadge from './VerdictBadge.vue'
import { useCatalog } from './catalog'
import { useCategoryOptions } from './categories'
import { applyFilters } from './forms'
import { dt, enumLabel, enumOptions, isSuspicious, ms, num, withAll } from './format'
import { canManage, errorMessage, useEventList, useModHost } from './host'
import type { ReviewStatus } from './types'
import { useBulkReview } from './useBulkReview'
import { useUserFilter } from './users'

// Records (new-api records): filters + paginated table (useList); the user
// filter takes a username (resolved to ids through the core) or an id. A row
// opens the detail modal (?record=<id> opens one directly); a user opens the
// user detail drawer; selected suspicious rows (hit, block) can be reviewed
// in bulk.
const props = defineProps<{ preset?: { user_id: number; n: number } | null }>()
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())
const catalog = useCatalog()

const emptyForm = () => ({
  result: 'suspicious',
  timing: '',
  review_status: '',
  ai_verdict: '',
  verdict: '',
  severity: '',
  watch_level: '',
  category: '',
  flow_id: '' as number | '',
  flow_version: '' as number | '',
  group_id: '' as number | '',
  api_key_id: '',
  user: '',
  request_id: '',
  q: ''
})
const form = reactive(emptyForm())
if (props.preset) form.user = String(props.preset.user_id)
const range = ref<RangeKey>('all')
const from = ref('')
const to = ref('')
const rangeKeys: RangeKey[] = ['all', 'today', '7d', '30d', 'custom']

/** The user filter resolved to user_id / user_ids. */
const users = useUserFilter(props.preset ? [props.preset.user_id] : null)

function query() {
  return {
    result: form.result,
    timing: form.timing,
    review_status: form.review_status,
    ai_verdict: form.ai_verdict,
    verdict: form.verdict,
    severity: form.severity,
    watch_level: form.watch_level,
    category: form.category,
    flow_id: form.flow_id,
    flow_version: form.flow_id === '' ? '' : form.flow_version,
    group_id: form.group_id,
    api_key_id: form.api_key_id.trim(),
    user_id: users.query.value.user_id ?? '',
    user_ids: users.query.value.user_ids ?? '',
    request_id: form.request_id.trim(),
    q: form.q.trim(),
    from: from.value,
    to: to.value
  }
}

const list = useEventList(query())
const error = computed(() => (list.error.value ? errorMessage(list.error.value, t('events.loadFailed')) : ''))

const apply = () => applyFilters(list.filters, query())

async function search() {
  if ((await users.resolve(form.user)) && !apply()) list.reload()
}

function reset(user = '') {
  Object.assign(form, emptyForm(), { user })
  range.value = 'all'
  from.value = ''
  to.value = ''
  search()
}

const all = { all: true }
const resultOptions = computed(() => withAll([{ value: 'suspicious', label: t('events.suspicious') }, ...enumOptions('result', ['block', 'hit', 'overturned', 'error', 'pass'])]))
const timingOptions = computed(() => enumOptions('timing', ['pre', 'post'], all))
const reviewOptions = computed(() => enumOptions('review', ['pending', 'false_positive', 'confirmed'], all))
const severityOptions = computed(() => enumOptions('severity', ['high', 'medium', 'low'], all))
const watchOptions = computed(() => withAll([{ value: 'any', label: t('events.watched') }, ...enumOptions('level', ['observe', 'enforce'])]))
const aiVerdictOptions = computed(() => enumOptions('aiVerdict', ['violation', 'false_positive', 'unsure', 'none'], all))
const verdictOptions = computed(() => withAll([{ value: 'needs_review', label: t('events.needsReview') }, { value: 'disagree', label: t('events.disagree') }]))
const categories = useCategoryOptions()
const categoryOptions = computed(() => withAll(categories.value))
const flowOptions = computed(() => withAll(catalog.state.flows.map((f) => ({ value: f.id, label: f.name }))))
/** versions 1…current of the chosen flow, newest first */
const versionOptions = computed(() => {
  const n = form.flow_id === '' ? 0 : (catalog.flow(form.flow_id)?.version ?? 0)
  return withAll(Array.from({ length: n }, (_, i) => ({ value: n - i, label: `v${n - i}` })))
})
const groupOptions = computed(() => withAll(catalog.groupOptions()))

watch(
  () => [form.result, form.timing, form.review_status, form.ai_verdict, form.verdict, form.severity, form.watch_level, form.category, form.flow_id, form.flow_version, form.group_id, from.value, to.value],
  apply
)
watch(
  () => form.flow_id,
  () => (form.flow_version = '')
)
watch(
  () => props.preset,
  (p) => p && reset(String(p.user_id))
)

defineExpose({ reload: list.reload })

const columns = computed<TableColumn[]>(() => [
  { key: 'created_at', label: t('events.col.time'), width: '10.5rem', nowrap: true },
  { key: 'result', label: t('events.col.result'), nowrap: true },
  { key: 'scores', label: t('events.col.scores') },
  { key: 'stages', label: t('events.col.stages'), nowrap: true },
  { key: 'verdict', label: t('events.col.verdict'), nowrap: true },
  { key: 'text_excerpt', label: t('events.col.text'), ellipsis: '20rem' },
  { key: 'user_id', label: t('events.col.user') },
  { key: 'model', label: t('events.col.model'), ellipsis: '10rem' },
  { key: 'flow', label: t('events.col.flow'), nowrap: true },
  { key: 'latency_ms', label: t('events.col.latency'), align: 'right', nowrap: true }
])

// The open record follows ?record=<id>, so a record can be linked to.
const selected = ref<number | null>(null)
const detailOpen = ref(false)
function open(id: number) {
  selected.value = id
  detailOpen.value = true
}
const deepLink = Number(host.router.currentRoute.value.query.record)
if (Number.isSafeInteger(deepLink) && deepLink > 0) open(deepLink)
watch([detailOpen, selected], ([isOpen, id]) => {
  const route = host.router.currentRoute.value
  const record = isOpen && id ? String(id) : undefined
  if (route.query.record !== record) host.router.replace({ query: { ...route.query, record } })
})

function onDeleted(id: number) {
  list.items.value = list.items.value.filter((r) => r.id !== id)
  list.total.value = Math.max(0, list.total.value - 1)
  if (!list.items.value.length && list.page.value > 1) list.page.value--
}

function onReviewed(ids: number[], status: ReviewStatus) {
  for (const r of list.items.value) if (ids.includes(r.id)) r.review_status = status
}

function filterUser(id: number) {
  userOpen.value = false
  form.user = String(id)
  search()
}

// User detail drawer (GET /users/:user_id), for any user of a record.
const userOpen = ref(false)
const userId = ref<number | null>(null)
function openUser(id: number) {
  userId.value = id
  userOpen.value = true
}

const { checked, reviewing, review } = useBulkReview(onReviewed)
/** rows of the page that can be reviewed (suspicious) */
const reviewable = computed(() => list.items.value.filter(isSuspicious))
watch(() => list.items.value, () => (checked.value = []))
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
        <SField class="mod-filter" :label="t('events.user')" :error="users.error.value">
          <SInput v-model="form.user" type="search" :placeholder="t('events.userPlaceholder')" />
        </SField>
        <SField class="mod-filter" :label="t('events.category')">
          <SSelect v-model="form.category" :options="categoryOptions" searchable />
        </SField>
        <SField class="mod-filter" :label="t('events.col.flow')">
          <SSelect v-model="form.flow_id" :options="flowOptions" searchable />
        </SField>
        <SField class="mod-filter" :label="t('events.flowVersion')">
          <SSelect v-model="form.flow_version" :options="versionOptions" :disabled="form.flow_id === ''" />
        </SField>
        <SField class="mod-filter" :label="t('stats.group')">
          <SSelect v-if="groupOptions.length > 1" v-model="form.group_id" :options="groupOptions" searchable />
          <SInput v-else v-model="form.group_id" inputmode="numeric" :placeholder="t('events.groupId')" />
        </SField>
        <SField class="mod-filter" :label="t('events.apiKey')">
          <SInput v-model="form.api_key_id" inputmode="numeric" :placeholder="t('events.apiKeyPlaceholder')" />
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

    <SBulkBar
      v-if="manage"
      :count="checked.length"
      :total="list.total.value"
      :page-selected="checked.length > 0 && checked.length === reviewable.length"
      class="mod-section"
      @select-page="checked = reviewable.map((r) => r.id)"
      @clear="checked = []"
    >
      <template #idle>{{ t('review.hint') }}</template>
      <ReviewActions :loading="reviewing" @review="review" />
    </SBulkBar>

    <SCard :padded="false" class="mod-section">
      <STable
        v-model:selected="checked"
        :columns="columns"
        :rows="list.items.value"
        :loading="list.loading.value"
        :empty-text="t('events.empty')"
        :selectable="manage"
        :row-selectable="isSuspicious"
        dense
        clickable
        @row-click="open($event.id)"
      >
        <template #cell-created_at="{ row }">{{ dt(row.created_at) }}</template>
        <template #cell-result="{ row }">
          <ResultBadge :result="row.result" />
          <div class="mod-sub">{{ enumLabel('timing', row.timing) }}</div>
        </template>
        <template #cell-scores="{ row }"><ScoreChips :trace="row.trace" /></template>
        <template #cell-stages="{ row }"><StagePath :trace="row.trace" /></template>
        <template #cell-verdict="{ row }"><VerdictBadge :event="row" /></template>
        <template #cell-text_excerpt="{ row }">
          <span :title="row.text_excerpt">{{ row.text_excerpt || '—' }}</span>
          <SBadge v-if="row.image_count" size="xs" tone="gray" class="mod-ml">{{ t('events.images', { n: row.image_count }) }}</SBadge>
        </template>
        <template #cell-user_id="{ row }">
          <UserRef :user-id="row.user_id" link :title="t('events.openUser')" @click="openUser" />
          <SButton size="xs" variant="ghost" icon="filter" icon-only :aria-label="t('events.filterUser')" :title="t('events.filterUser')" @click.stop="filterUser(row.user_id)" />
        </template>
        <template #cell-flow="{ row }"><FlowRef :flow-id="row.flow_id" :version="row.flow_version" /></template>
        <template #cell-latency_ms="{ row }">
          <span class="mod-num">{{ ms(row.latency_ms) }}</span>
          <div v-if="row.queue_ms" class="mod-sub mod-num">{{ t('detail.queued', { n: num(row.queue_ms) }) }}</div>
        </template>
      </STable>
      <div class="mod-pager">
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </div>
    </SCard>

    <EventDetail v-model:open="detailOpen" :event-id="selected" @deleted="onDeleted" @reviewed="onReviewed" @show-user="filterUser" @open-user="openUser" />
    <WatchDetail v-model:open="userOpen" :user-id="userId" @show-user="filterUser" />
  </div>
</template>
