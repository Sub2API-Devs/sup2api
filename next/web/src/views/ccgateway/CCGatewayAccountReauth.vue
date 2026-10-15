<script setup lang="ts">
// Credentials card of a saved Claude Code (CCGateway managed) account
// (docs/CCGATEWAY-REAUTH.md): the current runtime's state (container, Claude
// login) and "re-authorize". Re-authorizing never touches the running
// runtime: after a confirmation, POST accounts/:id/reauthorize opens a draft
// (an open one is returned again), the usual steps run on it
// (CCGatewayAccountAuth in reauth mode), and once the draft is signed in the
// operator explicitly confirms the switch. The account switches and its
// history (Claude login, sessions, quota snapshot, last test, error/cooldown)
// is cleared. Cancelling or closing the editor deletes the draft. The draft
// key is kept in sessionStorage so a page reload resumes it.
// `syncKey` changes when the saved account changes (proxy, status): the
// current container is synchronized again.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SAlert, SButton, SCard, SDescItem, SDescriptions, SHint, SSegmented, confirm, toast } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import type { Account, CcgDraft, CcgRuntimeHealth, CcgRuntimeStatus, CcgSyncResult } from '@/api/types'
import BusyText from '@/components/BusyText.vue'
import CCGatewayAccountAuth from './CCGatewayAccountAuth.vue'
import CcgAuthHeader from './CcgAuthHeader.vue'
import CcgBlockedAlert from './CcgBlockedAlert.vue'
import CcgErrorAlert from './CcgErrorAlert.vue'
import CredentialStatusNotice from './CredentialStatusNotice.vue'
import { useCcgText, type CcgFailure } from './ccgError'
import { DRAFTS, discardDraft, longCall } from './ccgApi'
import { isDraftKey, isProxyReason, reasonOf } from './ccgAuthFlow'
import { accountSummary, commitRecovery, readPendingReauth, rememberReauth, shouldCommit, type CcgFlowState } from './ccgReauth'

const props = defineProps<{ accountId: number; canEdit?: boolean; syncKey?: string }>()
const emit = defineEmits<{
  (e: 'fix-proxy'): void
  /** The re-authorization was committed: the account view the core returned. */
  (e: 'reauthorized', a: Account): void
}>()
const { t } = useI18n()
const auth = useAuthStore()
const { statusLabel, failureOf } = useCcgText()
const ACCOUNTS = '/system/ccgateway/accounts'
const POLL_MS = 2000
const store = typeof window !== 'undefined' ? window.sessionStorage : null

const canManage = computed(() => auth.has('settings:manage') || !!props.canEdit)
const canRead = computed(() => canManage.value || auth.has('settings:read'))
const base = computed(() => `${ACCOUNTS}/${props.accountId}`)

// ---------------------------------------------------------------- the current runtime
const status = ref<CcgRuntimeStatus | null>(null)
const health = ref<CcgRuntimeHealth | null>(null)
const loadError = ref<CcgFailure | null>(null)
const syncing = ref(false)
let serial = 0
let alive = true
let pollTimer: ReturnType<typeof setInterval> | undefined

const summary = computed(() => accountSummary(status.value?.status, health.value?.logged_in))
const LOGIN_BADGE = { authorized: 'authorized', notAuthorized: 'loggedOut', unknown: null } as const
const CONTAINER_TONE = { ready: 'success', preparing: 'muted', unknown: 'danger', blocked: 'danger', error: 'danger' } as const
const LOGIN_TONE = { authorized: 'success', notAuthorized: 'warning', unknown: 'muted' } as const

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
    if (stamp === serial && alive) loadError.value = failureOf(e)
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
    if (alive) loadError.value = failureOf(e)
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
const authorizationMode = ref<'migrate' | 'fresh'>('migrate')
const authorizationModes = computed(() => [{ value: 'migrate', label: t('ccgateway.reauth.migrate') }, { value: 'fresh', label: t('ccgateway.accountAuth.reauthorize') }])
const startError = ref<CcgFailure | null>(null)
const committing = ref(false)
const failedKey = ref<string | null>(null)
const commitError = ref<CcgFailure | null>(null)
const canSwitch = computed(() => shouldCommit({ key: reauthKey.value, flow: flow.value, committing: committing.value, failedKey: failedKey.value }))

