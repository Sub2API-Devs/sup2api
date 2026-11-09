<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SSettingRow } from '@sub2api/ui'
import ParamOverrideInput from './ParamOverrideInput.vue'
import type { Override } from './model'

// The account editor's "request parameter override" row (CONTRACTS §84).
// `reason` (a fixed common control) replaces the hint.
const model = defineModel<Override | null>({ required: true })
defineProps<{ models: string[]; error?: string; disabled?: boolean; reason?: string }>()
const { t } = useI18n()
const P = 'accounts.paramOverride'
</script>

<template>
  <SSettingRow :label="t(`${P}.title`)" :description="reason || t(`${P}.hint`)" :error="error" data-testid="account-param-override">
    <ParamOverrideInput v-model="model" :models="models" :disabled="disabled" />
  </SSettingRow>
</template>
