<script setup lang="ts">
import { computed, ref, shallowRef, triggerRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { SBadge, SButton, SIcon, SModal, SPageHeader, SPagination, SSpinner, STabs, confirm, type TabItem, type Tone } from '@sub2api/ui'
import type { PriceSource, PriceSyncAction, PriceSyncItem, PriceSyncPreview, PriceSyncResult } from '@/api/types'
import { errorMessage, notifyError } from '@/utils/errors'
import { formatDateTime, formatNumber } from '@/utils/format'
import PriceDefSummary from './PriceDefSummary.vue'

type Tab = 'pending' | PriceSyncAction

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const sourceId = computed(() => {
  const n = Number(route.params.id)
  return Number.isFinite(n) && n > 0 ? n : 0
})

const source = ref<PriceSource | null>(null)
const preview = shallowRef<PriceSyncPreview | null>(null)
const fetching = ref(false)
const fetchError = ref('')

// Selection keyed by model. A shallow Set mutated in place + triggerRef keeps
// select-all over thousands of rows cheap.
const selected = shallowRef(new Set<string>())

const tab = ref<Tab>('pending')
const q = ref('')
const page = ref(1)
const pageSize = ref(100)

const sourceName = computed(() => source.value?.name || `#${sourceId.value}`)

async function loadSource() {
  try {
    const list = await api.get<PriceSource[]>('/price-sources')
    source.value = (Array.isArray(list) ? list : []).find((s) => s.id === sourceId.value) || null
  } catch (e) {
    notifyError(e)
  }
}

async function fetchPreview() {
  if (!sourceId.value) return
  fetching.value = true
  fetchError.value = ''
  try {
    const r = await api.post<PriceSyncPreview>(`/price-sources/${sourceId.value}/preview`)
    const items = Array.isArray(r?.items) ? r.items : []
    preview.value = { ...r, items }
    // Default selection: new and updated synced prices; manual ones stay unticked.
    selected.value = new Set(items.filter((x) => x.action === 'create' || x.action === 'update').map((x) => x.model))
  } catch (e) {
    preview.value = null
    selected.value = new Set()
    fetchError.value = errorMessage(e)
  } finally {
    fetching.value = false
    // Refresh last_error / last_synced_at shown in the header.
    loadSource()
  }
}

watch(
  sourceId,
  () => {
    source.value = null
    preview.value = null
    tab.value = 'pending'
    q.value = ''
    loadSource()
    fetchPreview()
  },
  { immediate: true }
)

// ------------------------------------------------------------------ derived

const items = computed<PriceSyncItem[]>(() => preview.value?.items || [])

const counts = computed(() => {
  const c: Record<PriceSyncAction, number> = { create: 0, update: 0, manual: 0, unchanged: 0 }
  for (const x of items.value) if (x.action in c) c[x.action]++
  return c
})

const actionOf = computed(() => {
  const m = new Map<string, PriceSyncAction>()
  for (const x of items.value) m.set(x.model, x.action)
  return m
})

const tabs = computed<TabItem[]>(() => [
  { key: 'pending', label: t('prices.sync.tabs.pending'), badge: counts.value.create + counts.value.update + counts.value.manual },
  { key: 'create', label: t('prices.sync.tabs.create'), badge: counts.value.create },
  { key: 'update', label: t('prices.sync.tabs.update'), badge: counts.value.update },
  { key: 'manual', label: t('prices.sync.tabs.manual'), badge: counts.value.manual },
  { key: 'unchanged', label: t('prices.sync.tabs.unchanged'), badge: counts.value.unchanged }
])

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  const want = tab.value
  return items.value.filter((x) => {
    if (want === 'pending' ? x.action === 'unchanged' : x.action !== want) return false
    return !s || x.model.toLowerCase().includes(s)
  })
})

watch([tab, q, pageSize], () => (page.value = 1))

const pageRows = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

const selectable = (x: PriceSyncItem) => x.action !== 'unchanged'

