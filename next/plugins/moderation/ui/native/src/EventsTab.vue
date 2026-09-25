<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { SButton, SCard, SIcon, SPagination, STable } from '@sub2api/ui'
import VerdictBadge from './VerdictBadge.vue'
import CategoryChips from './CategoryChips.vue'
import EventDetail from './EventDetail.vue'
import { enumLabel, errorMessage, fetchEvents, useModHost, type EventFilters, type ModEvent } from './host'

// Records: filters + paginated table; a row opens the detail modal.
const props = defineProps<{ preset?: { user_id: number; n: number } | null }>()
const host = useModHost()
const t = host.t

const empty = (): EventFilters => ({ verdict: '', action: '', mode: '', category: '', user_id: '', q: '', from: '', to: '' })
const filters = reactive<EventFilters>(empty())
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const rows = ref<ModEvent[]>([])
const loading = ref(false)
const error = ref('')
let seq = 0

async function reload() {
  const my = ++seq
  loading.value = true
  error.value = ''
  try {
    const r = await fetchEvents(filters, page.value, pageSize.value)
    if (my !== seq) return
    rows.value = r.items
    total.value = r.page?.total ?? r.items.length
  } catch (e) {
    if (my !== seq) return
    error.value = errorMessage(e, t('events.loadFailed'))
  } finally {
    if (my === seq) loading.value = false
  }
}

function search() {
  if (page.value !== 1) page.value = 1
  else reload()
}

function reset() {
  Object.assign(filters, empty())
  search()
}

// Selects apply immediately; text inputs on Enter / Search.
watch(() => [filters.verdict, filters.action, filters.mode, filters.from, filters.to], search)
watch([page, pageSize], reload)

watch(
  () => props.preset,
  (p) => {
    if (!p) return
    Object.assign(filters, empty(), { user_id: String(p.user_id) })
    search()
  }
)

onMounted(() => {
  if (props.preset) Object.assign(filters, { user_id: String(props.preset.user_id) })
  reload()
})
defineExpose({ reload })

const columns = computed(() => [
  { key: 'created_at', label: t('events.col.time'), width: '10.5rem' },
  { key: 'verdict', label: t('events.col.verdict') },
  { key: 'action', label: t('events.col.action') },
  { key: 'categories', label: t('events.col.categories') },
  { key: 'reason', label: t('events.col.reason') },
  { key: 'text_excerpt', label: t('events.col.text') },
  { key: 'user_id', label: t('events.col.user') },
  { key: 'model', label: t('events.col.model') },
  { key: 'latency_ms', label: t('events.col.latency'), align: 'right' as const }
])

const selected = ref<number | null>(null)
const detailOpen = ref(false)
function open(row: ModEvent) {
  selected.value = row.id
  detailOpen.value = true
}

function onDeleted(id: number) {
  rows.value = rows.value.filter((r) => r.id !== id)
  total.value = Math.max(0, total.value - 1)
  if (!rows.value.length && page.value > 1) page.value--
}

function filterUser(id: number | null | undefined) {
  if (!id) return
  filters.user_id = String(id)
  search()
}
</script>

