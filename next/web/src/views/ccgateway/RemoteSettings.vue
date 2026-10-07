<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import RuntimeInstall from './RuntimeInstall.vue'
import RequestPolicySettings from './RequestPolicySettings.vue'
import { defaultRequestPolicy, validRequestPolicy, type RequestPolicy } from './requestPolicy'



interface RuntimeImages { app: string; egress: string; controller: string }
interface RemoteConfig {
  account_runtimes: boolean; mode: 'disabled' | 'local' | 'ssh'; host: string; port: number; user: string; auth_mode: 'password' | 'private_key'
  host_key_fingerprint: string; has_password: boolean; has_private_key: boolean; has_passphrase: boolean; has_admin_key: boolean; has_api_key: boolean
  request_policy?: Partial<RequestPolicy>
  images?: Partial<RuntimeImages> | null
  effective_images?: Partial<RuntimeImages>
  network?: { pool: string; allocation: 'random' | 'sequential' }
}
type Action = 'status' | 'start' | 'stop' | 'restart' | 'logs'
const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ (event: 'saved'): void; (event: 'busy', value: boolean): void }>()
const { t } = useI18n()
const base = '/system/ccgateway/remote-config'
const IMAGE_KEYS = ['app', 'egress', 'controller'] as const
// Same rule as the core: repository[:tag][@sha256:digest], or a local image id.
const IMAGE_RE = /^(?:[a-z0-9][a-z0-9._/-]{0,127}(?::[A-Za-z0-9._-]{1,128})?(?:@sha256:[0-9a-f]{64})?|sha256:[0-9a-f]{64})$/
const requestPolicy = ref<RequestPolicy>(defaultRequestPolicy())
const normalizePolicy = (policy?: Partial<RequestPolicy>): RequestPolicy => ({ ...defaultRequestPolicy(), ...policy, attachment_source: policy?.attachment_source || 'client', attachment_sources: { ...(policy?.attachment_sources || {}) }, environment_fields: { ...(policy?.environment_fields || {}) }, unknown_client_attachment: policy?.unknown_client_attachment || 'pass', unknown_gateway_attachment: policy?.unknown_gateway_attachment || 'pass' })
const policyChanged = computed(() => JSON.stringify(requestPolicy.value) !== JSON.stringify(normalizePolicy(saved.value?.request_policy)))
const runtimeRevision = ref(0)
const images = reactive<RuntimeImages>({ app: '', egress: '', controller: '' })
const network = reactive({ pool: '10.0.0.0/8', allocation: 'random' as 'random' | 'sequential' })
const networkChanged = computed(() => network.pool.trim() !== (saved.value?.network?.pool || '10.0.0.0/8') || network.allocation !== (saved.value?.network?.allocation || 'random'))
const imagesPayload = computed<RuntimeImages>(() => ({ app: images.app.trim(), egress: images.egress.trim(), controller: images.controller.trim() }))
const imagesChanged = computed(() => IMAGE_KEYS.some(k => imagesPayload.value[k] !== (saved.value?.images?.[k] || '')))

