<script setup lang="ts">
import { SInput, SSettingRow, SSettingsGroup } from '@sub2api/ui'
import { useModHost } from '../host'
import { useSettingsForm } from './useSettings'
import NumberRow from './NumberRow.vue'

// Alerts and statistics (CONTRACTS §72.14.4): error-rate threshold, how long
// the statistics stay, and the notification webhook.
const f = useSettingsForm()
const t = useModHost().t
</script>

<template>
  <SSettingsGroup :title="t('settingsPage.group.alerts')" :description="t('settingsPage.group.alertsHint')">
    <NumberRow field="error_rate_alert_percent" unit="%" />
    <NumberRow field="stats_retention_days" :unit="t('settingsPage.unit.days')" />
    <SSettingRow :label="t('settingsPage.f.notify_webhook_url.label')" :description="t('settingsPage.f.notify_webhook_url.desc')" :error="f.errorOf('notify_webhook_url')" stacked>
      <SInput v-model="f.draft.notify_webhook_url" type="url" placeholder="https://example.com/hook" :disabled="!f.canWrite" mono size="sm" class="mod-set-wide" />
    </SSettingRow>
  </SSettingsGroup>
</template>

<style scoped>
.mod-set-wide {
  width: 100%;
}
</style>
