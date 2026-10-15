<script setup lang="ts">
// Reset + Save of a settings group (put it in SSettingsGroup's #actions slot).
// Hidden when the user cannot manage the settings; the default slot holds
// extra buttons shown before Reset.
import { useI18n } from 'vue-i18n'
import { SButton } from '@sub2api/ui'

withDefaults(defineProps<{ dirty: boolean; saving?: boolean; canManage?: boolean; saveLabel?: string }>(), { saving: false, canManage: true })
const emit = defineEmits<{ (e: 'save'): void; (e: 'reset'): void }>()
const { t } = useI18n()
</script>

<template>
  <div v-if="canManage" class="flex flex-wrap items-center justify-end gap-2" data-testid="settings-save-bar">
    <slot />
    <SButton v-if="dirty" size="sm" :disabled="saving" data-testid="settings-reset" @click="emit('reset')">{{ t('common.reset') }}</SButton>
    <SButton size="sm" variant="primary" :loading="saving" :disabled="!dirty" data-testid="settings-save" @click="emit('save')">{{ saveLabel || t('common.save') }}</SButton>
  </div>
</template>
