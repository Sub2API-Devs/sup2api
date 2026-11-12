<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SSegmented, SSettingRow, SSettingsGroup, SSpinner, SSwitch } from '@sub2api/ui'
import type { SchedulingSettings } from '@/api/types'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import { useSettingsForm } from '@/composables/useSettingsForm'
import { useAuthStore } from '@/stores/auth'

// Core load balancing of new sessions within a tier (GET/PUT /settings/scheduling, CONTRACTS §89).
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))

const defaults: SchedulingSettings = { mode: 'traffic', metric: 'sessions', limit_load: false, model_limits: false }
const { form, loading, saving, dirty, errors, isLoaded, load, save, reset } = useSettingsForm<SchedulingSettings>({
  path: '/settings/scheduling',
  defaults,
  // An older core may still return "default"; the form always holds and sends "traffic".
  fromServer: r => ({ ...defaults, ...r, mode: 'traffic' })
})

const metrics = computed(() =>
  (['rpm', 'concurrency', 'tpm', 'sessions'] as const).map(value => ({ value, label: t(`settings.balance.metrics.${value}`) }))
)

onMounted(load)
</script>

<template>
  <SSettingsGroup
    :title="t('settings.scheduling.tabs.balance')"
    :description="t('settings.balance.subtitle')"
    data-testid="balance-settings"
  >
    <template v-if="canManage" #actions>
      <SettingsSaveBar :dirty="dirty" :saving="saving" :can-manage="canManage" @save="save" @reset="reset" />
    </template>
    <SSpinner v-if="loading && !isLoaded" block />
    <template v-else>
      <SSettingRow :label="t('settings.balance.limitLoad')" :description="t('settings.balance.limitLoadHint')">
        <SSwitch
          v-model="form.limit_load"
          :disabled="!canManage"
          :aria-label="t('settings.balance.limitLoad')"
          data-testid="balance-limit-load"
        />
      </SSettingRow>
      <SSettingRow :label="t('settings.balance.metric')" :description="t('settings.balance.metricHint')" :error="errors.metric">
        <template #details>{{ t('settings.balance.metricDetails') }}</template>
        <SSegmented v-model="form.metric" :options="metrics" :disabled="!canManage" data-testid="balance-metric" />
      </SSettingRow>
      <SSettingRow :label="t('settings.balance.modelLimits')" :description="t('settings.balance.modelLimitsHint')">
        <SSwitch
          v-model="form.model_limits"
          :disabled="!canManage"
          :aria-label="t('settings.balance.modelLimits')"
          data-testid="balance-model-limits"
        />
      </SSettingRow>
    </template>
  </SSettingsGroup>
</template>
