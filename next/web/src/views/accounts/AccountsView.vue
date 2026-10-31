<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SBulkBar, SButton, SCode, SCopyButton, SDescItem, SDescriptions, SDropdown, SHint, SIcon, SInput, SLink, SModal, SPageHeader, SPagination, SSectionTitle, SSelect, SSpinner, SSwitch, STable, STabs, confirm, toast, type SelectOption, type TableColumn } from '@sub2api/ui'
import type { Account, AccountAction, AccountLastTest, AccountType } from '@/api/types'
import { useList } from '@/composables/useList'
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
import AccountNumberCell from './AccountNumberCell.vue'
import PluginSlot from '@/components/plugin/PluginSlot.vue'
import AccountLimitsCell from './AccountLimitsCell.vue'
import AccountLimitsTable from './AccountLimitsTable.vue'
import { accountControl, sameCreationGroup } from './accountTypeChoices'
import AccountQuotaCell from './AccountQuotaCell.vue'
import AccountBalanceCell from './AccountBalanceCell.vue'
import AccountModelTest from './AccountModelTest.vue'
import AccountDeleteDialog from './AccountDeleteDialog.vue'
import LastTestCell from './AccountLastTest.vue'
import { rowActions, runRowAction, type RowActionDeps } from './accountRowActions'
import { accountStatusKey, accountStatusKeys, accountStatusTone } from './accountStatus'
import { useBatchTest } from './useBatchTest'
import { useSelection } from '@/composables/useSelection'
import { useBulkRun, type BulkFailure } from '@/composables/useBulkRun'
import AccountBulkEditDialog from './AccountBulkEditDialog.vue'
import AccountBulkDeleteDialog from './AccountBulkDeleteDialog.vue'
import { subscriptionLabel } from './subscription'
import { hasBalance, hasQuota, refreshAccountCredentials, resetAccountStatus, useBalanceRefresh, useQuotaRefresh } from './accountQuota'
import { reasonOf } from '@/views/ccgateway/ccgAuthFlow'

const { t, te } = useI18n()
const auth = useAuthStore()
const plugins = usePluginStore()
const own = useOwnership()
const accountTypes = useAccountTypes()
accountTypes.load()
/** The account type of `a` (undefined until the types load or for an orphaned type). */
const typeOf = (a?: Pick<Account, 'plugin_key' | 'type'> | null) => (a ? accountTypes.find(a.plugin_key, a.type) : undefined)
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
  { key: 'name', label: t('accounts.listUi.identity'), width: '320px' },
  { key: 'groups', label: t('accounts.groups') },
  ...(showOwner.value ? [{ key: 'created_by', label: t('accounts.createdBy') }] : []),
  { key: 'status', label: t('common.status') },
  { key: 'priority', label: t('accounts.priority'), width: '84px' },
  { key: 'weight', label: t('accounts.weight'), width: '84px' },
  { key: 'limits', label: t('accounts.listUi.limitsColumn') },
  // Only when a row of this page has plan windows (subscription accounts).
  ...(list.items.value.some((a) => hasQuota(a.quota)) ? [{ key: 'quota', label: t('accounts.quota.column') }] : []),
  // Only when a row of this page has balance (balance-enabled account types).
  ...(list.items.value.some((a) => hasBalance(a.balance)) ? [{ key: 'balance', label: t('accounts.balance.column') }] : []),
  { key: 'last_test', label: t('accounts.lastTest.column') },
  { key: 'actions', label: t('common.actions'), align: 'right', width: '210px' }
])

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

