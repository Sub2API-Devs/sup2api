<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCard, SIcon, SSelect, STable, toast, type TableColumn } from '@sub2api/ui'
import { formatBytes, formatDateTime, formatNumber } from '@/utils/format'
import { notifyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { asArray, pick, type PluginDetail } from '../pluginUtil'

interface EgressSummary {
  host: string
  port?: number | null
  count: number
  bytes_in: number
  bytes_out: number
  results: Record<string, number>
  last_seen?: string | null
}

interface EgressLog {
  id?: number
  node_id?: string
  host: string
  port?: number
  started_at?: string
  duration_ms?: number
  bytes_in?: number
  bytes_out?: number
  result?: string
}

const props = defineProps<{ detail: PluginDetail }>()
const emit = defineEmits<{ (e: 'changed'): void }>()
const { t } = useI18n()
const auth = useAuthStore()

const canRead = computed(() => auth.has('plugin:egress:read'))
const canManage = computed(() => auth.has('plugin:manage'))

const policy = ref<string>(props.detail.egress_policy || 'allow_all')
const savingPolicy = ref(false)
watch(
  () => props.detail.egress_policy,
  (v) => (policy.value = v || 'allow_all')
)

const policyOptions = computed(() => [
  { value: 'allow_all', label: t('plugins.egress.policies.allow_all') },
  { value: 'allowlist', label: t('plugins.egress.policies.allowlist') }
])

/** Domains approved through the "net" grant (effective in allowlist mode). */
const allowedDomains = computed(() => {
  const g = (props.detail.grants || []).find((x) => x.permission === 'net' && x.status !== 'revoked')
  return asArray<string>(pick(g?.scope, 'domains'))
})

const range = ref<'1h' | '24h' | '7d'>('24h')
const rangeOptions = computed(() => [
  { value: '1h', label: t('plugins.egress.last1h') },
  { value: '24h', label: t('plugins.egress.last24h') },
  { value: '7d', label: t('common.last7d') }
])

const loading = ref(false)
const summary = ref<EgressSummary[]>([])
const logs = ref<EgressLog[]>([])

function aggregate(list: EgressLog[]): EgressSummary[] {
  const m = new Map<string, EgressSummary>()
  for (const l of list) {
    const k = `${l.host}:${l.port ?? ''}`
    let s = m.get(k)
    if (!s) {
      s = { host: l.host, port: l.port, count: 0, bytes_in: 0, bytes_out: 0, results: {}, last_seen: null }
      m.set(k, s)
    }
    s.count++
    s.bytes_in += Number(l.bytes_in || 0)
    s.bytes_out += Number(l.bytes_out || 0)
    const r = l.result || 'unknown'
    s.results[r] = (s.results[r] || 0) + 1
    if (l.started_at && (!s.last_seen || l.started_at > s.last_seen)) s.last_seen = l.started_at
  }
  return [...m.values()].sort((a, b) => b.count - a.count)
}

function normalizeSummary(x: Record<string, any>): EgressSummary {
  let results = pick<Record<string, number> | Array<{ result: string; count: number }>>(x, 'results', 'by_result') || {}
  if (Array.isArray(results)) results = Object.fromEntries(results.map((r) => [r.result, r.count]))
  return {
    host: String(pick(x, 'host', 'domain') ?? ''),
    port: pick<number>(x, 'port') ?? null,
    count: Number(pick(x, 'count', 'connections', 'total') ?? 0),
    bytes_in: Number(pick(x, 'bytes_in') ?? 0),
    bytes_out: Number(pick(x, 'bytes_out') ?? 0),
    results,
    last_seen: pick<string>(x, 'last_seen', 'last_at') ?? null
  }
}

async function load() {
  if (!canRead.value) return
  loading.value = true
  const hours = range.value === '1h' ? 1 : range.value === '24h' ? 24 : 24 * 7
  const to = new Date()
  const from = new Date(to.getTime() - hours * 3600_000)
  try {
    const r = await api.get<any>(`/plugins/${encodeURIComponent(props.detail.key)}/egress`, { from: from.toISOString(), to: to.toISOString() })
    if (Array.isArray(r)) {
      logs.value = r
      summary.value = aggregate(r)
    } else {
      logs.value = asArray<EgressLog>(pick(r, 'items', 'details', 'logs', 'detail'))
      const s = asArray<Record<string, any>>(pick(r, 'summary', 'domains', 'by_domain'))
      summary.value = s.length ? s.map(normalizeSummary) : aggregate(logs.value)
    }
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}

async function savePolicy() {
  savingPolicy.value = true
  try {
    await api.put(`/plugins/${encodeURIComponent(props.detail.key)}/egress-policy`, { policy: policy.value })
    toast(t('common.saved'), 'success')
    emit('changed')
  } catch (e) {
    notifyError(e)
  } finally {
    savingPolicy.value = false
  }
}

function resultTone(r: string) {
  return r === 'ok' || r === 'success' ? ('success' as const) : r === 'denied' || r === 'blocked' ? ('warning' as const) : ('danger' as const)
}

const summaryColumns = computed<TableColumn[]>(() => [
  { key: 'host', label: t('plugins.egress.destination') },
  { key: 'count', label: t('plugins.egress.connections'), align: 'right' },
  { key: 'bytes', label: t('plugins.egress.traffic'), align: 'right' },
  { key: 'results', label: t('plugins.egress.results') },
  { key: 'last_seen', label: t('plugins.egress.lastSeen') }
])

const logColumns = computed<TableColumn[]>(() => [
  { key: 'started_at', label: t('common.time') },
  { key: 'node_id', label: t('plugins.nodes.node') },
  { key: 'host', label: t('plugins.egress.destination') },
  { key: 'duration_ms', label: t('plugins.jobs.duration'), align: 'right' },
  { key: 'bytes', label: t('plugins.egress.traffic'), align: 'right' },
  { key: 'result', label: t('plugins.egress.result') }
])

const summaryRows = computed(() => summary.value.map((s) => ({ ...s, _k: `${s.host}:${s.port ?? ''}` })))
const logRows = computed(() => logs.value.slice(0, 500).map((l, i) => ({ ...l, _k: l.id ?? i })))

watch(range, load)
onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <SCard :title="t('plugins.egress.policy')">
      <div class="flex flex-wrap items-end gap-3">
        <div class="w-64">
          <SSelect :model-value="policy" :options="policyOptions" :disabled="!canManage" @update:model-value="(v) => (policy = String(v))" />
        </div>
        <SButton v-if="canManage" variant="primary" :loading="savingPolicy" :disabled="policy === (detail.egress_policy || 'allow_all')" @click="savePolicy">
          {{ t('common.save') }}
        </SButton>
      </div>
      <p class="mt-2 text-xs muted">{{ t(`plugins.egress.policyHint.${policy}`) }}</p>
      <div class="mt-3 text-sm">
        <span class="muted">{{ t('plugins.egress.approvedDomains') }}</span>
        <span v-if="allowedDomains.length" class="ml-2 inline-flex flex-wrap gap-1">
          <code v-for="d in allowedDomains" :key="d" class="rounded bg-gray-100 px-1.5 font-mono text-xs dark:bg-dark-700">{{ d }}</code>
        </span>
        <span v-else class="ml-2 muted">{{ t('common.none') }}</span>
      </div>
    </SCard>

    <template v-if="canRead">
      <SCard :title="t('plugins.egress.byDomain')" :padded="false">
        <template #actions>
          <div class="w-36">
            <SSelect :model-value="range" :options="rangeOptions" @update:model-value="(v) => (range = v as '1h' | '24h' | '7d')" />
          </div>
          <SButton size="sm" variant="ghost" :loading="loading" @click="load"><SIcon name="refresh" class="h-4 w-4" /></SButton>
        </template>
        <STable :columns="summaryColumns" :rows="summaryRows" :loading="loading" row-key="_k">
          <template #cell-host="{ row }">
            <span class="font-mono text-sm">{{ row.host }}<span v-if="row.port" class="muted">:{{ row.port }}</span></span>
            <SBadge v-if="detail.egress_policy === 'allowlist' && !allowedDomains.includes(row.host)" tone="warning" class="ml-2">
              {{ t('plugins.egress.notAllowlisted') }}
            </SBadge>
          </template>
          <template #cell-count="{ row }">{{ formatNumber(row.count) }}</template>
          <template #cell-bytes="{ row }">
            <span class="whitespace-nowrap text-xs">↑{{ formatBytes(row.bytes_out) }} ↓{{ formatBytes(row.bytes_in) }}</span>
          </template>
          <template #cell-results="{ row }">
            <div class="flex flex-wrap gap-1">
              <SBadge v-for="(n, r) in row.results" :key="r" :tone="resultTone(String(r))">{{ r }} × {{ formatNumber(n) }}</SBadge>
            </div>
          </template>
          <template #cell-last_seen="{ row }">
            <span class="whitespace-nowrap text-xs">{{ formatDateTime(row.last_seen) }}</span>
          </template>
        </STable>
      </SCard>

      <SCard v-if="logRows.length" :title="t('plugins.egress.details')" :padded="false">
        <STable :columns="logColumns" :rows="logRows" row-key="_k" dense>
          <template #cell-started_at="{ row }"><span class="whitespace-nowrap text-xs">{{ formatDateTime(row.started_at) }}</span></template>
          <template #cell-host="{ row }">
            <span class="font-mono text-xs">{{ row.host }}<span v-if="row.port" class="muted">:{{ row.port }}</span></span>
          </template>
          <template #cell-duration_ms="{ row }">{{ row.duration_ms != null ? row.duration_ms + 'ms' : '—' }}</template>
          <template #cell-bytes="{ row }">
            <span class="whitespace-nowrap text-xs">↑{{ formatBytes(row.bytes_out ?? 0) }} ↓{{ formatBytes(row.bytes_in ?? 0) }}</span>
          </template>
          <template #cell-result="{ row }">
            <SBadge :tone="resultTone(String(row.result))">{{ row.result || '—' }}</SBadge>
          </template>
        </STable>
      </SCard>
    </template>
    <p v-else class="text-sm muted">{{ t('plugins.egress.noReadPermission') }}</p>
  </div>
</template>