const filteredSelectable = computed(() => filtered.value.filter(selectable))

const filteredAllSelected = computed(() => {
  const s = selected.value
  const list = filteredSelectable.value
  return list.length > 0 && list.every((x) => s.has(x.model))
})
const filteredSomeSelected = computed(() => {
  const s = selected.value
  return filteredSelectable.value.some((x) => s.has(x.model))
})

const selectedCount = computed(() => selected.value.size)
const selectedManual = computed(() => {
  let n = 0
  const a = actionOf.value
  for (const m of selected.value) if (a.get(m) === 'manual') n++
  return n
})

// ------------------------------------------------------------------ selection

function toggle(x: PriceSyncItem) {
  if (!selectable(x)) return
  const s = selected.value
  if (s.has(x.model)) s.delete(x.model)
  else s.add(x.model)
  triggerRef(selected)
}

/** Select / unselect all: only the rows of the current filter (tab + search). */
function selectAll() {
  const s = selected.value
  for (const x of filteredSelectable.value) s.add(x.model)
  triggerRef(selected)
}

function selectNone() {
  const s = selected.value
  for (const x of filtered.value) s.delete(x.model)
  triggerRef(selected)
}

function toggleAllFiltered() {
  if (filteredAllSelected.value) selectNone()
  else selectAll()
}

// ------------------------------------------------------------------ view helpers

const ACTION_TONE: Record<PriceSyncAction, Tone> = { create: 'success', update: 'primary', manual: 'warning', unchanged: 'gray' }

const stats = computed(() => [
  { key: 'create' as const, value: counts.value.create, tone: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'update' as const, value: counts.value.update, tone: 'text-primary-600 dark:text-primary-400' },
  { key: 'manual' as const, value: counts.value.manual, tone: 'text-amber-600 dark:text-amber-400' },
  { key: 'unchanged' as const, value: counts.value.unchanged, tone: 'text-gray-600 dark:text-gray-300' },
  { key: 'skipped' as const, value: preview.value?.skipped ?? 0, tone: 'text-gray-500 dark:text-dark-400' }
])

function pickStat(k: string) {
  if (k !== 'skipped') tab.value = k as Tab
}

// ------------------------------------------------------------------ apply

const applying = ref(false)
const result = ref<PriceSyncResult | null>(null)
const resultOpen = ref(false)

async function apply() {
  const models = items.value.filter((x) => selected.value.has(x.model) && selectable(x)).map((x) => x.model)
  if (!models.length) return
  const manual = selectedManual.value
  const ok = await confirm({
    title: t('prices.sync.applyConfirmTitle'),
    message: manual ? t('prices.sync.applyConfirmManual', { n: models.length, m: manual }) : t('prices.sync.applyConfirm', { n: models.length }),
    danger: manual > 0
  })
  if (!ok) return
  applying.value = true
  try {
    const r = await api.post<PriceSyncResult>(`/price-sources/${sourceId.value}/apply`, { models })
    result.value = {
      created: r?.created ?? 0,
      updated: r?.updated ?? 0,
      unchanged: r?.unchanged ?? 0,
      skipped: Array.isArray(r?.skipped) ? r.skipped : []
    }
    resultOpen.value = true
    await fetchPreview()
  } catch (e) {
    notifyError(e)
  } finally {
    applying.value = false
  }
}
</script>