const defaults = { account_runtimes: false, mode: 'local' as const, host: '', port: 22, user: '', auth_mode: 'password' as const, host_key_fingerprint: '' }
const form = reactive<{ account_runtimes: boolean; mode: RemoteConfig['mode']; host: string; port: number | string; user: string; auth_mode: RemoteConfig['auth_mode']; host_key_fingerprint: string }>({ ...defaults })
const secrets = reactive({ password: '', private_key: '', passphrase: '', admin_key: '', api_key: '' })
const saved = ref<RemoteConfig | null>(null), busy = ref(false), error = ref(''), notice = ref(''), output = ref(''), imageError = ref('')
const probe = ref<{ fingerprint: string; host: string; port: number } | null>(null)
const pending = ref<Action | null>(null)
const publicConfig = computed(() => ({ ...form, host: form.host.trim(), port: Number(form.port), user: form.user.trim(), host_key_fingerprint: form.host_key_fingerprint.trim() }))
const targetChanged = computed(() => !!saved.value && (publicConfig.value.host !== saved.value.host || publicConfig.value.port !== saved.value.port || publicConfig.value.user !== saved.value.user))
const dirty = computed(() => !saved.value || Object.entries(publicConfig.value).some(([key, value]) => saved.value?.[key as keyof RemoteConfig] !== value) || Object.values(secrets).some(Boolean) || imagesChanged.value || networkChanged.value || policyChanged.value)
const canOperate = computed(() => !busy.value && !props.disabled && saved.value?.mode === 'ssh' && !dirty.value)
const passwordNeeded = computed(() => targetChanged.value || !saved.value?.has_password)
const keyNeeded = computed(() => targetChanged.value || !saved.value?.has_private_key)
const disabled = computed(() => busy.value || props.disabled)
watch(busy, value => emit('busy', value))
watch(() => [form.host, form.port], () => { probe.value = null })
watch(dirty, () => { pending.value = null; output.value = '' })
function clearSecrets() { secrets.password = ''; secrets.private_key = ''; secrets.passphrase = ''; secrets.admin_key = ''; secrets.api_key = '' }
function assign(config: RemoteConfig) {
  saved.value = config
  requestPolicy.value = structuredClone(normalizePolicy(config.request_policy))
  for (const key of Object.keys(defaults) as Array<keyof typeof defaults>) Object.assign(form, { [key]: config[key] ?? defaults[key] })
  for (const key of IMAGE_KEYS) images[key] = config.images?.[key] || ''
  network.pool = config.network?.pool || '10.0.0.0/8'
  network.allocation = config.network?.allocation || 'random'
  clearSecrets()
}
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await action() } catch {
    error.value = t('ccgateway.remote.failed')
  } finally { busy.value = false }
}
async function load() { assign(await api.get<RemoteConfig>(base)) }
async function save() {
  if (props.disabled) return
  const config = publicConfig.value
  if (config.mode === 'disabled') return
  if (config.mode === 'ssh') {
    if (!config.host || !config.user || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535 || !config.host_key_fingerprint) throw new Error(t('ccgateway.remote.required'))
    if (config.auth_mode === 'password' && passwordNeeded.value && !secrets.password || config.auth_mode === 'private_key' && keyNeeded.value && !secrets.private_key.trim()) throw new Error(t('ccgateway.remote.newCredentials'))
  }
  const payload: Record<string, unknown> = { ...config }
  for (const [key, value] of Object.entries(secrets)) if (value) payload[key] = value
  const bad = IMAGE_KEYS.map(k => imagesPayload.value[k]).find(ref => ref && !IMAGE_RE.test(ref))
  if (bad) { imageError.value = t('ccgateway.remote.imageInvalid', { ref: bad }); return }
  imageError.value = ''
  if (!validRequestPolicy(requestPolicy.value)) { imageError.value = t('ccgateway.policy.invalid'); return }
  payload.request_policy = requestPolicy.value
  payload.images = imagesPayload.value
  const rebuildNetwork = networkChanged.value && config.account_runtimes
  payload.network = { pool: network.pool.trim() || '10.0.0.0/8', allocation: network.allocation }
  const response = await api.put<RemoteConfig>(base, payload, { signal: AbortSignal.timeout(55000) })
  assign(response); runtimeRevision.value++; probe.value = null; pending.value = null
  notice.value = t(rebuildNetwork ? 'ccgateway.remote.networkSaved' : 'ccgateway.remote.saved'); emit('saved')
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
  if (!canOperate.value) return
  if (action === 'stop' || action === 'restart') { pending.value = action; return }
  void run(() => execute(action))
}
onMounted(() => run(load))
onBeforeUnmount(clearSecrets)
</script>

