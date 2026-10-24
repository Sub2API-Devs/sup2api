<script setup lang="ts">
// Model list and mapping cards of the account editor (CONTRACTS §16, §18, §41):
// the list as a tag select or a JSON array, the mapping as rows or a JSON
// object, with the plugin defaults and the priced-model suggestions. The state
// and the actions are the editor's own (useModelEdit, shared with
// AccountEditor through `editor`); this card only renders them.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SBadge, SButton, SCard, SField, SHint, SIcon, SSettingRow, SSegmented, SSwitch, STextarea } from '@sub2api/ui'
import ModelTagSelect from '@/components/models/ModelTagSelect.vue'
import ModelMappingEditor from './ModelMappingEditor.vue'
import { mappingErrorText, modelsErrorText } from './editorErrors'
import type { useModelEdit } from './useModelEdit'

const props = defineProps<{
  /** The list / mapping editor (useModelEdit): shared refs, its state and its actions. */
  editor: ReturnType<typeof useModelEdit>
  /** CCGateway accounts: they have the "automatic models" switch. */
  gateway: boolean
  automatic: boolean
  editing: boolean
  draft: boolean
  canFetch: boolean
  fetching: boolean
  /** Server field errors of the whole form (models.*, model_mapping.*). */
  errors: Record<string, string>
  /** Merge ticked models into the list; the editor's guard (automatic models) stays in AccountEditor. */
  mergeModels: (ids: string[]) => number
}>()
const emit = defineEmits<{ (e: 'fetch'): void }>()
/** "Automatic models": both transitions start from the preset (see the card's switch). */
const autoModels = defineModel<boolean>('autoModels', { required: true })

const { t } = useI18n()
const {
  models, modelsText, modelsTextMode, modelsError, mapping, mappingText, mappingJsonMode, mappingError,
  defaultModels, defaultMapping, modelOptions, prefilled, prefillWhat,
  setModels, rejectModel, syncModelsText, setModelsTextMode, formatModelsText, copyModels, clearModels, fillDefaultModels,
  syncMappingText, setMappingJsonMode, formatMappingText, fillMappingTemplate, fillDefaultMapping, clearPrefill
} = props.editor

/** JSON example of the mapping box (not an i18n message: braces are placeholders there). */
const mappingPlaceholder = '{\n  "claude-3-5-sonnet-latest": "claude-sonnet-4-5"\n}'
/** 可视化 / JSON switch of the model list and mapping cards (new-api's 可视化 / 手动编辑). */
const editModes = computed(() => [{ value: 'visual', label: t('accounts.editorUi.visualEdit') }, { value: 'json', label: 'JSON' }])
const mappingCount = computed(() => Object.keys(mapping.value).length)
const defaultMappingCount = computed(() => Object.keys(defaultMapping.value).length)
const serverModelsError = computed(() => modelsErrorText(props.errors))
const serverMappingError = computed(() => mappingErrorText(props.errors))

/**
 * Auto models on/off: the list follows the preset in both directions. Only a
 * saved manual account keeps its custom list (fillForm sets the ref directly).
 */
function setAutoModels(value: boolean) {
  autoModels.value = value
  setModels([...defaultModels.value])
  prefilled.value = false
}
</script>

