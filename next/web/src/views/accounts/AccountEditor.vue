<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCheckbox, SchemaForm, SField, SHint, SIcon, SInput, SLink, SModal, SSpinner, SSwitch, STextarea, toast } from '@sub2api/ui'
import type { Account, AccountType, Price } from '@/api/types'
import { schemaWidgets } from '@/components/schema/widgets'
import PluginIframe from '@/components/plugin/PluginIframe.vue'
import PluginSlot from '@/components/plugin/PluginSlot.vue'
import GroupPicker from '@/components/GroupPicker.vue'
import ProxyPicker from '@/components/ProxyPicker.vue'
import PluginAvatar from '@/views/plugins/parts/PluginAvatar.vue'
import PlatformBadges from '@/views/platforms/PlatformBadges.vue'
import { lt } from '@/i18n'
import { sameCreationGroup } from './accountTypeChoices'
import EditorCard from './EditorCard.vue'
import ModelMappingEditor from './ModelMappingEditor.vue'
import { assetURL, usePluginStore } from '@/stores/plugins'
import { useAuthStore } from '@/stores/auth'
import { useProxiesLookup } from '@/composables/lookups'
import { ACCOUNT_KEYS, useOwnership } from '@/composables/useOwnership'
import { errorMessage, fieldErrors, notifyError } from '@/utils/errors'
import { copyText } from '@/utils/format'
import { looksLikeProxyURL, parseProxyURL } from '@/utils/proxyUrl'

// Step 2 of "new account" and the edit form (wireframe A.4, CONTRACTS §18.4):
// 基本信息 / 调度 / 限流 / 模型 / 模型映射 (all core) + the plugin credential form.
// A new account starts from the plugin's default models and mapping (§41).
const props = defineProps<{ accountType: AccountType | null; accountTypeOptions?: AccountType[]; account?: Account | null }>()
const emit = defineEmits<{ (e: 'change-type', at: AccountType): void; (e: 'saved', a: Account): void; (e: 'cancel'): void; (e: 'back'): void; (e: 'test', a: Account): void }>()
const { t } = useI18n()
const plugins = usePluginStore()
const auth = useAuthStore()
const own = useOwnership()

const editing = computed(() => !!props.account?.id)
const authOptions = computed(() => (props.accountTypeOptions || []).map(at => ({ value: at.type, label: lt(at.auth_method_label) || at.type })))
function changeAuth(value: unknown) {
  const at = props.accountTypeOptions?.find(at => at.type === value)
  if (!editing.value && at && at.type !== props.accountType?.type) emit('change-type', at)
}
const mode = computed(() => props.accountType?.form.mode || 'schema')
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
  rpm_limit: 0,
  tpm_limit: 0,
  tpd_limit: 0,
  spm_limit: 0
})

