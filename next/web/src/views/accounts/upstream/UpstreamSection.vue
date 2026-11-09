<script setup lang="ts">
// One part of the upstream editor: a setting row whose description offers
// "Reset" while the part differs from the account type's default.
import { useI18n } from 'vue-i18n'
import { SLink, SSettingRow } from '@sub2api/ui'

defineProps<{ label: string; hint: string; dirty: boolean; error?: string; stacked?: boolean; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'reset'): void }>()
const { t } = useI18n()
</script>

<template>
  <SSettingRow :label="label" :stacked="stacked" :error="error">
    <template #description>
      {{ hint }}
      <SLink v-if="dirty" as="button" class="text-xs" :disabled="disabled" data-testid="upstream-section-reset" @click="emit('reset')">{{
        t('accounts.upstream.reset')
      }}</SLink>
    </template>
    <slot />
  </SSettingRow>
</template>
