<script setup lang="ts">
import { SSettingsGroup } from '@sub2api/ui'
import { useModHost } from '../host'
import NumberRow from './NumberRow.vue'

// Performance: concurrency, queue, pass cache and text limits (collapsed).
const t = useModHost().t
</script>

<template>
  <SSettingsGroup :title="t('settingsPage.group.performance')" :description="t('settingsPage.group.performanceHint')" collapsible :default-open="false">
    <NumberRow field="max_concurrency" />
    <NumberRow field="queue_size" />
    <NumberRow field="cache_ttl_seconds" :unit="t('settingsPage.unit.seconds')" />
    <NumberRow field="cache_entries" />
    <NumberRow field="input_max_chars" :unit="t('settingsPage.unit.chars')" />
    <NumberRow field="min_chars" :unit="t('settingsPage.unit.chars')" />
  </SSettingsGroup>
</template>
