<script setup lang="ts">
// Step-up verification (CONTRACTS §80.2): lists the ways the caller can
// verify for `scope` (GET /me/verify/methods), a passkey first when there is
// one, and exchanges the chosen one for a proof (POST /me/verify) emitted as
// `verified`. With password_required the password goes with the passkey or
// code; the password alone only when neither is set up.
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SField, SFormModal, SInput, SSegmented, SSkeleton } from '@sub2api/ui'
import { errorMessage, fieldErrors } from '@/utils/errors'
import { getPasskey, passkeyCancelled, passkeySupported } from '@/utils/webauthn'

type Method = 'passkey' | 'totp' | 'password'
interface VerifyMethods {
  scope: string
  password_required: boolean
  methods: { method: Method; available: boolean; reason?: string }[]
}

const props = defineProps<{ open: boolean; scope: string; context: string }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'verified', proof: string): void }>()
const { t, te } = useI18n()

const info = ref<VerifyMethods | null>(null)
const method = ref<Method | ''>('')
const password = ref('')
const code = ref('')
const errors = ref<Record<string, string>>({})
const busy = ref(false)

const usable = (m: VerifyMethods['methods'][number]) => m.available && (m.method !== 'passkey' || passkeySupported())
const options = computed(() => (info.value?.methods || []).filter(usable).map((m) => ({ value: m.method, label: t(`stepUp.method.${m.method}`) })))
/** Only passkeys are set up and this browser cannot use them. */
const passkeyOnly = computed(() => !options.value.length && !!info.value?.methods.some((m) => m.method === 'passkey' && m.available))
const needsPassword = computed(() => !!info.value?.password_required || method.value === 'password')
const scopeKey = computed(() => `stepUp.scope.${props.scope.replace(/\./g, '_')}`)
const action = computed(() => (te(scopeKey.value) ? t(scopeKey.value) : props.scope))
const canSubmit = computed(() => !!method.value && (!needsPassword.value || !!password.value) && (method.value !== 'totp' || !!code.value.trim()))

async function load() {
  info.value = null
  method.value = ''
  password.value = ''
  code.value = ''
  errors.value = {}
  try {
    info.value = await api.get<VerifyMethods>('/me/verify/methods', { scope: props.scope })
    method.value = (options.value[0]?.value as Method) || ''
  } catch (e) {
    errors.value = { form: errorMessage(e) }
  }
}
watch(
  () => props.open && props.scope,
  (v) => v && load(),
  { immediate: true }
)

/** The method's own proof of presence: the passkey assertion, or the code. */
async function factor(): Promise<Record<string, unknown>> {
  if (method.value === 'totp') return { code: code.value.trim() }
  if (method.value !== 'passkey') return {}
  const begin = await api.post<{ flow_token: string; options: { publicKey: any } }>('/me/verify/begin', { scope: props.scope })
  return { flow_token: begin.flow_token, credential: await getPasskey(begin.options) }
}

async function submit() {
  busy.value = true
  errors.value = {}
  try {
    const body = { scope: props.scope, context: props.context, method: method.value, ...(needsPassword.value ? { password: password.value } : {}), ...(await factor()) }
    const r = await api.post<{ proof: string }>('/me/verify', body)
    emit('verified', r.proof)
  } catch (e) {
    if (passkeyCancelled(e)) return
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) errors.value = { form: errorMessage(e) }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SFormModal
    :open="open"
    :title="t('stepUp.title')"
    width="sm"
    :loading="busy"
    :submit-text="t('stepUp.submit')"
    :submit-disabled="!canSubmit"
    :submit-attrs="{ 'data-testid': 'step-up-submit' }"
    data-testid="step-up-dialog"
    @update:open="emit('update:open', $event)"
    @submit="submit"
  >
    <p class="text-sm text-fg-muted">{{ t('stepUp.intro', { action }) }}<template v-if="info?.password_required"> {{ t('stepUp.passwordToo') }}</template></p>
    <SAlert v-if="errors.form || errors.method" tone="danger" dense data-testid="step-up-error">{{ errors.form || errors.method }}</SAlert>
    <SSkeleton v-if="!info && !errors.form" class="h-16" />
    <template v-else-if="info">
      <SAlert v-if="!options.length" tone="warning" dense data-testid="step-up-none">{{ passkeyOnly ? t('stepUp.passkeyUnsupported') : t('stepUp.none') }}</SAlert>
      <SField v-if="options.length > 1" :label="t('stepUp.methodLabel')">
        <SSegmented v-model="method" :options="options" block data-testid="step-up-method" />
      </SField>
      <SField v-if="needsPassword" :label="t('stepUp.password')" :error="errors.password" required>
        <SInput v-model="password" type="password" autocomplete="current-password" revealable data-testid="step-up-password" />
      </SField>
      <SField v-if="method === 'totp'" :label="t('stepUp.code')" :hint="t('me.twoFactor.codeHint')" :error="errors.code" required>
        <SInput v-model="code" autocomplete="one-time-code" mono :maxlength="11" data-testid="step-up-code" />
      </SField>
      <p v-if="method === 'passkey'" class="text-sm text-fg-muted" data-testid="step-up-passkey-hint">{{ t('stepUp.passkeyHint') }}</p>
    </template>
  </SFormModal>
</template>
