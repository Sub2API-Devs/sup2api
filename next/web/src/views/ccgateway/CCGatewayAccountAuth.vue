<script setup lang="ts">
// Claude authorization of a Claude Code (CCGateway) managed account on a draft
// runtime, shown in the account editor (docs/CCGATEWAY-DRAFT-RUNTIMES.md §5,
// docs/CCGATEWAY-REAUTH.md). Same steps and state machine (./ccgAuthFlow) for
// two cases:
//
// - `draft` (new account): ① a proxy is picked in the editor → ② "start the
//   container" creates a draft runtime (POST /system/ccgateway/drafts) → ③
//   the Claude link is requested by itself once the container is ready → ④
//   the code (code#state) is pasted back → authorized. The editor saves only
//   then, sending the draft key (`ccgateway_runtime`) and calling adopt().
//   A proxy change calls PUT drafts/:key; unmounting (editor closed, account
//   type switched) deletes a draft that was not adopted (best effort, the
//   core's sweep removes the rest).
// - `reauthKey` (saved account, see CCGatewayAccountReauth): the
//   re-authorization draft exists already, ② → ③ → ④ run on it; the parent
//   owns the draft (commits or deletes it), `restart` asks it for a new one.
//
// While a draft is shown it is touched every minute so the core's sweep does
// not take it while the user is busy elsewhere. Every state and error is a
// code (status / details.reason) translated via ccgateway.status.* and
// ccgateway.reason.*; an unknown reason shows the API's English message.
// `canEdit`: the caller may edit this account (account:update / own:update).
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SButton, SHint, SIcon, SInput, SSpinner, toast } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import type { CcgAuthSession, CcgDraft, CcgRuntimeHealth, CcgRuntimeStatus, CcgSyncResult } from '@/api/types'
import { useProxiesLookup } from '@/composables/lookups'
import { ACCOUNT_KEYS } from '@/composables/useOwnership'
import { isTrustedAuthorizationURL, sessionExpired } from './validation'
import { useCcgError } from './ccgError'
import {
  blockReason,
  containerPhase,
  currentStep,
  isDraftKey,
  knownReason,
  knownStatus,
  looksLikeAuthCode,
  readyToSave,
  reasonOf,
  secondsLeft,
  sessionEnded,
  setupProblems,
  stepStates,
  stepsOf,
  type CcgMode,
  type CcgSetupProblem,
  type CcgStep
} from './ccgAuthFlow'

const props = defineProps<{ draft?: boolean; reauthKey?: string | null; proxyId?: number | null; canEdit?: boolean }>()
const emit = defineEmits<{
  (e: 'state', s: { key: string | null; authorized: boolean }): void
  (e: 'authorized'): void
  (e: 'fix-proxy'): void
  /** Re-authorization: the draft is gone (reason draft_not_found) or broken, the parent starts a new one. */
  (e: 'restart', reason: string): void
}>()
const { t } = useI18n()
const auth = useAuthStore()
const { proxies } = useProxiesLookup()
const DRAFTS = '/system/ccgateway/drafts'
const POLL_MS = 2000
/** Draft keep-alive: the core sweeps drafts untouched for 15 minutes. */
const HEARTBEAT_MS = 60_000
/** Container calls may wait for an image pull or the login process. */
const longCall = () => ({ signal: AbortSignal.timeout(95000) })

type Status = CcgRuntimeStatus
type Health = CcgRuntimeHealth
type Session = CcgAuthSession

/** A re-authorization of a saved account (the draft is given); otherwise a new account's draft. */
const reauth = computed(() => !props.draft && isDraftKey(props.reauthKey))
const mode = computed<CcgMode>(() => (reauth.value ? 'reauth' : 'draft'))
const canManage = computed(() => auth.has('settings:manage') || (reauth.value ? !!props.canEdit : auth.has([...ACCOUNT_KEYS.create])))
const canRead = canManage

/** New account: draft key once created, and the proxy the draft runs with. */
const draftKey = ref<string | null>(null)
const draftProxy = ref<number | null>(null)
/** The draft shown: the new account's, or the re-authorization's. */
const key = computed(() => (reauth.value ? props.reauthKey! : draftKey.value))
/** Base path of the draft runtime, '' while there is none. */
const target = computed(() => (key.value ? `${DRAFTS}/${key.value}` : ''))

