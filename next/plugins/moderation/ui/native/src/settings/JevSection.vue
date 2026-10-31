<script setup lang="ts">
import { computed } from 'vue'
import { SAlert, SBadge, SButton, SSettingsGroup } from '@sub2api/ui'
import { useModHost, type JevQuestions } from '../host'
import { useSettingsForm } from './useSettings'
import JevQuestionsEditor from './JevQuestionsEditor.vue'

// Jev default question set (jev_default_set): used by Jev auditors without
// their own set. null = the built-in set; "customize" copies it for editing,
// "restore built-in" goes back to null.
const f = useSettingsForm()
const h = useModHost()
const t = h.t

const custom = computed(() => !!f.draft.jev_default_set)
const builtin = computed(() => f.jevDefaults.value?.builtin || null)
const shown = computed<JevQuestions | null>(() => (custom.value ? f.draft.jev_default_set : builtin.value))

function customize() {
  if (builtin.value) f.draft.jev_default_set = JSON.parse(JSON.stringify(builtin.value))
}
async function restore() {
  const ok = await h.confirm({ title: t('settingsPage.jev.restoreTitle'), message: t('settingsPage.jev.restoreConfirm'), confirmText: t('settingsPage.jev.restore'), danger: true })
  if (ok) f.draft.jev_default_set = null
}
</script>

<template>
  <SSettingsGroup :title="t('settingsPage.group.jev')" :description="t('settingsPage.group.jevHint')" collapsible :default-open="false">
    <template #actions>
      <SBadge :tone="custom ? 'warning' : 'success'">{{ custom ? t('settingsPage.jev.custom') : t('settingsPage.jev.builtin', { v: f.jevDefaults.value?.builtin_version || '' }) }}</SBadge>
      <template v-if="f.canWrite">
        <SButton v-if="custom" size="sm" @click="restore">{{ t('settingsPage.jev.restore') }}</SButton>
        <SButton v-else size="sm" :disabled="!builtin" @click="customize">{{ t('settingsPage.jev.customize') }}</SButton>
      </template>
    </template>
    <div class="mod-set-jev">
      <SAlert v-if="f.errorOf('jev_default_set')" tone="danger" dense class="mod-block">{{ f.errorOf('jev_default_set') }}</SAlert>
      <JevQuestionsEditor v-if="shown" :set="shown" :disabled="!f.canWrite || !custom" />
      <SAlert v-else tone="warning" dense>{{ t('settingsPage.jev.loadFailed') }}</SAlert>
    </div>
  </SSettingsGroup>
</template>

<style scoped>
.mod-set-jev {
  padding: 1rem 0;
}
</style>
