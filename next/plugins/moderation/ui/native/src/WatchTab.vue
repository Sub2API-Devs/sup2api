<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useList } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SCheckbox, SField, SHint, SInput, SPagination, SSelect, STable, type SelectOption, type TableColumn } from '@sub2api/ui'
import WatchDetail from './WatchDetail.vue'
import WatchEditModal from './WatchEditModal.vue'
import WatchActions from './WatchActions.vue'
import AnalysisPromptModal from './AnalysisPromptModal.vue'
import CategoryChips from './CategoryChips.vue'
import FlowRef from './FlowRef.vue'
import UserRef from './UserRef.vue'
import { useCatalog } from './catalog'
import { applyFilters } from './forms'
import { dt, num } from './format'
import {
  analysisState,
  canManage,
  enumLabel,
  errorMessage,
  levelTone,
  trendTone,
  useModHost,
  watchListClient,
  type Watch,
  type WatchItem,
  type WatchListMeta
} from './host'
import { useUserFilter } from './users'

// Watch list (new-api watchlist): observe = moderated in the background and
// counted; enforce = moderated before the upstream call, a hit is refused.
// Filters, sort, header counts and per-user aggregates come from GET /watchlist.
const props = defineProps<{ preset?: { user_id: number; n: number } | null }>()
const emit = defineEmits<{ (e: 'show-user', userId: number): void }>()
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())
const catalog = useCatalog()

const meta = ref<WatchListMeta | null>(null)
const filter = reactive({ level: '', new_only: false, trend: '', category: '', sort: 'new', user: '' })
const users = useUserFilter()
const query = () => ({ level: filter.level, new_only: filter.new_only || '', trend: filter.trend, category: filter.category.trim(), sort: filter.sort, user_id: users.query.value.user_id ?? '', user_ids: users.query.value.user_ids ?? '' })

const list = useList<WatchItem>(watchListClient((m) => (meta.value = m)), '/watchlist', query())
const error = computed(() => (list.error.value ? errorMessage(list.error.value, t('watch.loadFailed')) : ''))
const apply = () => applyFilters(list.filters, query())
watch(() => [filter.level, filter.new_only, filter.trend, filter.sort], apply)

async function search() {
  if ((await users.resolve(filter.user)) && !apply()) list.reload()
}
defineExpose({ reload: list.reload })

const all = (opts: SelectOption[]): SelectOption[] => [{ value: '', label: t('events.all') }, ...opts]
const levelOptions = computed(() => all((['observe', 'enforce'] as const).map((v) => ({ value: v, label: t(`level.${v}`) }))))
const trendOptions = computed(() =>
  all([{ value: 'none', label: t('watchList.notAnalyzed') }, ...(['escalating', 'persistent', 'occasional', 'likely_false_positive'] as const).map((v) => ({ value: v, label: t(`trend.${v}`) }))])
)
const sortOptions = computed(() => (['new', 'last_hit', 'severity', 'total'] as const).map((v) => ({ value: v, label: t(`watchList.sort.${v}`) })))

const columns = computed<TableColumn[]>(() => [
  { key: 'user_id', label: t('watch.col.user') },
  { key: 'level', label: t('watch.col.level'), nowrap: true },
  { key: 'group', label: t('watchList.col.group') },
  { key: 'flow', label: t('events.col.flow'), nowrap: true },
  { key: 'suspicious', label: t('watchList.col.suspicious'), align: 'right', nowrap: true },
  { key: 'categories', label: t('watchList.col.categories') },
  { key: 'analysis', label: t('watch.col.analysis') },
  { key: 'last_hit_at', label: t('watch.col.lastHit'), nowrap: true },
  { key: 'expires_at', label: t('watch.col.expires'), nowrap: true },
  { key: 'actions', label: '', align: 'right' }
])

// ---- add / edit
const editOpen = ref(false)
const editing = ref<Watch | null>(null)
function openEdit(w: Watch | null) {
  editing.value = w
  editOpen.value = true
}

// ---- detail drawer and analysis prompt preview
const detailOpen = ref(false)
const detailUser = ref<number | null>(null)
const detailItem = computed(() => list.items.value.find((x) => x.user_id === detailUser.value) ?? null)
function openDetail(userId: number) {
  detailUser.value = userId
  detailOpen.value = true
}
watch(
  () => props.preset,
  (p) => p && openDetail(p.user_id),
  { immediate: true }
)

/** Keeps a row in step with an inline change or the drawer (null = removed). */
function patchRow(userId: number | null, w: Partial<Watch> | null) {
  const i = list.items.value.findIndex((x) => x.user_id === userId)
  if (i < 0) return
  if (w) list.items.value[i] = { ...list.items.value[i], ...w }
  else list.reload()
}
function showUser(id: number) {
  detailOpen.value = false
  emit('show-user', id)
}
const promptOpen = ref(false)
</script>

