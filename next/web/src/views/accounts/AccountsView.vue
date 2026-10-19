<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCheckbox, SCode, SCopyButton, SDescItem, SDescriptions, SDropdown, SHint, SIcon, SInput, SLink, SModal, SPageHeader, SPagination, SSectionTitle, SSelect, SSpinner, SSwitch, STable, STabs, confirm, toast, type SelectOption, type TableColumn } from '@sub2api/ui'
import type { Account, AccountAction, AccountLastTest, AccountTestResult, AccountType } from '@/api/types'
import { useList } from '@/composables/useList'
import { deleteWithConfirm } from '@/composables/crud'
import { useGroupsLookup } from '@/composables/lookups'
import { ACCOUNT_KEYS, useOwnership } from '@/composables/useOwnership'
import { useAuthStore } from '@/stores/auth'
import { usePluginStore } from '@/stores/plugins'
import { errorMessage, notifyError } from '@/utils/errors'
import { formatDateTime, formatRelative, formatTime } from '@/utils/format'
import { lt } from '@/i18n'
import { useAccountTypes, typeKey } from './accountTypes'
import AccountTypePicker from './AccountTypePicker.vue'
import AccountTypeEndpoints from './AccountTypeEndpoints.vue'
import PlatformBadges from '@/views/platforms/PlatformBadges.vue'
import AccountEditor from './AccountEditor.vue'
import AccountSchedulingCell from './AccountSchedulingCell.vue'
import { accountControl, sameCreationGroup } from './accountTypeChoices'
import AccountQuotaCell from './AccountQuotaCell.vue'
import AccountBalanceCell from './AccountBalanceCell.vue'
import AccountModelTest from './AccountModelTest.vue'
import LastTestCell from './AccountLastTest.vue'
import { TEST_CONCURRENCY, lastTestOf } from './accountTest'
import { runPool } from './pool'
import { subscriptionLabel } from './subscription'
import { hasBalance, hasQuota, refreshAccountCredentials, resetAccountStatus, useBalanceRefresh, useQuotaRefresh } from './accountQuota'
import { reasonOf } from '@/views/ccgateway/ccgAuthFlow'

const { t, te } = useI18n()
const auth = useAuthStore()
const plugins = usePluginStore()
const own = useOwnership()
const accountTypes = useAccountTypes()
accountTypes.load()
const { groups } = useGroupsLookup()

// Ownership (CONTRACTS §21): all-level keys see every account, own-level keys
// only the caller's (the server filters; row actions follow the same rule).
const readScope = computed(() => own.scopeOf(ACCOUNT_KEYS.read))
const showOwner = computed(() => readScope.value === 'all')
const canCreate = computed(() => auth.has([...ACCOUNT_KEYS.create]))
const canUpdate = (a: Account) => own.can(a, ACCOUNT_KEYS.update)
const canTest = (a: Account) => own.can(a, ACCOUNT_KEYS.test)
const canDelete = (a: Account) => own.can(a, ACCOUNT_KEYS.delete)
const canReveal = (a: Account) => own.can(a, ACCOUNT_KEYS.reveal)

// `mine=true` works at both levels; `created_by=<id>` only at the all level (ignored otherwise).
const list = useList<Account>('/accounts', { plugin_key: '', type: '', group_id: '', status: '', model: '', q: '', mine: '', created_by: '', orphaned: '' })
const onlyMine = computed({
  get: () => list.filters.mine === 'true',
  set: (v: boolean) => {
    list.filters.mine = v ? 'true' : ''
  }
})
// Accounts of disabled/uninstalled plugins are hidden by default; the switch
// asks for `orphaned=all`.
const showOrphaned = computed({
  get: () => list.filters.orphaned === 'all',
  set: (v: boolean) => {
    list.filters.orphaned = v ? 'all' : ''
  }
})

// One select drives both ?plugin_key= and ?type= (account type identity).
const typeFilter = computed({
  get: () => (list.filters.plugin_key && list.filters.type ? typeKey(list.filters.plugin_key, list.filters.type) : ''),
  set: (raw: SelectOption['value']) => {
    const v = typeof raw === 'string' ? raw : ''
    const i = v.indexOf('/')
    list.filters.plugin_key = i > 0 ? v.slice(0, i) : ''
    list.filters.type = i > 0 ? v.slice(i + 1) : ''
  }
})

const columns = computed<TableColumn[]>(() => [
  // Batch test selection (accounts the caller may test).
  ...(pageTestable.value.length ? [{ key: 'pick', label: '', width: '2rem' }] : []),
  { key: 'name', label: t('accounts.listUi.identity'), width: '320px' },
  { key: 'groups', label: t('accounts.groups') },
  ...(showOwner.value ? [{ key: 'created_by', label: t('accounts.createdBy') }] : []),
  { key: 'status', label: t('common.status') },
  { key: 'scheduling', label: t('accounts.listUi.priorityWeight') },
  { key: 'concurrency', label: t('accounts.concurrency'), width: '90px' },
  { key: 'tpm', label: 'TPM', width: '100px' },
  { key: 'rpm', label: 'RPM', width: '90px' },
  // Only when a row of this page has plan windows (subscription accounts).
  ...(list.items.value.some((a) => hasQuota(a.quota)) ? [{ key: 'quota', label: t('accounts.quota.column') }] : []),
  // Only when a row of this page has balance (balance-enabled account types).
  ...(list.items.value.some((a) => hasBalance(a.balance)) ? [{ key: 'balance', label: t('accounts.balance.column') }] : []),
  { key: 'last_test', label: t('accounts.lastTest.column') },
  { key: 'actions', label: t('common.actions'), align: 'right', width: '210px' }
])

