<script setup lang="ts">
// Model list and mapping cards of the account editor (CONTRACTS §16, §18, §41):
// the list as a tag select or a JSON array, the mapping as rows or a JSON
// object, with the plugin defaults and the priced-model suggestions. State and
// actions stay in AccountEditor's useModelsEditor; this card renders them.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SBadge, SButton, SCard, SField, SHint, SIcon, SSettingRow, SSegmented, SSwitch, STextarea } from '@sub2api/ui'
import ModelTagSelect from '@/components/models/ModelTagSelect.vue'
import ModelMappingEditor from './ModelMappingEditor.vue'

defineProps<{
  /** CCGateway accounts: "automatic models" (the subscription's default list). */
  gateway: boolean
  automatic: boolean
  prefilled: boolean
  editing: boolean
  prefillWhat: string
  draft: boolean
  canFetch: boolean
  fetching: boolean
  defaultModels: string[]
  modelOptions: string[]
  modelsError: string
  serverModelsError: string
  mappingError: string
  serverMappingError: string
  mappingCount: number
  defaultMappingCount: number
}>()
const emit = defineEmits<{
  (e: 'update:autoModels', v: boolean): void
  (e: 'fetch'): void
  (e: 'clear-prefill'): void
  (e: 'models-text-mode', on: boolean): void
  (e: 'sync-models-text'): void
  (e: 'format-models-text'): void
  (e: 'copy-models'): void
  (e: 'clear-models'): void
  (e: 'fill-default-models'): void
  (e: 'reject-model', model: string): void
  (e: 'mapping-json-mode', on: boolean): void
  (e: 'sync-mapping-text'): void
  (e: 'format-mapping-text'): void
  (e: 'fill-mapping-template'): void
  (e: 'fill-default-mapping'): void
  (e: 'merge-models', ids: string[]): void
}>()
const models = defineModel<string[]>('models', { required: true })
const mapping = defineModel<Record<string, string>>('mapping', { required: true })
const modelsText = defineModel<string>('modelsText', { required: true })
const mappingText = defineModel<string>('mappingText', { required: true })
const modelsTextMode = defineModel<boolean>('modelsTextMode', { required: true })
const mappingJsonMode = defineModel<boolean>('mappingJsonMode', { required: true })
const autoModels = defineModel<boolean>('autoModels', { required: true })

const { t } = useI18n()
/** JSON example of the mapping box (not an i18n message: braces are placeholders there). */
const mappingPlaceholder = '{\n  "claude-3-5-sonnet-latest": "claude-sonnet-4-5"\n}'
/** 可视化 / JSON switch of the model list and mapping cards (new-api's 可视化 / 手动编辑). */
const editModes = computed(() => [{ value: 'visual', label: t('accounts.editorUi.visualEdit') }, { value: 'json', label: 'JSON' }])
</script>