<template>
  <div>
    <SHint class="mod-hint">{{ t('watch.hint') }}</SHint>

    <SCard>
      <form class="mod-filters" @submit.prevent="search">
        <SField class="mod-filter" :label="t('watch.col.level')">
          <SSelect v-model="filter.level" :options="levelOptions" />
        </SField>
        <SField class="mod-filter" :label="t('watchList.trend')">
          <SSelect v-model="filter.trend" :options="trendOptions" />
        </SField>
        <SField class="mod-filter" :label="t('watchList.category')">
          <SInput v-model="filter.category" :placeholder="t('watchList.categoryPlaceholder')" />
        </SField>
        <SField class="mod-filter" :label="t('events.user')" :error="users.error.value">
          <SInput v-model="filter.user" type="search" :placeholder="t('events.userPlaceholder')" />
        </SField>
        <SField class="mod-filter" :label="t('watchList.sortBy')">
          <SSelect v-model="filter.sort" :options="sortOptions" />
        </SField>
        <SCheckbox v-model="filter.new_only" :label="t('watchList.newOnly')" class="mod-filter-check" />
        <div class="mod-filter-actions">
          <SButton type="submit" variant="primary" icon="search" :loading="list.loading.value">{{ t('events.search') }}</SButton>
          <SButton v-if="manage" icon="plus" @click="openEdit(null)">{{ t('watch.add') }}</SButton>
          <SButton icon="eyeglass" @click="promptOpen = true">{{ t('watch.promptPreview') }}</SButton>
        </div>
      </form>
    </SCard>

    <div v-if="meta" class="mod-counts mod-section">
      <SBadge tone="info">{{ t('watchList.counts.watching', { n: num(meta.counts.watching) }) }}</SBadge>
      <SBadge tone="warning">{{ t('watchList.counts.withNew', { n: num(meta.counts.watching_with_new) }) }}</SBadge>
      <SBadge tone="danger">{{ t('watchList.counts.blocking', { n: num(meta.counts.blocking) }) }}</SBadge>
      <SHint inline size="xs">{{ meta.analysis_every_violations ? t('watchList.every', { n: meta.analysis_every_violations }) : t('watchList.everyOff') }}</SHint>
    </div>

    <SAlert v-if="error" tone="danger" class="mod-section">{{ error }}</SAlert>

    <SCard :padded="false" class="mod-section">
      <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value" row-key="user_id" :empty-text="t('watch.empty')" dense clickable @row-click="openDetail($event.user_id)">
        <template #cell-user_id="{ row }">
          <UserRef :user-id="row.user_id" link :title="t('watch.showRecords')" @click="emit('show-user', $event)" />
          <div v-if="row.hits_since_seen"><SBadge tone="warning" size="xs">{{ t('watchList.newHits', { n: row.hits_since_seen }) }}</SBadge></div>
        </template>
        <template #cell-level="{ row }">
          <WatchActions v-if="manage" :user-id="row.user_id" :watch="row" @click.stop @changed="patchRow(row.user_id, $event)" />
          <SBadge v-else :tone="levelTone(row.level)">{{ enumLabel('level', row.level) }}</SBadge>
        </template>
        <template #cell-group="{ row }">
          <span v-if="row.group_id || row.flow">{{ catalog.groupName(row.group_id) }}</span>
          <SHint v-else inline>—</SHint>
          <div v-if="row.other_groups.length" class="mod-sub" :title="row.other_groups.map(catalog.groupName).join(', ')">{{ t('watchList.otherGroups', { n: row.other_groups.length }) }}</div>
        </template>
        <template #cell-flow="{ row }">
          <FlowRef v-if="row.flow" :flow-id="row.flow.flow_id" :version="row.flow.version" :name="row.flow.name" />
          <SHint v-else inline>{{ t('watchList.noFlow') }}</SHint>
        </template>
        <template #cell-suspicious="{ row }">
          <span class="mod-num">{{ num(row.suspicious_total) }}</span>
          <div class="mod-sub mod-num">
            <span class="mod-text-danger">{{ t('watchList.sev.high', { n: row.by_severity.high }) }}</span> ·
            <span class="mod-text-warning">{{ t('watchList.sev.medium', { n: row.by_severity.medium }) }}</span> ·
            {{ t('watchList.sev.low', { n: row.by_severity.low }) }}
          </div>
        </template>
        <template #cell-categories="{ row }"><CategoryChips :categories="row.top_categories" :other="row.top_other" /></template>
        <template #cell-analysis="{ row }">
          <SBadge v-if="analysisState(row) !== 'idle'" :tone="analysisState(row) === 'running' ? 'info' : 'warning'" dot>{{ enumLabel('analysisState', analysisState(row)) }}</SBadge>
          <SBadge v-else-if="row.latest_trend" :tone="trendTone(row.latest_trend)">{{ enumLabel('trend', row.latest_trend) }}</SBadge>
          <SBadge v-else-if="row.latest_analysis_status === 'failed'" tone="danger">{{ enumLabel('analysisStatus', 'failed') }}</SBadge>
          <SHint v-else inline>{{ t('watchList.notAnalyzed') }}</SHint>
          <div v-if="row.ai_counts" class="mod-sub mod-num">{{ t('analysis.counts', { v: num(row.ai_counts.violation), fp: num(row.ai_counts.false_positive), u: num(row.ai_counts.unsure) }) }}</div>
        </template>
        <template #cell-last_hit_at="{ row }">{{ dt(row.last_hit_at) }}</template>
        <template #cell-expires_at="{ row }">
          <template v-if="row.expires_at">{{ dt(row.expires_at) }}</template>
          <SBadge v-else tone="gray">{{ t('watch.noExpiry') }}</SBadge>
        </template>
        <template #cell-actions="{ row }">
          <SButton v-if="manage" size="sm" variant="ghost" @click.stop="openEdit(row)">{{ t('edit') }}</SButton>
        </template>
      </STable>
      <div class="mod-pager">
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </div>
    </SCard>

    <WatchEditModal v-model:open="editOpen" :entry="editing" @saved="list.reload" />
    <WatchDetail v-model:open="detailOpen" :user-id="detailUser" :item="detailItem" @changed="patchRow(detailUser, $event)" @show-user="showUser" />
    <AnalysisPromptModal v-model:open="promptOpen" />
  </div>
</template>
