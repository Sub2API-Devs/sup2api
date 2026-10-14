<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SCheckbox, SchemaForm, SChoiceCards, SField, SHint, SIcon, SInput, SLink, SModal, SSegmented, SSelect, SSettingRow, SSettingsGroup, SSpinner, SStatusDot, SSwitch, STextarea, toast } from '@sub2api/ui'
import type { Account, AccountType, Price, ProxyProbeResult } from '@/api/types'
import { schemaWidgets } from '@/components/schema/widgets'
import PluginIframe from '@/components/plugin/PluginIframe.vue'
import PluginSlot from '@/components/plugin/PluginSlot.vue'
import GroupPicker from '@/components/GroupPicker.vue'
import ProxyPicker from '@/components/ProxyPicker.vue'
import PluginAvatar from '@/views/plugins/parts/PluginAvatar.vue'
import PlatformBadges from '@/views/platforms/PlatformBadges.vue'
import { lt } from '@/i18n'
import { accountControl, sameCreationGroup } from './accountTypeChoices'
import { shouldPrefillOnEdit } from './modelDefaults'
import { containerLocales, containerTimezones, environmentOptions } from './containerEnvironment'
import { useContainerEnvironment } from './useContainerEnvironment'
import ModelMappingEditor from './ModelMappingEditor.vue'
import ModelListEditor from '@/components/models/ModelListEditor.vue'
import CCGatewayAccountAuth from '@/views/ccgateway/CCGatewayAccountAuth.vue'
import CCGatewayAccountReauth from '@/views/ccgateway/CCGatewayAccountReauth.vue'
import { reasonOf } from '@/views/ccgateway/ccgAuthFlow'
import { assetURL, usePluginStore } from '@/stores/plugins'
import { useAuthStore } from '@/stores/auth'
import { useProxiesLookup } from '@/composables/lookups'
import { ACCOUNT_KEYS, useOwnership } from '@/composables/useOwnership'
import { errorMessage, fieldErrors, notifyError } from '@/utils/errors'
import { copyText } from '@/utils/format'
import { looksLikeProxyURL, parseProxyURL } from '@/utils/proxyUrl'

// Step 2 of "new account" and the edit form (wireframe A.4, CONTRACTS §18.4):
// 基本信息 / 调度 / 限流 / 模型 / 模型映射 (all core) + the plugin credential form.
// A new account starts from the plugin's default models and mapping (§41); so
// does an existing account saved without either (see shouldPrefillOnEdit).
// A new Claude Code (CCGateway managed) account is authorized before it is
// saved (docs/CCGATEWAY-DRAFT-RUNTIMES.md §5): the credentials card runs the
// draft flow and saving sends the authorized draft as `ccgateway_runtime`. A
// saved one shows its login and can be re-authorized (docs/CCGATEWAY-REAUTH.md):
// the swap is committed by itself and reported with `reauthorized`.
const props = defineProps<{ accountType: AccountType | null; accountTypeOptions?: AccountType[]; account?: Account | null }>()
const emit = defineEmits<{ (e: 'change-type', at: AccountType): void; (e: 'saved', a: Account): void; (e: 'cancel'): void; (e: 'back'): void; (e: 'test', a: Account): void; (e: 'reauthorized', a: Account): void }>()
const { t, locale: displayLocale } = useI18n()
const plugins = usePluginStore()
const auth = useAuthStore()
const own = useOwnership()
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

