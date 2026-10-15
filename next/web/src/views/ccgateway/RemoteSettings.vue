<script setup lang="ts">
// CCGateway settings. Per-account containers are the only mode; the core reaches
// them through the controller (CONTRACTS §53.9). The connection tab has two parts:
// - "controller connection": the one way to connect, an HTTPS (or HTTP) endpoint
//   with its admin key, saved with the other settings;
// - "install the controller" (ControllerInstall): optional, on local Docker or
//   over SSH; its credentials never reach PUT remote-config.
// Legacy local / SSH connections saved earlier keep working and are saved back
// unchanged until an install migrates them.
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SCode, SDisclosure, SField, SHint, SInput, SSegmented, SSettingRow, SSettingsGroup, STabLayout, STextarea } from '@sub2api/ui'
import type { CcgRemoteConfig, CcgRuntimeImages } from '@/api/types'
import RuntimeInstall from './RuntimeInstall.vue'
import RequestPolicySettings from './RequestPolicySettings.vue'
import ControllerInstall, { type InstallResult } from './ControllerInstall.vue'
import { defaultRequestPolicy, normalizeRequestPolicy, validRequestPolicy, type RequestPolicy } from './requestPolicy'
import { reasonDisplay, reasonOf } from './ccgAuthFlow'
import { useCcgText } from './ccgError'
import { basePathOf, connectionStateOf, controllerFormProblem, endpointScheme, formatControllerEndpoint, parseControllerEndpoint, schemeOf } from './controllerMode'

interface RuntimeImages { app: string; egress: string; controller: string }
interface RemoteConfig extends CcgRemoteConfig { request_policy?: Partial<RequestPolicy> }
/** Install warnings with a translation (ccgateway.controllerInstall.warnings.*); others are shown as their code. */
const INSTALL_WARNINGS = ['dns_mismatch']
/** A form input problem: its message is shown as is (other failures show a generic text). */
class FormError extends Error {}
const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ (event: 'saved'): void }>()
const { t } = useI18n()
const { reasonLabel } = useCcgText()
const base = '/system/ccgateway/remote-config'
const DEFAULT_POOL = '10.0.0.0/8'
const IMAGE_KEYS = ['app', 'egress', 'controller'] as const
// Same rule as the core: repository[:tag][@sha256:digest], or a local image id.
const IMAGE_RE = /^(?:[a-z0-9][a-z0-9._/-]{0,127}(?::[A-Za-z0-9._-]{1,128})?(?:@sha256:[0-9a-f]{64})?|sha256:[0-9a-f]{64})$/

const saved = ref<RemoteConfig | null>(null)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const output = ref('')
const imageError = ref('')
/** Non-blocking findings of a successful install (warnings of the response, e.g. dns_mismatch). */
const installWarnings = ref<string[]>([])
const installOpen = ref(false)
const disabled = computed(() => busy.value || props.disabled)

const settingsTabs = ['connection', 'network', 'cc', 'deployment'] as const
const activeTab = ref<typeof settingsTabs[number]>(location.hash === '#ccgateway-runtime' ? 'deployment' : 'connection')
const tabItems = computed(() => settingsTabs.map(key => ({ key, label: t('ccgateway.settingsTabs.' + key) })))
const allocationOptions = computed(() => [{ value: 'random', label: t('ccgateway.remote.networkRandom') }, { value: 'sequential', label: t('ccgateway.remote.networkSequential') }])
/** Bumped after a save or install: the runtime card reads the runtime again. */
const runtimeRevision = ref(0)

// ---------------------------------------------------------------- the other tabs (images, network, request policy)

const requestPolicy = ref<RequestPolicy>(defaultRequestPolicy())
const images = reactive<RuntimeImages>({ app: '', egress: '', controller: '' })
const network = reactive({ pool: DEFAULT_POOL, allocation: 'random' as 'random' | 'sequential' })
const policyChanged = computed(() => JSON.stringify(requestPolicy.value) !== JSON.stringify(normalizeRequestPolicy(saved.value?.request_policy)))
const networkChanged = computed(() => network.pool.trim() !== (saved.value?.network?.pool || DEFAULT_POOL) || network.allocation !== (saved.value?.network?.allocation || 'random'))
const imagesPayload = computed<RuntimeImages>(() => ({ app: images.app.trim(), egress: images.egress.trim(), controller: images.controller.trim() }))
const imagesChanged = computed(() => IMAGE_KEYS.some(k => imagesPayload.value[k] !== (saved.value?.images?.[k] || '')))
/** Unsaved settings of the other tabs would be replaced by the configuration an install returns. */
const otherDirty = computed(() => imagesChanged.value || networkChanged.value || policyChanged.value)
const imageLabel = (key: typeof IMAGE_KEYS[number]) => t(`ccgateway.remote.image${key[0].toUpperCase()}${key.slice(1)}`)

