<script setup lang="ts">
// Sign in with ChatGPT (chatgpt_siwc): Generate → POST /auth/siwc/start
// (re-authorizing sends the account's client_id and ext_agent_host_id) → the
// link, opened in a new window → the operator pastes the 127.0.0.1 callback
// address → POST /auth/siwc/exchange → credentials.
// Not a <form>: the panel sits inside the account editor's form.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { SAlert, SButton, SCopyButton, SField, SHint, SIcon, SInput, SLink, SSteps } from '@sub2api/ui'
import { errorMessage, exchangeSiwc, startSiwc, useCodexHost, type CodexCredentials, type SiwcStart, type SiwcStartBody } from './host'
import { callbackShape } from './flow'

const props = defineProps<{
  /** Re-authorization of an existing account: its issued client_id and host id. */
  reauth?: SiwcStartBody | null
}>()
const emit = defineEmits<{ (e: 'authorized', creds: CodexCredentials): void; (e: 'busy', busy: boolean): void }>()
const host = useCodexHost()
const t = host.t

const session = ref<SiwcStart | null>(null)
const callback = ref('')
const busy = ref<'' | 'start' | 'exchange'>('')
const failure = ref('')
const failedStep = ref<'' | 'start' | 'exchange'>('')
const shape = computed(() => callbackShape(callback.value))
const shapeHint = computed(() => (shape.value === 'invalid' || shape.value === 'denied' || shape.value === 'no_code' ? t(`siwc.shape.${shape.value}`) : ''))
const reauthBody = computed<SiwcStartBody>(() => {
  const r = props.reauth
  const body: SiwcStartBody = {}
  if (r?.client_id) body.client_id = r.client_id
  if (r?.ext_agent_host_id) body.ext_agent_host_id = r.ext_agent_host_id
  return body
})
const reauthorizing = computed(() => !!reauthBody.value.client_id)
// A failed exchange is stale once the operator pastes another address.
watch(callback, () => {
  if (failedStep.value === 'exchange') {
    failure.value = ''
    failedStep.value = ''
  }
})

let generation = 0
let alive = true
onBeforeUnmount(() => {
  alive = false
  generation++
})

function setBusy(b: '' | 'start' | 'exchange') {
  busy.value = b
  emit('busy', b !== '' || !!session.value)
}

async function generate() {
  const gen = ++generation
  failure.value = ''
  failedStep.value = ''
  setBusy('start')
  try {
    const s = await startSiwc(reauthBody.value)
    if (!alive || gen !== generation) return
    session.value = s
    callback.value = ''
  } catch (e) {
    if (!alive || gen !== generation) return
    failure.value = errorMessage(e, t('actionFailed'))
    failedStep.value = 'start'
  } finally {
    if (alive && gen === generation) setBusy('')
  }
}

async function complete() {
  if (!session.value || !callback.value.trim() || busy.value) return
  const gen = ++generation
  failure.value = ''
  failedStep.value = ''
  setBusy('exchange')
  try {
    const r = await exchangeSiwc(session.value.session_id, callback.value.trim())
    if (!alive || gen !== generation) return
    session.value = null
    callback.value = ''
    setBusy('')
    emit('authorized', r.credentials)
  } catch (e) {
    if (!alive || gen !== generation) return
    failure.value = errorMessage(e, t('actionFailed'))
    failedStep.value = 'exchange'
    setBusy('')
  }
}

function reset() {
  generation++
  session.value = null
  callback.value = ''
  failure.value = ''
  failedStep.value = ''
  setBusy('')
}
defineExpose({ reset })

const steps = computed(() => [
  { key: 'open', title: t('siwc.step1') },
  { key: 'paste', title: t('siwc.step2') }
])
</script>

<template>
  <div class="cx-flow" data-testid="codex-siwc-flow" :data-phase="session ? 'link' : busy || 'idle'">
    <SHint size="xs">{{ t('intro.siwc') }}</SHint>
    <SHint v-if="reauthorizing" size="xs">{{ t('siwc.reauthKeepsHost') }}</SHint>

    <div v-if="!session" class="cx-actions">
      <SButton variant="primary" icon="link" :loading="busy === 'start'" data-testid="codex-siwc-start" @click="generate">{{ t('siwc.generate') }}</SButton>
    </div>

    <SSteps v-else :steps="steps" direction="vertical" :current="callback.trim() ? 'paste' : 'open'">
      <template #step-open>
        <div class="cx-step-body">
          <div class="cx-link-row">
            <SInput
              :model-value="session.authorize_url"
              readonly
              mono
              size="sm"
              class="cx-grow"
              :aria-label="t('siwc.linkLabel')"
              data-testid="codex-siwc-url"
              @focus="($event.target as HTMLInputElement).select()"
            />
            <SCopyButton :text="session.authorize_url" :label="t('siwc.copyLink')" icon-only variant="secondary" size="sm" />
          </div>
          <div class="cx-actions">
            <SLink :href="session.authorize_url" external class="cx-link" data-testid="codex-siwc-open">
              <SIcon name="external" class="cx-icon" />{{ t('siwc.openLink') }}
            </SLink>
            <SButton size="xs" variant="ghost" icon="refresh" :loading="busy === 'start'" :disabled="busy === 'exchange'" data-testid="codex-siwc-regenerate" @click="generate">{{ t('siwc.regenerate') }}</SButton>
          </div>
        </div>
      </template>
      <template #step-paste>
        <div class="cx-step-body">
          <SAlert tone="info" dense icon="info" data-testid="codex-siwc-note">{{ t('siwc.redirectNote') }}</SAlert>
          <SField :label="t('siwc.callbackLabel')" size="sm">
            <div class="cx-link-row cx-wrap">
              <SInput
                v-model="callback"
                mono
                class="cx-grow cx-min"
                inputmode="url"
                autocomplete="off"
                :disabled="busy === 'exchange'"
                :placeholder="t('siwc.callbackPlaceholder')"
                data-testid="codex-siwc-callback"
                @keydown.enter.prevent="complete"
              />
              <SButton variant="primary" :loading="busy === 'exchange'" :disabled="!callback.trim() || shape === 'invalid'" data-testid="codex-siwc-complete" @click="complete">{{ t('siwc.complete') }}</SButton>
            </div>
          </SField>
          <SHint v-if="shapeHint" tone="warning" size="xs" data-testid="codex-siwc-shape">{{ shapeHint }}</SHint>
        </div>
      </template>
    </SSteps>

    <SAlert v-if="failure" tone="danger" dense :title="t('siwc.failed')" data-testid="codex-siwc-error">
      <span class="cx-break">{{ failure }}</span>
      <template v-if="failedStep === 'start'" #actions>
        <SButton size="sm" icon="refresh" @click="generate">{{ t('siwc.generate') }}</SButton>
      </template>
    </SAlert>
  </div>
</template>