/** detail: full explanation (list badge tooltip, detail drawer); note: short recovery time shown under the list badge. */
type StatusView = { tone: ReturnType<typeof accountStatusTone>; label: string; detail?: string; note?: string }
function statusOf(a: Account): StatusView {
  const key = accountStatusKey(a)
  const cooling = key === 'active' && coolingDown(a)
  const reason = a.orphaned ? t('accounts.orphanedHint', { plugin: a.plugin_key }) : (cooling && a.cooldown_reason) || a.status_reason
  const view: StatusView = { tone: accountStatusTone(a), label: t(`accounts.status.${key}`), detail: reason || undefined }
  if (key === 'auto_disabled' && a.auto_disabled_until) view.note = t('accounts.autoReleaseAt', { time: formatDateTime(a.auto_disabled_until) })
  if (cooling) view.note = t('accounts.cooldownUntil', { time: formatTime(a.cooldown_until) })
  return view
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
    pickedType.value = typeOf(full) || null
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
const testTargetType = computed(() => typeOf(testTarget.value) || null)

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

// ---------------------------------------------------------------- selection + bulk actions
// Rows the caller may act on in some way; each action runs on the selected
// accounts it applies to (the button shows how many), and the server checks
// every request as it does for a single row.
const testable = (a: Account) => canTest(a) && !a.orphaned
const editable = (a: Account) => canUpdate(a) && !a.orphaned
const toggleable = (a: Account) => editable(a) && accountControl(typeOf(a), 'schedulable').configurable
const selectable = (a: Account) => testable(a) || editable(a) || canDelete(a)
const selection = useSelection<Account>({ items: list.items, key: (a) => a.id, selectable, loadAll: loadAllAccounts })
const selectionKeys = computed({ get: () => selection.keys.value as unknown[], set: (v: unknown[]) => selection.update(v) })
const anySelectable = computed(() => list.items.value.some(selectable))
/** Every account matching the current filters (pages of 200). */
async function loadAllAccounts(): Promise<Account[]> {
  const out: Account[] = []
  for (let page = 1; page <= 100; page++) {
    const res = await api.list<Account>('/accounts', { ...list.filters, page, page_size: 200 })
    out.push(...res.items)
    if (res.items.length < 200 || out.length >= (res.page?.total ?? 0)) break
  }
  return out
}
// A changed filter starts a new selection: rows outside it would be acted on unseen.
watch(() => ({ ...list.filters }), () => selection.clear(), { deep: true })
const picked = computed(() => ({
  test: selection.rows.value.filter(testable),
  edit: selection.rows.value.filter(editable),
  toggle: selection.rows.value.filter(toggleable),
  reset: selection.rows.value.filter(canResetStatus),
  remove: selection.rows.value.filter(canDelete)
}))

const { batchTesting, batchRunning, batchDone, batchTotal, batchTest, stopBatch } = useBatchTest({ tested: onTested })

const bulk = useBulkRun(4)
const bulkBusy = computed(() => batchRunning.value || bulk.running.value)
async function bulkToggle(enable: boolean) {
  const rows = picked.value.toggle.filter((a) => (a.status !== 'disabled') !== enable)
  if (!rows.length) return toast(t('accounts.bulk.nothingToChange'), 'info')
  const out = await bulk.run(rows, async (a, signal) => {
    patchAccount(a.id, await api.patch<Account>(`/accounts/${a.id}`, { status: enable ? 'active' : 'disabled', schedulable: enable }, { signal }))
  })
  bulkToast(out.ok.length, out.failed)
}
async function bulkReset() {
  const rows = picked.value.reset
  const ok = await confirm({ title: t('accounts.resetStatusTitle'), message: t('accounts.bulk.resetConfirm', { n: rows.length }), confirmText: t('accounts.resetStatus') })
  if (!ok) return
  const out = await bulk.run(rows, async (a) => {
    patchAccount(a.id, await resetAccountStatus(a.id))
  })
  bulkToast(out.ok.length, out.failed)
  list.reload()
}
function bulkToast(ok: number, failed: BulkFailure<Account>[]) {
  if (!failed.length) return toast(t('accounts.bulk.done', { ok }), 'success')
  const first = failed[0]
  toast(t('accounts.bulk.doneWithErrors', { ok, fail: failed.length, name: first.item.name, error: errorMessage(first.error) }), 'warning')
}
const bulkEditOpen = ref(false)
const bulkDeleteOpen = ref(false)
function onBulkSaved(rows: Account[]) {
  for (const r of rows) patchAccount(r.id, r)
  list.reload()
}
function onBulkDeleted(ids: number[]) {
  selection.drop(ids)
  list.reload()
}
const retentionOf = (a: Account) => typeOf(a)?.lifecycle?.deletion?.retentionDays ?? 0
const moreBulkActions = computed(() => [
  { key: 'enable', label: t('accounts.bulk.enable', { n: picked.value.toggle.length }), disabled: !picked.value.toggle.length },
  { key: 'disable', label: t('accounts.bulk.disable', { n: picked.value.toggle.length }), disabled: !picked.value.toggle.length },
  { key: 'reset', label: t('accounts.bulk.reset', { n: picked.value.reset.length }), disabled: !picked.value.reset.length }
])
function onBulkMore(key: string) {
  if (key === 'enable' || key === 'disable') void bulkToggle(key === 'enable')
  else if (key === 'reset') void bulkReset()
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
const detailType = computed(() => typeOf(detail.value))

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
// for one account (force), with duplicate in-flight clicks coalesced. An
// account that cannot be queried yet (409 details.reason) is named in the toast.
const quotaRefresh = useQuotaRefresh({
  onSnapshot: (id, quota) => patchAccount(id, { quota }),
  onError: (_id, e) => {
    const key = `accounts.quota.refreshBlocked.${reasonOf(e)}`
    if (reasonOf(e) && te(key)) toast(t(key), 'error')
    else notifyError(e)
  }
})

// ---------------------------------------------------------------- balance refresh
// Similar to quota refresh, but for account balance (CONTRACTS §52).
const balanceRefresh = useBalanceRefresh({
  onSnapshot: (id, balance) => patchAccount(id, { balance }),
  onThrottled: (_id, n) => toast(t('accounts.balance.refreshThrottled', { n }), 'info'),
  onError: (_id, e) => notifyError(e)
})

// A manual disable is undone with the switch; Reset status clears what the gateway set.
const canResetStatus = (a: Account) => canUpdate(a) && !a.orphaned && a.status !== 'disabled'

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
  if (togglingEnabled.value.has(a.id) || !canUpdate(a) || !accountControl(typeOf(a), 'schedulable').configurable) return
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

const deleteOpen = ref(false)
const deleteTarget = ref<Account | null>(null)
const deleteRetentionDays = computed(() => typeOf(deleteTarget.value)?.lifecycle?.deletion?.retentionDays ?? 0)
function remove(a: Account) {
  deleteTarget.value = a
  deleteOpen.value = true
}

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

const rowActionDeps: RowActionDeps = {
  canReveal,
  canResetStatus,
  canRefreshCreds,
  canUpdate,
  canDelete,
  running: (a) => runningActions.value.has(a.id),
  openDetail,
  reveal,
  resetStatus,
  refreshCreds,
  remove,
  runPluginAction
}
const actionsFor = (a: Account) => rowActions(a, rowActionDeps)
function onAction(a: Account, key: string) {
  void runRowAction(a, key, rowActionDeps)
}

const statusSelectOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('accounts.allStatus') },
  ...accountStatusKeys.map((s) => ({ value: s, label: t(`accounts.status.${s}`) }))
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
      <template #filters>
        <SInput v-model="list.filters.q" icon="search" clearable class="w-56" :aria-label="t('accounts.listUi.search')" :placeholder="t('accounts.listUi.search')" />
        <SSelect v-model="typeFilter" :options="typeOptions" class="w-44" :aria-label="t('accounts.type')" />
        <SSelect v-model="list.filters.group_id" :options="groupOptions" class="w-36" :aria-label="t('accounts.groups')" />
        <SSelect v-model="list.filters.status" :options="statusSelectOptions" class="w-32" :aria-label="t('common.status')" />
        <SButton :variant="hasAdvancedFilters ? 'primary' : 'secondary'" :aria-expanded="advancedFilters" @click="advancedFilters = !advancedFilters">{{ t('accounts.listUi.advanced') }}</SButton>
        <SButton v-if="filterCount" variant="ghost" @click="resetFilters">{{ t('accounts.listUi.clear', { count: filterCount }) }}</SButton>
      </template>
      <template #actions>
        <SSwitch v-model="denseRows" :label="t('accounts.listUi.compact')" />
        <SSwitch v-model="autoRefresh" :label="t('accounts.autoRefresh')" />
        <SButton icon="refresh" icon-only :loading="list.loading.value" :aria-label="t('accounts.listUi.refresh')" :title="t('accounts.listUi.refresh')" @click="list.reload()" />
        <SButton v-if="canCreate" variant="primary" icon="plus" data-testid="account-new" @click="openCreate">{{ t('accounts.new') }}</SButton>
      </template>
    </SPageHeader>

    <section v-if="advancedFilters" class="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2" :aria-label="t('accounts.listUi.filters')">
      <SInput v-model="list.filters.model" class="w-56" mono data-testid="model-filter" :aria-label="t('accounts.modelFilter')" :placeholder="t('accounts.modelFilter')" />
      <SInput v-if="showOwner" v-model="list.filters.created_by" class="w-40" inputmode="numeric" data-testid="created-by-filter" :aria-label="t('common.createdById')" :placeholder="t('common.createdById')" />
      <SSwitch v-model="onlyMine" :label="t('common.onlyMine')" data-testid="only-mine" />
      <SSwitch v-model="showOrphaned" :label="t('accounts.showOrphaned')" data-testid="show-orphaned" />
    </section>
    <p v-else-if="hasAdvancedFilters" class="mb-3 text-xs text-primary-600 dark:text-primary-300">{{ t('accounts.listUi.advancedApplied') }}</p>
    <SHint v-if="list.error.value" size="xs" tone="danger" role="alert" class="mb-3">{{ t(list.items.value.length ? 'accounts.listUi.loadFailed' : 'accounts.listUi.loadFailedEmpty') }}</SHint>
    <SBulkBar
      v-if="anySelectable || selection.keys.value.length"
      class="mb-3"
      :persistent="batchRunning || bulk.running.value"
      :count="selection.keys.value.length"
      :total="list.total.value"
      :page-selected="selection.pageSelected.value"
      :all-selected="selection.allSelected.value"
      :selecting-all="selection.selectingAll.value"
      :disabled="bulkBusy"
      data-testid="account-batch-bar"
      @select-page="selection.selectPage()"
      @select-all="selection.selectAll().catch(notifyError)"
      @clear="selection.clear()"
    >
      <template v-if="selection.keys.value.length || batchRunning || bulk.running.value">
        <SHint v-if="bulk.running.value" inline size="xs" aria-live="polite">{{ t('accounts.bulk.progress', { done: bulk.done.value, total: bulk.total.value }) }}</SHint>
        <SButton size="sm" variant="primary" :disabled="!picked.edit.length || bulkBusy" data-testid="account-bulk-edit" @click="bulkEditOpen = true">{{ t('accounts.bulk.edit', { n: picked.edit.length }) }}</SButton>
        <SButton size="sm" :loading="batchRunning" :disabled="!picked.test.length || bulk.running.value" icon="play" :title="t('accounts.batchTest.hint')" data-testid="account-batch-test" @click="batchTest(picked.test.map((a) => a.id))">
          {{ batchRunning ? t('accounts.batchTest.progress', { done: batchDone, total: batchTotal }) : t('accounts.batchTest.run', { n: picked.test.length }) }}
        </SButton>
        <SButton v-if="batchRunning" size="sm" variant="danger" icon="stop" @click="stopBatch">{{ t('accounts.modelTest.stop') }}</SButton>
        <SButton v-if="bulk.running.value" size="sm" variant="danger" icon="stop" @click="bulk.stop()">{{ t('accounts.modelTest.stop') }}</SButton>
        <SDropdown :actions="moreBulkActions" :label="t('accounts.bulk.more')" :disabled="bulkBusy" width="13rem" data-testid="account-bulk-more" @select="onBulkMore" />
        <SButton size="sm" variant="danger" :disabled="!picked.remove.length || bulkBusy" data-testid="account-bulk-delete" @click="bulkDeleteOpen = true">{{ t('accounts.bulk.delete', { n: picked.remove.length }) }}</SButton>
      </template>
    </SBulkBar>
    <STable
      v-model:selected="selectionKeys"
      class="account-table"
      :columns="columns"
      :rows="list.items.value"
      :loading="list.loading.value"
      :dense="denseRows"
      :selectable="anySelectable"
      :row-selectable="selectable"
      :empty-text="t(filterCount ? 'accounts.listUi.emptyFiltered' : 'accounts.listUi.empty')"
    >
      <template #cell-last_test="{ row }">
        <LastTestCell :last="row.last_test" :testing="batchTesting.has(row.id)" />
      </template>
      <template #cell-name="{ row }">
        <div class="min-w-64 max-w-sm space-y-0.5">
          <div class="flex items-center gap-2"><span class="shrink-0 font-mono text-xxs text-fg-subtle">#{{ row.id }}</span><SLink as="button" class="min-w-0 truncate font-semibold" :title="row.name" @click="openDetail(row)">{{ row.name }}</SLink></div>
          <div class="flex items-center gap-1.5 whitespace-nowrap text-xs text-fg-muted"><span :title="row.plugin_key">{{ accountTypes.pluginName(row.plugin_key) }}</span><span aria-hidden="true">/</span><span class="truncate" :title="accountTypes.typeLabel(row.plugin_key, row.type, row.type_label)">{{ accountTypes.typeLabel(row.plugin_key, row.type, row.type_label) }}</span><SBadge v-if="row.subscription_type" size="xs" tone="purple" class="shrink-0" :title="t('accounts.subscriptionHint')" data-testid="account-subscription">{{ subscriptionLabel(row.subscription_type) }}</SBadge><span v-if="row.last_used_at" class="shrink-0 text-xxs text-fg-subtle">· {{ formatRelative(row.last_used_at, t) }}</span></div>
          <div v-for="fact in accountTypes.pluginFacts(row.plugin_key, row.type, row.settings)" :key="fact.key" class="truncate text-xs text-fg-muted" :title="`${fact.label}: ${fact.value}`" :data-testid="'account-fact-' + fact.key">{{ fact.label }} <span class="text-fg">{{ fact.value }}</span></div>
        </div>
      </template>
      <template #cell-groups="{ row }"><div class="flex max-w-56 gap-1" :title="groupNames(row.group_ids, row.groups)"><SBadge v-for="group in groupTags(row).slice(0, 2)" :key="group.id" tone="gray" class="max-w-40 truncate">{{ group.name }}</SBadge><SBadge v-if="groupTags(row).length > 2" tone="gray">+{{ groupTags(row).length - 2 }}</SBadge><SHint v-if="!row.group_ids?.length" size="xs">—</SHint></div></template>
      <template #cell-created_by="{ row }">
        <span v-if="row.created_by_email" class="text-xs" :title="row.created_by ? `#${row.created_by}` : ''">{{ row.created_by_email }}</span>
        <SHint v-else-if="row.created_by" inline size="xs">#{{ row.created_by }}</SHint>
        <SHint v-else inline>-</SHint>
      </template>
      <template #cell-status="{ row }">
        <SBadge :tone="statusOf(row).tone" dot :title="statusOf(row).detail" data-testid="account-status">{{ statusOf(row).label }}</SBadge>
        <SBadge v-if="row.auto_disable === false" tone="gray" class="ml-1" :title="t('accounts.editorUi.autoDisableHint')">{{ t('accounts.noAutoDisable') }}</SBadge>
        <SHint v-if="statusOf(row).note" size="xs" class="mt-0.5 block" data-testid="account-status-note">{{ statusOf(row).note }}</SHint>
        <SLink v-if="(row.status !== 'active' || row.status_reason || coolingDown(row)) && canResetStatus(row)" as="button" class="mt-1 inline-flex items-center gap-1 text-xs" :title="t('accounts.resetStatusHint')" data-testid="account-reset-status" @click="resetStatus(row)">
          <SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('accounts.resetStatus') }}
        </SLink>
      </template>
      <template v-for="field in (['priority', 'weight'] as const)" :key="field" #[`cell-${field}`]="{ row }">
        <AccountNumberCell :account="row" :field="field" :editable="canUpdate(row) && !row.orphaned" @saved="patchAccount(row.id, $event)" />
        <PluginSlot v-if="field === 'weight'" name="account.list.weight" :props="{ account: row }" item-class="mt-0.5" />
      </template>
      <template #cell-limits="{ row }">
        <AccountLimitsCell :account="row" />
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
            :disabled="togglingEnabled.has(row.id) || !accountControl(typeOf(row), 'schedulable').configurable"
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
    <AccountBulkEditDialog v-model:open="bulkEditOpen" :accounts="picked.edit" :type-of="typeOf" @saved="onBulkSaved" />
    <AccountBulkDeleteDialog v-model:open="bulkDeleteOpen" :accounts="picked.remove" :retention-of="retentionOf" @deleted="onBulkDeleted" />
    <AccountDeleteDialog v-model:open="deleteOpen" :account="deleteTarget" :retention-days="deleteRetentionDays" @deleted="list.reload" />

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
              <SDescItem v-for="fact in accountTypes.pluginFacts(detail.plugin_key, detail.type, detail.settings)" :key="fact.key" :label="fact.label" :data-testid="'account-detail-fact-' + fact.key">{{ fact.value }}</SDescItem>
              <SDescItem v-if="detailType" :label="t('platforms.supported')"><PlatformBadges :items="detailType.platforms" empty="—" /></SDescItem>
              <SDescItem :label="t('accounts.servesEndpoints')">
                <AccountTypeEndpoints v-if="detailType" :endpoints="detailType.endpoints" />
                <SHint v-else inline size="xs">{{ t('accounts.typeUnavailable') }}</SHint>
              </SDescItem>
              <SDescItem :label="t('common.status')">
                <SBadge :tone="statusOf(detail).tone" dot>{{ statusOf(detail).label }}</SBadge>
                <SHint v-if="statusOf(detail).note" inline size="xs" class="ml-2">{{ statusOf(detail).note }}</SHint>
                <SHint v-if="statusOf(detail).detail" inline size="xs" class="ml-2">{{ statusOf(detail).detail }}</SHint>
                <SLink v-if="coolingDown(detail) && canResetStatus(detail)" as="button" class="ml-2 text-xs" :title="t('accounts.resetStatusHint')" @click="resetStatus(detail)">{{ t('accounts.resetStatus') }}</SLink>
              </SDescItem>
              <SDescItem :label="t('accounts.groups')">{{ groupNames(detail.group_ids, detail.groups) }}</SDescItem>
              <SDescItem :label="t('accounts.priority')">{{ detail.priority }}</SDescItem>
              <SDescItem :label="t('accounts.weight')">{{ detail.weight ?? 1 }}</SDescItem>
              <SDescItem :label="t('accounts.listUi.limitsColumn')"><AccountLimitsTable :account="detail" class="max-w-xl" /></SDescItem>
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