<template>
  <div class="space-y-4">
    <SSettingRow v-if="gateway" :label="t('accounts.editorUi.autoModels')" :description="t('accounts.editorUi.autoModelsHint')">
      <SSwitch :model-value="autoModels" :aria-label="t('accounts.editorUi.autoModels')" data-testid="auto-models" @update:model-value="autoModels = $event" />
    </SSettingRow>
    <SAlert v-if="prefilled && !editing && !automatic" tone="primary" dense data-testid="models-prefilled">{{ t('accounts.editorUi.prefilled', { what: prefillWhat }) }}</SAlert>
    <SAlert v-else-if="prefilled && !automatic" tone="warning" dense data-testid="models-prefilled-edit">
      {{ t('accounts.editorUi.prefilledEdit', { what: prefillWhat }) }}
      <template #actions>
        <SButton size="sm" variant="ghost" data-testid="models-prefilled-clear" @click="emit('clear-prefill')">{{ t('accounts.editorUi.clearModels') }}</SButton>
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
        <SSegmented size="sm" :options="editModes" :model-value="modelsTextMode ? 'json' : 'visual'" :aria-label="t('accounts.models')" data-testid="models-mode" @update:model-value="emit('models-text-mode', $event === 'json')" />
      </template>

      <SField :error="modelsError || serverModelsError">
        <div v-if="modelsTextMode" class="space-y-2">
          <STextarea v-model="modelsText" :readonly="automatic" mono :rows="10" :placeholder="t('accounts.modelsJsonPlaceholder')" data-testid="models-json" @blur="emit('sync-models-text')" />
        </div>
        <ModelTagSelect v-else v-model="models" :readonly="automatic" :options="[...defaultModels, ...modelOptions]" :mapping="mapping" :placeholder="t('accounts.modelsPlaceholder')" :error="!!(modelsError || serverModelsError)" @invalid="emit('reject-model', $event)" />
        <template #hint>
          <span v-if="automatic">{{ t('accounts.editorUi.autoModelsHint') }}</span>
          <SHint v-else-if="!models.length && !modelsTextMode" inline size="xs" tone="success" class="inline-flex items-center gap-1"><SIcon name="check" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.unrestricted') }}</SHint>
          <template v-else>{{ modelsTextMode ? t('accounts.editorUi.modelsJsonHint') : t('accounts.editorUi.modelsInputHint') }}</template>
        </template>
      </SField>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <SButton v-if="defaultModels.length && !automatic" size="sm" variant="primary" icon="download" data-testid="models-fill-defaults" :title="t('accounts.editorUi.fillDefaultsHint')" @click="emit('fill-default-models')">{{ t('accounts.editorUi.fillDefaults', { n: defaultModels.length }) }}</SButton>
        <SButton v-if="canFetch && !automatic" size="sm" icon="refresh" :loading="fetching" data-testid="models-fetch" :title="t('accounts.fetchModelsHint')" @click="emit('fetch')">{{ t('accounts.fetchModels') }}</SButton>
        <SButton v-if="modelsTextMode && !automatic" size="sm" variant="ghost" icon="code" data-testid="models-format" @click="emit('format-models-text')">{{ t('accounts.editorUi.formatJson') }}</SButton>
        <SButton size="sm" variant="ghost" icon="copy" :disabled="!models.length" data-testid="models-copy" @click="emit('copy-models')">{{ t('accounts.editorUi.copyModels') }}</SButton>
        <SButton v-if="!automatic" size="sm" variant="ghost" icon="trash" :disabled="!models.length && !modelsText.trim()" data-testid="models-clear" @click="emit('clear-models')">{{ t('accounts.editorUi.clearModels') }}</SButton>
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
        <SSegmented size="sm" :options="editModes" :model-value="mappingJsonMode ? 'json' : 'visual'" :aria-label="t('accounts.modelMapping')" data-testid="mapping-mode" @update:model-value="emit('mapping-json-mode', $event === 'json')" />
      </template>

      <SField :error="mappingError || serverMappingError">
        <STextarea v-if="mappingJsonMode" v-model="mappingText" mono :rows="10" :placeholder="mappingPlaceholder" data-testid="mapping-json" @blur="emit('sync-mapping-text')" />
        <ModelMappingEditor v-else v-model="mapping" :models="models" list-id="account-model-options" @add-models="emit('merge-models', $event)" />
        <template #hint>{{ t('accounts.editorUi.mappingKeyHint') }}</template>
      </SField>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <SButton v-if="defaultMappingCount" size="sm" icon="download" data-testid="mapping-fill-defaults" @click="emit('fill-default-mapping')">{{ t('accounts.editorUi.fillDefaultMapping', { n: defaultMappingCount }) }}</SButton>
        <template v-if="mappingJsonMode">
          <SButton size="sm" variant="ghost" icon="list" data-testid="mapping-template" @click="emit('fill-mapping-template')">{{ t('accounts.editorUi.fillTemplate') }}</SButton>
          <SButton size="sm" variant="ghost" icon="code" data-testid="mapping-format" @click="emit('format-mapping-text')">{{ t('accounts.editorUi.formatJson') }}</SButton>
        </template>
      </div>
    </SCard>
  </div>
</template>