/** 1234 -> "1.2K", 3_200_000 -> "3.2M"; small numbers stay as they are. */
function abbrev(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${trimZero(n / 1_000_000)}M`
  if (a >= 1_000) return `${trimZero(n / 1_000)}K`
  return String(n)
}
function trimZero(v: number): string {
  return v.toFixed(1).replace(/\.0$/, '')
}

type LimitCell = { key: string; label: string; text: string; hit: boolean }
/** Configured limits of an account with the current window usage (CONTRACTS §18.4). */
function limitsOf(a: Account): LimitCell[] {
  const out: LimitCell[] = []
  const pairs = [
    ['tpm', a.tpm_limit],
    ['rpm', a.rpm_limit]
  ] as const
  for (const [key, limit] of pairs) {
    const used = a.rate_usage?.[key] ?? 0
    out.push({ key, label: key.toUpperCase(), text: `${abbrev(used)}/${limit ? abbrev(limit) : '∞'}`, hit: !!limit && used >= limit })
  }
  return out
}

function groupName(id: number, refs?: Array<{ id: number; name: string }>) {
  return refs?.find((g) => g.id === id)?.name || groups.value.find((g) => g.id === id)?.name || `#${id}`
}
function groupNames(ids: number[] | undefined, refs?: Array<{ id: number; name: string }>) {
  return ids?.length ? ids.map((id) => groupName(id, refs)).join(', ') : '—'
}
const groupTags = (a: Account) => (a.group_ids || []).map((id) => ({ id, name: groupName(id, a.groups) }))

/** Applies a server change to the list row and the open detail of the same account. */
function patchAccount(id: number, patch: Partial<Account>) {
  const row = list.items.value.find((x) => x.id === id)
  if (row) Object.assign(row, patch)
  if (detail.value?.id === id) Object.assign(detail.value, patch)
}

function coolingDown(a: Account) {
  return !!a.cooldown_until && new Date(a.cooldown_until).getTime() > Date.now()
}

type StatusView = { tone: 'success' | 'warning' | 'danger' | 'gray'; label: string; detail?: string }
function statusOf(a: Account): StatusView {
  if (a.orphaned) return { tone: 'gray', label: t('accounts.status.orphaned'), detail: t('accounts.orphanedHint', { plugin: a.plugin_key }) }
  if (a.status === 'disabled') return { tone: 'danger', label: t('accounts.status.disabled'), detail: a.status_reason }
  if (a.status === 'auto_disabled' || (a.status === 'active' && !a.schedulable)) return { tone: 'danger', label: t('accounts.status.auto_disabled'), detail: a.status_reason }
  if (a.status === 'error') return { tone: 'danger', label: t('accounts.status.error'), detail: a.status_reason }
  if (coolingDown(a)) {
    return {
      tone: 'warning',
      label: t('accounts.status.cooldown'),
      detail: t('accounts.cooldownUntil', { time: formatTime(a.cooldown_until) }) + (a.cooldown_reason ? `（${a.cooldown_reason}）` : '')
    }
  }
  return { tone: 'success', label: t('accounts.status.active') }
}

// ---------------------------------------------------------------- auto refresh (in_use / cooldown)
const autoRefresh = ref(true)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (autoRefresh.value && !editorOpen.value && !document.hidden) list.reload()
  }, 10000)
})
onBeforeUnmount(() => clearInterval(timer))

// ---------------------------------------------------------------- create / edit
const editorOpen = ref(false)
const step = ref<1 | 2>(1)
const pickedType = ref<AccountType | null>(null)
const editing = ref<Account | null>(null)
const editorLoading = ref(false)

const editorTitle = computed(() => {
  if (editing.value) return `${t('accounts.editTitle')} · ${editing.value.name}`
  if (step.value === 1) return t('accounts.newStep1')
  return `${t('accounts.newTitle')} · ${pickedType.value ? accountTypes.label(pickedType.value.plugin_key, pickedType.value.type) : ''}`
})

function openCreate() {
  editing.value = null
  pickedType.value = null
  step.value = 1
  editorOpen.value = true
}

function pick(at: AccountType) {
  pickedType.value = at
  step.value = 2
}

async function openEdit(a: Pick<Account, 'id'>) {
  editorLoading.value = true
  editorOpen.value = true
  step.value = 2
  try {
    const full = await api.get<Account>(`/accounts/${a.id}`)
    editing.value = full
    await accountTypes.load()
    pickedType.value = accountTypes.find(full.plugin_key, full.type) || null
  } catch (e) {
    notifyError(e)
    editorOpen.value = false
  } finally {
    editorLoading.value = false
  }
}

function onSaved(saved?: Account) {
  list.reload()
  // A new Claude Code (CCGateway) account was authorized before it was saved:
  // it closes like any other. A saved one that had no proxy (its container was
  // blocked) stays open on the saved account: the container restarts with the
  // proxy just picked and can be authorized right away.
  const ccg = !!saved?.id && saved.plugin_key === 'ccgateway' && saved.type === 'managed'
  if (ccg && editing.value && editing.value.proxy_id == null) {
    editing.value = saved!
    return
  }
  editorOpen.value = false
}

