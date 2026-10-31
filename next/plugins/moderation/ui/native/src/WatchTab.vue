<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { isApiError, useList } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SChip, SField, SHint, SInput, SModal, SPagination, SSegmented, SSelect, SSwitch, STable, STextarea, type TableColumn } from '@sub2api/ui'
import WatchDetail from './WatchDetail.vue'
import AnalysisPromptModal from './AnalysisPromptModal.vue'
import UserCell from './pages/UserCell.vue'
import NextAnalysisText from './pages/NextAnalysisText.vue'
import { loadStatus, status } from './pages/catalog'
import {
  analysisState,
  canManage,
  categoryLabel,
  createWatch,
  deleteWatch,
  enumLabel,
  errorMessage,
  fetchDefaults,
  levelTone,
  suggestionTone,
  trendTone,
  updateWatch,
  useModHost,
  type Watch,
  type WatchLevel
} from './host'
import { groupName, loadGroups } from './directory'
import type { WatchItem, WatchSort } from './stats'

// Watch list (CONTRACTS §72.8, §72.14.3): observe = moderated in the
// background and counted; enforce = moderated before the upstream call, a
// hit is refused. Filters, sort and per-row figures follow new-api.
const emit = defineEmits<{ (e: 'show-user', userId: number): void }>()
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => host.i18n.formatNumber(v ?? 0)
const manage = computed(() => canManage())

const filter = reactive({ level: '', with_new: false, trend: '', category: '', q: '', sort: 'new' as WatchSort })
const query = () => ({ level: filter.level, with_new: filter.with_new ? 1 : '', trend: filter.trend, category: filter.category, q: filter.q.trim(), sort: filter.sort })
const list = useList<WatchItem>(host.pluginApi, '/watchlist', query())
const error = computed(() => (list.error.value ? errorMessage(list.error.value, t('watch.loadFailed')) : ''))
watch(
  () => [filter.level, filter.with_new, filter.trend, filter.category, filter.sort],
  () => Object.assign(list.filters, query())
)
function search() {
  Object.assign(list.filters, query())
  list.reload()
}

onMounted(() => {
  loadGroups()
  loadStatus()
})
async function reload() {
  await Promise.all([list.reload(), loadStatus(true)])
}
defineExpose({ reload })
const counts = computed(() => status.value?.watch)
const every = computed(() => status.value?.watch.analysis_every_violations ?? 0)

const levelOptions = computed(() => [
  { value: '', label: t('events.all') },
  { value: 'observe', label: t('level.observe') },
  { value: 'enforce', label: t('level.enforce') }
])
const trendOptions = computed(() => [
  { value: '', label: t('pagesP3.watch.allTrends') },
  ...['escalating', 'persistent', 'occasional', 'likely_false_positive'].map((v) => ({ value: v, label: t(`trend.${v}`) })),
  { value: 'none', label: t('pagesP3.watch.trendNone') }
])
const sortOptions = computed(() => (['new', 'last_hit', 'severity', 'total'] as WatchSort[]).map((v) => ({ value: v, label: t(`pagesP3.watch.sortBy.${v}`) })))

// Categories of the default auditors (OpenAI, Jev, LLM) for the category filter.
const categories = ref<Array<{ value: string; label: string }>>([])
onMounted(async () => {
  const d = await fetchDefaults().catch(() => null)
  if (!d) return
  const seen = new Map<string, string>()
  for (const c of d.openai_categories) seen.set(c, categoryLabel(c))
  for (const q of d.default.items) seen.set(q.category, categoryLabel(q.category, q.label))
  for (const c of d.llm_categories) if (!seen.has(c.id)) seen.set(c.id, categoryLabel(c.id))
  categories.value = [...seen].map(([value, label]) => ({ value, label }))
})
const categoryOptions = computed(() => {
  const opts = [{ value: '', label: t('pagesP3.watch.allCategories') }, ...categories.value]
  if (filter.category && !opts.some((o) => o.value === filter.category)) opts.push({ value: filter.category, label: categoryLabel(filter.category) })
  return opts
})

