<script setup lang="ts">
// Per-account runtime list and administrator cleanup action (one container per Claude Code
// account). Authorizing happens on the Accounts page: each row links to the
// account editor (/accounts?edit=<id>), where the container is started and
// the Claude login is completed.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCard, SHint, SModal, SSegmented, SSwitch, STable, STooltip, confirm, toast, type SelectOption, type TableColumn } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { ACCOUNT_KEYS, useOwnership } from '@/composables/useOwnership'
import { fetchFirstPage } from '@/composables/lookups'
import { runPool } from '@/views/accounts/pool'
import type { CcgRuntimeHealth } from '@/api/types'
import { containerPhase, type CcgContainer } from './ccgAuthFlow'
import { useCcgText } from './ccgError'
import CredentialStatusNotice from './CredentialStatusNotice.vue'
import CLISettings from './CLISettings.vue'
import RetainedRuntimes from './RetainedRuntimes.vue'
import RequestLogViewer from './RequestLogViewer.vue'
import {
  FULL_HOURS, LOG_SETTINGS, activeSetting, countOverrides, effectiveAt, isLevel, isSetting, policyOf, workerInfoOf,
  type RequestLogLevel, type RequestLogPolicy, type RequestLogTier, type WorkerLogInfo,
} from './requestLogPolicy'

/**
 * GET / PUT /request-logs of an older core: the Worker state itself. A Worker
 * with levels (REQUEST-LOG-LEVELS-DESIGN §4) reports `levels`; an older one
 * only `enabled` and the flat limits, and keeps the old switch. A current core
 * answers with the account setting instead (requestLogPolicy.ts).
 */
interface RequestLogState {
  enabled: boolean
  per_request_limit_bytes?: number
  retention_hours?: number
  storage_budget_bytes?: number
  overflow_behavior?: string
  level?: RequestLogLevel
  full_until?: string | null
  levels?: RequestLogLevel[]
  limits?: { summary?: RequestLogTier; full?: RequestLogTier }
  usage?: { summary_bytes?: number; full_bytes?: number; requests?: number }
  /** The Worker serves the log reads (REQUEST-LOG-VIEWER-DESIGN.md). */
  viewer?: boolean
  /** The list takes mode / session / hash / rewritten filters (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §3). */
  viewer_search?: boolean
}

/** Validated level state of a Worker that reports levels (older core). */
interface RequestLogLevels extends WorkerLogInfo {
  level: RequestLogLevel
  levels: RequestLogLevel[]
  /** ms since epoch, only at the full level */
  fullUntil: number | null
}

interface Row {
  id: number
  name: string
  type: string
  status: string
  /** Why a blocked container is stopped (account_deleted). */
  reason: string
  container: string
  phase: CcgContainer
  /** null: unknown (container not ready, API key accounts, or the check failed) */
  loggedIn: boolean | null
  health?: CcgRuntimeHealth
  /** Claude Code version the Worker observed ('' unknown). */
  cliVersion: string
  checking: boolean
  error: boolean
  created_by?: number | null
  logsEnabled: boolean | null
  logsBusy: boolean
  logsError: boolean
  logsLimits: RequestLogState | null
  /** null: an older Worker without levels (the switch is shown). */
  logsLevels: RequestLogLevels | null
  /** The account setting of a current core; null: an older core (logsLevels / logsEnabled). */
  logsPolicy: RequestLogPolicy | null
}

/** overrides: accounts with their own log setting among the loaded rows (null: none from a current core). */
const emit = defineEmits<{ (event: 'overrides', count: number | null): void }>()

const { t } = useI18n()
const router = useRouter()
const { blockedTitle } = useCcgText()
const auth = useAuthStore()
/** Bumped by reload(): the retained list below reloads with the table. */
const retainedRevision = ref(0)
const own = useOwnership()
const canLogs = (r: Row) => auth.has('settings:manage') || own.can(r, ACCOUNT_KEYS.update)
// Reading the logs: settings or account readers, not own-level ones (§7).
const canViewLogs = computed(() => auth.has('settings:read') || auth.has('account:read'))
const viewing = ref<Row | null>(null)
const viewerOpen = computed({ get: () => viewing.value !== null, set: (v: boolean) => { if (!v) viewing.value = null } })
const showViewer = (r: Row) => canViewLogs.value && (r.logsPolicy
  // A current core: shown while the Worker is unreachable too (disabled), since logs may exist at any level (§3).
  ? !r.logsPolicy.worker || r.logsPolicy.worker.viewer
  : !!r.logsLevels?.viewer && r.logsLevels.level !== 'off')
