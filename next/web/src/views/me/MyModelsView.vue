<script setup lang="ts">
// Mine > Models & prices: what one of the caller's groups can use and what it
// costs there, the model's price times the group's rate (CONTRACTS §79.4).
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SCard, SInput, SPageHeader, SSelect, STable, type TableColumn } from '@sub2api/ui'
import type { Group } from '@/api/types'
import { fetchMyGroups } from '@/composables/lookups'
import { num, parseExpression, summarize, tokenPricesFrom, normalizeVisual, hasVisualConfig, type PriceMode, type TokenPrices } from '@/views/prices/priceExpr'
import { errorMessage } from '@/utils/errors'

interface PriceRow {
  model: string
  mode: PriceMode
  config: Record<string, any> | null
  expression: string
}

const { t } = useI18n()
const groups = ref<Group[]>([])
const groupID = ref('')
const rows = ref<PriceRow[]>([])
const rate = ref(1)
const loading = ref(false)
const error = ref('')
const search = ref('')

const groupOptions = computed(() => groups.value.map((g) => ({ value: String(g.id), label: `${g.name} · ×${Number(g.rate_multiplier)}` })))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await api.get<{ group?: { id: number }; prices: PriceRow[]; rate_multiplier: string }>('/me/prices', groupID.value ? { group_id: groupID.value } : {})
    rows.value = r.prices || []
    rate.value = Number(r.rate_multiplier) || 0
    if (!groupID.value && r.group?.id) groupID.value = String(r.group.id)
  } catch (e) {
    rows.value = []
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  try {
    groups.value = await fetchMyGroups()
  } catch (e) {
    error.value = errorMessage(e)
  }
  await load()
})
watch(groupID, (v, old) => {
  if (old) load()
})

/** The tokens' prices of a row, or a per-request price; a tiered model shows its first tier. */
function priceOf(row: PriceRow): { perRequest?: number; tokens?: TokenPrices; tiers: number; custom?: boolean } {
  const s = summarize(row.mode, row.config, row.expression)
  if (s.kind === 'per_request') return { perRequest: s.price, tiers: 1 }
  if (s.kind === 'per_token') return { tokens: s.prices, tiers: 1 }
  if (s.kind === 'visual') {
    const v = hasVisualConfig(row.config) ? normalizeVisual(row.config) : parseExpression(row.expression)
    const first = v?.tiers[0]
    if (first) return { tokens: tokenPricesFrom(first), tiers: s.tiers }
  }
  return { tiers: 1, custom: true }
}
function money(v: number | null | undefined): string {
  if (v == null) return '—'
  const n = num(v) * rate.value
  return `$${Number(n.toFixed(4))}`
}
const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return (q ? rows.value.filter((r) => r.model.toLowerCase().includes(q)) : rows.value).map((r) => ({ ...r, price: priceOf(r) }))
})

const columns = computed<TableColumn[]>(() => [
  { key: 'model', label: t('me.models.model') },
  { key: 'input', label: t('me.models.input'), align: 'right', width: '120px' },
  { key: 'output', label: t('me.models.output'), align: 'right', width: '120px' },
  { key: 'cacheRead', label: t('me.models.cacheRead'), align: 'right', width: '120px' },
  { key: 'cacheWrite', label: t('me.models.cacheWrite'), align: 'right', width: '120px' }
])
</script>

<template>
  <div class="flex flex-col gap-4">
    <SPageHeader :title="t('me.models.title')" :description="t('me.models.description')" />
    <div class="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3 shadow-sm">
      <SSelect v-model="groupID" class="w-64" size="sm" :aria-label="t('me.models.group')" :options="groupOptions" data-testid="models-group" />
      <SInput v-model="search" class="w-64" size="sm" icon="search" clearable :placeholder="t('me.models.search')" :aria-label="t('me.models.search')" data-testid="models-search" />
      <span class="ms-auto text-xs text-fg-muted" data-testid="models-unit">{{ t('me.models.unit', { rate }) }}</span>
    </div>
    <SAlert v-if="error" tone="danger" dense>{{ error }}</SAlert>
    <SCard :padded="false" data-testid="models-table">
      <STable :columns="columns" :rows="shown" :loading="loading" row-key="model" dense :empty-text="t('me.models.empty')">
        <template #cell-model="{ row }">
          <span class="font-mono text-sm">{{ row.model }}</span>
          <SBadge v-if="row.price.tiers > 1" tone="gray" class="ms-2">{{ t('me.models.tiered', { n: row.price.tiers }) }}</SBadge>
        </template>
        <template #cell-input="{ row }">
          <span v-if="row.price.perRequest != null" class="font-mono text-xs" data-testid="models-per-request">{{ t('me.models.perRequest', { price: money(row.price.perRequest) }) }}</span>
          <span v-else-if="row.price.custom" class="text-xs text-fg-muted">{{ t('me.models.custom') }}</span>
          <span v-else class="font-mono text-xs">{{ money(row.price.tokens?.p) }}</span>
        </template>
        <template #cell-output="{ row }"><span class="font-mono text-xs">{{ money(row.price.tokens?.c) }}</span></template>
        <template #cell-cacheRead="{ row }"><span class="font-mono text-xs">{{ money(row.price.tokens?.cr) }}</span></template>
        <template #cell-cacheWrite="{ row }"><span class="font-mono text-xs">{{ money(row.price.tokens?.cc) }}</span></template>
      </STable>
    </SCard>
  </div>
</template>
