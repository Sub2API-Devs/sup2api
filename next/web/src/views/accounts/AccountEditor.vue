<script setup lang="ts">
// Step 2 of "new account" and the edit form (wireframe A.4, CONTRACTS §18.4):
// connection (basic info, proxy, plugin credentials) / models and mapping /
// scheduling and limits. A new account starts from the plugin's default models
// and mapping (§41); so does an existing account saved without either (see
// shouldPrefillOnEdit).
// A new Claude Code (CCGateway managed) account is authorized before it is
// saved (docs/CCGATEWAY-DRAFT-RUNTIMES.md §5): the credentials card runs the
// draft flow and saving sends the authorized draft as `ccgateway_runtime`. A
// saved one shows its login and can be re-authorized (docs/CCGATEWAY-REAUTH.md):
// the swap is committed by itself and reported with `reauthorized`.
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SchemaForm, SChoiceCards, SField, SHint, SIcon, SInput, SLink, SSegmented, SSelect, SSettingRow, SSettingsGroup, SSpinner, SSwitch, toast } from '@sub2api/ui'
import type { Account, AccountType, ProxyProbeResult } from '@/api/types'
import { schemaWidgets } from '@/components/schema/widgets'
import PluginIframe from '@/components/plugin/PluginIframe.vue'
import PluginSlot from '@/components/plugin/PluginSlot.vue'
import GroupPicker from '@/components/GroupPicker.vue'
import ProxyPicker from '@/components/ProxyPicker.vue'
import { lt } from '@/i18n'
import CCGatewayAccountAuth from '@/views/ccgateway/CCGatewayAccountAuth.vue'
import CCGatewayAccountReauth from '@/views/ccgateway/CCGatewayAccountReauth.vue'
import AccountFeatureSettings from '@/views/ccgateway/AccountFeatureSettings.vue'
import type { AccountFeaturePolicy } from '@/views/ccgateway/requestPolicy'
import { assetURL, usePluginStore } from '@/stores/plugins'
import { useAuthStore } from '@/stores/auth'
import { useProxiesLookup } from '@/composables/lookups'
import { ACCOUNT_KEYS, useOwnership } from '@/composables/useOwnership'
import { errorMessage, fieldErrors, notifyError } from '@/utils/errors'
import { looksLikeProxyURL, parseProxyURL } from '@/utils/proxyUrl'
import AccountEditorNav from './AccountEditorNav.vue'
import AccountModelsCard from './AccountModelsCard.vue'
import FetchedModelsModal from './FetchedModelsModal.vue'
import { accountControl, sameCreationGroup } from './accountTypeChoices'
import ModelLimitsEditor from './ModelLimitsEditor.vue'
import { toCards, type ModelLimitCard } from './modelLimits'
import { shouldPrefillOnEdit } from './modelDefaults'
import { containerLocales, containerTimezones, environmentOptions } from './containerEnvironment'
import { useContainerEnvironment } from './useContainerEnvironment'
import { useModelEdit } from './useModelEdit'
import { useAccountSave } from './useAccountSave'
import { CONNECTION_FIELDS, SCHEDULING_FIELDS, mappingErrorText, modelsErrorText, splitFieldErrors, type EditorSection } from './editorErrors'

const props = defineProps<{ accountType: AccountType | null; accountTypeOptions?: AccountType[]; account?: Account | null }>()
const emit = defineEmits<{ (e: 'change-type', at: AccountType): void; (e: 'saved', a: Account): void; (e: 'cancel'): void; (e: 'back'): void; (e: 'test', a: Account): void; (e: 'reauthorized', a: Account): void }>()
const { t, locale: displayLocale } = useI18n()
const plugins = usePluginStore()
const auth = useAuthStore()
const own = useOwnership()

const editing = computed(() => !!props.account?.id)
const mode = computed(() => props.accountType?.form.mode || 'schema')
// Row-level rights (CONTRACTS §21.1): editing an account needs the all-level
// key or the own-level key on an account the caller created.
const canEditAccount = computed(() => editing.value && own.can(props.account, ACCOUNT_KEYS.update))
const canTestAccount = computed(() => editing.value && own.can(props.account, ACCOUNT_KEYS.test))
const authOptions = computed(() => (props.accountTypeOptions || []).map(at => ({ value: at.type, label: lt(at.auth_method_label) || at.type })))
function changeAuth(value: unknown) {
  const at = props.accountTypeOptions?.find(at => at.type === value)
  if (!editing.value && at && at.type !== props.accountType?.type) emit('change-type', at)
}

const basic = reactive({
  name: '',
  group_ids: [] as number[],
  proxy_id: null as number | null,
  priority: 10,
  weight: 1,
  max_concurrency: 10,
  schedulable: true,
  auto_disable: true,
  rpm_limit: 0,
  tpm_limit: 0,
})
/** 指定模型限速 (CONTRACTS §68), edited as cards and saved as one entry per list. */
const modelLimitCards = ref<ModelLimitCard[]>([])
const credentials = ref<Record<string, unknown>>({})
const schema = ref<Record<string, any> | null>(null)
const uiSchema = ref<Record<string, any> | null>(null)
const formLoading = ref(false)
const formError = ref('')
const errors = ref<Record<string, string>>({})
const credErrors = ref<Record<string, string>>({})
const saving = ref(false)
const ccFeaturePolicy = ref<AccountFeaturePolicy>()
const ccFeatureSaved = ref('')
const ccFeatureBlocked = ref(false)
const ccFeatureDirty = computed(() => ccFeaturePolicy.value !== undefined && JSON.stringify(ccFeaturePolicy.value) !== ccFeatureSaved.value)
function loadedFeatures(value: AccountFeaturePolicy) { ccFeatureSaved.value = JSON.stringify(value) }

