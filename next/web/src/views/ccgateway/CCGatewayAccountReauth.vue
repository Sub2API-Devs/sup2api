<script setup lang="ts">
// Re-authorize in the existing account container. Cancelling only closes the login session.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SAlert, SButton, SCard, SDescItem, SDescriptions, SHint, toast } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import type { Account, CcgDraft, CcgRuntimeHealth, CcgRuntimeStatus, CcgSyncResult } from '@/api/types'
import BusyText from '@/components/BusyText.vue'
import CCGatewayAccountAuth from './CCGatewayAccountAuth.vue'
import CcgAuthHeader from './CcgAuthHeader.vue'
import CcgBlockedAlert from './CcgBlockedAlert.vue'
import CcgErrorAlert from './CcgErrorAlert.vue'
import CredentialStatusNotice from './CredentialStatusNotice.vue'
import { useCcgText, type CcgFailure } from './ccgError'
import { longCall } from './ccgApi'
import { isProxyReason, reasonOf } from './ccgAuthFlow'
import { accountSummary, commitRecovery, isRuntimeKey, readPendingReauth, rememberReauth, shouldCommit, type CcgFlowState } from './ccgReauth'

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
/** Runtime key of the in-place authorization. */
const reauthKey = ref<string | null>(null)
const flow = ref<CcgFlowState>({ key: null, authorized: false })
const flowEl = ref<InstanceType<typeof CCGatewayAccountAuth>>()
const starting = ref(false)
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

const discard = (_key: string) => flowEl.value?.cancelAuthorization()

async function askReauth() {
  if (canManage.value && !starting.value && !reauthKey.value) await begin()
}

/** POST reauthorize validates and returns the existing account runtime. */
async function begin() {
  if (!canManage.value || starting.value) return
  starting.value = true
  startError.value = null
  commitError.value = null
  try {
    const r = await api.post<CcgDraft>(`${base.value}/reauthorize`, { authorization_mode: 'fresh' }, longCall())
    if (!isRuntimeKey(r?.key)) throw new Error(t('ccgateway.accountAuth.badDraft'))
    if (!alive) {
      discard(r.key)
      return
    }
    setKey(r.key)
  } catch (e) {
    if (alive) startError.value = failureOf(e)
  } finally {
    starting.value = false
  }
}

/** Cancel the pending login, then recheck the same account runtime. */
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

/** A fresh login allows a previously refused commit to be retried. */
function onFlowAuthorized() {
  failedKey.value = null
  commitError.value = null
  void nextTick(commit)
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
    // The existing runtime has the refreshed login; clear the local flow.
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
      // The runtime changed: return to the button and recheck its identity.
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

/** Resume only if this tab's key still belongs to the account. */
async function resume() {
  const key = readPendingReauth(store, props.accountId)
  if (!key || !canManage.value) return
  const gone = await api.get<CcgRuntimeStatus & { key?: string }>(`${base.value}/status`).then(
    (current) => current.key !== key,
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
      <CcgBlockedAlert v-else-if="summary.container === 'blocked'" class="mt-1.5" :reason="status?.reason" :can-manage="canManage" :syncing="syncing" @sync="sync" />
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
        :reauth-account-id="accountId"
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