// ---------------------------------------------------------------- controller connection

const endpoint = ref('')
/** Write-only like the SSH secrets: '' keeps the saved key while the endpoint and certificate are unchanged (§53.2). */
const adminKey = ref('')
/** Root certificates (PEM, HTTPS only); '' keeps the saved ones while the endpoint is unchanged. */
const controllerCa = ref('')
/** The optional self-signed root certificate is tucked away (folded again on every load): public certificates (domain names) need none. */
const caKey = ref(0)
/** The endpoint input parsed into what PUT remote-config takes, or null. */
const parsedEndpoint = computed(() => parseControllerEndpoint(endpoint.value))
const https = computed(() => (parsedEndpoint.value?.scheme ?? endpointScheme(endpoint.value)) === 'https')
const connectionState = computed(() => connectionStateOf(saved.value))
const savedController = computed(() => connectionState.value === 'connected')
const caTyped = computed(() => https.value && !!controllerCa.value.trim())
/** Nothing typed into the connection form of an unconnected configuration. */
const connUntouched = computed(() => !endpoint.value.trim() && !adminKey.value && !controllerCa.value.trim())
/** Saving other settings keeps a legacy connection as it is. */
const keepLegacy = computed(() => connectionState.value === 'legacy' && connUntouched.value)
const endpointOf = (c: CcgRemoteConfig) => formatControllerEndpoint(schemeOf(c), c.host, c.port, basePathOf(c))
const controllerTargetChanged = computed(() => {
  const p = parsedEndpoint.value, s = saved.value
  return !savedController.value || !p || !s || p.scheme !== schemeOf(s) || p.host !== s.host || p.port !== s.port || p.base_path !== basePathOf(s)
})
/** The saved key is kept only for the same saved endpoint and certificate (§53.2, §53.9). */
const controllerKeyKept = computed(() => !!saved.value?.has_admin_key && !controllerTargetChanged.value && !caTyped.value)
const connectionDirty = computed(() => (savedController.value ? controllerTargetChanged.value || !!adminKey.value || caTyped.value : !connUntouched.value))
const dirty = computed(() => !saved.value || connectionDirty.value || otherDirty.value)
const canTest = computed(() => !disabled.value && savedController.value && !dirty.value)
const savedEndpoint = computed(() => (saved.value ? endpointOf(saved.value) : ''))
const caResetWarning = computed(() => savedController.value && !!saved.value?.has_controller_ca && controllerTargetChanged.value && !controllerCa.value.trim())
const savedCaFingerprint = computed(() => (savedController.value && saved.value?.has_controller_ca ? saved.value.controller_ca_fingerprint || '' : ''))
const testHint = computed(() => t(!savedController.value ? 'ccgateway.remote.testUnavailable' : dirty.value ? 'ccgateway.remote.saveFirst' : 'ccgateway.remote.testHint'))
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
function forgetHealth() {
  healthSeq++
  Object.assign(health, { loading: false, version: '', failed: false, reason: '' })
}
const healthText = computed(() => {
  if (health.loading) return t('ccgateway.remote.status.checking')
  if (health.version) return t('ccgateway.remote.status.version', { version: health.version })
  if (!health.failed) return ''
  const reason = reasonLabel(health.reason)
  return reason ? t('ccgateway.remote.status.unreachable', { reason }) : t('ccgateway.remote.status.unreachableUnknown')
})
/** The connection notice: title and hint per state. */
const connectionNotice = computed(() => {
  const s = saved.value
  if (connectionState.value === 'connected') return { title: t('ccgateway.remote.status.connected', { url: savedEndpoint.value }), hint: healthText.value }
  if (connectionState.value === 'legacy') return { title: t('ccgateway.remote.status.legacy', { mode: t(`ccgateway.remote.${s?.mode}`) }), hint: t('ccgateway.remote.status.legacyHint') }
  return { title: t('ccgateway.remote.status.unconfigured'), hint: t('ccgateway.remote.status.unconfiguredHint') }
})

// ---------------------------------------------------------------- load / save

