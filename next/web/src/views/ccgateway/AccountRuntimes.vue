<script setup lang="ts">
// Read-only list of the per-account containers (one container per Claude Code
// account). Authorizing happens on the Accounts page: each row links to the
// account editor (/accounts?edit=<id>), where the container is started and
// the Claude login is completed.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCard, SHint, SIcon, SSwitch, STable, type TableColumn } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { ACCOUNT_KEYS, useOwnership } from '@/composables/useOwnership'
import { runPool } from '@/views/accounts/pool'
import { containerPhase, knownReason, type CcgContainer } from './ccgAuthFlow'
import CredentialStatusNotice from './CredentialStatusNotice.vue'
import type { CcgRuntimeHealth } from '@/api/types'

interface RequestLogState {
  enabled: boolean
  per_request_limit_bytes?: number
  retention_hours?: number
  storage_budget_bytes?: number
  overflow_behavior?: string
}

interface Row {
  id: number
  name: string
  type: string
  status: string
  /** Why a blocked container is stopped (no_proxy / proxy_disabled / account_disabled). */
  reason: string
  container: string
  phase: CcgContainer
  /** null: unknown (container not ready, API key accounts, or the check failed) */
  loggedIn: boolean | null
  health?: CcgRuntimeHealth
  checking: boolean
  error: boolean
  created_by?: number | null
  logsEnabled: boolean | null
  logsBusy: boolean
  logsError: boolean
  logsLimits: RequestLogState | null
}

const { t } = useI18n()
const auth = useAuthStore()
const own = useOwnership()
const canLogs = (r: Row) => auth.has('settings:manage') || own.can(r, ACCOUNT_KEYS.update)
const rows = ref<Row[]>([])
const loading = ref(false)
const error = ref('')
const canAccounts = computed(() => auth.has('account:read') || auth.has('account:own:read') || auth.has('account:update') || auth.has('account:own:update'))

const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('ccgateway.runtimes.account') },
  { key: 'container', label: t('ccgateway.runtimes.container') },
  { key: 'auth', label: t('ccgateway.runtimes.auth') },
  { key: 'request_logs', label: t('ccgateway.requestLogs.title') },
  { key: 'actions', label: '', align: 'right' }
])

async function inspect(r: Row) {
  r.checking = true
  try {
    const s = await api.get<{ status: string; container?: string; reason?: string }>(`/system/ccgateway/accounts/${r.id}/status`)
    r.status = s.status
    r.reason = s.reason || ''
    r.container = s.container || ''
    r.phase = containerPhase(s.status)
    if (r.phase === 'ready' && r.type === 'managed') {
      r.health = await api.get<CcgRuntimeHealth>(`/system/ccgateway/accounts/${r.id}/health`)
      r.loggedIn = r.health.credential_present ?? r.health.logged_in
    }
    if (r.phase === 'ready') {
      try {
        applyLogs(r, await api.get<RequestLogState>(`/system/ccgateway/accounts/${r.id}/request-logs`))
      } catch { r.logsError = true }
    }
  } catch {
    r.error = true
  } finally {
    r.checking = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const list = await api.list<{ id: number; name: string; type: string; created_by?: number | null }>('/accounts', { plugin_key: 'ccgateway', page_size: 200 })
    rows.value = list.items.map((a) => ({ id: a.id, name: a.name, type: a.type, created_by: a.created_by, status: '', reason: '', container: '', phase: 'unknown', loggedIn: null, checking: true, error: false, logsEnabled: null, logsBusy: false, logsError: false, logsLimits: null }))
  } catch {
    error.value = t('ccgateway.runtimes.loadFailed')
    rows.value = []
  } finally {
    loading.value = false
  }
  // Reactive proxies, so each row updates as its checks finish.
  await runPool(rows.value, 4, (r) => inspect(r))
}
onMounted(load)

async function setLogs(r: Row, enabled: boolean) {
  if (r.logsBusy || !canLogs(r)) return
  r.logsBusy = true
  r.logsError = false
  try {
    applyLogs(r, await api.put<RequestLogState>(`/system/ccgateway/accounts/${r.id}/request-logs`, { enabled }))
  } catch { r.logsError = true }
  finally { r.logsBusy = false }
}

function applyLogs(r: Row, state: RequestLogState) {
  if (typeof state?.enabled !== 'boolean') throw new Error('invalid request log state')
  r.logsEnabled = state.enabled
  const values = [state.per_request_limit_bytes, state.retention_hours, state.storage_budget_bytes]
  r.logsLimits = values.every(value => typeof value === 'number' && Number.isSafeInteger(value) && value > 0) ? state : null
}

function logLimits(r: Row): string {
  const limits = r.logsLimits
  if (!limits) return t('ccgateway.requestLogs.unreportedLimits')
  return t('ccgateway.requestLogs.limits', {
    hours: limits.retention_hours,
    request: Number((limits.per_request_limit_bytes! / 1048576).toFixed(3)),
    total: Number((limits.storage_budget_bytes! / 1048576).toFixed(3)),
  })
}

