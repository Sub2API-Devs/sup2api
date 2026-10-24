// The account editor's model list and mapping (CONTRACTS §16, §18, §41): a
// thin composition of useModelList (the list, tag select or JSON array) and
// useModelEdit (mapping, plugin defaults, suggestions, commit and payload).
import type { AccountType } from '@/api/types'
import { useModelEdit } from './useModelEdit'

export function useModelsEditor(accountType: () => AccountType | null | undefined, subscription: () => string | null | undefined = () => undefined) {
  const edit = useModelEdit(accountType, subscription)
  const { list } = edit
  return {
    models: list.models,
    modelsText: list.modelsText,
    modelsTextMode: list.modelsTextMode,
    modelsError: list.modelsError,
    mapping: edit.mapping,
    prefilled: edit.prefilled,
    prefillWhat: edit.prefillWhat,
    defaultModels: edit.defaultModels,
    defaultMapping: edit.defaultMapping,
    modelOptions: edit.modelOptions,
    mappingText: edit.mappingText,
    mappingJsonMode: edit.mappingJsonMode,
    mappingError: edit.mappingError,
    setModels: list.setModels,
    rejectModel: list.rejectModel,
    syncModelsText: list.syncModelsText,
    setModelsTextMode: list.setModelsTextMode,
    formatModelsText: list.formatModelsText,
    mergeModels: list.mergeModels,
    clearModels: list.clearModels,
    copyModels: list.copyModels,
    fillDefaultModels: edit.fillDefaultModels,
    syncMappingText: edit.syncMappingText,
    setMappingJsonMode: edit.setMappingJsonMode,
    formatMappingText: edit.formatMappingText,
    fillMappingTemplate: edit.fillMappingTemplate,
    fillDefaultMapping: edit.fillDefaultMapping,
    clearPrefill: edit.clearPrefill,
    sameDefaults: edit.sameDefaults,
    applyDefaults: edit.applyDefaults,
    setSaved: edit.setSaved,
    resetEditing: edit.resetEditing,
    commitPending: edit.commitPending,
    payload: edit.payload
  }
}
