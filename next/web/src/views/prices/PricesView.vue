<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SButton, SChip, SDropdown, SHint, SInput, SLink, SPageHeader, SPagination, SSelect, SSwitch, STable, type TableColumn, type Tone } from '@sub2api/ui'
import type { Price } from '@/api/types'
import { deleteWithConfirm, useRowSwitch } from '@/composables/crud'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
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
    const names = Array.isArray(an.tiers) ? an.tiers.map((x: unknown) => (typeof x === 'string' ? x : (x as { name?: string } | null)?.name)).filter((x): x is string => !!x) : []
    return { kind: 'visual', tiers: count(an.tiers), rules: count(an.rules), tierNames: names }
  }
  return s
}

function price(v: number | null) {
  return v === null || v === undefined ? '—' : formatMoney(v, 6)
}

const MODE_TONE: Record<string, Tone> = { expression: 'accent', per_token: 'primary' }

function sourceLabel(p: Price): string {
  if (p.source === 'sync') return p.sync_source_name ? t('prices.sourceSync', { name: p.sync_source_name }) : t('prices.source.sync')
  return t('prices.source.manual')
}

const { busy: toggling, set: toggle } = useRowSwitch((p: Price, on) => api.patch(`/prices/${p.id}`, { enabled: on }))

function remove(p: Price) {
  return deleteWithConfirm(`/prices/${p.id}`, t('common.confirmDelete', { name: p.model }), reload)
}
</script>

<template>
  <div>
    <SPageHeader :title="t('prices.title')" :description="t('prices.description')">
      <template #actions>
        <SButton v-if="canManage" data-testid="price-sync" @click="router.push('/prices/sources')">{{ t('prices.syncPrices') }}</SButton>
        <SButton v-else variant="ghost" data-testid="price-sources" @click="router.push('/prices/sources')">{{ t('prices.viewSources') }}</SButton>
        <SButton v-if="canManage" variant="primary" icon="plus" @click="router.push('/prices/new')">{{ t('prices.new') }}</SButton>
      </template>
    </SPageHeader>

    <SAlert tone="primary" dense class="mb-3" data-testid="price-scope-note">{{ t('prices.scopeNote') }}</SAlert>
    <STable card :columns="columns" :rows="rows" :loading="loading">
      <template #toolbar>
        <SInput v-model="filters.q" class="w-64" icon="search" clearable :aria-label="t('common.search')" :placeholder="t('prices.searchPlaceholder')" />
        <SSelect v-model="filters.mode" class="w-40" :options="modeOptions" :aria-label="t('prices.modeCol')" />
        <SSelect v-model="filters.source" class="w-36" :options="sourceOptions" :aria-label="t('common.source')" data-testid="price-source-filter" />
        <SChip
          v-if="filters.sync_source_id"
          tone="info"
          closable
          :close-label="t('prices.clearSourceFilter')"
          data-testid="price-source-chip"
          @close="clearSourceFilter"
        >
          {{ t('prices.fromSource', { name: filteredSourceName }) }}
        </SChip>
      </template>
      <template #cell-model="{ row }">
        <SLink :to="`/prices/${row.id}`" class="font-mono text-sm">{{ row.model }}</SLink>
        <SHint v-if="row.note" size="xs" class="truncate">{{ row.note }}</SHint>
      </template>
      <template #cell-mode="{ row }">
        <SBadge :tone="MODE_TONE[row.mode] ?? 'gray'">{{ row.config?.video ? t('prices.video.title') : t(`prices.mode.${row.mode}`) }}</SBadge>
      </template>
      <template #cell-summary="{ row }">
        <template v-for="s in [summaryOf(row)]" :key="s.kind">
          <span v-if="s.kind === 'per_request'" class="text-sm">{{ t('prices.summary.perRequest', { price: price(s.price) }) }}</span>
          <span v-else-if="s.kind === 'per_token'" class="text-sm">
            {{ t('prices.summary.perToken', { p: price(s.prices.p), c: price(s.prices.c), cr: price(s.prices.cr) }) }}
          </span>
          <span v-else-if="s.kind === 'visual'" class="text-sm">
            {{ t('prices.summary.visual', { tiers: s.tiers, rules: s.rules }) }}
            <SHint v-if="s.tierNames.length > 1" inline size="xs">({{ s.tierNames.join(' / ') }})</SHint>
          </span>
          <span v-else class="block max-w-md truncate font-mono text-xs text-fg-muted" :title="row.expression">
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
        <SSwitch :model-value="row.enabled" :disabled="!canManage || toggling.has(row.id)" :aria-label="t('common.enabled') + ' · ' + row.model" @update:model-value="toggle(row, $event)" />
      </template>
      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-1">
          <template v-if="canManage">
            <SButton size="sm" variant="ghost" @click="router.push(`/prices/${row.id}`)">{{ t('common.edit') }}</SButton>
            <SDropdown :actions="[{ key: 'delete', label: t('common.delete'), danger: true }]" @select="$event === 'delete' && remove(row)" />
          </template>
          <SButton v-else size="sm" variant="ghost" @click="router.push(`/prices/${row.id}`)">{{ t('common.view') }}</SButton>
        </div>
      </template>
      <template #footer>
        <SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </template>
    </STable>
  </div>
</template>
