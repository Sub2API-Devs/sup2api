<script setup lang="ts">
// CCGateway settings. Per-account containers are the only mode; the core reaches
// them through the controller (CONTRACTS §53.9). The connection tab has two parts:
// - "controller connection": the one way to connect, an HTTPS (or HTTP) endpoint
//   with its admin key, saved with the other settings;
// - "install the controller": optional, on local Docker or over SSH. The SSH
//   credentials only travel in the install request (never in PUT remote-config)
//   and are cleared after a successful install or when leaving the page.
// Legacy local / SSH connections saved earlier keep working and are saved back
// unchanged until an install migrates them.
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, confirm } from '@sub2api/ui'
import type { CcgRemoteConfig, CcgRuntimeImages } from '@/api/types'
import RuntimeInstall from './RuntimeInstall.vue'
import RequestPolicySettings from './RequestPolicySettings.vue'
import { defaultRequestPolicy, validRequestPolicy, type RequestPolicy } from './requestPolicy'
import { knownReason, reasonDisplay, reasonOf } from './ccgAuthFlow'
import { useCcgError } from './ccgError'
import {
  AUTO_PORT_START, DEFAULT_SSH_PORT, basePathOf, controllerFormProblem, controllerInstallBody, defaultInstallHost, endpointScheme, formatControllerEndpoint,
  installEmailApplies, installStage, isDomainHost, parseControllerEndpoint, schemeOf, validPort, type ControllerInstallBody, type ControllerScheme, type InstallMethod
} from './controllerMode'

interface RuntimeImages { app: string; egress: string; controller: string }
interface RemoteConfig extends CcgRemoteConfig { request_policy?: Partial<RequestPolicy> }
/** POST controller/install: the saved configuration, plus findings that did not stop the install (§53.9). */
interface InstallResult extends RemoteConfig { warnings?: string[] }
/** Install warnings with a translation (ccgateway.controllerInstall.warnings.*); others are shown as their code. */
const INSTALL_WARNINGS = ['dns_mismatch']
/** A form input problem: its message is shown as is (other failures show a generic text). */
class FormError extends Error {}
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
const saved = ref<RemoteConfig | null>(null), busy = ref(false), error = ref(''), notice = ref(''), output = ref(''), imageError = ref('')
const disabled = computed(() => busy.value || props.disabled)
watch(busy, value => emit('busy', value))

// ---------------------------------------------------------------- controller connection

const conn = reactive({ endpoint: '' })
/** Write-only like the SSH secrets: '' keeps the saved key while the endpoint and certificate are unchanged (§53.2). */
const adminKey = ref('')
/** Root certificates (PEM, HTTPS only); '' keeps the saved ones while the endpoint is unchanged. */
const controllerCa = ref('')
/** The endpoint input parsed into what PUT remote-config takes, or null. */
const parsedEndpoint = computed(() => parseControllerEndpoint(conn.endpoint))
const https = computed(() => (parsedEndpoint.value?.scheme ?? endpointScheme(conn.endpoint)) === 'https')
const savedController = computed(() => saved.value?.mode === 'controller')
/** A local / SSH connection saved with per-account containers before §53.9: still honored, shown as legacy. */
const legacy = computed(() => !!saved.value?.account_runtimes && (saved.value.mode === 'ssh' || saved.value.mode === 'local'))
const connectionState = computed<'connected' | 'legacy' | 'unconfigured'>(() => (savedController.value ? 'connected' : legacy.value ? 'legacy' : 'unconfigured'))
const caTyped = computed(() => https.value && !!controllerCa.value.trim())
/** Nothing typed into the connection form of an unconnected configuration. */
const connUntouched = computed(() => !conn.endpoint.trim() && !adminKey.value && !controllerCa.value.trim())
/** Saving other settings keeps a legacy connection as it is. */
const keepLegacy = computed(() => legacy.value && connUntouched.value)
const controllerTargetChanged = computed(() => {
  const p = parsedEndpoint.value, s = saved.value
  return !savedController.value || !p || !s || p.scheme !== schemeOf(s) || p.host !== s.host || p.port !== s.port || p.base_path !== basePathOf(s)
})
/** The saved key is kept only for the same saved endpoint and certificate (§53.2, §53.9). */
const controllerKeyKept = computed(() => !!saved.value?.has_admin_key && !controllerTargetChanged.value && !caTyped.value)
const connectionDirty = computed(() => (savedController.value ? controllerTargetChanged.value || !!adminKey.value || caTyped.value : !connUntouched.value))
const dirty = computed(() => !saved.value || connectionDirty.value || imagesChanged.value || networkChanged.value || policyChanged.value)
const canTest = computed(() => !disabled.value && savedController.value && !dirty.value)
const savedEndpoint = computed(() => (saved.value ? formatControllerEndpoint(schemeOf(saved.value), saved.value.host, saved.value.port, basePathOf(saved.value)) : ''))
/** The optional self-signed root certificate is tucked away: public certificates (domain names) need none. */
const caOpen = ref(false)
watch(dirty, () => { output.value = '' })