const columns = computed<TableColumn[]>(() => [
  { key: 'user_id', label: t('watch.col.user') },
  { key: 'level', label: t('watch.col.level'), nowrap: true },
  { key: 'new', label: t('pagesP3.watch.col.new'), nowrap: true, align: 'right' },
  { key: 'suspicious', label: t('pagesP3.watch.col.suspicious') },
  { key: 'categories', label: t('pagesP3.watch.col.categories') },
  { key: 'groups', label: t('pagesP3.watch.col.groups') },
  { key: 'next', label: t('pagesP3.next.title'), nowrap: true },
  { key: 'last_hit_at', label: t('watch.col.lastHit'), nowrap: true },
  { key: 'analysis', label: t('watch.col.analysis'), nowrap: true },
  { key: 'expires_at', label: t('watch.col.expires'), nowrap: true },
  { key: 'actions', label: '', align: 'right' }
])

// ---- add / edit
const editOpen = ref(false)
const editing = ref<Watch | null>(null)
const form = reactive<{ user_id: string; level: WatchLevel; days: number | null; note: string; reason: string }>({ user_id: '', level: 'observe', days: 30, note: '', reason: '' })
const formErr = reactive<Record<string, string>>({})
const saving = ref(false)

function openAdd() {
  editing.value = null
  Object.assign(form, { user_id: '', level: 'observe', days: 30, note: '', reason: '' })
  for (const k of Object.keys(formErr)) delete formErr[k]
  editOpen.value = true
}

function openEdit(w: Watch) {
  editing.value = w
  const days = w.expires_at ? Math.max(1, Math.ceil((new Date(w.expires_at).getTime() - Date.now()) / 86400000)) : 0
  Object.assign(form, { user_id: String(w.user_id), level: w.level, days, note: w.note, reason: '' })
  for (const k of Object.keys(formErr)) delete formErr[k]
  editOpen.value = true
}

async function save() {
  for (const k of Object.keys(formErr)) delete formErr[k]
  const days = form.days === null || String(form.days).trim() === '' ? 0 : Number(form.days)
  const reason = form.reason.trim() || undefined
  saving.value = true
  try {
    if (editing.value) {
      await updateWatch(editing.value.user_id, { level: form.level, days, note: form.note, reason })
    } else {
      const uid = Number(form.user_id.trim())
      if (!Number.isSafeInteger(uid) || uid <= 0) {
        formErr.user_id = t('blocks.invalidUser')
        return
      }
      await createWatch({ user_id: uid, level: form.level, days, note: form.note, reason })
    }
    host.toast(t('watch.saved'), 'success')
    editOpen.value = false
    reload()
  } catch (e) {
    const fields = isApiError(e) ? e.fields : {}
    Object.assign(formErr, fields)
    if (!Object.keys(fields).length) host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    saving.value = false
  }
}

async function remove(w: Watch) {
  const ok = await host.confirm({ message: t('watch.removeConfirm', { id: w.user_id }), confirmText: t('watch.remove') })
  if (!ok) return
  try {
    await deleteWatch(w.user_id)
    host.toast(t('watch.removed', { id: w.user_id }), 'success')
    reload()
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  }
}

