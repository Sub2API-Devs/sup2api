<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { SBadge, SButton, SPageHeader, SPagination, SSelect, SSwitch, STable, confirm, toast, type TableColumn } from '@sub2api/ui'
import type { Price } from '@/api/types'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import { formatDateTime, formatMoney } from '@/utils/format'
import { summarize, type PriceSummary } from './priceExpr'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const canManage = computed(() => auth.has('price:manage'))

function queryStr(k: string): string {
  const v = route.query[k]
  return typeof v === 'string' ? v : ''
}
const querySource = () => (/^\d+$/.test(queryStr('sync_source_id')) ? queryStr('sync_source_id') : '')

// ?source= and ?sync_source_id= come from the sync sources page ("view these prices").
const { items, loading, page, pageSize, total, filters, reload } = useList<Price>('/prices', {
  mode: '',
  source: ['manual', 'sync'].includes(queryStr('source')) ? queryStr('source') : '',
  sync_source_id: querySource(),
  q: ''
})

watch(
  () => route.query.sync_source_id,
  () => {
    const s = querySource()
    if (s !== filters.sync_source_id) filters.sync_source_id = s
  }
)

const modeOptions = computed(() => [
  { value: '', label: t('common.all') },
  { value: 'per_request', label: t('prices.mode.per_request') },
  { value: 'per_token', label: t('prices.mode.per_token') },
  { value: 'expression', label: t('prices.mode.expression') }
])

const sourceOptions = computed(() => [
  { value: '', label: t('common.all') },
  { value: 'manual', label: t('prices.source.manual') },
  { value: 'sync', label: t('prices.source.sync') }
])

// Client-side filter as a fallback in case the server ignores a query parameter.
const rows = computed(() =>
  items.value.filter((p) => {
    if (filters.mode && p.mode !== filters.mode) return false
    if (filters.source && p.source !== filters.source) return false
    if (filters.sync_source_id && String(p.sync_source_id ?? '') !== String(filters.sync_source_id)) return false
    const q = String(filters.q || '').trim().toLowerCase()
    if (q && !`${p.model} ${p.note || ''}`.toLowerCase().includes(q)) return false
    return true
  })
)

/** Name of the source filtered by ?sync_source_id=, taken from the loaded rows. */
const filteredSourceName = computed(() => {
  if (!filters.sync_source_id) return ''
  const hit = items.value.find((p) => String(p.sync_source_id) === String(filters.sync_source_id) && p.sync_source_name)
  return hit?.sync_source_name || `#${filters.sync_source_id}`
})

function clearSourceFilter() {
  filters.sync_source_id = ''
  const q = { ...route.query }
  delete q.sync_source_id
  router.replace({ query: q })
}

const columns = computed<TableColumn[]>(() => [
  { key: 'model', label: t('prices.model') },
  { key: 'mode', label: t('prices.modeCol'), width: '100px' },
  { key: 'summary', label: t('prices.summaryCol') },
  { key: 'source', label: t('common.source'), width: '170px' },
  { key: 'enabled', label: t('common.enabled'), width: '90px' },
  { key: 'actions', label: t('common.actions'), align: 'right', width: '150px' }
])

function summaryOf(p: Price): PriceSummary {
  const s = summarize(p.mode, p.config, p.expression)
  // Prefer the server analysis (tiers/rules) for expressions the parser cannot map.
  const an = p.analysis as { tiers?: unknown; rules?: unknown } | undefined
  if (s.kind === 'custom' && an && (an.tiers !== undefined || an.rules !== undefined)) {
    const count = (x: unknown) => (Array.isArray(x) ? x.length : typeof x === 'number' ? x : 0)
    const names = Array.isArray(an.tiers) ? an.tiers.map((x: any) => (typeof x === 'string' ? x : x?.name)).filter(Boolean) : []
    return { kind: 'visual', tiers: count(an.tiers), rules: count(an.rules), tierNames: names }
  }
  return s
}

function price(v: number | null) {
  return v === null || v === undefined ? '—' : formatMoney(v, 6)
}

function modeTone(m: string) {
  return m === 'expression' ? 'purple' : m === 'per_token' ? 'primary' : 'gray'
}

function sourceLabel(p: Price): string {
  if (p.source === 'sync') return p.sync_source_name ? t('prices.sourceSync', { name: p.sync_source_name }) : t('prices.source.sync')
  return t('prices.source.manual')
}

const toggling = ref(new Set<number>())

async function toggle(p: Price, v: boolean) {
  const prev = p.enabled
  p.enabled = v
  toggling.value = new Set(toggling.value).add(p.id)
  try {
    await api.patch(`/prices/${p.id}`, { enabled: v })
  } catch (e) {
    p.enabled = prev
    notifyError(e)
  } finally {
    const s = new Set(toggling.value)
    s.delete(p.id)
    toggling.value = s
  }
}