<template>
  <div>
    <SPageHeader :title="t('prices.sync.title', { name: sourceName })">
      <template #before>
        <button class="btn btn-ghost btn-sm !px-1.5" :title="t('common.back')" @click="router.push('/prices/sources')">
          <SIcon name="arrow-left" class="h-4 w-4" />
        </button>
      </template>
      <template #title-extra>
        <SBadge v-if="source" tone="gray">{{ t(`prices.sources.kind.${source.kind}`) }}</SBadge>
      </template>
      <template #actions>
        <SButton :loading="fetching" data-testid="price-sync-refetch" @click="fetchPreview">{{ t('prices.sync.refetch') }}</SButton>
      </template>
    </SPageHeader>

    <!-- fetching -->
    <div v-if="fetching && !preview" class="card flex flex-col items-center gap-3 py-16 text-sm text-gray-500" data-testid="price-sync-fetching">
      <SSpinner size="lg" />
      {{ t('prices.sync.fetching', { name: sourceName }) }}
    </div>

    <!-- fetch failed -->
    <div
      v-else-if="fetchError && !preview"
      class="card flex flex-col items-center gap-3 py-12 text-center"
      data-testid="price-sync-error"
    >
      <SIcon name="x" class="h-8 w-8 text-red-500" />
      <p class="font-medium text-gray-900 dark:text-white">{{ t('prices.sync.fetchFailed') }}</p>
      <p class="max-w-xl break-words text-sm text-red-600 dark:text-red-400">{{ fetchError }}</p>
      <SButton variant="primary" :loading="fetching" @click="fetchPreview">{{ t('prices.sync.retry') }}</SButton>
    </div>

    <template v-else-if="preview">
      <p class="muted mb-3 text-xs" data-testid="price-sync-fetched">
        {{ t('prices.sync.fetchedAt', { time: formatDateTime(preview.fetched_at), total: formatNumber(preview.total) }) }}
      </p>

      <!-- stats -->
      <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="price-sync-stats">
        <button
          v-for="s in stats"
          :key="s.key"
          type="button"
          class="card px-4 py-3 text-left transition-shadow"
          :class="[s.key !== 'skipped' ? 'hover:shadow-md' : 'cursor-default', tab === s.key ? 'ring-2 ring-primary-500/50' : '']"
          :title="s.key === 'skipped' ? t('prices.sync.skippedHint') : undefined"
          :data-stat="s.key"
          @click="pickStat(s.key)"
        >
          <p class="muted text-xs">{{ t(`prices.sync.stats.${s.key}`) }}</p>
          <p class="mt-1 text-2xl font-semibold tabular-nums" :class="s.tone">{{ formatNumber(s.value) }}</p>
        </button>
      </div>

      <div class="card overflow-hidden">
        <div class="px-4 pt-2">
          <STabs v-model="tab" :tabs="tabs" data-testid="price-sync-tabs" />
        </div>

        <!-- toolbar -->
        <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-dark-700">
          <input v-model="q" class="input !w-64" :placeholder="t('prices.sync.searchPlaceholder')" data-testid="price-sync-search" />
          <SButton size="sm" :disabled="!filteredSelectable.length" data-testid="price-sync-select-all" @click="selectAll">
            {{ t('prices.sync.selectAll', { n: formatNumber(filteredSelectable.length) }) }}
          </SButton>
          <SButton size="sm" :disabled="!filteredSomeSelected" data-testid="price-sync-select-none" @click="selectNone">{{ t('prices.sync.selectNone') }}</SButton>
          <span class="muted text-xs">{{ t('prices.sync.selectScope') }}</span>
          <div class="ml-auto flex flex-wrap items-center gap-3">
            <span class="text-sm" data-testid="price-sync-selected">
              {{ t('prices.sync.selected', { n: formatNumber(selectedCount) }) }}
              <span v-if="selectedManual" class="text-amber-600 dark:text-amber-400">· {{ t('prices.sync.selectedManual', { n: selectedManual }) }}</span>
            </span>
            <SButton variant="primary" :disabled="!selectedCount" :loading="applying" data-testid="price-sync-apply" @click="apply">
              {{ t('prices.sync.apply', { n: formatNumber(selectedCount) }) }}
            </SButton>
          </div>
        </div>

        <div class="table-container !rounded-none !border-0">
          <table class="table table-dense">
            <thead>
              <tr>
                <th class="w-10">
                  <input
                    type="checkbox"
                    class="checkbox"
                    :checked="filteredAllSelected"
                    :indeterminate="!filteredAllSelected && filteredSomeSelected"
                    :disabled="!filteredSelectable.length"
                    :aria-label="t('prices.sync.selectAll', { n: filteredSelectable.length })"
                    @change="toggleAllFiltered"
                  />
                </th>
                <th>{{ t('prices.model') }}</th>
                <th class="w-40">{{ t('common.status') }}</th>
                <th>{{ t('prices.sync.incoming') }}</th>
                <th>{{ t('prices.sync.current') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!pageRows.length">
                <td colspan="5" class="py-10 text-center text-sm text-gray-400">{{ t('prices.sync.empty') }}</td>
              </tr>
              <tr
                v-for="x in pageRows"
                :key="x.model"
                :class="selectable(x) ? 'cursor-pointer' : 'opacity-70'"
                :data-model="x.model"
                :data-action="x.action"
                @click="toggle(x)"
              >
                <td @click.stop>
                  <input
                    type="checkbox"
                    class="checkbox"
                    :checked="selected.has(x.model)"
                    :disabled="!selectable(x)"
                    :title="selectable(x) ? undefined : t('prices.sync.unchangedHint')"
                    @change="toggle(x)"
                  />
                </td>
                <td class="font-mono text-xs">{{ x.model }}</td>
                <td>
                  <SBadge :tone="ACTION_TONE[x.action]">{{ t(`prices.sync.action.${x.action}`) }}</SBadge>
                  <p v-if="x.action === 'manual'" class="mt-0.5 text-xs text-amber-600 dark:text-amber-400">⚠ {{ t('prices.sync.manualWarn') }}</p>
                </td>
                <td>
                  <PriceDefSummary :def="x.incoming" :compare="x.action === 'unchanged' ? null : x.current" />
                </td>
                <td>
                  <span v-if="!x.current" class="muted text-xs">{{ t('prices.sync.noCurrent') }}</span>
                  <template v-else>
                    <PriceDefSummary :def="x.current" muted />
                    <div class="mt-0.5 flex gap-1 text-[11px]">
                      <span class="muted">{{ x.current.source === 'sync' ? t('prices.sync.currentSync') : t('prices.sync.currentManual') }}</span>
                      <span v-if="!x.current.enabled" class="muted">· {{ t('prices.sync.currentDisabled') }}</span>
                    </div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <SPagination v-model:page="page" v-model:page-size="pageSize" :total="filtered.length" :page-sizes="[50, 100, 200]" />
    </template>

    <SModal v-model:open="resultOpen" :title="t('prices.sync.resultTitle')" width="lg">
      <div v-if="result" class="space-y-4" data-testid="price-sync-result">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="k in ['created', 'updated', 'unchanged'] as const" :key="k" class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-800">
            <p class="muted text-xs">{{ t(`prices.sync.result.${k}`) }}</p>
            <p class="text-xl font-semibold tabular-nums" :data-result="k">{{ result[k] }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-800">
            <p class="muted text-xs">{{ t('prices.sync.result.skipped') }}</p>
            <p class="text-xl font-semibold tabular-nums" :class="result.skipped.length ? 'text-amber-600' : ''" data-result="skipped">{{ result.skipped.length }}</p>
          </div>
        </div>
        <div v-if="result.skipped.length">
          <p class="section-title">{{ t('prices.sync.skippedList') }}</p>
          <div class="max-h-60 overflow-y-auto rounded-lg border border-gray-100 dark:border-dark-700">
            <table class="table table-dense">
              <thead>
                <tr>
                  <th>{{ t('prices.model') }}</th>
                  <th>{{ t('prices.sync.reason') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in result.skipped" :key="s.model">
                  <td class="font-mono text-xs">{{ s.model }}</td>
                  <td class="text-xs">{{ s.reason }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <template #footer>
        <SButton @click="resultOpen = false">{{ t('common.close') }}</SButton>
        <SButton variant="primary" @click="router.push({ path: '/prices', query: { source: 'sync', sync_source_id: String(sourceId) } })">
          {{ t('prices.sync.viewPrices') }}
        </SButton>
      </template>
    </SModal>
  </div>
</template>