// ---- detail drawer and analysis prompt preview
const detailOpen = ref(false)
const detailUser = ref<number | null>(null)
function openDetail(w: Watch) {
  detailUser.value = w.user_id
  detailOpen.value = true
}
/** Keeps the row in step with the drawer (analysis state, level, removal). */
function onDetailChanged(w: Watch | null) {
  const i = list.items.value.findIndex((x) => x.user_id === detailUser.value)
  if (i < 0) return
  if (w) list.items.value[i] = { ...list.items.value[i], ...w }
  else reload()
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
        <SField class="mod-filter" :label="t('pagesP3.watch.trend')">
          <SSelect v-model="filter.trend" :options="trendOptions" />
        </SField>
        <SField class="mod-filter" :label="t('pagesP3.watch.category')">
          <SSelect v-model="filter.category" :options="categoryOptions" searchable />
        </SField>
        <SField class="mod-filter" :label="t('events.userId')">
          <SInput v-model="filter.q" inputmode="numeric" />
        </SField>
        <SField class="mod-filter" :label="t('pagesP3.watch.sort')">
          <SSelect v-model="filter.sort" :options="sortOptions" />
        </SField>
        <SField class="mod-filter" :label="t('pagesP3.watch.withNew')">
          <SSwitch v-model="filter.with_new" :aria-label="t('pagesP3.watch.withNew')" />
        </SField>
        <div class="mod-filter-actions">
          <SButton type="submit" variant="primary" icon="search" :loading="list.loading.value">{{ t('events.search') }}</SButton>
          <SButton v-if="manage" icon="plus" @click="openAdd">{{ t('watch.add') }}</SButton>
          <SButton icon="eyeglass" @click="promptOpen = true">{{ t('watch.promptPreview') }}</SButton>
        </div>
      </form>
    </SCard>

    <div v-if="counts" class="mod-pg-counts mod-section">
      <SBadge tone="info">{{ t('pagesP3.watch.watching', { n: n(counts.watching) }) }}</SBadge>
      <SBadge :tone="counts.watching_with_new ? 'warning' : 'gray'">{{ t('pagesP3.watch.withNewN', { n: n(counts.watching_with_new) }) }}</SBadge>
      <SBadge :tone="counts.blocking ? 'danger' : 'gray'">{{ t('pagesP3.watch.blocking', { n: n(counts.blocking) }) }}</SBadge>
      <SHint inline size="xs">{{ counts.analysis_every_violations > 0 ? t('pagesP3.watch.every', { n: counts.analysis_every_violations }) : t('pagesP3.next.offHint') }}</SHint>
    </div>

    <SAlert v-if="error" tone="danger" class="mod-section">{{ error }}</SAlert>

    <SCard :padded="false" class="mod-section">
      <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value" row-key="user_id" :empty-text="t('watch.empty')" dense clickable @row-click="openDetail">
        <template #cell-user_id="{ row }">
          <UserCell :id="row.user_id" link :title="t('watch.showRecords')" @open="emit('show-user', $event)" />
          <div v-if="row.note" class="mod-sub mod-pg-note" :title="row.note">{{ row.note }}</div>
        </template>
        <template #cell-level="{ row }">
          <SBadge :tone="levelTone(row.level)">{{ enumLabel('level', row.level) }}</SBadge>
          <div class="mod-sub">{{ enumLabel('watchSource', row.source) }}</div>
        </template>
        <template #cell-new="{ row }">
          <span v-if="row.hits_since_seen" class="mod-pg-new">{{ t('pagesP3.watch.newN', { n: n(row.hits_since_seen) }) }}</span>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-suspicious="{ row }">
          <b class="mod-num">{{ t('pagesP3.watch.suspiciousN', { n: n(row.suspicious_total) }) }}</b>
          <span class="mod-sub mod-num"> {{ t('pagesP3.watch.sev', { high: n(row.severity?.high), medium: n(row.severity?.medium), low: n(row.severity?.low) }) }}</span>
          <div class="mod-sub mod-num">
            <template v-if="row.ai_counts">{{ t('analysis.counts', { v: n(row.ai_counts.violation), fp: n(row.ai_counts.false_positive), u: n(row.ai_counts.unsure) }) }}</template>
            <template v-else>{{ t('pagesP3.watch.aiNone') }}</template>
          </div>
        </template>
        <template #cell-categories="{ row }">
          <span v-if="row.top_categories?.length" class="mod-pg-cats">
            <SChip v-for="c in row.top_categories" :key="c.category" size="xs" tone="warning" :title="c.category">{{ categoryLabel(c.category) }} {{ n(c.count) }}</SChip>
            <span v-if="row.other_categories" class="mod-sub">{{ t('pagesP3.watch.otherN', { n: n(row.other_categories) }) }}</span>
          </span>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-groups="{ row }">
          <span v-if="row.groups?.length" :title="row.groups.map(groupName).join('、')">
            {{ groupName(row.groups[0]) }}<SBadge v-if="row.groups.length > 1" size="xs" tone="gray" class="mod-ml">+{{ row.groups.length - 1 }}</SBadge>
          </span>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-next="{ row }"><NextAnalysisText :watch="row" :every="every" compact /></template>
        <template #cell-last_hit_at="{ row }">{{ row.last_hit_at ? host.i18n.formatDateTime(row.last_hit_at) : '—' }}</template>
        <template #cell-expires_at="{ row }">
          <template v-if="row.expires_at">{{ host.i18n.formatDateTime(row.expires_at) }}</template>
          <SBadge v-else tone="gray">{{ t('watch.noExpiry') }}</SBadge>
        </template>
        <template #cell-analysis="{ row }">
          <SBadge v-if="analysisState(row) !== 'idle'" :tone="analysisState(row) === 'running' ? 'info' : 'warning'" dot>{{ enumLabel('analysisState', analysisState(row)) }}</SBadge>
          <template v-else-if="row.latest_trend || row.latest_suggestion">
            <SBadge v-if="row.latest_trend" :tone="trendTone(row.latest_trend)">{{ enumLabel('trend', row.latest_trend) }}</SBadge>
            <div v-if="row.latest_suggestion" class="mod-sub">
              {{ t('analysis.suggestion') }}: <SBadge size="xs" :tone="suggestionTone(row.latest_suggestion)">{{ enumLabel('suggestion', row.latest_suggestion) }}</SBadge>
            </div>
          </template>
          <SBadge v-else-if="row.latest_analysis_status === 'failed'" tone="danger">{{ enumLabel('analysisStatus', 'failed') }}</SBadge>
          <SHint v-else inline>{{ t('pagesP3.watch.trendNone') }}</SHint>
        </template>
        <template #cell-actions="{ row }">
          <span class="mod-pg-row-actions" @click.stop>
            <SButton size="sm" variant="ghost" @click="openDetail(row)">{{ t('watch.detail') }}</SButton>
            <template v-if="manage">
              <SButton size="sm" variant="ghost" @click="openEdit(row)">{{ t('edit') }}</SButton>
              <SButton size="sm" variant="ghost" @click="remove(row)">{{ t('watch.remove') }}</SButton>
            </template>
          </span>
        </template>
      </STable>
      <div class="mod-pager">
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </div>
    </SCard>

    <SModal v-model:open="editOpen" :title="editing ? t('watch.editTitle', { id: editing.user_id }) : t('watch.add')" width="md">
      <form class="mod-form" @submit.prevent="save">
        <SField v-if="!editing" :label="t('events.userId')" required :error="formErr.user_id">
          <SInput v-model="form.user_id" inputmode="numeric" />
        </SField>
        <SField :label="t('watch.col.level')" :hint="t('watch.levelHint')" :error="formErr.level">
          <SSegmented v-model="form.level" :options="[{ value: 'observe', label: t('level.observe') }, { value: 'enforce', label: t('level.enforce') }]" />
        </SField>
        <SField :label="t('watch.days')" :hint="t('watch.daysHint')" :error="formErr.days">
          <SInput v-model="form.days" type="number" min="0" max="3650" step="1" />
        </SField>
        <SField :label="t('watch.col.note')" :error="formErr.note">
          <SInput v-model="form.note" :maxlength="500" />
        </SField>
        <SField :label="t('pagesP3.watchAct.reason')" :hint="t('pagesP3.watchAct.reasonHint')" :error="formErr.reason">
          <STextarea v-model="form.reason" :rows="2" :maxlength="255" :placeholder="t('pagesP3.watchAct.reasonPh')" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="editOpen = false">{{ host.i18n.t('ui.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving" @click="save">{{ t('save') }}</SButton>
      </template>
    </SModal>

    <WatchDetail v-model:open="detailOpen" :user-id="detailUser" @changed="onDetailChanged" @show-user="showUser" />
    <AnalysisPromptModal v-model:open="promptOpen" />
  </div>
</template>

<style scoped>
.mod-pg-counts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.mod-pg-new {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: rgb(234 88 12);
}
.mod-pg-cats {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  max-width: 18rem;
}
.mod-pg-note {
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mod-pg-row-actions {
  display: inline-flex;
  white-space: nowrap;
}
</style>