async function remove(p: Price) {
  const ok = await confirm({ message: t('common.confirmDelete', { name: p.model }), danger: true })
  if (!ok) return
  try {
    await api.del(`/prices/${p.id}`)
    toast(t('common.deleted'), 'success')
    reload()
  } catch (e) {
    notifyError(e)
  }
}
</script>

<template>
  <div>
    <SPageHeader :title="t('prices.title')" :description="t('prices.description')">
      <template #actions>
        <SButton v-if="canManage" data-testid="price-sync" @click="router.push('/prices/sources')">{{ t('prices.syncPrices') }}</SButton>
        <SButton v-else variant="ghost" data-testid="price-sources" @click="router.push('/prices/sources')">{{ t('prices.viewSources') }}</SButton>
        <SButton v-if="canManage" variant="primary" @click="router.push('/prices/new')">+ {{ t('prices.new') }}</SButton>
      </template>
      <template #filters>
        <div class="w-40">
          <label class="input-label">{{ t('prices.modeCol') }}</label>
          <SSelect v-model="filters.mode" :options="modeOptions" />
        </div>
        <div class="w-36" data-testid="price-source-filter">
          <label class="input-label">{{ t('common.source') }}</label>
          <SSelect v-model="filters.source" :options="sourceOptions" />
        </div>
        <div class="w-64">
          <label class="input-label">{{ t('common.search') }}</label>
          <input v-model="filters.q" class="input" :placeholder="t('prices.searchPlaceholder')" />
        </div>
        <div v-if="filters.sync_source_id" class="pb-1.5" data-testid="price-source-chip">
          <span class="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs text-sky-700 dark:bg-sky-900/20 dark:text-sky-300">
            {{ t('prices.fromSource', { name: filteredSourceName }) }}
            <button class="ml-0.5 font-semibold" :title="t('prices.clearSourceFilter')" :aria-label="t('prices.clearSourceFilter')" @click="clearSourceFilter">×</button>
          </span>
        </div>
      </template>
    </SPageHeader>

    <p class="mb-3 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-800 dark:bg-primary-900/20 dark:text-primary-200" data-testid="price-scope-note">
      {{ t('prices.scopeNote') }}
    </p>
    <div class="card overflow-hidden">
      <STable :columns="columns" :rows="rows" :loading="loading">
        <template #cell-model="{ row }">
          <RouterLink :to="`/prices/${row.id}`" class="link font-mono text-sm">{{ row.model }}</RouterLink>
          <p v-if="row.note" class="muted truncate text-xs">{{ row.note }}</p>
        </template>
        <template #cell-mode="{ row }">
          <SBadge :tone="modeTone(row.mode)">{{ t(`prices.mode.${row.mode}`) }}</SBadge>
        </template>
        <template #cell-summary="{ row }">
          <template v-for="s in [summaryOf(row)]" :key="s.kind">
            <span v-if="s.kind === 'per_request'" class="text-sm">{{ t('prices.summary.perRequest', { price: price(s.price) }) }}</span>
            <span v-else-if="s.kind === 'per_token'" class="text-sm">
              {{ t('prices.summary.perToken', { p: price(s.prices.p), c: price(s.prices.c), cr: price(s.prices.cr) }) }}
            </span>
            <span v-else-if="s.kind === 'visual'" class="text-sm">
              {{ t('prices.summary.visual', { tiers: s.tiers, rules: s.rules }) }}
              <span v-if="s.tierNames.length > 1" class="muted text-xs">({{ s.tierNames.join(' / ') }})</span>
            </span>
            <span v-else class="block max-w-md truncate font-mono text-xs text-gray-500" :title="row.expression">
              {{ t('prices.summary.custom') }} · {{ row.expression }}
            </span>
          </template>
        </template>
        <template #cell-source="{ row }">
          <span :title="row.source === 'sync' && row.synced_at ? formatDateTime(row.synced_at) : undefined" data-testid="price-source">
            <SBadge :tone="row.source === 'sync' ? 'info' : 'primary'">{{ sourceLabel(row) }}</SBadge>
          </span>
        </template>
        <template #cell-enabled="{ row }">
          <SSwitch :model-value="row.enabled" :disabled="!canManage || toggling.has(row.id)" @update:model-value="toggle(row, $event)" />
        </template>
        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-1">
            <template v-if="canManage">
              <SButton size="sm" variant="ghost" @click="router.push(`/prices/${row.id}`)">{{ t('common.edit') }}</SButton>
              <SButton size="sm" variant="ghost" class="!text-red-600" @click="remove(row)">{{ t('common.delete') }}</SButton>
            </template>
            <SButton v-else size="sm" variant="ghost" @click="router.push(`/prices/${row.id}`)">{{ t('common.view') }}</SButton>
          </div>
        </template>
      </STable>
    </div>
    <SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
  </div>
</template>
