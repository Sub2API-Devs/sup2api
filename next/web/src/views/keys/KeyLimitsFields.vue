<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SField, SHint, SInput } from '@sub2api/ui'
import type { KeyLimits } from '@/api/types'
import { LIMITS } from './keyLimits'

// The caps of an API key (CONTRACTS §60); an empty field is unlimited.
const form = defineModel<Record<keyof KeyLimits, number | null>>({ required: true })
defineProps<{ errors?: Record<string, string>; disabled?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <div class="space-y-2">
    <div class="grid gap-3 sm:grid-cols-3">
      <SField v-for="l in LIMITS" :key="l.field" :label="t(l.label)" :error="errors?.[l.field]">
        <SInput v-model.number="form[l.field]" type="number" min="0" :placeholder="t('apikeys.limits.none')" :disabled="disabled" :data-testid="`key-limit-${l.field}`" />
      </SField>
    </div>
    <SHint size="xs">{{ t('apikeys.limits.hint') }}</SHint>
  </div>
</template>