function setKey(key: string | null) {
  reauthKey.value = key
  rememberReauth(store, props.accountId, key)
  flow.value = { key: null, authorized: false }
  failedKey.value = null
}

const discard = (key: string) => discardDraft(`${DRAFTS}/${key}`)

async function askReauth() {
  if (!canManage.value || starting.value || reauthKey.value) return
  const ok = await confirm({
    title: t('ccgateway.reauth.replaceTitle'),
    message: t(authorizationMode.value === 'migrate' ? 'ccgateway.reauth.migrateMessage' : 'ccgateway.reauth.freshMessage'),
    confirmText: t('ccgateway.reauth.prepare'),
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
    const r = await api.post<CcgDraft>(`${base.value}/reauthorize`, { authorization_mode: authorizationMode.value }, longCall())
    if (!isDraftKey(r?.key)) throw new Error(t('ccgateway.accountAuth.badDraft'))
    if (!alive) {
      discard(r.key)
      return
    }
    setKey(r.key)
  } catch (e) {
    if (alive) startError.value = failureOf(e)
    const failedDraft = (e as { details?: { draft_key?: unknown } })?.details?.draft_key
    if (typeof failedDraft === 'string' && isDraftKey(failedDraft)) discard(failedDraft)
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

/** A fresh login on the draft: a refused commit may be tried again by itself. */
function onFlowAuthorized() {
  failedKey.value = null
  commitError.value = null
}

async function commit() {
  if (!canSwitch.value) return
  const key = reauthKey.value
  if (!key) return
  committing.value = true
  commitError.value = null
  try {
    const a = await api.post<Account>(`${base.value}/reauthorize/${key}/commit`, {}, longCall())
    if (!alive) return
    // The account runs on the new runtime now: the draft is no longer ours to delete.
    setKey(null)
    toast(t('ccgateway.reauth.done'), 'success')
    status.value = null
    health.value = null
    await load()
    emit('reauthorized', a)
  } catch (e) {
    if (!alive || key !== reauthKey.value) return
    commitError.value = failureOf(e)
    const { reason } = commitError.value
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
  void commit()
}

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
  const gone = await api.get(`${DRAFTS}/${key}/status`).then(
    () => false,
    (e: unknown) => isApiError(e) && (e.status === 404 || reasonOf(e) === 'draft_not_found')
  )
  if (gone) rememberReauth(store, props.accountId, null)
  else if (alive && !reauthKey.value) reauthKey.value = key
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
    <CcgAuthHeader :title="t('ccgateway.accountAuth.title')" :state="LOGIN_BADGE[summary.login]" :badge-testid="summary.login === 'authorized' ? 'ccgateway-current-authorized' : 'ccgateway-current-logged-out'" />

    <SHint v-if="!canRead" tone="warning">{{ t('ccgateway.accountAuth.noRead') }}</SHint>
    <SHint v-else-if="!canManage" tone="warning">{{ t('ccgateway.accountAuth.readOnly') }}</SHint>

    <!-- current runtime -->
    <SCard v-if="canRead" variant="flat" class="space-y-1.5 text-xs" data-testid="ccgateway-current" :data-container="summary.container" :data-login="summary.login">
      <SDescriptions dense label-width="5rem">
        <SDescItem :label="t('ccgateway.reauth.container')">
          <BusyText v-if="!status && !loadError">{{ t('ccgateway.reauth.checking') }}</BusyText>
          <span v-else-if="status" class="inline-flex flex-wrap items-center gap-x-2">
            <span class="font-mono">{{ status.container || `#${accountId}` }}</span>
            <BusyText v-if="summary.container === 'preparing' || syncing">{{ statusLabel(status.status) }}</BusyText>
            <SHint v-else inline size="xs" :tone="CONTAINER_TONE[summary.container]">{{ statusLabel(status.status) }}</SHint>
          </span>
        </SDescItem>
        <SDescItem :label="t('ccgateway.reauth.login')">
          <SHint inline size="xs" :tone="LOGIN_TONE[summary.login]">{{ t(`ccgateway.reauth.loginState.${summary.login}`) }}</SHint>
        </SDescItem>
      </SDescriptions>
      <CredentialStatusNotice :status="health" />

      <CcgErrorAlert v-if="loadError" class="mt-1.5" :title="t('ccgateway.accountAuth.statusFailed')" :detail="loadError.detail" data-testid="ccgateway-current-error" :data-reason="loadError.reason">
        <template #actions>
          <SButton size="sm" icon="refresh" :loading="syncing" @click="canManage ? sync() : load()">{{ t('ccgateway.accountAuth.retry') }}</SButton>
        </template>
      </CcgErrorAlert>
      <CcgBlockedAlert v-else-if="summary.container === 'blocked'" class="mt-1.5" :reason="status?.reason" mode="saved" :can-manage="canManage" :syncing="syncing" @fix-proxy="emit('fix-proxy')" @sync="sync" />
      <SAlert v-else-if="summary.container === 'error'" tone="danger" dense class="mt-1.5">
        {{ t('ccgateway.accountAuth.containerError', { status: statusLabel(status?.status) }) }}
        <template v-if="canManage" #actions>
          <SButton size="sm" icon="refresh" :loading="syncing" @click="sync">{{ t('ccgateway.accountAuth.resync') }}</SButton>
        </template>
      </SAlert>
    </SCard>

    <!-- commit refused -->
    <CcgErrorAlert v-if="commitError" :title="t('ccgateway.reauth.commitFailed')" :detail="commitError.detail" data-testid="ccgateway-reauth-commit-error" :data-reason="commitError.reason">
      <template v-if="reauthKey && failedKey === reauthKey" #actions>
        <SButton size="sm" icon="refresh" :loading="committing" data-testid="ccgateway-reauth-commit-retry" @click="retryCommit">{{ t('ccgateway.reauth.commitRetry') }}</SButton>
      </template>
    </CcgErrorAlert>

    <!-- no re-authorization open -->
    <template v-if="!reauthKey">
      <div v-if="status?.current_image" class="space-y-1">
        <SDescriptions dense label-width="7rem">
          <SDescItem :label="t('ccgateway.reauth.currentImage')" :value="status.current_image" mono />
          <SDescItem :label="t('ccgateway.reauth.targetImage')" :value="status.target_image" mono />
        </SDescriptions>
        <SHint v-if="status.image_update_available" size="xs">{{ t('ccgateway.reauth.imageMismatch') }}</SHint>
      </div>
      <div v-if="canManage" class="flex flex-wrap items-center gap-2">
        <SSegmented :model-value="authorizationMode" :options="authorizationModes" size="sm" :aria-label="t('ccgateway.reauth.replaceTitle')" data-testid="ccgateway-reauth-mode" @update:model-value="authorizationMode = $event as 'migrate' | 'fresh'" />
        <SButton size="sm" icon="refresh" :variant="summary.login === 'notAuthorized' ? 'primary' : 'secondary'" :loading="starting" data-testid="ccgateway-reauth-start" @click="askReauth">{{ t('ccgateway.reauth.replaceTitle') }}</SButton>
      </div>
      <CcgErrorAlert v-if="startError" :title="t('ccgateway.reauth.startFailed')" :detail="startError.detail" data-testid="ccgateway-reauth-start-error" :data-reason="startError.reason">
        <template v-if="isProxyReason(startError.reason)" #actions>
          <SButton size="sm" variant="ghost" icon="proxy" @click="emit('fix-proxy')">{{ t('ccgateway.accountAuth.blocked.pickProxy') }}</SButton>
        </template>
      </CcgErrorAlert>
    </template>

    <!-- re-authorization in progress -->
    <div v-else class="space-y-3" data-testid="ccgateway-reauth-flow">
      <SAlert tone="primary" dense>
        {{ t('ccgateway.reauth.inProgress') }}
        <template #actions>
          <SButton size="sm" variant="ghost" :disabled="committing" data-testid="ccgateway-reauth-cancel" @click="cancelReauth">{{ t('ccgateway.reauth.cancel') }}</SButton>
        </template>
      </SAlert>
      <CCGatewayAccountAuth
        :key="reauthKey"
        ref="flowEl"
        :reauth-key="reauthKey"
        :can-edit="canEdit"
        @state="flow = $event"
        @authorized="onFlowAuthorized"
        @restart="restart"
        @fix-proxy="emit('fix-proxy')"
      />
      <BusyText v-if="committing" data-testid="ccgateway-reauth-committing">{{ t('ccgateway.reauth.committing') }}</BusyText>
      <SButton v-if="canSwitch" size="sm" data-testid="ccgateway-replace-commit" @click="commit">{{ t('ccgateway.reauth.switchNow') }}</SButton>
    </div>
  </div>
</template>
