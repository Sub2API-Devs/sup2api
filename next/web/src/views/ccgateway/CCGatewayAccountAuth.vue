<script setup lang="ts">
// Claude authorization of one Claude Code (CCGateway) managed account, shown
// in the account editor. One container per account; the flow is a step list:
// ① save the account → ② start its container → ③ open the Claude link and
// sign in → ④ paste the code (code#state) back → done.
//
// `accountId` is null while the account is being created (only ① is shown).
// `autoStart`: the account was just saved by the editor: the container is
// synced at once, polled every 2 s, and the link is requested as soon as it is
// ready. Without it (editing), the state is shown and the user re-authorizes.
// An unfinished authorization session (GET .../session) is resumed on load.
// `canEdit`: the caller may edit this account (account:update / own:update);
// the per-account endpoints accept it as well as settings:manage.
// `syncKey` changes when the saved account changes (proxy, status): the
// container is synchronized again.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SButton, SHint, SIcon, SInput, SSpinner, toast } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/utils/errors'
import { isTrustedAuthorizationURL, sessionExpired } from './validation'
import { CCG_STEPS, blockReason, containerPhase, currentStep, looksLikeAuthCode, secondsLeft, setupProblems, stepStates, type CcgSetupProblem, type CcgStep } from './ccgAuthFlow'

