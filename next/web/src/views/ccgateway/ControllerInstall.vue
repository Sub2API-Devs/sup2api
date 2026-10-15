<script setup lang="ts">
// "Install the controller" of the CCGateway connection settings (CONTRACTS
// §53.9): on local Docker or over SSH, then the saved connection is that
// endpoint. The SSH credentials only travel in the install request (never in
// PUT remote-config) and are cleared after a successful install or when the
// form goes away. A legacy SSH connection still saved may be reused.
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SCheckbox, SCode, SCopyButton, SField, SHint, SInput, SSegmented, SSettingRow, SSettingsGroup, STextarea, confirm } from '@sub2api/ui'
import type { CcgRemoteConfig } from '@/api/types'
import { reasonOf } from './ccgAuthFlow'
import { useCcgError } from './ccgError'
import {
  AUTO_PORT_START, DEFAULT_SSH_PORT, connectionStateOf, controllerInstallBody, defaultInstallHost, installEmailApplies, installStage, isDomainHost, schemeOf, validPort,
  type ControllerInstallBody, type ControllerScheme, type InstallMethod
} from './controllerMode'

/** POST controller/install: the saved configuration, plus findings that did not stop the install (§53.9). */
export type InstallResult = CcgRemoteConfig & { warnings?: string[] }

