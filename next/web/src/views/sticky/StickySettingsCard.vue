<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SField, SHint, SInput, SSettingRow, SSettingsGroup, SSpinner, SSwitch } from '@sub2api/ui'
import type { StickySettings } from '@/api/types'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import { useSettingsForm } from '@/composables/useSettingsForm'
import { useAuthStore } from '@/stores/auth'

// Global sticky-session settings (GET/PUT /settings/sticky).
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('sticky:manage'))

const { form, loading, saving, dirty, errors, isLoaded, load, save, reset } = useSettingsForm<StickySettings>({
  path: '/settings/sticky',
  defaults: { enabled: true, default_ttl_seconds: 3600, keep_on_account_disabled: false },
  responseKey: 'enabled',
  fromServer: (r) => ({
    enabled: !!r?.enabled,
    default_ttl_seconds: Number(r?.default_ttl_seconds ?? 3600),
    keep_on_account_disabled: !!r?.keep_on_account_disabled
  }),
  toBody: (f, errs) => {
    const ttl = Number(f.default_ttl_seconds)
    if (!Number.isInteger(ttl) || ttl <= 0) errs.default_ttl_seconds = t('sticky.settings.ttlInvalid')
    return { ...f, default_ttl_seconds: ttl }
  }
})

onMounted(load)
</script>

<template>
  <SSettingsGroup :title="t('sticky.settings.title')" data-testid="sticky-settings">
    <template #actions><SettingsSaveBar :dirty="dirty" :saving="saving" :can-manage="canManage" @save="save" @reset="reset" /></template>
    <div v-if="loading && !isLoaded" class="py-6 text-center"><SSpinner /></div>
    <template v-else>
      <SSettingRow :label="t('sticky.settings.enabled')" :description="t('sticky.settings.enabledHint')" for="sticky-enabled">
        <SSwitch id="sticky-enabled" v-model="form.enabled" :disabled="!canManage" :aria-label="t('sticky.settings.enabled')" />
      </SSettingRow>
      <SSettingRow :label="t('sticky.settings.defaultTtl')" :description="t('sticky.settings.defaultTtlHint')" for="sticky-default-ttl">
        <SField :error="errors.default_ttl_seconds" class="w-full sm:w-48">
          <div class="flex items-center gap-2">
            <SInput id="sticky-default-ttl" v-model.number="form.default_ttl_seconds" type="number" min="1" :error="!!errors.default_ttl_seconds" :disabled="!canManage" />
            <SHint inline>{{ t('sticky.seconds') }}</SHint>
          </div>
        </SField>
      </SSettingRow>
      <SSettingRow :label="t('sticky.settings.keepOnDisabled')" :description="t('sticky.settings.keepOnDisabledHint')" for="sticky-keep-on-disabled">
        <SSwitch id="sticky-keep-on-disabled" v-model="form.keep_on_account_disabled" :disabled="!canManage" :aria-label="t('sticky.settings.keepOnDisabled')" />
      </SSettingRow>
    </template>
  </SSettingsGroup>
</template>