// Deep link (/accounts?edit=<id>, e.g. from the CCGateway container list): opens the editor.
const route = useRoute()
const router = useRouter()
watch(
  () => route.query.edit,
  (raw) => {
    const id = Number(Array.isArray(raw) ? raw[0] : raw)
    if (!raw || !Number.isInteger(id) || id <= 0) return
    void openEdit({ id })
    const { edit: _e, ...rest } = route.query
    void router.replace({ query: rest })
  },
  { immediate: true }
)

// ---------------------------------------------------------------- test (model test dialog, CONTRACTS: POST /accounts/:id/test)
const testOpen = ref(false)
const testTarget = ref<Account | null>(null)
const testTargetType = computed(() => (testTarget.value ? accountTypes.find(testTarget.value.plugin_key, testTarget.value.type) || null : null))

function openTest(a: Account) {
  testTarget.value = a
  testOpen.value = true
}

/** Writes a test outcome onto the list row (the server records it as last_test too). */
const onTested = (id: number, last: AccountLastTest) => patchAccount(id, { last_test: last })

function onTestUpdated(saved: Account) {
  testTarget.value = { ...(testTarget.value || saved), ...saved }
  const row = list.items.value.find((x) => x.id === saved.id)
  if (row) Object.assign(row, { models: saved.models, model_mapping: saved.model_mapping })
  if (editing.value?.id === saved.id) editing.value = { ...editing.value, models: saved.models, model_mapping: saved.model_mapping }
}

// ---------------------------------------------------------------- batch test (selected rows, plugin default model each)
const picked = ref(new Set<number>())
const batchTesting = ref(new Set<number>())
const batchRunning = ref(false)
const batchDone = ref(0)
const batchTotal = ref(0)
let batchCtrl: AbortController | null = null
const testable = (a: Account) => canTest(a) && !a.orphaned
const pageTestable = computed(() => list.items.value.filter(testable))
const allPicked = computed(() => pageTestable.value.length > 0 && pageTestable.value.every((a) => picked.value.has(a.id)))
const somePicked = computed(() => !allPicked.value && pageTestable.value.some((a) => picked.value.has(a.id)))

function pickRow(id: number, v: boolean) {
  const next = new Set(picked.value)
  if (v) next.add(id)
  else next.delete(id)
  picked.value = next
}
function pickPage(v: boolean) {
  const next = new Set(picked.value)
  for (const a of pageTestable.value) {
    if (v) next.add(a.id)
    else next.delete(a.id)
  }
  picked.value = next
}

async function batchTest() {
  const ids = [...picked.value]
  if (batchRunning.value || !ids.length) return
  batchRunning.value = true
  batchDone.value = 0
  batchTotal.value = ids.length
  batchCtrl = new AbortController()
  let ok = 0
  let failed = 0
  try {
    await runPool(ids, TEST_CONCURRENCY, async (id) => {
      batchTesting.value = new Set(batchTesting.value).add(id)
      try {
        const r = await api.post<AccountTestResult>(`/accounts/${id}/test`, {}, { signal: AbortSignal.timeout(120000) })
        if (r.ok) ok++
        else failed++
        onTested(id, lastTestOf(r, ''))
      } catch (e) {
        failed++
        onTested(id, { at: new Date().toISOString(), ok: false, latency_ms: 0, model: '', message: errorMessage(e) })
      } finally {
        const next = new Set(batchTesting.value)
        next.delete(id)
        batchTesting.value = next
        batchDone.value++
      }
    }, batchCtrl.signal)
  } finally {
    batchRunning.value = false
    batchCtrl = null
  }
  toast(t('accounts.batchTest.done', { ok, fail: failed }), failed ? 'warning' : 'success')
}
function stopBatch() {
  batchCtrl?.abort()
}

// ---------------------------------------------------------------- reveal credentials
const revealOpen = ref(false)
const revealed = ref<Record<string, unknown> | null>(null)
async function reveal(a: Account) {
  try {
    revealed.value = await api.post<Record<string, unknown>>(`/accounts/${a.id}/credentials/reveal`)
    revealOpen.value = true
  } catch (e) {
    notifyError(e)
  }
}
const revealedText = computed(() => JSON.stringify(revealed.value, null, 2))

// ---------------------------------------------------------------- detail
const detailOpen = ref(false)
const detail = ref<Account | null>(null)
const detailTab = ref('overview')
const detailTabs = computed(() => [
  { key: 'overview', label: t('accounts.overview') },
  ...plugins.slotEntries('account.detail.tabs').map((e) => ({ key: `${e.pluginKey}:${e.name}`, label: tabLabel(e.pluginKey, e.name) }))
])
function tabLabel(pluginKey: string, name: string) {
  const msgKey = `plugin.${pluginKey}.tabs.${name}`
  const translated = t(msgKey)
  return translated !== msgKey ? translated : `${pluginKey} · ${name}`
}
const detailSlot = computed(() => plugins.slotEntries('account.detail.tabs').find((e) => `${e.pluginKey}:${e.name}` === detailTab.value))
const detailType = computed(() => (detail.value ? accountTypes.find(detail.value.plugin_key, detail.value.type) : undefined))

async function openDetail(a: Account) {
  detailTab.value = 'overview'
  detail.value = a
  detailOpen.value = true
  try {
    const full = await api.get<Account>(`/accounts/${a.id}`)
    // The quota snapshot is a list field; keep the row's when the detail omits it.
    detail.value = full.quota === undefined ? { ...full, quota: a.quota } : full
  } catch (e) {
    notifyError(e)
  }
}

