<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCode, SDropdown, SHint, SIcon, SInput, SLink, SModal, SPageHeader, SPagination, SSectionTitle, SSelect, SSwitch, STable, STabs, confirm, toast, type SelectOption, type TableColumn } from '@sub2api/ui'
import type { Account, AccountTestResult, AccountType } from '@/api/types'
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
import { sameCreationGroup } from './accountTypeChoices'
import AccountQuotaCell from './AccountQuotaCell.vue'
import { hasQuota, refreshAccountCredentials, resetAccountStatus, useQuotaRefresh } from './accountQuota'

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
  { key: 'name', label: t('accounts.listUi.identity') },
  { key: 'groups', label: t('accounts.groups') },
  ...(showOwner.value ? [{ key: 'created_by', label: t('accounts.createdBy') }] : []),
  { key: 'status', label: t('common.status') },
  { key: 'concurrency', label: t('accounts.scheduling') },
  { key: 'limits', label: t('accounts.limits') },
  // Only when a row of this page has plan windows (subscription accounts).
  ...(list.items.value.some((a) => hasQuota(a.quota)) ? [{ key: 'quota', label: t('accounts.quota.column') }] : []),
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
    ['rpm', a.rpm_limit],
    ['tpm', a.tpm_limit],
    ['tpd', a.tpd_limit],
    ['spm', a.spm_limit]
  ] as const
  for (const [key, limit] of pairs) {
    if (!limit) continue
    const used = a.rate_usage?.[key] ?? 0
    out.push({ key, label: key, text: `${abbrev(used)}/${abbrev(limit)}`, hit: used >= limit })
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

async function openEdit(a: Account) {
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
  // A new Claude Code (CCGateway) OAuth account still has to be authorized:
  // stay in the editor, now on the saved account, where the flow is shown.
  if (!editing.value && saved?.id && saved.plugin_key === 'ccgateway' && saved.type === 'managed') {
    toast(t('common.saved'), 'success')
    void openEdit(saved)
    return
  }
  editorOpen.value = false
}

// ---------------------------------------------------------------- test
const testOpen = ref(false)
const testing = ref(false)
const testTarget = ref<Account | null>(null)
const testModel = ref('')
const testResult = ref<AccountTestResult | null>(null)
const testError = ref('')

function openTest(a: Account) {
  testTarget.value = a
  testModel.value = ''
  testResult.value = null
  testError.value = ''
  testOpen.value = true
}

async function runTest() {
  if (!testTarget.value) return
  testing.value = true
  testResult.value = null
  testError.value = ''
  try {
    testResult.value = await api.post<AccountTestResult>(`/accounts/${testTarget.value.id}/test`, testModel.value ? { model: testModel.value } : {})
  } catch (e) {
    testError.value = errorMessage(e)
  } finally {
    testing.value = false
  }
}

/**
 * The upstream response snippet, re-indented when it parses as JSON. A snippet
 * is truncated at ~4 KiB, so parsing often fails — then it is shown verbatim.
 */
const testBody = computed(() => {
  const raw = testResult.value?.body
  if (!raw) return ''
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
})

async function copyTestBody() {
  if (testBody.value && (await copyText(testBody.value))) toast(t('common.copied'), 'success')
}

/** "input 123 · output 45" (+ cache read / creation when reported). */
const testUsage = computed(() => {
  const u = testResult.value?.usage
  if (!u) return ''
  const parts: string[] = []
  const pairs = [
    ['testUsageInput', u.input_tokens],
    ['testUsageOutput', u.output_tokens],
    ['testUsageCacheRead', u.cache_read_tokens],
    ['testUsageCacheWrite', u.cache_creation_tokens]
  ] as const
  for (const [key, v] of pairs) if (v != null) parts.push(`${t(`accounts.${key}`)} ${v}`)
  return parts.join(' · ')
})

/**
 * What the plugin *would* do to the account. The server never applies it for a
 * test, so the UI shows it as a diagnosis (see `accounts.testEffectNotApplied`).
 */
const testEffect = computed<{ tone: 'warning' | 'danger'; label: string } | null>(() => {
  const e = testResult.value?.effect
  if (!e) return null
  if (e === 'cooldown') return { tone: 'warning', label: t('accounts.testEffect.cooldown') }
  if (e === 'disable') return { tone: 'danger', label: t('accounts.testEffect.disable') }
  return { tone: 'warning', label: e }
})

/** Whether the summary block has anything below the status line. */
const testHasMeta = computed(() => {
  const r = testResult.value
  return !!(r && (r.model || r.upstream || r.message || r.reason || testUsage.value || testEffect.value))
})

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
      <SSwitch v-model="denseRows" :label="t('accounts.listUi.compact')" />
    </div>
    <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :dense="denseRows" :empty-text="t(filterCount ? 'accounts.listUi.emptyFiltered' : 'accounts.listUi.empty')">
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
      <template #cell-concurrency="{ row }">
        <div class="min-w-28 space-y-1.5 text-xs tabular-nums"><div class="flex justify-between gap-3"><span class="text-gray-400">{{ t('accounts.concurrency') }}</span><span :class="row.max_concurrency && (row.in_use || 0) >= row.max_concurrency ? 'font-semibold text-amber-600' : ''">{{ row.in_use ?? 0 }}/{{ row.max_concurrency || '∞' }}</span></div><div class="flex justify-between gap-3 text-[11px] text-gray-500"><span>{{ t('accounts.listUi.priorityWeight') }}</span><span>{{ row.priority }} / {{ row.weight ?? 1 }}</span></div></div>
      </template>
      <template #cell-limits="{ row }">
        <div v-if="limitsOf(row).length" class="flex flex-wrap gap-x-2 gap-y-0.5 text-xs tabular-nums">
          <span v-for="l in limitsOf(row)" :key="l.key" class="inline-flex whitespace-nowrap gap-1" :class="l.hit ? 'font-semibold text-amber-600' : ''">
            <SHint inline size="xs">{{ l.label }}</SHint> {{ l.text }}
          </span>
        </div>
        <SHint v-else inline>—</SHint>
      </template>
      <template #cell-quota="{ row }">
        <AccountQuotaCell v-if="hasQuota(row.quota)" :quota="row.quota" :refreshing="quotaRefresh.refreshing.has(row.id)" @refresh="quotaRefresh.refresh(row.id, row.quota)" />
        <!-- no plan limits (API keys): show nothing, not even the table's "—" fallback -->
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
        @cancel="editorOpen = false"
        @back="step = 1"
        @test="openTest"
      />
    </SModal>

    <!-- test -->
    <SModal v-model:open="testOpen" :title="`${t('accounts.testConnection')} · ${testTarget?.name || ''}`" width="xl">
      <div class="space-y-4">
        <div>
          <div class="flex gap-2">
            <SInput v-model="testModel" :placeholder="t('accounts.testModelPlaceholder')" @keydown.enter="runTest" />
            <SButton variant="primary" :loading="testing" @click="runTest">{{ t('common.test') }}</SButton>
          </div>
          <SHint size="xs" class="mt-1.5">{{ t('accounts.testModelHint') }}</SHint>
        </div>
        <template v-if="testResult">
          <div class="rounded-xl p-4 text-sm" :class="testResult.ok ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <SBadge :tone="testResult.ok ? 'success' : 'danger'" dot>{{ testResult.ok ? t('accounts.testOk') : t('accounts.testFailed') }}</SBadge>
              <span class="font-mono text-xs tabular-nums text-gray-700 dark:text-gray-200">HTTP {{ testResult.status }}</span>
              <SHint inline size="xs">{{ t('accounts.latency') }} {{ testResult.latency_ms }} ms</SHint>
            </div>
            <dl v-if="testHasMeta" class="kv mt-3">
              <template v-if="testResult.model">
                <dt>{{ t('accounts.testActualModel') }}</dt>
                <dd class="font-mono text-xs">{{ testResult.model }}</dd>
              </template>
              <template v-if="testResult.upstream">
                <dt>{{ t('accounts.testUpstream') }}</dt>
                <dd class="break-all font-mono text-xs">{{ testResult.upstream }}</dd>
              </template>
              <template v-if="testUsage">
                <dt>{{ t('accounts.testUsage') }}</dt>
                <dd class="tabular-nums">{{ testUsage }}</dd>
              </template>
              <template v-if="testResult.message">
                <dt>{{ t('accounts.message') }}</dt>
                <dd class="break-all">{{ testResult.message }}</dd>
              </template>
              <template v-if="testResult.reason">
                <dt>{{ t('accounts.testReason') }}</dt>
                <dd class="break-all">{{ testResult.reason }}</dd>
              </template>
              <template v-if="testEffect">
                <dt>{{ t('accounts.testEffectTitle') }}</dt>
                <dd>
                  <SBadge :tone="testEffect.tone">{{ testEffect.label }}</SBadge>
                  <SHint inline size="xs" class="ml-2">{{ t('accounts.testEffectNotApplied') }}</SHint>
                </dd>
              </template>
            </dl>
          </div>
          <div v-if="testBody">
            <SSectionTitle :title="t('accounts.testBody')">
              <template #actions>
                <SButton size="sm" @click="copyTestBody"><SIcon name="copy" class="h-4 w-4" />{{ t('common.copy') }}</SButton>
              </template>
            </SSectionTitle>
            <SCode class="max-h-80 overflow-y-auto">{{ testBody }}</SCode>
          </div>
          <SHint v-else size="xs">{{ t('accounts.testBodyEmpty') }}</SHint>
        </template>
        <SHint v-if="testError" tone="danger">{{ testError }}</SHint>
      </div>
    </SModal>

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
