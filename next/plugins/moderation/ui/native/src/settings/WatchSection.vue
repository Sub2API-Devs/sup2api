<script setup lang="ts">
import { SSettingsGroup } from '@sub2api/ui'
import { useModHost } from '../host'
import NumberRow from './NumberRow.vue'
import SwitchRow from './SwitchRow.vue'

// Watch list and bans: automatic entry, watch period, analysis every N
// violations, and automatic bans.
const t = useModHost().t
</script>

<template>
  <SSettingsGroup :title="t('settingsPage.group.watch')" :description="t('settingsPage.group.watchHint')">
    <SwitchRow field="auto_watch" />
    <NumberRow field="watch_days" :unit="t('settingsPage.unit.days')" />
    <NumberRow field="analysis_every_violations" :unit="t('settingsPage.unit.times')" />
    <NumberRow field="ban_threshold" :unit="t('settingsPage.unit.times')" />
    <NumberRow field="ban_window_hours" :unit="t('settingsPage.unit.hours')" />
    <NumberRow field="ban_duration_hours" :unit="t('settingsPage.unit.hours')" />
  </SSettingsGroup>
</template>