const editing = computed(() => !!props.account?.id)
const authOptions = computed(() => (props.accountTypeOptions || []).map(at => ({ value: at.type, label: lt(at.auth_method_label) || at.type })))
function changeAuth(value: unknown) {
  const at = props.accountTypeOptions?.find(at => at.type === value)
  if (!editing.value && at && at.type !== props.accountType?.type) emit('change-type', at)
}
const mode = computed(() => props.accountType?.form.mode || 'schema')
// Claude Code (CCGateway) OAuth keeps its credentials in the account's own
// container: the editor shows the authorization flow instead of fields.
const ccgOAuth = computed(() => props.accountType?.lifecycle?.preparation ?? (props.accountType?.plugin_key === 'ccgateway' && props.accountType?.type === 'managed'))
const preparationUrl = computed(() => props.accountType?.lifecycle?.preparation ? `/account-types/${encodeURIComponent(props.accountType.plugin_key)}/${encodeURIComponent(props.accountType.type)}/preparations` : undefined)
/** New Claude Code account: authorized in a draft container before it is saved. */
const ccgDraft = computed(() => ccgOAuth.value && !editing.value)
/** Draft state reported by the authorization panel: saving waits for `authorized`. */
const ccgState = ref<{ key: string | null; authorized: boolean }>({ key: null, authorized: false })
const ccgAuth = ref<InstanceType<typeof CCGatewayAccountAuth>>()
const ccgSaveBlocked = computed(() => ccgDraft.value && !ccgState.value.authorized)
const ccgPanelEl = ref<HTMLElement>()
/** The save button explains itself: show the authorization steps. */
async function showCcgAuth() {
  activeSection.value = 'connection'
  await nextTick()
  ccgPanelEl.value?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
// CCGateway account containers only reach the internet through a proxy (no
// direct fallback): every ccgateway account (managed and apikey) needs one.
const needsProxy = computed(() => props.accountType?.plugin_key === 'ccgateway')
const canEditAccount = computed(() => editing.value && own.can(props.account, ACCOUNT_KEYS.update))
/** Changes when the saved account changes in a way the container cares about. */
const ccgSyncKey = computed(() => (props.account ? `${props.account.proxy_id ?? ''}|${props.account.status}` : ''))
const proxyFieldEl = ref<HTMLElement>()
/** The authorization panel asks for a proxy: show and focus the proxy field. */
async function focusProxy() {
  activeSection.value = 'connection'
  setProxyMode('existing')
  await nextTick()
  proxyFieldEl.value?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  proxyFieldEl.value?.querySelector<HTMLElement>('select, input')?.focus()
}
// Row-level rights (CONTRACTS §21.1): editing an account needs the all-level
// key or the own-level key on an account the caller created.
const canTestAccount = computed(() => editing.value && own.can(props.account, ACCOUNT_KEYS.test))

/** A complete model id (CONTRACTS §16): no wildcards. */
const MODEL_RE = /^[A-Za-z0-9._:/@+-]{1,200}$/
const isModelId = (s: string) => MODEL_RE.test(s) && !s.includes('*')

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

// CCGateway-specific settings (locale and timezone)
const { settings: ccgSettings, locationLoading, locationStatus, locationIP, resetEnvironment, prefillEnvironment, fillFromLocation } = useContainerEnvironment()
const localeOptions = computed(() => environmentOptions(containerLocales, ccgSettings.locale, displayLocale.value))
const timezoneOptions = computed(() => environmentOptions(containerTimezones, ccgSettings.timezone))

// ---------------------------------------------------------------- proxy: pick an existing one | paste a URL (CONTRACTS §21.4)
// "url" sends proxy_url instead of proxy_id; the server parses it, reuses a
// matching proxy the caller can see or creates one, and answers proxy_created.
type ProxyMode = 'existing' | 'url'
const proxyMode = ref<ProxyMode>('existing')
const proxyUrl = ref('')
// A new Claude Code account starts its draft container with an existing proxy
// (POST drafts {proxy_id}): a pasted one is tested and saved first (probeProxyUrl).
const proxyModeOptions = computed(() => [
  { value: 'existing', label: t('accounts.proxyPickExisting') },
  { value: 'url', label: t('accounts.proxyPasteUrl') }
])
/** The proxy_url that will be sent, or '' (existing mode / empty input). */
const proxyUrlToSend = computed(() => (proxyMode.value === 'url' ? proxyUrl.value.trim() : ''))
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
function setProxy(value: number | null) {
  basic.proxy_id = value
  if (needsProxy.value && !(preparationUrl.value && ccgState.value.key)) void prefillEnvironment(value)
}
function setProxyMode(m: string) {
  if (proxyMode.value !== m && needsProxy.value) void prefillEnvironment(m === 'existing' ? basic.proxy_id : null)
  proxyMode.value = m as ProxyMode
  if (errors.value.proxy_url || errors.value.proxy_id) {
    const { proxy_url: _u, proxy_id: _i, ...rest } = errors.value
    errors.value = rest
  }
}
// Entering a Claude Code draft goes back to the saved proxy the draft starts with.
watch(ccgDraft, (v) => {
  if (v) setProxyMode('existing')
})
/** Last successful test of a pasted proxy, shown under the proxy field. */
const probed = ref<{ protocol: string; ip: string; id: number; created: boolean } | null>(null)
const probing = ref(false)
/**
 * POST /proxies/probe {save}: tries the pasted proxy (socks5, http, then https
 * without a scheme), finds or creates the proxy that works and selects it, so a
 * Claude Code draft can start with it; its location fills locale and timezone.
 */
async function probeProxyUrl() {
  const raw = proxyUrl.value.trim()
  if (!raw || probing.value) return
  const { proxy_url: _u, ...rest } = errors.value
  errors.value = rest
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
    if (needsProxy.value && !(preparationUrl.value && ccgState.value.key)) {
      if (r.location) fillFromLocation(r.location)
      else void prefillEnvironment(r.proxy_id)
    }
  } catch (e) {
    const fe = fieldErrors(e)
    if (fe.proxy_url) errors.value = { ...errors.value, proxy_url: fe.proxy_url }
    else notifyError(e)
  } finally {
    probing.value = false
  }
}
const models = ref<string[]>([])
const mapping = ref<Record<string, string>>({})
const credentials = ref<Record<string, any>>({})
const schema = ref<Record<string, any> | null>(null)
const uiSchema = ref<Record<string, any> | null>(null)
const formLoading = ref(false)
const formError = ref('')
const errors = ref<Record<string, string>>({})
const credErrors = ref<Record<string, string>>({})
const saving = ref(false)

const schemaForm = ref<InstanceType<typeof SchemaForm>>()
const iframe = ref<InstanceType<typeof PluginIframe>>()
const nativeRef = ref<any>()

const uiPlugin = computed(() => (props.accountType ? plugins.plugin(props.accountType.plugin_key) : undefined))
const iframeSrc = computed(() => (uiPlugin.value && props.accountType?.form.page ? assetURL(uiPlugin.value, props.accountType.form.page) : ''))
const nativeComponent = computed(() => (props.accountType ? plugins.component(props.accountType.plugin_key, props.accountType.form.component) : undefined))

type EditorSection = 'connection' | 'models' | 'scheduling'
const activeSection = ref<EditorSection>('connection')
// Each section starts at its top: the modal body keeps the previous scroll
// offset otherwise. Post-flush, so save() still scrolls to an invalid field.
const formEl = ref<HTMLFormElement>()
watch(activeSection, () => formEl.value?.scrollIntoView({ block: 'start' }), { flush: 'post' })
const editorSections = computed(() => [
  { key: 'connection' as const, icon: 'key', label: t('accounts.editorUi.connection'), summary: basic.name.trim() || t('accounts.editorUi.unnamed') },
  {
    key: 'models' as const,
    icon: 'cpu',
    label: t('accounts.editorUi.models'),
    summary: [
      models.value.length ? t('accounts.editorUi.modelsSummary', { n: models.value.length }) : t('accounts.editorUi.allModels'),
      ...(Object.keys(mapping.value).length ? [t('accounts.editorUi.mappingSummary', { n: Object.keys(mapping.value).length })] : [])
    ].join(' · ')
  },
  {
    key: 'scheduling' as const,
    icon: 'bolt',
    label: t('accounts.editorUi.scheduling'),
    summary: t('accounts.editorUi.schedulingSummary', { p: basic.priority, w: basic.weight, c: basic.max_concurrency || '∞' })
  }
])
const SCHEDULING_FIELDS = ['priority', 'weight', 'max_concurrency', 'rpm_limit', 'tpm_limit']
type LimitKey = 'rpm_limit' | 'tpm_limit'
const limitFields = computed<Array<{ key: LimitKey; label: string; hint: string; unit: string }>>(() => [
  { key: 'rpm_limit', label: t('accounts.rpmLimit'), hint: t('accounts.zeroUnlimited'), unit: t('accounts.editorUi.unitRpm') },
  { key: 'tpm_limit', label: t('accounts.tpmLimit'), hint: t('accounts.zeroUnlimited'), unit: t('accounts.editorUi.unitTpm') },
])
/** Sections holding an error, marked in the navigation. */
const sectionErrors = computed<Record<EditorSection, boolean>>(() => ({
  connection: ['name', 'group_ids', 'proxy_id', 'proxy_url', 'settings', 'settings.locale', 'settings.timezone'].some((k) => errors.value[k]) || Object.keys(credErrors.value).length > 0,
  models: !!(modelsError.value || serverModelsError.value || mappingError.value || serverMappingError.value),
  scheduling: SCHEDULING_FIELDS.some((k) => errors.value[k])
}))