function assign(config: RemoteConfig) {
  saved.value = config
  requestPolicy.value = structuredClone(normalizeRequestPolicy(config.request_policy))
  for (const key of IMAGE_KEYS) images[key] = config.images?.[key] || ''
  network.pool = config.network?.pool || DEFAULT_POOL
  network.allocation = config.network?.allocation || 'random'
  const controller = config.mode === 'controller'
  endpoint.value = controller && config.host ? endpointOf(config) : ''
  adminKey.value = ''
  controllerCa.value = ''
  output.value = ''
  caKey.value++
  installOpen.value = !controller
  if (controller) void loadHealth()
  else forgetHealth()
}
function clearMessages() {
  error.value = ''
  notice.value = ''
  installWarnings.value = []
}
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  clearMessages()
  try {
    await action()
  } catch (e) {
    const known = reasonDisplay(e)
    error.value = e instanceof FormError ? e.message : known && 'key' in known ? t(known.key) : t('ccgateway.remote.failed')
  } finally {
    busy.value = false
  }
}
async function load() { assign(await api.get<RemoteConfig>(base)) }
/** Re-reads the saved configuration after the runtime card changed it (an applied upload writes images.<role>). */
async function reloadQuietly() {
  try {
    if (!dirty.value) await load()
  } catch {
    // the next load shows it
  }
}
/** The connection part of PUT remote-config: the legacy connection as saved, or the controller endpoint. */
function connectionPayload(s: RemoteConfig): Record<string, unknown> {
  if (keepLegacy.value) return { mode: s.mode, host: s.host, port: s.port, user: s.user, auth_mode: s.auth_mode, host_key_fingerprint: s.host_key_fingerprint }
  if (!savedController.value && connUntouched.value) throw new FormError(t('ccgateway.remote.connectFirst'))
  const ep = parsedEndpoint.value
  const problem = controllerFormProblem({ endpoint: ep, admin_key: adminKey.value, has_admin_key: controllerKeyKept.value, controller_ca: controllerCa.value })
  if (problem || !ep) throw new FormError(t({ target: 'ccgateway.remote.controllerRequired', adminKey: 'ccgateway.remote.controllerKeyRequired', ca: 'ccgateway.remote.controllerCaInvalid' }[problem || 'target']))
  // Only the endpoint and its key: the core clears every SSH field (§53.2).
  return {
    mode: 'controller', scheme: ep.scheme, host: ep.host, port: ep.port, base_path: ep.base_path,
    ...(adminKey.value ? { admin_key: adminKey.value } : {}),
    ...(caTyped.value ? { controller_ca: controllerCa.value.trim() } : {})
  }
}
/** Images and request policy are checked here; their problem is shown above the save button. */
function otherSettingsProblem(): string {
  const bad = IMAGE_KEYS.map(k => imagesPayload.value[k]).find(ref => ref && !IMAGE_RE.test(ref))
  if (bad) return t('ccgateway.remote.imageInvalid', { ref: bad })
  return validRequestPolicy(requestPolicy.value) ? '' : t('ccgateway.policy.invalid')
}
async function save() {
  const s = saved.value
  if (props.disabled || !s) return
  const connection = connectionPayload(s)
  imageError.value = otherSettingsProblem()
  if (imageError.value) return
  // A PUT with images replaces all of them: keep the gateway (Caddy) override the form does not edit.
  const gateway = s.images?.gateway
  const rebuildNetwork = networkChanged.value
  const response = await api.put<RemoteConfig>(base, {
    // Per-account containers are the only mode: every save keeps them on.
    account_runtimes: true,
    ...connection,
    request_policy: normalizeRequestPolicy(requestPolicy.value),
    images: gateway ? { ...imagesPayload.value, gateway } : imagesPayload.value,
    network: { pool: network.pool.trim() || DEFAULT_POOL, allocation: network.allocation }
  }, { signal: AbortSignal.timeout(55000) })
  assign(response)
  runtimeRevision.value++
  notice.value = t(rebuildNetwork ? 'ccgateway.remote.networkSaved' : 'ccgateway.remote.saved')
  emit('saved')
}
async function test() {
  output.value = ''
  output.value = (await api.post<{ output: string }>('/system/ccgateway/remote-test', {}, { signal: AbortSignal.timeout(55000) })).output
}

function onInstalled(config: InstallResult, late: boolean) {
  const { warnings, ...rest } = config
  assign(rest)
  installOpen.value = false
  runtimeRevision.value++
  installWarnings.value = (Array.isArray(warnings) ? warnings : []).filter((w): w is string => typeof w === 'string' && !!w)
  notice.value = t(`ccgateway.controllerInstall.${late ? 'doneLate' : 'done'}`, { url: endpointOf(config), port: config.port })
  emit('saved')
}
function installWarning(code: string): string {
  return INSTALL_WARNINGS.includes(code) ? t(`ccgateway.controllerInstall.warnings.${code}`) : code
}

onMounted(() => run(load))
onBeforeUnmount(() => {
  healthSeq++
  adminKey.value = ''
  controllerCa.value = ''
})
</script>

