<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCheckbox, SCode, SDropdown, SHint, SIcon, SInput, SLink, SModal, SPageHeader, SPagination, SSectionTitle, SSelect, SSwitch, STable, STabs, confirm, toast, type SelectOption, type TableColumn } from '@sub2api/ui'
import type { Account, AccountLastTest, AccountTestResult, AccountType } from '@/api/types'
import { useList } from '@/composables/useList'
import { useGroupsLookup } from '@/composables/lookups'
import { ACCOUNT_KEYS, useOwnership } from '@/composables/useOwnership'
import { useAuthStore } from '@/stores/auth'
import { usePluginStore } from '@/stores/plugins'
import { errorMessage, notifyError } from '@/utils/errors'
import { copyText, formatDateTime, formatRelative, formatTime } from '@/utils/format'
import { lt } from '@/i18n'
import { useAccountTypes, typeKey } from './accountTypes'
import AccountTypePicker from './AccountTypePicker.vue'
import AccountTypeEndpoints from './AccountTypeEndpoints.vue'
import PlatformBadges from '@/views/platforms/PlatformBadges.vue'
import AccountEditor from './AccountEditor.vue'
import AccountSchedulingCell from './AccountSchedulingCell.vue'
import { sameCreationGroup } from './accountTypeChoices'
import AccountQuotaCell from './AccountQuotaCell.vue'
import AccountBalanceCell from './AccountBalanceCell.vue'
import AccountModelTest from './AccountModelTest.vue'
import LastTestCell from './AccountLastTest.vue'
import { TEST_CONCURRENCY, lastTestOf } from './accountTest'
import { runPool } from './pool'
import { hasBalance, hasQuota, refreshAccountCredentials, resetAccountStatus, useBalanceRefresh, useQuotaRefresh } from './accountQuota'

const { t } = useI18n()
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
  { key: 'name', label: t('accounts.listUi.identity') },
  { key: 'groups', label: t('accounts.groups') },
  ...(showOwner.value ? [{ key: 'created_by', label: t('accounts.createdBy') }] : []),
  { key: 'status', label: t('common.status') },
  { key: 'scheduling', label: t('accounts.listUi.priorityWeight') },
  { key: 'limits', label: t('accounts.limits') },
  // Only when a row of this page has plan windows (subscription accounts).
  ...(list.items.value.some((a) => hasQuota(a.quota)) ? [{ key: 'quota', label: t('accounts.quota.column') }] : []),
  // Only when a row of this page has balance (balance-enabled account types).
  ...(list.items.value.some((a) => hasBalance(a.balance)) ? [{ key: 'balance', label: t('accounts.balance.column') }] : []),
  { key: 'last_test', label: t('accounts.lastTest.column') },
  { key: 'actions', label: t('common.actions'), align: 'right' }
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

function groupNames(ids: number[] | undefined, refs?: Array<{ id: number; name: string }>) {
  if (!ids?.length) return '—'
  return ids.map((id) => refs?.find((g) => g.id === id)?.name || groups.value.find((g) => g.id === id)?.name || `#${id}`).join(', ')
}

function coolingDown(a: Account) {
  return !!a.cooldown_until && new Date(a.cooldown_until).getTime() > Date.now()
}