<template>
  <div>
    <SCard class="mod-filters-card">
      <form class="mod-filters" @submit.prevent="search">
        <label class="mod-filter">
          <span class="input-label">{{ t('events.verdict') }}</span>
          <select v-model="filters.verdict" class="input">
            <option value="">{{ t('events.all') }}</option>
            <option v-for="v in ['pass', 'flag', 'block', 'error']" :key="v" :value="v">{{ t(`verdict.${v}`) }}</option>
          </select>
        </label>
        <label class="mod-filter">
          <span class="input-label">{{ t('events.action') }}</span>
          <select v-model="filters.action" class="input">
            <option value="">{{ t('events.all') }}</option>
            <option v-for="v in ['allow', 'deny']" :key="v" :value="v">{{ t(`action.${v}`) }}</option>
          </select>
        </label>
        <label class="mod-filter">
          <span class="input-label">{{ t('events.mode') }}</span>
          <select v-model="filters.mode" class="input">
            <option value="">{{ t('events.all') }}</option>
            <option v-for="v in ['observe', 'enforce']" :key="v" :value="v">{{ t(`mode.${v}`) }}</option>
          </select>
        </label>
        <label class="mod-filter">
          <span class="input-label">{{ t('events.category') }}</span>
          <input v-model="filters.category" class="input" placeholder="jailbreak" />
        </label>
        <label class="mod-filter">
          <span class="input-label">{{ t('events.userId') }}</span>
          <input v-model="filters.user_id" class="input" inputmode="numeric" />
        </label>
        <label class="mod-filter mod-filter-wide">
          <span class="input-label">{{ t('events.q') }}</span>
          <input v-model="filters.q" class="input" type="search" />
        </label>
        <label class="mod-filter mod-filter-date">
          <span class="input-label">{{ t('events.from') }}</span>
          <input v-model="filters.from" class="input" type="datetime-local" />
        </label>
        <label class="mod-filter mod-filter-date">
          <span class="input-label">{{ t('events.to') }}</span>
          <input v-model="filters.to" class="input" type="datetime-local" />
        </label>
        <div class="mod-filter-actions">
          <SButton type="submit" variant="primary" :loading="loading"><SIcon name="search" class="mod-icon" />{{ t('events.search') }}</SButton>
          <SButton @click="reset">{{ t('events.reset') }}</SButton>
        </div>
      </form>
    </SCard>

    <p v-if="error" class="mod-alert mod-alert-danger">{{ error }}</p>

    <SCard :padded="false" class="mod-section">
      <STable :columns="columns" :rows="rows" :loading="loading" :empty-text="t('events.empty')" dense class="mod-clickable" @row-click="open">
        <template #cell-created_at="{ row }"><span class="mod-nowrap">{{ host.i18n.formatDateTime(row.created_at) }}</span></template>
        <template #cell-verdict="{ row }">
          <span class="mod-nowrap">
            <VerdictBadge :verdict="row.verdict" />
            <span v-if="row.cached" class="mod-cached" :title="t('events.cachedHint')">{{ t('events.cached') }}</span>
          </span>
        </template>
        <template #cell-action="{ row }">
          <span class="mod-nowrap" :class="row.action === 'deny' ? 'mod-text-danger' : 'muted'">{{ enumLabel('action', row.action) }}</span>
          <div v-if="row.mode" class="mod-sub">{{ enumLabel('mode', row.mode) }}</div>
        </template>
        <template #cell-categories="{ row }"><CategoryChips :categories="row.categories" /></template>
        <template #cell-reason="{ row }">
          <span class="mod-ellipsis mod-w-reason" :title="row.error || row.reason">
            <span v-if="row.error" class="mod-text-danger">{{ row.error }}</span>
            <template v-else>{{ row.reason || '—' }}</template>
          </span>
        </template>
        <template #cell-text_excerpt="{ row }">
          <span class="mod-ellipsis mod-w-text" :title="row.text_excerpt">{{ row.text_excerpt || '—' }}</span>
        </template>
        <template #cell-user_id="{ row }">
          <a v-if="row.user_id" class="link mod-num" @click.stop="filterUser(row.user_id)">#{{ row.user_id }}</a>
          <span v-else class="muted">—</span>
        </template>
        <template #cell-model="{ row }"><span class="mod-ellipsis mod-w-model" :title="row.model">{{ row.model || '—' }}</span></template>
        <template #cell-latency_ms="{ row }">
          <span class="mod-num mod-nowrap">{{ row.latency_ms || row.latency_ms === 0 ? t('ms', { n: host.i18n.formatNumber(row.latency_ms) }) : '—' }}</span>
        </template>
      </STable>
      <div class="mod-pager">
        <SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </SCard>

    <EventDetail v-model:open="detailOpen" :event-id="selected" @deleted="onDeleted" />
  </div>
</template>
