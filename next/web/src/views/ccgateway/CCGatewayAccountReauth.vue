<script setup lang="ts">
// Credentials card of a saved Claude Code (CCGateway managed) account
// (docs/CCGATEWAY-REAUTH.md): the current runtime's state (container, Claude
// login) and "re-authorize". Re-authorizing never touches the running
// runtime: after a confirmation, POST accounts/:id/reauthorize opens a draft
// (an open one is returned again), the usual steps run on it
// (CCGatewayAccountAuth in reauth mode), and once the draft is signed in it is
// committed by itself — the account switches to the new login and all of its
// history (Claude login, sessions, quota snapshot, last test, error/cooldown)
// is cleared. Cancelling or closing the editor deletes the draft. The draft
// key is kept in sessionStorage so a page reload resumes it.
// `syncKey` changes when the saved account changes (proxy, status): the
// current container is synchronized again.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SButton, SHint, SIcon, SSpinner, confirm, toast } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import type { Account, CcgDraft, CcgRuntimeHealth, CcgRuntimeStatus, CcgSyncResult } from '@/api/types'
import CCGatewayAccountAuth from './CCGatewayAccountAuth.vue'
import { useCcgError } from './ccgError'
import { blockReason, isDraftKey, knownReason, knownStatus, reasonOf } from './ccgAuthFlow'
import { accountSummary, commitRecovery, readPendingReauth, rememberReauth, shouldCommit, type CcgFlowState } from './ccgReauth'

const props = defineProps<{ accountId: number; canEdit?: boolean; syncKey?: string }>()
const emit = defineEmits<{
  (e: 'fix-proxy'): void
  /** The re-authorization was committed: the account view the core returned. */
  (e: 'reauthorized', a: Account): void
}>()
const { t } = useI18n()
const auth = useAuthStore()
const describe = useCcgError()
const ACCOUNTS = '/system/ccgateway/accounts'
const DRAFTS = '/system/ccgateway/drafts'
const POLL_MS = 2000
const longCall = () => ({ signal: AbortSignal.timeout(95000) })
const store = typeof window !== 'undefined' ? window.sessionStorage : null

const canManage = computed(() => auth.has('settings:manage') || !!props.canEdit)
const canRead = computed(() => canManage.value || auth.has('settings:read'))
const base = computed(() => `${ACCOUNTS}/${props.accountId}`)

// ---------------------------------------------------------------- the current runtime
const status = ref<CcgRuntimeStatus | null>(null)
const health = ref<CcgRuntimeHealth | null>(null)
const loadError = ref<{ detail: string; reason: string } | null>(null)
const syncing = ref(false)
let serial = 0
let alive = true
let pollTimer: ReturnType<typeof setInterval> | undefined

const summary = computed(() => accountSummary(status.value?.status, health.value?.logged_in))
const blocked = computed(() => (summary.value.container === 'blocked' ? blockReason(status.value?.reason) : null))
const statusLabel = computed(() => {
  const s = status.value?.status
  const k = knownStatus(s)
  return k ? t(`ccgateway.status.${k}`) : s || t('ccgateway.status.unknown')
})
const blockedText = computed(() => {
  const r = status.value?.reason
  const k = knownReason(r)
  return k ? t(`ccgateway.reason.${k}`) : r || t('ccgateway.accountAuth.blockedUnknown')
})

async function load() {
  if (!canRead.value) return
  const stamp = ++serial
  try {
    const s = await api.get<CcgRuntimeStatus>(`${base.value}/status`)
    if (stamp !== serial) return
    status.value = s
    loadError.value = null
    if (accountSummary(s.status, null).container !== 'ready') {
      health.value = null
      return
    }
    const h = await api.get<CcgRuntimeHealth>(`${base.value}/health`)
    if (stamp === serial) health.value = h
  } catch (e) {
    if (stamp === serial && alive) loadError.value = { detail: describe(e), reason: reasonOf(e) }
  }
}

async function sync() {
  if (!canManage.value || syncing.value) return
  syncing.value = true
  loadError.value = null
  ++serial
  try {
    const r = await api.post<CcgSyncResult>(`${base.value}/sync`, {}, longCall())
    if (r?.status === 'blocked') {
      status.value = { status: 'blocked', container: status.value?.container, reason: r.reason }
      health.value = null
      return
    }
  } catch (e) {
    if (alive) loadError.value = { detail: describe(e), reason: reasonOf(e) }
    return
  } finally {
    syncing.value = false
  }
  await load()
}