type StatusView = { tone: 'success' | 'warning' | 'danger' | 'gray'; label: string; detail?: string }
function statusOf(a: Account): StatusView {
  if (a.orphaned) return { tone: 'gray', label: t('accounts.status.orphaned'), detail: t('accounts.orphanedHint', { plugin: a.plugin_key }) }
  if (a.status === 'disabled') return { tone: 'danger', label: t('accounts.status.disabled'), detail: a.status_reason }
  if (a.status === 'error') return { tone: 'danger', label: t('accounts.status.error'), detail: a.status_reason }
  if (coolingDown(a)) {
    return {
      tone: 'warning',
      label: t('accounts.status.cooldown'),
      detail: t('accounts.cooldownUntil', { time: formatTime(a.cooldown_until) }) + (a.cooldown_reason ? `（${a.cooldown_reason}）` : '')
    }
  }
  if (!a.schedulable) return { tone: 'gray', label: t('accounts.status.unschedulable') }
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
function onTested(id: number, last: AccountLastTest) {
  const row = list.items.value.find((x) => x.id === id)
  if (row) row.last_test = last
  if (detail.value?.id === id) detail.value.last_test = last
}

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
async function copyRevealed() {
  if (revealed.value && (await copyText(JSON.stringify(revealed.value, null, 2)))) toast(t('common.copied'), 'success')
}

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
// for one account (force) at most every 30 s, never automatically.
const quotaRefresh = useQuotaRefresh({
  onSnapshot(id, snapshot) {
    const row = list.items.value.find((x) => x.id === id)
    if (row) row.quota = snapshot
    if (detail.value?.id === id) detail.value.quota = snapshot
  },
  onThrottled: (_id, n) => toast(t('accounts.quota.refreshThrottled', { n }), 'info'),
  onError: (_id, e) => notifyError(e)
})

// ---------------------------------------------------------------- balance refresh
// Similar to quota refresh, but for account balance (CONTRACTS §52).
const balanceRefresh = useBalanceRefresh({
  onSnapshot(id, snapshot) {
    const row = list.items.value.find((x) => x.id === id)
    if (row) row.balance = snapshot
    if (detail.value?.id === id) detail.value.balance = snapshot
  },
  onThrottled: (_id, n) => toast(t('accounts.balance.refreshThrottled', { n }), 'info'),
  onError: (_id, e) => notifyError(e)
})

const canResetStatus = (a: Account) => canUpdate(a) && !a.orphaned

async function resetStatus(a: Account) {
  const ok = await confirm({ title: t('accounts.resetStatusTitle'), message: t('accounts.resetStatusConfirm', { name: a.name }), confirmText: t('accounts.resetStatus') })
  if (!ok) return
  try {
    await resetAccountStatus(a.id)
    toast(t('accounts.resetStatusDone'), 'success')
    if (detail.value?.id === a.id) openDetail(a)
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
    if (detail.value?.id === a.id) detail.value.refresh = out.refresh
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
async function toggleSchedulable(a: Account, v: boolean) {
  try {
    await api.patch(`/accounts/${a.id}`, { schedulable: v })
    a.schedulable = v
  } catch (e) {
    notifyError(e)
  }
}

async function remove(a: Account) {
  if (!(await confirm({ message: t('common.confirmDelete', { name: a.name }), danger: true }))) return
  try {
    await api.del(`/accounts/${a.id}`)
    toast(t('common.deleted'), 'success')
    list.reload()
  } catch (e) {
    notifyError(e)
  }
}

function actionsFor(a: Account) {
  return [
    { key: 'detail', label: t('common.detail') },
    { key: 'reveal', label: t('accounts.revealCredentials'), hidden: !canReveal(a) || a.orphaned },
    { key: 'reset-status', label: t('accounts.resetStatus'), hidden: !canResetStatus(a) },
    { key: 'refresh-credentials', label: t('accounts.credRefresh.action'), hidden: !canRefreshCreds(a) },
    { key: 'delete', label: t('common.delete'), danger: true, hidden: !canDelete(a) }
  ]
}

function onAction(a: Account, key: string) {
  if (key === 'detail') openDetail(a)
  else if (key === 'reveal') reveal(a)
  else if (key === 'reset-status') resetStatus(a)
  else if (key === 'refresh-credentials') refreshCreds(a)
  else if (key === 'delete') remove(a)
}

const statusOptions = ['active', 'disabled', 'error']
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
function groupTags(a: Account) {
  return (a.group_ids || []).map(id => ({ id, name: a.groups?.find(g => g.id === id)?.name || groups.value.find(g => g.id === id)?.name || `#${id}` }))
}
</script>

<template>
  <div>
    <SPageHeader :title="t('accounts.title')" :description="t('accounts.subtitle')">
      <template #actions>
        <SSwitch v-model="autoRefresh" :label="t('accounts.autoRefresh')" />
        <SButton :loading="list.loading.value" :aria-label="t('accounts.listUi.refresh')" :title="t('accounts.listUi.refresh')" @click="list.reload()"><SIcon name="refresh" class="h-4 w-4" /></SButton>
        <SButton v-if="canCreate" variant="primary" data-testid="account-new" @click="openCreate"><SIcon name="plus" class="h-4 w-4" />{{ t('accounts.new') }}</SButton>
      </template>
    </SPageHeader>

    <section class="mb-4 rounded-xl border border-gray-200 bg-white p-3 dark:border-dark-700 dark:bg-dark-900" :aria-label="t('accounts.listUi.filters')">
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative min-w-48 flex-1">
          <SIcon name="search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <SInput v-model="list.filters.q" class="!pl-9" :aria-label="t('accounts.listUi.search')" :placeholder="t('accounts.listUi.search')" />
        </div>
        <SSelect v-model="typeFilter" :options="typeOptions" class="!w-52" :aria-label="t('accounts.type')" />
        <SSelect v-model="list.filters.group_id" :options="groupOptions" class="!w-40" :aria-label="t('accounts.groups')" />
        <SSelect v-model="list.filters.status" :options="statusSelectOptions" class="!w-36" :aria-label="t('common.status')" />
        <SButton size="sm" :variant="hasAdvancedFilters ? 'primary' : 'secondary'" :aria-expanded="advancedFilters" @click="advancedFilters = !advancedFilters">{{ t('accounts.listUi.advanced') }}</SButton>
        <SButton v-if="filterCount" size="sm" variant="ghost" @click="resetFilters">{{ t('accounts.listUi.clear', { count: filterCount }) }}</SButton>
      </div>
      <div v-if="advancedFilters" class="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 dark:border-dark-700">
        <SInput v-model="list.filters.model" class="!w-56" mono data-testid="model-filter" :aria-label="t('accounts.modelFilter')" :placeholder="t('accounts.modelFilter')" />
        <SInput v-if="showOwner" v-model="list.filters.created_by" class="!w-40" inputmode="numeric" data-testid="created-by-filter" :aria-label="t('common.createdById')" :placeholder="t('common.createdById')" />
        <SSwitch v-model="onlyMine" :label="t('common.onlyMine')" data-testid="only-mine" />
        <SSwitch v-model="showOrphaned" :label="t('accounts.showOrphaned')" data-testid="show-orphaned" />
      </div>
      <p v-else-if="hasAdvancedFilters" class="mt-2 text-xs text-primary-600 dark:text-primary-300">{{ t('accounts.listUi.advancedApplied') }}</p>
    </section>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-dark-400">
      <span v-if="list.error.value" role="alert" class="text-red-600 dark:text-red-400">{{ t(list.items.value.length ? 'accounts.listUi.loadFailed' : 'accounts.listUi.loadFailedEmpty') }}</span>
      <span v-else-if="list.loading.value">{{ t('common.loading') }}</span>
      <span v-else>{{ t('accounts.listUi.resultCount', { total: list.total.value, page: list.items.value.length }) }}</span>
      <span v-if="pageTestable.length" class="flex flex-wrap items-center gap-2" data-testid="account-batch-bar">
        <SCheckbox size="xs" :model-value="allPicked" :indeterminate="somePicked" :disabled="batchRunning" data-testid="account-pick-page" @update:model-value="pickPage">{{ t('accounts.batchTest.pickPage') }}</SCheckbox>
        <template v-if="picked.size || batchRunning">
          <SButton size="sm" variant="primary" :loading="batchRunning" :disabled="!picked.size" data-testid="account-batch-test" @click="batchTest">
            <SIcon v-if="!batchRunning" name="play" class="h-3.5 w-3.5" />{{ batchRunning ? t('accounts.batchTest.progress', { done: batchDone, total: batchTotal }) : t('accounts.batchTest.run', { n: picked.size }) }}
          </SButton>
          <SButton v-if="batchRunning" size="sm" variant="danger" @click="stopBatch"><SIcon name="stop" class="h-3.5 w-3.5" />{{ t('accounts.modelTest.stop') }}</SButton>
          <SLink v-else as="button" class="text-xs" @click="picked = new Set()">{{ t('accounts.batchTest.clear') }}</SLink>
          <SHint inline size="xs">{{ t('accounts.batchTest.hint') }}</SHint>
        </template>
      </span>
      <SSwitch v-model="denseRows" :label="t('accounts.listUi.compact')" class="ml-auto" />
    </div>
    <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :dense="denseRows" :empty-text="t(filterCount ? 'accounts.listUi.emptyFiltered' : 'accounts.listUi.empty')">
      <template #cell-pick="{ row }">
        <SCheckbox v-if="testable(row)" bare :model-value="picked.has(row.id)" :disabled="batchRunning" :aria-label="row.name" @update:model-value="pickRow(row.id, $event)" />
      </template>
      <template #cell-last_test="{ row }">
        <LastTestCell :last="row.last_test" :testing="batchTesting.has(row.id)" />
      </template>
      <template #cell-name="{ row }">
        <div class="min-w-48 max-w-xs space-y-1">
          <div class="flex items-center gap-2"><span class="shrink-0 font-mono text-[11px] text-gray-400">#{{ row.id }}</span><SLink as="button" class="min-w-0 truncate font-semibold" :title="row.name" @click="openDetail(row)">{{ row.name }}</SLink></div>
          <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 dark:text-dark-400"><span :title="row.plugin_key">{{ accountTypes.pluginName(row.plugin_key) }}</span><span aria-hidden="true">/</span><span class="truncate" :title="accountTypes.typeLabel(row.plugin_key, row.type, row.type_label)">{{ accountTypes.typeLabel(row.plugin_key, row.type, row.type_label) }}</span></div>
          <div v-if="row.last_used_at" class="text-[11px] text-gray-400">{{ t('accounts.lastUsed') }} {{ formatRelative(row.last_used_at, t) }}</div>
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
        <SHint v-if="statusOf(row).detail" size="xs" class="mt-1 line-clamp-2 max-w-[16rem] break-words" :title="statusOf(row).detail">
          {{ statusOf(row).detail }}
        </SHint>
        <SLink v-if="coolingDown(row) && canResetStatus(row)" as="button" class="mt-1 inline-flex items-center gap-1 text-xs" :title="t('accounts.resetStatusHint')" data-testid="account-reset-status" @click="resetStatus(row)">
          <SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('accounts.resetStatus') }}
        </SLink>
      </template>
      <template #cell-scheduling="{ row }">
        <AccountSchedulingCell :account="row" :editable="canUpdate(row) && !row.orphaned" @saved="Object.assign(row, $event)" />
      </template>
      <template #cell-limits="{ row }">
        <div class="min-w-28 space-y-1 text-xs tabular-nums" data-testid="account-limits">
          <div class="flex justify-between gap-3"><SHint inline size="xs">{{ t('accounts.concurrency') }}</SHint><span :class="row.max_concurrency && (row.in_use || 0) >= row.max_concurrency ? 'font-semibold text-amber-600' : ''">{{ row.in_use ?? 0 }}/{{ row.max_concurrency || '∞' }}</span></div>
          <div v-for="l in limitsOf(row)" :key="l.key" class="flex justify-between gap-3" :class="l.hit ? 'font-semibold text-amber-600' : ''"><SHint inline size="xs">{{ l.label }}</SHint><span>{{ l.text }}</span></div>
        </div>
      </template>
      <template #cell-quota="{ row }">
        <AccountQuotaCell v-if="hasQuota(row.quota)" :quota="row.quota" :refreshing="quotaRefresh.refreshing.has(row.id)" @refresh="quotaRefresh.refresh(row.id, row.quota)" />
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
            :model-value="row.schedulable"
            :title="t('accounts.schedulable')"
            @update:model-value="toggleSchedulable(row, $event)"
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
      <div v-if="editorLoading" class="py-10 text-center text-gray-400">{{ t('common.loading') }}</div>
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
      <SCode>{{ JSON.stringify(revealed, null, 2) }}</SCode>
      <template #footer>
        <SButton @click="copyRevealed"><SIcon name="copy" class="h-4 w-4" />{{ t('common.copy') }}</SButton>
        <SButton variant="primary" @click="revealOpen = false">{{ t('common.close') }}</SButton>
      </template>
    </SModal>

    <!-- detail -->
    <SModal v-model:open="detailOpen" :title="detail?.name || ''" width="xl">
      <template v-if="detail">
        <STabs v-model="detailTab" :tabs="detailTabs" class="mb-4" />
        <div v-if="detailTab === 'overview'" class="space-y-4">
          <dl class="kv">
            <dt>ID</dt>
            <dd>{{ detail.id }}</dd>
            <dt>{{ t('accounts.type') }}</dt>
            <dd>
              {{ accountTypes.typeLabel(detail.plugin_key, detail.type, detail.type_label) }}
              <SHint inline size="xs">· {{ accountTypes.pluginName(detail.plugin_key) }} <span class="font-mono">({{ detail.plugin_key }}/{{ detail.type }})</span></SHint>
            </dd>
            <template v-if="detailType">
              <dt>{{ t('platforms.supported') }}</dt>
              <dd><PlatformBadges :items="detailType.platforms" empty="—" /></dd>
            </template>
            <dt>{{ t('accounts.servesEndpoints') }}</dt>
            <dd>
              <AccountTypeEndpoints v-if="detailType" :endpoints="detailType.endpoints" />
              <SHint v-else inline size="xs">{{ t('accounts.typeUnavailable') }}</SHint>
            </dd>
            <dt>{{ t('common.status') }}</dt>
            <dd>
              <SBadge :tone="statusOf(detail).tone" dot>{{ statusOf(detail).label }}</SBadge>
              <SHint v-if="statusOf(detail).detail" inline size="xs" class="ml-2">{{ statusOf(detail).detail }}</SHint>
              <SLink v-if="coolingDown(detail) && canResetStatus(detail)" as="button" class="ml-2 text-xs" :title="t('accounts.resetStatusHint')" @click="resetStatus(detail)">{{ t('accounts.resetStatus') }}</SLink>
            </dd>
            <dt>{{ t('accounts.groups') }}</dt>
            <dd>{{ groupNames(detail.group_ids, detail.groups) }}</dd>
            <dt>{{ t('accounts.priority') }}</dt>
            <dd>{{ detail.priority }}</dd>
            <dt>{{ t('accounts.weight') }}</dt>
            <dd>{{ detail.weight ?? 1 }}</dd>
            <dt>{{ t('accounts.concurrency') }}</dt>
            <dd>{{ detail.in_use ?? 0 }}/{{ detail.max_concurrency || '∞' }}</dd>
            <dt>{{ t('accounts.limits') }}</dt>
            <dd>
              <span v-if="limitsOf(detail).length" class="flex flex-wrap gap-x-3 gap-y-0.5 text-sm tabular-nums">
                <span v-for="l in limitsOf(detail)" :key="l.key" :class="l.hit ? 'font-semibold text-amber-600' : ''">
                  <SHint inline>{{ l.label }}</SHint> {{ l.text }}
                </span>
              </span>
              <SHint v-else inline>—</SHint>
            </dd>
            <template v-if="detail.refresh">
              <dt>{{ t('accounts.credRefresh.label') }}</dt>
              <dd data-testid="account-cred-refresh">
                <span :class="credRefreshText(detail).warn ? 'text-amber-600' : ''" class="text-sm">{{ credRefreshText(detail).text }}</span>
                <SLink v-if="canRefreshCreds(detail)" as="button" class="ml-2 text-xs" :title="t('accounts.credRefresh.actionHint')" :disabled="refreshingCreds.has(detail.id)" @click="refreshCreds(detail)">{{ t('accounts.credRefresh.action') }}</SLink>
              </dd>
            </template>
            <template v-if="hasQuota(detail.quota)">
              <dt>{{ t('accounts.quota.column') }}</dt>
              <dd><AccountQuotaCell :quota="detail.quota" :refreshing="quotaRefresh.refreshing.has(detail.id)" @refresh="quotaRefresh.refresh(detail.id, detail.quota)" /></dd>
            </template>
            <template v-if="hasBalance(detail.balance)">
              <dt>{{ t('accounts.balance.label') }}</dt>
              <dd><AccountBalanceCell :balance="detail.balance" :refreshing="balanceRefresh.refreshing.has(detail.id)" @refresh="balanceRefresh.refresh(detail.id, detail.balance)" /></dd>
            </template>
            <dt>{{ t('accounts.models') }}</dt>
            <dd>
              <span v-if="detail.models?.length" class="flex flex-wrap gap-1">
                <SBadge v-for="m in detail.models" :key="m" tone="gray"><span class="font-mono">{{ m }}</span></SBadge>
              </span>
              <SHint v-else inline>{{ t('accounts.allModels') }}</SHint>
            </dd>
            <dt>{{ t('accounts.modelMapping') }}</dt>
            <dd>
              <ul v-if="detail.model_mapping && Object.keys(detail.model_mapping).length" class="space-y-0.5">
                <li v-for="(to, from) in detail.model_mapping" :key="from" class="font-mono text-xs">
                  {{ from }} <SHint inline size="xs">→</SHint> {{ to }}
                </li>
              </ul>
              <SHint v-else inline>—</SHint>
            </dd>
            <dt>{{ t('accounts.schedulable') }}</dt>
            <dd>{{ detail.schedulable ? t('common.yes') : t('common.no') }}</dd>
            <dt>{{ t('accounts.lastUsed') }}</dt>
            <dd>{{ formatDateTime(detail.last_used_at) }}</dd>
            <dt>{{ t('accounts.lastTest.column') }}</dt>
            <dd><LastTestCell :last="detail.last_test" :testing="batchTesting.has(detail.id)" /></dd>
            <template v-if="showOwner">
              <dt>{{ t('accounts.createdBy') }}</dt>
              <dd>{{ detail.created_by_email || (detail.created_by ? `#${detail.created_by}` : '-') }}</dd>
            </template>
            <dt>{{ t('common.createdAt') }}</dt>
            <dd>{{ formatDateTime(detail.created_at) }}</dd>
          </dl>
          <div v-if="detail.credentials">
            <SSectionTitle :title="t('accounts.credentials')" />
            <SCode>{{ JSON.stringify(detail.credentials, null, 2) }}</SCode>
          </div>
        </div>
        <component :is="detailSlot.component" v-else-if="detailSlot" :account="detail" />
      </template>
    </SModal>
  </div>
</template>
