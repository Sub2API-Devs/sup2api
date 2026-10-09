<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, confirm } from '@sub2api/ui'
import type { CcgRemoteConfig } from '@/api/types'
import RuntimeInstall from './RuntimeInstall.vue'
import RequestPolicySettings from './RequestPolicySettings.vue'
import { defaultRequestPolicy, validRequestPolicy, type RequestPolicy } from './requestPolicy'
import { reasonDisplay, reasonOf } from './ccgAuthFlow'
import { useCcgError } from './ccgError'
import { DEFAULT_CONTROLLER_PORT, controllerFormProblem, controllerInstallBody, installStage } from './controllerMode'

interface RuntimeImages { app: string; egress: string; controller: string }
interface RemoteConfig extends CcgRemoteConfig { request_policy?: Partial<RequestPolicy> }
type Action = 'status' | 'start' | 'stop' | 'restart' | 'logs'
/** A form input problem: its message is shown as is (other failures show a generic text). */
class FormError extends Error {}
const SSH_PORT = 22
const INSTALL_TIMEOUT_MS = 20 * 60_000
const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ (event: 'saved'): void; (event: 'busy', value: boolean): void }>()
const { t } = useI18n()
const describe = useCcgError()
const base = '/system/ccgateway/remote-config'
const IMAGE_KEYS = ['app', 'egress', 'controller'] as const
// Same rule as the core: repository[:tag][@sha256:digest], or a local image id.
const IMAGE_RE = /^(?:[a-z0-9][a-z0-9._/-]{0,127}(?::[A-Za-z0-9._-]{1,128})?(?:@sha256:[0-9a-f]{64})?|sha256:[0-9a-f]{64})$/
const requestPolicy = ref<RequestPolicy>(defaultRequestPolicy())
const normalizePolicy = (policy?: Partial<RequestPolicy>): RequestPolicy => {
  const attachment_sources = { ...(policy?.attachment_sources || {}) }
  const environment_fields = { ...(policy?.environment_fields || {}) }
  const legacyEnvironment = attachment_sources.environment
  if (legacyEnvironment === 'client' || legacyEnvironment === 'gateway') {
    for (const field of ['workingDirectory', 'platform'] as const) {
      environment_fields[field] ||= legacyEnvironment
    }
  }
  delete attachment_sources.environment
  for (const kind of Object.keys(attachment_sources) as Array<keyof typeof attachment_sources>) {
    if (attachment_sources[kind] === 'both') delete attachment_sources[kind]
  }
  return { ...defaultRequestPolicy(), ...policy, attachment_source: policy?.attachment_source || 'client', attachment_sources, environment_fields, unknown_client_attachment: policy?.unknown_client_attachment || 'pass', unknown_gateway_attachment: policy?.unknown_gateway_attachment || 'pass' }
}
const policyChanged = computed(() => {
  const sources = saved.value?.request_policy?.attachment_sources
  return !!sources?.environment || Object.values(sources || {}).includes('both') || JSON.stringify(requestPolicy.value) !== JSON.stringify(normalizePolicy(saved.value?.request_policy))
})
const settingsTabs = ['connection', 'network', 'requests', 'attachments', 'deployment', 'accounts'] as const
const activeTab = ref<typeof settingsTabs[number]>(location.hash === '#ccgateway-runtime' ? 'deployment' : 'connection')
const runtimeRevision = ref(0)
const images = reactive<RuntimeImages>({ app: '', egress: '', controller: '' })
const network = reactive({ pool: '10.0.0.0/8', allocation: 'random' as 'random' | 'sequential' })
const networkChanged = computed(() => network.pool.trim() !== (saved.value?.network?.pool || '10.0.0.0/8') || network.allocation !== (saved.value?.network?.allocation || 'random'))
const imagesPayload = computed<RuntimeImages>(() => ({ app: images.app.trim(), egress: images.egress.trim(), controller: images.controller.trim() }))
const imagesChanged = computed(() => IMAGE_KEYS.some(k => imagesPayload.value[k] !== (saved.value?.images?.[k] || '')))

