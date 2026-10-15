<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SInput, SSettingRow, SSettingsGroup, SSpinner } from '@sub2api/ui'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import { useSettingsForm } from '@/composables/useSettingsForm'
import { useAuthStore } from '@/stores/auth'
import { useUpdatesStore } from '@/stores/updates'

// Core update source (GET/PUT /system/update-source).
const { t } = useI18n()
const auth = useAuthStore()
const updates = useUpdatesStore()
const canManage = computed(() => auth.has('settings:manage'))
const { form, loading, saving, dirty, loadError, isLoaded, load, save, reset } = useSettingsForm<{ repository: string }>({
  path: '/system/update-source',
  defaults: { repository: '' },
  inlineLoadError: true,
  fromServer: (r) => ({ repository: String(r.repository ?? '') }),
  toBody: (f) => ({ repository: f.repository.trim() })
})

async function submit() {
  if (!(await save())) return
  updates.invalidate()
  if (auth.has('system:update:read')) void updates.check()
}

onMounted(load)
</script>

<template>
  <SSettingsGroup :title="t('coreUpdates.sourceTitle')" :description="t('coreUpdates.sourceDescription')" data-testid="update-source-settings">
    <template #actions>
      <SButton v-if="!isLoaded && !loading" size="sm" icon="refresh" @click="load">{{ t('coreUpdates.retry') }}</SButton>
      <SettingsSaveBar v-else :dirty="dirty" :saving="saving" :can-manage="canManage" @save="submit" @reset="reset" />
    </template>
    <SSpinner v-if="loading && !isLoaded" block />
    <template v-else>
      <SAlert v-if="loadError" tone="danger" class="mt-4">{{ loadError }}</SAlert>
      <SSettingRow :label="t('coreUpdates.repository')" :description="t('coreUpdates.repositoryHint')">
        <template #details>{{ t('coreUpdates.sourceTrust') }}</template>
        <SInput v-model="form.repository" mono placeholder="owner/repository" class="w-full sm:w-72" :disabled="!isLoaded || !canManage || saving" />
      </SSettingRow>
    </template>
  </SSettingsGroup>
</template>