const props = defineProps<{ accountId?: number | null; autoStart?: boolean; canEdit?: boolean; syncKey?: string }>()
const emit = defineEmits<{ (e: 'authorized'): void; (e: 'close'): void; (e: 'fix-proxy'): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const base = '/system/ccgateway/accounts'
const POLL_MS = 2000

interface Status { status: string; container?: string; reason?: string }
interface Health { healthy: boolean; logged_in: boolean }
interface Session { session_id: string; url: string; expires_at: string }

const canManage = computed(() => auth.has('settings:manage') || !!props.canEdit)
const canRead = computed(() => canManage.value || auth.has('settings:read'))

const status = ref<Status | null>(null)
const health = ref<Health | null>(null)
const session = ref<Session | null>(null)
const opened = ref(false)
const code = ref('')
/** Which action runs: drives the spinners and disables the buttons. */
const busy = ref<'' | 'sync' | 'status' | 'start' | 'complete' | 'cancel'>('')
/** A user action runs (the background status poll does not count). */
const acting = computed(() => !!busy.value && busy.value !== 'status')
/** The failed step, its message and (container step) the setup problems found. */
const failure = ref<{ step: CcgStep; message: string; detail?: string; setup?: CcgSetupProblem[] } | null>(null)
/** The link was requested automatically once (autoStart); later requests are the user's. */
let autoStarted = false
/** GET .../session was asked once for this account (resumes an unfinished authorization). */
let sessionChecked = false
let serial = 0
let pollTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
const now = ref(Date.now())

const phase = computed(() => containerPhase(status.value?.status))
const blocked = computed(() => (phase.value === 'blocked' ? blockReason(status.value?.reason) : null))
const flow = computed(() => ({
  saved: !!props.accountId,
  container: failure.value?.step === 'container' ? ('error' as const) : phase.value,
  loggedIn: health.value ? health.value.logged_in : null,
  hasSession: !!session.value,
  opened: opened.value,
  errorStep: failure.value?.step ?? null
}))
const step = computed(() => currentStep(flow.value))
const states = computed(() => stepStates(flow.value))
const containerName = computed(() => status.value?.container || (props.accountId ? `#${props.accountId}` : ''))
const left = computed(() => (session.value ? secondsLeft(session.value.expires_at, now.value) : 0))
const expired = computed(() => !!session.value && left.value <= 0)
const leftText = computed(() => {
  const s = left.value
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`
})
const codeShapeWarn = computed(() => !!code.value.trim() && !looksLikeAuthCode(code.value))

function fail(stepKey: CcgStep, message: string, e?: unknown, setup?: CcgSetupProblem[]) {
  failure.value = { step: stepKey, message, detail: e === undefined ? undefined : errorMessage(e), setup }
}

/** Container failures: tell "not set up" (link to the settings) apart from a runtime error. */
async function containerFailure(message: string, e: unknown, stamp: number) {
  if (isApiError(e) && e.status === 403) {
    fail('container', t('ccgateway.accountAuth.noRead'), e)
    return
  }
  let setup: CcgSetupProblem[] = []
  try {
    setup = setupProblems(await api.get<{ account_runtimes?: boolean; mode?: string; has_admin_key?: boolean }>('/system/ccgateway/remote-config'))
  } catch {
    // the settings are unreadable too: keep the generic message
  }
  if (stamp === serial) fail('container', message, e, setup)
}

/** Reads container status and, when ready, the Claude login state. */
async function refresh(): Promise<void> {
  const id = props.accountId
  if (!id || !canRead.value) return
  const stamp = ++serial
  let s: Status
  try {
    s = await api.get<Status>(`${base}/${id}/status`)
  } catch (e) {
    if (stamp === serial) await containerFailure(t('ccgateway.accountAuth.statusFailed'), e, stamp)
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
    const h = await api.get<Health>(`${base}/${id}/health`)
    if (stamp !== serial) return
    health.value = h
  } catch (e) {
    if (stamp === serial) fail('container', t('ccgateway.accountAuth.healthFailed'), e)
    return
  }
  if (!sessionChecked && !session.value) {
    sessionChecked = true
    await resumeSession(id, stamp)
  }
  maybeAutoStart()
}

/** Resumes an unfinished authorization session (link + code box) after a reload. */
async function resumeSession(id: number, stamp: number) {
  try {
    const s = await api.get<Session | null>(`${base}/${id}/session`)
    if (stamp !== serial || !s?.session_id || !isTrustedAuthorizationURL(s.url) || sessionExpired(s.expires_at)) return
    session.value = s
    // The link was most likely opened already: show the code box too.
    opened.value = true
  } catch {
    // older core without the endpoint, or nothing to resume
  }
}

function maybeAutoStart() {
  if (!props.autoStart || autoStarted || !canManage.value) return
  if (phase.value !== 'ready' || health.value?.logged_in !== false || session.value || acting.value) return
  autoStarted = true
  void start()
}

async function sync() {
  const id = props.accountId
  if (!id || !canManage.value || acting.value) return
  busy.value = 'sync'
  failure.value = null
  const stamp = ++serial
  let r: { synced?: boolean; status?: string; reason?: string } | null = null
  try {
    r = await api.post<{ synced?: boolean; status?: string; reason?: string }>(`${base}/${id}/sync`, {}, { signal: AbortSignal.timeout(95000) })
  } catch (e) {
    if (stamp === serial) await containerFailure(t('ccgateway.accountAuth.syncFailed'), e, stamp)
    busy.value = ''
    return
  }
  busy.value = ''
  if (stamp !== serial) return
  // "blocked" is final until the account changes; anything else: the status poll decides
  // (on several nodes another node may be the one doing the work).
  if (r?.status === 'blocked') {
    status.value = { status: 'blocked', container: status.value?.container, reason: r.reason }
    health.value = null
    return
  }
  await refresh()
}

async function start() {
  const id = props.accountId
  if (!id || !canManage.value || acting.value) return
  busy.value = 'start'
  failure.value = null
  try {
    const data = await api.post<Session>(`${base}/${id}/start`, {}, { signal: AbortSignal.timeout(95000) })
    if (!data?.session_id || !isTrustedAuthorizationURL(data.url) || sessionExpired(data.expires_at)) throw new Error(t('ccgateway.accountAuth.badSession'))
    session.value = data
    opened.value = false
    code.value = ''
  } catch (e) {
    if (isApiError(e) && e.status === 400) fail('login', errorMessage(e))
    else fail('login', t('ccgateway.accountAuth.startFailed'), e)
  } finally {
    busy.value = ''
  }
}

async function complete() {
  const id = props.accountId
  if (!id || !session.value || !canManage.value || acting.value || !code.value.trim()) return
  if (expired.value) {
    fail('code', t('ccgateway.accountAuth.expired'))
    return
  }
  busy.value = 'complete'
  failure.value = null
  try {
    await api.post(`${base}/${id}/complete`, { session_id: session.value.session_id, code: code.value.trim() }, { signal: AbortSignal.timeout(95000) })
  } catch (e) {
    // A 400 carries the container's own, user-facing reason (wrong code#state, ...): show it as is.
    if (isApiError(e) && e.status === 400) fail('code', errorMessage(e))
    else fail('code', t('ccgateway.accountAuth.completeFailed'), e)
    busy.value = ''
    return
  }
  // The container writes the credentials asynchronously: confirm the login.
  let loggedIn = false
  for (let i = 0; i < 6 && !loggedIn; i++) {
    if (i) await new Promise((ok) => setTimeout(ok, POLL_MS))
    try {
      health.value = await api.get<Health>(`${base}/${id}/health`)
      loggedIn = !!health.value.logged_in
    } catch {
      // retried below
    }
  }
  busy.value = ''
  if (!loggedIn) {
    fail('code', t('ccgateway.accountAuth.notConfirmed'))
    return
  }
  session.value = null
  code.value = ''
  opened.value = false
  toast(t('ccgateway.accountAuth.authorizedToast'), 'success')
  emit('authorized')
}

async function cancel() {
  const id = props.accountId
  const s = session.value
  session.value = null
  code.value = ''
  opened.value = false
  failure.value = null
  if (!id || !s || sessionExpired(s.expires_at)) return
  busy.value = 'cancel'
  try {
    await api.post(`${base}/${id}/cancel`, { session_id: s.session_id })
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
  if (f.step === 'container') void (canManage.value ? sync() : refresh())
  else if (f.step === 'login') void start()
  else if (f.step === 'code') void (expired.value || !session.value ? start() : complete())
}

function tick() {
  if (!props.accountId || busy.value || document.hidden || session.value) return
  // Only while the container converges; a known login state does not change by
  // itself, and a blocked container waits for the account to change.
  if (failure.value?.step === 'container' || phase.value === 'blocked') return
  if (phase.value !== 'ready' || !health.value) {
    busy.value = 'status'
    void refresh().finally(() => {
      if (busy.value === 'status') busy.value = ''
    })
  }
}

function reset() {
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

async function boot() {
  reset()
  if (!props.accountId || !canRead.value) return
  // Just saved: the editor stays open on this panel; bring it into view.
  if (props.autoStart) root.value?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  if (props.autoStart && canManage.value) await sync()
  else await refresh()
}

watch(() => props.accountId, () => void boot())
// The saved account changed (e.g. a proxy was picked for a blocked container): synchronize again.
watch(
  () => props.syncKey,
  (now, before) => {
    if (!props.accountId || before === undefined || now === before) return
    failure.value = null
    void (canManage.value ? sync() : refresh())
  }
)
const root = ref<HTMLElement>()
onMounted(() => {
  void boot()
  pollTimer = setInterval(tick, POLL_MS)
  clockTimer = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => {
  ++serial
  clearInterval(pollTimer)
  clearInterval(clockTimer)
  code.value = ''
  session.value = null
})

const stepTitle = (s: CcgStep) => t(`ccgateway.accountAuth.steps.${s}`)
const stepNo = (s: CcgStep) => CCG_STEPS.indexOf(s) + 1
const settingsLink = '/plugins/ccgateway?tab=settings'
</script>

<template>
  <div ref="root" class="space-y-3 text-sm" data-testid="ccgateway-account-auth">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
        <SIcon name="key" class="h-4 w-4 text-primary-500" />{{ t('ccgateway.accountAuth.title') }}
      </div>
      <span v-if="step === 'done'" class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" data-testid="ccgateway-auth-authorized">
        <SIcon name="check" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.authorized') }}
      </span>
      <span v-else-if="accountId && health && !health.logged_in" class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        {{ t('ccgateway.accountAuth.loggedOut') }}
      </span>
    </div>

    <SHint v-if="accountId && !canRead" tone="warning">{{ t('ccgateway.accountAuth.noRead') }}</SHint>
    <SHint v-else-if="accountId && !canManage" tone="warning">{{ t('ccgateway.accountAuth.readOnly') }}</SHint>

    <ol class="space-y-0" data-testid="ccgateway-auth-steps">
      <li v-for="(s, i) in CCG_STEPS" :key="s" class="relative flex gap-3 pb-4 last:pb-0" :data-step="s" :data-state="states[s]">
        <!-- rail -->
        <span v-if="i < CCG_STEPS.length - 1" class="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px" :class="states[s] === 'done' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-gray-200 dark:bg-dark-600'" aria-hidden="true" />
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

          <!-- ① save -->
          <template v-if="s === 'save'">
            <p v-if="!accountId" class="mt-1 text-xs text-gray-600 dark:text-dark-300" data-testid="ccgateway-create-hint">{{ t('ccgateway.accountAuth.saveHint') }}</p>
            <p v-else class="mt-0.5 text-xs text-gray-500 dark:text-dark-400">{{ t('ccgateway.accountAuth.saved', { id: accountId }) }}</p>
          </template>

          <!-- ② container -->
          <template v-else-if="s === 'container' && accountId">
            <div v-if="states.container === 'error' && failure?.step === 'container'" class="mt-1.5 space-y-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-auth-container-error">
              <div class="font-medium">{{ failure.message }}</div>
              <ul v-if="failure.setup?.length" class="list-inside list-disc space-y-0.5">
                <li v-for="p in failure.setup" :key="p">{{ t(`ccgateway.accountAuth.setup.${p}`) }}</li>
              </ul>
              <div v-else-if="failure.detail" class="break-all opacity-80">{{ t('ccgateway.accountAuth.reason', { message: failure.detail }) }}</div>
              <div class="flex flex-wrap gap-2">
                <SButton size="sm" :loading="busy === 'sync'" :disabled="acting" data-testid="ccgateway-auth-retry" @click="retry"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.retry') }}</SButton>
                <SButton v-if="failure.setup?.length" size="sm" variant="ghost" :to="settingsLink"><SIcon name="settings" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.openSettings') }}</SButton>
              </div>
            </div>
            <div v-else-if="blocked" class="mt-1.5 space-y-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-auth-blocked" :data-reason="blocked">
              <div class="font-medium">{{ t(`ccgateway.accountAuth.blocked.${blocked}.title`) }}</div>
              <div class="opacity-90">{{ t(`ccgateway.accountAuth.blocked.${blocked}.fix`) }}</div>
              <div class="flex flex-wrap gap-2">
                <SButton v-if="blocked === 'no_proxy' || blocked === 'proxy_disabled'" size="sm" variant="primary" data-testid="ccgateway-auth-fix-proxy" @click="emit('fix-proxy')">
                  <SIcon name="proxy" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.blocked.pickProxy') }}
                </SButton>
                <SButton v-if="blocked === 'proxy_disabled'" size="sm" variant="ghost" to="/proxies">{{ t('ccgateway.accountAuth.blocked.openProxies') }}</SButton>
                <SButton v-if="canManage" size="sm" variant="ghost" :loading="busy === 'sync'" :disabled="acting" @click="sync"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.resync') }}</SButton>
              </div>
            </div>
            <div v-else-if="states.container === 'error'" class="mt-1.5 space-y-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert">
              <div>{{ t('ccgateway.accountAuth.containerError', { status: status?.status || '?' }) }}</div>
              <SButton v-if="canManage" size="sm" :loading="busy === 'sync'" @click="sync"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.resync') }}</SButton>
            </div>
            <div v-else-if="states.container === 'current'" class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-dark-300">
              <SSpinner size="sm" />
              <span>{{ busy === 'sync' ? t('ccgateway.accountAuth.containerStarting') : t('ccgateway.accountAuth.containerPreparing', { name: containerName }) }}</span>
              <SButton v-if="canManage && busy !== 'sync'" size="sm" variant="ghost" @click="sync">{{ t('ccgateway.accountAuth.resync') }}</SButton>
            </div>
            <p v-else-if="states.container === 'done'" class="mt-0.5 font-mono text-xs text-gray-500 dark:text-dark-400">{{ t('ccgateway.accountAuth.containerReady', { name: containerName }) }}</p>
          </template>

          <!-- ③ open the link -->
          <template v-else-if="s === 'login' && accountId && (states.login === 'current' || states.login === 'error' || failure?.step === 'login' || (states.login === 'done' && session))">
            <div v-if="failure?.step === 'login'" class="mt-1.5 space-y-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert">
              <div class="font-medium">{{ failure.message }}</div>
              <div v-if="failure.detail" class="break-all opacity-80">{{ t('ccgateway.accountAuth.reason', { message: failure.detail }) }}</div>
              <SButton size="sm" :loading="busy === 'start'" data-testid="ccgateway-auth-retry" @click="retry"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.retry') }}</SButton>
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
          <template v-else-if="s === 'code' && accountId && session">
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
              <div v-if="failure?.step === 'code'" class="space-y-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-auth-code-error">
                <div class="font-medium">{{ failure.message }}</div>
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
            <p class="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">{{ t('ccgateway.accountAuth.authorizedHint') }}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <SButton v-if="autoStart" size="sm" variant="primary" data-testid="ccgateway-auth-finish" @click="emit('close')">{{ t('ccgateway.accountAuth.finish') }}</SButton>
              <SButton v-if="canManage" size="sm" :loading="busy === 'start'" data-testid="ccgateway-auth-reauthorize" @click="start"><SIcon name="refresh" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.reauthorize') }}</SButton>
            </div>
          </template>
        </div>
      </li>
    </ol>
  </div>
</template>