const schemaForm = ref<InstanceType<typeof SchemaForm>>()
const iframe = ref<InstanceType<typeof PluginIframe>>()
const nativeRef = ref<{ validate?: () => boolean | Promise<boolean> }>()
const uiPlugin = computed(() => (props.accountType ? plugins.plugin(props.accountType.plugin_key) : undefined))
const iframeSrc = computed(() => (uiPlugin.value && props.accountType?.form.page ? assetURL(uiPlugin.value, props.accountType.form.page) : ''))
const nativeComponent = computed(() => (props.accountType ? plugins.component(props.accountType.plugin_key, props.accountType.form.component) : undefined))

// ---------------------------------------------------------------- common controls (schedulable, automatic disabling)

const autoDisableEnabled = ref<boolean | null>(null)
const autoDisablePolicyFailed = ref(false)
let autoDisablePolicyRequest = 0
const autoDisableControl = computed(() => accountControl(props.accountType, 'auto_disable'))
const schedulingControl = computed(() => accountControl(props.accountType, 'schedulable'))
const autoDisableHint = computed(() => {
  if (autoDisableEnabled.value === false) return t('accounts.editorUi.autoDisableGlobalOff')
  if (!autoDisableControl.value.configurable) return t('accounts.editorUi.commonControlFixed')
  if (autoDisableEnabled.value === true) return t('accounts.editorUi.autoDisableHint')
  return autoDisablePolicyFailed.value ? t('accounts.editorUi.autoDisableUnavailable') : t('common.loading')
})

async function loadAutoDisablePolicy() {
  const request = ++autoDisablePolicyRequest
  autoDisableEnabled.value = null
  autoDisablePolicyFailed.value = false
  try {
    const policy = await api.get<{ enabled: boolean }>('/accounts/auto-disable')
    if (request === autoDisablePolicyRequest) autoDisableEnabled.value = policy.enabled
  } catch {
    if (request === autoDisablePolicyRequest) autoDisablePolicyFailed.value = true
  }
}

watch(() => [props.account, props.accountType], loadAutoDisablePolicy, { immediate: true })
onMounted(() => window.addEventListener('focus', loadAutoDisablePolicy))
onBeforeUnmount(() => {
  autoDisablePolicyRequest++
  window.removeEventListener('focus', loadAutoDisablePolicy)
})

// ---------------------------------------------------------------- sections

const activeSection = ref<EditorSection>('connection')
// Each section starts at its top: the modal body keeps the previous scroll
// offset otherwise. Post-flush, so save() still scrolls to an invalid field.
const formEl = ref<HTMLFormElement>()
watch(activeSection, () => formEl.value?.scrollIntoView({ block: 'start' }), { flush: 'post' })

const autoModels = ref(true)
const ccgState = ref<{ key: string | null; authorized: boolean; subscription_type?: string }>({ key: null, authorized: false })
const automaticModels = computed(() => props.accountType?.plugin_key === 'ccgateway' && autoModels.value)
const editorModels = useModelEdit(
  () => props.accountType,
  () => props.account?.subscription_type ?? ccgState.value.subscription_type
)
const {
  models, mapping, prefilled, defaultModels, modelsTextMode,
  modelsError, mappingError, syncModelsText, clearPrefill, modelOptions
} = editorModels
/** Models a model list can hold: those the account serves, or every known model when it serves all. */
const modelLimitOptions = computed(() => (models.value.length ? models.value : [...new Set([...defaultModels.value, ...modelOptions.value])]))
function mergeModels(ids: string[]) {
  if (automaticModels.value) {
    toast(t('accounts.editorUi.autoModelsHint'), 'info')
    return 0
  }
  return editorModels.mergeModels(ids)
}
watch(defaultModels, (next, previous) => {
  if (props.accountType?.plugin_key !== 'ccgateway') return
  if (automaticModels.value || (!props.account && JSON.stringify(models.value) === JSON.stringify(previous))) {
    editorModels.setModels([...next])
  }
})
/** Models and mappings of the section summary (the cards render their own counts). */
const mappingCount = computed(() => Object.keys(mapping.value).length)

