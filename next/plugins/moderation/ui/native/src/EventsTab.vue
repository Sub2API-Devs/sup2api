<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  SAlert,
  SBulkBar,
  SButton,
  SCard,
  SDateTime,
  SField,
  SFilterBar,
  SFilterChips,
  SIcon,
  SInput,
  SPagination,
  SSelect,
  SDateRange,
  STable,
  STableColumnSettings,
  useTableColumns,
  useViewport,
  type RangeKey,
  type SelectOption,
  type TableColumn
} from '@sub2api/ui'
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
import { enumLabel, enumOptions, idText, isSuspicious, ms, num } from './format'
import { canManage, errorMessage, useEventList, useModHost } from './host'
import type { EventFilter, ReviewStatus } from './types'
import { useBulkReview } from './useBulkReview'
import { useUserFilter } from './users'

// Records (new-api records): a filter bar + paginated table (useList). The
// bar shows the common filters (search, time, result, user: a username,
// resolved to ids through the core, or an id); the others fold under "more
// filters". The applied ones of those, and the conditions only a link from
// the detail sets (request, endpoint, session), are removable chips under
// the bar. Each table cell keeps to one line; the secondary facts are in
// tooltips and optional columns. A row opens the detail modal (?record=<id>
// opens one directly); a user opens the user detail drawer; selected
// suspicious rows (hit, block) can be reviewed in bulk.
const props = defineProps<{ preset?: { user_id: number; n: number } | null }>()
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())
const catalog = useCatalog()
const { compact } = useViewport()

const emptyForm = () => ({
  result: 'suspicious',
  user: '',
  q: '',
  // more filters; conclusion and flow pair two query parameters (see paired)
  conclusion: '',
  severity: '',
  category: '',
  flow: '',
  group_id: '' as number | '',
  api_key_id: '',
  timing: '',
  watch_level: '',
  replayed: '',
  // set only from the record detail
  request_id: '',
  endpoint: '',
  session_fp: ''
})
type FormKey = keyof ReturnType<typeof emptyForm>
const form = reactive(emptyForm())
if (props.preset) form.user = String(props.preset.user_id)
const range = ref<RangeKey>('all')
const from = ref('')
const to = ref('')
const rangeKeys: RangeKey[] = ['all', 'today', '7d', '30d', 'custom']

/** The user filter resolved to user_id / user_ids. */
const users = useUserFilter(props.preset ? [props.preset.user_id] : null)

/**
 * Two query parameters in one select: an option value is "key:value" — the
 * conclusion's parameter (review_status / ai_verdict / verdict) and its
 * value, or a flow id and its version ('' = every version).
 */
const paired = (key: string | number, options: SelectOption[]) => options.map((o) => ({ ...o, value: `${key}:${o.value}` }))
function unpair(v: string): [string, string] {
  const i = v.indexOf(':')
  return i < 0 ? ['', ''] : [v.slice(0, i), v.slice(i + 1)]
}