/** Version of the connected controller (GET runtime → installed.version, §53.6). */
const health = reactive({ loading: false, version: '', failed: false, reason: '' })
let healthSeq = 0
async function loadHealth() {
  const seq = ++healthSeq
  Object.assign(health, { loading: true, version: '', failed: false, reason: '' })
  try {
    const info = await api.get<CcgRuntimeImages>('/system/ccgateway/runtime', undefined, { signal: AbortSignal.timeout(60000) })
    if (seq !== healthSeq) return
    Object.assign(health, { version: info?.installed?.version || '', failed: !info?.installed, reason: info?.reason || '' })
  } catch (e) {
    if (seq === healthSeq) Object.assign(health, { failed: true, reason: reasonOf(e) })
  } finally {
    if (seq === healthSeq) health.loading = false
  }
}
const healthReason = computed(() => {
  const known = knownReason(health.reason)
  return known ? t(`ccgateway.reason.${known}`) : health.reason
})

// ---------------------------------------------------------------- controller install (§53.9)

const install = reactive({ method: 'ssh' as 'local' | 'ssh', scheme: 'https' as ControllerScheme, host: '', port: '' as number | string, email: '' })
const sshForm = reactive({ host: '', port: DEFAULT_SSH_PORT as number | string, user: '', auth_mode: 'password' as 'password' | 'private_key', host_key_fingerprint: '' })
const sshSecrets = reactive({ password: '', private_key: '', passphrase: '' })
/** Legacy SSH connection still saved: the install may use it (the request then names no method). */
const canUseSavedSsh = computed(() => saved.value?.mode === 'ssh' && !!saved.value.account_runtimes)
const useSavedSsh = ref(false)
const installMethod = computed<InstallMethod>(() => (install.method === 'ssh' && canUseSavedSsh.value && useSavedSsh.value ? 'saved' : install.method))
const savedSshTarget = computed(() => (saved.value ? `${saved.value.user}@${saved.value.host}:${saved.value.port}` : ''))
const installDefaultHost = computed(() => defaultInstallHost({ method: installMethod.value, ssh: { ...sshForm, ...sshSecrets }, savedSshHost: saved.value?.host || '' }))
const installTargetHost = computed(() => install.host.trim() || installDefaultHost.value)
const installEmailShown = computed(() => installEmailApplies(install.scheme, installTargetHost.value))
/** How the gateway gets its certificate (§53.9): ACME for a domain name, Caddy's internal CA (pinned) otherwise; none over HTTP. */
const installCert = computed<'acme' | 'internal' | null>(() => (install.scheme === 'http' || !installTargetHost.value ? null : isDomainHost(installTargetHost.value) ? 'acme' : 'internal'))
const installOpen = ref(false), installing = ref(false), installError = ref('')
/** Non-blocking findings of a successful install (warnings of the response, e.g. dns_mismatch). */
const installWarnings = ref<string[]>([])
const installProbe = ref<{ fingerprint: string; host: string; port: number } | null>(null)
/** Unsaved settings of the other tabs would be replaced by the configuration the install returns. */
const otherDirty = computed(() => imagesChanged.value || networkChanged.value || policyChanged.value)
watch(() => [sshForm.host, sshForm.port], () => { installProbe.value = null })

function clearInstall() {
  Object.assign(sshForm, { host: '', port: DEFAULT_SSH_PORT, user: '', auth_mode: 'password', host_key_fingerprint: '' })
  Object.assign(sshSecrets, { password: '', private_key: '', passphrase: '' })
  Object.assign(install, { method: 'ssh', scheme: 'https', host: '', port: '', email: '' })
  installProbe.value = null
}
function clearSecrets() { adminKey.value = ''; controllerCa.value = ''; clearInstall() }