const props = defineProps<{ saved: CcgRemoteConfig; disabled?: boolean; /** Other unsaved settings would be replaced by the configuration the install returns. */ blocked?: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{
  /** A request of this form runs: the parent locks its own form meanwhile. */
  (e: 'busy', value: boolean): void
  /** An install starts: the parent clears its notices. */
  (e: 'start'): void
  /** Installed (`late`: the request failed but the saved configuration shows the install finished). */
  (e: 'installed', config: InstallResult, late: boolean): void
}>()
const { t } = useI18n()
const describe = useCcgError()
const INSTALL_TIMEOUT_MS = 20 * 60_000
const REMOTE_CONFIG = '/system/ccgateway/remote-config'

const install = reactive({ method: 'ssh' as 'local' | 'ssh', scheme: 'https' as ControllerScheme, host: '', port: '' as number | string, email: '' })
const sshForm = reactive({ host: '', port: DEFAULT_SSH_PORT as number | string, user: '', auth_mode: 'password' as 'password' | 'private_key', host_key_fingerprint: '' })
const sshSecrets = reactive({ password: '', private_key: '', passphrase: '' })
const installing = ref(false)
const probing = ref(false)
const installError = ref('')
const installProbe = ref<{ fingerprint: string; host: string; port: number } | null>(null)
const useSavedSsh = ref(false)

const connection = computed(() => connectionStateOf(props.saved))
/** Legacy SSH connection still saved: the install may use it (the request then names no method). */
const canUseSavedSsh = computed(() => props.saved.mode === 'ssh' && !!props.saved.account_runtimes)
const installMethod = computed<InstallMethod>(() => (install.method === 'ssh' && canUseSavedSsh.value && useSavedSsh.value ? 'saved' : install.method))
const savedSshTarget = computed(() => `${props.saved.user}@${props.saved.host}:${props.saved.port}`)
const installDefaultHost = computed(() => defaultInstallHost({ method: installMethod.value, ssh: { ...sshForm, ...sshSecrets }, savedSshHost: props.saved.host || '' }))
const installTargetHost = computed(() => install.host.trim() || installDefaultHost.value)
const installEmailShown = computed(() => installEmailApplies(install.scheme, installTargetHost.value))
/** How the gateway gets its certificate (§53.9): ACME for a domain name, Caddy's internal CA (pinned) otherwise; none over HTTP. */
const installCert = computed<'acme' | 'internal' | null>(() => {
  if (install.scheme === 'http' || !installTargetHost.value) return null
  return isDomainHost(installTargetHost.value) ? 'acme' : 'internal'
})
const methodOptions = computed(() => [{ value: 'local', label: t('ccgateway.controllerInstall.methodLocal') }, { value: 'ssh', label: t('ccgateway.controllerInstall.methodSsh') }])
const schemeOptions = computed(() => [{ value: 'https', label: t('ccgateway.remote.schemeHttps') }, { value: 'http', label: t('ccgateway.remote.schemeHttp') }])
const authModeOptions = computed(() => [{ value: 'password', label: t('ccgateway.remote.password') }, { value: 'private_key', label: t('ccgateway.remote.privateKey') }])

watch(() => props.saved, (cfg) => { useSavedSsh.value = cfg.mode === 'ssh' && !!cfg.account_runtimes }, { immediate: true })
watch(() => [sshForm.host, sshForm.port], () => { installProbe.value = null })
watch([installing, probing], ([a, b]) => emit('busy', a || b))

function clearForm() {
  Object.assign(sshForm, { host: '', port: DEFAULT_SSH_PORT, user: '', auth_mode: 'password', host_key_fingerprint: '' })
  Object.assign(sshSecrets, { password: '', private_key: '', passphrase: '' })
  Object.assign(install, { method: 'ssh', scheme: 'https', host: '', port: '', email: '' })
  installProbe.value = null
}

/** Install failure: the translated reason, with the failed stage of gateway_unreachable. */
function installFailure(e: unknown): string {
  const message = describe(e) || t('ccgateway.remote.failed')
  const stage = reasonOf(e) === 'gateway_unreachable' ? installStage(e) : ''
  return stage ? t('ccgateway.controllerInstall.withStage', { reason: message, stage: t(`ccgateway.controllerInstall.stage.${stage}`) }) : message
}
function confirmMessage(body: ControllerInstallBody): string {
  const target = body.ssh ? `${body.ssh.user}@${body.ssh.host}:${body.ssh.port}` : savedSshTarget.value
  const where = t(`ccgateway.controllerInstall.where.${installMethod.value}`, { target })
  const port = body.port || t('ccgateway.controllerInstall.autoPort', { start: AUTO_PORT_START[body.scheme] })
  const parts = [t('ccgateway.controllerInstall.confirmMessage', { where, scheme: body.scheme.toUpperCase(), port, host: body.host })]
  if (body.scheme === 'http') parts.push(t('ccgateway.controllerInstall.confirmHttp'))
  if (connection.value === 'legacy') parts.push(t('ccgateway.controllerInstall.confirmLegacy'))
  else if (connection.value === 'connected') parts.push(t('ccgateway.controllerInstall.confirmReplace'))
  return parts.join('\n\n')
}
/** The configuration now connects to the endpoint the install asked for. */
function installedAs(config: CcgRemoteConfig, body: ControllerInstallBody): boolean {
  return config.mode === 'controller' && config.host.toLowerCase() === body.host.toLowerCase() && schemeOf(config) === body.scheme && (body.port === 0 || config.port === body.port)
}
function finish(config: InstallResult, late: boolean) {
  clearForm()
  emit('installed', config, late)
}

/** POST /system/ccgateway/controller/install: installs the controller and its gateway, then the saved connection is that endpoint (§53.9). */
async function installController() {
  if (props.disabled) return
  emit('start')
  installError.value = ''
  if (props.blocked) {
    installError.value = t('ccgateway.controllerInstall.saveOthersFirst')
    return
  }
  const built = controllerInstallBody({ method: installMethod.value, ssh: { ...sshForm, ...sshSecrets }, savedSshHost: props.saved.host || '', scheme: install.scheme, host: install.host, port: install.port, email: install.email })
  if ('problem' in built) {
    installError.value = t(`ccgateway.controllerInstall.problem.${built.problem}`)
    return
  }
  const body = built.body
  const ok = await confirm({ title: t('ccgateway.controllerInstall.confirmTitle'), message: confirmMessage(body), confirmText: t('ccgateway.controllerInstall.submit') })
  if (!ok || props.disabled) return
  installing.value = true
  try {
    finish(await api.post<InstallResult>('/system/ccgateway/controller/install', body, { signal: AbortSignal.timeout(INSTALL_TIMEOUT_MS) }), false)
  } catch (e) {
    // Without a reason the request itself failed (a front proxy timeout, a dropped connection) while the
    // install may have finished in the core: the saved configuration tells.
    const after = reasonOf(e) ? null : await api.get<CcgRemoteConfig>(REMOTE_CONFIG).catch(() => null)
    if (after && installedAs(after, body)) finish(after, true)
    else installError.value = installFailure(e)
  } finally {
    installing.value = false
  }
}

async function probeFingerprint() {
  if (props.disabled) return
  installError.value = ''
  const host = sshForm.host.trim()
  const port = Number(sshForm.port)
  if (!host || !validPort(port)) {
    installError.value = t('ccgateway.remote.targetRequired')
    return
  }
  probing.value = true
  try {
    const data = await api.post<{ fingerprint: string }>('/system/ccgateway/remote-fingerprint', { host, port }, { signal: AbortSignal.timeout(55000) })
    if (sshForm.host.trim() === host && Number(sshForm.port) === port) installProbe.value = { fingerprint: data.fingerprint, host, port }
  } catch (e) {
    installError.value = describe(e) || t('ccgateway.remote.failed')
  } finally {
    probing.value = false
  }
}
function useFingerprint() {
  const probe = installProbe.value
  if (!probe || probe.host !== sshForm.host.trim() || probe.port !== Number(sshForm.port)) return
  sshForm.host_key_fingerprint = probe.fingerprint
  installProbe.value = null
}

onBeforeUnmount(clearForm)
</script>

<template>
  <SSettingsGroup v-model:open="open" collapsible :description="open ? t('ccgateway.controllerInstall.hint') : ''" data-testid="controller-install">
    <template #title>
      <h5 class="text-sm font-semibold text-fg" data-testid="controller-install-toggle">{{ t(connection === 'connected' ? 'ccgateway.controllerInstall.reinstall' : 'ccgateway.controllerInstall.title') }}</h5>
    </template>
    <div class="divide-y divide-line" data-testid="controller-install-form">
      <SHint v-if="connection === 'legacy'" tone="warning" class="py-3" data-testid="controller-install-legacy">{{ t('ccgateway.controllerInstall.legacyHint') }}</SHint>
      <fieldset :disabled="disabled" class="min-w-0 divide-y divide-line">
        <SSettingRow :label="t('ccgateway.controllerInstall.method')">
          <template #description>
            <span v-if="install.method === 'local'" data-testid="install-local-hint">{{ t('ccgateway.controllerInstall.localHint') }}</span>
            <span v-else>{{ t('ccgateway.controllerInstall.sshHint') }}</span>
          </template>
          <SSegmented :model-value="install.method" :options="methodOptions" size="sm" :disabled="disabled" :aria-label="t('ccgateway.controllerInstall.method')" data-testid="install-method" @update:model-value="install.method = $event as typeof install.method" />
        </SSettingRow>
        <template v-if="install.method === 'ssh'">
          <div v-if="canUseSavedSsh" class="space-y-1 py-4">
            <SCheckbox v-model="useSavedSsh" data-testid="install-use-saved"><span class="break-all">{{ t('ccgateway.controllerInstall.useSaved', { target: savedSshTarget }) }}</span></SCheckbox>
            <SHint v-if="useSavedSsh" size="xs" class="pl-6">{{ t('ccgateway.controllerInstall.useSavedHint') }}</SHint>
          </div>
          <div v-if="installMethod === 'ssh'" class="divide-y divide-line" data-testid="install-ssh">
            <div class="grid gap-3 py-4 sm:grid-cols-3">
              <SField :label="t('ccgateway.remote.host')" class="sm:col-span-2">
                <SInput v-model="sshForm.host" autocomplete="off" spellcheck="false" data-testid="install-ssh-host" />
              </SField>
              <SField :label="t('ccgateway.remote.port')">
                <SInput v-model="sshForm.port" type="number" min="1" max="65535" data-testid="install-ssh-port" />
              </SField>
              <SField :label="t('ccgateway.remote.user')" class="sm:col-span-3">
                <SInput v-model="sshForm.user" autocomplete="off" spellcheck="false" data-testid="install-ssh-user" />
              </SField>
            </div>
            <SSettingRow :label="t('ccgateway.remote.authMode')">
              <SSegmented :model-value="sshForm.auth_mode" :options="authModeOptions" size="sm" :disabled="disabled" :aria-label="t('ccgateway.remote.authMode')" data-testid="install-ssh-auth" @update:model-value="sshForm.auth_mode = $event as typeof sshForm.auth_mode" />
            </SSettingRow>
            <div class="space-y-3 py-4">
              <SField v-if="sshForm.auth_mode === 'password'" :label="t('ccgateway.remote.password')">
                <SInput v-model="sshSecrets.password" type="password" autocomplete="new-password" data-testid="install-ssh-password" />
              </SField>
              <template v-else>
                <SField :label="t('ccgateway.remote.privateKey')">
                  <STextarea v-model="sshSecrets.private_key" mono :rows="5" autocomplete="off" spellcheck="false" class="text-xs" data-testid="install-ssh-private-key" />
                </SField>
                <SField :label="t('ccgateway.remote.passphrase')">
                  <SInput v-model="sshSecrets.passphrase" type="password" autocomplete="new-password" data-testid="install-ssh-passphrase" />
                </SField>
              </template>
              <SField :label="t('ccgateway.remote.fingerprint')">
                <div class="flex flex-wrap gap-2">
                  <SInput v-model="sshForm.host_key_fingerprint" mono autocomplete="off" spellcheck="false" placeholder="SHA256:…" class="min-w-0 flex-1 text-xs" data-testid="install-ssh-fingerprint" />
                  <SButton size="sm" :loading="probing" data-testid="install-ssh-probe" @click="probeFingerprint">{{ t('ccgateway.remote.probe') }}</SButton>
                </div>
              </SField>
              <SAlert v-if="installProbe" tone="warning" :title="t('ccgateway.remote.verifyFingerprint')">
                <SCode inline class="mt-1 block break-all">{{ installProbe.fingerprint }}</SCode>
                <template #actions>
                  <SCopyButton :text="installProbe.fingerprint" icon-only />
                  <SButton size="sm" data-testid="install-use-fingerprint" @click="useFingerprint">{{ t('ccgateway.remote.useFingerprint') }}</SButton>
                </template>
              </SAlert>
            </div>
          </div>
        </template>
        <SSettingRow :label="t('ccgateway.controllerInstall.gateway')" :description="t('ccgateway.controllerInstall.hostHint')" stacked>
          <div class="w-full space-y-3">
            <SField :label="t('ccgateway.remote.scheme')">
              <SSegmented :model-value="install.scheme" :options="schemeOptions" size="sm" :disabled="disabled" :aria-label="t('ccgateway.remote.scheme')" data-testid="install-scheme" @update:model-value="install.scheme = $event as typeof install.scheme" />
            </SField>
            <SAlert v-if="install.scheme === 'http'" tone="warning" dense data-testid="install-http-warning">{{ t('ccgateway.remote.httpWarning') }}</SAlert>
            <div class="grid gap-3 sm:grid-cols-3">
              <SField :label="t('ccgateway.controllerInstall.host')" class="sm:col-span-2">
                <SInput v-model="install.host" autocomplete="off" spellcheck="false" :placeholder="installDefaultHost" data-testid="install-host" />
              </SField>
              <SField :label="t('ccgateway.controllerInstall.port')" :hint="t('ccgateway.controllerInstall.portHint', AUTO_PORT_START)">
                <SInput v-model="install.port" type="number" min="1" max="65535" :placeholder="t('ccgateway.controllerInstall.portPlaceholder')" data-testid="install-port" />
              </SField>
            </div>
            <SAlert v-if="installCert" tone="info" dense data-testid="install-cert" :data-cert="installCert">{{ t(`ccgateway.controllerInstall.cert.${installCert}`) }}</SAlert>
            <SField v-if="installEmailShown" :label="t('ccgateway.controllerInstall.email')" :hint="t('ccgateway.controllerInstall.emailHint')">
              <SInput v-model="install.email" type="email" autocomplete="off" spellcheck="false" data-testid="install-email" />
            </SField>
          </div>
        </SSettingRow>
      </fieldset>
      <div class="space-y-2 py-4">
        <SHint v-if="blocked" tone="warning" size="xs" data-testid="controller-install-blocked">{{ t('ccgateway.controllerInstall.saveOthersFirst') }}</SHint>
        <SAlert v-if="installError" tone="danger" dense data-testid="controller-install-error"><span class="break-all">{{ installError }}</span></SAlert>
        <div class="flex flex-wrap items-center gap-3">
          <SButton variant="primary" size="sm" :loading="installing" :disabled="disabled || blocked" data-testid="controller-install-submit" @click="installController">{{ t('ccgateway.controllerInstall.submit') }}</SButton>
          <SHint v-if="installing" inline size="xs">{{ t('ccgateway.controllerInstall.installing') }}</SHint>
        </div>
      </div>
    </div>
  </SSettingsGroup>
</template>