/** Limits, usage and viewer the row's Worker reported, whichever core answered. */
const workerOf = (r: Row): WorkerLogInfo | null => (r.logsPolicy ? r.logsPolicy.worker : r.logsLevels)
const rows = ref<Row[]>([])
const loading = ref(false)
const cleaning = ref(false)
const error = ref('')
const canAccounts = computed(() => auth.has('account:read') || auth.has('account:own:read') || auth.has('account:update') || auth.has('account:own:update'))

const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('ccgateway.runtimes.account') },
  { key: 'container', label: t('ccgateway.runtimes.container') },
  { key: 'cli_version', label: t('ccgateway.runtimes.cliVersion') },
  { key: 'auth', label: t('ccgateway.runtimes.auth') },
  { key: 'request_logs', label: t('ccgateway.requestLogs.title') },
  { key: 'actions', label: '', align: 'right', width: '240px' }
])

// Same shape the core accepts; anything else is not shown.
const CLI_VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,63}$/
const cliVersionOf = (h?: CcgRuntimeHealth | null) => (typeof h?.cli_version === 'string' && CLI_VERSION_RE.test(h.cli_version) ? h.cli_version : '')

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
      r.cliVersion = cliVersionOf(r.health)
    } else if (r.phase === 'ready') {
      // API key accounts need no login state: only the version, best effort.
      try { r.cliVersion = cliVersionOf(await api.get<CcgRuntimeHealth>(`/system/ccgateway/accounts/${r.id}/health`)) } catch { /* shown as unknown */ }
    }
    // A current core answers for every account (worker null while the container is not
    // ready), so the level can be set before it runs; an older one only through a ready Worker.
    try {
      applyLogs(r, await api.get<unknown>(`/system/ccgateway/accounts/${r.id}/request-logs`))
    } catch { if (r.phase === 'ready') r.logsError = true }
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
    const list = await fetchFirstPage<{ id: number; name: string; type: string; created_by?: number | null }>('/accounts', { plugin_key: 'ccgateway' })
    rows.value = list.map((a) => ({ id: a.id, name: a.name, type: a.type, created_by: a.created_by, status: '', reason: '', container: '', phase: 'unknown', loggedIn: null, cliVersion: '', checking: true, error: false, logsEnabled: null, logsBusy: false, logsError: false, logsLimits: null, logsLevels: null, logsPolicy: null }))
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
/** A later load (refresh, after a cleanup) also reloads the retained list, which loads itself on mount. */
function reload() {
  retainedRevision.value++
  return load()
}

async function cleanupOrphans() {
  if (cleaning.value || !auth.has('settings:manage')) return
  if (!await confirm({ title: t('ccgateway.cleanup.title'), message: t('ccgateway.cleanup.confirm'), confirmText: t('ccgateway.cleanup.action'), danger: true })) return
  cleaning.value = true
  try {
    // Core supplies the complete database list, including disabled accounts and
    // active authorization preparations. The visible table is not authoritative.
    const report = await api.post<{ deleted: number; failed: number }>('/system/ccgateway/runtime/cleanup', {}, { signal: AbortSignal.timeout(330000) })
    toast(t('ccgateway.cleanup.done', report), report.failed ? 'error' : 'success')
    await reload()
  } catch {
    toast(t('ccgateway.cleanup.failed'), 'error')
  } finally {
    cleaning.value = false
  }
}

async function setLogs(r: Row, enabled: boolean) {
  await putLogs(r, { enabled })
}

async function putLogs(r: Row, body: Record<string, unknown>) {
  if (r.logsBusy || !canLogs(r)) return
  r.logsBusy = true
  r.logsError = false
  try {
    applyLogs(r, await api.put<unknown>(`/system/ccgateway/accounts/${r.id}/request-logs`, body))
  } catch { r.logsError = true }
  finally { r.logsBusy = false }
}

