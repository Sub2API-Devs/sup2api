<script setup lang="ts">
import { SStatusBadge } from '@sub2api/ui'
import { pluginStatusTone, usePluginStatusLabel } from '../pluginUtil'

// Plugin lifecycle / rollout / node / job state: the plugin pages' own tones
// and labels (plugins.status.*), so no call site can forget either.
defineProps<{ status?: string | null }>()
const label = usePluginStatusLabel()
</script>

<template>
  <SStatusBadge :status="status ?? ''" :tone="pluginStatusTone(status)" :label="label(status)" />
</template>