/** Polls the current runtime while it converges. */
function tick() {
  if (!alive || document.hidden || syncing.value || loadError.value) return
  const c = summary.value.container
  if (c === 'preparing' || (c === 'ready' && !health.value)) void load()
}

// ---------------------------------------------------------------- re-authorization
/** The open re-authorization draft. */
const reauthKey = ref<string | null>(null)
const flow = ref<CcgFlowState>({ key: null, authorized: false })
const flowEl = ref<InstanceType<typeof CCGatewayAccountAuth>>()
const starting = ref(false)
const startError = ref<{ detail: string; reason: string } | null>(null)
const committing = ref(false)
const failedKey = ref<string | null>(null)
const commitError = ref<{ detail: string; reason: string } | null>(null)

function setKey(key: string | null) {
  reauthKey.value = key
  rememberReauth(store, props.accountId, key)
  flow.value = { key: null, authorized: false }
  failedKey.value = null
}

function discard(key: string) {
  void api.del(`${DRAFTS}/${key}`).catch(() => {
    // best effort: the core's sweep removes abandoned drafts
  })
}

async function askReauth() {
  if (!canManage.value || starting.value || reauthKey.value) return
  const ok = await confirm({
    title: t('ccgateway.reauth.confirmTitle'),
    message: t('ccgateway.reauth.confirmMessage'),
    confirmText: t('ccgateway.reauth.confirmButton'),
    danger: true
  })
  if (ok && alive) await begin()
}

/** POST reauthorize: a new draft, or the one already open for this account. */
async function begin() {
  if (!canManage.value || starting.value) return
  starting.value = true
  startError.value = null
  commitError.value = null
  try {
    const r = await api.post<CcgDraft>(`${base.value}/reauthorize`, {}, longCall())
    if (!isDraftKey(r?.key)) throw new Error(t('ccgateway.accountAuth.badDraft'))
    if (!alive) {
      discard(r.key)
      return
    }
    setKey(r.key)
  } catch (e) {
    if (alive) startError.value = { detail: describe(e), reason: reasonOf(e) }
  } finally {
    starting.value = false
  }
}

/**
 * The draft is broken (delete it) or gone (draft_not_found: not ours to delete any more, e.g. another
 * user took it over): ask for a re-authorization draft again — the user confirmed already.
 */
async function restart(reason = '') {
  const key = reauthKey.value
  setKey(null)
  if (key && reason !== 'draft_not_found') discard(key)
  await begin()
}

function cancelReauth() {
  const key = reauthKey.value
  if (!key || committing.value) return
  setKey(null)
  commitError.value = null
  discard(key)
}

function onFlowState(s: CcgFlowState) {
  flow.value = s
}

/** A fresh login on the draft: a refused commit may be tried again by itself. */
function onFlowAuthorized() {
  failedKey.value = null
  commitError.value = null
}

async function commit() {
  const key = reauthKey.value
  if (!key) return
  committing.value = true
  commitError.value = null
  try {
    const a = await api.post<Account>(`${base.value}/reauthorize/${key}/commit`, {}, longCall())
    if (!alive) return
    // The account runs on the new runtime now: the draft is no longer ours to delete.
    reauthKey.value = null
    rememberReauth(store, props.accountId, null)
    flow.value = { key: null, authorized: false }
    toast(t('ccgateway.reauth.done'), 'success')
    status.value = null
    health.value = null
    await load()
    emit('reauthorized', a)
  } catch (e) {
    if (!alive || key !== reauthKey.value) return
    const reason = reasonOf(e)
    commitError.value = { detail: describe(e), reason }
    const next = commitRecovery(reason)
    if (next === 'restart') {
      // The draft is gone: back to the button (a new login is needed).
      setKey(null)
    } else {
      failedKey.value = key
      if (next === 'recheck') flowEl.value?.rejected(reason)
    }
  } finally {
    committing.value = false
  }
}

function retryCommit() {
  failedKey.value = null
}

watch(
  () => shouldCommit({ key: reauthKey.value, flow: flow.value, committing: committing.value, failedKey: failedKey.value }),
  (go) => {
    if (go) void commit()
  }
)
watch(
  () => props.syncKey,
  (cur, before) => {
    if (before === undefined || cur === before) return
    void (canManage.value ? sync() : load())
  }
)