// ---------------------------------------------------------------- quota refresh / reset status
// The snapshot of every row arrives with the list; "refresh" asks the upstream
// for one account (force), with duplicate in-flight clicks coalesced.
const quotaRefresh = useQuotaRefresh({
  onSnapshot: (id, quota) => patchAccount(id, { quota }),
  onError: (_id, e) => notifyError(e)
})

// ---------------------------------------------------------------- balance refresh
// Similar to quota refresh, but for account balance (CONTRACTS §52).
const balanceRefresh = useBalanceRefresh({
  onSnapshot: (id, balance) => patchAccount(id, { balance }),
  onThrottled: (_id, n) => toast(t('accounts.balance.refreshThrottled', { n }), 'info'),
  onError: (_id, e) => notifyError(e)
})

const canResetStatus = (a: Account) => canUpdate(a) && !a.orphaned

async function resetStatus(a: Account) {
  const ok = await confirm({ title: t('accounts.resetStatusTitle'), message: t('accounts.resetStatusConfirm', { name: a.name }), confirmText: t('accounts.resetStatus') })
  if (!ok) return
  try {
    const updated = await resetAccountStatus(a.id)
    Object.assign(a, updated)
    patchAccount(a.id, updated)
    toast(t('accounts.resetStatusDone'), 'success')
    list.reload()
  } catch (e) {
    notifyError(e)
  }
}

// ---------------------------------------------------------------- credential refresh (CONTRACTS §48)
// The core renews expiring tokens by itself; the detail shows the state and
// offers one manual refresh.
const refreshingCreds = ref(new Set<number>())
const canRefreshCreds = (a: Account) => !!a.refresh && canUpdate(a) && !a.orphaned

function credRefreshText(a: Account): { text: string; warn: boolean } {
  const r = a.refresh
  if (!r) return { text: '', warn: false }
  if (r.error_type === 'auth_rejected') return { text: t('accounts.credRefresh.authRejected'), warn: true }
  const parts: string[] = []
  if (!r.expires_at) parts.push(t('accounts.credRefresh.unknown'))
  else if (new Date(r.expires_at).getTime() <= Date.now()) parts.push(t('accounts.credRefresh.expired'))
  else parts.push(t('accounts.credRefresh.expiresAt', { time: formatDateTime(r.expires_at) }))
  if (r.last_success_at) parts.push(t('accounts.credRefresh.lastSuccess', { time: formatRelative(r.last_success_at, t) }))
  if (r.error_type === 'transient') parts.push(t('accounts.credRefresh.transient', { error: r.error }))
  return { text: parts.join(' · '), warn: r.error_type === 'transient' }
}

async function refreshCreds(a: Account) {
  if (refreshingCreds.value.has(a.id)) return
  refreshingCreds.value.add(a.id)
  try {
    const out = await refreshAccountCredentials(a.id)
    a.refresh = out.refresh
    patchAccount(a.id, { refresh: out.refresh })
    if (out.refreshed) toast(t('accounts.credRefresh.done'), 'success')
    else if (out.skipped === 'in_progress') toast(t('accounts.credRefresh.inProgress'), 'info')
    else if (out.skipped === 'changed') toast(t('accounts.credRefresh.changed'), 'info')
    else if (out.error) toast(t('accounts.credRefresh.failed', { error: out.error }), 'error')
  } catch (e) {
    notifyError(e)
  } finally {
    refreshingCreds.value.delete(a.id)
  }
}
// ---------------------------------------------------------------- row actions
const togglingEnabled = ref(new Set<number>())
async function toggleEnabled(a: Account, v: boolean) {
  if (togglingEnabled.value.has(a.id) || !canUpdate(a) || !accountControl(accountTypes.find(a.plugin_key, a.type), 'schedulable').configurable) return
  togglingEnabled.value.add(a.id)
  try {
    const updated = await api.patch<Account>(`/accounts/${a.id}`, { status: v ? 'active' : 'disabled', schedulable: v })
    patchAccount(a.id, updated)
  } catch (e) {
    notifyError(e)
  } finally {
    togglingEnabled.value.delete(a.id)
  }
}

const remove = (a: Account) => deleteWithConfirm(`/accounts/${a.id}`, t('common.confirmDelete', { name: a.name }), list.reload)

// Plugin-registered actions (CONTRACTS §52). An action that starts a
// re-authorization answers the draft key: it continues in the editor. A token
// refresh answers refreshed / expires_at.
const runningActions = ref(new Set<number>())
async function runPluginAction(a: Account, action: AccountAction) {
  if (runningActions.value.has(a.id)) return
  runningActions.value.add(a.id)
  const name = lt(action.label) || action.id
  toast(t('accounts.pluginActions.running', { name }), 'info')
  try {
    const out = await api.post<Record<string, unknown> | null>(`/accounts/${a.id}/actions/${encodeURIComponent(action.plugin_key)}/${encodeURIComponent(action.id)}`, {}, { signal: AbortSignal.timeout(95000) })
    if (typeof out?.key === 'string') {
      void openEdit(a)
    } else if (typeof out?.refreshed === 'boolean') {
      const time = typeof out.expires_at === 'string' ? formatDateTime(out.expires_at) : ''
      toast(t(out.refreshed ? 'accounts.pluginActions.tokenRefreshed' : 'accounts.pluginActions.tokenValid', { time }), 'success')
      if (hasQuota(a.quota)) void quotaRefresh.refresh(a.id)
    } else {
      toast(t('accounts.pluginActions.done', { name }), 'success')
    }
  } catch (e) {
    const key = `accounts.pluginActions.reason.${reasonOf(e)}`
    if (reasonOf(e) && te(key)) toast(t(key), 'error')
    else notifyError(e)
  } finally {
    runningActions.value.delete(a.id)
  }
}