// ---------------------------------------------------------------- plugin defaults (CONTRACTS §41)
const defaultModels = computed(() => props.accountType?.default_models || [])
const defaultMapping = computed(() => props.accountType?.default_model_mapping || {})
/**
 * The models / mapping were prefilled with the plugin defaults (shows a
 * notice). When editing, the account was "all models" before: nothing is
 * stored until it is saved.
 */
const prefilled = ref(false)
/** "12 models" (+ "and 3 mappings" only when the preset has a mapping; most have none). */
const prefillWhat = computed(() => {
  const n = Object.keys(defaultMapping.value).length
  return n ? t('accounts.editorUi.prefillWhatMapping', { models: defaultModels.value.length, mapping: n }) : t('accounts.editorUi.prefillWhat', { models: defaultModels.value.length })
})
/** Back to "all models": clears the prefilled list and mapping. */
function clearPrefill() {
  clearModels()
  mapping.value = {}
  mappingText.value = ''
  mappingError.value = ''
  prefilled.value = false
}
const sameDefaults = (at: AccountType | null | undefined) =>
  JSON.stringify(models.value) === JSON.stringify(at?.default_models || []) &&
  JSON.stringify(mapping.value) === JSON.stringify(at?.default_model_mapping || {})
function applyDefaults(at: AccountType | null | undefined) {
  models.value = [...(at?.default_models || [])]
  mapping.value = { ...(at?.default_model_mapping || {}) }
  prefilled.value = models.value.length > 0 || Object.keys(mapping.value).length > 0
}

/** Merges the default models into the list; existing entries are kept. */
function fillDefaultModels() {
  if (modelsTextMode.value && !syncModelsText()) return
  commitDraft()
  const added = mergeModels(defaultModels.value)
  toast(added ? t('accounts.editorUi.defaultsAdded', { n: added }) : t('accounts.editorUi.defaultsNothingNew'), added ? 'success' : 'info')
}

/** Merges the default mapping (existing keys win) and keeps its request models schedulable. */
function fillDefaultMapping() {
  if (mappingJsonMode.value && !syncMappingText()) return
  const next = { ...mapping.value }
  let added = 0
  for (const [from, to] of Object.entries(defaultMapping.value)) {
    if (from in next) continue
    next[from] = to
    added++
  }
  mapping.value = next
  if (mappingJsonMode.value) mappingText.value = JSON.stringify(next, null, 2)
  if (models.value.length) mergeModels(Object.keys(defaultMapping.value))
  toast(added ? t('accounts.editorUi.defaultMappingAdded', { n: added }) : t('accounts.editorUi.defaultsNothingNew'), added ? 'success' : 'info')
}

/** Appends the models missing from the list; returns how many were added. */
function mergeModels(list: string[]): number {
  if (modelsTextMode.value && !syncModelsText()) return 0
  const next = [...models.value]
  for (const m of list) if (!next.includes(m)) next.push(m)
  const added = next.length - models.value.length
  models.value = next
  if (modelsTextMode.value) modelsText.value = next.join('\n')
  modelsError.value = ''
  return added
}

async function copyModels() {
  if (modelsTextMode.value && !syncModelsText()) return
  if (await copyText(models.value.join(','))) toast(t('accounts.editorUi.copied', { n: models.value.length }), 'success')
}

function clearModels() {
  models.value = []
  modelsText.value = ''
  modelDraft.value = ''
  modelsError.value = ''
}
// ---------------------------------------------------------------- models editor
const modelDraft = ref('')
const modelsText = ref('')
const modelsTextMode = ref(false)
const modelsError = ref('')

/** Suggestions for the model ids: every priced model, loaded once. */
const modelOptions = ref<string[]>([])
let modelOptionsPending: Promise<void> | null = null
function loadModelOptions() {
  if (modelOptionsPending) return modelOptionsPending
  modelOptionsPending = api
    .list<Price>('/prices', { page_size: 500 })
    .then((r) => {
      modelOptions.value = [...new Set(r.items.map((p) => p.model).filter(Boolean))].sort()
    })
    .catch(() => {
      modelOptionsPending = null
    })
  return modelOptionsPending
}
loadModelOptions()

function addModels(raw: string): boolean {
  const parts = raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  if (!parts.length) return false
  const next = [...models.value]
  for (const p of parts) {
    if (!isModelId(p)) {
      modelsError.value = t('accounts.modelInvalid', { model: p })
      return false
    }
    if (next.includes(p)) {
      modelsError.value = t('accounts.modelDuplicate', { model: p })
      return false
    }
    next.push(p)
  }
  models.value = next
  modelsError.value = ''
  return true
}

function commitDraft() {
  if (!modelDraft.value.trim()) return
  if (addModels(modelDraft.value)) modelDraft.value = ''
}

function onModelKey(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    commitDraft()
  } else if (e.key === 'Backspace' && !modelDraft.value && models.value.length) {
    removeModel(models.value.length - 1)
  }
}

function removeModel(i: number) {
  models.value = models.value.filter((_, idx) => idx !== i)
  modelsError.value = ''
}

/** Parses the textarea back into `models`; returns false and sets an error on bad input. */
function syncModelsText(): boolean {
  const parts = modelsText.value.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  const out: string[] = []
  for (const p of parts) {
    if (!isModelId(p)) {
      modelsError.value = t('accounts.modelInvalid', { model: p })
      return false
    }
    if (out.includes(p)) {
      modelsError.value = t('accounts.modelDuplicate', { model: p })
      return false
    }
    out.push(p)
  }
  models.value = out
  modelsError.value = ''
  return true
}

function toggleModelsText() {
  if (modelsTextMode.value) {
    if (!syncModelsText()) { activeSection.value = 'models'; return }
    modelsTextMode.value = false
  } else {
    commitDraft()
    modelsText.value = models.value.join('\n')
    modelsError.value = ''
    modelsTextMode.value = true
  }
}

// ---------------------------------------------------------------- fetch models from the upstream (CONTRACTS §19)
const fetchOpen = ref(false)
const fetching = ref(false)
const fetched = ref<string[]>([])
const fetchedSkipped = ref(0)
const fetchPicked = ref<Record<string, boolean>>({})