/** The level state of a Worker that reports levels; throws when it is malformed. */
function levelsOf(state: RequestLogState): RequestLogLevels {
  const levels = state.levels!
  if (!levels.length || !levels.every(isLevel) || !isLevel(state.level) || !levels.includes(state.level)) throw new Error('invalid request log level')
  let fullUntil: number | null = null
  if (state.level === 'full') {
    fullUntil = typeof state.full_until === 'string' ? Date.parse(state.full_until) : NaN
    if (!Number.isFinite(fullUntil)) throw new Error('invalid request log expiry')
  }
  return { level: state.level, levels, fullUntil, ...workerInfoOf(state as unknown as Record<string, unknown>) }
}

/** Takes the answer of either core; throws (leaving the row as it was) when it is malformed. */
function applyLogs(r: Row, answer: unknown) {
  const policy = policyOf(answer)
  if (policy) {
    Object.assign(r, { logsPolicy: policy, logsEnabled: null, logsLevels: null, logsLimits: null })
    return
  }
  const state = answer as RequestLogState
  if (typeof state.enabled !== 'boolean') throw new Error('invalid request log state')
  const levels = Array.isArray(state.levels) ? levelsOf(state) : null
  r.logsPolicy = null
  r.logsEnabled = state.enabled
  r.logsLevels = levels
  const values = [state.per_request_limit_bytes, state.retention_hours, state.storage_budget_bytes]
  r.logsLimits = values.every(value => typeof value === 'number' && Number.isSafeInteger(value) && value > 0) ? state : null
}

const levelOptions = (r: Row): SelectOption[] => r.logsLevels!.levels.map(l => ({ value: l, label: t(`ccgateway.requestLogs.level.${l}`) }))
/** Follow names the default it follows, e.g. "跟随默认（摘要）". */
const settingOptions = (p: RequestLogPolicy): SelectOption[] => LOG_SETTINGS.map(s => ({
  value: s,
  label: s === 'follow' ? t('ccgateway.requestLogs.follow', { level: t(`ccgateway.requestLogs.level.${p.default}`) }) : t(`ccgateway.requestLogs.level.${s}`),
}))

/** The full level is only enabled for a chosen duration, after the warning. */
const fullDialog = ref<{ row: Row; hours: number } | null>(null)
const fullDialogOpen = computed({ get: () => fullDialog.value !== null, set: (v: boolean) => { if (!v) fullDialog.value = null } })
const hourOptions = computed<SelectOption[]>(() => FULL_HOURS.map(h => ({ value: h, label: t('ccgateway.requestLogs.hours', { n: h }) })))
function setHours(v: SelectOption['value']) {
  if (fullDialog.value && typeof v === 'number' && (FULL_HOURS as readonly number[]).includes(v)) fullDialog.value.hours = v
}

async function chooseLevel(r: Row, value: SelectOption['value']) {
  if (r.logsBusy || !canLogs(r) || !isLevel(value) || value === r.logsLevels?.level) return
  if (value === 'full') {
    fullDialog.value = { row: r, hours: 1 }
    return
  }
  if (value === 'off' && !await confirm({ title: t('ccgateway.requestLogs.offTitle'), message: t('ccgateway.requestLogs.offConfirm'), confirmText: t('ccgateway.requestLogs.offAction'), danger: true })) return
  await putLogs(r, { level: value })
}

/**
 * A current core only stores the setting (§4): off stops recording without
 * deleting anything, so nothing but the full level asks first.
 */
async function chooseSetting(r: Row, value: SelectOption['value']) {
  const p = r.logsPolicy
  if (!p || r.logsBusy || !canLogs(r) || !isSetting(value) || value === activeSetting(p, now.value)) return
  if (value === 'full') {
    fullDialog.value = { row: r, hours: 1 }
    return
  }
  await putLogs(r, { level: value })
}

async function confirmFull() {
  const pending = fullDialog.value
  if (!pending) return
  fullDialog.value = null
  await putLogs(pending.row, { level: 'full', full_for_hours: pending.hours })
}

async function clearFull(r: Row) {
  if (r.logsBusy || !canLogs(r)) return
  if (!await confirm({ title: t('ccgateway.requestLogs.clearFullTitle'), message: t('ccgateway.requestLogs.clearFullConfirm'), confirmText: t('ccgateway.requestLogs.clearFull'), danger: true })) return
  await putLogs(r, { clear_full: true })
}

/** Deletes every log of the account (summaries and bodies); the setting stays (§4). */
async function clearAll(r: Row) {
  if (r.logsBusy || !canLogs(r) || !r.logsPolicy?.worker?.clearAll) return
  if (!await confirm({ title: t('ccgateway.requestLogs.clearAllTitle'), message: t('ccgateway.requestLogs.clearAllConfirm'), confirmText: t('ccgateway.requestLogs.clearAll'), danger: true })) return
  await putLogs(r, { clear_all: true })
}