function actionsFor(a: Account) {
  return [
    { key: 'detail', label: t('common.detail') },
    { key: 'reveal', label: t('accounts.revealCredentials'), hidden: !canReveal(a) || a.orphaned },
    { key: 'reset-status', label: t('accounts.resetStatus'), hidden: !canResetStatus(a) },
    { key: 'refresh-credentials', label: t('accounts.credRefresh.action'), hidden: !canRefreshCreds(a) },
    ...(a.actions || []).map((x) => ({ key: `plugin:${x.plugin_key}:${x.id}`, label: lt(x.label) || x.id, hidden: !canUpdate(a) || a.orphaned || runningActions.value.has(a.id) })),
    { key: 'delete', label: t('common.delete'), danger: true, hidden: !canDelete(a) }
  ]
}

const ROW_ACTIONS: Record<string, (a: Account) => unknown> = { detail: openDetail, reveal, 'reset-status': resetStatus, 'refresh-credentials': refreshCreds, delete: remove }
function onAction(a: Account, key: string) {
  const action = a.actions?.find((x) => `plugin:${x.plugin_key}:${x.id}` === key)
  if (action) void runPluginAction(a, action)
  else void ROW_ACTIONS[key]?.(a)
}

const statusOptions = ['active', 'auto_disabled', 'disabled', 'error']
const statusSelectOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('accounts.allStatus') },
  ...statusOptions.map((s) => ({ value: s, label: t(`accounts.status.${s}`) }))
])
// Account types grouped per plugin (<optgroup>), "all types" first.
const typeOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('accounts.allTypes') },
  ...accountTypes.grouped.value.map((g) => ({
    value: g.plugin_key,
    label: lt(g.plugin_name) || g.plugin_key,
    options: g.types.map((at) => ({ value: typeKey(at.plugin_key, at.type), label: lt(at.label) || at.type }))
  }))
])
const groupOptions = computed<SelectOption[]>(() => [{ value: '', label: t('accounts.allGroups') }, ...groups.value.map((g) => ({ value: g.id, label: g.name }))])
const advancedFilters = ref(false)
const denseRows = ref(true)
const filterCount = computed(() => Object.entries(list.filters).filter(([key, value]) => key !== 'plugin_key' && value !== '').length)
const hasAdvancedFilters = computed(() => !!list.filters.model || !!list.filters.created_by || onlyMine.value || showOrphaned.value)
function resetFilters() { for (const key of Object.keys(list.filters)) list.filters[key] = '' }
</script>

