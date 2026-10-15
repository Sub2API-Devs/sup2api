<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useList } from '@sub2api/host'
import { SAlert, SButton, SCard, SChip, SField, SHint, SInput, SLink, SPagination, SSelect, STable, STimeRange, type RangeKey, type TableColumn } from '@sub2api/ui'
import VerdictBadge from './VerdictBadge.vue'
import CategoryChips from './CategoryChips.vue'
import EventDetail from './EventDetail.vue'
import { enumLabel, errorMessage, useModHost, type ModEvent } from './host'

// Records: filters + paginated table (useList); a row opens the detail modal.
const props = defineProps<{ preset?: { user_id: number; n: number } | null }>()
const host = useModHost()
const t = host.t

const emptyForm = () => ({ verdict: '', action: '', mode: '', category: '', user_id: '', q: '' })
const form = reactive(emptyForm())
if (props.preset) form.user_id = String(props.preset.user_id)
// Time filter: preset range or custom from/to (RFC 3339, '' = open).
const range = ref<RangeKey>('all')
const from = ref('')
const to = ref('')
const rangeKeys: RangeKey[] = ['all', 'today', '7d', '30d', 'custom']

/** The query the list is loaded with (the form as applied). */
function query() {
  return {
    verdict: form.verdict,
    action: form.action,
    mode: form.mode,
    category: form.category.trim(),
    user_id: form.user_id.trim(),
    q: form.q.trim(),
    from: from.value,
    to: to.value
  }
}

const list = useList<ModEvent>(host.pluginApi, '/events', query())
const error = computed(() => (list.error.value ? errorMessage(list.error.value, t('events.loadFailed')) : ''))

/** Applies the form; false when nothing changed. */
function apply(): boolean {
  const next = query()
  if (Object.entries(next).every(([k, v]) => list.filters[k] === v)) return false
  Object.assign(list.filters, next)
  return true
}

/** Search button / Enter: applies the form, reloading even when nothing changed. */
function search() {
  if (!apply()) list.reload()
}

/** Clears the form (keeping `userId` when given) and searches. */
function reset(userId = '') {
  Object.assign(form, emptyForm(), { user_id: userId })
  range.value = 'all'
  from.value = ''
  to.value = ''
  search()
}

// Static filter choices ('' = all).
const withAll = (opts: Array<{ value: string; label: string }>) => [{ value: '', label: t('events.all') }, ...opts]
const verdictOptions = computed(() => withAll(['pass', 'flag', 'block', 'error'].map((v) => ({ value: v, label: t(`verdict.${v}`) }))))
const actionOptions = computed(() => withAll(['allow', 'deny'].map((v) => ({ value: v, label: t(`action.${v}`) }))))
const modeOptions = computed(() => withAll(['observe', 'enforce'].map((v) => ({ value: v, label: t(`mode.${v}`) }))))

// Selects and the time range apply immediately (after search() / reset() this
// finds nothing new, so the list loads once); text inputs on Enter / Search.
watch(() => [form.verdict, form.action, form.mode, from.value, to.value], apply)

watch(
  () => props.preset,
  (p) => p && reset(String(p.user_id))
)

defineExpose({ reload: list.reload })

const columns = computed<TableColumn[]>(() => [
  { key: 'created_at', label: t('events.col.time'), width: '10.5rem', nowrap: true },
  { key: 'verdict', label: t('events.col.verdict'), nowrap: true },
  { key: 'action', label: t('events.col.action'), nowrap: true },
  { key: 'categories', label: t('events.col.categories') },
  { key: 'reason', label: t('events.col.reason'), ellipsis: '16rem' },
  { key: 'text_excerpt', label: t('events.col.text'), ellipsis: '20rem' },
  { key: 'user_id', label: t('events.col.user') },
  { key: 'model', label: t('events.col.model'), ellipsis: '10rem' },
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

function filterUser(id: number | null | undefined) {
  if (!id) return
  form.user_id = String(id)
  search()
}
</script>

<template>
  <div>
    <SCard>
      <form class="mod-filters" @submit.prevent="search">
        <SField class="mod-filter" :label="t('events.verdict')">
          <SSelect v-model="form.verdict" :options="verdictOptions" />
        </SField>
        <SField class="mod-filter" :label="t('events.action')">
          <SSelect v-model="form.action" :options="actionOptions" />
        </SField>
        <SField class="mod-filter" :label="t('events.mode')">
          <SSelect v-model="form.mode" :options="modeOptions" />
        </SField>
        <SField class="mod-filter" :label="t('events.category')">
          <SInput v-model="form.category" placeholder="jailbreak" />
        </SField>
        <SField class="mod-filter" :label="t('events.userId')">
          <SInput v-model="form.user_id" inputmode="numeric" />
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

    <SCard :padded="false" class="mod-section">
      <STable
        :columns="columns"
        :rows="list.items.value"
        :loading="list.loading.value"
        :empty-text="t('events.empty')"
        dense
        clickable
        @row-click="open"
      >
        <template #cell-created_at="{ row }">{{ host.i18n.formatDateTime(row.created_at) }}</template>
        <template #cell-verdict="{ row }">
          <VerdictBadge :verdict="row.verdict" />
          <SChip v-if="row.cached" size="xs" class="mod-cached" :title="t('events.cachedHint')">{{ t('events.cached') }}</SChip>
        </template>
        <template #cell-action="{ row }">
          <SHint inline :tone="row.action === 'deny' ? 'danger' : 'muted'">{{ enumLabel('action', row.action) }}</SHint>
          <div v-if="row.mode" class="mod-sub">{{ enumLabel('mode', row.mode) }}</div>
        </template>
        <template #cell-categories="{ row }"><CategoryChips :categories="row.categories" /></template>
        <template #cell-reason="{ row }">
          <SHint v-if="row.error" inline tone="danger" :title="row.error">{{ row.error }}</SHint>
          <span v-else :title="row.reason">{{ row.reason || '—' }}</span>
        </template>
        <template #cell-user_id="{ row }">
          <SLink v-if="row.user_id" as="button" class="mod-num" :title="t('events.filterUser')" @click.stop="filterUser(row.user_id)">#{{ row.user_id }}</SLink>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-latency_ms="{ row }">
          <span class="mod-num">{{ row.latency_ms || row.latency_ms === 0 ? t('ms', { n: host.i18n.formatNumber(row.latency_ms) }) : '—' }}</span>
        </template>
      </STable>
      <div class="mod-pager">
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </div>
    </SCard>

    <EventDetail v-model:open="detailOpen" :event-id="selected" @deleted="onDeleted" />
  </div>
</template>
