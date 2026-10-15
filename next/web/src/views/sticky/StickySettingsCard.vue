<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SInput, SSettingRow, SSettingsGroup, SSpinner, SSwitch } from '@sub2api/ui'
import type { StickySettings } from '@/api/types'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import { useSettingsForm } from '@/composables/useSettingsForm'
import { useAuthStore } from '@/stores/auth'

// Global sticky-session settings (GET/PUT /settings/sticky).
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('sticky:manage'))

type Form = Omit<StickySettings, 'default_ttl_seconds'> & { default_ttl_seconds: number | null }

const { form, loading, saving, dirty, errors, isLoaded, load, save, reset } = useSettingsForm<Form, StickySettings>({
  path: '/settings/sticky',
  defaults: { enabled: true, default_ttl_seconds: 3600, keep_on_account_disabled: false },
  fromServer: (r) => ({
    enabled: !!r.enabled,
    default_ttl_seconds: Number(r.default_ttl_seconds ?? 3600),
    keep_on_account_disabled: !!r.keep_on_account_disabled
  }),
  toBody: (f, errs) => {
    const ttl = f.default_ttl_seconds ?? NaN
    if (!Number.isInteger(ttl) || ttl <= 0) errs.default_ttl_seconds = t('sticky.settings.ttlInvalid')
    return { ...f, default_ttl_seconds: ttl }
  }
})

onMounted(load)
</script>

<template>
  <SSettingsGroup :title="t('sticky.settings.title')" data-testid="sticky-settings">
    <template #actions><SettingsSaveBar :dirty="dirty" :saving="saving" :can-manage="canManage" @save="save" @reset="reset" /></template>
    <SSpinner v-if="loading && !isLoaded" block />
    <template v-else>
      <SSettingRow :label="t('sticky.settings.enabled')" :description="t('sticky.settings.enabledHint')">
        <SSwitch v-model="form.enabled" :disabled="!canManage" :aria-label="t('sticky.settings.enabled')" />
      </SSettingRow>
      <SSettingRow :label="t('sticky.settings.defaultTtl')" :description="t('sticky.settings.defaultTtlHint')" :error="errors.default_ttl_seconds">
        <SInput v-model="form.default_ttl_seconds" type="number" min="1" :suffix="t('sticky.seconds')" class="w-full sm:w-48" :disabled="!canManage" />
      </SSettingRow>
      <SSettingRow :label="t('sticky.settings.keepOnDisabled')" :description="t('sticky.settings.keepOnDisabledHint')">
        <SSwitch v-model="form.keep_on_account_disabled" :disabled="!canManage" :aria-label="t('sticky.settings.keepOnDisabled')" />
      </SSettingRow>
    </template>
  </SSettingsGroup>
</template>