function containerBadge(r: Row): { tone: 'success' | 'warning' | 'danger' | 'gray'; label: string } {
  if (r.error) return { tone: 'danger', label: t('ccgateway.runtimes.state.unavailable') }
  if (r.phase === 'ready') return { tone: 'success', label: t('ccgateway.runtimes.state.ready') }
  if (r.phase === 'blocked') {
    const k = knownReason(r.reason)
    return { tone: 'danger', label: t('ccgateway.accountAuth.blockedTitle', { reason: k ? t(`ccgateway.reason.${k}`) : r.reason || t('ccgateway.accountAuth.blockedUnknown') }) }
  }
  if (r.phase === 'error') return { tone: 'danger', label: t('ccgateway.runtimes.state.error') }
  if (r.phase === 'preparing') return { tone: 'warning', label: t('ccgateway.runtimes.state.preparing') }
  return { tone: 'gray', label: t('ccgateway.runtimes.state.unknown') }
}
const needsAuth = (r: Row) => r.type === 'managed' && r.loggedIn !== true
</script>

<template>
  <SCard :title="t('ccgateway.runtimes.title')" :subtitle="t('ccgateway.runtimes.hint')">
    <template #actions>
      <SButton size="sm" :loading="loading" :title="t('common.refresh')" @click="load"><SIcon name="refresh" class="h-4 w-4" /></SButton>
      <SButton v-if="canAccounts" size="sm" variant="primary" to="/accounts">{{ t('ccgateway.runtimes.openAccounts') }}</SButton>
    </template>
    <div class="space-y-3">
      <SHint tone="warning">{{ t('ccgateway.runtime.switchHint') }}</SHint>
      <SHint>{{ t('ccgateway.requestLogs.hint') }}</SHint>
      <SHint v-if="error" tone="danger">{{ error }}</SHint>
      <STable :columns="columns" :rows="rows" :loading="loading" dense :empty-text="t('ccgateway.runtimes.empty')" data-testid="ccgateway-runtimes">
        <template #cell-name="{ row }">
          <div class="font-medium">{{ row.name }} <span class="font-mono text-xs text-gray-400">#{{ row.id }}</span></div>
          <div class="text-xs text-gray-500 dark:text-dark-400">{{ row.type === 'managed' ? t('ccgateway.runtimes.typeOAuth') : t('ccgateway.runtimes.typeApiKey') }}</div>
        </template>
        <template #cell-container="{ row }">
          <SBadge :tone="containerBadge(row).tone" dot>{{ row.checking ? t('ccgateway.runtimes.checking') : containerBadge(row).label }}</SBadge>
          <div v-if="row.container" class="mt-0.5 font-mono text-[11px] text-gray-400">{{ row.container }}</div>
        </template>
        <template #cell-auth="{ row }">
          <SHint v-if="row.type !== 'managed'" inline size="xs">{{ t('ccgateway.runtimes.noAuthNeeded') }}</SHint>
          <SBadge v-else-if="row.loggedIn === true" tone="success">{{ t('ccgateway.runtimes.authorized') }}</SBadge>
          <SBadge v-else-if="row.loggedIn === false" tone="warning">{{ t('ccgateway.runtimes.notAuthorized') }}</SBadge>
          <SHint v-else inline size="xs">—</SHint>
          <CredentialStatusNotice :status="row.health" />
        </template>
        <template #cell-request_logs="{ row }">
          <SSwitch v-if="row.logsEnabled !== null" :model-value="row.logsEnabled" :disabled="!canLogs(row) || row.logsBusy || row.checking || loading" :label="t('ccgateway.requestLogs.title')" :data-testid="`request-logs-${row.id}`" @update:model-value="setLogs(row, $event)" />
          <SHint v-else inline size="xs">—</SHint>
          <p v-if="row.logsEnabled !== null" class="mt-1 max-w-64 text-xs text-gray-500" :data-testid="`request-log-limits-${row.id}`">{{ logLimits(row) }} {{ row.logsLimits?.overflow_behavior === 'retain_partial_with_metadata' ? t('ccgateway.requestLogs.overflow') : t('ccgateway.requestLogs.unreportedOverflow') }}</p>
          <SHint v-if="row.logsError" tone="danger" size="xs">{{ t('ccgateway.requestLogs.failed') }}</SHint>
        </template>
        <template #cell-actions="{ row }">
          <SButton v-if="canAccounts" size="sm" :variant="needsAuth(row) ? 'primary' : 'ghost'" :to="{ path: '/accounts', query: { edit: String(row.id) } }" data-testid="ccgateway-runtime-edit">
            {{ needsAuth(row) ? t('ccgateway.runtimes.goAuthorize') : t('ccgateway.runtimes.goEdit') }}
          </SButton>
        </template>
      </STable>
    </div>
  </SCard>
</template>
