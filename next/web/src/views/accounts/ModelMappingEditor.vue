<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SKeyValue } from '@sub2api/ui'

// Editor of an account's model_mapping (request model -> upstream model,
// CONTRACTS §18) on SKeyValue. A row whose request model is missing from a
// non-empty model list is flagged, because the account would never be
// scheduled for it. Values are trimmed when the account is saved.
const props = defineProps<{
  modelValue: Record<string, string>
  /** The account's model list; empty means "every model". */
  models: string[]
  /** id of a <datalist> with model suggestions. */
  listId?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, string>): void; (e: 'add-models', models: string[]): void }>()
const { t } = useI18n()

const notScheduled = (key: string) => !!props.models.length && !!key.trim() && !props.models.includes(key.trim())
/** Request models of the mapping the account cannot be scheduled for. */
const unscheduled = computed(() => [...new Set(Object.keys(props.modelValue || {}).filter(notScheduled).map(k => k.trim()))])
const rowWarn = (row: { key: string }) => (notScheduled(row.key) ? t('accounts.editorUi.mappingRowNotInModels') : '')
</script>

<template>
  <div class="space-y-2" data-testid="mapping-table">
    <p v-if="!Object.keys(modelValue || {}).length" class="text-sm text-fg-muted">{{ t('accounts.editorUi.mappingEmpty') }}</p>
    <div class="max-h-96 overflow-y-auto">
      <SKeyValue
        :model-value="modelValue"
        :key-label="t('accounts.mappingFrom')"
        :value-label="t('accounts.mappingTo')"
        key-placeholder="claude-3-5-sonnet-latest"
        value-placeholder="claude-sonnet-4-5"
        :list-id="listId"
        :value-list-id="listId"
        mono
        separator
        size="sm"
        :row-warn="rowWarn"
        :add-label="t('accounts.editorUi.mappingAdd')"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>
    <SAlert v-if="unscheduled.length" tone="warning" dense data-testid="mapping-unscheduled">
      {{ t('accounts.editorUi.mappingNotInModels', { n: unscheduled.length, models: unscheduled.slice(0, 3).join(', ') + (unscheduled.length > 3 ? ' …' : '') }) }}
      <template #actions>
        <SButton size="sm" variant="ghost" @click="emit('add-models', unscheduled)">{{ t('accounts.editorUi.mappingAddToModels') }}</SButton>
      </template>
    </SAlert>
  </div>
</template>