function assign(config: RemoteConfig) {
  saved.value = config
  requestPolicy.value = structuredClone(normalizePolicy(config.request_policy))
  for (const key of IMAGE_KEYS) images[key] = config.images?.[key] || ''
  network.pool = config.network?.pool || '10.0.0.0/8'
  network.allocation = config.network?.allocation || 'random'
  const controller = config.mode === 'controller'
  conn.endpoint = controller && config.host ? formatControllerEndpoint(schemeOf(config), config.host, config.port, basePathOf(config)) : ''
  adminKey.value = ''; controllerCa.value = ''; output.value = ''; caOpen.value = false
  installOpen.value = !controller
  useSavedSsh.value = config.mode === 'ssh' && !!config.account_runtimes
  if (controller) void loadHealth()
  else { healthSeq++; Object.assign(health, { loading: false, version: '', failed: false, reason: '' }) }
}
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''; installWarnings.value = []
  try { await action() } catch (e) {
    const known = reasonDisplay(e)
    error.value = e instanceof FormError ? e.message : known && 'key' in known ? t(known.key) : t('ccgateway.remote.failed')
  } finally { busy.value = false }
}
async function load() { assign(await api.get<RemoteConfig>(base)) }
/** Re-reads the saved configuration after the runtime card changed it (an applied upload writes images.<role>). */
async function reloadQuietly() { try { if (!dirty.value) assign(await api.get<RemoteConfig>(base)) } catch { /* the next load shows it */ } }
async function save() {
  if (props.disabled || !saved.value) return
  // Per-account containers are the only mode: every save keeps them on.
  const payload: Record<string, unknown> = { account_runtimes: true }
  if (keepLegacy.value) {
    const s = saved.value
    Object.assign(payload, { mode: s.mode, host: s.host, port: s.port, user: s.user, auth_mode: s.auth_mode, host_key_fingerprint: s.host_key_fingerprint })
  } else {
    if (!savedController.value && connUntouched.value) throw new FormError(t('ccgateway.remote.connectFirst'))
    const endpoint = parsedEndpoint.value
    const problem = controllerFormProblem({ endpoint, admin_key: adminKey.value, has_admin_key: controllerKeyKept.value, controller_ca: controllerCa.value })
    if (problem || !endpoint) throw new FormError(t({ target: 'ccgateway.remote.controllerRequired', adminKey: 'ccgateway.remote.controllerKeyRequired', ca: 'ccgateway.remote.controllerCaInvalid' }[problem || 'target']))
    // Only the endpoint and its key: the core clears every SSH field (§53.2).
    Object.assign(payload, { mode: 'controller', scheme: endpoint.scheme, host: endpoint.host, port: endpoint.port, base_path: endpoint.base_path })
    if (adminKey.value) payload.admin_key = adminKey.value
    if (caTyped.value) payload.controller_ca = controllerCa.value.trim()
  }
  const bad = IMAGE_KEYS.map(k => imagesPayload.value[k]).find(ref => ref && !IMAGE_RE.test(ref))
  if (bad) { imageError.value = t('ccgateway.remote.imageInvalid', { ref: bad }); return }
  imageError.value = ''
  if (!validRequestPolicy(requestPolicy.value)) { imageError.value = t('ccgateway.policy.invalid'); return }
  payload.request_policy = requestPolicy.value
  // A PUT with images replaces all of them: keep the gateway (Caddy) override the form does not edit.
  const gateway = saved.value.images?.gateway
  payload.images = gateway ? { ...imagesPayload.value, gateway } : imagesPayload.value
  const rebuildNetwork = networkChanged.value
  payload.network = { pool: network.pool.trim() || '10.0.0.0/8', allocation: network.allocation }
  const response = await api.put<RemoteConfig>(base, payload, { signal: AbortSignal.timeout(55000) })
  assign(response); runtimeRevision.value++
  notice.value = t(rebuildNetwork ? 'ccgateway.remote.networkSaved' : 'ccgateway.remote.saved'); emit('saved')
}
async function test() { output.value = ''; output.value = (await api.post<{ output: string }>('/system/ccgateway/remote-test', {}, { signal: AbortSignal.timeout(55000) })).output }

