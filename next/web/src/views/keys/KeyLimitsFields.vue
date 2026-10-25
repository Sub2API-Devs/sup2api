<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SField, SHint, SInput } from '@sub2api/ui'
import { LIMITS, type KeyCapsForm } from './keyLimits'

// The caps of an API key (CONTRACTS §60, §61); an empty field is unlimited.
const form = defineModel<KeyCapsForm>({ required: true })
defineProps<{ errors?: Record<string, string>; disabled?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <div class="space-y-2">
    <div class="grid gap-3 sm:grid-cols-2">
      <SField v-for="l in LIMITS" :key="l.field" :label="t(l.label)" :error="errors?.[l.field]">
        <SInput v-model.number="form[l.field]" type="number" min="0" :placeholder="t('apikeys.limits.none')" :disabled="disabled" :data-testid="`key-limit-${l.field}`" />
      </SField>
      <SField :label="t('apikeys.quota.limit')" :error="errors?.quota_limit">
        <SInput v-model.number="form.quota_limit" type="number" min="0" step="0.01" :placeholder="t('apikeys.limits.none')" :disabled="disabled" data-testid="key-limit-quota_limit" />
      </SField>
    </div>
    <SHint size="xs">{{ t('apikeys.limits.hint') }} {{ t('apikeys.quota.hint') }}</SHint>
  </div>
</template>