const status = ref<Status | null>(null)
const health = ref<Health | null>(null)
const session = ref<Session | null>(null)
const opened = ref(false)
const code = ref('')
/** Which action runs: drives the spinners and disables the buttons. */
const busy = ref<'' | 'create' | 'proxy' | 'sync' | 'status' | 'start' | 'complete' | 'cancel'>('')
/** A user action runs (the background status poll does not count). */
const acting = computed(() => !!busy.value && busy.value !== 'status')
/** The failed step: generic title, the translated cause and (container step) the setup problems found. */
const failure = ref<{ step: CcgStep; title: string; detail?: string; reason?: string; setup?: CcgSetupProblem[] } | null>(null)
/** The link was requested automatically once for this draft. */
let autoStarted = false
/** GET .../session was asked once for this runtime (resumes an unfinished authorization). */
let sessionChecked = false
/** The account was saved with this draft: it is not deleted any more. */
let adopted = false
let alive = true
let serial = 0
let lastCall = 0
let pollTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
const now = ref(Date.now())

const phase = computed(() => containerPhase(status.value?.status))
const blocked = computed(() => (phase.value === 'blocked' ? blockReason(status.value?.reason) : null))
const flow = computed(() => ({
  mode: mode.value,
  proxy: reauth.value || props.proxyId != null,
  created: !!target.value,
  container: failure.value?.step === 'container' ? ('error' as const) : phase.value,
  loggedIn: health.value ? health.value.logged_in : null,
  hasSession: !!session.value,
  opened: opened.value,
  errorStep: failure.value?.step ?? null
}))
const steps = computed(() => stepsOf(mode.value))
const step = computed(() => currentStep(flow.value))
const states = computed(() => stepStates(flow.value))
const authorizedDraft = computed(() => readyToSave(flow.value))
const containerName = computed(() => status.value?.container || (key.value ? `ccg-${key.value}` : ''))
const proxyName = computed(() => {
  const id = props.proxyId
  if (id == null) return ''
  return proxies.value.find((p) => p.id === id)?.name || `#${id}`
})
const left = computed(() => (session.value ? secondsLeft(session.value.expires_at, now.value) : 0))
const expired = computed(() => !!session.value && left.value <= 0)
const leftText = computed(() => {
  const s = left.value
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`
})
const codeShapeWarn = computed(() => !!code.value.trim() && !looksLikeAuthCode(code.value))

/** Translated status label; an unknown status shows its code. */
const statusLabel = (s: string | undefined) => {
  const k = knownStatus(s)
  return k ? t(`ccgateway.status.${k}`) : s || t('ccgateway.status.unknown')
}
/** Why the container is blocked, translated (unknown codes as they are). */
const blockedText = computed(() => {
  const r = status.value?.reason
  const k = knownReason(r)
  return k ? t(`ccgateway.reason.${k}`) : r || t('ccgateway.accountAuth.blockedUnknown')
})

/** The cause of a failure: a translated reason code, else the API's message for an unknown code, else a localized generic. */
const describe = useCcgError()

function fail(stepKey: CcgStep, titleKey: string, e?: unknown, setup?: CcgSetupProblem[]) {
  failure.value = { step: stepKey, title: t(`ccgateway.accountAuth.${titleKey}`), detail: e === undefined ? undefined : describe(e), reason: reasonOf(e) || undefined, setup }
}

/** Container failures: tell "not set up" (link to the settings) apart from a runtime error. */
async function containerFailure(titleKey: string, e: unknown, stamp: number) {
  if (isApiError(e) && e.status === 403) {
    fail('container', reauth.value ? 'readOnly' : 'noCreate', e)
    return
  }
  const reason = reasonOf(e)
  let setup: CcgSetupProblem[] = []
  if (!reason || reason === 'not_configured') {
    try {
      setup = setupProblems(await api.get<{ account_runtimes?: boolean; mode?: string; has_admin_key?: boolean }>('/system/ccgateway/remote-config'))
    } catch {
      // the settings are unreadable too: keep the generic message
    }
  }
  if (stamp === serial && alive) fail('container', titleKey, e, setup)
}

/** Reads container status and, when ready, the Claude login state. */
async function refresh(): Promise<void> {
  const base = target.value
  if (!base || !canRead.value) return
  const stamp = ++serial
  lastCall = Date.now()
  let s: Status
  try {
    s = await api.get<Status>(`${base}/status`)
  } catch (e) {
    if (stamp === serial) await containerFailure('statusFailed', e, stamp)
    return
  }
  if (stamp !== serial) return
  status.value = s
  if (failure.value?.step === 'container') failure.value = null
  if (containerPhase(s.status) !== 'ready') {
    health.value = null
    return
  }
  try {
    const h = await api.get<Health>(`${base}/health`)
    if (stamp !== serial) return
    health.value = h
  } catch (e) {
    if (stamp === serial) fail('container', 'healthFailed', e)
    return
  }
  if (!sessionChecked && !session.value) {
    sessionChecked = true
    await resumeSession(base, stamp)
  }
  maybeAutoStart()
}

/** Resumes an unfinished authorization session (link + code box) after a reload. */
async function resumeSession(base: string, stamp: number) {
  try {
    const s = await api.get<Session | null>(`${base}/session`)
    if (stamp !== serial || !s?.session_id || !isTrustedAuthorizationURL(s.url) || sessionExpired(s.expires_at)) return
    session.value = s
    // The link was most likely opened already: show the code box too.
    opened.value = true
  } catch {
    // nothing to resume
  }
}

/** Replaces the shown session with the one the container holds now; false when there is none. */
async function adoptPendingSession(base: string): Promise<boolean> {
  try {
    const s = await api.get<Session | null>(`${base}/session`)
    if (base !== target.value || !s?.session_id || !isTrustedAuthorizationURL(s.url) || sessionExpired(s.expires_at)) return false
    if (s.session_id === session.value?.session_id) return false
    session.value = s
    opened.value = true
    return true
  } catch {
    return false
  }
}

/** The link is requested as soon as the draft's container is ready (once per draft). */
function maybeAutoStart() {
  if (autoStarted || !canManage.value) return
  if (phase.value !== 'ready' || health.value?.logged_in !== false || session.value || acting.value) return
  autoStarted = true
  void start()
}

/** Forgets everything about the current runtime (not the draft key itself). */
function resetTarget() {
  ++serial
  status.value = null
  health.value = null
  session.value = null
  code.value = ''
  opened.value = false
  failure.value = null
  autoStarted = false
  sessionChecked = false
}

function discard(key: string) {
  void api.del(`${DRAFTS}/${key}`).catch(() => {
    // best effort: the core's sweep removes abandoned drafts
  })
}

/** ② of a new account: creates the draft runtime with the picked proxy. */
async function createDraft() {
  if (!props.draft || draftKey.value || props.proxyId == null || !canManage.value || acting.value) return
  const proxy = props.proxyId
  resetTarget()
  busy.value = 'create'
  const stamp = serial
  let key = ''
  try {
    const r = await api.post<CcgDraft>(DRAFTS, { proxy_id: proxy }, longCall())
    if (!isDraftKey(r?.key)) throw new Error(t('ccgateway.accountAuth.badDraft'))
    key = r.key
  } catch (e) {
    busy.value = ''
    if (alive && stamp === serial) await containerFailure('createFailed', e, stamp)
    return
  }
  busy.value = ''
  if (!alive || adopted) {
    discard(key)
    return
  }
  draftKey.value = key
  draftProxy.value = proxy
  status.value = { status: 'creating' }
  await refresh()
}

/** The editor's proxy changed after the draft exists: PUT drafts/:key (re-reconciles the container). */
async function updateProxy() {
  const key = draftKey.value
  const p = props.proxyId
  if (!props.draft || !key || p == null || p === draftProxy.value || acting.value || !canManage.value) return
  busy.value = 'proxy'
  failure.value = null
  health.value = null
  const stamp = ++serial
  try {
    await api.put(`${DRAFTS}/${key}`, { proxy_id: p }, longCall())
  } catch (e) {
    busy.value = ''
    if (alive && stamp === serial && key === draftKey.value) await containerFailure('proxyFailed', e, stamp)
    return
  }
  busy.value = ''
  if (!alive || key !== draftKey.value) return
  draftProxy.value = p
  status.value = { status: 'pending', container: status.value?.container }
  await refresh()
}

/** Deletes the draft and starts a new one (failed container, or the draft is gone); a re-authorization asks its parent. */
async function restartDraft() {
  if (acting.value) return
  if (reauth.value) {
    emit('restart', failure.value?.reason || '')
    return
  }
  if (!props.draft) return
  const key = draftKey.value
  resetTarget()
  draftKey.value = null
  draftProxy.value = null
  if (key) discard(key)
  await createDraft()
}

async function sync() {
  const base = target.value
  if (!base || !canManage.value || acting.value) return
  busy.value = 'sync'
  failure.value = null
  const stamp = ++serial
  lastCall = Date.now()
  let r: CcgSyncResult | null = null
  try {
    r = await api.post<CcgSyncResult>(`${base}/sync`, {}, longCall())
  } catch (e) {
    busy.value = ''
    if (stamp === serial) await containerFailure('syncFailed', e, stamp)
    return
  }
  busy.value = ''
  if (stamp !== serial) return
  // "blocked" is final until the account / draft changes; anything else: the status poll decides
  // (on several nodes another node may be the one doing the work).
  if (r?.status === 'blocked') {
    status.value = { status: 'blocked', container: status.value?.container, reason: r.reason }
    health.value = null
    return
  }
  await refresh()
}

async function start() {
  const base = target.value
  if (!base || !canManage.value || acting.value) return
  busy.value = 'start'
  failure.value = null
  lastCall = Date.now()
  try {
    const data = await api.post<Session>(`${base}/start`, {}, longCall())
    if (!data?.session_id || !isTrustedAuthorizationURL(data.url) || sessionExpired(data.expires_at)) throw new Error(t('ccgateway.accountAuth.badSession'))
    if (base !== target.value) return
    session.value = data
    opened.value = false
    code.value = ''
  } catch (e) {
    if (base === target.value) fail('login', 'startFailed', e)
  } finally {
    busy.value = ''
  }
}

async function complete() {
  const base = target.value
  if (!base || !session.value || !canManage.value || acting.value || !code.value.trim()) return
  if (expired.value) {
    fail('code', 'expired')
    return
  }
  busy.value = 'complete'
  failure.value = null
  lastCall = Date.now()
  try {
    await api.post(`${base}/complete`, { session_id: session.value.session_id, code: code.value.trim() }, longCall())
  } catch (e) {
    busy.value = ''
    if (base !== target.value) return
    const reason = reasonOf(e)
    // session_not_found also answers a stale session id while another login is pending: pick that one up.
    if (reason === 'session_not_found' && (await adoptPendingSession(base))) {
      fail('code', 'completeFailed', e)
      return
    }
    if (sessionEnded(reason)) {
      // The container ended (or never knew) this login: a new link is needed.
      session.value = null
      code.value = ''
      opened.value = false
      fail('login', 'completeFailed', e)
    } else {
      fail('code', 'completeFailed', e)
    }
    return
  }
  // The container writes the credentials asynchronously: confirm the login.
  let loggedIn = false
  for (let i = 0; i < 6 && !loggedIn && alive; i++) {
    if (i) await new Promise((ok) => setTimeout(ok, POLL_MS))
    try {
      const h = await api.get<Health>(`${base}/health`)
      if (base !== target.value) break
      health.value = h
      loggedIn = !!h.logged_in
    } catch {
      // retried below
    }
  }
  busy.value = ''
  if (!alive || base !== target.value) return
  if (!loggedIn) {
    fail('code', 'notConfirmed')
    return
  }
  session.value = null
  code.value = ''
  opened.value = false
  // A re-authorization is announced once committed (by the parent).
  if (!reauth.value) toast(t('ccgateway.accountAuth.authorizedToast'), 'success')
  emit('authorized')
}

async function cancel() {
  const base = target.value
  const s = session.value
  session.value = null
  code.value = ''
  opened.value = false
  failure.value = null
  if (!base || !s || sessionExpired(s.expires_at)) return
  busy.value = 'cancel'
  try {
    await api.post(`${base}/cancel`, { session_id: s.session_id })
  } catch {
    // the session expires by itself
  } finally {
    busy.value = ''
  }
}

/** Retry of the failed step. */
function retry() {
  const f = failure.value
  if (!f) return
  if (f.step === 'container') {
    if ((props.draft && !draftKey.value) || f.reason === 'draft_not_found') void restartDraft()
    else if (props.draft && props.proxyId != null && props.proxyId !== draftProxy.value) void updateProxy()
    else void (canManage.value ? sync() : refresh())
  } else if (f.step === 'login') void start()
  else if (f.step === 'code') void (expired.value || !session.value ? start() : complete())
}

function tick() {
  if (!alive || document.hidden) return
  // A proxy picked while another action ran is applied once it is done.
  if (props.draft && draftKey.value && !acting.value && !failure.value && props.proxyId != null && props.proxyId !== draftProxy.value) {
    void updateProxy()
    return
  }
  if (!target.value || busy.value) return
  // Poll while the container converges (a known login state does not change by
  // itself, a blocked container waits for a change), and keep a draft alive.
  const converging = !session.value && failure.value?.step !== 'container' && phase.value !== 'blocked' && (phase.value !== 'ready' || !health.value)
  const heartbeat = Date.now() - lastCall >= HEARTBEAT_MS
  if (converging || heartbeat) {
    busy.value = 'status'
    void refresh().finally(() => {
      if (busy.value === 'status') busy.value = ''
    })
  }
}

async function boot() {
  resetTarget()
  if (reauth.value) await refresh()
}

watch(() => props.reauthKey, () => void boot())
watch(() => props.proxyId, () => {
  // Creating the draft failed (e.g. the proxy was refused): another proxy starts over from the button.
  if (props.draft && !draftKey.value && failure.value?.step === 'container' && !acting.value) failure.value = null
  void updateProxy()
})
watch([key, authorizedDraft], () => emit('state', { key: key.value, authorized: !!key.value && authorizedDraft.value }), { immediate: true })

onMounted(() => {
  void boot()
  pollTimer = setInterval(tick, POLL_MS)
  clockTimer = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => {
  alive = false
  ++serial
  clearInterval(pollTimer)
  clearInterval(clockTimer)
  code.value = ''
  session.value = null
  // Editor closed, account type switched, back to the type picker: the entry is abandoned.
  // (A re-authorization draft belongs to the parent, which deletes or commits it.)
  if (props.draft && draftKey.value && !adopted) discard(draftKey.value)
})

defineExpose({
  /** The account was saved with this draft: keep its runtime. */
  adopt() {
    adopted = true
  },
  /** POST /accounts (or the re-authorization commit) refused the draft (details.reason): start over or re-check the login. */
  rejected(reason: string) {
    if (!key.value) return
    if (reason === 'draft_not_found' && props.draft) {
      resetTarget()
      draftKey.value = null
      draftProxy.value = null
      failure.value = { step: 'container', title: t('ccgateway.accountAuth.createFailed'), detail: t('ccgateway.reason.draft_not_found'), reason }
    } else if (reason !== 'draft_not_found') {
      health.value = null
      void refresh()
    }
  }
})

const stepTitle = (s: CcgStep) => t(`ccgateway.accountAuth.steps.${s}`)
const stepNo = (s: CcgStep) => steps.value.indexOf(s) + 1
/** CCGateway settings, scrolled to the runtime card (install / upgrade the containers). */
const settingsLink = '/plugins/ccgateway?tab=settings#ccgateway-runtime'
</script>

<template>
  <div class="space-y-3 text-sm" data-testid="ccgateway-account-auth" :data-mode="mode">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
        <SIcon name="key" class="h-4 w-4 text-primary-500" />{{ reauth ? t('ccgateway.reauth.flowTitle') : t('ccgateway.accountAuth.title') }}
      </div>
      <span v-if="step === 'done'" class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" data-testid="ccgateway-auth-authorized">
        <SIcon name="check" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.authorized') }}
      </span>
      <span v-else-if="target && health && !health.logged_in" class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        {{ t('ccgateway.accountAuth.loggedOut') }}
      </span>
    </div>

    <SHint v-if="!canManage" tone="warning">{{ reauth ? t('ccgateway.accountAuth.readOnly') : t('ccgateway.accountAuth.noCreate') }}</SHint>

    <ol class="space-y-0" data-testid="ccgateway-auth-steps">
      <li v-for="(s, i) in steps" :key="s" class="relative flex gap-3 pb-4 last:pb-0" :data-step="s" :data-state="states[s]">
        <!-- rail -->
        <span v-if="i < steps.length - 1" class="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px" :class="states[s] === 'done' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-gray-200 dark:bg-dark-600'" aria-hidden="true" />
        <span
          class="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          :class="{
            'bg-emerald-500 text-white': states[s] === 'done',
            'bg-primary-500 text-white ring-4 ring-primary-100 dark:ring-primary-900/40': states[s] === 'current',
            'bg-red-500 text-white ring-4 ring-red-100 dark:ring-red-900/40': states[s] === 'error',
            'bg-gray-100 text-gray-400 dark:bg-dark-700 dark:text-dark-400': states[s] === 'todo'
          }"
        >
          <SIcon v-if="states[s] === 'done'" name="check" class="h-3.5 w-3.5" />
          <SIcon v-else-if="states[s] === 'error'" name="warning" class="h-3.5 w-3.5" />
          <template v-else>{{ stepNo(s) }}</template>
        </span>
        <div class="min-w-0 flex-1 pt-0.5">
          <div class="font-medium" :class="states[s] === 'todo' ? 'text-gray-400 dark:text-dark-400' : 'text-gray-900 dark:text-white'">{{ stepTitle(s) }}</div>

          <!-- ① proxy (new account) -->
          <template v-if="s === 'proxy'">
            <div v-if="states.proxy === 'current'" class="mt-1 space-y-2">
              <p class="text-xs text-gray-600 dark:text-dark-300" data-testid="ccgateway-proxy-hint">{{ t('ccgateway.accountAuth.proxyHint') }}</p>
              <SButton size="sm" variant="primary" data-testid="ccgateway-auth-pick-proxy" @click="emit('fix-proxy')"><SIcon name="proxy" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.blocked.pickProxy') }}</SButton>
            </div>
            <p v-else class="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-dark-400">
              <span>{{ t('ccgateway.accountAuth.proxyChosen', { name: proxyName }) }}</span>
              <span v-if="busy === 'proxy'" class="inline-flex items-center gap-1"><SSpinner size="sm" />{{ t('ccgateway.accountAuth.proxyUpdating') }}</span>
            </p>
          </template>

          <!-- ② container -->
          <template v-else-if="s === 'container' && (target || draft)">
            <div v-if="failure?.step === 'container'" class="mt-1.5 space-y-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-auth-container-error" :data-reason="failure.reason">
              <div class="font-medium">{{ failure.title }}</div>
              <ul v-if="failure.setup?.length" class="list-inside list-disc space-y-0.5">
                <li v-for="p in failure.setup" :key="p">{{ t(`ccgateway.accountAuth.setup.${p}`) }}</li>
              </ul>
              <div v-else-if="failure.detail" class="break-all opacity-80">{{ t('ccgateway.accountAuth.reason', { message: failure.detail }) }}</div>
              <div class="flex flex-wrap gap-2">
                <SButton size="sm" :loading="busy === 'sync' || busy === 'create' || busy === 'proxy'" :disabled="acting || !canManage" data-testid="ccgateway-auth-retry" @click="retry"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.retry') }}</SButton>
                <SButton v-if="failure.reason === 'no_proxy' || failure.reason === 'proxy_disabled' || failure.reason === 'proxy_not_found'" size="sm" variant="ghost" @click="emit('fix-proxy')"><SIcon name="proxy" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.blocked.pickProxy') }}</SButton>
                <SButton v-if="(draft && draftKey) || reauth" size="sm" variant="ghost" :disabled="acting" data-testid="ccgateway-auth-restart" @click="restartDraft">{{ t('ccgateway.accountAuth.restart') }}</SButton>
                <SButton v-if="failure.setup?.length || failure.reason === 'not_configured'" size="sm" variant="ghost" :to="settingsLink" data-testid="ccgateway-auth-open-settings"><SIcon name="settings" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.openSettings') }}</SButton>
              </div>
            </div>
            <!-- new account, no draft yet -->
            <template v-else-if="draft && !draftKey">
              <div v-if="busy === 'create'" class="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-dark-300"><SSpinner size="sm" />{{ t('ccgateway.accountAuth.creating') }}</div>
              <div v-else-if="states.container === 'current'" class="mt-1 space-y-2">
                <p class="text-xs text-gray-600 dark:text-dark-300">{{ t('ccgateway.accountAuth.startHint') }}</p>
                <SButton variant="primary" :disabled="acting || !canManage" data-testid="ccgateway-auth-create" @click="createDraft"><SIcon name="play" class="h-4 w-4" />{{ t('ccgateway.accountAuth.startContainer') }}</SButton>
              </div>
            </template>
            <div v-else-if="blocked" class="mt-1.5 space-y-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-auth-blocked" :data-reason="blocked">
              <div class="font-medium">{{ t('ccgateway.accountAuth.blockedTitle', { reason: blockedText }) }}</div>
              <div class="opacity-90">{{ reauth ? t(`ccgateway.accountAuth.blocked.fixReauth.${blocked}`) : blocked !== 'account_disabled' ? t(`ccgateway.accountAuth.blocked.fixDraft.${blocked}`) : t(`ccgateway.accountAuth.blocked.fix.${blocked}`) }}</div>
              <div class="flex flex-wrap gap-2">
                <SButton v-if="blocked === 'no_proxy' || blocked === 'proxy_disabled'" size="sm" variant="primary" data-testid="ccgateway-auth-fix-proxy" @click="emit('fix-proxy')">
                  <SIcon name="proxy" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.blocked.pickProxy') }}
                </SButton>
                <SButton v-if="blocked === 'proxy_disabled'" size="sm" variant="ghost" to="/proxies">{{ t('ccgateway.accountAuth.blocked.openProxies') }}</SButton>
                <SButton v-if="canManage" size="sm" variant="ghost" :loading="busy === 'sync'" :disabled="acting" @click="sync"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.resync') }}</SButton>
              </div>
            </div>
            <div v-else-if="states.container === 'error'" class="mt-1.5 space-y-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert">
              <div>{{ t('ccgateway.accountAuth.containerError', { status: statusLabel(status?.status) }) }}</div>
              <div class="flex flex-wrap gap-2">
                <SButton v-if="canManage" size="sm" :loading="busy === 'sync'" @click="sync"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.resync') }}</SButton>
                <SButton size="sm" variant="ghost" :disabled="acting" @click="restartDraft">{{ t('ccgateway.accountAuth.restart') }}</SButton>
              </div>
            </div>
            <div v-else-if="states.container === 'current'" class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-dark-300" data-testid="ccgateway-auth-preparing">
              <SSpinner size="sm" />
              <span>{{ busy === 'sync' ? t('ccgateway.accountAuth.containerStarting') : t('ccgateway.accountAuth.containerPreparing', { name: containerName, status: statusLabel(status?.status) }) }}</span>
              <SButton v-if="canManage && busy !== 'sync' && busy !== 'proxy'" size="sm" variant="ghost" @click="sync">{{ t('ccgateway.accountAuth.resync') }}</SButton>
            </div>
            <p v-else-if="states.container === 'done'" class="mt-0.5 font-mono text-xs text-gray-500 dark:text-dark-400">{{ t('ccgateway.accountAuth.containerReady', { name: containerName }) }}</p>
          </template>

          <!-- ③ open the link -->
          <template v-else-if="s === 'login' && target && (states.login === 'current' || states.login === 'error' || failure?.step === 'login' || (states.login === 'done' && session))">
            <div v-if="failure?.step === 'login'" class="mt-1.5 space-y-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-auth-login-error" :data-reason="failure.reason">
              <div class="font-medium">{{ failure.title }}</div>
              <div v-if="failure.detail" class="break-all opacity-80">{{ t('ccgateway.accountAuth.reason', { message: failure.detail }) }}</div>
              <SButton size="sm" :loading="busy === 'start'" data-testid="ccgateway-auth-retry" @click="retry"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.regetLink') }}</SButton>
            </div>
            <div v-else-if="session" class="mt-2 space-y-2">
              <a
                :href="session.url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-primary btn-md"
                :class="expired ? 'pointer-events-none opacity-50' : ''"
                data-testid="ccgateway-auth-open"
                @click="opened = true"
              >
                <SIcon name="external" class="h-4 w-4" />{{ t('ccgateway.accountAuth.openLink') }}
              </a>
              <p class="text-xs text-gray-500 dark:text-dark-400">
                {{ t('ccgateway.accountAuth.linkHint') }}
                <span v-if="!expired" class="ml-1 tabular-nums">{{ t('ccgateway.accountAuth.expiresIn', { time: leftText }) }}</span>
              </p>
            </div>
            <div v-else-if="busy === 'start'" class="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-dark-300"><SSpinner size="sm" />{{ t('ccgateway.accountAuth.gettingLink') }}</div>
            <div v-else-if="canManage" class="mt-2">
              <SButton variant="primary" :disabled="acting" data-testid="ccgateway-auth-start" @click="start"><SIcon name="link" class="h-4 w-4" />{{ t('ccgateway.accountAuth.getLink') }}</SButton>
            </div>
          </template>

          <!-- ④ paste the code -->
          <template v-else-if="s === 'code' && target && session">
            <!-- not a <form>: the panel sits inside the account editor's form -->
            <div class="mt-2 space-y-2">
              <label class="input-label !mb-1 text-xs" for="ccg-auth-code">{{ t('ccgateway.accountAuth.codeLabel') }}</label>
              <div class="flex flex-wrap gap-2">
                <SInput
                  id="ccg-auth-code"
                  v-model="code"
                  type="password"
                  class="min-w-[14rem] flex-1"
                  mono
                  autocomplete="off"
                  spellcheck="false"
                  :disabled="busy === 'complete' || expired"
                  :placeholder="t('ccgateway.accountAuth.codePlaceholder')"
                  data-testid="ccgateway-auth-code"
                  @focus="opened = true"
                  @keydown.enter.prevent="complete"
                />
                <SButton variant="primary" :loading="busy === 'complete'" :disabled="!code.trim() || expired || (acting && busy !== 'complete')" data-testid="ccgateway-auth-complete" @click="complete">{{ t('ccgateway.accountAuth.submit') }}</SButton>
              </div>
              <p v-if="codeShapeWarn" class="text-xs text-amber-600 dark:text-amber-400">{{ t('ccgateway.accountAuth.codeShape') }}</p>
              <div v-if="failure?.step === 'code'" class="space-y-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-auth-code-error" :data-reason="failure.reason">
                <div class="font-medium">{{ failure.title }}</div>
                <div v-if="failure.detail" class="break-all opacity-80">{{ t('ccgateway.accountAuth.reason', { message: failure.detail }) }}</div>
                <div class="flex flex-wrap gap-2">
                  <SButton v-if="code.trim() && !expired" size="sm" :loading="busy === 'complete'" @click="retry"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.retry') }}</SButton>
                  <SButton size="sm" variant="ghost" :loading="busy === 'start'" @click="start">{{ t('ccgateway.accountAuth.regetLink') }}</SButton>
                </div>
              </div>
              <div v-else-if="expired" class="flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                {{ t('ccgateway.accountAuth.expired') }}
                <SButton size="sm" :loading="busy === 'start'" @click="start">{{ t('ccgateway.accountAuth.regetLink') }}</SButton>
              </div>
              <SButton size="sm" variant="ghost" :disabled="busy === 'complete'" @click="cancel">{{ t('ccgateway.accountAuth.cancel') }}</SButton>
            </div>
          </template>

          <!-- done -->
          <template v-else-if="s === 'done' && states.done === 'done'">
            <p class="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300" data-testid="ccgateway-auth-done-hint">{{ reauth ? t('ccgateway.reauth.signedIn') : t('ccgateway.accountAuth.authorizedDraftHint') }}</p>
          </template>
        </div>
      </li>
    </ol>
  </div>
</template>