<template>
  <section class="card space-y-4 border border-gray-200 p-5 dark:border-dark-700" :aria-label="t('ccgateway.remote.title')">
    <div><h3 class="font-semibold">{{ t('ccgateway.remote.title') }}</h3><p class="mt-1 text-sm text-gray-500">{{ t('ccgateway.remote.description') }}</p></div>
    <p class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">{{ t('ccgateway.remote.routingHint') }}</p>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p><p v-if="notice" role="status" class="text-sm text-emerald-600">{{ notice }}</p>
    <button v-if="!saved" type="button" class="btn btn-secondary btn-sm" :disabled="disabled" @click="run(load)">{{ t('ccgateway.remote.reload') }}</button>
    <form v-else class="space-y-4" @submit.prevent="run(save)">
      <fieldset :disabled="disabled" class="space-y-4">
 <label class="flex items-center gap-2"><input v-model="form.account_runtimes" type="checkbox" />{{ t('ccgateway.runtime.enable') }}</label>
 <p class="text-sm text-gray-500">{{ t('ccgateway.runtime.setup') }}</p>
        <label class="block text-sm">{{ t('ccgateway.remote.mode') }}<select v-model="form.mode" class="input mt-1 w-full" data-testid="remote-mode"><option disabled value="disabled">{{ t('ccgateway.remote.unconfigured') }}</option><option value="local">{{ t('ccgateway.remote.local') }}</option><option value="ssh">{{ t('ccgateway.remote.ssh') }}</option></select></label>
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
        <div class="grid gap-3 sm:grid-cols-2"><label v-for="key in (form.account_runtimes ? ['admin_key'] as const : ['admin_key','api_key'] as const)" :key="key" class="block text-sm">{{ t(`ccgateway.remote.${key}`) }}<input v-model="secrets[key]" type="password" autocomplete="new-password" class="input mt-1 w-full" :data-testid="key" :placeholder="saved[`has_${key}`] ? t('ccgateway.remote.keepSecret') : ''" /></label></div>
        <p class="text-xs text-gray-500">{{ t('ccgateway.remote.keysHint') }}</p>
        <RequestPolicySettings v-model="requestPolicy" />
        <p v-if="imageError" role="alert" class="text-sm text-red-600">{{ imageError }}</p>
        <div v-if="form.account_runtimes" class="space-y-2" data-testid="remote-images">
          <label class="block text-sm">{{ t('ccgateway.remote.networkPool') }}<input v-model="network.pool" class="input mt-1 w-full font-mono text-xs" placeholder="10.0.0.0/8" autocomplete="off" spellcheck="false" data-testid="network-pool" /></label>
          <label class="block text-sm">{{ t('ccgateway.remote.networkAllocation') }}<select v-model="network.allocation" class="input mt-1 w-full" data-testid="network-allocation"><option value="random">{{ t('ccgateway.remote.networkRandom') }}</option><option value="sequential">{{ t('ccgateway.remote.networkSequential') }}</option></select></label>
          <p class="text-xs text-gray-500">{{ t('ccgateway.remote.networkHint') }}</p>
          <RuntimeInstall :key="runtimeRevision" :disabled="disabled || dirty">
          <p class="text-sm font-medium">{{ t('ccgateway.remote.images') }}</p>
          <div class="grid gap-3 sm:grid-cols-3">
            <label v-for="key in IMAGE_KEYS" :key="key" class="block min-w-0 text-sm">{{ t(`ccgateway.remote.image${key[0].toUpperCase()}${key.slice(1)}`) }}<input v-model="images[key]" autocomplete="off" spellcheck="false" class="input mt-1 w-full font-mono text-xs" :data-testid="`image-${key}`" /><span v-if="saved.effective_images?.[key]" class="mt-1 block break-all text-xs text-gray-500">{{ t('ccgateway.remote.imageEffective', { image: saved.effective_images[key] }) }}</span></label>
          </div>
          <p class="text-xs text-gray-500">{{ t('ccgateway.remote.imagesHint') }}</p>
          </RuntimeInstall>
        </div>
        <div class="flex justify-end"><button class="btn btn-primary" :disabled="!dirty || form.mode === 'disabled'" data-testid="remote-save">{{ t('ccgateway.remote.save') }}</button></div>
      </fieldset>
    </form>
    <div v-if="!saved?.account_runtimes" class="space-y-3 border-t border-gray-200 pt-4 dark:border-dark-700">
      <p class="text-xs text-gray-500">{{ dirty ? t('ccgateway.remote.saveFirst') : t('ccgateway.remote.savedOnly') }}</p>
      <div class="flex flex-wrap gap-2"><button class="btn btn-secondary btn-sm" :disabled="!canOperate" data-testid="remote-test" @click="run(test)">{{ t('ccgateway.remote.test') }}</button><button v-for="action in (['status','start','stop','restart','logs'] as const)" :key="action" class="btn btn-secondary btn-sm" :disabled="!canOperate" :data-testid="`remote-${action}`" @click="choose(action)">{{ t(`ccgateway.remote.actions.${action}`) }}</button></div>
      <div v-if="pending" role="alert" class="space-y-2 text-sm"><p>{{ t('ccgateway.remote.confirmAction', { action: t(`ccgateway.remote.actions.${pending}`) }) }}</p><button class="btn btn-danger btn-sm" :disabled="!canOperate" data-testid="remote-confirm" @click="run(() => execute(pending!))">{{ t('ccgateway.remote.confirm') }}</button><button class="btn btn-secondary btn-sm ml-2" :disabled="disabled" @click="pending = null">{{ t('ccgateway.remote.cancel') }}</button></div>
      <pre v-if="output" class="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-3 text-xs text-gray-100" data-testid="remote-output">{{ output }}</pre>
    </div>
  </section>

</template>