// The countdown of the full level, refreshed every 30 seconds.
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined
onMounted(() => { clock = setInterval(() => { now.value = Date.now() }, 30000) })
onBeforeUnmount(() => clearInterval(clock))

/** The setting shown for the row of a current core (an expired full level follows the default). */
const settingOf = (p: RequestLogPolicy) => activeSetting(p, now.value)
const overrides = computed(() => countOverrides(rows.value.map(r => r.logsPolicy), now.value))
watch(overrides, count => emit('overrides', count), { immediate: true })
/** The older core's hint (off deletes the logs) while one of its rows is shown. */
const legacyRows = computed(() => rows.value.some(r => r.logsEnabled !== null))

function fullRemaining(r: Row): string {
  const policy = r.logsPolicy !== null
  const until = policy ? r.logsPolicy!.fullUntil : r.logsLevels?.fullUntil
  if (until == null) return ''
  const minutes = Math.ceil((until - now.value) / 60000)
  if (minutes <= 0) return t('ccgateway.requestLogs.fullExpired')
  const hours = Math.floor(minutes / 60)
  if (policy) {
    return hours > 0
      ? t('ccgateway.requestLogs.followRemaining', { hours, minutes: minutes % 60 })
      : t('ccgateway.requestLogs.followRemainingMinutes', { minutes })
  }
  return hours > 0
    ? t('ccgateway.requestLogs.fullRemaining', { hours, minutes: minutes % 60 })
    : t('ccgateway.requestLogs.fullRemainingMinutes', { minutes })
}

const mib = (bytes: number) => Number((bytes / 1048576).toFixed(3))
const retention = (hours: number) => (hours >= 48 && hours % 24 === 0 ? t('ccgateway.requestLogs.days', { n: hours / 24 }) : t('ccgateway.requestLogs.hours', { n: hours }))