<template>
  <div>
    <SPageHeader :title="t('accounts.title')" :description="t('accounts.subtitle')">
      <template #actions>
        <SSwitch v-model="autoRefresh" :label="t('accounts.autoRefresh')" />
        <SButton icon="refresh" icon-only :loading="list.loading.value" :aria-label="t('accounts.listUi.refresh')" :title="t('accounts.listUi.refresh')" @click="list.reload()" />
        <SButton v-if="canCreate" variant="primary" icon="plus" data-testid="account-new" @click="openCreate">{{ t('accounts.new') }}</SButton>
      </template>
    </SPageHeader>

    <section class="mb-4 rounded-xl border border-line bg-surface p-3" :aria-label="t('accounts.listUi.filters')">
      <div class="flex flex-wrap items-center gap-2">
        <div class="min-w-48 flex-1">
          <SInput v-model="list.filters.q" icon="search" clearable :aria-label="t('accounts.listUi.search')" :placeholder="t('accounts.listUi.search')" />
        </div>
        <SSelect v-model="typeFilter" :options="typeOptions" class="w-52" :aria-label="t('accounts.type')" />
        <SSelect v-model="list.filters.group_id" :options="groupOptions" class="w-40" :aria-label="t('accounts.groups')" />
        <SSelect v-model="list.filters.status" :options="statusSelectOptions" class="w-36" :aria-label="t('common.status')" />
        <SButton size="sm" :variant="hasAdvancedFilters ? 'primary' : 'secondary'" :aria-expanded="advancedFilters" @click="advancedFilters = !advancedFilters">{{ t('accounts.listUi.advanced') }}</SButton>
        <SButton v-if="filterCount" size="sm" variant="ghost" @click="resetFilters">{{ t('accounts.listUi.clear', { count: filterCount }) }}</SButton>
      </div>
      <div v-if="advancedFilters" class="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <SInput v-model="list.filters.model" class="w-56" mono data-testid="model-filter" :aria-label="t('accounts.modelFilter')" :placeholder="t('accounts.modelFilter')" />
        <SInput v-if="showOwner" v-model="list.filters.created_by" class="w-40" inputmode="numeric" data-testid="created-by-filter" :aria-label="t('common.createdById')" :placeholder="t('common.createdById')" />
        <SSwitch v-model="onlyMine" :label="t('common.onlyMine')" data-testid="only-mine" />
        <SSwitch v-model="showOrphaned" :label="t('accounts.showOrphaned')" data-testid="show-orphaned" />
      </div>
      <p v-else-if="hasAdvancedFilters" class="mt-2 text-xs text-primary-600 dark:text-primary-300">{{ t('accounts.listUi.advancedApplied') }}</p>
    </section>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
      <SHint v-if="list.error.value" inline size="xs" tone="danger" role="alert">{{ t(list.items.value.length ? 'accounts.listUi.loadFailed' : 'accounts.listUi.loadFailedEmpty') }}</SHint>
      <span v-else-if="list.loading.value">{{ t('common.loading') }}</span>
      <span v-else>{{ t('accounts.listUi.resultCount', { total: list.total.value, page: list.items.value.length }) }}</span>
      <span v-if="pageTestable.length" class="flex flex-wrap items-center gap-2" data-testid="account-batch-bar">
        <SCheckbox size="xs" :model-value="allPicked" :indeterminate="somePicked" :disabled="batchRunning" data-testid="account-pick-page" @update:model-value="pickPage">{{ t('accounts.batchTest.pickPage') }}</SCheckbox>
        <template v-if="picked.size || batchRunning">
          <SButton size="sm" variant="primary" :loading="batchRunning" :disabled="!picked.size" icon="play" data-testid="account-batch-test" @click="batchTest">
            {{ batchRunning ? t('accounts.batchTest.progress', { done: batchDone, total: batchTotal }) : t('accounts.batchTest.run', { n: picked.size }) }}
          </SButton>
          <SButton v-if="batchRunning" size="sm" variant="danger" icon="stop" @click="stopBatch">{{ t('accounts.modelTest.stop') }}</SButton>
          <SLink v-else as="button" class="text-xs" @click="picked = new Set()">{{ t('accounts.batchTest.clear') }}</SLink>
          <SHint inline size="xs">{{ t('accounts.batchTest.hint') }}</SHint>
        </template>
      </span>
      <SSwitch v-model="denseRows" :label="t('accounts.listUi.compact')" class="ml-auto" />
    </div>
    <STable class="account-table" :columns="columns" :rows="list.items.value" :loading="list.loading.value" :dense="denseRows" :empty-text="t(filterCount ? 'accounts.listUi.emptyFiltered' : 'accounts.listUi.empty')">
      <template #cell-pick="{ row }">
        <SCheckbox v-if="testable(row)" bare :model-value="picked.has(row.id)" :disabled="batchRunning" :aria-label="row.name" @update:model-value="pickRow(row.id, $event)" />
      </template>
      <template #cell-last_test="{ row }">
        <LastTestCell :last="row.last_test" :testing="batchTesting.has(row.id)" />
      </template>
      <template #cell-name="{ row }">
        <div class="min-w-64 max-w-sm space-y-0.5">
          <div class="flex items-center gap-2"><span class="shrink-0 font-mono text-xxs text-fg-subtle">#{{ row.id }}</span><SLink as="button" class="min-w-0 truncate font-semibold" :title="row.name" @click="openDetail(row)">{{ row.name }}</SLink></div>
          <div class="flex items-center gap-1.5 whitespace-nowrap text-xs text-fg-muted"><span :title="row.plugin_key">{{ accountTypes.pluginName(row.plugin_key) }}</span><span aria-hidden="true">/</span><span class="truncate" :title="accountTypes.typeLabel(row.plugin_key, row.type, row.type_label)">{{ accountTypes.typeLabel(row.plugin_key, row.type, row.type_label) }}</span><SBadge v-if="row.subscription_type" size="xs" tone="purple" class="shrink-0" :title="t('accounts.subscriptionHint')" data-testid="account-subscription">{{ subscriptionLabel(row.subscription_type) }}</SBadge><span v-if="row.last_used_at" class="shrink-0 text-xxs text-fg-subtle">· {{ formatRelative(row.last_used_at, t) }}</span></div>
        </div>
      </template>
      <template #cell-groups="{ row }"><div class="flex max-w-48 flex-wrap gap-1" :title="groupNames(row.group_ids, row.groups)"><SBadge v-for="group in groupTags(row).slice(0, 2)" :key="group.id" tone="gray" class="max-w-40 truncate">{{ group.name }}</SBadge><SBadge v-if="groupTags(row).length > 2" tone="gray">+{{ groupTags(row).length - 2 }}</SBadge><SHint v-if="!row.group_ids?.length" size="xs">—</SHint></div></template>
      <template #cell-created_by="{ row }">
        <span v-if="row.created_by_email" class="text-xs" :title="row.created_by ? `#${row.created_by}` : ''">{{ row.created_by_email }}</span>
        <SHint v-else-if="row.created_by" inline size="xs">#{{ row.created_by }}</SHint>
        <SHint v-else inline>-</SHint>
      </template>
      <template #cell-status="{ row }">
        <SBadge :tone="statusOf(row).tone" dot>{{ statusOf(row).label }}</SBadge>
        <SBadge v-if="row.auto_disable === false" tone="gray" class="ml-1" :title="t('accounts.editorUi.autoDisableHint')">{{ t('accounts.noAutoDisable') }}</SBadge>
        <SHint v-if="statusOf(row).detail" size="xs" class="mt-0.5 block max-w-48 truncate" :title="statusOf(row).detail">
          {{ statusOf(row).detail }}
        </SHint>
        <SHint v-if="row.status === 'auto_disabled' && row.auto_disabled_until" size="xs" class="mt-0.5 block" data-testid="account-auto-release">{{ t('accounts.autoReleaseAt', { time: formatDateTime(row.auto_disabled_until) }) }}</SHint>
        <SLink v-if="(row.status !== 'active' || row.status_reason || coolingDown(row)) && canResetStatus(row)" as="button" class="mt-1 inline-flex items-center gap-1 text-xs" :title="t('accounts.resetStatusHint')" data-testid="account-reset-status" @click="resetStatus(row)">
          <SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('accounts.resetStatus') }}
        </SLink>
      </template>
      <template #cell-scheduling="{ row }">
        <AccountSchedulingCell :account="row" :editable="canUpdate(row) && !row.orphaned" @saved="Object.assign(row, $event)" />
      </template>
      <template #cell-concurrency="{ row }">
        <span class="whitespace-nowrap text-xs tabular-nums" :class="row.max_concurrency && (row.in_use || 0) >= row.max_concurrency ? 'font-semibold text-warning-600' : ''">{{ row.in_use ?? 0 }}/{{ row.max_concurrency || '∞' }}</span>
      </template>
      <template v-for="key in ['tpm', 'rpm']" :key="key" #[`cell-${key}`]="{ row }">
        <span class="whitespace-nowrap text-xs tabular-nums" :class="limitsOf(row).find(l => l.key === key)?.hit ? 'font-semibold text-warning-600' : ''">{{ limitsOf(row).find(l => l.key === key)?.text }}</span>
      </template>
      <template #cell-quota="{ row }">
        <AccountQuotaCell v-if="hasQuota(row.quota)" :quota="row.quota" :refreshing="quotaRefresh.refreshing.has(row.id)" @refresh="quotaRefresh.refresh(row.id)" />
        <!-- no plan limits (API keys): show nothing, not even the table's "—" fallback -->
        <span v-else />
      </template>
      <template #cell-balance="{ row }">
        <AccountBalanceCell v-if="hasBalance(row.balance)" :balance="row.balance" :refreshing="balanceRefresh.refreshing.has(row.id)" @refresh="balanceRefresh.refresh(row.id, row.balance)" />
        <!-- no balance (types without balance support): show nothing -->
        <span v-else />
      </template>
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <SSwitch
            v-if="canUpdate(row) && !row.orphaned"
            :model-value="row.status !== 'disabled'"
            :disabled="togglingEnabled.has(row.id) || !accountControl(accountTypes.find(row.plugin_key, row.type), 'schedulable').configurable"
            :aria-label="t(row.status === 'disabled' ? 'common.enable' : 'common.disable')"
            :title="t(row.status === 'disabled' ? 'common.enable' : 'common.disable')"
            data-testid="account-schedulable-switch"
            @update:model-value="toggleEnabled(row, $event)"
          />
          <SButton v-if="canTest(row) && !row.orphaned" size="sm" variant="ghost" @click="openTest(row)">{{ t('common.test') }}</SButton>
          <SButton v-if="canUpdate(row) && !row.orphaned" size="sm" variant="ghost" @click="openEdit(row)">{{ t('common.edit') }}</SButton>
          <SDropdown :actions="actionsFor(row)" @select="onAction(row, $event)" />
        </div>
      </template>
    </STable>
    <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />

    <!-- create / edit -->
    <SModal v-model:open="editorOpen" :title="editorTitle" width="2xl" persistent>
      <SSpinner v-if="editorLoading" block />
      <AccountTypePicker v-else-if="!editing && step === 1" @pick="pick" />
      <AccountEditor
        v-else
        :account-type="pickedType"
        :account-type-options="accountTypes.types.value.filter(at => sameCreationGroup(at, pickedType))"
        :account="editing"
        @change-type="pickedType = $event"
        @saved="onSaved"
        @reauthorized="list.reload()"
        @cancel="editorOpen = false"
        @back="step = 1"
        @test="openTest"
      />
    </SModal>

    <!-- test -->
    <AccountModelTest v-model:open="testOpen" :account="testTarget" :account-type="testTargetType" @tested="onTested" @updated="onTestUpdated" />

    <!-- reveal -->
    <SModal v-model:open="revealOpen" :title="t('accounts.revealCredentials')" width="lg" @close="revealed = null">
      <SHint tone="warning" class="mb-3">{{ t('accounts.revealWarning') }}</SHint>
      <SCode>{{ revealedText }}</SCode>
      <template #footer>
        <SCopyButton :text="revealedText" :label="t('common.copy')" variant="secondary" size="md" />
        <SButton variant="primary" @click="revealOpen = false">{{ t('common.close') }}</SButton>
      </template>
    </SModal>

    <!-- detail -->
    <SModal v-model:open="detailOpen" :title="detail?.name || ''" width="xl">
      <template v-if="detail">
        <STabs v-model="detailTab" :tabs="detailTabs">
          <div v-if="detailTab === 'overview'" class="space-y-4">
            <SDescriptions label-width="9rem">
              <SDescItem label="ID">{{ detail.id }}</SDescItem>
              <SDescItem :label="t('accounts.type')">
                {{ accountTypes.typeLabel(detail.plugin_key, detail.type, detail.type_label) }}
                <SHint inline size="xs">· {{ accountTypes.pluginName(detail.plugin_key) }} <span class="font-mono">({{ detail.plugin_key }}/{{ detail.type }})</span></SHint>
              </SDescItem>
              <SDescItem v-if="detail.subscription_type" :label="t('accounts.subscription')">
                <SBadge tone="purple" :title="t('accounts.subscriptionHint')">{{ subscriptionLabel(detail.subscription_type) }}</SBadge>
              </SDescItem>
              <SDescItem v-if="detailType" :label="t('platforms.supported')"><PlatformBadges :items="detailType.platforms" empty="—" /></SDescItem>
              <SDescItem :label="t('accounts.servesEndpoints')">
                <AccountTypeEndpoints v-if="detailType" :endpoints="detailType.endpoints" />
                <SHint v-else inline size="xs">{{ t('accounts.typeUnavailable') }}</SHint>
              </SDescItem>
              <SDescItem :label="t('common.status')">
                <SBadge :tone="statusOf(detail).tone" dot>{{ statusOf(detail).label }}</SBadge>
                <SHint v-if="statusOf(detail).detail" inline size="xs" class="ml-2">{{ statusOf(detail).detail }}</SHint>
                <SLink v-if="coolingDown(detail) && canResetStatus(detail)" as="button" class="ml-2 text-xs" :title="t('accounts.resetStatusHint')" @click="resetStatus(detail)">{{ t('accounts.resetStatus') }}</SLink>
              </SDescItem>
              <SDescItem :label="t('accounts.groups')">{{ groupNames(detail.group_ids, detail.groups) }}</SDescItem>
              <SDescItem :label="t('accounts.priority')">{{ detail.priority }}</SDescItem>
              <SDescItem :label="t('accounts.weight')">{{ detail.weight ?? 1 }}</SDescItem>
              <SDescItem :label="t('accounts.concurrency')">{{ detail.in_use ?? 0 }}/{{ detail.max_concurrency || '∞' }}</SDescItem>
              <SDescItem :label="t('accounts.limits')">
                <span v-if="limitsOf(detail).length" class="flex flex-wrap gap-x-3 gap-y-0.5 text-sm tabular-nums">
                  <span v-for="l in limitsOf(detail)" :key="l.key" :class="l.hit ? 'font-semibold text-warning-600' : ''">
                    <SHint inline>{{ l.label }}</SHint> {{ l.text }}
                  </span>
                </span>
                <SHint v-else inline>—</SHint>
              </SDescItem>
              <SDescItem v-if="detail.refresh" :label="t('accounts.credRefresh.label')" data-testid="account-cred-refresh">
                  <span :class="credRefreshText(detail).warn ? 'text-warning-600' : ''" class="text-sm">{{ credRefreshText(detail).text }}</span>
                  <SLink v-if="canRefreshCreds(detail)" as="button" class="ml-2 text-xs" :title="t('accounts.credRefresh.actionHint')" :disabled="refreshingCreds.has(detail.id)" @click="refreshCreds(detail)">{{ t('accounts.credRefresh.action') }}</SLink>
              </SDescItem>
              <SDescItem v-if="hasQuota(detail.quota)" :label="t('accounts.quota.column')"><AccountQuotaCell :quota="detail.quota" :refreshing="quotaRefresh.refreshing.has(detail.id)" @refresh="quotaRefresh.refresh(detail.id)" /></SDescItem>
              <SDescItem v-if="hasBalance(detail.balance)" :label="t('accounts.balance.label')"><AccountBalanceCell :balance="detail.balance" :refreshing="balanceRefresh.refreshing.has(detail.id)" @refresh="balanceRefresh.refresh(detail.id, detail.balance)" /></SDescItem>
              <SDescItem :label="t('accounts.models')">
                <span v-if="detail.models?.length" class="flex flex-wrap gap-1">
                  <SBadge v-for="m in detail.models" :key="m" tone="gray"><span class="font-mono">{{ m }}</span></SBadge>
                </span>
                <SHint v-else inline>{{ t('accounts.allModels') }}</SHint>
              </SDescItem>
              <SDescItem :label="t('accounts.modelMapping')">
                <ul v-if="detail.model_mapping && Object.keys(detail.model_mapping).length" class="space-y-0.5">
                  <li v-for="(to, from) in detail.model_mapping" :key="from" class="font-mono text-xs">
                    {{ from }} <SHint inline size="xs">→</SHint> {{ to }}
                  </li>
                </ul>
                <SHint v-else inline>—</SHint>
              </SDescItem>
              <SDescItem :label="t('accounts.schedulable')">{{ detail.schedulable ? t('common.yes') : t('common.no') }}</SDescItem>
              <SDescItem :label="t('accounts.lastUsed')">{{ formatDateTime(detail.last_used_at) }}</SDescItem>
              <SDescItem :label="t('accounts.lastTest.column')"><LastTestCell :last="detail.last_test" :testing="batchTesting.has(detail.id)" /></SDescItem>
              <SDescItem v-if="showOwner" :label="t('accounts.createdBy')">{{ detail.created_by_email || (detail.created_by ? `#${detail.created_by}` : '-') }}</SDescItem>
              <SDescItem :label="t('common.createdAt')">{{ formatDateTime(detail.created_at) }}</SDescItem>
            </SDescriptions>
            <div v-if="detail.credentials">
              <SSectionTitle :title="t('accounts.credentials')" />
              <SCode>{{ JSON.stringify(detail.credentials, null, 2) }}</SCode>
            </div>
          </div>
          <component :is="detailSlot.component" v-else-if="detailSlot" :account="detail" />
        </STabs>
      </template>
    </SModal>
  </div>
</template>

<style scoped>
.account-table :deep(td) {
  white-space: nowrap;
}
.account-table :deep(.table-dense td) {
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
}
</style>