<template>
  <div class="space-y-4">
    <SSettingRow v-if="gateway" :label="t('accounts.editorUi.autoModels')" :description="t('accounts.editorUi.autoModelsHint')">
      <SSwitch :model-value="autoModels" :aria-label="t('accounts.editorUi.autoModels')" data-testid="auto-models" @update:model-value="setAutoModels" />
    </SSettingRow>
    <SAlert v-if="prefilled && !editing && !automatic" tone="primary" dense data-testid="models-prefilled">{{ t('accounts.editorUi.prefilled', { what: prefillWhat }) }}</SAlert>
    <SAlert v-else-if="prefilled && !automatic" tone="warning" dense data-testid="models-prefilled-edit">
      {{ t('accounts.editorUi.prefilledEdit', { what: prefillWhat }) }}
      <template #actions>
        <SButton size="sm" variant="ghost" data-testid="models-prefilled-clear" @click="clearPrefill()">{{ t('accounts.editorUi.clearModels') }}</SButton>
      </template>
    </SAlert>
    <SHint v-if="draft && automatic" size="xs" class="block" data-testid="models-by-subscription">{{ t('accounts.modelsBySubscription') }}</SHint>

    <SCard :subtitle="t('accounts.editorUi.modelsCardHint')">
      <template #title>
        <h3 class="flex items-center gap-2 text-sm font-semibold text-fg">
          {{ t('accounts.models') }}
          <SBadge :tone="models.length ? 'primary' : 'gray'" data-testid="models-count">{{ models.length || t('accounts.editorUi.allModels') }}</SBadge>
        </h3>
      </template>
      <template #actions>
        <SSegmented size="sm" :options="editModes" :model-value="modelsTextMode ? 'json' : 'visual'" :aria-label="t('accounts.models')" data-testid="models-mode" @update:model-value="setModelsTextMode($event === 'json')" />
      </template>

      <SField :error="modelsError || serverModelsError">
        <div v-if="modelsTextMode" class="space-y-2">
          <STextarea v-model="modelsText" :readonly="automatic" mono :rows="10" :placeholder="t('accounts.modelsJsonPlaceholder')" data-testid="models-json" @blur="syncModelsText()" />
        </div>
        <ModelTagSelect v-else :model-value="models" :readonly="automatic" :options="[...defaultModels, ...modelOptions]" :mapping="mapping" :placeholder="t('accounts.modelsPlaceholder')" :error="!!(modelsError || serverModelsError)" @update:model-value="setModels" @invalid="rejectModel" />
        <template #hint>
          <span v-if="automatic">{{ t('accounts.editorUi.autoModelsHint') }}</span>
          <SHint v-else-if="!models.length && !modelsTextMode" inline size="xs" tone="success" class="inline-flex items-center gap-1"><SIcon name="check" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.unrestricted') }}</SHint>
          <template v-else>{{ modelsTextMode ? t('accounts.editorUi.modelsJsonHint') : t('accounts.editorUi.modelsInputHint') }}</template>
        </template>
      </SField>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <SButton v-if="defaultModels.length && !automatic" size="sm" variant="primary" icon="download" data-testid="models-fill-defaults" :title="t('accounts.editorUi.fillDefaultsHint')" @click="fillDefaultModels()">{{ t('accounts.editorUi.fillDefaults', { n: defaultModels.length }) }}</SButton>
        <SButton v-if="canFetch && !automatic" size="sm" icon="refresh" :loading="fetching" data-testid="models-fetch" :title="t('accounts.fetchModelsHint')" @click="emit('fetch')">{{ t('accounts.fetchModels') }}</SButton>
        <SButton v-if="modelsTextMode && !automatic" size="sm" variant="ghost" icon="code" data-testid="models-format" @click="formatModelsText()">{{ t('accounts.editorUi.formatJson') }}</SButton>
        <SButton size="sm" variant="ghost" icon="copy" :disabled="!models.length" data-testid="models-copy" @click="copyModels()">{{ t('accounts.editorUi.copyModels') }}</SButton>
        <SButton v-if="!automatic" size="sm" variant="ghost" icon="trash" :disabled="!models.length && !modelsText.trim()" data-testid="models-clear" @click="clearModels()">{{ t('accounts.editorUi.clearModels') }}</SButton>
      </div>
      <p class="mt-3 flex items-start gap-1.5 text-xs text-fg-subtle"><SIcon name="info" class="mt-px h-3.5 w-3.5 shrink-0" />{{ t('accounts.editorUi.groupModelHint') }}</p>
      <datalist id="account-model-options">
        <option v-for="o in modelOptions" :key="o" :value="o" />
      </datalist>
    </SCard>

    <SCard :subtitle="t('accounts.editorUi.mappingCardHint')">
      <template #title>
        <h3 class="flex items-center gap-2 text-sm font-semibold text-fg">{{ t('accounts.modelMapping') }}<SBadge v-if="mappingCount" tone="accent">{{ mappingCount }}</SBadge></h3>
      </template>
      <template #actions>
        <SSegmented size="sm" :options="editModes" :model-value="mappingJsonMode ? 'json' : 'visual'" :aria-label="t('accounts.modelMapping')" data-testid="mapping-mode" @update:model-value="setMappingJsonMode($event === 'json')" />
      </template>

      <SField :error="mappingError || serverMappingError">
        <STextarea v-if="mappingJsonMode" v-model="mappingText" mono :rows="10" :placeholder="mappingPlaceholder" data-testid="mapping-json" @blur="syncMappingText()" />
        <ModelMappingEditor v-else v-model="mapping" :models="models" list-id="account-model-options" @add-models="mergeModels($event)" />
        <template #hint>{{ t('accounts.editorUi.mappingKeyHint') }}</template>
      </SField>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <SButton v-if="defaultMappingCount" size="sm" icon="download" data-testid="mapping-fill-defaults" @click="fillDefaultMapping()">{{ t('accounts.editorUi.fillDefaultMapping', { n: defaultMappingCount }) }}</SButton>
        <template v-if="mappingJsonMode">
          <SButton size="sm" variant="ghost" icon="list" data-testid="mapping-template" @click="fillMappingTemplate()">{{ t('accounts.editorUi.fillTemplate') }}</SButton>
          <SButton size="sm" variant="ghost" icon="code" data-testid="mapping-format" @click="formatMappingText()">{{ t('accounts.editorUi.formatJson') }}</SButton>
        </template>
      </div>
    </SCard>
  </div>
</template>
