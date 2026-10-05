<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton } from '@sub2api/ui'
import ModelListEditor from '@/views/accounts/ModelListEditor.vue'

const props = defineProps<{ modelValue: string[]; mode: 'whitelist' | 'blacklist'; options: string[]; loading?: boolean; unrestrictedAccounts?: number }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void; (e: 'update:mode', value: 'whitelist' | 'blacklist'): void }>()
const { t } = useI18n()
const draft = ref('')
const error = ref('')
const suggestions = computed(() => [...new Set(props.options)])
function fillGroupModels() {
  const pending = draft.value.trim().split(/[\s,]+/).filter(Boolean)
  if (!commit()) return
  emit('update:modelValue', [...new Set([...props.modelValue, ...pending, ...suggestions.value])])
}
function commit(): boolean {
  const parts = draft.value.trim().split(/[\s,]+/).filter(Boolean)
  if (parts.some(m => m.length > 200)) { error.value = t('groups.patternInvalid'); return false }
  if (parts.length) emit('update:modelValue', [...new Set([...props.modelValue, ...parts])])
  draft.value = ''
  error.value = ''
  return true
}
function paste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text')
  if (!text) return
  event.preventDefault()
  draft.value = [draft.value, text.replace(/[\s,]+/g, ',')].filter(Boolean).join(',')
}
defineExpose({ commit })
</script>

<template>
  <div class="space-y-3" data-testid="group-model-policy">
    <div class="grid grid-cols-2 gap-2">
      <button v-for="value in (['whitelist', 'blacklist'] as const)" :key="value" type="button" class="rounded-lg border px-3 py-2.5 text-left" :class="mode === value ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'border-line hover:bg-surface-2'" :aria-pressed="mode === value" :data-testid="`policy-${value}`" @click="emit('update:mode', value)">
        <span class="block text-sm font-medium">{{ t(`groups.${value}`) }}</span>
        <span class="mt-1 block text-xs text-fg-muted">{{ t(`groups.${value}Hint`) }}</span>
      </button>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <SButton size="sm" :loading="loading" :disabled="loading || !suggestions.length" data-testid="policy-fill-group" @click="fillGroupModels">{{ t(mode === 'whitelist' ? 'groups.fillWhitelist' : 'groups.fillBlacklist', { n: suggestions.length }) }}</SButton>
      <span class="text-xs text-fg-subtle">{{ t('groups.groupModelSource') }}</span>
    </div>
    <p v-if="unrestrictedAccounts" class="text-xs text-amber-600">{{ t('groups.unrestrictedModelsHint', { n: unrestrictedAccounts }) }}</p>
    <ModelListEditor show-options :model-value="modelValue" :options="suggestions" :mapping="{}" :empty-text="t('groups.emptyPolicy')" @update:model-value="emit('update:modelValue', $event)" />
    <div class="flex gap-2">
      <input v-model="draft" class="input input-sm min-w-0 flex-1" :aria-label="t('groups.allowlistPlaceholder')" :placeholder="t('groups.allowlistPlaceholder')" data-testid="policy-draft" @keydown.enter.prevent="commit" @paste="paste" @blur="commit" />
      <SButton size="sm" :disabled="!draft.trim()" @click="commit">{{ t('accounts.editorUi.addModels') }}</SButton>
    </div>
    <p v-if="error" class="text-xs text-danger-600">{{ error }}</p>
  </div>
</template>