<template>
  <STabLayout v-model="activeTab" :tabs="tabItems" :show-tabs="!!saved" :aria-label="t('ccgateway.settingsTabs.label')" data-testid="settings-tabs">
    <div class="space-y-4" data-testid="settings-card">
      <div v-show="activeTab === 'connection'">
        <h4 class="text-base font-semibold text-fg">{{ t('ccgateway.remote.title') }}</h4>
        <SHint class="mt-1">{{ t('ccgateway.remote.description') }}</SHint>
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
                <template #title><span class="break-all">{{ connectionNotice.title }}</span></template>
                <p class="text-xs" :data-testid="connectionState === 'connected' ? 'controller-version' : undefined">{{ connectionNotice.hint }}</p>
              </SAlert>
            </div>
            <SSettingRow :label="t('ccgateway.remote.controllerEndpoint')" :description="t('ccgateway.remote.controllerEndpointHint')" stacked>
              <div class="w-full space-y-2">
                <SInput v-model="endpoint" type="url" inputmode="url" mono autocomplete="off" spellcheck="false" placeholder="https://controller.example.com:18443/controller" data-testid="controller-endpoint" />
                <SAlert v-if="!https" tone="warning" dense data-testid="controller-http-warning">{{ t('ccgateway.remote.httpWarning') }}</SAlert>
              </div>
            </SSettingRow>
            <SSettingRow :label="t('ccgateway.remote.controllerKey')" :description="t('ccgateway.remote.controllerKeyHint')" stacked>
              <SInput v-model="adminKey" type="password" autocomplete="new-password" :placeholder="controllerKeyKept ? t('ccgateway.remote.keepSecret') : ''" :required="!controllerKeyKept" data-testid="controller-admin-key" />
            </SSettingRow>
            <div v-if="https" class="space-y-2 py-4">
              <SHint v-if="caResetWarning" tone="warning" data-testid="controller-ca-reset">{{ t('ccgateway.remote.controllerCaReset') }}</SHint>
              <SDisclosure :key="caKey" :label="t('ccgateway.remote.controllerCaAdvanced')" data-testid="controller-ca-toggle">
                <div class="space-y-2" data-testid="controller-ca-panel">
                  <SField :label="t('ccgateway.remote.controllerCa')">
                    <STextarea v-model="controllerCa" mono :rows="5" autocomplete="off" spellcheck="false" class="text-xs" placeholder="-----BEGIN CERTIFICATE-----" data-testid="controller-ca" />
                  </SField>
                  <p v-if="savedCaFingerprint" class="break-all font-mono" data-testid="controller-ca-fingerprint">{{ t('ccgateway.remote.controllerCaSaved', { fingerprint: savedCaFingerprint }) }}</p>
                  <p>{{ t('ccgateway.remote.controllerCaHint') }}</p>
                </div>
              </SDisclosure>
            </div>
            <SSettingRow :label="t('ccgateway.remote.test')" :description="testHint">
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
                <SInput v-model="network.pool" mono class="w-full sm:w-64" :placeholder="DEFAULT_POOL" autocomplete="off" spellcheck="false" data-testid="network-pool" />
              </SSettingRow>
              <SSettingRow :label="t('ccgateway.remote.networkAllocation')">
                <SSegmented :model-value="network.allocation" :options="allocationOptions" size="sm" :disabled="disabled" :aria-label="t('ccgateway.remote.networkAllocation')" data-testid="network-allocation" @update:model-value="network.allocation = $event as typeof network.allocation" />
              </SSettingRow>
            </SSettingsGroup>
            <RuntimeInstall v-show="activeTab === 'deployment'" :key="runtimeRevision" :mode="saved.mode" :account-runtimes="saved.account_runtimes" :has-admin-key="saved.has_admin_key" :disabled="disabled || dirty" @changed="reloadQuietly">
              <SSettingsGroup :title="t('ccgateway.remote.images')" :description="t('ccgateway.remote.imagesHint')" data-testid="settings-images">
                <SSettingRow v-for="key in IMAGE_KEYS" :key="key" :label="imageLabel(key)" :description="saved.effective_images?.[key] ? t('ccgateway.remote.imageEffective', { image: saved.effective_images[key] }) : ''">
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
      <ControllerInstall
        v-if="saved"
        v-show="activeTab === 'connection'"
        v-model:open="installOpen"
        :saved="saved"
        :disabled="disabled"
        :blocked="otherDirty"
        @busy="busy = $event"
        @start="clearMessages"
        @installed="onInstalled"
      />
    </div>
    <!-- Deployment: the runtime and its images (saved with the form above), then the account containers they run. -->
    <div v-if="saved" v-show="activeTab === 'deployment'" data-testid="settings-accounts"><slot name="accounts" /></div>
  </STabLayout>
</template>