function query() {
  const [verdictKey, verdictValue] = unpair(form.conclusion)
  const [flowId, flowVersion] = unpair(form.flow)
  return {
    result: form.result,
    timing: form.timing,
    review_status: verdictKey === 'review_status' ? verdictValue : '',
    ai_verdict: verdictKey === 'ai_verdict' ? verdictValue : '',
    verdict: verdictKey === 'verdict' ? verdictValue : '',
    severity: form.severity,
    watch_level: form.watch_level,
    replayed: form.replayed,
    category: form.category,
    flow_id: flowId ? Number(flowId) : '',
    flow_version: flowVersion ? Number(flowVersion) : '',
    group_id: form.group_id,
    api_key_id: form.api_key_id.trim(),
    user_id: users.query.value.user_id ?? '',
    user_ids: users.query.value.user_ids ?? '',
    request_id: form.request_id.trim(),
    endpoint: form.endpoint.trim(),
    session_fp: form.session_fp.trim(),
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

const resultOptions = computed(() => [
  { value: '', label: t('events.anyOf', { name: t('events.result') }) },
  { value: 'suspicious', label: t('events.suspicious') },
  ...enumOptions('result', ['block', 'hit', 'overturned', 'error', 'pass'])
])
const categories = useCategoryOptions()

interface FilterField {
  key: FormKey
  label: string
  /** a select (its first option: "<label>: all"), else a text input */
  options?: SelectOption[]
  searchable?: boolean
  placeholder?: string
}
const advancedFields = computed<FilterField[]>(() => {
  const groups = catalog.groupOptions()
  const fields: FilterField[] = [
    {
      key: 'conclusion',
      label: t('events.conclusion'),
      options: [
        { value: null, label: t('events.conclusionGroup.review'), options: paired('review_status', enumOptions('review', ['pending', 'confirmed', 'false_positive'])) },
        { value: null, label: t('events.conclusionGroup.ai'), options: paired('ai_verdict', enumOptions('aiVerdict', ['violation', 'false_positive', 'unsure', 'none'])) },
        {
          value: null,
          label: t('events.conclusionGroup.summary'),
          options: paired('verdict', [
            { value: 'needs_review', label: t('events.needsReview') },
            { value: 'disagree', label: t('events.disagree') }
          ])
        }
      ]
    },
    { key: 'severity', label: t('events.severity'), options: enumOptions('severity', ['high', 'medium', 'low']) },
    { key: 'category', label: t('events.category'), options: categories.value, searchable: true },
    {
      key: 'flow',
      label: t('events.col.flow'),
      searchable: true,
      // versions 1…current of each flow, newest first
      options: catalog.state.flows.map((f) => ({
        value: null,
        label: f.name,
        options: paired(f.id, [{ value: '', label: t('events.allVersions') }, ...Array.from({ length: f.version }, (_, i) => ({ value: f.version - i, label: `v${f.version - i}` }))])
      }))
    },
    { key: 'group_id', label: t('stats.group'), options: groups.length ? groups : undefined, searchable: true, placeholder: t('events.groupId') },
    { key: 'api_key_id', label: t('events.apiKey') },
    { key: 'timing', label: t('events.timing'), options: enumOptions('timing', ['pre', 'post']) },
    { key: 'watch_level', label: t('events.watch'), options: [{ value: 'any', label: t('events.watched') }, ...enumOptions('level', ['observe', 'enforce'])] },
    {
      key: 'replayed',
      label: t('replay.filter'),
      options: [
        { value: 'true', label: t('replay.only') },
        { value: 'false', label: t('replay.without') }
      ]
    }
  ]
  return fields.map((f) => (f.options ? { ...f, options: [{ value: '', label: t('events.anyOf', { name: f.label }) }, ...f.options] } : f))
})
const hiddenFields = computed<FilterField[]>(() => [
  { key: 'request_id', label: t('events.requestId') },
  { key: 'endpoint', label: t('events.endpoint') },
  { key: 'session_fp', label: t('events.session') }
])

const isSet = (key: FormKey) => String(form[key]).trim() !== ''
/** The label of a select's value, "group · option" inside an optgroup. */
function optionText(options: SelectOption[], value: unknown): string {
  const hit = options.flatMap((o) => (o.options ? o.options.map((c) => ({ c, group: o.label })) : [{ c: o, group: '' }])).find((x) => x.c.value === value)
  if (!hit) return String(value)
  return hit.group ? `${hit.group} · ${hit.c.label}` : hit.c.label
}
const chips = computed(() =>
  [...advancedFields.value, ...hiddenFields.value]
    .filter((f) => isSet(f.key))
    .map((f) => ({ key: f.key, label: f.label, value: f.options ? optionText(f.options, form[f.key]) : String(form[f.key]).trim() }))
)
const advancedCount = computed(() => advancedFields.value.filter((f) => isSet(f.key)).length)
/** Filters off their default in the phone sheet (Filters badge). */
const activeCount = computed(() => advancedCount.value + [range.value !== 'all', form.result !== 'suspicious', isSet('user')].filter(Boolean).length)
const dirty = computed(() => activeCount.value > 0 || chips.value.length > 0 || isSet('q'))

function removeChip(key: string) {
  form[key as FormKey] = ''
  apply()
}
function clearChips() {
  for (const f of [...advancedFields.value, ...hiddenFields.value]) form[f.key] = ''
  apply()
}

watch(
  () => [form.result, form.conclusion, form.severity, form.category, form.flow, form.group_id, form.timing, form.watch_level, form.replayed, from.value, to.value],
  apply
)
watch(
  () => props.preset,
  (p) => p && reset(String(p.user_id))
)

defineExpose({ reload: list.reload })

const columns = computed<TableColumn[]>(() => [
  { key: 'created_at', label: t('events.col.time'), nowrap: true, mobile: 'subtitle' },
  { key: 'result', label: t('events.col.result'), nowrap: true, mobile: 'status' },
  { key: 'timing', label: t('events.timing'), nowrap: true, defaultHidden: true, mobile: 'detail' },
  { key: 'verdict', label: t('events.col.verdict'), nowrap: true, mobile: 'meta' },
  { key: 'scores', label: t('events.col.categories'), nowrap: true, mobile: 'meta' },
  { key: 'stages', label: t('events.col.stages'), nowrap: true, mobile: 'meta' },
  { key: 'text_excerpt', label: t('events.col.text'), grow: true, mobile: 'title' },
  { key: 'user_id', label: t('events.col.user'), nowrap: true, mobile: 'subtitle' },
  { key: 'group_id', label: t('stats.group'), ellipsis: '10rem', defaultHidden: true, mobile: 'detail' },
  { key: 'api_key_id', label: t('events.apiKey'), nowrap: true, defaultHidden: true, mobile: 'detail' },
  { key: 'model', label: t('events.col.model'), ellipsis: '12rem', mobile: 'meta' },
  { key: 'endpoint', label: t('events.endpoint'), ellipsis: '12rem', defaultHidden: true, mobile: 'detail' },
  { key: 'flow', label: t('events.col.flow'), ellipsis: '12rem', mobile: 'detail' },
  { key: 'latency_ms', label: t('events.col.latency'), align: 'right', nowrap: true, mobile: 'detail' }
])
const columnState = useTableColumns(columns, 'moderation-events')

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

/**
 * From the record detail: the records of its endpoint or sticky session, or
 * of the request a replayed hit took its verdict from (alone: that request
 * may be another user's, of any result and time).
 */
function filterBy(q: EventFilter) {
  if (q.request_id) {
    range.value = 'all'
    from.value = to.value = ''
    Object.assign(form, emptyForm(), { result: '' })
  }
  Object.assign(form, q)
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
    <form @submit.prevent="search">
      <SFilterBar :aria-label="t('filter')" :active-count="activeCount" :advanced-count="advancedCount" :dirty="dirty" :on-reset="reset" @done="search">
        <template #primary>
          <SInput v-model="form.q" type="search" size="sm" icon="search" class="mod-filter-q" :placeholder="t('events.q')" :aria-label="t('events.q')" />
        </template>
        <SDateRange v-model:range="range" v-model:from="from" v-model:to="to" :keys="rangeKeys" size="sm" :label="false" />
        <SSelect v-model="form.result" size="sm" class="mod-filter-md" :options="resultOptions" :aria-label="t('events.result')" :title="t('events.result')" />
        <SField :error="users.error.value" class="mod-filter-sm">
          <SInput v-model="form.user" type="search" size="sm" :placeholder="t('events.userPlaceholder')" :aria-label="t('events.user')" />
        </SField>
        <template #advanced>
          <template v-for="f in advancedFields" :key="f.key">
            <SSelect v-if="f.options" v-model="form[f.key]" size="sm" :options="f.options" :searchable="f.searchable" :aria-label="f.label" :title="f.label" />
            <SInput v-else v-model="form[f.key]" size="sm" inputmode="numeric" :placeholder="f.placeholder || f.label" :aria-label="f.label" :title="f.label" />
          </template>
        </template>
        <template v-if="!compact" #end>
          <!-- The column settings sit in the search bar, not on a row of their own above the table. -->
          <STableColumnSettings :state="columnState" />
          <SButton type="submit" variant="primary" size="sm" icon="search" :loading="list.loading.value">{{ t('events.search') }}</SButton>
        </template>
      </SFilterBar>
    </form>
    <SFilterChips :items="chips" class="mod-filter-chips" @remove="removeChip" @clear="clearChips" />

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
        :columns="columnState.visibleColumns.value"
        :rows="list.items.value"
        :loading="list.loading.value"
        :empty-text="t('events.empty')"
        :selectable="manage"
        :row-selectable="isSuspicious"
        dense
        clickable
        @row-click="open($event.id)"
      >
        <template #cell-created_at="{ row }"><SDateTime :value="row.created_at" mode="time" /></template>
        <template #cell-result="{ row }">
          <span class="mod-cell-line" :title="row.timing ? enumLabel('timing', row.timing) : undefined">
            <ResultBadge :result="row.result" />
            <SIcon v-if="row.replayed" name="refresh" class="mod-replay-mark" :label="t('replay.badgeHint')" />
          </span>
        </template>
        <template #cell-timing="{ row }">{{ enumLabel('timing', row.timing) }}</template>
        <template #cell-verdict="{ row }"><VerdictBadge :event="row" /></template>
        <template #cell-scores="{ row }"><ScoreChips :trace="row.trace" /></template>
        <template #cell-stages="{ row }"><StagePath :trace="row.trace" /></template>
        <template #cell-text_excerpt="{ row }">
          <span class="mod-cell-line mod-text-cell">
            <span class="mod-ellipsis" :title="row.text_excerpt">{{ row.text_excerpt || '—' }}</span>
            <span v-if="row.image_count" class="mod-image-count" :title="t('events.images', { n: row.image_count })">
              <SIcon name="image" />
              {{ row.image_count }}
            </span>
          </span>
        </template>
        <template #cell-user_id="{ row }">
          <span class="mod-cell-line">
            <UserRef :user-id="row.user_id" link :title="t('events.openUser')" @click="openUser" />
            <SButton
              v-if="row.user_id"
              size="xs"
              variant="ghost"
              icon="filter"
              icon-only
              class="mod-row-tool"
              :aria-label="t('events.filterUser')"
              :title="t('events.filterUser')"
              @click.stop="filterUser(row.user_id)"
            />
          </span>
        </template>
        <template #cell-group_id="{ row }">{{ catalog.groupName(row.group_id) }}</template>
        <template #cell-api_key_id="{ row }"><span class="mod-num">{{ idText(row.api_key_id) }}</span></template>
        <template #cell-model="{ row }">
          <span :title="row.endpoint ? `${row.model} · ${row.endpoint}` : row.model">{{ row.model || '—' }}</span>
        </template>
        <template #cell-flow="{ row }"><FlowRef :flow-id="row.flow_id" :version="row.flow_version" compact /></template>
        <template #cell-latency_ms="{ row }">
          <span class="mod-num" :title="row.queue_ms ? t('detail.queued', { n: num(row.queue_ms) }) : undefined">{{ ms(row.latency_ms) }}</span>
        </template>
      </STable>
      <div class="mod-pager">
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </div>
    </SCard>

    <EventDetail v-model:open="detailOpen" :event-id="selected" filterable @deleted="onDeleted" @reviewed="onReviewed" @show-user="filterUser" @open-user="openUser" @filter="filterBy" />
    <WatchDetail v-model:open="userOpen" :user-id="userId" @show-user="filterUser" />
  </div>
</template>
