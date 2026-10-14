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
import { SAlert, SButton, SCheckbox, SCode, SCopyButton, SDisclosure, SField, SHint, SInput, SSegmented, SSettingRow, SSettingsGroup, STabs, STextarea, confirm } from '@sub2api/ui'
import type { CcgRemoteConfig, CcgRuntimeImages } from '@/api/types'
import RuntimeInstall from './RuntimeInstall.vue'
import RequestPolicySettings from './RequestPolicySettings.vue'
import { defaultRequestPolicy, normalizeRequestPolicy, validRequestPolicy, type RequestPolicy } from './requestPolicy'
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
const policyChanged = computed(() => JSON.stringify(requestPolicy.value) !== JSON.stringify(normalizeRequestPolicy(saved.value?.request_policy)))
const settingsTabs = ['connection', 'network', 'cc', 'deployment'] as const
const activeTab = ref<typeof settingsTabs[number]>(location.hash === '#ccgateway-runtime' ? 'deployment' : 'connection')
const tabItems = computed(() => settingsTabs.map(key => ({ key, label: t('ccgateway.settingsTabs.' + key) })))
const allocationOptions = computed(() => [{ value: 'random', label: t('ccgateway.remote.networkRandom') }, { value: 'sequential', label: t('ccgateway.remote.networkSequential') }])
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
/** The optional self-signed root certificate is tucked away (folded again on every load): public certificates (domain names) need none. */
const caKey = ref(0)
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
const healthText = computed(() => health.loading ? t('ccgateway.remote.status.checking') : health.version ? t('ccgateway.remote.status.version', { version: health.version }) : health.failed ? (healthReason.value ? t('ccgateway.remote.status.unreachable', { reason: healthReason.value }) : t('ccgateway.remote.status.unreachableUnknown')) : '')
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
const methodOptions = computed(() => [{ value: 'local', label: t('ccgateway.controllerInstall.methodLocal') }, { value: 'ssh', label: t('ccgateway.controllerInstall.methodSsh') }])
const schemeOptions = computed(() => [{ value: 'https', label: t('ccgateway.remote.schemeHttps') }, { value: 'http', label: t('ccgateway.remote.schemeHttp') }])
const authModeOptions = computed(() => [{ value: 'password', label: t('ccgateway.remote.password') }, { value: 'private_key', label: t('ccgateway.remote.privateKey') }])
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
  requestPolicy.value = structuredClone(normalizeRequestPolicy(config.request_policy))
  for (const key of IMAGE_KEYS) images[key] = config.images?.[key] || ''
  network.pool = config.network?.pool || '10.0.0.0/8'
  network.allocation = config.network?.allocation || 'random'
  const controller = config.mode === 'controller'
  conn.endpoint = controller && config.host ? formatControllerEndpoint(schemeOf(config), config.host, config.port, basePathOf(config)) : ''
  adminKey.value = ''; controllerCa.value = ''; output.value = ''; caKey.value++
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
  payload.request_policy = normalizeRequestPolicy(requestPolicy.value)
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
    <STabs v-if="saved" v-model="activeTab" :tabs="tabItems" data-testid="settings-tabs" />
    <div class="space-y-4" data-testid="settings-card">
      <div v-show="activeTab === 'connection'">
        <h4 class="text-base font-semibold text-fg">{{ t('ccgateway.remote.title') }}</h4>
        <p class="mt-1 text-sm text-fg-muted">{{ t('ccgateway.remote.description') }}</p>
      </div>
      <SAlert v-if="error" tone="danger" dense>{{ error }}</SAlert>
      <SAlert v-if="notice" tone="success" dense>{{ notice }}</SAlert>
      <SAlert v-for="w in installWarnings" :key="w" tone="warning" data-testid="controller-install-warning">{{ installWarning(w) }}</SAlert>
      <SButton v-if="!saved" size="sm" :disabled="disabled" @click="run(load)">{{ t('ccgateway.remote.reload') }}</SButton>
      <form v-else novalidate class="space-y-4" @submit.prevent="run(save)">
        <fieldset :disabled="disabled" class="min-w-0 space-y-4">
          <SSettingsGroup v-show="activeTab === 'connection'" :title="t('ccgateway.remote.connectionTitle')" :description="t('ccgateway.remote.controllerHint')" data-testid="settings-connection">
            <div class="py-4">
              <SAlert :tone="connectionState === 'connected' ? 'success' : 'warning'" data-testid="controller-status" :data-state="connectionState">
                <template v-if="connectionState === 'connected'">
                  <p class="break-all font-medium">{{ t('ccgateway.remote.status.connected', { url: savedEndpoint }) }}</p>
                  <p class="text-xs" data-testid="controller-version">{{ healthText }}</p>
                </template>
                <template v-else-if="connectionState === 'legacy'">
                  <p class="break-all font-medium">{{ t('ccgateway.remote.status.legacy', { mode: t(`ccgateway.remote.${saved.mode}`) }) }}</p>
                  <p class="text-xs">{{ t('ccgateway.remote.status.legacyHint') }}</p>
                </template>
                <template v-else>
                  <p class="font-medium">{{ t('ccgateway.remote.status.unconfigured') }}</p>
                  <p class="text-xs">{{ t('ccgateway.remote.status.unconfiguredHint') }}</p>
                </template>
              </SAlert>
            </div>
            <SSettingRow :label="t('ccgateway.remote.controllerEndpoint')" :description="t('ccgateway.remote.controllerEndpointHint')" stacked>
              <div class="w-full space-y-2">
                <SInput v-model="conn.endpoint" type="url" inputmode="url" mono autocomplete="off" spellcheck="false" placeholder="https://controller.example.com:18443/controller" data-testid="controller-endpoint" />
                <SAlert v-if="!https" tone="warning" dense data-testid="controller-http-warning">{{ t('ccgateway.remote.httpWarning') }}</SAlert>
              </div>
            </SSettingRow>
            <SSettingRow :label="t('ccgateway.remote.controllerKey')" :description="t('ccgateway.remote.controllerKeyHint')" stacked>
              <SInput v-model="adminKey" type="password" autocomplete="new-password" :placeholder="controllerKeyKept ? t('ccgateway.remote.keepSecret') : ''" :required="!controllerKeyKept" data-testid="controller-admin-key" />
            </SSettingRow>
            <div v-if="https" class="space-y-2 py-4">
              <SHint v-if="savedController && saved.has_controller_ca && controllerTargetChanged && !controllerCa.trim()" tone="warning" data-testid="controller-ca-reset">{{ t('ccgateway.remote.controllerCaReset') }}</SHint>
              <SDisclosure :key="caKey" :label="t('ccgateway.remote.controllerCaAdvanced')" data-testid="controller-ca-toggle">
                <div class="space-y-2" data-testid="controller-ca-panel">
                  <SField :label="t('ccgateway.remote.controllerCa')">
                    <STextarea v-model="controllerCa" mono :rows="5" autocomplete="off" spellcheck="false" class="text-xs" placeholder="-----BEGIN CERTIFICATE-----" data-testid="controller-ca" />
                  </SField>
                  <p v-if="savedController && saved.has_controller_ca && saved.controller_ca_fingerprint" class="break-all font-mono" data-testid="controller-ca-fingerprint">{{ t('ccgateway.remote.controllerCaSaved', { fingerprint: saved.controller_ca_fingerprint }) }}</p>
                  <p>{{ t('ccgateway.remote.controllerCaHint') }}</p>
                </div>
              </SDisclosure>
            </div>
            <SSettingRow :label="t('ccgateway.remote.test')" :description="!savedController ? t('ccgateway.remote.testUnavailable') : dirty ? t('ccgateway.remote.saveFirst') : t('ccgateway.remote.testHint')">
              <SButton size="sm" :disabled="!canTest" data-testid="remote-test" @click="run(test)">{{ t('ccgateway.remote.test') }}</SButton>
            </SSettingRow>
            <div v-if="output" class="py-4">
              <SCode class="max-h-72 overflow-auto" data-testid="remote-output">{{ output }}</SCode>
            </div>
          </SSettingsGroup>
          <RequestPolicySettings v-show="activeTab === 'cc'" v-model="requestPolicy" />
          <SAlert v-if="imageError" tone="danger" dense>{{ imageError }}</SAlert>
          <div class="space-y-4" data-testid="remote-images">
            <SSettingsGroup v-show="activeTab === 'network'" :title="t('ccgateway.settingsTabs.network')" :description="t('ccgateway.remote.networkShort')" data-testid="settings-network">
              <template #details>{{ t('ccgateway.remote.networkHint') }}</template>
              <SSettingRow :label="t('ccgateway.remote.networkPool')">
                <SInput v-model="network.pool" mono class="w-full sm:w-64" placeholder="10.0.0.0/8" autocomplete="off" spellcheck="false" data-testid="network-pool" />
              </SSettingRow>
              <SSettingRow :label="t('ccgateway.remote.networkAllocation')">
                <SSegmented :model-value="network.allocation" @update:model-value="network.allocation = $event as typeof network.allocation" :options="allocationOptions" size="sm" :disabled="disabled" :aria-label="t('ccgateway.remote.networkAllocation')" data-testid="network-allocation" />
              </SSettingRow>
            </SSettingsGroup>
            <RuntimeInstall v-show="activeTab === 'deployment'" :key="runtimeRevision" :mode="saved.mode" :account-runtimes="saved.account_runtimes" :has-admin-key="saved.has_admin_key" :disabled="disabled || dirty" @changed="reloadQuietly">
              <SSettingsGroup :title="t('ccgateway.remote.images')" :description="t('ccgateway.remote.imagesHint')" data-testid="settings-images">
                <SSettingRow v-for="key in IMAGE_KEYS" :key="key" :label="t(`ccgateway.remote.image${key[0].toUpperCase()}${key.slice(1)}`)" :description="saved.effective_images?.[key] ? t('ccgateway.remote.imageEffective', { image: saved.effective_images[key] }) : ''">
                  <SInput v-model="images[key]" mono autocomplete="off" spellcheck="false" class="w-full sm:w-80" :data-testid="`image-${key}`" />
                </SSettingRow>
              </SSettingsGroup>
            </RuntimeInstall>
          </div>
          <div class="flex justify-end border-t border-line bg-surface py-3">
            <SButton type="submit" variant="primary" :disabled="!dirty" data-testid="remote-save">{{ t('ccgateway.settingsTabs.save') }}</SButton>
          </div>
        </fieldset>
      </form>
      <SSettingsGroup v-if="saved" v-show="activeTab === 'connection'" collapsible :open="installOpen" :description="installOpen ? t('ccgateway.controllerInstall.hint') : ''" data-testid="controller-install" @update:open="installOpen = $event">
        <template #title>
          <h5 class="text-sm font-semibold text-fg" data-testid="controller-install-toggle">{{ connectionState === 'connected' ? t('ccgateway.controllerInstall.reinstall') : t('ccgateway.controllerInstall.title') }}</h5>
        </template>
        <div class="divide-y divide-line" data-testid="controller-install-form">
          <SHint v-if="legacy" tone="warning" class="py-3" data-testid="controller-install-legacy">{{ t('ccgateway.controllerInstall.legacyHint') }}</SHint>
          <fieldset :disabled="disabled" class="min-w-0 divide-y divide-line">
            <SSettingRow :label="t('ccgateway.controllerInstall.method')">
              <template #description>
                <span v-if="install.method === 'local'" data-testid="install-local-hint">{{ t('ccgateway.controllerInstall.localHint') }}</span>
                <span v-else>{{ t('ccgateway.controllerInstall.sshHint') }}</span>
              </template>
              <SSegmented :model-value="install.method" @update:model-value="install.method = $event as typeof install.method" :options="methodOptions" size="sm" :disabled="disabled" :aria-label="t('ccgateway.controllerInstall.method')" data-testid="install-method" />
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
                  <SSegmented :model-value="sshForm.auth_mode" @update:model-value="sshForm.auth_mode = $event as typeof sshForm.auth_mode" :options="authModeOptions" size="sm" :disabled="disabled" :aria-label="t('ccgateway.remote.authMode')" data-testid="install-ssh-auth" />
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
                      <SButton size="sm" data-testid="install-ssh-probe" @click="probeFingerprint">{{ t('ccgateway.remote.probe') }}</SButton>
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
                  <SSegmented :model-value="install.scheme" @update:model-value="install.scheme = $event as typeof install.scheme" :options="schemeOptions" size="sm" :disabled="disabled" :aria-label="t('ccgateway.remote.scheme')" data-testid="install-scheme" />
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
            <SHint v-if="otherDirty" tone="warning" size="xs" data-testid="controller-install-blocked">{{ t('ccgateway.controllerInstall.saveOthersFirst') }}</SHint>
            <SAlert v-if="installError" tone="danger" dense data-testid="controller-install-error"><span class="break-all">{{ installError }}</span></SAlert>
            <div class="flex flex-wrap items-center gap-3">
              <SButton variant="primary" size="sm" :loading="installing" :disabled="disabled || otherDirty" data-testid="controller-install-submit" @click="installController">{{ t('ccgateway.controllerInstall.submit') }}</SButton>
              <SHint v-if="installing" inline size="xs">{{ t('ccgateway.controllerInstall.installing') }}</SHint>
            </div>
          </div>
        </div>
      </SSettingsGroup>
    </div>
    <!-- Deployment: the runtime and its images (saved with the form above), then the account containers they run. -->
    <div v-if="saved" v-show="activeTab === 'deployment'" data-testid="settings-accounts"><slot name="accounts" /></div>
  </section>
</template>
