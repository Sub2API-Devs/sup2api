<script setup lang="ts">
import { computed } from 'vue'
import { SHint, SSelect, SSettingRow, SSettingsGroup, STextarea } from '@sub2api/ui'
import { enumLabel, useModHost } from '../host'
import { BLOCK_MESSAGE_MAX, DEFAULT_BLOCK_MESSAGE } from './fields'
import { BLOCK_STATUSES } from './blockPreview'
import { useSettingsForm } from './useSettings'
import BlockPreview from './BlockPreview.vue'

// Block response: status code and message of a refused request, with a
// preview in the formats the core writes.
const f = useSettingsForm()
const t = useModHost().t

const statusOptions = computed(() => {
  const list = BLOCK_STATUSES.includes(f.draft.block_status) ? BLOCK_STATUSES : [...BLOCK_STATUSES, f.draft.block_status]
  return list.map((s) => ({ value: s, label: enumLabel('settingsPage.status', String(s)) }))
})
const chars = computed(() => [...String(f.draft.block_message || '').trim()].length)
</script>

<template>
  <SSettingsGroup :title="t('settingsPage.group.block')" :description="t('settingsPage.group.blockHint')">
    <SSettingRow :label="t('settingsPage.f.block_status.label')" :description="t('settingsPage.f.block_status.desc')" :error="f.errorOf('block_status')">
      <SSelect v-model="f.draft.block_status" :options="statusOptions" :disabled="!f.canWrite" size="sm" class="mod-set-status" />
    </SSettingRow>
    <SSettingRow :label="t('settingsPage.f.block_message.label')" :description="t('settingsPage.f.block_message.desc')" :error="f.errorOf('block_message')" stacked>
      <STextarea v-model="f.draft.block_message" :rows="2" :placeholder="DEFAULT_BLOCK_MESSAGE" :disabled="!f.canWrite" class="mod-set-wide" />
      <SHint size="xs" class="mod-num">{{ chars }} / {{ BLOCK_MESSAGE_MAX }}</SHint>
    </SSettingRow>
    <div class="mod-set-preview">
      <BlockPreview :status="f.draft.block_status" :message="f.draft.block_message || ''" />
    </div>
  </SSettingsGroup>
</template>

<style scoped>
.mod-set-status {
  width: 18rem;
}
.mod-set-wide {
  width: 100%;
}
.mod-set-preview {
  padding: 1rem 0;
}
</style>