const defaults = { account_runtimes: false, mode: 'local' as const, host: '', port: 22, user: '', auth_mode: 'password' as const, host_key_fingerprint: '' }
const form = reactive<{ account_runtimes: boolean; mode: RemoteConfig['mode']; host: string; port: number | string; user: string; auth_mode: RemoteConfig['auth_mode']; host_key_fingerprint: string }>({ ...defaults })
const secrets = reactive({ password: '', private_key: '', passphrase: '', admin_key: '', api_key: '' })
/** Control panel root certificates (PEM); write-only like the secrets, '' keeps the saved ones while host and port are unchanged. */
const controllerCa = ref('')
const saved = ref<RemoteConfig | null>(null), busy = ref(false), error = ref(''), notice = ref(''), output = ref(''), imageError = ref('')
const probe = ref<{ fingerprint: string; host: string; port: number } | null>(null)
const pending = ref<Action | null>(null)
const publicConfig = computed(() => ({ ...form, host: form.host.trim(), port: Number(form.port), user: form.user.trim(), host_key_fingerprint: form.host_key_fingerprint.trim() }))
const isController = computed(() => form.mode === 'controller')
/** Fields that make up the connection of the chosen mode: the control panel has no SSH user, authentication or host key. */
const comparedConfig = computed<Record<string, unknown>>(() => {
  const c = publicConfig.value
  return isController.value ? { account_runtimes: c.account_runtimes, mode: c.mode, host: c.host, port: c.port } : c
})
/** Secrets the chosen mode sends: the control panel only takes its admin key. */
const modeSecrets = computed(() => (isController.value ? { admin_key: secrets.admin_key } : { ...secrets }))
const targetChanged = computed(() => !!saved.value && (publicConfig.value.host !== saved.value.host || publicConfig.value.port !== saved.value.port || publicConfig.value.user !== saved.value.user))
const controllerTargetChanged = computed(() => !!saved.value && (saved.value.mode !== 'controller' || publicConfig.value.host !== saved.value.host || publicConfig.value.port !== saved.value.port))
/** The saved panel key is kept only for the same saved address and certificate (§53.2). */
const controllerKeyKept = computed(() => !!saved.value?.has_admin_key && !controllerTargetChanged.value && !controllerCa.value.trim())
const dirty = computed(() => !saved.value || Object.entries(comparedConfig.value).some(([key, value]) => saved.value?.[key as keyof RemoteConfig] !== value) || Object.values(modeSecrets.value).some(Boolean) || (isController.value && !!controllerCa.value.trim()) || imagesChanged.value || networkChanged.value || policyChanged.value)
/** Saved connections the buttons below act on: SSH (test and container actions) or the control panel (test only). */
const canOperate = computed(() => !busy.value && !props.disabled && (saved.value?.mode === 'ssh' || saved.value?.mode === 'controller') && !dirty.value)
const passwordNeeded = computed(() => targetChanged.value || !saved.value?.has_password)
const keyNeeded = computed(() => targetChanged.value || !saved.value?.has_private_key)
const disabled = computed(() => busy.value || props.disabled)
/** "Install the control panel" card (§53.3): only on a saved, unchanged SSH connection with per-account containers. */
const install = reactive({ host: '', port: DEFAULT_CONTROLLER_PORT as number | string, email: '' })
const installing = ref(false), installError = ref('')
const showInstall = computed(() => saved.value?.mode === 'ssh' && saved.value.account_runtimes && form.mode === 'ssh' && !dirty.value)
watch(busy, value => emit('busy', value))
watch(() => [form.host, form.port], () => { probe.value = null })
watch(dirty, () => { pending.value = null; output.value = '' })
// Each mode has its own default port: the saved one when going back to the saved mode.
watch(() => form.mode, (mode, old) => {
  if (!saved.value || mode === old) return
  if (mode === saved.value.mode) form.port = saved.value.port
  else if (mode === 'controller') form.port = DEFAULT_CONTROLLER_PORT
  else if (mode === 'ssh') form.port = SSH_PORT
})
function clearSecrets() { secrets.password = ''; secrets.private_key = ''; secrets.passphrase = ''; secrets.admin_key = ''; secrets.api_key = ''; controllerCa.value = '' }
function assign(config: RemoteConfig) {
  saved.value = config
  requestPolicy.value = structuredClone(normalizePolicy(config.request_policy))
  for (const key of Object.keys(defaults) as Array<keyof typeof defaults>) Object.assign(form, { [key]: config[key] ?? defaults[key] })
  for (const key of IMAGE_KEYS) images[key] = config.images?.[key] || ''
  network.pool = config.network?.pool || '10.0.0.0/8'
  network.allocation = config.network?.allocation || 'random'
  install.host = config.mode === 'ssh' ? config.host || '' : ''
  install.port = DEFAULT_CONTROLLER_PORT
  install.email = ''
  installError.value = ''
  clearSecrets()
}
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await action() } catch (e) {
    const known = reasonDisplay(e)
    error.value = e instanceof FormError ? e.message : known && 'key' in known ? t(known.key) : t('ccgateway.remote.failed')
  } finally { busy.value = false }
}
async function load() { assign(await api.get<RemoteConfig>(base)) }
/** Re-reads the saved configuration after the runtime card changed it (an applied upload writes images.<role>). */
async function reloadQuietly() { try { if (!dirty.value) assign(await api.get<RemoteConfig>(base)) } catch { /* the next load shows it */ } }
function controllerProblemMessage(problem: NonNullable<ReturnType<typeof controllerFormProblem>>): string {
  return t({ target: 'ccgateway.remote.controllerRequired', runtimes: 'ccgateway.remote.controllerRuntimes', adminKey: 'ccgateway.remote.controllerKeyRequired', ca: 'ccgateway.remote.controllerCaInvalid' }[problem])
}
async function save() {
  if (props.disabled) return
  const config = publicConfig.value
  if (config.mode === 'disabled') return
  if (config.mode === 'ssh') {
    if (!config.host || !config.user || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535 || !config.host_key_fingerprint) throw new FormError(t('ccgateway.remote.required'))
    if (config.auth_mode === 'password' && passwordNeeded.value && !secrets.password || config.auth_mode === 'private_key' && keyNeeded.value && !secrets.private_key.trim()) throw new FormError(t('ccgateway.remote.newCredentials'))
  }
  if (config.mode === 'controller') {
    const problem = controllerFormProblem({ host: config.host, port: config.port, account_runtimes: config.account_runtimes, admin_key: secrets.admin_key, has_admin_key: controllerKeyKept.value, controller_ca: controllerCa.value })
    if (problem) throw new FormError(controllerProblemMessage(problem))
  }
  // The control panel keeps no SSH fields (the core clears them, §53.2): they are not sent.
  const payload: Record<string, unknown> = config.mode === 'controller' ? { account_runtimes: config.account_runtimes, mode: config.mode, host: config.host, port: config.port } : { ...config }
  for (const [key, value] of Object.entries(modeSecrets.value)) if (value) payload[key] = value
  if (config.mode === 'controller' && controllerCa.value.trim()) payload.controller_ca = controllerCa.value.trim()
  const bad = IMAGE_KEYS.map(k => imagesPayload.value[k]).find(ref => ref && !IMAGE_RE.test(ref))
  if (bad) { imageError.value = t('ccgateway.remote.imageInvalid', { ref: bad }); return }
  imageError.value = ''
  if (!validRequestPolicy(requestPolicy.value)) { imageError.value = t('ccgateway.policy.invalid'); return }
  payload.request_policy = requestPolicy.value
  // A PUT with images replaces all of them: keep the gateway (Caddy) override the form does not edit.
  const gateway = saved.value?.images?.gateway
  payload.images = gateway ? { ...imagesPayload.value, gateway } : imagesPayload.value
  const rebuildNetwork = networkChanged.value && config.account_runtimes
  payload.network = { pool: network.pool.trim() || '10.0.0.0/8', allocation: network.allocation }
  const response = await api.put<RemoteConfig>(base, payload, { signal: AbortSignal.timeout(55000) })
  assign(response); runtimeRevision.value++; probe.value = null; pending.value = null
  notice.value = t(rebuildNetwork ? 'ccgateway.remote.networkSaved' : 'ccgateway.remote.saved'); emit('saved')
}
/** Install failure: the translated reason, with the failed stage of gateway_unreachable. */
function installFailure(e: unknown): string {
  const message = describe(e) || t('ccgateway.remote.failed')
  const stage = reasonOf(e) === 'gateway_unreachable' ? installStage(e) : ''
  return stage ? t('ccgateway.controllerInstall.withStage', { reason: message, stage: t(`ccgateway.controllerInstall.stage.${stage}`) }) : message
}
/** POST /system/ccgateway/controller/install: installs the controller and the HTTPS gateway over SSH, then the saved mode is controller (§53.3). */
async function installController() {
  if (props.disabled || busy.value || !showInstall.value) return
  error.value = ''; notice.value = ''; installError.value = ''
  const body = controllerInstallBody({ host: install.host.trim() || saved.value?.host || '', port: install.port, email: install.email })
  if (!body) { installError.value = t('ccgateway.controllerInstall.invalid'); return }
  const ok = await confirm({ title: t('ccgateway.controllerInstall.confirmTitle'), message: t('ccgateway.controllerInstall.confirmMessage', { port: body.port }), confirmText: t('ccgateway.controllerInstall.submit') })
  if (!ok || busy.value) return
  busy.value = true; installing.value = true
  try {
    assign(await api.post<RemoteConfig>('/system/ccgateway/controller/install', body, { signal: AbortSignal.timeout(INSTALL_TIMEOUT_MS) }))
    runtimeRevision.value++
    notice.value = t('ccgateway.controllerInstall.done'); emit('saved')
  } catch (e) {
    // Without a reason the request itself failed (a front proxy timeout, a dropped connection) while the
    // install may have finished in the core: the saved mode tells.
    const after = reasonOf(e) ? null : await api.get<RemoteConfig>(base).catch(() => null)
    if (after?.mode === 'controller') {
      assign(after); runtimeRevision.value++
      notice.value = t('ccgateway.controllerInstall.doneLate'); emit('saved')
    } else installError.value = installFailure(e)
  } finally { busy.value = false; installing.value = false }
}
async function fingerprint() {
  const host = publicConfig.value.host, port = publicConfig.value.port
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error(t('ccgateway.remote.targetRequired'))
  const data = await api.post<{ fingerprint: string }>('/system/ccgateway/remote-fingerprint', { host, port }, { signal: AbortSignal.timeout(55000) })
  if (publicConfig.value.host === host && publicConfig.value.port === port) probe.value = { fingerprint: data.fingerprint, host, port }
}
function useFingerprint() {
  if (!probe.value || probe.value.host !== publicConfig.value.host || probe.value.port !== publicConfig.value.port) return
  form.host_key_fingerprint = probe.value.fingerprint
  probe.value = null
}
async function test() { output.value = ''; output.value = (await api.post<{ output: string }>('/system/ccgateway/remote-test', {}, { signal: AbortSignal.timeout(55000) })).output }
async function execute(action: Action) {
  pending.value = null
  output.value = ''
  output.value = (await api.post<{ output: string }>('/system/ccgateway/remote-action', { action }, { signal: AbortSignal.timeout(55000) })).output
}
function choose(action: Action) {
  if (!canOperate.value || saved.value?.mode !== 'ssh') return
  if (action === 'stop' || action === 'restart') { pending.value = action; return }
  void run(() => execute(action))
}
onMounted(() => run(load))
onBeforeUnmount(clearSecrets)
</script>