const editorSections = computed(() => [
  { key: 'connection' as const, icon: 'key', label: t('accounts.editorUi.connection'), summary: basic.name.trim() || t('accounts.editorUi.unnamed') },
  {
    key: 'models' as const,
    icon: 'cpu',
    label: t('accounts.editorUi.models'),
    summary: [
      models.value.length ? t('accounts.editorUi.modelsSummary', { n: models.value.length }) : t('accounts.editorUi.allModels'),
      ...(mappingCount.value ? [t('accounts.editorUi.mappingSummary', { n: mappingCount.value })] : [])
    ].join(' · ')
  },
  { key: 'scheduling' as const, icon: 'bolt', label: t('accounts.editorUi.scheduling'), summary: [t('accounts.editorUi.schedulingSummary', { p: basic.priority, w: basic.weight, c: basic.max_concurrency || '∞' }), ...(modelLimitCards.value.length ? [t('accounts.modelLimits.summary', { n: modelLimitCards.value.length })] : [])].join(' · ') },
  ...(props.accountType?.plugin_key === 'ccgateway' ? [{ key: 'cc_features' as const, icon: 'settings', label: t('ccgateway.features.ccTitle'), summary: t('ccgateway.layers.' + (ccFeaturePolicy.value?.mode === 'custom' ? 'custom' : 'follow')) }] : [])
])
const limitFields = computed(() => [
  { key: 'rpm_limit' as const, label: t('accounts.rpmLimit'), unit: t('accounts.editorUi.unitRpm') },
  { key: 'tpm_limit' as const, label: t('accounts.tpmLimit'), unit: t('accounts.editorUi.unitTpm') }
])
/** Server field errors of the model list / mapping, shown under the editor. */
const serverModelsError = computed(() => modelsErrorText(errors.value))
const serverMappingError = computed(() => mappingErrorText(errors.value))
/** Sections holding an error, marked in the navigation. */
const sectionErrors = computed<Record<EditorSection, boolean>>(() => ({
  connection: CONNECTION_FIELDS.some((k) => errors.value[k]) || Object.keys(credErrors.value).length > 0,
  models: !!(modelsError.value || serverModelsError.value || mappingError.value || serverMappingError.value),
  scheduling: SCHEDULING_FIELDS.some((k) => errors.value[k]),
  cc_features: Object.keys(errors.value).some(k => k.startsWith('cc_feature_policy'))
}))

// ---------------------------------------------------------------- Claude Code (CCGateway)

// Claude Code (CCGateway) OAuth keeps its credentials in the account's own
// container: the editor shows the authorization flow instead of fields.
const ccgOAuth = computed(() => props.accountType?.lifecycle?.preparation ?? (props.accountType?.plugin_key === 'ccgateway' && props.accountType?.type === 'managed'))
const preparationUrl = computed(() => props.accountType?.lifecycle?.preparation ? `/account-types/${encodeURIComponent(props.accountType.plugin_key)}/${encodeURIComponent(props.accountType.type)}/preparations` : undefined)
/** New Claude Code account: authorized in a draft container before it is saved. */
const ccgDraft = computed(() => ccgOAuth.value && !editing.value)
/** Draft state reported by the authorization panel: saving waits for `authorized`. */
const ccgAuth = ref<InstanceType<typeof CCGatewayAccountAuth>>()
const ccgSaveBlocked = computed(() => ccgDraft.value && !ccgState.value.authorized)
/** A prepared runtime keeps the environment it was started with. */
const environmentFrozen = computed(() => !!(preparationUrl.value && ccgState.value.key))
/** Changes when the saved account changes in a way the container cares about. */
const ccgSyncKey = computed(() => (props.account ? `${props.account.proxy_id ?? ''}|${props.account.status}` : ''))
// CCGateway account containers only reach the internet through a proxy (no
// direct fallback): every ccgateway account (managed and apikey) needs one.
const needsProxy = computed(() => props.accountType?.plugin_key === 'ccgateway')
const ccgPanelEl = ref<HTMLElement>()
const proxyFieldEl = ref<HTMLElement>()

