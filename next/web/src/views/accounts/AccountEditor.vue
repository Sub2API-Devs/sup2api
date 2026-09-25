<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SField, SKeyValue, SModal, SSpinner, SSwitch, toast } from '@sub2api/ui'
import type { Account, AccountType, Price } from '@/api/types'
import SchemaForm from '@/components/schema/SchemaForm.vue'
import PluginIframe from '@/components/plugin/PluginIframe.vue'
import PluginSlot from '@/components/plugin/PluginSlot.vue'
import GroupPicker from '@/components/GroupPicker.vue'
import ProxyPicker from '@/components/ProxyPicker.vue'
import { lt } from '@/i18n'
import { assetURL, usePluginStore } from '@/stores/plugins'
import { useAuthStore } from '@/stores/auth'
import { useProxiesLookup } from '@/composables/lookups'
import { ACCOUNT_KEYS, useOwnership } from '@/composables/useOwnership'
import { errorMessage, fieldErrors, notifyError } from '@/utils/errors'
import { looksLikeProxyURL, parseProxyURL } from '@/utils/proxyUrl'

// Step 2 of "new account" and the edit form (wireframe A.4, CONTRACTS §18.4):
// 基本信息 / 调度 / 限流 / 模型 / 模型映射 (all core) + the plugin credential form.
const props = defineProps<{ accountType: AccountType | null; account?: Account | null }>()
const emit = defineEmits<{ (e: 'saved', a: Account): void; (e: 'cancel'): void; (e: 'back'): void; (e: 'test', a: Account): void }>()
const { t } = useI18n()
const plugins = usePluginStore()
const auth = useAuthStore()
const own = useOwnership()

const editing = computed(() => !!props.account?.id)
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
    if (!syncModelsText()) return
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
  if (!creds) return
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