<template>
  <section class="space-y-4" :aria-label="t('ccgateway.settingsTabs.label')">
      <nav v-if="saved" class="flex gap-1 overflow-x-auto border-b border-gray-200 pb-2 dark:border-dark-700" :aria-label="t('ccgateway.settingsTabs.label')">
        <button v-for="tab in settingsTabs.filter(tab => form.account_runtimes || !['network', 'deployment', 'accounts'].includes(tab))" :key="tab" type="button" :data-testid="'settings-tab-' + tab" :aria-current="activeTab === tab ? 'page' : undefined" class="shrink-0 rounded-lg px-4 py-2 text-sm font-medium" :class="activeTab === tab ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-800'" @click="activeTab = tab">{{ t('ccgateway.settingsTabs.' + tab) }}</button>
      </nav>
    <div v-show="activeTab !== 'accounts'" class="card space-y-4 border border-gray-200 p-5 dark:border-dark-700" data-testid="settings-card">
    <div v-show="activeTab === 'connection'"><h3 class="font-semibold">{{ t('ccgateway.remote.title') }}</h3><p class="mt-1 text-sm text-gray-500">{{ t('ccgateway.remote.description') }}</p></div>
    <p v-show="activeTab === 'connection'" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300" data-testid="remote-routing-hint">{{ isController ? t('ccgateway.remote.controllerHint') : t('ccgateway.remote.routingHint') }}</p>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p><p v-if="notice" role="status" class="text-sm text-emerald-600">{{ notice }}</p>
    <button v-if="!saved" type="button" class="btn btn-secondary btn-sm" :disabled="disabled" @click="run(load)">{{ t('ccgateway.remote.reload') }}</button>
    <form v-else novalidate class="space-y-4" @submit.prevent="run(save)">

      <fieldset :disabled="disabled" class="space-y-4">
      <div v-show="activeTab === 'connection'" class="space-y-3" data-testid="settings-connection">
 <label class="flex items-center gap-2"><input v-model="form.account_runtimes" type="checkbox" />{{ t('ccgateway.runtime.enable') }}</label>
 <p class="text-sm text-gray-500">{{ t('ccgateway.runtime.setup') }}</p>
        <label class="block text-sm">{{ t('ccgateway.remote.mode') }}<select v-model="form.mode" class="input mt-1 w-full" data-testid="remote-mode"><option disabled value="disabled">{{ t('ccgateway.remote.unconfigured') }}</option><option value="local">{{ t('ccgateway.remote.local') }}</option><option value="ssh">{{ t('ccgateway.remote.ssh') }}</option><option value="controller">{{ t('ccgateway.remote.controller') }}</option></select></label>
        <template v-if="form.mode === 'ssh'">
          <div class="grid gap-3 sm:grid-cols-3">
            <label class="block text-sm sm:col-span-2">{{ t('ccgateway.remote.host') }}<input v-model="form.host" class="input mt-1 w-full" autocomplete="off" data-testid="remote-host" required /></label>
            <label class="block text-sm">{{ t('ccgateway.remote.port') }}<input v-model="form.port" type="number" min="1" max="65535" class="input mt-1 w-full" data-testid="remote-port" required /></label>
          </div>
          <label class="block text-sm">{{ t('ccgateway.remote.user') }}<input v-model="form.user" autocomplete="off" class="input mt-1 w-full" data-testid="remote-user" required /></label>
          <label class="block text-sm">{{ t('ccgateway.remote.authMode') }}<select v-model="form.auth_mode" class="input mt-1 w-full" data-testid="remote-auth"><option value="password">{{ t('ccgateway.remote.password') }}</option><option value="private_key">{{ t('ccgateway.remote.privateKey') }}</option></select></label>
          <p v-if="targetChanged" class="text-sm text-amber-700 dark:text-amber-300">{{ t('ccgateway.remote.newCredentials') }}</p>
          <label v-if="form.auth_mode === 'password'" class="block text-sm">{{ t('ccgateway.remote.password') }}<input v-model="secrets.password" type="password" autocomplete="new-password" class="input mt-1 w-full" :required="passwordNeeded" :placeholder="saved.has_password && !targetChanged ? t('ccgateway.remote.keepSecret') : ''" data-testid="remote-password" /></label>
          <template v-else>
            <label class="block text-sm">{{ t('ccgateway.remote.privateKey') }}<textarea v-model="secrets.private_key" autocomplete="off" spellcheck="false" rows="5" class="input mt-1 w-full font-mono text-xs" :required="keyNeeded" :placeholder="saved.has_private_key && !targetChanged ? t('ccgateway.remote.keepSecret') : ''" data-testid="remote-private-key" /></label>
            <label class="block text-sm">{{ t('ccgateway.remote.passphrase') }}<input v-model="secrets.passphrase" type="password" autocomplete="new-password" class="input mt-1 w-full" :placeholder="saved.has_passphrase && !targetChanged ? t('ccgateway.remote.keepSecret') : ''" data-testid="remote-passphrase" /></label>
          </template>
          <p class="text-xs text-gray-500">{{ t('ccgateway.remote.secretsHint') }}</p>
          <label class="block text-sm">{{ t('ccgateway.remote.fingerprint') }}<input v-model="form.host_key_fingerprint" class="input mt-1 w-full font-mono text-xs" placeholder="SHA256:…" data-testid="remote-fingerprint" required /></label>
          <button type="button" class="btn btn-secondary btn-sm" data-testid="remote-probe" @click="run(fingerprint)">{{ t('ccgateway.remote.probe') }}</button>
          <div v-if="probe" class="space-y-2 rounded-lg border border-amber-200 p-3 text-sm"><p>{{ t('ccgateway.remote.verifyFingerprint') }}</p><code class="block break-all">{{ probe.fingerprint }}</code><button type="button" class="btn btn-secondary btn-sm" data-testid="use-fingerprint" @click="useFingerprint">{{ t('ccgateway.remote.useFingerprint') }}</button></div>
        </template>
        <template v-else-if="form.mode === 'controller'">
          <div class="grid gap-3 sm:grid-cols-3">
            <label class="block text-sm sm:col-span-2">{{ t('ccgateway.remote.controllerHost') }}<input v-model="form.host" class="input mt-1 w-full" autocomplete="off" spellcheck="false" :placeholder="t('ccgateway.remote.controllerHostPlaceholder')" data-testid="controller-host" required /></label>
            <label class="block text-sm">{{ t('ccgateway.remote.controllerPort') }}<input v-model="form.port" type="number" min="1" max="65535" class="input mt-1 w-full" data-testid="controller-port" required /></label>
          </div>
          <label class="block text-sm">{{ t('ccgateway.remote.controllerKey') }}<input v-model="secrets.admin_key" type="password" autocomplete="new-password" class="input mt-1 w-full" :placeholder="controllerKeyKept ? t('ccgateway.remote.keepSecret') : ''" :required="!controllerKeyKept" data-testid="controller-admin-key" /></label>
          <p class="text-xs text-gray-500">{{ t('ccgateway.remote.controllerKeyHint') }}</p>
          <label class="block text-sm">{{ t('ccgateway.remote.controllerCa') }}<textarea v-model="controllerCa" autocomplete="off" spellcheck="false" rows="5" class="input mt-1 w-full font-mono text-xs" placeholder="-----BEGIN CERTIFICATE-----" data-testid="controller-ca" /></label>
          <p v-if="saved.mode === 'controller' && saved.has_controller_ca && saved.controller_ca_fingerprint" class="break-all font-mono text-xs text-gray-500" data-testid="controller-ca-fingerprint">{{ t('ccgateway.remote.controllerCaSaved', { fingerprint: saved.controller_ca_fingerprint }) }}</p>
          <p v-if="saved.mode === 'controller' && saved.has_controller_ca && controllerTargetChanged && !controllerCa.trim()" class="text-sm text-amber-700 dark:text-amber-300" data-testid="controller-ca-reset">{{ t('ccgateway.remote.controllerCaReset') }}</p>
          <p class="text-xs text-gray-500">{{ t('ccgateway.remote.controllerCaHint') }}</p>
        </template>
        <template v-if="!isController">
        <div class="grid gap-3 sm:grid-cols-2"><label v-for="key in (form.account_runtimes ? ['admin_key'] as const : ['admin_key','api_key'] as const)" :key="key" class="block text-sm">{{ t(`ccgateway.remote.${key}`) }}<input v-model="secrets[key]" type="password" autocomplete="new-password" class="input mt-1 w-full" :data-testid="key" :placeholder="saved[`has_${key}`] ? t('ccgateway.remote.keepSecret') : ''" /></label></div>
        <p class="text-xs text-gray-500">{{ t('ccgateway.remote.keysHint') }}</p>
        </template>
      </div>
        <RequestPolicySettings v-show="activeTab === 'requests' || activeTab === 'attachments'" v-model="requestPolicy" :section="activeTab === 'attachments' ? 'attachments' : 'requests'" @cc="activeTab = 'attachments'" />
        <p v-if="imageError" role="alert" class="text-sm text-red-600">{{ imageError }}</p>
        <div v-if="form.account_runtimes" class="space-y-2" data-testid="remote-images">
          <div v-show="activeTab === 'network'" class="space-y-3">
          <label class="block text-sm">{{ t('ccgateway.remote.networkPool') }}<input v-model="network.pool" class="input mt-1 w-full font-mono text-xs" placeholder="10.0.0.0/8" autocomplete="off" spellcheck="false" data-testid="network-pool" /></label>
          <label class="block text-sm">{{ t('ccgateway.remote.networkAllocation') }}<select v-model="network.allocation" class="input mt-1 w-full" data-testid="network-allocation"><option value="random">{{ t('ccgateway.remote.networkRandom') }}</option><option value="sequential">{{ t('ccgateway.remote.networkSequential') }}</option></select></label>
          <p class="text-xs text-gray-500">{{ t('ccgateway.remote.networkHint') }}</p>
          </div>
          <RuntimeInstall v-show="activeTab === 'deployment'" :key="runtimeRevision" :mode="saved.mode" :account-runtimes="saved.account_runtimes" :has-admin-key="saved.has_admin_key" :disabled="disabled || dirty" @changed="reloadQuietly">
          <p class="text-sm font-medium">{{ t('ccgateway.remote.images') }}</p>
          <div class="grid gap-3 sm:grid-cols-3">
            <label v-for="key in IMAGE_KEYS" :key="key" class="block min-w-0 text-sm">{{ t(`ccgateway.remote.image${key[0].toUpperCase()}${key.slice(1)}`) }}<input v-model="images[key]" autocomplete="off" spellcheck="false" class="input mt-1 w-full font-mono text-xs" :data-testid="`image-${key}`" /><span v-if="saved.effective_images?.[key]" class="mt-1 block break-all text-xs text-gray-500">{{ t('ccgateway.remote.imageEffective', { image: saved.effective_images[key] }) }}</span></label>
          </div>
          <p class="text-xs text-gray-500">{{ t('ccgateway.remote.imagesHint') }}</p>
          </RuntimeInstall>
        </div>
        <div class="flex justify-end border-t border-gray-100 bg-white py-3 dark:border-dark-700 dark:bg-dark-900"><button class="btn btn-primary" :disabled="!dirty || form.mode === 'disabled'" data-testid="remote-save">{{ t('ccgateway.settingsTabs.save') }}</button></div>
      </fieldset>
    </form>
    <div v-if="showInstall" v-show="activeTab === 'connection'" class="space-y-3 border-t border-gray-200 pt-4 dark:border-dark-700" data-testid="controller-install">
      <div><h4 class="text-sm font-semibold">{{ t('ccgateway.controllerInstall.title') }}</h4><p class="mt-1 text-sm text-gray-500">{{ t('ccgateway.controllerInstall.hint') }}</p></div>
      <fieldset :disabled="disabled" class="space-y-3">
        <div class="grid gap-3 sm:grid-cols-3">
          <label class="block text-sm sm:col-span-2">{{ t('ccgateway.controllerInstall.host') }}<input v-model="install.host" class="input mt-1 w-full" autocomplete="off" spellcheck="false" :placeholder="saved?.host" data-testid="controller-install-host" /></label>
          <label class="block text-sm">{{ t('ccgateway.controllerInstall.port') }}<input v-model="install.port" type="number" min="1" max="65535" class="input mt-1 w-full" placeholder="443" data-testid="controller-install-port" /></label>
        </div>
        <p class="text-xs text-gray-500">{{ t('ccgateway.controllerInstall.hostHint') }}</p>
        <label class="block text-sm">{{ t('ccgateway.controllerInstall.email') }}<input v-model="install.email" type="email" class="input mt-1 w-full" autocomplete="off" spellcheck="false" data-testid="controller-install-email" /></label>
        <p class="text-xs text-gray-500">{{ t('ccgateway.controllerInstall.emailHint') }}</p>
      </fieldset>
      <p v-if="installError" role="alert" class="text-sm text-red-600" data-testid="controller-install-error">{{ installError }}</p>
      <div class="flex flex-wrap items-center gap-3">
        <SButton type="button" variant="primary" size="sm" :loading="installing" :disabled="disabled" data-testid="controller-install-submit" @click="installController">{{ t('ccgateway.controllerInstall.submit') }}</SButton>
        <span v-if="installing" class="text-xs text-gray-500">{{ t('ccgateway.controllerInstall.installing') }}</span>
      </div>
    </div>
    <div v-if="!saved?.account_runtimes || saved.mode === 'controller'" v-show="activeTab === 'connection'" class="space-y-3 border-t border-gray-200 pt-4 dark:border-dark-700">
      <p class="text-xs text-gray-500">{{ dirty ? t('ccgateway.remote.saveFirst') : saved?.mode === 'controller' ? t('ccgateway.remote.controllerSavedOnly') : t('ccgateway.remote.savedOnly') }}</p>
      <div class="flex flex-wrap gap-2"><button class="btn btn-secondary btn-sm" :disabled="!canOperate" data-testid="remote-test" @click="run(test)">{{ t('ccgateway.remote.test') }}</button><template v-if="saved?.mode !== 'controller'"><button v-for="action in (['status','start','stop','restart','logs'] as const)" :key="action" class="btn btn-secondary btn-sm" :disabled="!canOperate" :data-testid="`remote-${action}`" @click="choose(action)">{{ t(`ccgateway.remote.actions.${action}`) }}</button></template></div>
      <div v-if="pending" role="alert" class="space-y-2 text-sm"><p>{{ t('ccgateway.remote.confirmAction', { action: t(`ccgateway.remote.actions.${pending}`) }) }}</p><button class="btn btn-danger btn-sm" :disabled="!canOperate" data-testid="remote-confirm" @click="run(() => execute(pending!))">{{ t('ccgateway.remote.confirm') }}</button><button class="btn btn-secondary btn-sm ml-2" :disabled="disabled" @click="pending = null">{{ t('ccgateway.remote.cancel') }}</button></div>
      <pre v-if="output" class="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-3 text-xs text-gray-100" data-testid="remote-output">{{ output }}</pre>
    </div>
    </div>
    <div v-if="saved?.account_runtimes" v-show="activeTab === 'accounts'" data-testid="settings-accounts"><slot name="accounts" /></div>
  </section>

</template>