function tierText(name: 'summary' | 'full', tier: RequestLogTier | null, used: number | null): string {
  const label = t(`ccgateway.requestLogs.level.${name}`)
  const usage = used === null ? '' : t('ccgateway.requestLogs.tierUsage', { used: mib(used) })
  if (!tier) return `${t('ccgateway.requestLogs.tierUnreported', { name: label })}${usage}`
  return `${t('ccgateway.requestLogs.tier', {
    name: label,
    retention: retention(tier.retention_hours!),
    request: mib(tier.per_request_limit_bytes!),
    total: mib(tier.storage_budget_bytes!),
  })}${usage}`
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
function workerDetails(w: WorkerLogInfo): string[] {
  const parts = [tierText('summary', w.summary, w.usage.summary_bytes), tierText('full', w.full, w.usage.full_bytes)]
  if (w.usage.requests !== null) parts.push(t('ccgateway.requestLogs.requests', { count: w.usage.requests }))
  parts.push(t('ccgateway.requestLogs.errorText'))
  if (w.overflow) parts.push(t('ccgateway.requestLogs.overflow'))
  return parts
}
/** Limits and overflow behavior the Worker reported: shown on hover / focus of the control. */
function logDetails(r: Row): string {
  const p = r.logsPolicy
  if (p) {
    const effective = t('ccgateway.requestLogs.effective', { level: t(`ccgateway.requestLogs.level.${effectiveAt(p, now.value)}`) })
    return [effective, ...(p.worker ? workerDetails(p.worker) : [t('ccgateway.requestLogs.workerUnavailable')])].join(' ')
  }
  const lv = r.logsLevels
  if (lv) return workerDetails(lv).join(' ')
  const overflow = r.logsLimits?.overflow_behavior === 'retain_partial_with_metadata' ? t('ccgateway.requestLogs.overflow') : t('ccgateway.requestLogs.unreportedOverflow')
  return `${logLimits(r)} ${overflow}`
}
const viewText = (w: WorkerLogInfo | null) => (!w
  ? t('ccgateway.requestLogs.viewUnavailable')
  : w.usage.requests === null ? t('ccgateway.requestLogs.view') : t('ccgateway.requestLogs.viewCount', { count: w.usage.requests }))

function containerBadge(r: Row): { tone: 'success' | 'warning' | 'danger' | 'gray'; label: string } {
  if (r.error) return { tone: 'danger', label: t('ccgateway.runtimes.state.unavailable') }
  if (r.phase === 'ready') return { tone: 'success', label: t('ccgateway.runtimes.state.ready') }
  if (r.phase === 'blocked') return { tone: 'danger', label: blockedTitle(r.reason) }
  if (r.phase === 'error') return { tone: 'danger', label: t('ccgateway.runtimes.state.error') }
  if (r.phase === 'preparing') return { tone: 'warning', label: t('ccgateway.runtimes.state.preparing') }
  return { tone: 'gray', label: t('ccgateway.runtimes.state.unknown') }
}
const needsAuth = (r: Row) => r.type === 'managed' && r.loggedIn !== true
const editLink = (r: Row) => ({ path: '/accounts', query: { edit: String(r.id) } })

/** Opens a re-authorization draft, then the account editor where it is completed. */
async function refreshAuth(r: Row) {
  if (!canAccounts.value) return
  try {
    const result = await api.post<{ key: string; created: boolean; message: string }>(`/accounts/${r.id}/actions/ccgateway/refresh_auth`)
    toast(result.message || t('ccgateway.runtimes.refreshStarted'), 'success')
    await router.push(editLink(r))
  } catch {
    toast(t('ccgateway.runtimes.refreshFailed'), 'error')
  }
}
</script>

<template>
  <SCard :title="t('ccgateway.runtimes.title')" :subtitle="t('ccgateway.runtimes.hint')">
    <template #actions>
      <SButton v-if="auth.has('settings:manage')" size="sm" :loading="cleaning" :disabled="loading" data-testid="ccgateway-cleanup" @click="cleanupOrphans">{{ t('ccgateway.cleanup.action') }}</SButton>
      <SButton size="sm" icon="refresh" icon-only :loading="loading" :title="t('common.refresh')" :aria-label="t('common.refresh')" @click="reload" />
      <SButton v-if="canAccounts" size="sm" variant="primary" to="/accounts">{{ t('ccgateway.runtimes.openAccounts') }}</SButton>
    </template>
    <div class="space-y-3">
      <SHint tone="warning">{{ t('ccgateway.runtime.switchHint') }}</SHint>
      <SHint>{{ t('ccgateway.requestLogs.hint') }}</SHint>
      <SHint v-if="legacyRows" data-testid="request-log-legacy-hint">{{ t('ccgateway.requestLogs.legacyHint') }}</SHint>
      <SHint v-if="error" tone="danger">{{ error }}</SHint>
      <STable :columns="columns" :rows="rows" :loading="loading" dense :empty-text="t('ccgateway.runtimes.empty')" data-testid="ccgateway-runtimes">
        <template #cell-name="{ row }">
          <div class="whitespace-nowrap font-medium">{{ row.name }} <span class="font-mono text-xs text-fg-subtle">#{{ row.id }}</span></div>
          <div class="whitespace-nowrap text-xs text-fg-muted">{{ row.type === 'managed' ? t('ccgateway.runtimes.typeOAuth') : t('ccgateway.runtimes.typeApiKey') }}</div>
        </template>
        <template #cell-container="{ row }">
          <SBadge :tone="containerBadge(row).tone" dot>{{ row.checking ? t('ccgateway.runtimes.checking') : containerBadge(row).label }}</SBadge>
          <div v-if="row.container" class="mt-0.5 font-mono text-xxs text-fg-subtle">{{ row.container }}</div>
        </template>
        <template #cell-cli_version="{ row }">
          <span v-if="row.cliVersion" class="whitespace-nowrap font-mono text-xs" :data-testid="`cli-version-${row.id}`">{{ row.cliVersion }}</span>
          <SHint v-else inline size="xs" :data-testid="`cli-version-${row.id}`">—</SHint>
        </template>
        <template #cell-auth="{ row }">
          <SHint v-if="row.type !== 'managed'" inline size="xs">{{ t('ccgateway.runtimes.noAuthNeeded') }}</SHint>
          <SBadge v-else-if="row.loggedIn === true" tone="success">{{ t('ccgateway.runtimes.authorized') }}</SBadge>
          <SBadge v-else-if="row.loggedIn === false" tone="warning">{{ t('ccgateway.runtimes.notAuthorized') }}</SBadge>
          <SHint v-else inline size="xs">—</SHint>
          <CredentialStatusNotice :status="row.health" />
        </template>
        <template #cell-request_logs="{ row }">
          <!-- The tooltip only mirrors the row's hidden description, which assistive technology reads instead. -->
          <template v-if="row.logsPolicy">
            <STooltip :delay="0" placement="bottom" class="items-center gap-1.5 whitespace-nowrap" :data-testid="`request-log-cell-${row.id}`">
              <SSegmented :model-value="settingOf(row.logsPolicy)" :options="settingOptions(row.logsPolicy)" size="sm" :aria-label="t('ccgateway.requestLogs.levelLabel')" :aria-describedby="`request-log-limits-${row.id}`" :disabled="!canLogs(row) || row.logsBusy || row.checking || loading" :data-testid="`request-log-level-${row.id}`" @update:model-value="chooseSetting(row, $event)" />
              <SButton variant="ghost" size="sm" icon="info" icon-only class="text-fg-subtle" :aria-label="t('ccgateway.requestLogs.details')" :aria-describedby="`request-log-limits-${row.id}`" :data-testid="`request-log-info-${row.id}`" />
              <span :id="`request-log-limits-${row.id}`" class="sr-only" :data-testid="`request-log-limits-${row.id}`">{{ logDetails(row) }}</span>
              <template #content><span aria-hidden="true" data-testid="request-log-tooltip">{{ logDetails(row) }}</span></template>
            </STooltip>
            <div class="mt-1 flex items-center gap-2 whitespace-nowrap">
              <SButton v-if="showViewer(row)" size="sm" variant="ghost" icon="list" :disabled="!row.logsPolicy.worker" :data-testid="`request-log-view-${row.id}`" @click="viewing = row">{{ viewText(row.logsPolicy.worker) }}</SButton>
              <SHint v-if="settingOf(row.logsPolicy) === 'full'" inline size="xs" tone="warning" :data-testid="`request-log-full-${row.id}`">{{ fullRemaining(row) }}</SHint>
              <SButton v-if="(row.logsPolicy.worker?.usage.full_bytes ?? 0) > 0 && canLogs(row)" size="sm" variant="ghost" tone="danger" :disabled="row.logsBusy || row.checking || loading" :data-testid="`request-log-clear-full-${row.id}`" @click="clearFull(row)">{{ t('ccgateway.requestLogs.clearFull') }}</SButton>
              <SButton v-if="canLogs(row) && row.logsPolicy.worker?.clearAll" size="sm" variant="ghost" tone="danger" :disabled="row.logsBusy || row.checking || loading" :data-testid="`request-log-clear-all-${row.id}`" @click="clearAll(row)">{{ t('ccgateway.requestLogs.clearAll') }}</SButton>
            </div>
            <SHint v-if="!row.logsPolicy.worker" size="xs" :data-testid="`request-log-worker-unavailable-${row.id}`">{{ t('ccgateway.requestLogs.workerUnavailable') }}</SHint>
          </template>
          <template v-else-if="row.logsLevels">
            <STooltip :delay="0" placement="bottom" class="items-center gap-1.5 whitespace-nowrap" :data-testid="`request-log-cell-${row.id}`">
              <SSegmented :model-value="row.logsLevels.level" :options="levelOptions(row)" size="sm" :aria-label="t('ccgateway.requestLogs.levelLabel')" :aria-describedby="`request-log-limits-${row.id}`" :disabled="!canLogs(row) || row.logsBusy || row.checking || loading" :data-testid="`request-log-level-${row.id}`" @update:model-value="chooseLevel(row, $event)" />
              <SButton variant="ghost" size="sm" icon="info" icon-only class="text-fg-subtle" :aria-label="t('ccgateway.requestLogs.details')" :aria-describedby="`request-log-limits-${row.id}`" :data-testid="`request-log-info-${row.id}`" />
              <span :id="`request-log-limits-${row.id}`" class="sr-only" :data-testid="`request-log-limits-${row.id}`">{{ logDetails(row) }}</span>
              <template #content><span aria-hidden="true" data-testid="request-log-tooltip">{{ logDetails(row) }}</span></template>
            </STooltip>
            <div v-if="row.logsLevels.level === 'full' || (row.logsLevels.usage.full_bytes ?? 0) > 0 || showViewer(row)" class="mt-1 flex items-center gap-2 whitespace-nowrap">
              <SButton v-if="showViewer(row)" size="sm" variant="ghost" icon="list" :data-testid="`request-log-view-${row.id}`" @click="viewing = row">
                {{ viewText(row.logsLevels) }}
              </SButton>
              <SHint v-if="row.logsLevels.level === 'full'" inline size="xs" tone="warning" :data-testid="`request-log-full-${row.id}`">{{ fullRemaining(row) }}</SHint>
              <SButton v-if="(row.logsLevels.usage.full_bytes ?? 0) > 0 && canLogs(row)" size="sm" variant="ghost" tone="danger" :disabled="row.logsBusy || row.checking || loading" :data-testid="`request-log-clear-full-${row.id}`" @click="clearFull(row)">{{ t('ccgateway.requestLogs.clearFull') }}</SButton>
            </div>
          </template>
          <STooltip v-else-if="row.logsEnabled !== null" :delay="0" placement="bottom" class="items-center gap-1.5 whitespace-nowrap" :data-testid="`request-log-cell-${row.id}`">
            <SSwitch :model-value="row.logsEnabled" :disabled="!canLogs(row) || row.logsBusy || row.checking || loading" :describedby="`request-log-limits-${row.id}`" :data-testid="`request-logs-${row.id}`" @update:model-value="setLogs(row, $event)"><span class="sr-only">{{ t('ccgateway.requestLogs.title') }}</span></SSwitch>
            <SButton variant="ghost" size="sm" icon="info" icon-only class="text-fg-subtle" :aria-label="t('ccgateway.requestLogs.details')" :aria-describedby="`request-log-limits-${row.id}`" :data-testid="`request-log-info-${row.id}`" />
            <span :id="`request-log-limits-${row.id}`" class="sr-only" :data-testid="`request-log-limits-${row.id}`">{{ logDetails(row) }}</span>
            <template #content><span aria-hidden="true" data-testid="request-log-tooltip">{{ logDetails(row) }}</span></template>
          </STooltip>
          <SHint v-else inline size="xs">—</SHint>
          <SHint v-if="row.logsError" tone="danger" size="xs">{{ t('ccgateway.requestLogs.failed') }}</SHint>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-2">
            <CLISettings v-if="auth.has('settings:read')" :account-id="row.id" :disabled="row.phase !== 'ready'" @changed="inspect(row)" />
            <SButton v-if="row.type === 'managed' && canAccounts" size="sm" variant="ghost" icon="refresh" icon-only :title="t('ccgateway.runtimes.refreshAuth')" :aria-label="t('ccgateway.runtimes.refreshAuth')" @click="refreshAuth(row)" />
            <SButton v-if="canAccounts" size="sm" :variant="needsAuth(row) ? 'primary' : 'ghost'" :to="editLink(row)" data-testid="ccgateway-runtime-edit">
              {{ needsAuth(row) ? t('ccgateway.runtimes.goAuthorize') : t('ccgateway.runtimes.goEdit') }}
            </SButton>
          </div>
        </template>
      </STable>
      <RetainedRuntimes :revision="retainedRevision" />
    </div>
    <SModal v-model:open="fullDialogOpen" :title="t('ccgateway.requestLogs.fullTitle')" width="sm" describedby="request-log-full-warning">
      <div class="space-y-3" data-testid="request-log-full-dialog">
        <SHint id="request-log-full-warning" tone="warning">{{ t(fullDialog?.row.logsPolicy ? 'ccgateway.requestLogs.followFullWarning' : 'ccgateway.requestLogs.fullWarning') }}</SHint>
        <SSegmented v-if="fullDialog" :model-value="fullDialog.hours" :options="hourOptions" block :aria-label="t('ccgateway.requestLogs.fullDuration')" data-testid="request-log-full-hours" @update:model-value="setHours" />
      </div>
      <template #footer>
        <SButton data-testid="request-log-full-cancel" @click="fullDialog = null">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" data-testid="request-log-full-confirm" @click="confirmFull">{{ t('ccgateway.requestLogs.fullAction') }}</SButton>
      </template>
    </SModal>
    <RequestLogViewer v-if="viewing" v-model:open="viewerOpen" :account-id="viewing.id" :account-name="viewing.name" :summary="workerOf(viewing) ? logDetails(viewing) : undefined" :search="workerOf(viewing)?.viewerSearch === true" />
  </SCard>
</template>
