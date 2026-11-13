<script setup lang="ts">
// Two-factor authentication: enrolling an authenticator app, the backup codes
// (shown once) and turning it off. Enrolling asks for the password; turning
// it off and new backup codes are step-up operations, verified by the dialog
// the request brings up.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SCopyButton, SField, SFormModal, SInput, confirm, toast } from '@sub2api/ui'
import { errorMessage, fieldErrors, notifyError } from '@/utils/errors'

interface Status {
  enabled: boolean
  enabled_at?: string
  backup_codes_left: number
}
interface Setup {
  flow_token: string
  secret: string
  qr_code: string
}

const { t } = useI18n()
const status = ref<Status | null>(null)
async function load() {
  try {
    status.value = await api.get<Status>('/me/two-factor')
  } catch (e) {
    notifyError(e)
  }
}
onMounted(load)

type Step = 'password' | 'scan' | 'codes' | ''
const step = ref<Step>('')
const busy = ref(false)
const errors = ref<Record<string, string>>({})
const password = ref('')
const code = ref('')
const setup = ref<Setup | null>(null)
const backupCodes = ref<string[]>([])
const backupText = computed(() => backupCodes.value.join('\n'))

function open(next: Step) {
  password.value = ''
  code.value = ''
  errors.value = {}
  step.value = next
}
function close(v: boolean) {
  if (!v) step.value = ''
}
async function attempt(fn: () => Promise<void>) {
  busy.value = true
  errors.value = {}
  try {
    await fn()
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) errors.value = { form: errorMessage(e) }
  } finally {
    busy.value = false
  }
}
const start = () =>
  attempt(async () => {
    setup.value = await api.post<Setup>('/me/two-factor/setup', { password: password.value })
    open('scan')
  })
const enable = () =>
  attempt(async () => {
    const r = await api.post<{ backup_codes: string[] }>('/me/two-factor/enable', { flow_token: setup.value?.flow_token, code: code.value })
    backupCodes.value = r.backup_codes
    setup.value = null
    open('codes')
    await load()
  })
async function disable() {
  if (!(await confirm({ title: t('me.twoFactor.disable'), message: t('me.twoFactor.disableConfirm'), danger: true }))) return
  try {
    await api.post('/me/two-factor/disable')
    toast(t('me.twoFactor.disabled'), 'success')
    await load()
  } catch (e) {
    notifyError(e)
  }
}
async function regenerate() {
  try {
    const r = await api.post<{ backup_codes: string[] }>('/me/two-factor/backup-codes')
    backupCodes.value = r.backup_codes
    open('codes')
    await load()
  } catch (e) {
    notifyError(e)
  }
}
</script>

<template>
  <SCard :title="t('me.twoFactor.title')" :subtitle="t('me.twoFactor.description')" :padded="false" data-testid="two-factor-card">
    <template #actions>
      <template v-if="status?.enabled">
        <SBadge tone="success" data-testid="two-factor-on">{{ t('me.twoFactor.on') }}</SBadge>
        <span class="hidden text-xs text-fg-muted sm:inline">{{ t('me.twoFactor.codesLeft', { n: status.backup_codes_left }) }}</span>
        <SButton size="sm" data-testid="two-factor-regenerate" @click="regenerate">{{ t('me.twoFactor.regenerate') }}</SButton>
        <SButton size="sm" variant="danger" data-testid="two-factor-disable" @click="disable">{{ t('me.twoFactor.disable') }}</SButton>
      </template>
      <SButton v-else-if="status" size="sm" variant="primary" icon="shield" data-testid="two-factor-enable" @click="open('password')">{{ t('me.twoFactor.enable') }}</SButton>
    </template>

    <SFormModal :open="step === 'password'" :title="t('me.twoFactor.enable')" width="sm" :loading="busy" :submit-text="t('common.next')" :submit-disabled="!password" @update:open="close" @submit="start">
      <SAlert v-if="errors.form" tone="danger" dense>{{ errors.form }}</SAlert>
      <SField :label="t('me.confirmPassword')" :error="errors.password" required>
        <SInput v-model="password" type="password" autocomplete="current-password" revealable data-testid="two-factor-password" />
      </SField>
    </SFormModal>

    <SFormModal :open="step === 'scan'" :title="t('me.twoFactor.enable')" width="sm" :loading="busy" :submit-text="t('me.twoFactor.enableSubmit')" :submit-disabled="!code.trim()" @update:open="close" @submit="enable">
      <p class="text-sm text-fg-muted">{{ t('me.twoFactor.scanHint') }}</p>
      <img v-if="setup" :src="setup.qr_code" :alt="t('me.twoFactor.qrAlt')" width="200" height="200" class="mx-auto rounded-lg bg-white p-2" data-testid="two-factor-qr" />
      <div v-if="setup" class="flex items-center justify-center gap-2">
        <code class="break-all font-mono text-xs text-fg" data-testid="two-factor-secret">{{ setup.secret }}</code>
        <SCopyButton :text="setup.secret" />
      </div>
      <SAlert v-if="errors.form" tone="danger" dense>{{ errors.form }}</SAlert>
      <SField :label="t('auth.login.code')" :error="errors.code ? t('auth.login.badCode') : ''" required>
        <SInput v-model="code" autocomplete="one-time-code" mono :maxlength="6" data-testid="two-factor-code" />
      </SField>
    </SFormModal>

    <SFormModal :open="step === 'codes'" :title="t('me.twoFactor.backupTitle')" width="sm" persistent :submit-text="t('me.twoFactor.saved')" @update:open="close" @submit="open('')">
      <SAlert tone="warning" dense>{{ t('me.twoFactor.backupHint') }}</SAlert>
      <ul class="grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-3 font-mono text-sm text-fg" data-testid="two-factor-backup-codes">
        <li v-for="c in backupCodes" :key="c">{{ c }}</li>
      </ul>
      <template #footer-start><SCopyButton :text="backupText" /></template>
    </SFormModal>
  </SCard>
</template>