/** Shows a section and scrolls an element of it into view. */
async function reveal(section: EditorSection, el: () => HTMLElement | undefined) {
  activeSection.value = section
  await nextTick()
  el()?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
/** The save button explains itself: show the authorization steps. */
const showCcgAuth = () => reveal('connection', () => ccgPanelEl.value)
/** The authorization panel asks for a proxy: show and focus the proxy field. */
async function focusProxy() {
  setProxyMode('existing')
  await reveal('connection', () => proxyFieldEl.value)
  proxyFieldEl.value?.querySelector<HTMLElement>('select, input')?.focus()
}

// Container locale and timezone (CCGateway accounts)
const { settings: ccgSettings, locationLoading, locationStatus, locationIP, resetEnvironment, prefillEnvironment, fillFromLocation } = useContainerEnvironment()
const localeOptions = computed(() => environmentOptions(containerLocales, ccgSettings.locale, displayLocale.value))
const timezoneOptions = computed(() => environmentOptions(containerTimezones, ccgSettings.timezone))
const environmentStatus = computed(() => {
  if (environmentFrozen.value) return t('accounts.lifecycle.preparationFrozen')
  if (locationLoading.value) return t('ccgateway.environmentLoading')
  if (locationStatus.value === 'filled') return t('ccgateway.environmentFilled', { ip: locationIP.value })
  if (locationStatus.value === 'failed') return t('ccgateway.environmentFailed')
  if (editing.value) return proxyMode.value === 'url' || basic.proxy_id !== (props.account?.proxy_id ?? null) ? t('accounts.lifecycle.environmentKept') : ''
  return proxyMode.value === 'url' ? t('ccgateway.environmentProxyURL') : ''
})

// ---------------------------------------------------------------- proxy: pick an existing one | paste a URL (CONTRACTS §21.4)
// "url" sends proxy_url instead of proxy_id; the server parses it, reuses a
// matching proxy the caller can see or creates one, and answers proxy_created.
// A new Claude Code account starts its draft container with an existing proxy
// (POST drafts {proxy_id}): a pasted one is tested and saved first (probeProxyUrl).
type ProxyMode = 'existing' | 'url'
const proxyMode = ref<ProxyMode>('existing')
const proxyUrl = ref('')
const proxyModeOptions = computed(() => [
  { value: 'existing', label: t('accounts.proxyPickExisting') },
  { value: 'url', label: t('accounts.proxyPasteUrl') }
])
/** The proxy_url that will be sent, or '' (existing mode / empty input). */
const proxyUrlToSend = computed(() => (proxyMode.value === 'url' ? proxyUrl.value.trim() : ''))
const proxyError = computed(() => (proxyMode.value === 'url' ? errors.value.proxy_url : errors.value.proxy_id))
/** Shape hint only (the server validates): shown while the pasted text does not look like scheme://host:port. */
const proxyUrlHint = computed(() => {
  const raw = proxyUrl.value.trim()
  if (!raw) return ''
  const r = parseProxyURL(raw)
  if (r.ok) return ''
  // host:port:user:pass and user:pass@host:port have no scheme: the test detects it.
  if (r.error === 'scheme') return looksLikeProxyURL(raw) ? t('accounts.proxyUrlSchemeHint') : t('accounts.proxyUrlProbeHint')
  if (r.error === 'port') return t('accounts.proxyUrlPortHint')
  if (r.error === 'extra') return t('accounts.proxyUrlExtraHint')
  return t('accounts.proxyUrlShapeHint')
})
/** Last successful test of a pasted proxy, shown under the proxy field. */
const probed = ref<{ protocol: string; ip: string; id: number; created: boolean } | null>(null)
const probing = ref(false)
const showProbed = computed(() => !!probed.value && proxyMode.value === 'existing' && basic.proxy_id === probed.value.id)
/**
 * The container environment follows the proxy only while a new account is set
 * up (unless the prepared runtime froze it). A saved account keeps its saved
 * locale and timezone when its proxy changes: its running container keeps the
 * old environment anyway, and an unasked rewrite only defers to a new runtime.
 */
const followsProxy = () => needsProxy.value && !environmentFrozen.value && !editing.value

function clearErrors(...keys: string[]) {
  if (keys.some((k) => errors.value[k])) errors.value = Object.fromEntries(Object.entries(errors.value).filter(([k]) => !keys.includes(k)))
}
function setProxy(value: number | null) {
  basic.proxy_id = value
  if (followsProxy()) void prefillEnvironment(value)
}
function setProxyMode(m: string) {
  if (proxyMode.value !== m && followsProxy()) void prefillEnvironment(m === 'existing' ? basic.proxy_id : null)
  proxyMode.value = m as ProxyMode
  clearErrors('proxy_url', 'proxy_id')
}
// Entering a Claude Code draft goes back to the saved proxy the draft starts with.
watch(ccgDraft, (v) => {
  if (v) setProxyMode('existing')
})

/**
 * POST /proxies/probe {save}: tries the pasted proxy (socks5, http, then https
 * without a scheme), finds or creates the proxy that works and selects it, so a
 * Claude Code draft can start with it; its location fills locale and timezone.
 */
async function probeProxyUrl() {
  const raw = proxyUrl.value.trim()
  if (!raw || probing.value) return
  clearErrors('proxy_url')
  probed.value = null
  probing.value = true
  try {
    const r = await api.post<ProxyProbeResult>('/proxies/probe', { proxy_url: raw, save: true })
    if (!r.ok || !r.proxy_id) {
      const tried = r.attempts.map(a => `${a.protocol}: ${a.message || a.status || t('proxies.failed')}`).join('; ')
      errors.value = { ...errors.value, proxy_url: t('proxies.probeFailed', { error: tried }) }
      return
    }
    await useProxiesLookup(true).ready
    probed.value = { protocol: (r.protocol || '').toUpperCase(), ip: r.ip || '', id: r.proxy_id, created: r.proxy_created }
    proxyUrl.value = ''
    proxyMode.value = 'existing'
    basic.proxy_id = r.proxy_id
    if (!followsProxy()) return
    if (r.location) fillFromLocation(r.location)
    else void prefillEnvironment(r.proxy_id)
  } catch (e) {
    const fe = fieldErrors(e)
    if (fe.proxy_url) errors.value = { ...errors.value, proxy_url: fe.proxy_url }
    else notifyError(e)
  } finally {
    probing.value = false
  }
}

// ---------------------------------------------------------------- fetch models from the upstream (CONTRACTS §19)

const fetchOpen = ref(false)
const fetching = ref(false)
const fetched = ref<{ models: string[]; skipped: number }>({ models: [], skipped: 0 })
const canFetch = computed(() => !!props.accountType && !props.account?.orphaned && (editing.value ? canTestAccount.value : auth.has([...ACCOUNT_KEYS.create])))

/** Server field errors of the credentials: on the plugin form (and its iframe). */
function showCredentialErrors(cred: Record<string, string>) {
  credErrors.value = cred
  if (mode.value === 'iframe' && Object.keys(cred).length) iframe.value?.setErrors(cred)
}

async function fetchModels() {
  const at = props.accountType
  if (!at) return
  const creds = await collectCredentials()
  if (!creds) {
    activeSection.value = 'connection'
    return
  }
  fetching.value = true
  try {
    // New account: the pasted proxy_url is only parsed and used for this
    // request (CONTRACTS §21.2), no proxy is looked up or created.
    const proxy = proxyUrlToSend.value ? { proxy_url: proxyUrlToSend.value } : { proxy_id: basic.proxy_id }
    const r = editing.value
      ? await api.post<{ models: string[]; skipped: number }>(`/accounts/${props.account!.id}/models/fetch`, { credentials: creds })
      : await api.post<{ models: string[]; skipped: number }>(`/account-types/${encodeURIComponent(at.plugin_key)}/${encodeURIComponent(at.type)}/models/fetch`, { credentials: creds, ...proxy })
    fetched.value = { models: r.models || [], skipped: r.skipped || 0 }
    if (fetched.value.models.length) fetchOpen.value = true
    else toast(t('accounts.fetchEmpty'), 'warning')
  } catch (e) {
    // Credential problems land on the plugin form, like a failed save.
    const fe = fieldErrors(e)
    if (Object.keys(fe).length) {
      const { cred } = splitFieldErrors(fe)
      showCredentialErrors(cred)
      if (Object.keys(cred).length || fe.proxy_url) activeSection.value = 'connection'
      if (fe.proxy_url) errors.value = { ...errors.value, proxy_url: fe.proxy_url }
    }
    notifyError(e)
  } finally {
    fetching.value = false
  }
}

/** Merges the ticked models into the list (existing entries are kept). */
function applyFetched(picked: string[]) {
  if (!syncModelsTextIfNeeded()) return
  mergeModels(picked)
  fetchOpen.value = false
  toast(t('accounts.fetchApplied', { n: models.value.length }), 'success')
}
const syncModelsTextIfNeeded = () => !modelsTextMode.value || syncModelsText()

// ---------------------------------------------------------------- load

/** Fills the form from the account (or a new one) and the account type. */
function fillForm(a: Account | null | undefined, at: AccountType | null) {
  ccFeaturePolicy.value = undefined
  ccFeatureSaved.value = ''
  ccFeatureBlocked.value = false
  autoModels.value = a?.auto_models ?? true
  basic.name = a?.name || ''
  basic.group_ids = [...(a?.group_ids || [])]
  basic.proxy_id = a?.proxy_id ?? null
  // Editing defaults to "pick existing" with the current proxy selected.
  proxyMode.value = 'existing'
  proxyUrl.value = ''
  basic.priority = a?.priority ?? 10
  basic.weight = a?.weight ?? 1
  basic.max_concurrency = a?.max_concurrency ?? 10
  basic.schedulable = a?.schedulable ?? schedulingControl.value.default
  basic.auto_disable = a?.auto_disable ?? autoDisableControl.value.default
  basic.rpm_limit = a?.rpm_limit ?? 0
  basic.tpm_limit = a?.tpm_limit ?? 0
  modelLimitCards.value = toCards(a?.model_limits)
  if (!a) applyDefaultLimits(at)
  resetEnvironment(a?.settings)
  if (a) editorModels.setSaved(a.models, a.model_mapping)
  if (!a || (at?.plugin_key === 'ccgateway' ? autoModels.value : shouldPrefillOnEdit(a, at))) editorModels.applyDefaults(at)
}

/** A new account starts from the scheduling and limits its plugin suggests (CONTRACTS §68.5). */
function applyDefaultLimits(at: AccountType | null) {
  const d = at?.default_limits
  if (!d) return
  for (const field of ['priority', 'weight', 'max_concurrency', 'rpm_limit', 'tpm_limit'] as const) {
    if (d[field] !== undefined) basic[field] = d[field]!
  }
  if (d.model_limits) modelLimitCards.value = toCards(d.model_limits)
}

/** Switching the auth method of a new account: untouched defaults and common controls follow the type. */
function switchAuth(at: AccountType | null, previous: AccountType | null | undefined) {
  if (editorModels.sameDefaults(previous)) editorModels.applyDefaults(at)
  for (const field of ['auto_disable', 'schedulable'] as const) {
    const control = accountControl(at, field)
    if (!control.configurable || basic[field] === accountControl(previous, field).default) basic[field] = control.default
  }
}

/** The plugin's credential form (schema mode). */
let formRequest = 0
async function loadCredentialForm(at: AccountType | null) {
  const request = ++formRequest
  schema.value = null
  uiSchema.value = null
  formError.value = ''
  formLoading.value = at?.form.mode === 'schema'
  if (!at || !formLoading.value) return
  try {
    const f = await api.get<{ schema: Record<string, any>; ui_schema?: Record<string, any> }>(`/account-types/${encodeURIComponent(at.plugin_key)}/${encodeURIComponent(at.type)}/form`)
    if (request !== formRequest) return
    schema.value = f.schema
    uiSchema.value = f.ui_schema || null
  } catch (e) {
    if (request === formRequest) formError.value = errorMessage(e)
  } finally {
    if (request === formRequest) formLoading.value = false
  }
}

watch(
  () => [props.account, props.accountType] as const,
  ([a, at], previous) => {
    activeSection.value = 'connection'
    errors.value = {}
    credErrors.value = {}
    editorModels.resetEditing()
    if (!a && !previous?.[0] && sameCreationGroup(at, previous?.[1])) switchAuth(at, previous?.[1])
    else fillForm(a, at)
    credentials.value = { ...(a?.credentials || {}) }
    void loadCredentialForm(at)
  },
  { immediate: true }
)

// Server-side credential errors are stale once the user edits the form.
watch(credentials, () => {
  if (Object.keys(credErrors.value).length) credErrors.value = {}
}, { deep: true })

// ---------------------------------------------------------------- save

async function collectCredentials(): Promise<Record<string, unknown> | null> {
  if (!props.accountType) return credentials.value
  if (mode.value === 'schema') return schemaForm.value?.validate() ? credentials.value : null
  if (mode.value === 'native') {
    const validate = nativeRef.value?.validate
    return typeof validate === 'function' && !(await validate()) ? null : credentials.value
  }
  if (mode.value !== 'iframe') return credentials.value
  if (!iframe.value?.isReady()) {
    toast(t('pluginHost.frameNotReady'), 'warning')
    return null
  }
  const v = await iframe.value.validate().catch(() => ({ ok: false }))
  return v?.ok ? (await iframe.value.getValue()) || {} : null
}

/** Checks done before the request; the section to show when one fails. */
// The save pipeline (checks, request body, POST/PATCH, error routing) lives in
// useAccountSave; the template and the wiring below stay here.
const { save } = useAccountSave({
  account: computed(() => props.account),
  accountType: computed(() => props.accountType),
  editing,
  basic,
  modelLimits: modelLimitCards,
  errors,
  credErrors,
  saving,
  activeSection,
  locationLoading,
  models: editorModels,
  settings: ccgSettings,
  ccg: {
    autoModels,
    autoDisableEnabled,
    proxyUrlToSend,
    featureDirty: ccFeatureDirty,
    featureBlocked: ccFeatureBlocked,
    featurePolicy: ccFeaturePolicy,
    draft: ccgDraft,
    saveBlocked: ccgSaveBlocked,
    draftKey: computed(() => ccgState.value.key),
    preparationUrl,
    adopt: () => ccgAuth.value?.adopt(),
    rejected: (reason: string) => ccgAuth.value?.rejected(reason),
    showAuth: showCcgAuth
  },
  collectCredentials,
  showCredentialErrors,
  loadAutoDisablePolicy,
  saved: (a) => emit('saved', a)
})
</script>

<template>
  <form ref="formEl" class="space-y-5" novalidate @submit.prevent="save">
    <div class="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
      <AccountEditorNav v-model="activeSection" :account-type="accountType" :sections="editorSections" :errors="sectionErrors" />

      <div class="min-w-0 md:min-h-[30rem]">
        <!-- ============================================================ connection -->
        <div v-show="activeSection === 'connection'" data-editor-section="connection" class="space-y-4">
          <SCard :title="t('accounts.basic')" :subtitle="t('accounts.editorUi.basicHint')">
            <div class="grid gap-4 md:grid-cols-2">
              <SField :label="t('common.name')" :error="errors.name" required>
                <SInput v-model="basic.name" :maxlength="100" :placeholder="t('accounts.editorUi.namePlaceholder')" />
              </SField>
              <SField :label="t('accounts.groups')" :error="errors.group_ids" :hint="basic.group_ids.length ? '' : t('accounts.editorUi.groupsHint')">
                <GroupPicker :model-value="basic.group_ids" multiple @update:model-value="basic.group_ids = $event as number[]" />
              </SField>
              <div ref="proxyFieldEl" class="md:col-span-2" data-testid="proxy-field">
                <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span class="text-sm font-medium text-fg">{{ t('accounts.proxy') }}</span>
                  <SSegmented :model-value="proxyMode" :options="proxyModeOptions" size="sm" :aria-label="t('accounts.proxy')" data-testid="proxy-mode" @update:model-value="setProxyMode(String($event))" />
                </div>
                <SField :error="proxyError">
                  <ProxyPicker v-if="proxyMode === 'existing'" :model-value="basic.proxy_id" @update:model-value="setProxy" />
                  <div v-else class="flex gap-2">
                    <SInput
                      v-model="proxyUrl"
                      class="flex-1"
                      mono
                      autocomplete="off"
                      spellcheck="false"
                      data-testid="proxy-url"
                      placeholder="socks5://user:pass@host:port"
                      @keydown.enter.prevent="probeProxyUrl"
                    />
                    <SButton :disabled="!proxyUrl.trim()" :loading="probing" data-testid="proxy-url-probe" @click="probeProxyUrl">
                      {{ probing ? t('proxies.probing') : t('proxies.probeProxy') }}
                    </SButton>
                  </div>
                  <template v-if="proxyMode === 'url'" #hint>
                    <SHint v-if="proxyUrlHint" inline size="xs" tone="warning" data-testid="proxy-url-hint">{{ proxyUrlHint }}</SHint>
                    <template v-else>{{ t('accounts.proxyUrlHint') }}</template>
                  </template>
                </SField>
                <SHint v-if="showProbed" tone="success" size="xs" class="mt-1" role="status" data-testid="proxy-probe-result">
                  {{ t(probed!.created ? 'accounts.proxyProbeCreated' : 'accounts.proxyProbeReused', { protocol: probed!.protocol, ip: probed!.ip, id: probed!.id }) }}
                </SHint>
                <SHint v-if="needsProxy" size="xs" class="mt-1" data-testid="proxy-required-hint">{{ t('ccgateway.accountAuth.proxyRequiredHint') }}</SHint>
                <SHint v-if="ccgDraft" size="xs" class="mt-1" data-testid="proxy-draft-hint">{{ t('ccgateway.accountAuth.draftProxyHint') }}</SHint>
              </div>
              <SHint v-if="account?.lifecycle_sync" size="xs" class="md:col-span-2" role="status" data-testid="account-lifecycle-status">
                {{ t(`accounts.lifecycle.${account.lifecycle_sync.status}`) }}
                <span v-if="account.lifecycle_sync.code === 'environment_requires_new_runtime'">{{ t('accounts.lifecycle.environmentDeferred') }}</span>
              </SHint>
              <!-- container locale and timezone (CCGateway accounts) -->
              <template v-if="needsProxy">
                <SField :label="t('ccgateway.locale')" :hint="t('ccgateway.localeHint')" :error="errors['settings.locale'] || errors.settings">
                  <SSelect :model-value="ccgSettings.locale || null" :options="localeOptions" searchable :aria-label="t('ccgateway.locale')" :placeholder="t('ccgateway.environmentDefault')" :no-results="t('ccgateway.environmentNoResults')" :disabled="locationLoading || environmentFrozen" data-testid="container-locale" @update:model-value="ccgSettings.locale = String($event ?? '')" />
                </SField>
                <SField :label="t('ccgateway.timezone')" :hint="t('ccgateway.timezoneHint')" :error="errors['settings.timezone']">
                  <SSelect :model-value="ccgSettings.timezone || null" :options="timezoneOptions" searchable :aria-label="t('ccgateway.timezone')" :placeholder="t('ccgateway.environmentDefault')" :no-results="t('ccgateway.environmentNoResults')" :disabled="locationLoading || environmentFrozen" data-testid="container-timezone" @update:model-value="ccgSettings.timezone = String($event ?? '')" />
                </SField>
                <SHint size="xs" class="md:col-span-2" role="status" data-testid="container-location-status">{{ environmentStatus }}</SHint>
              </template>
            </div>
          </SCard>

          <SCard :title="t('accounts.credentials')" :subtitle="accountType ? t('accounts.editorUi.credentialsHint', { plugin: lt(accountType.plugin_name) || accountType.plugin_key }) : ''">
            <template v-if="accountType?.auth_method_label && (editing || authOptions.length <= 1)" #actions>
              <SBadge tone="accent">{{ lt(accountType.auth_method_label) }}</SBadge>
            </template>

            <SField v-if="!editing && authOptions.length > 1" :label="t('accounts.editorUi.authMethod')" class="mb-5">
              <SChoiceCards :model-value="accountType?.type" :options="authOptions" :cols="2" :disabled="saving" data-testid="auth-method" @update:model-value="changeAuth" />
            </SField>

            <SAlert v-if="account?.orphaned || !accountType" tone="warning">{{ t('accounts.orphanedEdit') }}</SAlert>
            <template v-else-if="mode === 'schema'">
              <SSpinner v-if="formLoading" block />
              <SHint v-else-if="formError" tone="danger">{{ formError }}</SHint>
              <SchemaForm v-else-if="schema" ref="schemaForm" v-model="credentials" :schema="schema" :ui-schema="uiSchema" :errors="credErrors" :widgets="schemaWidgets" />
              <!-- Claude Code (CCGateway) OAuth: the credentials live in the account's own container; it is authorized right here (new accounts: before saving). -->
              <div v-if="ccgOAuth" ref="ccgPanelEl">
                <CCGatewayAccountAuth
                  v-if="ccgDraft"
                  ref="ccgAuth"
                  draft
                  :proxy-id="basic.proxy_id"
                  :preparation-url="preparationUrl"
                  :settings="ccgSettings"
                  :configuration-ready="!locationLoading"
                  @state="ccgState = $event"
                  @fix-proxy="focusProxy"
                />
                <CCGatewayAccountReauth v-else :key="account!.id" :account-id="account!.id" :can-edit="canEditAccount" :sync-key="ccgSyncKey" @fix-proxy="focusProxy" @reauthorized="emit('reauthorized', $event)" />
              </div>
              <SAlert v-else-if="schema && !formLoading && !Object.keys(schema.properties || {}).length" tone="neutral">{{ t('accounts.editorUi.noCredentials') }}</SAlert>
            </template>
            <template v-else-if="mode === 'iframe'">
              <PluginIframe
                v-if="iframeSrc"
                ref="iframe"
                :plugin-key="accountType.plugin_key"
                :page="accountType.form.page"
                :src="iframeSrc"
                mode="account-form"
                :value="credentials"
                :min-height="200"
                @change="credentials = $event || {}"
              />
              <SHint v-else tone="danger">{{ t('accounts.formUnavailable') }}</SHint>
            </template>
            <template v-else-if="mode === 'native'">
              <component :is="nativeComponent" v-if="nativeComponent" ref="nativeRef" v-model="credentials" :mode="editing ? 'edit' : 'create'" :account="account" :errors="credErrors" />
              <SHint v-else tone="danger">{{ plugins.errors[accountType.plugin_key] || t('accounts.formUnavailable') }}</SHint>
            </template>

            <div class="mt-4 space-y-3 empty:hidden">
              <PluginSlot name="account.form.widgets" :props="{ account, accountType, credentials }" />
            </div>
          </SCard>
        </div>

        <!-- ============================================================ models -->
        <div v-show="activeSection === 'models'" data-editor-section="models" class="space-y-4">
          <AccountModelsCard
            v-model:auto-models="autoModels"
            :editor="editorModels"
            :gateway="needsProxy"
            :automatic="automaticModels"
            :editing="editing"
            :draft="ccgDraft"
            :can-fetch="canFetch"
            :fetching="fetching"
            :errors="errors"
            :merge-models="mergeModels"
            @fetch="fetchModels"
          />
        </div>

        <!-- ============================================================ scheduling and limits -->
        <div v-if="needsProxy" v-show="activeSection === 'cc_features'" data-editor-section="cc_features" class="space-y-4">
          <AccountFeatureSettings v-if="editing" :key="account!.id" v-model="ccFeaturePolicy" :account-id="account!.id" :can-edit="canEditAccount" :disabled="saving" :errors="errors" @loaded="loadedFeatures" @status="ccFeatureBlocked = $event" />
          <SHint v-else>{{ t('ccgateway.layers.newAccount') }}</SHint>
        </div>
        <div v-show="activeSection === 'scheduling'" data-editor-section="scheduling" class="space-y-4">
          <SSettingsGroup :title="t('accounts.scheduling')" :description="t('accounts.editorUi.schedulingCardHint')" data-testid="account-scheduling">
            <SSettingRow :label="t('accounts.priority')" :description="t('accounts.priorityHint')" :error="errors.priority">
              <SInput v-model.number="basic.priority" type="number" min="0" max="1000000" class="w-full sm:w-40" />
            </SSettingRow>
            <SSettingRow :label="t('accounts.weight')" :description="t('accounts.weightHint')" :error="errors.weight">
              <SInput v-model.number="basic.weight" type="number" min="1" max="1000" class="w-full sm:w-40" />
            </SSettingRow>
            <SSettingRow :label="t('accounts.maxConcurrency')" :description="t('accounts.zeroUnlimited')" :error="errors.max_concurrency">
              <SInput v-model.number="basic.max_concurrency" type="number" min="0" class="w-full sm:w-40" />
            </SSettingRow>
            <SSettingRow :label="t('accounts.schedulable')" :description="t(schedulingControl.configurable ? 'accounts.editorUi.schedulableHint' : 'accounts.editorUi.commonControlFixed')">
              <SSwitch v-model="basic.schedulable" :disabled="!schedulingControl.configurable || saving" data-testid="account-scheduling-control" />
            </SSettingRow>
            <SSettingRow :label="t('accounts.autoDisable')" :description="autoDisableHint">
              <SSwitch v-model="basic.auto_disable" :disabled="autoDisableEnabled !== true || !autoDisableControl.configurable || saving" data-testid="account-auto-disable" />
            </SSettingRow>
          </SSettingsGroup>

          <SSettingsGroup :title="t('accounts.limits')" :description="t('accounts.editorUi.limitsHint')" data-testid="account-limits">
            <SSettingRow v-for="f in limitFields" :key="f.key" :label="f.label" :description="t('accounts.zeroUnlimited')" :error="errors[f.key]">
              <SInput v-model.number="basic[f.key]" type="number" :min="0" :suffix="f.unit" class="w-full sm:w-48" />
            </SSettingRow>
          </SSettingsGroup>

          <SSettingsGroup :title="t('accounts.modelLimits.title')" :description="t('accounts.modelLimits.hint')" data-testid="account-model-limits">
            <div class="p-4">
              <ModelLimitsEditor v-model="modelLimitCards" :options="modelLimitOptions" :errors="errors" :disabled="saving" />
            </div>
          </SSettingsGroup>
        </div>
      </div>
    </div>

    <FetchedModelsModal v-model:open="fetchOpen" :models="fetched.models" :skipped="fetched.skipped" :existing="models" @apply="applyFetched" />

    <div class="sticky -bottom-5 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-white py-4 dark:bg-dark-800">
      <SButton v-if="!editing" class="mr-auto" variant="ghost" icon="arrow-left" @click="emit('back')">{{ t('common.previous') }}</SButton>
      <SButton v-if="canTestAccount" class="mr-auto" icon="play" @click="emit('test', account!)">{{ t('accounts.testConnection') }}</SButton>
      <SHint v-if="editing && prefilled" inline size="xs" tone="warning" class="inline-flex flex-wrap items-center gap-x-2" data-testid="footer-prefilled">
        <SIcon name="info" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.prefilledFooter') }}
        <SLink v-if="activeSection !== 'models'" as="button" class="text-xs" @click="activeSection = 'models'">{{ t('accounts.editorUi.prefilledView') }}</SLink>
        <SLink as="button" class="text-xs" @click="clearPrefill">{{ t('accounts.editorUi.clearModels') }}</SLink>
      </SHint>
      <SHint v-if="ccgSaveBlocked" inline size="xs" tone="warning" class="inline-flex flex-wrap items-center gap-x-2" data-testid="footer-ccg-blocked">
        <SIcon name="info" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.saveBlocked') }}
        <SLink as="button" class="text-xs" @click="showCcgAuth">{{ t('ccgateway.accountAuth.saveBlockedFix') }}</SLink>
      </SHint>
      <SButton @click="emit('cancel')">{{ t('common.cancel') }}</SButton>
      <SButton type="submit" variant="primary" :loading="saving" :disabled="formLoading || !!formError || ccgSaveBlocked || locationLoading" data-testid="account-save">{{ editing ? t('common.save') : t('accounts.editorUi.create') }}</SButton>
    </div>
  </form>
</template>
