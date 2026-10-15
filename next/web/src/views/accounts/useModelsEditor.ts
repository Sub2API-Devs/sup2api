// Model list and model mapping of the account editor (CONTRACTS §16, §18):
// tag / text editing of the list, table / JSON editing of the mapping, the
// plugin defaults (§41) and the priced models offered as suggestions. The
// editor commits pending edits (commitPending) before it saves.
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { toast } from '@sub2api/ui'
import type { AccountType, Price } from '@/api/types'
import { copyText } from '@/utils/format'
import { mappingProblem, mergeIds, parseModelIds, type ModelIdProblem } from './modelIds'

type Mapping = Record<string, string>

export function useModelsEditor(accountType: () => AccountType | null | undefined) {
  const { t } = useI18n()
  const models = ref<string[]>([])
  const mapping = ref<Mapping>({})
  /**
   * The models / mapping were prefilled with the plugin defaults (shows a
   * notice). When editing, the account was "all models" before: nothing is
   * stored until it is saved.
   */
  const prefilled = ref(false)
  const modelDraft = ref('')
  const modelsText = ref('')
  const modelsTextMode = ref(false)
  const modelsError = ref('')
  const mappingText = ref('')
  const mappingJsonMode = ref(false)
  const mappingError = ref('')

  const defaultModels = computed(() => accountType()?.default_models || [])
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

  const problemText = (p: ModelIdProblem | { kind: 'notObject' }) =>
    p.kind === 'notObject' ? t('accounts.mappingNotObject') : t(p.kind === 'invalid' ? 'accounts.modelInvalid' : 'accounts.modelDuplicate', { model: p.model })

  // ---------------------------------------------------------------- model list

  function setModels(next: string[]) {
    models.value = next
    if (modelsTextMode.value) modelsText.value = next.join('\n')
    modelsError.value = ''
  }

  function commitDraft() {
    if (!modelDraft.value.trim()) return
    const r = parseModelIds(modelDraft.value, models.value)
    if ('problem' in r) {
      modelsError.value = problemText(r.problem)
      return
    }
    setModels([...models.value, ...r.ids])
    modelDraft.value = ''
  }

  function onModelKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitDraft()
    } else if (e.key === 'Backspace' && !modelDraft.value && models.value.length) {
      setModels(models.value.slice(0, -1))
    }
  }

  /** Parses the textarea back into `models`; false (with an error) on bad input. */
  function syncModelsText(): boolean {
    const r = parseModelIds(modelsText.value)
    if ('problem' in r) {
      modelsError.value = problemText(r.problem)
      return false
    }
    models.value = r.ids
    modelsError.value = ''
    return true
  }
  /** The text mode is parsed first (a no-op in tag mode). */
  const modelsSynced = () => !modelsTextMode.value || syncModelsText()

  function toggleModelsText() {
    if (modelsTextMode.value) {
      if (syncModelsText()) modelsTextMode.value = false
      return
    }
    commitDraft()
    modelsText.value = models.value.join('\n')
    modelsError.value = ''
    modelsTextMode.value = true
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
    modelDraft.value = ''
    modelsError.value = ''
  }

  async function copyModels() {
    if (!modelsSynced()) return
    if (await copyText(models.value.join(','))) toast(t('accounts.editorUi.copied', { n: models.value.length }), 'success')
  }

  /** Merges the default models into the list; existing entries are kept. */
  function fillDefaultModels() {
    if (!modelsSynced()) return
    commitDraft()
    const added = mergeModels(defaultModels.value)
    toast(added ? t('accounts.editorUi.defaultsAdded', { n: added }) : t('accounts.editorUi.defaultsNothingNew'), added ? 'success' : 'info')
  }

  // ---------------------------------------------------------------- mapping

  /** Parses the raw JSON textarea back into `mapping`. */
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

  function toggleMappingJSON() {
    if (mappingJsonMode.value) {
      if (syncMappingText()) mappingJsonMode.value = false
      return
    }
    mappingText.value = Object.keys(mapping.value).length ? JSON.stringify(mapping.value, null, 2) : ''
    mappingError.value = ''
    mappingJsonMode.value = true
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
    JSON.stringify(models.value) === JSON.stringify(at?.default_models || []) && JSON.stringify(mapping.value) === JSON.stringify(at?.default_model_mapping || {})
  function applyDefaults(at: AccountType | null | undefined) {
    models.value = [...(at?.default_models || [])]
    mapping.value = { ...(at?.default_model_mapping || {}) }
    prefilled.value = models.value.length > 0 || Object.keys(mapping.value).length > 0
  }
  /** The account's saved list and mapping. */
  function setSaved(list: string[] | undefined, map: Mapping | undefined) {
    models.value = [...(list || [])]
    mapping.value = { ...(map || {}) }
    prefilled.value = false
  }
  /** Back to tag / table editing without pending input or errors. */
  function resetEditing() {
    modelsError.value = ''
    mappingError.value = ''
    modelsTextMode.value = false
    mappingJsonMode.value = false
    modelDraft.value = ''
  }

  /** Commits the text / JSON modes and the typed draft; false (with an error shown) when something is invalid. */
  function commitPending(): boolean {
    if (modelsTextMode.value) {
      if (!syncModelsText()) return false
    } else {
      commitDraft()
      if (modelsError.value) return false
    }
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
    modelDraft, modelsText, modelsTextMode, modelsError, mappingText, mappingJsonMode, mappingError,
    commitDraft, onModelKey, syncModelsText, toggleModelsText, mergeModels, clearModels, copyModels, fillDefaultModels,
    syncMappingText, toggleMappingJSON, fillDefaultMapping,
    clearPrefill, sameDefaults, applyDefaults, setSaved, resetEditing, commitPending, payload
  }
}