/** Install failure: the translated reason, with the failed stage of gateway_unreachable. */
function installFailure(e: unknown): string {
  const message = describe(e) || t('ccgateway.remote.failed')
  const stage = reasonOf(e) === 'gateway_unreachable' ? installStage(e) : ''
  return stage ? t('ccgateway.controllerInstall.withStage', { reason: message, stage: t(`ccgateway.controllerInstall.stage.${stage}`) }) : message
}
function installConfirmMessage(body: ControllerInstallBody): string {
  const target = body.ssh ? `${body.ssh.user}@${body.ssh.host}:${body.ssh.port}` : savedSshTarget.value
  const where = t(`ccgateway.controllerInstall.where.${installMethod.value}`, { target })
  const port = body.port || t('ccgateway.controllerInstall.autoPort', { start: AUTO_PORT_START[body.scheme] })
  const parts = [t('ccgateway.controllerInstall.confirmMessage', { where, scheme: body.scheme.toUpperCase(), port, host: body.host })]
  if (body.scheme === 'http') parts.push(t('ccgateway.controllerInstall.confirmHttp'))
  if (legacy.value) parts.push(t('ccgateway.controllerInstall.confirmLegacy'))
  else if (savedController.value) parts.push(t('ccgateway.controllerInstall.confirmReplace'))
  return parts.join('\n\n')
}
/** The configuration now connects to the endpoint the install asked for. */
function installedAs(config: RemoteConfig, body: ControllerInstallBody): boolean {
  return config.mode === 'controller' && config.host.toLowerCase() === body.host.toLowerCase() && schemeOf(config) === body.scheme && (body.port === 0 || config.port === body.port)
}
function finishInstall(config: InstallResult, key: 'done' | 'doneLate') {
  const { warnings, ...saved } = config
  assign(saved); clearInstall(); installOpen.value = false; runtimeRevision.value++
  installWarnings.value = (Array.isArray(warnings) ? warnings : []).filter((w): w is string => typeof w === 'string' && !!w)
  notice.value = t(`ccgateway.controllerInstall.${key}`, { url: formatControllerEndpoint(schemeOf(config), config.host, config.port, basePathOf(config)), port: config.port })
  emit('saved')
}
function installWarning(code: string): string {
  return INSTALL_WARNINGS.includes(code) ? t(`ccgateway.controllerInstall.warnings.${code}`) : code
}
/** POST /system/ccgateway/controller/install: installs the controller and its gateway, then the saved connection is that endpoint (§53.9). */
async function installController() {
  if (props.disabled || busy.value || !saved.value) return
  error.value = ''; notice.value = ''; installError.value = ''; installWarnings.value = []
  if (otherDirty.value) { installError.value = t('ccgateway.controllerInstall.saveOthersFirst'); return }
  const built = controllerInstallBody({ method: installMethod.value, ssh: { ...sshForm, ...sshSecrets }, savedSshHost: saved.value.host || '', scheme: install.scheme, host: install.host, port: install.port, email: install.email })
  if ('problem' in built) { installError.value = t(`ccgateway.controllerInstall.problem.${built.problem}`); return }
  const body = built.body
  const ok = await confirm({ title: t('ccgateway.controllerInstall.confirmTitle'), message: installConfirmMessage(body), confirmText: t('ccgateway.controllerInstall.submit') })
  if (!ok || busy.value) return
  busy.value = true; installing.value = true
  try {
    finishInstall(await api.post<InstallResult>('/system/ccgateway/controller/install', body, { signal: AbortSignal.timeout(INSTALL_TIMEOUT_MS) }), 'done')
  } catch (e) {
    // Without a reason the request itself failed (a front proxy timeout, a dropped connection) while the
    // install may have finished in the core: the saved configuration tells.
    const after = reasonOf(e) ? null : await api.get<RemoteConfig>(base).catch(() => null)
    if (after && installedAs(after, body)) finishInstall(after, 'doneLate')
    else installError.value = installFailure(e)
  } finally { busy.value = false; installing.value = false }
}
async function probeFingerprint() {
  if (busy.value) return
  installError.value = ''
  const host = sshForm.host.trim(), port = Number(sshForm.port)
  if (!host || !validPort(port)) { installError.value = t('ccgateway.remote.targetRequired'); return }
  busy.value = true
  try {
    const data = await api.post<{ fingerprint: string }>('/system/ccgateway/remote-fingerprint', { host, port }, { signal: AbortSignal.timeout(55000) })
    if (sshForm.host.trim() === host && Number(sshForm.port) === port) installProbe.value = { fingerprint: data.fingerprint, host, port }
  } catch (e) {
    installError.value = describe(e) || t('ccgateway.remote.failed')
  } finally { busy.value = false }
}
function useFingerprint() {
  if (!installProbe.value || installProbe.value.host !== sshForm.host.trim() || installProbe.value.port !== Number(sshForm.port)) return
  sshForm.host_key_fingerprint = installProbe.value.fingerprint
  installProbe.value = null
}
onMounted(() => run(load))
onBeforeUnmount(() => { healthSeq++; clearSecrets() })
</script>

