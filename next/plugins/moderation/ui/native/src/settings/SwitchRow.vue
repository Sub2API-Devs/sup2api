<script setup lang="ts">
import { SSettingRow, SSwitch } from '@sub2api/ui'
import { useModHost } from '../host'
import { useSettingsForm } from './useSettings'

// A boolean setting: label and description from settingsPage.f.<key>.
defineProps<{ field: string }>()
const f = useSettingsForm()
const t = useModHost().t
</script>

<template>
  <SSettingRow :label="t(`settingsPage.f.${field}.label`)" :description="t(`settingsPage.f.${field}.desc`)">
    <SSwitch v-model="f.draft[field]" :disabled="!f.canWrite" />
  </SSettingRow>
</template>