const canFetch = computed(() => !!props.accountType && !props.account?.orphaned && (editing.value ? canTestAccount.value : auth.has([...ACCOUNT_KEYS.create])))
const fetchPickedCount = computed(() => Object.values(fetchPicked.value).filter(Boolean).length)

async function fetchModels() {
  if (!props.accountType) return
  const creds = await collectCredentials()
  if (!creds) { activeSection.value = 'connection'; return }
  fetching.value = true
  try {
    const at = props.accountType
    // New account: the pasted proxy_url is only parsed and used for this
    // request (CONTRACTS §21.2), no proxy is looked up or created.
    const proxy = proxyUrlToSend.value ? { proxy_url: proxyUrlToSend.value } : { proxy_id: basic.proxy_id }
    const r = editing.value
      ? await api.post<{ models: string[]; skipped: number }>(`/accounts/${props.account!.id}/models/fetch`, { credentials: creds })
      : await api.post<{ models: string[]; skipped: number }>(
          `/account-types/${encodeURIComponent(at.plugin_key)}/${encodeURIComponent(at.type)}/models/fetch`,
          { credentials: creds, ...proxy }
        )
    fetched.value = r.models || []
    fetchedSkipped.value = r.skipped || 0
    const picked: Record<string, boolean> = {}
    for (const m of fetched.value) picked[m] = true
    fetchPicked.value = picked
    if (!fetched.value.length) {
      toast(t('accounts.fetchEmpty'), 'warning')
      return
    }
    fetchOpen.value = true
  } catch (e) {
    const fe = fieldErrors(e)
    if (Object.keys(fe).length) {
      // Credential problems land on the plugin form, like a failed save.
      const cred: Record<string, string> = {}
      for (const [k, v] of Object.entries(fe)) {
        const m = /^credentials[.[]?(.*?)]?$/.exec(k)
        if (m && k.startsWith('credentials')) cred[m[1].replace(/^\./, '')] = v
      }
      credErrors.value = cred
      if (Object.keys(cred).length || fe.proxy_url) activeSection.value = 'connection'
      if (mode.value === 'iframe' && Object.keys(cred).length) iframe.value?.setErrors(cred)
      if (fe.proxy_url) errors.value = { ...errors.value, proxy_url: fe.proxy_url }
    }
    notifyError(e)
  } finally {
    fetching.value = false
  }
}

function setAllFetched(v: boolean) {
  const picked: Record<string, boolean> = {}
  for (const m of fetched.value) picked[m] = v
  fetchPicked.value = picked
}

/** Merges the ticked models into the list (existing entries are kept). */
function applyFetched() {
  if (modelsTextMode.value && !syncModelsText()) return
  const next = [...models.value]
  for (const m of fetched.value) if (fetchPicked.value[m] && !next.includes(m)) next.push(m)
  models.value = next
  if (modelsTextMode.value) modelsText.value = next.join('\n')
  modelsError.value = ''
  fetchOpen.value = false
  toast(t('accounts.fetchApplied', { n: next.length }), 'success')
}

// ---------------------------------------------------------------- model mapping editor
const mappingText = ref('')
const mappingJsonMode = ref(false)
const mappingError = ref('')

/** Parses the raw JSON textarea back into `mapping`. */
function syncMappingText(): boolean {
  const raw = mappingText.value.trim()
  if (!raw) {
    mapping.value = {}
    mappingError.value = ''
    return true
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    mappingError.value = t('accounts.mappingInvalidJSON')
    return false
  }
  const err = validateMapping(parsed)
  if (err) {
    mappingError.value = err
    return false
  }
  mapping.value = parsed as Record<string, string>
  mappingError.value = ''
  return true
}

/** `null` when `v` is a valid {model: model} object, otherwise the error text. */
function validateMapping(v: unknown): string | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return t('accounts.mappingNotObject')
  for (const [from, to] of Object.entries(v as Record<string, unknown>)) {
    if (typeof to !== 'string') return t('accounts.mappingNotObject')
    if (!isModelId(from)) return t('accounts.modelInvalid', { model: from })
    if (!isModelId(to)) return t('accounts.modelInvalid', { model: to })
  }
  return null
}

function toggleMappingJSON() {
  if (mappingJsonMode.value) {
    if (!syncMappingText()) return
    mappingJsonMode.value = false
  } else {
    mappingText.value = Object.keys(mapping.value).length ? JSON.stringify(mapping.value, null, 2) : ''
    mappingError.value = ''
    mappingJsonMode.value = true
  }
}