<template>
  <section class="space-y-4" :aria-label="t('ccgateway.settingsTabs.label')">
      <nav v-if="saved" class="flex gap-1 overflow-x-auto border-b border-gray-200 pb-2 dark:border-dark-700" :aria-label="t('ccgateway.settingsTabs.label')">
        <button v-for="tab in settingsTabs" :key="tab" type="button" :data-testid="'settings-tab-' + tab" :aria-current="activeTab === tab ? 'page' : undefined" class="shrink-0 rounded-lg px-4 py-2 text-sm font-medium" :class="activeTab === tab ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-800'" @click="activeTab = tab">{{ t('ccgateway.settingsTabs.' + tab) }}</button>
      </nav>
    <div v-show="activeTab !== 'accounts'" class="card space-y-4 border border-gray-200 p-5 dark:border-dark-700" data-testid="settings-card">
    <div v-show="activeTab === 'connection'"><h3 class="font-semibold">{{ t('ccgateway.remote.title') }}</h3><p class="mt-1 text-sm text-gray-500">{{ t('ccgateway.remote.description') }}</p></div>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p><p v-if="notice" role="status" class="text-sm text-emerald-600">{{ notice }}</p>
    <p v-for="w in installWarnings" :key="w" role="status" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300" data-testid="controller-install-warning">{{ installWarning(w) }}</p>
    <button v-if="!saved" type="button" class="btn btn-secondary btn-sm" :disabled="disabled" @click="run(load)">{{ t('ccgateway.remote.reload') }}</button>
    <form v-else novalidate class="space-y-4" @submit.prevent="run(save)">

      <fieldset :disabled="disabled" class="min-w-0 space-y-4">
      <section v-show="activeTab === 'connection'" class="space-y-3" data-testid="settings-connection">
        <div><h4 class="text-sm font-semibold">{{ t('ccgateway.remote.connectionTitle') }}</h4><p class="mt-1 text-xs text-gray-500">{{ t('ccgateway.remote.controllerHint') }}</p></div>
        <div class="space-y-1 rounded-lg p-3 text-sm" :class="connectionState === 'connected' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'" data-testid="controller-status" :data-state="connectionState">
          <template v-if="connectionState === 'connected'">
            <p class="break-all font-medium">{{ t('ccgateway.remote.status.connected', { url: savedEndpoint }) }}</p>
            <p class="text-xs" data-testid="controller-version">{{ health.loading ? t('ccgateway.remote.status.checking') : health.version ? t('ccgateway.remote.status.version', { version: health.version }) : health.failed ? (healthReason ? t('ccgateway.remote.status.unreachable', { reason: healthReason }) : t('ccgateway.remote.status.unreachableUnknown')) : '' }}</p>
          </template>
          <template v-else-if="connectionState === 'legacy'">
            <p class="break-all font-medium">{{ t('ccgateway.remote.status.legacy', { mode: t(`ccgateway.remote.${saved.mode}`) }) }}</p>
            <p class="text-xs">{{ t('ccgateway.remote.status.legacyHint') }}</p>
          </template>
          <template v-else>
            <p class="font-medium">{{ t('ccgateway.remote.status.unconfigured') }}</p>
            <p class="text-xs">{{ t('ccgateway.remote.status.unconfiguredHint') }}</p>
          </template>
        </div>
        <label class="block text-sm">{{ t('ccgateway.remote.controllerEndpoint') }}<input v-model="conn.endpoint" type="url" inputmode="url" class="input mt-1 w-full font-mono" autocomplete="off" spellcheck="false" placeholder="https://controller.example.com:18443/controller" data-testid="controller-endpoint" /></label>
        <p class="text-xs text-gray-500">{{ t('ccgateway.remote.controllerEndpointHint') }}</p>
        <p v-if="!https" class="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300" data-testid="controller-http-warning">{{ t('ccgateway.remote.httpWarning') }}</p>
        <label class="block text-sm">{{ t('ccgateway.remote.controllerKey') }}<input v-model="adminKey" type="password" autocomplete="new-password" class="input mt-1 w-full" :placeholder="controllerKeyKept ? t('ccgateway.remote.keepSecret') : ''" :required="!controllerKeyKept" data-testid="controller-admin-key" /></label>
        <p class="text-xs text-gray-500">{{ t('ccgateway.remote.controllerKeyHint') }}</p>
        <template v-if="https">
          <p v-if="savedController && saved.has_controller_ca && controllerTargetChanged && !controllerCa.trim()" class="text-sm text-amber-700 dark:text-amber-300" data-testid="controller-ca-reset">{{ t('ccgateway.remote.controllerCaReset') }}</p>
          <div class="rounded-lg border border-gray-200 dark:border-dark-700">
            <button type="button" class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm" :aria-expanded="caOpen" data-testid="controller-ca-toggle" @click="caOpen = !caOpen">
              <span>{{ t('ccgateway.remote.controllerCaAdvanced') }}</span><span class="text-xs text-gray-500" aria-hidden="true">{{ caOpen ? '▾' : '▸' }}</span>
            </button>
            <div v-if="caOpen" class="space-y-2 border-t border-gray-200 p-3 dark:border-dark-700" data-testid="controller-ca-panel">
              <label class="block text-sm">{{ t('ccgateway.remote.controllerCa') }}<textarea v-model="controllerCa" autocomplete="off" spellcheck="false" rows="5" class="input mt-1 w-full font-mono text-xs" placeholder="-----BEGIN CERTIFICATE-----" data-testid="controller-ca" /></label>
              <p v-if="savedController && saved.has_controller_ca && saved.controller_ca_fingerprint" class="break-all font-mono text-xs text-gray-500" data-testid="controller-ca-fingerprint">{{ t('ccgateway.remote.controllerCaSaved', { fingerprint: saved.controller_ca_fingerprint }) }}</p>
              <p class="text-xs text-gray-500">{{ t('ccgateway.remote.controllerCaHint') }}</p>
            </div>
          </div>
        </template>
        <div class="flex flex-wrap items-center gap-3">
          <button type="button" class="btn btn-secondary btn-sm" :disabled="!canTest" data-testid="remote-test" @click="run(test)">{{ t('ccgateway.remote.test') }}</button>
          <span class="text-xs text-gray-500">{{ !savedController ? t('ccgateway.remote.testUnavailable') : dirty ? t('ccgateway.remote.saveFirst') : t('ccgateway.remote.testHint') }}</span>
        </div>
        <pre v-if="output" class="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-3 text-xs text-gray-100" data-testid="remote-output">{{ output }}</pre>
      </section>
        <RequestPolicySettings v-show="activeTab === 'requests' || activeTab === 'attachments'" v-model="requestPolicy" :section="activeTab === 'attachments' ? 'attachments' : 'requests'" @cc="activeTab = 'attachments'" />
        <p v-if="imageError" role="alert" class="text-sm text-red-600">{{ imageError }}</p>
        <div class="space-y-2" data-testid="remote-images">
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
        <div class="flex justify-end border-t border-gray-100 bg-white py-3 dark:border-dark-700 dark:bg-dark-900"><button class="btn btn-primary" :disabled="!dirty" data-testid="remote-save">{{ t('ccgateway.settingsTabs.save') }}</button></div>
      </fieldset>
    </form>
    <section v-if="saved" v-show="activeTab === 'connection'" class="space-y-3 border-t border-gray-200 pt-4 dark:border-dark-700" data-testid="controller-install">
      <button type="button" class="flex w-full items-center justify-between gap-2 text-left" :aria-expanded="installOpen" data-testid="controller-install-toggle" @click="installOpen = !installOpen">
        <span class="text-sm font-semibold">{{ connectionState === 'connected' ? t('ccgateway.controllerInstall.reinstall') : t('ccgateway.controllerInstall.title') }}</span>
        <span class="text-xs text-gray-500" aria-hidden="true">{{ installOpen ? '▾' : '▸' }}</span>
      </button>
      <div v-if="installOpen" class="space-y-3" data-testid="controller-install-form">
        <p class="text-sm text-gray-500">{{ t('ccgateway.controllerInstall.hint') }}</p>
        <p v-if="legacy" class="text-sm text-amber-700 dark:text-amber-300" data-testid="controller-install-legacy">{{ t('ccgateway.controllerInstall.legacyHint') }}</p>
        <fieldset :disabled="disabled" class="min-w-0 space-y-3">
          <div class="text-sm" role="radiogroup" :aria-label="t('ccgateway.controllerInstall.method')">
            <span class="block">{{ t('ccgateway.controllerInstall.method') }}</span>
            <div class="mt-1 flex flex-wrap gap-4">
              <label class="flex items-center gap-2"><input v-model="install.method" type="radio" value="local" data-testid="install-method" />{{ t('ccgateway.controllerInstall.methodLocal') }}</label>
              <label class="flex items-center gap-2"><input v-model="install.method" type="radio" value="ssh" data-testid="install-method" />{{ t('ccgateway.controllerInstall.methodSsh') }}</label>
            </div>
          </div>
          <p v-if="install.method === 'local'" class="text-xs text-gray-500" data-testid="install-local-hint">{{ t('ccgateway.controllerInstall.localHint') }}</p>
          <template v-else>
            <template v-if="canUseSavedSsh">
              <label class="flex items-start gap-2 text-sm"><input v-model="useSavedSsh" type="checkbox" class="mt-1" data-testid="install-use-saved" /><span class="min-w-0 break-all">{{ t('ccgateway.controllerInstall.useSaved', { target: savedSshTarget }) }}</span></label>
              <p v-if="useSavedSsh" class="text-xs text-gray-500">{{ t('ccgateway.controllerInstall.useSavedHint') }}</p>
            </template>
            <div v-if="installMethod === 'ssh'" class="space-y-3" data-testid="install-ssh">
              <div class="grid gap-3 sm:grid-cols-3">
                <label class="block text-sm sm:col-span-2">{{ t('ccgateway.remote.host') }}<input v-model="sshForm.host" class="input mt-1 w-full" autocomplete="off" spellcheck="false" data-testid="install-ssh-host" /></label>
                <label class="block text-sm">{{ t('ccgateway.remote.port') }}<input v-model="sshForm.port" type="number" min="1" max="65535" class="input mt-1 w-full" data-testid="install-ssh-port" /></label>
              </div>
              <label class="block text-sm">{{ t('ccgateway.remote.user') }}<input v-model="sshForm.user" autocomplete="off" spellcheck="false" class="input mt-1 w-full" data-testid="install-ssh-user" /></label>
              <label class="block text-sm">{{ t('ccgateway.remote.authMode') }}<select v-model="sshForm.auth_mode" class="input mt-1 w-full" data-testid="install-ssh-auth"><option value="password">{{ t('ccgateway.remote.password') }}</option><option value="private_key">{{ t('ccgateway.remote.privateKey') }}</option></select></label>
              <label v-if="sshForm.auth_mode === 'password'" class="block text-sm">{{ t('ccgateway.remote.password') }}<input v-model="sshSecrets.password" type="password" autocomplete="new-password" class="input mt-1 w-full" data-testid="install-ssh-password" /></label>
              <template v-else>
                <label class="block text-sm">{{ t('ccgateway.remote.privateKey') }}<textarea v-model="sshSecrets.private_key" autocomplete="off" spellcheck="false" rows="5" class="input mt-1 w-full font-mono text-xs" data-testid="install-ssh-private-key" /></label>
                <label class="block text-sm">{{ t('ccgateway.remote.passphrase') }}<input v-model="sshSecrets.passphrase" type="password" autocomplete="new-password" class="input mt-1 w-full" data-testid="install-ssh-passphrase" /></label>
              </template>
              <label class="block text-sm">{{ t('ccgateway.remote.fingerprint') }}<input v-model="sshForm.host_key_fingerprint" class="input mt-1 w-full font-mono text-xs" autocomplete="off" spellcheck="false" placeholder="SHA256:…" data-testid="install-ssh-fingerprint" /></label>
              <button type="button" class="btn btn-secondary btn-sm" data-testid="install-ssh-probe" @click="probeFingerprint">{{ t('ccgateway.remote.probe') }}</button>
              <div v-if="installProbe" class="space-y-2 rounded-lg border border-amber-200 p-3 text-sm"><p>{{ t('ccgateway.remote.verifyFingerprint') }}</p><code class="block break-all">{{ installProbe.fingerprint }}</code><button type="button" class="btn btn-secondary btn-sm" data-testid="install-use-fingerprint" @click="useFingerprint">{{ t('ccgateway.remote.useFingerprint') }}</button></div>
              <p class="text-xs text-gray-500">{{ t('ccgateway.controllerInstall.sshHint') }}</p>
            </div>
          </template>
          <div class="space-y-3 border-t border-gray-100 pt-3 dark:border-dark-700">
            <p class="text-sm font-medium">{{ t('ccgateway.controllerInstall.gateway') }}</p>
            <div class="text-sm" role="radiogroup" :aria-label="t('ccgateway.remote.scheme')">
              <span class="block">{{ t('ccgateway.remote.scheme') }}</span>
              <div class="mt-1 flex flex-wrap gap-4">
                <label class="flex items-center gap-2"><input v-model="install.scheme" type="radio" value="https" data-testid="install-scheme" />{{ t('ccgateway.remote.schemeHttps') }}</label>
                <label class="flex items-center gap-2"><input v-model="install.scheme" type="radio" value="http" data-testid="install-scheme" />{{ t('ccgateway.remote.schemeHttp') }}</label>
              </div>
            </div>
            <p v-if="install.scheme === 'http'" class="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300" data-testid="install-http-warning">{{ t('ccgateway.remote.httpWarning') }}</p>
            <div class="grid gap-3 sm:grid-cols-3">
              <label class="block text-sm sm:col-span-2">{{ t('ccgateway.controllerInstall.host') }}<input v-model="install.host" class="input mt-1 w-full" autocomplete="off" spellcheck="false" :placeholder="installDefaultHost" data-testid="install-host" /></label>
              <label class="block text-sm">{{ t('ccgateway.controllerInstall.port') }}<input v-model="install.port" type="number" min="1" max="65535" class="input mt-1 w-full" :placeholder="t('ccgateway.controllerInstall.portPlaceholder')" data-testid="install-port" /></label>
            </div>
            <p class="text-xs text-gray-500">{{ t('ccgateway.controllerInstall.portHint', AUTO_PORT_START) }}</p>
            <p class="text-xs text-gray-500">{{ t('ccgateway.controllerInstall.hostHint') }}</p>
            <p v-if="installCert" class="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-dark-800 dark:text-gray-300" data-testid="install-cert" :data-cert="installCert">{{ t(`ccgateway.controllerInstall.cert.${installCert}`) }}</p>
            <template v-if="installEmailShown">
              <label class="block text-sm">{{ t('ccgateway.controllerInstall.email') }}<input v-model="install.email" type="email" class="input mt-1 w-full" autocomplete="off" spellcheck="false" data-testid="install-email" /></label>
              <p class="text-xs text-gray-500">{{ t('ccgateway.controllerInstall.emailHint') }}</p>
            </template>
          </div>
        </fieldset>
        <p v-if="otherDirty" class="text-xs text-amber-700 dark:text-amber-300" data-testid="controller-install-blocked">{{ t('ccgateway.controllerInstall.saveOthersFirst') }}</p>
        <p v-if="installError" role="alert" class="break-all text-sm text-red-600" data-testid="controller-install-error">{{ installError }}</p>
        <div class="flex flex-wrap items-center gap-3">
          <SButton type="button" variant="primary" size="sm" :loading="installing" :disabled="disabled || otherDirty" data-testid="controller-install-submit" @click="installController">{{ t('ccgateway.controllerInstall.submit') }}</SButton>
          <span v-if="installing" class="text-xs text-gray-500">{{ t('ccgateway.controllerInstall.installing') }}</span>
        </div>
      </div>
    </section>
    </div>
    <div v-if="saved" v-show="activeTab === 'accounts'" data-testid="settings-accounts"><slot name="accounts" /></div>
  </section>

</template>
