<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SInput, SSettingRow, SSettingsGroup, SSpinner, SSwitch, STextarea } from '@sub2api/ui'
import type { AutoDisableSettings } from '@/api/types'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import { useSettingsForm } from '@/composables/useSettingsForm'
import { useAuthStore } from '@/stores/auth'

// Automatic account disabling (GET/PUT /settings/auto-disable, CONTRACTS §42).
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))

const DEFAULT_KEYWORDS = [
  'your credit balance is too low',
  'this organization has been disabled.',
  'you exceeded your current quota',
  'permission denied',
  'the security token included in the request is invalid',
  'operation not allowed',
  'your account is not authorized'
].join('\n')

interface Form { enabled: boolean; status_codes: string; keywords: string }

const { form, loading, saving, dirty, errors, isLoaded, load, save, reset } = useSettingsForm<Form, AutoDisableSettings>({
  path: '/settings/auto-disable',
  defaults: { enabled: true, status_codes: '401', keywords: DEFAULT_KEYWORDS },
  fromServer: (r) => ({ enabled: !!r.enabled, status_codes: r.status_codes ?? '', keywords: (r.keywords || []).join('\n') }),
  toBody: (f) => ({
    enabled: f.enabled,
    status_codes: f.status_codes.trim(),
    keywords: f.keywords.split('\n').map((k) => k.trim()).filter(Boolean)
  })
})

/** First keyword error (keywords or keywords[i]). */
const keywordError = computed(() => Object.entries(errors.value).find(([k]) => k.startsWith('keywords'))?.[1])

onMounted(load)
</script>

<template>
  <SSettingsGroup :title="t('settings.autoDisable.title')" :description="t('settings.autoDisable.subtitle')" data-testid="auto-disable-settings">
    <template #actions><SettingsSaveBar :dirty="dirty" :saving="saving" :can-manage="canManage" @save="save" @reset="reset" /></template>
    <SSpinner v-if="loading && !isLoaded" block />
    <template v-else>
      <SSettingRow :label="t('settings.autoDisable.enabled')" :description="t('settings.autoDisable.enabledHint')">
        <SSwitch v-model="form.enabled" :disabled="!canManage" :aria-label="t('settings.autoDisable.enabled')" />
      </SSettingRow>
      <SSettingRow :label="t('settings.autoDisable.statusCodes')" :description="t('settings.autoDisable.statusCodesHint')" :error="errors.status_codes">
        <SInput v-model="form.status_codes" name="status_codes" placeholder="401,403" class="w-full sm:w-64" :disabled="!canManage" />
      </SSettingRow>
      <SSettingRow :label="t('settings.autoDisable.keywords')" :description="t('settings.autoDisable.keywordsHint')" :error="keywordError" stacked>
        <STextarea v-model="form.keywords" name="keywords" :rows="7" class="w-full font-mono text-xs" :disabled="!canManage" />
        <SButton v-if="canManage" size="sm" data-testid="restore-keywords" @click="form.keywords = DEFAULT_KEYWORDS">{{ t('settings.autoDisable.restoreKeywords') }}</SButton>
      </SSettingRow>
    </template>
  </SSettingsGroup>
</template>