// ---------------------------------------------------------------- server field errors per section
const serverModelsError = computed(() => {
  for (const [k, v] of Object.entries(errors.value)) if (/^models(\[|$)/.test(k)) return `${k}: ${v}`
  return ''
})
const serverMappingError = computed(() => {
  for (const [k, v] of Object.entries(errors.value)) if (/^model_mapping([.[]|$)/.test(k)) return k === 'model_mapping' ? v : `${k}: ${v}`
  return ''
})

let formRequest = 0
watch(
  () => [props.account, props.accountType] as const,
  async ([a, at], previous) => {
    const request = ++formRequest
    const switchingAuth = !a && !previous?.[0] && sameCreationGroup(at, previous?.[1])
    activeSection.value = 'connection'
    errors.value = {}
    credErrors.value = {}
    modelsError.value = ''
    mappingError.value = ''
    modelsTextMode.value = false
    mappingJsonMode.value = false
    modelDraft.value = ''
    if (!switchingAuth) {
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
      // Load CCGateway-specific settings
      resetEnvironment(a?.settings)
      if (a) {
        models.value = [...(a.models || [])]
        mapping.value = { ...(a.model_mapping || {}) }
        prefilled.value = false
        if (shouldPrefillOnEdit(a, at)) applyDefaults(at)
      } else {
        applyDefaults(at)
      }
    } else if (sameDefaults(previous?.[1])) {
      // Switching the auth method of a new account: untouched defaults follow the type.
      applyDefaults(at)
    }
    if (switchingAuth) {
      for (const field of ['auto_disable', 'schedulable'] as const) {
        const control = accountControl(at, field)
        if (!control.configurable || basic[field] === accountControl(previous?.[1], field).default) basic[field] = control.default
      }
    }
    credentials.value = { ...(a?.credentials || {}) }
    schema.value = null
    uiSchema.value = null
    formError.value = ''
    formLoading.value = false
    if (at && at.form.mode === 'schema') {
      formLoading.value = true
      try {
        const f = await api.get<{ schema: Record<string, any>; ui_schema?: Record<string, any> }>(
          `/account-types/${encodeURIComponent(at.plugin_key)}/${encodeURIComponent(at.type)}/form`
        )
        if (request !== formRequest) return
        schema.value = f.schema
        uiSchema.value = f.ui_schema || null
      } catch (e) {
        if (request === formRequest) formError.value = errorMessage(e)
      } finally {
        if (request === formRequest) formLoading.value = false
      }
    }
  },
  { immediate: true }
)

// Server-side credential errors are stale once the user edits the form.
watch(
  credentials,
  () => {
    if (Object.keys(credErrors.value).length) credErrors.value = {}
  },
  { deep: true }
)

async function collectCredentials(): Promise<Record<string, any> | null> {
  if (!props.accountType) return credentials.value
  if (mode.value === 'schema') {
    if (!schemaForm.value?.validate()) return null
    return credentials.value
  }
  if (mode.value === 'iframe') {
    if (!iframe.value?.isReady()) {
      toast(t('pluginHost.frameNotReady'), 'warning')
      return null
    }
    const v = await iframe.value.validate().catch(() => ({ ok: false }))
    if (!v?.ok) return null
    return (await iframe.value.getValue()) || {}
  }
  if (mode.value === 'native') {
    const fn = nativeRef.value?.validate
    if (typeof fn === 'function' && !(await fn())) return null
    return credentials.value
  }
  return credentials.value
}

async function save(event: Event) {
  if (locationLoading.value) return
  // Check native constraints explicitly so the first invalid field can be
  // revealed before the browser tries to focus it in a hidden pane.
  const form = event.currentTarget as HTMLFormElement
  const invalid = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input:invalid, select:invalid, textarea:invalid')
  if (invalid) {
    const section = invalid.closest<HTMLElement>('[data-editor-section]')?.dataset.editorSection
    if (section) activeSection.value = section as EditorSection
    await nextTick()
    if (invalid.isConnected) invalid.reportValidity()
    return
  }
  errors.value = {}
  credErrors.value = {}
  if (!basic.name.trim()) {
    activeSection.value = 'connection'
    errors.value = { name: t('ui.schema.v.required') }
    return
  }
  if (ccgSaveBlocked.value) {
    void showCcgAuth()
    return
  }
  // Pending text-mode / draft edits are committed (and validated) before saving.
  if (modelsTextMode.value) {
    if (!syncModelsText()) { activeSection.value = 'models'; return }
  } else {
    commitDraft()
    if (modelsError.value) { activeSection.value = 'models'; return }
  }
  if (mappingJsonMode.value && !syncMappingText()) { activeSection.value = 'models'; return }
  const mapErr = validateMapping(mapping.value)
  if (mapErr) {
    activeSection.value = 'models'
    mappingError.value = mapErr
    return
  }
  const creds = await collectCredentials()
  if (!creds) { activeSection.value = 'connection'; return }
  saving.value = true
  await loadAutoDisablePolicy()
  const body: Record<string, any> = {
    name: basic.name.trim(),
    group_ids: basic.group_ids,
    priority: Number(basic.priority),
    weight: Number(basic.weight),
    max_concurrency: Number(basic.max_concurrency),
    models: models.value,
    model_mapping: Object.fromEntries(Object.entries(mapping.value).map(([from, to]) => [from, to.trim()])),
    rpm_limit: Number(basic.rpm_limit) || 0,
    tpm_limit: Number(basic.tpm_limit) || 0,
  }
  if (schedulingControl.value.configurable) body.schedulable = basic.schedulable
  if (autoDisableEnabled.value === true && autoDisableControl.value.configurable) body.auto_disable = basic.auto_disable
  // Add CCGateway-specific settings (locale and timezone)
  if (needsProxy.value) {
    body.settings = { locale: ccgSettings.locale, timezone: ccgSettings.timezone }
  }
  // Exactly one of proxy_id / proxy_url (CONTRACTS §21.4: both is a conflict).
  const withProxyUrl = !!proxyUrlToSend.value
  if (withProxyUrl) body.proxy_url = proxyUrlToSend.value
  else body.proxy_id = basic.proxy_id
  if (props.accountType && !props.account?.orphaned) body.credentials = creds
  try {
    let saved: Account
    if (editing.value) {
      saved = await api.patch<Account>(`/accounts/${props.account!.id}`, body)
    } else {
      // The account type is (plugin_key, type); accounts have no platform.
      body.plugin_key = props.accountType!.plugin_key
      body.type = props.accountType!.type
      // A new Claude Code account adopts its authorized draft container.
      if (ccgDraft.value && ccgState.value.key) body[preparationUrl.value ? 'preparation_key' : 'ccgateway_runtime'] = ccgState.value.key
      saved = await api.post<Account>('/accounts', body)
      if (body.preparation_key || body.ccgateway_runtime) ccgAuth.value?.adopt()
    }
    toast(editing.value ? t('common.updated') : t('common.created'), 'success')
    if (withProxyUrl) {
      // The proxy picker cache may now miss the (re)used proxy.
      useProxiesLookup(true)
      if (saved?.proxy_created) toast(t('accounts.proxyAutoCreated'), 'info')
    }
    emit('saved', saved)
  } catch (e) {
    // The draft was refused (gone, or no longer signed in): back to the authorization steps.
    const ccgReason = ccgDraft.value ? reasonOf(e) : ''
    if (ccgReason === 'draft_not_found' || ccgReason === 'draft_not_authorized') {
      ccgAuth.value?.rejected(ccgReason)
      toast(t(`ccgateway.reason.${ccgReason}`), 'error')
      void showCcgAuth()
      return
    }
    const all = fieldErrors(e)
    const cred: Record<string, string> = {}
    const base: Record<string, string> = {}
    for (const [k, v] of Object.entries(all)) {
      const m = /^credentials[.[]?(.*?)]?$/.exec(k)
      if (m && k.startsWith('credentials')) cred[m[1].replace(/^\./, '')] = v
      else base[k] = v
    }
    errors.value = base
    credErrors.value = cred
    if (Object.keys(cred).length || ['name', 'group_ids', 'proxy_id', 'proxy_url', 'settings', 'settings.locale', 'settings.timezone'].some(k => k in base)) activeSection.value = 'connection'
    else if (Object.keys(base).some(k => k === 'models' || k.startsWith('models.') || k.startsWith('models[') || k.startsWith('model_mapping'))) activeSection.value = 'models'
    else if (Object.keys(base).length) activeSection.value = 'scheduling'
    if (mode.value === 'iframe' && Object.keys(cred).length) iframe.value?.setErrors(cred)
    if (!Object.keys(all).length) notifyError(e)
  } finally {
    saving.value = false
  }
}
</script>


<template>
  <form ref="formEl" class="space-y-5" novalidate @submit.prevent="save">
    <div class="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside class="space-y-3 self-start md:sticky md:top-0">
        <!-- account type identity -->
        <div v-if="accountType" class="hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-3 md:block dark:border-dark-700 dark:from-dark-800 dark:to-dark-800/40" data-testid="editor-type-card">
          <div class="flex items-center gap-2.5">
            <PluginAvatar :name="lt(accountType.plugin_name) || accountType.plugin_key" :plugin-key="accountType.plugin_key" :icon="accountType.icon" :asset-base="accountType.asset_base" size="md" />
            <div class="min-w-0">
              <div class="truncate text-sm font-semibold text-fg">{{ lt(accountType.label) || accountType.type }}</div>
              <div class="truncate text-xs text-fg-muted">
                {{ lt(accountType.plugin_name) || accountType.plugin_key }}<span v-if="accountType.plugin_version" class="font-mono"> · v{{ accountType.plugin_version }}</span>
              </div>
            </div>
          </div>
          <div v-if="accountType.platforms.length" class="mt-2.5 flex flex-wrap gap-1 text-xs">
            <PlatformBadges :items="accountType.platforms" />
          </div>
        </div>

        <nav :aria-label="t('accounts.editorUi.navigation')" class="flex gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
          <button
            v-for="(section, i) in editorSections"
            :key="section.key"
            type="button"
            :aria-pressed="activeSection === section.key"
            :data-testid="`account-section-${section.key}`"
            class="group flex min-w-[11rem] shrink-0 items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors md:min-w-0"
            :class="activeSection === section.key ? 'bg-primary-50 ring-1 ring-primary-200 dark:bg-primary-900/20 dark:ring-primary-800' : 'hover:bg-gray-50 dark:hover:bg-dark-700/50'"
            @click="activeSection = section.key"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
              :class="activeSection === section.key ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30' : 'bg-gray-100 text-fg-muted group-hover:text-gray-700 dark:bg-dark-700'"
            >
              <SIcon :name="section.icon" class="h-4 w-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-1.5 text-sm font-medium" :class="activeSection === section.key ? 'text-primary-700 dark:text-primary-300' : 'text-gray-800 dark:text-gray-200'">
                <span class="text-xs tabular-nums opacity-50">{{ i + 1 }}</span>
                {{ section.label }}
                <SStatusDot v-if="sectionErrors[section.key]" tone="danger" :label="t('accounts.editorUi.sectionHasErrors')" sr-only :title="t('accounts.editorUi.sectionHasErrors')" />
              </span>
              <span class="mt-0.5 block truncate text-xs text-fg-muted" :title="section.summary">{{ section.summary }}</span>
            </span>
          </button>
        </nav>
      </aside>

      <div class="min-w-0 md:min-h-[30rem]">
        <!-- ============================================================ 接入配置 -->
        <div v-show="activeSection === 'connection'" data-editor-section="connection" class="space-y-4">
          <SCard :title="t('accounts.basic')" :subtitle="t('accounts.editorUi.basicHint')">
            <div class="grid gap-4 md:grid-cols-2">
              <SField :label="t('common.name')" :error="errors.name" required>
                <SInput v-model="basic.name" :maxlength="100" :placeholder="t('accounts.editorUi.namePlaceholder')" />
              </SField>
              <SField :label="t('accounts.groups')" :error="errors.group_ids" :hint="basic.group_ids.length ? '' : t('accounts.editorUi.groupsHint')">
                <GroupPicker v-model="basic.group_ids as any" multiple />
              </SField>
              <div ref="proxyFieldEl" class="md:col-span-2" data-testid="proxy-field">
                <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span class="input-label !mb-0">{{ t('accounts.proxy') }}</span>
                  <SSegmented :model-value="proxyMode" :options="proxyModeOptions" size="sm" :aria-label="t('accounts.proxy')" data-testid="proxy-mode" @update:model-value="setProxyMode(String($event))" />
                </div>
                <ProxyPicker v-if="proxyMode === 'existing'" :model-value="basic.proxy_id" @update:model-value="setProxy" />
                <div v-else class="flex gap-2">
                  <SInput
                    v-model="proxyUrl"
                    class="flex-1"
                    mono
                    :error="!!errors.proxy_url"
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
                <p v-if="(proxyMode === 'url' ? errors.proxy_url : errors.proxy_id)" class="input-error-text">{{ proxyMode === 'url' ? errors.proxy_url : errors.proxy_id }}</p>
                <p v-else-if="proxyMode === 'url' && proxyUrlHint" class="mt-1 text-xs text-warning-600 dark:text-warning-400" data-testid="proxy-url-hint">{{ proxyUrlHint }}</p>
                <p v-else-if="proxyMode === 'url'" class="input-hint">{{ t('accounts.proxyUrlHint') }}</p>
                <p v-if="probed && proxyMode === 'existing' && basic.proxy_id === probed.id" class="mt-1 text-xs text-success-600 dark:text-success-400" role="status" data-testid="proxy-probe-result">
                  {{ t(probed.created ? 'accounts.proxyProbeCreated' : 'accounts.proxyProbeReused', { protocol: probed.protocol, ip: probed.ip, id: probed.id }) }}
                </p>
                <p v-if="needsProxy" class="mt-1 text-xs text-fg-muted" data-testid="proxy-required-hint">{{ t('ccgateway.accountAuth.proxyRequiredHint') }}</p>
                <p v-if="ccgDraft" class="mt-1 text-xs text-fg-muted" data-testid="proxy-draft-hint">{{ t('ccgateway.accountAuth.draftProxyHint') }}</p>
              </div>
              <p v-if="account?.lifecycle_sync" class="input-hint md:col-span-2" role="status" data-testid="account-lifecycle-status">
                {{ t(`accounts.lifecycle.${account.lifecycle_sync.status}`) }}
                <span v-if="account.lifecycle_sync.code === 'environment_requires_new_runtime'">{{ t('accounts.lifecycle.environmentDeferred') }}</span>
              </p>
              <!-- CCGateway locale and timezone settings -->
              <template v-if="needsProxy">
                <SField :label="t('ccgateway.locale')" :hint="t('ccgateway.localeHint')" :error="errors['settings.locale'] || errors.settings">
                  <SSelect :model-value="ccgSettings.locale || null" :options="localeOptions" searchable :aria-label="t('ccgateway.locale')" :placeholder="t('ccgateway.environmentDefault')" :no-results="t('ccgateway.environmentNoResults')" :disabled="locationLoading || !!(preparationUrl && ccgState.key)" data-testid="container-locale" @update:model-value="ccgSettings.locale = String($event ?? '')" />
                </SField>
                <SField :label="t('ccgateway.timezone')" :hint="t('ccgateway.timezoneHint')" :error="errors['settings.timezone']">
                  <SSelect :model-value="ccgSettings.timezone || null" :options="timezoneOptions" searchable :aria-label="t('ccgateway.timezone')" :placeholder="t('ccgateway.environmentDefault')" :no-results="t('ccgateway.environmentNoResults')" :disabled="locationLoading || !!(preparationUrl && ccgState.key)" data-testid="container-timezone" @update:model-value="ccgSettings.timezone = String($event ?? '')" />
                </SField>
                <p class="input-hint md:col-span-2" role="status" data-testid="container-location-status">
                  <template v-if="preparationUrl && ccgState.key">{{ t('accounts.lifecycle.preparationFrozen') }}</template>
                  <template v-else-if="locationLoading">{{ t('ccgateway.environmentLoading') }}</template>
                  <template v-else-if="locationStatus === 'filled'">{{ t('ccgateway.environmentFilled', { ip: locationIP }) }}</template>
                  <template v-else-if="locationStatus === 'failed'">{{ t('ccgateway.environmentFailed') }}</template>
                  <template v-else-if="proxyMode === 'url'">{{ t('ccgateway.environmentProxyURL') }}</template>
                </p>
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
              <div v-if="formLoading" class="flex justify-center py-6"><SSpinner /></div>
              <SHint v-else-if="formError" tone="danger">{{ formError }}</SHint>
              <SchemaForm v-else-if="schema" ref="schemaForm" v-model="credentials" :schema="schema" :ui-schema="uiSchema" :errors="credErrors" :widgets="schemaWidgets" />
              <template v-if="ccgOAuth">
                <!-- Claude Code (CCGateway) OAuth: the credentials live in the account's own container; it is authorized right here (new accounts: before saving). -->
                <div ref="ccgPanelEl">
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
              </template>
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
              <component
                :is="nativeComponent"
                v-if="nativeComponent"
                ref="nativeRef"
                v-model="credentials"
                :mode="editing ? 'edit' : 'create'"
                :account="account"
                :errors="credErrors"
              />
              <SHint v-else tone="danger">
                {{ plugins.errors[accountType.plugin_key] || t('accounts.formUnavailable') }}
              </SHint>
            </template>

            <div class="mt-4 space-y-3 empty:hidden">
              <PluginSlot name="account.form.widgets" :props="{ account, accountType, credentials }" />
            </div>
          </SCard>
        </div>

        <!-- ============================================================ 模型 -->
        <div v-show="activeSection === 'models'" data-editor-section="models" class="space-y-4">
          <SAlert v-if="prefilled && !editing" tone="primary" dense data-testid="models-prefilled">{{ t('accounts.editorUi.prefilled', { what: prefillWhat }) }}</SAlert>
          <SAlert v-else-if="prefilled" tone="warning" dense data-testid="models-prefilled-edit">
            {{ t('accounts.editorUi.prefilledEdit', { what: prefillWhat }) }}
            <template #actions>
              <SButton size="sm" variant="ghost" data-testid="models-prefilled-clear" @click="clearPrefill">{{ t('accounts.editorUi.clearModels') }}</SButton>
            </template>
          </SAlert>

          <SCard :title="t('accounts.models')" :subtitle="t('accounts.editorUi.modelsCardHint')">
            <template #title><h3 class="flex items-center gap-2 text-sm font-semibold text-fg">{{ t('accounts.models') }}
              <SBadge :tone="models.length ? 'primary' : 'gray'" data-testid="models-count">{{ models.length ? models.length : t('accounts.editorUi.allModels') }}</SBadge></h3>
            </template>
            <template #actions>
              <SLink as="button" class="text-xs" data-testid="models-text-toggle" @click="toggleModelsText">
                {{ modelsTextMode ? t('accounts.tagEdit') : t('accounts.textEdit') }}
              </SLink>
            </template>

            <div class="mb-3 flex flex-wrap items-center gap-2">
              <SButton v-if="defaultModels.length" size="sm" data-testid="models-fill-defaults" :title="t('accounts.editorUi.fillDefaultsHint')" @click="fillDefaultModels">
                <SIcon name="download" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.fillDefaults', { n: defaultModels.length }) }}
              </SButton>
              <SButton v-if="canFetch" size="sm" :loading="fetching" data-testid="models-fetch" :title="t('accounts.fetchModelsHint')" @click="fetchModels">
                <SIcon v-if="!fetching" name="refresh" class="h-3.5 w-3.5" />{{ t('accounts.fetchModels') }}
              </SButton>
              <SButton size="sm" variant="ghost" :disabled="!models.length" data-testid="models-copy" @click="copyModels">
                <SIcon name="copy" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.copyModels') }}
              </SButton>
              <SButton size="sm" variant="ghost" :disabled="!models.length && !modelsText.trim()" data-testid="models-clear" @click="clearModels">
                <SIcon name="trash" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.clearModels') }}
              </SButton>
            </div>

            <SField :error="modelsError || serverModelsError">
              <STextarea
                v-if="modelsTextMode"
                v-model="modelsText"
                mono
                :rows="8"
                :placeholder="t('accounts.modelsTextPlaceholder')"
                @blur="syncModelsText()"
              />
              <div v-else class="space-y-3">
                <ModelListEditor v-model="models" :options="[...defaultModels, ...modelOptions]" :mapping="mapping" @update:model-value="modelsError = ''" />
                <div class="flex items-center gap-2">
                  <SInput v-model="modelDraft" size="sm" mono list="account-model-options" class="min-w-0 flex-1" :placeholder="t('accounts.modelsPlaceholder')" :aria-label="t('accounts.modelsPlaceholder')" @keydown="onModelKey" @blur="commitDraft" />
                  <SButton size="sm" :disabled="!modelDraft.trim()" @click="commitDraft"><SIcon name="plus" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.addModels') }}</SButton>
                </div>
              </div>
              <template #hint>
                <span v-if="!models.length" class="inline-flex items-center gap-1 text-success-600 dark:text-success-400">
                  <SIcon name="check" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.unrestricted') }}
                </span>
                <span v-else>{{ t('accounts.editorUi.modelsInputHint') }}</span>
              </template>
            </SField>
            <p class="mt-3 flex items-start gap-1.5 text-xs text-fg-subtle"><SIcon name="info" class="mt-px h-3.5 w-3.5 shrink-0" />{{ t('accounts.editorUi.groupModelHint') }}</p>
            <datalist id="account-model-options">
              <option v-for="o in modelOptions" :key="o" :value="o" />
            </datalist>
          </SCard>

          <SCard :title="t('accounts.modelMapping')" :subtitle="t('accounts.editorUi.mappingCardHint')">
            <template #title><h3 class="flex items-center gap-2 text-sm font-semibold text-fg">{{ t('accounts.modelMapping') }}<SBadge v-if="Object.keys(mapping).length" tone="accent">{{ Object.keys(mapping).length }}</SBadge></h3>
            </template>
            <template #actions>
              <SButton v-if="Object.keys(defaultMapping).length" size="sm" data-testid="mapping-fill-defaults" @click="fillDefaultMapping">
                <SIcon name="download" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.fillDefaultMapping', { n: Object.keys(defaultMapping).length }) }}
              </SButton>
              <SLink as="button" class="ml-1 text-xs" data-testid="mapping-json-toggle" @click="toggleMappingJSON">
                {{ mappingJsonMode ? t('accounts.tableEdit') : t('accounts.jsonEdit') }}
              </SLink>
            </template>

            <SField :error="mappingError || serverMappingError">
              <STextarea
                v-if="mappingJsonMode"
                v-model="mappingText"
                mono
                :rows="8"
                placeholder="{&quot;claude-3-5-sonnet-latest&quot;: &quot;claude-sonnet-4-5&quot;}"
                @blur="syncMappingText()"
              />
              <ModelMappingEditor v-else v-model="mapping" :models="models" list-id="account-model-options" @add-models="mergeModels" />
            </SField>
          </SCard>
        </div>

        <!-- ============================================================ 调度与限流 -->
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
            <SSettingRow v-for="f in limitFields" :key="f.key" :label="f.label" :description="f.hint" :error="errors[f.key]">
              <SInput v-model.number="basic[f.key]" type="number" :min="0" :suffix="f.unit" class="w-full sm:w-48" />
            </SSettingRow>
          </SSettingsGroup>
        </div>
      </div>
    </div>

    <!-- fetched models picker -->
    <SModal v-model:open="fetchOpen" :title="t('accounts.fetchModelsTitle', { n: fetched.length })" width="md">
      <div class="mb-2 flex items-center justify-between text-xs">
        <SHint inline size="xs">
          {{ t('accounts.fetchPicked', { n: fetchPickedCount, total: fetched.length }) }}
          <span v-if="fetchedSkipped"> · {{ t('accounts.fetchSkipped', { n: fetchedSkipped }) }}</span>
        </SHint>
        <span class="flex gap-2">
          <SLink as="button" @click="setAllFetched(true)">{{ t('accounts.selectAll') }}</SLink>
          <SLink as="button" @click="setAllFetched(false)">{{ t('accounts.selectNone') }}</SLink>
        </span>
      </div>
      <div class="max-h-[50vh] space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2 dark:border-dark-700" data-testid="fetched-models">
        <SCheckbox v-for="m in fetched" :key="m" v-model="fetchPicked[m]">
          <span class="inline-flex items-center gap-2">
            <span class="font-mono text-xs">{{ m }}</span>
            <SBadge v-if="models.includes(m)" tone="gray" size="xs">{{ t('accounts.fetchAlready') }}</SBadge>
          </span>
        </SCheckbox>
      </div>
      <template #footer>
        <SButton @click="fetchOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :disabled="!fetchPickedCount" @click="applyFetched">{{ t('accounts.fetchApply') }}</SButton>
      </template>
    </SModal>

    <div class="sticky -bottom-5 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-white py-4 dark:border-dark-700 dark:bg-dark-800">
      <SButton v-if="!editing" class="mr-auto" variant="ghost" @click="emit('back')"><SIcon name="arrow-left" class="h-4 w-4" />{{ t('common.previous') }}</SButton>
      <SButton v-if="canTestAccount" class="mr-auto" @click="emit('test', account!)"><SIcon name="play" class="h-4 w-4" />{{ t('accounts.testConnection') }}</SButton>
      <span v-if="editing && prefilled" class="inline-flex flex-wrap items-center gap-x-2 text-xs text-warning-700 dark:text-warning-300" data-testid="footer-prefilled">
        <SIcon name="info" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.prefilledFooter') }}
        <SLink v-if="activeSection !== 'models'" as="button" class="text-xs" @click="activeSection = 'models'">{{ t('accounts.editorUi.prefilledView') }}</SLink>
        <SLink as="button" class="text-xs" @click="clearPrefill">{{ t('accounts.editorUi.clearModels') }}</SLink>
      </span>
      <span v-if="ccgSaveBlocked" class="inline-flex flex-wrap items-center gap-x-2 text-xs text-warning-700 dark:text-warning-300" data-testid="footer-ccg-blocked">
        <SIcon name="info" class="h-3.5 w-3.5" />{{ t('ccgateway.accountAuth.saveBlocked') }}
        <SLink as="button" class="text-xs" @click="showCcgAuth">{{ t('ccgateway.accountAuth.saveBlockedFix') }}</SLink>
      </span>
      <SButton @click="emit('cancel')">{{ t('common.cancel') }}</SButton>
      <SButton type="submit" variant="primary" :loading="saving" :disabled="formLoading || !!formError || ccgSaveBlocked || locationLoading" data-testid="account-save">{{ editing ? t('common.save') : t('accounts.editorUi.create') }}</SButton>
    </div>
  </form>
</template>
