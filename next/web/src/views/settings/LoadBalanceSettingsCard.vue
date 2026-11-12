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

const { form, loading, saving, dirty, errors, isLoaded, load, save, reset } = useSettingsForm<SchedulingSettings>({
  path: '/settings/scheduling',
  defaults: { mode: 'default', metric: 'rpm', limit_load: false, model_limits: false }
})

const modes = computed(() => (['default', 'traffic'] as const).map(value => ({ value, label: t(`settings.balance.modes.${value}`) })))
/** With limit-aware load on, the default strategy picks by the lowered weights. */
const modeHintKey = computed(() => (form.mode === 'default' && form.limit_load ? 'defaultLimitLoad' : form.mode))
const metrics = computed(() =>
  (['rpm', 'concurrency', 'tpm', 'sessions'] as const).map(value => ({ value, label: t(`settings.balance.metrics.${value}`) }))
)
/** The metric and balancing by model only matter once something balances. */
const balanceOff = computed(() => !canManage.value || (form.mode === 'default' && !form.limit_load))

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
      <SSettingRow :label="t('settings.balance.mode')" :description="t(`settings.balance.modeHints.${modeHintKey}`)" :error="errors.mode">
        <SSegmented v-model="form.mode" :options="modes" :disabled="!canManage" data-testid="balance-mode" />
      </SSettingRow>
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
        <SSegmented v-model="form.metric" :options="metrics" :disabled="balanceOff" data-testid="balance-metric" />
      </SSettingRow>
      <SSettingRow :label="t('settings.balance.modelLimits')" :description="t('settings.balance.modelLimitsHint')">
        <SSwitch
          v-model="form.model_limits"
          :disabled="balanceOff"
          :aria-label="t('settings.balance.modelLimits')"
          data-testid="balance-model-limits"
        />
      </SSettingRow>
    </template>
  </SSettingsGroup>
</template>