// ---------------------------------------------------------------- proxy: pick an existing one | paste a URL (CONTRACTS §21.4)
// "url" sends proxy_url instead of proxy_id; the server parses it, reuses a
// matching proxy the caller can see or creates one, and answers proxy_created.
type ProxyMode = 'existing' | 'url'
const proxyMode = ref<ProxyMode>('existing')
const proxyUrl = ref('')
const proxyModeTabs = computed(() => [
  { key: 'existing', label: t('accounts.proxyPickExisting') },
  { key: 'url', label: t('accounts.proxyPasteUrl') }
])
/** The proxy_url that will be sent, or '' (existing mode / empty input). */
const proxyUrlToSend = computed(() => (proxyMode.value === 'url' ? proxyUrl.value.trim() : ''))
/** Shape hint only (the server validates): shown while the pasted text does not look like scheme://host:port. */
const proxyUrlHint = computed(() => {
  const raw = proxyUrl.value.trim()
  if (!raw) return ''
  const r = parseProxyURL(raw)
  if (r.ok) return ''
  if (r.error === 'scheme') return looksLikeProxyURL(raw) ? t('accounts.proxyUrlSchemeHint') : t('accounts.proxyUrlShapeHint')
  if (r.error === 'port') return t('accounts.proxyUrlPortHint')
  if (r.error === 'extra') return t('accounts.proxyUrlExtraHint')
  return t('accounts.proxyUrlShapeHint')
})
function setProxyMode(m: string) {
  proxyMode.value = m as ProxyMode
  if (errors.value.proxy_url || errors.value.proxy_id) {
    const { proxy_url: _u, proxy_id: _i, ...rest } = errors.value
    errors.value = rest
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
const SCHEDULING_FIELDS = ['priority', 'weight', 'max_concurrency', 'rpm_limit', 'tpm_limit', 'tpd_limit', 'spm_limit']
type LimitKey = 'rpm_limit' | 'tpm_limit' | 'tpd_limit' | 'spm_limit'
const limitFields = computed<Array<{ key: LimitKey; label: string; hint: string; unit: string }>>(() => [
  { key: 'rpm_limit', label: t('accounts.rpmLimit'), hint: t('accounts.zeroUnlimited'), unit: t('accounts.editorUi.unitRpm') },
  { key: 'tpm_limit', label: t('accounts.tpmLimit'), hint: t('accounts.zeroUnlimited'), unit: t('accounts.editorUi.unitTpm') },
  { key: 'tpd_limit', label: t('accounts.tpdLimit'), hint: t('accounts.tpdHint'), unit: t('accounts.editorUi.unitTpd') },
  { key: 'spm_limit', label: t('accounts.spmLimit'), hint: t('accounts.zeroUnlimited'), unit: t('accounts.editorUi.unitSpm') }
])
/** Sections holding an error, marked in the navigation. */
const sectionErrors = computed<Record<EditorSection, boolean>>(() => ({
  connection: ['name', 'group_ids', 'proxy_id', 'proxy_url'].some((k) => errors.value[k]) || Object.keys(credErrors.value).length > 0,
  models: !!(modelsError.value || serverModelsError.value || mappingError.value || serverMappingError.value),
  scheduling: SCHEDULING_FIELDS.some((k) => errors.value[k])
}))

// ---------------------------------------------------------------- plugin defaults (CONTRACTS §41)
const defaultModels = computed(() => props.accountType?.default_models || [])
const defaultMapping = computed(() => props.accountType?.default_model_mapping || {})
/** The new account was prefilled with the plugin defaults (shows a notice). */
const prefilled = ref(false)
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
      basic.schedulable = a?.schedulable ?? true
      basic.rpm_limit = a?.rpm_limit ?? 0
      basic.tpm_limit = a?.tpm_limit ?? 0
      basic.tpd_limit = a?.tpd_limit ?? 0
      basic.spm_limit = a?.spm_limit ?? 0
      if (a) {
        models.value = [...(a.models || [])]
        mapping.value = { ...(a.model_mapping || {}) }
        prefilled.value = false
      } else {
        applyDefaults(at)
      }
    } else if (sameDefaults(previous?.[1])) {
      // Switching the auth method of a new account: untouched defaults follow the type.
      applyDefaults(at)
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
  const body: Record<string, any> = {
    name: basic.name.trim(),
    group_ids: basic.group_ids,
    priority: Number(basic.priority),
    weight: Number(basic.weight),
    max_concurrency: Number(basic.max_concurrency),
    schedulable: basic.schedulable,
    models: models.value,
    model_mapping: mapping.value,
    rpm_limit: Number(basic.rpm_limit) || 0,
    tpm_limit: Number(basic.tpm_limit) || 0,
    tpd_limit: Number(basic.tpd_limit) || 0,
    spm_limit: Number(basic.spm_limit) || 0
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
      saved = await api.post<Account>('/accounts', body)
    }
    toast(editing.value ? t('common.updated') : t('common.created'), 'success')
    if (withProxyUrl) {
      // The proxy picker cache may now miss the (re)used proxy.
      useProxiesLookup(true)
      if (saved?.proxy_created) toast(t('accounts.proxyAutoCreated'), 'info')
    }
    emit('saved', saved)
  } catch (e) {
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
    if (Object.keys(cred).length || ['name', 'group_ids', 'proxy_id', 'proxy_url'].some(k => k in base)) activeSection.value = 'connection'
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
              <div class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ lt(accountType.label) || accountType.type }}</div>
              <div class="truncate text-xs text-gray-500 dark:text-dark-400">
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
              :class="activeSection === section.key ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30' : 'bg-gray-100 text-gray-500 group-hover:text-gray-700 dark:bg-dark-700 dark:text-dark-300'"
            >
              <SIcon :name="section.icon" class="h-4 w-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-1.5 text-sm font-medium" :class="activeSection === section.key ? 'text-primary-700 dark:text-primary-300' : 'text-gray-800 dark:text-gray-200'">
                <span class="text-xs tabular-nums opacity-50">{{ i + 1 }}</span>
                {{ section.label }}
                <span v-if="sectionErrors[section.key]" class="h-1.5 w-1.5 rounded-full bg-red-500" :title="t('accounts.editorUi.sectionHasErrors')" />
              </span>
              <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-dark-400" :title="section.summary">{{ section.summary }}</span>
            </span>
          </button>
        </nav>
      </aside>

      <div class="min-w-0 md:min-h-[30rem]">
        <!-- ============================================================ 接入配置 -->
        <div v-show="activeSection === 'connection'" data-editor-section="connection" class="space-y-4">
          <EditorCard :title="t('accounts.basic')" :description="t('accounts.editorUi.basicHint')">
            <div class="grid gap-4 md:grid-cols-2">
              <SField :label="t('common.name')" :error="errors.name" required>
                <SInput v-model="basic.name" :maxlength="100" :placeholder="t('accounts.editorUi.namePlaceholder')" />
              </SField>
              <SField :label="t('accounts.groups')" :error="errors.group_ids" :hint="basic.group_ids.length ? '' : t('accounts.editorUi.groupsHint')">
                <GroupPicker v-model="basic.group_ids as any" multiple />
              </SField>
              <div class="md:col-span-2">
                <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label class="input-label !mb-0">{{ t('accounts.proxy') }}</label>
                  <div class="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs dark:bg-dark-700" role="tablist" data-testid="proxy-mode">
                    <button
                      v-for="tab in proxyModeTabs"
                      :key="tab.key"
                      type="button"
                      role="tab"
                      :aria-selected="proxyMode === tab.key"
                      :data-testid="`proxy-mode-${tab.key}`"
                      class="rounded-md px-2.5 py-1 font-medium transition-colors"
                      :class="proxyMode === tab.key ? 'bg-white text-gray-900 shadow-sm dark:bg-dark-800 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-gray-200'"
                      @click="setProxyMode(tab.key)"
                    >
                      {{ tab.label }}
                    </button>
                  </div>
                </div>
                <ProxyPicker v-if="proxyMode === 'existing'" v-model="basic.proxy_id" />
                <SInput
                  v-else
                  v-model="proxyUrl"
                  mono
                  :error="!!errors.proxy_url"
                  autocomplete="off"
                  spellcheck="false"
                  data-testid="proxy-url"
                  placeholder="socks5://user:pass@host:port"
                />
                <p v-if="(proxyMode === 'url' ? errors.proxy_url : errors.proxy_id)" class="input-error-text">{{ proxyMode === 'url' ? errors.proxy_url : errors.proxy_id }}</p>
                <p v-else-if="proxyMode === 'url' && proxyUrlHint" class="mt-1 text-xs text-amber-600 dark:text-amber-400" data-testid="proxy-url-hint">{{ proxyUrlHint }}</p>
                <p v-else-if="proxyMode === 'url'" class="input-hint">{{ t('accounts.proxyUrlHint') }}</p>
              </div>
            </div>
          </EditorCard>

          <EditorCard :title="t('accounts.credentials')" :description="accountType ? t('accounts.editorUi.credentialsHint', { plugin: lt(accountType.plugin_name) || accountType.plugin_key }) : ''">
            <template v-if="accountType?.auth_method_label && (editing || authOptions.length <= 1)" #actions>
              <SBadge tone="purple">{{ lt(accountType.auth_method_label) }}</SBadge>
            </template>

            <div v-if="!editing && authOptions.length > 1" class="mb-5">
              <div class="input-label">{{ t('accounts.editorUi.authMethod') }}</div>
              <div class="grid gap-2 sm:grid-cols-2" role="radiogroup" data-testid="auth-method">
                <button
                  v-for="o in authOptions"
                  :key="String(o.value)"
                  type="button"
                  role="radio"
                  :aria-checked="accountType?.type === o.value"
                  :disabled="saving"
                  class="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors"
                  :class="accountType?.type === o.value ? 'border-primary-400 bg-primary-50/70 text-primary-800 ring-1 ring-primary-200 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-200 dark:ring-primary-800' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-600 dark:text-gray-300 dark:hover:bg-dark-700/50'"
                  @click="changeAuth(o.value)"
                >
                  <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border" :class="accountType?.type === o.value ? 'border-primary-500' : 'border-gray-300 dark:border-dark-500'">
                    <span v-if="accountType?.type === o.value" class="h-2 w-2 rounded-full bg-primary-500" />
                  </span>
                  <span class="font-medium">{{ o.label }}</span>
                </button>
              </div>
            </div>

            <p v-if="account?.orphaned || !accountType" class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              {{ t('accounts.orphanedEdit') }}
            </p>
            <template v-else-if="mode === 'schema'">
              <div v-if="formLoading" class="flex justify-center py-6"><SSpinner /></div>
              <SHint v-else-if="formError" tone="danger">{{ formError }}</SHint>
              <SchemaForm v-else-if="schema" ref="schemaForm" v-model="credentials" :schema="schema" :ui-schema="uiSchema" :errors="credErrors" :widgets="schemaWidgets" />
              <p v-if="schema && !formLoading && !Object.keys(schema.properties || {}).length" class="rounded-xl bg-gray-50 px-3.5 py-3 text-sm text-gray-500 dark:bg-dark-900/40 dark:text-dark-400">{{ t('accounts.editorUi.noCredentials') }}</p>
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
          </EditorCard>
        </div>

        <!-- ============================================================ 模型 -->
        <div v-show="activeSection === 'models'" data-editor-section="models" class="space-y-4">
          <div v-if="prefilled && !editing" class="flex items-start gap-2 rounded-xl border border-primary-100 bg-primary-50/60 px-3.5 py-2.5 text-xs text-primary-800 dark:border-primary-900/50 dark:bg-primary-900/20 dark:text-primary-200" data-testid="models-prefilled">
            <SIcon name="info" class="mt-px h-4 w-4 shrink-0" />
            <span>{{ t('accounts.editorUi.prefilled', { models: defaultModels.length, mapping: Object.keys(defaultMapping).length }) }}</span>
          </div>

          <EditorCard :title="t('accounts.models')" :description="t('accounts.editorUi.modelsCardHint')">
            <template #badge>
              <SBadge :tone="models.length ? 'primary' : 'gray'" data-testid="models-count">{{ models.length ? models.length : t('accounts.editorUi.allModels') }}</SBadge>
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
              <div
                v-else
                class="input flex max-h-64 min-h-[3rem] flex-wrap content-start items-center gap-1.5 overflow-y-auto !py-2"
                data-testid="models-tags"
              >
                <span
                  v-for="(m, i) in models"
                  :key="m"
                  class="inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-xs"
                  :class="mapping[m] ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300' : 'border-primary-100 bg-primary-50 text-primary-700 dark:border-primary-900 dark:bg-primary-900/30 dark:text-primary-300'"
                  :title="mapping[m] ? t('accounts.editorUi.mappedTo', { model: mapping[m] }) : m"
                >
                  <span class="truncate">{{ m }}</span>
                  <SIcon v-if="mapping[m]" name="chevron-right" class="h-3 w-3 shrink-0 opacity-70" />
                  <button type="button" class="shrink-0 opacity-50 hover:opacity-100" :aria-label="t('ui.remove')" @click="removeModel(i)">
                    <SIcon name="x" class="h-3 w-3" />
                  </button>
                </span>
                <input
                  v-model="modelDraft"
                  list="account-model-options"
                  class="min-w-[12rem] flex-1 border-0 bg-transparent p-0.5 text-sm outline-none focus:ring-0"
                  :placeholder="t('accounts.modelsPlaceholder')"
                  @keydown="onModelKey"
                  @blur="commitDraft"
                />
              </div>
              <template #hint>
                <span v-if="!models.length" class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <SIcon name="check" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.unrestricted') }}
                </span>
                <span v-else>{{ t('accounts.editorUi.modelsInputHint') }}</span>
              </template>
            </SField>
            <datalist id="account-model-options">
              <option v-for="o in modelOptions" :key="o" :value="o" />
            </datalist>
          </EditorCard>

          <EditorCard :title="t('accounts.modelMapping')" :description="t('accounts.editorUi.mappingCardHint')">
            <template v-if="Object.keys(mapping).length" #badge>
              <SBadge tone="purple">{{ Object.keys(mapping).length }}</SBadge>
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
          </EditorCard>
        </div>

        <!-- ============================================================ 调度与限流 -->
        <div v-show="activeSection === 'scheduling'" data-editor-section="scheduling" class="space-y-4">
          <EditorCard :title="t('accounts.scheduling')" :description="t('accounts.editorUi.schedulingCardHint')">
            <div class="grid gap-4 sm:grid-cols-3">
              <SField :label="t('accounts.priority')" :hint="t('accounts.priorityHint')" :error="errors.priority">
                <SInput v-model.number="basic.priority" type="number" min="0" max="1000000" />
              </SField>
              <SField :label="t('accounts.weight')" :hint="t('accounts.weightHint')" :error="errors.weight">
                <SInput v-model.number="basic.weight" type="number" min="1" max="1000" />
              </SField>
              <SField :label="t('accounts.maxConcurrency')" :hint="t('accounts.zeroUnlimited')" :error="errors.max_concurrency">
                <SInput v-model.number="basic.max_concurrency" type="number" min="0" />
              </SField>
            </div>
            <div class="mt-4 flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-dark-700 dark:bg-dark-900/30">
              <div class="min-w-0">
                <div class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ t('accounts.schedulable') }}</div>
                <div class="text-xs text-gray-500 dark:text-dark-400">{{ t('accounts.editorUi.schedulableHint') }}</div>
              </div>
              <SSwitch v-model="basic.schedulable" :aria-label="t('accounts.schedulable')" />
            </div>
          </EditorCard>

          <EditorCard :title="t('accounts.limits')" :description="t('accounts.editorUi.limitsHint')">
            <div class="grid gap-4 sm:grid-cols-2">
              <SField v-for="f in limitFields" :key="f.key" :label="f.label" :hint="errors[f.key] ? '' : f.hint" :error="errors[f.key]">
                <div class="relative">
                  <SInput v-model.number="basic[f.key]" type="number" min="0" class="!pr-24" />
                  <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-400 dark:text-dark-400">{{ f.unit }}</span>
                </div>
              </SField>
            </div>
            <SHint size="xs" class="mt-3">{{ t('accounts.spmHint') }}</SHint>
          </EditorCard>
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
            <span v-if="models.includes(m)" class="badge badge-gray text-[10px]">{{ t('accounts.fetchAlready') }}</span>
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
      <SButton @click="emit('cancel')">{{ t('common.cancel') }}</SButton>
      <SButton type="submit" variant="primary" :loading="saving" :disabled="formLoading || !!formError">{{ editing ? t('common.save') : t('accounts.editorUi.create') }}</SButton>
    </div>
  </form>
</template>
