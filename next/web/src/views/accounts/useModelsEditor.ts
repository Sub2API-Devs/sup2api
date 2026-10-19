// Model list and model mapping of the account editor (CONTRACTS §16, §18),
// edited like new-api's channel form: the list as a tag select or a JSON
// array, the mapping as rows or a JSON object; plus the plugin defaults
// (§41) and the priced models offered as suggestions. The editor commits
// the JSON boxes (commitPending) before it saves.
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { toast } from '@sub2api/ui'
import type { AccountType, Price } from '@/api/types'
import { copyText } from '@/utils/format'
import { mappingProblem, mergeIds, parseModelListText, type ModelIdProblem } from './modelIds'

type Mapping = Record<string, string>

/** Example of the mapping JSON box: request model -> upstream model. */
const MAPPING_TEMPLATE: Mapping = { 'claude-3-5-sonnet-latest': 'claude-sonnet-4-5', 'claude-3-opus-latest': 'claude-opus-4-1' }

const modelsJSON = (list: string[]) => (list.length ? JSON.stringify(list, null, 2) : '')
const mappingJSON = (m: Mapping) => (Object.keys(m).length ? JSON.stringify(m, null, 2) : '')

export function useModelsEditor(accountType: () => AccountType | null | undefined, subscription: () => string | null | undefined = () => undefined) {
  const { t } = useI18n()
  const models = ref<string[]>([])
  const mapping = ref<Mapping>({})
  /**
   * The models / mapping were prefilled with the plugin defaults (shows a
   * notice). When editing, the account was "all models" before: nothing is
   * stored until it is saved.
   */
  const prefilled = ref(false)
  const modelsText = ref('')
  const modelsTextMode = ref(false)
  const modelsError = ref('')
  const mappingText = ref('')
  const mappingJsonMode = ref(false)
  const mappingError = ref('')

  const defaultsFor = (at: AccountType | null | undefined) =>
    at?.default_models_by_subscription?.[subscription() || ''] ?? at?.default_models ?? []
  const defaultModels = computed(() => defaultsFor(accountType()))
  const defaultMapping = computed<Mapping>(() => accountType()?.default_model_mapping || {})
  /** "12 models" (+ "and 3 mappings" only when the preset has a mapping; most have none). */
  const prefillWhat = computed(() => {
    const n = Object.keys(defaultMapping.value).length
    const m = defaultModels.value.length
    return n ? t('accounts.editorUi.prefillWhatMapping', { models: m, mapping: n }) : t('accounts.editorUi.prefillWhat', { models: m })
  })

  /** Suggestions for the model ids: every priced model, loaded once. */
  const modelOptions = ref<string[]>([])
  api.list<Price>('/prices', { page_size: 500 })
    .then((r) => { modelOptions.value = [...new Set(r.items.map((p) => p.model).filter(Boolean))].sort() })
    .catch(() => undefined)

  const problemText = (p: ModelIdProblem | { kind: 'notObject' } | { kind: 'notArray' }) =>
    p.kind === 'notObject'
      ? t('accounts.mappingNotObject')
      : p.kind === 'notArray'
        ? t('accounts.modelsNotArray')
        : t(p.kind === 'invalid' ? 'accounts.modelInvalid' : 'accounts.modelDuplicate', { model: p.model })

  // ---------------------------------------------------------------- model list

  function setModels(next: string[]) {
    models.value = next
    if (modelsTextMode.value) modelsText.value = modelsJSON(next)
    modelsError.value = ''
  }

  /** A typed id the tag select refused. */
  function rejectModel(model: string) {
    modelsError.value = t('accounts.modelInvalid', { model })
  }

  /** Parses the JSON box back into `models`; false (with an error) on bad input. */
  function syncModelsText(): boolean {
    const r = parseModelListText(modelsText.value)
    if ('problem' in r) {
      modelsError.value = problemText(r.problem)
      return false
    }
    models.value = r.ids
    modelsError.value = ''
    return true
  }
  /** The JSON box is parsed first (a no-op with the tag select). */
  const modelsSynced = () => !modelsTextMode.value || syncModelsText()

  /** Switches between the tag select (false) and the JSON box (true). */
  function setModelsTextMode(on: boolean) {
    if (on === modelsTextMode.value) return
    if (!on) {
      if (syncModelsText()) modelsTextMode.value = false
      return
    }
    modelsText.value = modelsJSON(models.value)
    modelsError.value = ''
    modelsTextMode.value = true
  }

  /** Rewrites the JSON box as a formatted array. */
  function formatModelsText() {
    if (syncModelsText()) modelsText.value = modelsJSON(models.value)
  }

  /** Appends the models missing from the list; returns how many were added. */
  function mergeModels(list: string[]): number {
    if (!modelsSynced()) return 0
    const before = models.value.length
    setModels(mergeIds(models.value, list))
    return models.value.length - before
  }

  function clearModels() {
    models.value = []
    modelsText.value = ''
    modelsError.value = ''
  }

  async function copyModels() {
    if (!modelsSynced()) return
    if (await copyText(models.value.join(','))) toast(t('accounts.editorUi.copied', { n: models.value.length }), 'success')
  }

  /** Merges the default models into the list; existing entries are kept. */
  function fillDefaultModels() {
    if (!modelsSynced()) return
    const added = mergeModels(defaultModels.value)
    toast(added ? t('accounts.editorUi.defaultsAdded', { n: added }) : t('accounts.editorUi.defaultsNothingNew'), added ? 'success' : 'info')
  }

  // ---------------------------------------------------------------- mapping

  /** Parses the JSON box back into `mapping`. */
  function syncMappingText(): boolean {
    const raw = mappingText.value.trim()
    let parsed: unknown = {}
    try {
      if (raw) parsed = JSON.parse(raw)
    } catch {
      mappingError.value = t('accounts.mappingInvalidJSON')
      return false
    }
    const p = mappingProblem(parsed)
    mappingError.value = p ? problemText(p) : ''
    if (!p) mapping.value = parsed as Mapping
    return !p
  }

  /** Switches between the row editor (false) and the JSON box (true). */
  function setMappingJsonMode(on: boolean) {
    if (on === mappingJsonMode.value) return
    if (!on) {
      if (syncMappingText()) mappingJsonMode.value = false
      return
    }
    mappingText.value = mappingJSON(mapping.value)
    mappingError.value = ''
    mappingJsonMode.value = true
  }

  /** Rewrites the JSON box formatted. */
  function formatMappingText() {
    if (syncMappingText()) mappingText.value = mappingJSON(mapping.value)
  }

  /** An example mapping to start from (new-api's 填入模板); replaces the JSON box. */
  function fillMappingTemplate() {
    mappingText.value = JSON.stringify(MAPPING_TEMPLATE, null, 2)
    mappingError.value = ''
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
    if (mappingJsonMode.value) mappingText.value = mappingJSON(next)
    if (models.value.length) mergeModels(Object.keys(defaultMapping.value))
    toast(added ? t('accounts.editorUi.defaultMappingAdded', { n: added }) : t('accounts.editorUi.defaultsNothingNew'), added ? 'success' : 'info')
  }

  // ---------------------------------------------------------------- defaults, load and save

  /** Back to "all models": clears the prefilled list and mapping. */
  function clearPrefill() {
    clearModels()
    mapping.value = {}
    mappingText.value = ''
    mappingError.value = ''
    prefilled.value = false
  }
  const sameDefaults = (at: AccountType | null | undefined) =>
    JSON.stringify(models.value) === JSON.stringify(defaultsFor(at)) && JSON.stringify(mapping.value) === JSON.stringify(at?.default_model_mapping || {})
  function applyDefaults(at: AccountType | null | undefined) {
    models.value = [...defaultsFor(at)]
    mapping.value = { ...(at?.default_model_mapping || {}) }
    prefilled.value = models.value.length > 0 || Object.keys(mapping.value).length > 0
  }
  /** The account's saved list and mapping. */
  function setSaved(list: string[] | undefined, map: Mapping | undefined) {
    models.value = [...(list || [])]
    mapping.value = { ...(map || {}) }
    prefilled.value = false
  }
  /** Back to tag / row editing without errors. */
  function resetEditing() {
    modelsError.value = ''
    mappingError.value = ''
    modelsTextMode.value = false
    mappingJsonMode.value = false
  }

  /** Commits the JSON boxes; false (with an error shown) when something is invalid. */
  function commitPending(): boolean {
    if (modelsTextMode.value && !syncModelsText()) return false
    if (!modelsTextMode.value && modelsError.value) return false
    if (mappingJsonMode.value && !syncMappingText()) return false
    const p = mappingProblem(mapping.value)
    if (p) mappingError.value = problemText(p)
    return !p
  }

  /** models / model_mapping of the request body (mapped models trimmed). */
  const payload = () => ({
    models: models.value,
    model_mapping: Object.fromEntries(Object.entries(mapping.value).map(([from, to]) => [from, to.trim()]))
  })

  return {
    models, mapping, prefilled, prefillWhat, defaultModels, defaultMapping, modelOptions,
    modelsText, modelsTextMode, modelsError, mappingText, mappingJsonMode, mappingError,
    setModels, rejectModel, syncModelsText, setModelsTextMode, formatModelsText, mergeModels, clearModels, copyModels, fillDefaultModels,
    syncMappingText, setMappingJsonMode, formatMappingText, fillMappingTemplate, fillDefaultMapping,
    clearPrefill, sameDefaults, applyDefaults, setSaved, resetEditing, commitPending, payload
  }
}
