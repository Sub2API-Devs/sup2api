// Model list of the account editor (CONTRACTS §16, §18), edited like new-api's
// channel form: a tag select or a JSON array. useModelEdit composes it with the
// mapping, the plugin defaults (§41) and the priced models offered as
// suggestions; the editor commits the JSON boxes before it saves.
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from '@sub2api/ui'
import { copyText } from '@/utils/format'
import { mergeIds, parseModelListText, type ModelIdProblem } from './modelIds'

export type ModelTextProblem = ModelIdProblem | { kind: 'notObject' } | { kind: 'notArray' }

const modelsJSON = (list: string[]) => (list.length ? JSON.stringify(list, null, 2) : '')

export function useModelList() {
  const { t } = useI18n()
  const models = ref<string[]>([])
  const modelsText = ref('')
  const modelsTextMode = ref(false)
  const modelsError = ref('')

  /** A server error text for a parsed problem (shared with the mapping's). */
  const problemText = (p: ModelTextProblem) =>
    p.kind === 'notObject'
      ? t('accounts.mappingNotObject')
      : p.kind === 'notArray'
        ? t('accounts.modelsNotArray')
        : t(p.kind === 'invalid' ? 'accounts.modelInvalid' : 'accounts.modelDuplicate', { model: p.model })

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

  return {
    models, modelsText, modelsTextMode, modelsError, modelsSynced, problemText,
    setModels, rejectModel, syncModelsText, setModelsTextMode, formatModelsText, mergeModels, clearModels, copyModels
  }
}

export type ModelList = ReturnType<typeof useModelList>