watch(
  () => [props.account, props.accountType] as const,
  async ([a, at]) => {
    errors.value = {}
    credErrors.value = {}
    modelsError.value = ''
    mappingError.value = ''
    modelsTextMode.value = false
    mappingJsonMode.value = false
    modelDraft.value = ''
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
    models.value = [...(a?.models || [])]
    mapping.value = { ...(a?.model_mapping || {}) }
    credentials.value = { ...(a?.credentials || {}) }
    schema.value = null
    uiSchema.value = null
    formError.value = ''
    if (at && at.form.mode === 'schema') {
      formLoading.value = true
      try {
        const f = await api.get<{ schema: Record<string, any>; ui_schema?: Record<string, any> }>(
          `/account-types/${encodeURIComponent(at.plugin_key)}/${encodeURIComponent(at.type)}/form`
        )
        schema.value = f.schema
        uiSchema.value = f.ui_schema || null
      } catch (e) {
        formError.value = errorMessage(e)
      } finally {
        formLoading.value = false
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

async function save() {
  errors.value = {}
  credErrors.value = {}
  if (!basic.name.trim()) {
    errors.value = { name: t('schema.v.required') }
    return
  }
  // Pending text-mode / draft edits are committed (and validated) before saving.
  if (modelsTextMode.value) {
    if (!syncModelsText()) return
  } else {
    commitDraft()
    if (modelsError.value) return
  }
  if (mappingJsonMode.value && !syncMappingText()) return
  const mapErr = validateMapping(mapping.value)
  if (mapErr) {
    mappingError.value = mapErr
    return
  }
  const creds = await collectCredentials()
  if (!creds) return
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
    if (mode.value === 'iframe' && Object.keys(cred).length) iframe.value?.setErrors(cred)
    if (!Object.keys(all).length) notifyError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <!-- 基本信息 -->
    <section>
      <div class="mb-3 flex items-center justify-between">
        <h4 class="section-title !mb-0">{{ t('accounts.basic') }}</h4>
        <span class="badge badge-gray">{{ t('accounts.core') }}</span>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <SField :label="t('common.name')" :error="errors.name" required>
          <input v-model="basic.name" class="input" maxlength="100" />
        </SField>
        <SField :label="t('accounts.groups')" :error="errors.group_ids">
          <GroupPicker v-model="basic.group_ids as any" multiple />
        </SField>
        <SField :label="t('accounts.proxy')" :error="proxyMode === 'url' ? errors.proxy_url : errors.proxy_id" :hint="proxyMode === 'url' && !proxyUrlHint ? t('accounts.proxyUrlHint') : ''">
          <div class="mb-2 inline-flex rounded-lg bg-gray-100 p-0.5 text-xs dark:bg-dark-700" role="tablist" data-testid="proxy-mode">
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
          <ProxyPicker v-if="proxyMode === 'existing'" v-model="basic.proxy_id" />
          <template v-else>
            <input
              v-model="proxyUrl"
              class="input font-mono text-sm"
              :class="errors.proxy_url ? 'input-error' : ''"
              autocomplete="off"
              spellcheck="false"
              data-testid="proxy-url"
              placeholder="socks5://user:pass@host:port"
            />
            <p v-if="proxyUrlHint && !errors.proxy_url" class="mt-1 text-xs text-amber-600 dark:text-amber-400" data-testid="proxy-url-hint">{{ proxyUrlHint }}</p>
          </template>
        </SField>
      </div>
    </section>

    <!-- 调度 -->
    <section class="border-t border-gray-100 pt-5 dark:border-dark-700">
      <h4 class="section-title">{{ t('accounts.scheduling') }}</h4>
      <div class="grid gap-4 sm:grid-cols-3">
        <SField :label="t('accounts.priority')" :hint="t('accounts.priorityHint')" :error="errors.priority">
          <input v-model.number="basic.priority" type="number" min="0" max="1000000" class="input" />
        </SField>
        <SField :label="t('accounts.weight')" :hint="t('accounts.weightHint')" :error="errors.weight">
          <input v-model.number="basic.weight" type="number" min="1" max="1000" class="input" />
        </SField>
        <SField :label="t('accounts.maxConcurrency')" :hint="t('accounts.zeroUnlimited')" :error="errors.max_concurrency">
          <input v-model.number="basic.max_concurrency" type="number" min="0" class="input" />
        </SField>
      </div>
      <div class="mt-3">
        <SSwitch v-model="basic.schedulable" :label="t('accounts.schedulable')" />
      </div>
    </section>

    <!-- 限流 -->
    <section class="border-t border-gray-100 pt-5 dark:border-dark-700">
      <h4 class="section-title">{{ t('accounts.limits') }}</h4>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SField :label="t('accounts.rpmLimit')" :hint="errors.rpm_limit ? '' : t('accounts.zeroUnlimited')" :error="errors.rpm_limit">
          <input v-model.number="basic.rpm_limit" type="number" min="0" class="input" />
        </SField>
        <SField :label="t('accounts.tpmLimit')" :hint="errors.tpm_limit ? '' : t('accounts.zeroUnlimited')" :error="errors.tpm_limit">
          <input v-model.number="basic.tpm_limit" type="number" min="0" class="input" />
        </SField>
        <SField :label="t('accounts.tpdLimit')" :hint="errors.tpd_limit ? '' : t('accounts.tpdHint')" :error="errors.tpd_limit">
          <input v-model.number="basic.tpd_limit" type="number" min="0" class="input" />
        </SField>
        <SField :label="t('accounts.spmLimit')" :hint="errors.spm_limit ? '' : t('accounts.zeroUnlimited')" :error="errors.spm_limit">
          <input v-model.number="basic.spm_limit" type="number" min="0" class="input" />
        </SField>
      </div>
      <p class="mt-2 text-xs text-gray-500 dark:text-dark-400">{{ t('accounts.spmHint') }}</p>
    </section>

    <!-- 模型 -->
    <section class="border-t border-gray-100 pt-5 dark:border-dark-700">
      <div class="mb-3 flex items-center justify-between">
        <h4 class="section-title !mb-0">{{ t('accounts.models') }}</h4>
        <div class="flex items-center gap-3">
          <button
            v-if="canFetch"
            type="button"
            class="link text-xs"
            :disabled="fetching"
            data-testid="models-fetch"
            :title="t('accounts.fetchModelsHint')"
            @click="fetchModels"
          >
            {{ fetching ? t('common.loading') : t('accounts.fetchModels') }}
          </button>
          <button type="button" class="link text-xs" data-testid="models-text-toggle" @click="toggleModelsText">
            {{ modelsTextMode ? t('accounts.tagEdit') : t('accounts.textEdit') }}
          </button>
        </div>
      </div>

      <textarea
        v-if="modelsTextMode"
        v-model="modelsText"
        class="input font-mono text-sm"
        rows="5"
        :placeholder="t('accounts.modelsTextPlaceholder')"
        @blur="syncModelsText()"
      />
      <div
        v-else
        class="input flex min-h-[42px] flex-wrap items-center gap-1.5 !py-1.5"
        data-testid="models-tags"
      >
        <span
          v-for="(m, i) in models"
          :key="m"
          class="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-0.5 font-mono text-xs text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
        >
          {{ m }}
          <button type="button" class="opacity-60 hover:opacity-100" @click="removeModel(i)">×</button>
        </span>
        <input
          v-model="modelDraft"
          list="account-model-options"
          class="min-w-[10rem] flex-1 border-0 bg-transparent p-0.5 text-sm outline-none focus:ring-0"
          :placeholder="t('accounts.modelsPlaceholder')"
          @keydown="onModelKey"
          @blur="commitDraft"
        />
        <datalist id="account-model-options">
          <option v-for="o in modelOptions" :key="o" :value="o" />
        </datalist>
      </div>
      <p v-if="modelsError || serverModelsError" class="input-error-text">{{ modelsError || serverModelsError }}</p>
      <p v-else class="input-hint">{{ t('accounts.modelsHint') }}</p>
    </section>

    <!-- 模型映射 -->
    <section class="border-t border-gray-100 pt-5 dark:border-dark-700">
      <div class="mb-3 flex items-center justify-between">
        <h4 class="section-title !mb-0">{{ t('accounts.modelMapping') }}</h4>
        <button type="button" class="link text-xs" data-testid="mapping-json-toggle" @click="toggleMappingJSON">
          {{ mappingJsonMode ? t('accounts.tableEdit') : t('accounts.jsonEdit') }}
        </button>
      </div>

      <textarea
        v-if="mappingJsonMode"
        v-model="mappingText"
        class="input font-mono text-sm"
        rows="6"
        placeholder="{&quot;claude-3-5-sonnet-latest&quot;: &quot;claude-sonnet-4-5&quot;}"
        @blur="syncMappingText()"
      />
      <SKeyValue
        v-else
        v-model="mapping"
        :key-label="t('accounts.mappingFrom')"
        :value-label="t('accounts.mappingTo')"
        key-placeholder="claude-3-5-sonnet-latest"
        value-placeholder="claude-sonnet-4-5"
      />
      <p v-if="mappingError || serverMappingError" class="input-error-text">{{ mappingError || serverMappingError }}</p>
      <p v-else class="input-hint">{{ t('accounts.modelMappingHint') }}</p>
    </section>

    <!-- 凭证 -->
    <section class="border-t border-gray-100 pt-5 dark:border-dark-700">
      <div class="mb-3 flex items-center justify-between">
        <h4 class="section-title !mb-0">{{ t('accounts.credentials') }}</h4>
        <span v-if="accountType" class="badge badge-purple">{{ lt(accountType.plugin_name) || accountType.plugin_key }} · {{ lt(accountType.label) || accountType.type }}</span>
      </div>

      <p v-if="account?.orphaned || !accountType" class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
        {{ t('accounts.orphanedEdit') }}
      </p>
      <template v-else-if="mode === 'schema'">
        <div v-if="formLoading" class="flex justify-center py-6"><SSpinner /></div>
        <p v-else-if="formError" class="text-sm text-red-500">{{ formError }}</p>
        <SchemaForm v-else-if="schema" ref="schemaForm" v-model="credentials" :schema="schema" :ui-schema="uiSchema" :errors="credErrors" />
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
        <p v-else class="text-sm text-red-500">{{ t('accounts.formUnavailable') }}</p>
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
        <p v-else class="text-sm text-red-500">
          {{ plugins.errors[accountType.plugin_key] || t('accounts.formUnavailable') }}
        </p>
      </template>

      <div class="mt-4 space-y-3">
        <PluginSlot name="account.form.widgets" :props="{ account, accountType, credentials }" />
      </div>
    </section>

    <!-- fetched models picker -->
    <SModal v-model:open="fetchOpen" :title="t('accounts.fetchModelsTitle', { n: fetched.length })" width="md">
      <div class="mb-2 flex items-center justify-between text-xs">
        <span class="muted">
          {{ t('accounts.fetchPicked', { n: fetchPickedCount, total: fetched.length }) }}
          <span v-if="fetchedSkipped"> · {{ t('accounts.fetchSkipped', { n: fetchedSkipped }) }}</span>
        </span>
        <span class="flex gap-2">
          <button type="button" class="link" @click="setAllFetched(true)">{{ t('accounts.selectAll') }}</button>
          <button type="button" class="link" @click="setAllFetched(false)">{{ t('accounts.selectNone') }}</button>
        </span>
      </div>
      <div class="max-h-[50vh] space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2 dark:border-dark-700" data-testid="fetched-models">
        <label v-for="m in fetched" :key="m" class="flex items-center gap-2 text-sm">
          <input v-model="fetchPicked[m]" type="checkbox" class="checkbox" />
          <span class="font-mono text-xs">{{ m }}</span>
          <span v-if="models.includes(m)" class="badge badge-gray text-[10px]">{{ t('accounts.fetchAlready') }}</span>
        </label>
      </div>
      <template #footer>
        <SButton @click="fetchOpen = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :disabled="!fetchPickedCount" @click="applyFetched">{{ t('accounts.fetchApply') }}</SButton>
      </template>
    </SModal>

    <div class="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-dark-700">
      <SButton v-if="!editing" class="mr-auto" variant="ghost" @click="emit('back')">← {{ t('common.previous') }}</SButton>
      <SButton v-if="canTestAccount" class="mr-auto" @click="emit('test', account!)">{{ t('accounts.testConnection') }}</SButton>
      <SButton @click="emit('cancel')">{{ t('common.cancel') }}</SButton>
      <SButton type="submit" variant="primary" :loading="saving">{{ t('common.save') }}</SButton>
    </div>
  </form>
</template>
