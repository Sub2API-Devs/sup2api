<script setup lang="ts">
// Rows of claude_max_tokens.models (CONVERT-MATRIX §6.1): model -> max_tokens.
// Every edit emits a new list, so the settings form can restore the loaded one.
import { useI18n } from 'vue-i18n'
import { SButton, SInput } from '@sub2api/ui'
import { CLAUDE_MAX_TOKENS } from '@/api/types'
import type { MaxTokensRow } from './claudeMaxTokens'

const props = defineProps<{ modelValue: MaxTokensRow[]; disabled?: boolean; error?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: MaxTokensRow[]): void }>()
const { t } = useI18n()

const update = (i: number, patch: Partial<MaxTokensRow>) =>
  emit(
    'update:modelValue',
    props.modelValue.map((r, j) => (j === i ? { ...r, ...patch } : r))
  )
const add = () => emit('update:modelValue', [...props.modelValue, { model: '', tokens: null }])
const remove = (i: number) =>
  emit(
    'update:modelValue',
    props.modelValue.filter((_, j) => j !== i)
  )
</script>

<template>
  <div class="space-y-2" data-testid="claude-max-tokens">
    <div class="grid grid-cols-[1fr_1fr_4.5rem] gap-2 text-xs text-fg-subtle" aria-hidden="true">
      <span>{{ t('settings.gateway.maxTokens.model') }}</span>
      <span>{{ t('settings.gateway.maxTokens.tokens') }}</span>
      <span />
    </div>
    <div
      v-for="(r, i) in modelValue"
      :key="i"
      class="grid grid-cols-[1fr_1fr_4.5rem] items-center gap-2"
      data-testid="claude-max-tokens-row"
    >
      <SInput
        :model-value="r.model"
        size="sm"
        mono
        :disabled="disabled"
        :error="error"
        :maxlength="CLAUDE_MAX_TOKENS.nameLength"
        :placeholder="t('settings.gateway.maxTokens.modelPlaceholder')"
        :aria-label="`${t('settings.gateway.maxTokens.model')} ${i + 1}`"
        @update:model-value="update(i, { model: String($event ?? '') })"
      />
      <SInput
        :model-value="r.tokens"
        size="sm"
        type="number"
        step="1"
        :min="CLAUDE_MAX_TOKENS.min"
        :max="CLAUDE_MAX_TOKENS.max"
        :disabled="disabled"
        :error="error"
        :placeholder="String(CLAUDE_MAX_TOKENS.fallback)"
        :aria-label="`${t('settings.gateway.maxTokens.tokens')} ${i + 1}`"
        @update:model-value="update(i, { tokens: typeof $event === 'number' ? $event : null })"
      />
      <SButton
        variant="ghost"
        tone="danger"
        size="sm"
        :disabled="disabled"
        :aria-label="t('settings.gateway.maxTokens.remove', { model: r.model || i + 1 })"
        data-testid="claude-max-tokens-remove"
        @click="remove(i)"
        >{{ t('common.remove') }}</SButton
      >
    </div>
    <SButton
      size="sm"
      icon="plus"
      :disabled="disabled || modelValue.length >= CLAUDE_MAX_TOKENS.models"
      data-testid="claude-max-tokens-add"
      @click="add"
      >{{ t('settings.gateway.maxTokens.add') }}</SButton
    >
  </div>
</template>