/** Resumes the re-authorization this tab left open (page reload), unless its draft is gone. */
async function resume() {
  const key = readPendingReauth(store, props.accountId)
  if (!key || !canManage.value) return
  try {
    await api.get(`${DRAFTS}/${key}/status`)
  } catch (e) {
    if (isApiError(e) && (e.status === 404 || reasonOf(e) === 'draft_not_found')) rememberReauth(store, props.accountId, null)
    else if (alive && !reauthKey.value) reauthKey.value = key
    return
  }
  if (alive && !reauthKey.value) reauthKey.value = key
}

onMounted(() => {
  void load()
  void resume()
  pollTimer = setInterval(tick, POLL_MS)
})
onBeforeUnmount(() => {
  alive = false
  ++serial
  clearInterval(pollTimer)
  // Editor closed: the re-authorization is abandoned (a commit in flight is left to finish).
  const key = reauthKey.value
  if (key && !committing.value) {
    rememberReauth(store, props.accountId, null)
    discard(key)
  }
})
</script>

<template>
  <div class="space-y-3 text-sm" data-testid="ccgateway-account-reauth" :data-reauth="reauthKey ? 'open' : 'none'">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
        <SIcon name="key" class="h-4 w-4 text-primary-500" />{{ t('ccgateway.accountAuth.title') }}
      </div>
      <span v-if="summary.login === 'authorized'" class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" data-testid="ccgateway-current-authorized">
        <SIcon name="check" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.authorized') }}
      </span>
      <span v-else-if="summary.login === 'notAuthorized'" class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" data-testid="ccgateway-current-logged-out">
        {{ t('ccgateway.accountAuth.loggedOut') }}
      </span>
    </div>

    <SHint v-if="!canRead" tone="warning">{{ t('ccgateway.accountAuth.noRead') }}</SHint>
    <SHint v-else-if="!canManage" tone="warning">{{ t('ccgateway.accountAuth.readOnly') }}</SHint>

    <!-- current runtime -->
    <div v-if="canRead" class="space-y-1.5 rounded-xl border border-gray-100 px-3.5 py-3 text-xs dark:border-dark-700" data-testid="ccgateway-current" :data-container="summary.container" :data-login="summary.login">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="w-20 shrink-0 text-gray-500 dark:text-dark-400">{{ t('ccgateway.reauth.container') }}</span>
        <span v-if="!status && !loadError" class="inline-flex items-center gap-1 text-gray-500 dark:text-dark-400"><SSpinner size="sm" />{{ t('ccgateway.reauth.checking') }}</span>
        <template v-else-if="status">
          <span class="font-mono text-gray-700 dark:text-dark-200">{{ status.container || `#${accountId}` }}</span>
          <span class="inline-flex items-center gap-1" :class="summary.container === 'ready' ? 'text-emerald-600 dark:text-emerald-400' : summary.container === 'preparing' ? 'text-gray-600 dark:text-dark-300' : 'text-red-600 dark:text-red-400'">
            <SSpinner v-if="summary.container === 'preparing' || syncing" size="sm" />{{ statusLabel }}
          </span>
        </template>
      </div>
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="w-20 shrink-0 text-gray-500 dark:text-dark-400">{{ t('ccgateway.reauth.login') }}</span>
        <span :class="summary.login === 'authorized' ? 'text-emerald-600 dark:text-emerald-400' : summary.login === 'notAuthorized' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-dark-400'">{{ t(`ccgateway.reauth.loginState.${summary.login}`) }}</span>
      </div>

      <div v-if="loadError" class="mt-1.5 space-y-2 rounded-lg bg-red-50 px-3 py-2 text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-current-error" :data-reason="loadError.reason">
        <div class="font-medium">{{ t('ccgateway.accountAuth.statusFailed') }}</div>
        <div v-if="loadError.detail" class="break-all opacity-80">{{ t('ccgateway.accountAuth.reason', { message: loadError.detail }) }}</div>
        <SButton size="sm" :loading="syncing" @click="canManage ? sync() : load()"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.retry') }}</SButton>
      </div>
      <div v-else-if="blocked" class="mt-1.5 space-y-2 rounded-lg bg-red-50 px-3 py-2 text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-auth-blocked" :data-reason="blocked">
        <div class="font-medium">{{ t('ccgateway.accountAuth.blockedTitle', { reason: blockedText }) }}</div>
        <div class="opacity-90">{{ t(`ccgateway.accountAuth.blocked.fix.${blocked}`) }}</div>
        <div class="flex flex-wrap gap-2">
          <SButton v-if="blocked === 'no_proxy' || blocked === 'proxy_disabled'" size="sm" variant="primary" data-testid="ccgateway-auth-fix-proxy" @click="emit('fix-proxy')">
            <SIcon name="proxy" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.blocked.pickProxy') }}
          </SButton>
          <SButton v-if="blocked === 'proxy_disabled'" size="sm" variant="ghost" to="/proxies">{{ t('ccgateway.accountAuth.blocked.openProxies') }}</SButton>
          <SButton v-if="canManage" size="sm" variant="ghost" :loading="syncing" @click="sync"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.resync') }}</SButton>
        </div>
      </div>
      <div v-else-if="summary.container === 'error'" class="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert">
        {{ t('ccgateway.accountAuth.containerError', { status: statusLabel }) }}
        <SButton v-if="canManage" size="sm" :loading="syncing" @click="sync"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.resync') }}</SButton>
      </div>
    </div>

    <!-- commit refused -->
    <div v-if="commitError" class="space-y-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-reauth-commit-error" :data-reason="commitError.reason">
      <div class="font-medium">{{ t('ccgateway.reauth.commitFailed') }}</div>
      <div v-if="commitError.detail" class="break-all opacity-80">{{ t('ccgateway.accountAuth.reason', { message: commitError.detail }) }}</div>
      <SButton v-if="reauthKey && failedKey === reauthKey" size="sm" :loading="committing" data-testid="ccgateway-reauth-commit-retry" @click="retryCommit"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.reauth.commitRetry') }}</SButton>
    </div>

    <!-- no re-authorization open -->
    <template v-if="!reauthKey">
      <div v-if="canManage" class="space-y-2">
        <p class="text-xs text-gray-600 dark:text-dark-300" data-testid="ccgateway-reauth-hint">{{ summary.login === 'notAuthorized' ? t('ccgateway.reauth.hintLoggedOut') : t('ccgateway.reauth.hint') }}</p>
        <SButton size="sm" :variant="summary.login === 'notAuthorized' ? 'primary' : 'secondary'" :loading="starting" data-testid="ccgateway-reauth-start" @click="askReauth">
          <SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.reauthorize') }}
        </SButton>
      </div>
      <div v-if="startError" class="space-y-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-reauth-start-error" :data-reason="startError.reason">
        <div class="font-medium">{{ t('ccgateway.reauth.startFailed') }}</div>
        <div v-if="startError.detail" class="break-all opacity-80">{{ t('ccgateway.accountAuth.reason', { message: startError.detail }) }}</div>
        <SButton v-if="startError.reason === 'no_proxy' || startError.reason === 'proxy_disabled' || startError.reason === 'proxy_not_found'" size="sm" variant="ghost" @click="emit('fix-proxy')"><SIcon name="proxy" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.blocked.pickProxy') }}</SButton>
      </div>
    </template>

    <!-- re-authorization in progress -->
    <div v-else class="space-y-3 rounded-xl border border-primary-100 bg-primary-50/40 px-3.5 py-3 dark:border-primary-900/40 dark:bg-primary-900/10" data-testid="ccgateway-reauth-flow">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <p class="min-w-0 flex-1 text-xs text-gray-600 dark:text-dark-300">{{ t('ccgateway.reauth.inProgress') }}</p>
        <SButton size="sm" variant="ghost" :disabled="committing" data-testid="ccgateway-reauth-cancel" @click="cancelReauth">{{ t('ccgateway.reauth.cancel') }}</SButton>
      </div>
      <CCGatewayAccountAuth
        :key="reauthKey"
        ref="flowEl"
        :reauth-key="reauthKey"
        :can-edit="canEdit"
        @state="onFlowState"
        @authorized="onFlowAuthorized"
        @restart="restart"
        @fix-proxy="emit('fix-proxy')"
      />
      <div v-if="committing" class="flex items-center gap-2 text-xs text-gray-600 dark:text-dark-300" data-testid="ccgateway-reauth-committing"><SSpinner size="sm" />{{ t('ccgateway.reauth.committing') }}</div>
    </div>
  </div>
</template>
