<script setup lang="ts">
// Codex device code login (codex_device): Start → POST /auth/device/start →
// the verification page and the code, a countdown, and POST
// /auth/device/poll every `interval` seconds until done / expired / error.
// Polling stops when the component unmounts or reset() is called.
import { computed, onBeforeUnmount, ref } from 'vue'
import { SAlert, SButton, SCopyButton, SHint, SIcon, SLink, SSpinner, SSteps, useNow } from '@sub2api/ui'
import { errorMessage, pollDevice, startDevice, useCodexHost, type CodexCredentials, type DeviceStart } from './host'
import { COUNTDOWN_TICK_MS, DEFAULT_CODE_TTL_SECONDS, DEFAULT_POLL_MS, formatCountdown, MAX_POLL_FAILURES, pollDelay } from './flow'

const emit = defineEmits<{ (e: 'authorized', creds: CodexCredentials): void; (e: 'busy', busy: boolean): void }>()
const host = useCodexHost()
const t = host.t

type Phase = 'idle' | 'starting' | 'waiting' | 'expired' | 'error'
const phase = ref<Phase>('idle')
const session = ref<DeviceStart | null>(null)
const expiresAt = ref(0)
const failure = ref('')
const now = useNow(() => (phase.value === 'waiting' ? COUNTDOWN_TICK_MS : 0))
const left = computed(() => Math.max(0, Math.round((expiresAt.value - now.value) / 1000)))

// Each start gets a generation; a reply of an older one (after reset,
// restart or unmount) is dropped.
let generation = 0
let timer: ReturnType<typeof setTimeout> | null = null
let delay = DEFAULT_POLL_MS
let failures = 0

function setPhase(p: Phase) {
  phase.value = p
  emit('busy', p === 'starting' || p === 'waiting')
}

function stop() {
  generation++
  if (timer) clearTimeout(timer)
  timer = null
}

async function start() {
  stop()
  const gen = generation
  failure.value = ''
  session.value = null
  setPhase('starting')
  try {
    const s = await startDevice()
    if (gen !== generation) return
    session.value = s
    expiresAt.value = Date.now() + (Number(s.expires_in) > 0 ? Number(s.expires_in) : DEFAULT_CODE_TTL_SECONDS) * 1000
    delay = pollDelay(s.interval)
    failures = 0
    setPhase('waiting')
    schedule(gen)
  } catch (e) {
    if (gen !== generation) return
    failure.value = errorMessage(e, t('actionFailed'))
    setPhase('error')
  }
}

function schedule(gen: number) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void poll(gen), delay)
}

async function poll(gen: number) {
  if (gen !== generation || !session.value) return
  if (Date.now() >= expiresAt.value) {
    stop()
    setPhase('expired')
    return
  }
  try {
    const r = await pollDevice(session.value.session_id)
    if (gen !== generation) return
    failures = 0
    if (r.interval) delay = pollDelay(r.interval)
    if (r.status === 'pending') return schedule(gen)
    stop()
    if (r.status === 'done' && r.credentials) {
      setPhase('idle')
      session.value = null
      emit('authorized', r.credentials)
    } else if (r.status === 'expired') {
      setPhase('expired')
    } else {
      failure.value = r.message || t('actionFailed')
      setPhase('error')
    }
  } catch (e) {
    if (gen !== generation) return
    // A dropped request or a restarting node: try again a few times before giving up.
    if (++failures < MAX_POLL_FAILURES) return schedule(gen)
    stop()
    failure.value = errorMessage(e, t('actionFailed'))
    setPhase('error')
  }
}

function cancel() {
  stop()
  session.value = null
  failure.value = ''
  setPhase('idle')
}

onBeforeUnmount(stop)
defineExpose({ reset: cancel })

const steps = computed(() => [
  { key: 'open', title: t('device.step1') },
  { key: 'code', title: t('device.step2') }
])
</script>

<template>
  <div class="cx-flow" data-testid="codex-device-flow" :data-phase="phase">
    <SHint size="xs">{{ t('intro.device') }}</SHint>

    <div v-if="phase === 'idle' || phase === 'starting'" class="cx-actions">
      <SButton variant="primary" icon="play" :loading="phase === 'starting'" data-testid="codex-device-start" @click="start">{{ t('device.start') }}</SButton>
    </div>

    <template v-else-if="phase === 'waiting' && session">
      <SSteps :steps="steps" direction="vertical" current="code">
        <template #step-open>
          <div class="cx-step-body">
            <SLink :href="session.verification_url" external class="cx-link" data-testid="codex-device-url">
              <SIcon name="external" class="cx-icon" />
              <span class="cx-break">{{ session.verification_url }}</span>
            </SLink>
          </div>
        </template>
        <template #step-code>
          <div class="cx-step-body">
            <div class="cx-code-row">
              <code class="cx-code" data-testid="codex-device-code" :aria-label="t('device.codeLabel')">{{ session.user_code }}</code>
              <SCopyButton :text="session.user_code" :label="t('device.copyCode')" variant="secondary" size="md" data-testid="codex-device-copy" />
            </div>
          </div>
        </template>
      </SSteps>
      <div class="cx-status" role="status">
        <SSpinner size="sm" decorative />
        <span>{{ t('device.waiting') }}</span>
        <span class="cx-num cx-muted" data-testid="codex-device-countdown">{{ t('device.expiresIn', { time: formatCountdown(left) }) }}</span>
        <SButton size="sm" variant="ghost" data-testid="codex-device-cancel" @click="cancel">{{ t('device.cancel') }}</SButton>
      </div>
    </template>

    <SAlert v-else-if="phase === 'expired'" tone="warning" dense data-testid="codex-device-expired">
      {{ t('device.expired') }}
      <template #actions>
        <SButton size="sm" icon="refresh" data-testid="codex-device-retry" @click="start">{{ t('device.retry') }}</SButton>
      </template>
    </SAlert>

    <SAlert v-else-if="phase === 'error'" tone="danger" dense :title="t('device.failed')" data-testid="codex-device-error">
      <span class="cx-break">{{ failure }}</span>
      <p class="cx-sub">{{ t('device.notEnabled') }}</p>
      <template #actions>
        <SButton size="sm" icon="refresh" data-testid="codex-device-retry" @click="start">{{ t('device.retry') }}</SButton>
      </template>
    </SAlert>
  </div>
</template>
