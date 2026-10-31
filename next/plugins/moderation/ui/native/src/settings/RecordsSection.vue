<script setup lang="ts">
import { SSettingsGroup } from '@sub2api/ui'
import { useModHost } from '../host'
import NumberRow from './NumberRow.vue'
import SwitchRow from './SwitchRow.vue'

// Records and retention: which results are written, whether text is kept,
// and how long each kind of record stays.
const t = useModHost().t
const switches = ['record_pass', 'record_overturned', 'record_errors', 'store_text']
const retention = ['hit_retention_days', 'overturned_retention_days', 'error_retention_days', 'pass_retention_days']
</script>

<template>
  <SSettingsGroup :title="t('settingsPage.group.records')" :description="t('settingsPage.group.recordsHint')">
    <SwitchRow v-for="k in switches" :key="k" :field="k" />
    <NumberRow v-for="k in retention" :key="k" :field="k" :unit="t('settingsPage.unit.days')" />
  </SSettingsGroup>
</template>
