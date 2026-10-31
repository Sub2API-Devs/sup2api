<script setup lang="ts">
import { computed, ref } from 'vue'
import { SSegmented, SSettingRow, SSettingsGroup, SSwitch, STagInput } from '@sub2api/ui'
import { useModHost } from '../host'
import { useSettingsForm } from './useSettings'

// General: master switch (mode off or not), observe / enforce, exempt users.
const f = useSettingsForm()
const t = useModHost().t

const lastOn = ref<'observe' | 'enforce'>('observe')
const enabled = computed({
  get: () => f.draft.mode !== 'off',
  set: (on: boolean) => {
    if (!on && f.draft.mode !== 'off') lastOn.value = f.draft.mode
    f.draft.mode = on ? lastOn.value : 'off'
  }
})
const modeOptions = computed(() => (['observe', 'enforce'] as const).map((m) => ({ value: m, label: t(`mode.${m}`) })))
</script>

<template>
  <SSettingsGroup :title="t('settingsPage.group.general')" :description="t('settingsPage.group.generalHint')">
    <SSettingRow :label="t('settingsPage.f.enabled.label')" :description="t('settingsPage.f.enabled.desc')">
      <SSwitch v-model="enabled" :disabled="!f.canWrite" />
    </SSettingRow>
    <SSettingRow :label="t('settingsPage.f.mode.label')" :description="t('settingsPage.f.mode.desc')">
      <SSegmented v-model="f.draft.mode" :options="modeOptions" size="sm" :disabled="!f.canWrite || f.draft.mode === 'off'" />
    </SSettingRow>
    <SSettingRow :label="t('settingsPage.f.exempt_user_ids.label')" :description="t('settingsPage.f.exempt_user_ids.desc')" :error="f.errorOf('exempt_user_ids')" stacked>
      <STagInput v-model="f.draft.exempt_user_ids" :disabled="!f.canWrite" placeholder="42" size="sm" class="mod-set-wide" />
    </SSettingRow>
  </SSettingsGroup>
</template>

<style scoped>
.mod-set-wide {
  width: 100%;
}
</style>
