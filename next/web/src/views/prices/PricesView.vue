<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { SBadge, SButton, SPageHeader, SPagination, SSelect, SSwitch, STable, confirm, toast, type TableColumn } from '@sub2api/ui'
import type { Price } from '@/api/types'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import { formatMoney } from '@/utils/format'
import { summarize, type PriceSummary } from './priceExpr'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const canManage = computed(() => auth.has('price:manage'))

const { items, loading, page, pageSize, total, filters, reload } = useList<Price>('/prices', { mode: '', q: '' })

const modeOptions = computed(() => [
  { value: '', label: t('common.all') },
  { value: 'per_request', label: t('prices.mode.per_request') },
  { value: 'per_token', label: t('prices.mode.per_token') },
  { value: 'expression', label: t('prices.mode.expression') }
])

// Client-side filter as a fallback in case the server ignores a query parameter.
const rows = computed(() =>
  items.value.filter((p) => {
    if (filters.mode && p.mode !== filters.mode) return false
    const q = String(filters.q || '').trim().toLowerCase()
    if (q && !`${p.model_pattern} ${p.note || ''} ${p.plugin_key || ''}`.toLowerCase().includes(q)) return false
    return true
  })
)

const columns = computed<TableColumn[]>(() => [
  { key: 'model_pattern', label: t('prices.modelPattern') },
  { key: 'mode', label: t('prices.modeCol'), width: '100px' },
  { key: 'summary', label: t('prices.summaryCol') },
  { key: 'source', label: t('common.source'), width: '150px' },
  { key: 'enabled', label: t('common.enabled'), width: '90px' },
  { key: 'actions', label: t('common.actions'), align: 'right', width: '150px' }
])

function summaryOf(p: Price): PriceSummary {
  const s = summarize(p.mode, p.config, p.expression)
  // Prefer the server analysis (tiers/rules) for expressions the parser cannot map.
  const an = (p as Price & { analysis?: { tiers?: unknown; rules?: unknown } }).analysis
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

async function override(p: Price) {
  try {
    const r = await api.post<Price>(`/prices/${p.id}/override`)
    toast(t('prices.overridden'), 'success')
    if (r?.id) router.push(`/prices/${r.id}`)
    else reload()
  } catch (e) {
    notifyError(e)
  }
}

async function remove(p: Price) {
  const ok = await confirm({ message: t('common.confirmDelete', { name: p.model_pattern }), danger: true })
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
        <SButton v-if="canManage" variant="primary" @click="router.push('/prices/new')">+ {{ t('prices.new') }}</SButton>
      </template>
      <template #filters>
        <div class="w-40">
          <label class="input-label">{{ t('prices.modeCol') }}</label>
          <SSelect v-model="filters.mode" :options="modeOptions" />
        </div>
        <div class="w-64">
          <label class="input-label">{{ t('common.search') }}</label>
          <input v-model="filters.q" class="input" :placeholder="t('prices.searchPlaceholder')" />
        </div>
      </template>
    </SPageHeader>

    <p class="mb-3 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-800 dark:bg-primary-900/20 dark:text-primary-200" data-testid="price-scope-note">
      {{ t('prices.scopeNote') }}
    </p>
    <div class="card overflow-hidden">
      <STable :columns="columns" :rows="rows" :loading="loading">
        <template #cell-model_pattern="{ row }">
          <RouterLink :to="`/prices/${row.id}`" class="link font-mono text-sm">{{ row.model_pattern }}</RouterLink>
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
          <SBadge :tone="row.source === 'admin' ? 'primary' : 'purple'">
            {{ row.source === 'admin' ? t('prices.source.admin') : t('prices.source.plugin_default') }}
          </SBadge>
          <span v-if="row.plugin_key" class="muted ml-1 text-xs">{{ row.plugin_key }}</span>
        </template>
        <template #cell-enabled="{ row }">
          <SSwitch :model-value="row.enabled" :disabled="!canManage || toggling.has(row.id)" @update:model-value="toggle(row, $event)" />
        </template>
        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-1">
            <template v-if="row.source === 'plugin_default'">
              <SButton v-if="canManage" size="sm" variant="ghost" @click="override(row)">{{ t('prices.override') }}</SButton>
              <SButton size="sm" variant="ghost" @click="router.push(`/prices/${row.id}`)">{{ t('common.view') }}</SButton>
            </template>
            <template v-else-if="canManage">
              <SButton size="sm" variant="ghost" @click="router.push(`/prices/${row.id}`)">{{ t('common.edit') }}</SButton>
              <SButton size="sm" variant="ghost" class="!text-red-600" @click="remove(row)">{{ t('common.delete') }}</SButton>
            </template>
            <SButton v-else size="sm" variant="ghost" @click="router.push(`/prices/${row.id}`)">{{ t('common.view') }}</SButton>
          </div>
        </template>
      </STable>
    </div>
    <SPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
    <p class="muted mt-2 text-xs">{{ t('prices.overrideNote') }}</p>
  </div>
</template>
