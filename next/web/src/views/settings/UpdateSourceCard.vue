<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SInput, SSettingRow, SSettingsGroup, SSpinner } from '@sub2api/ui'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import { useSettingsForm } from '@/composables/useSettingsForm'
import { useAuthStore } from '@/stores/auth'
import { useUpdatesStore } from '@/stores/updates'

// Core update source (GET/PUT /system/update-source).
const { t } = useI18n(), auth = useAuthStore(), updates = useUpdatesStore()
const canManage = computed(() => auth.has('settings:manage'))
const { form, loading, saving, dirty, loadError, isLoaded, load, save, reset } = useSettingsForm<{ repository: string }>({
  path: '/system/update-source',
  defaults: { repository: '' },
  inlineLoadError: true,
  fromServer: (r) => ({ repository: String(r?.repository ?? '') }),
  toBody: (f) => ({ repository: f.repository.trim() }),
  snapshot: (f) => f.repository.trim(),
  onSaved: () => {
    updates.invalidate()
    if (auth.has('system:update:read')) void updates.check()
  }
})
onMounted(load)
</script>

<template>
  <SSettingsGroup :title="t('coreUpdates.sourceTitle')" :description="t('coreUpdates.sourceDescription')" data-testid="update-source-settings">
    <template #actions>
      <SButton v-if="!isLoaded && !loading" size="sm" icon="refresh" @click="load">{{ t('coreUpdates.retry') }}</SButton>
      <SettingsSaveBar v-else :dirty="dirty" :saving="saving" :can-manage="canManage" @save="save" @reset="reset" />
    </template>
    <div v-if="loading && !isLoaded" class="py-6 text-center"><SSpinner /></div>
    <template v-else>
      <SAlert v-if="loadError" tone="danger" class="mt-4">{{ loadError }}</SAlert>
      <SSettingRow :label="t('coreUpdates.repository')" :description="t('coreUpdates.repositoryHint')" for="update-source-repository">
        <template #details>{{ t('coreUpdates.sourceTrust') }}</template>
        <div class="w-full sm:w-72">
          <SInput id="update-source-repository" v-model="form.repository" mono placeholder="owner/repository" :disabled="!isLoaded || !canManage || saving" />
        </div>
      </SSettingRow>
    </template>
  </SSettingsGroup>
</template>
