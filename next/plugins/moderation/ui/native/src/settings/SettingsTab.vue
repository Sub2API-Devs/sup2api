<script setup lang="ts">
import { onMounted } from 'vue'
import { SAlert, SBadge, SButton, SSpinner } from '@sub2api/ui'
import { useModHost } from '../host'
import { provideSettings, useSettings } from './useSettings'
import GeneralSection from './GeneralSection.vue'
import BlockSection from './BlockSection.vue'
import RecordsSection from './RecordsSection.vue'
import WatchSection from './WatchSection.vue'
import AnalysisSection from './AnalysisSection.vue'
import JevSection from './JevSection.vue'
import AlertsSection from './AlertsSection.vue'
import PerformanceSection from './PerformanceSection.vue'

// Settings tab (CONTRACTS §72.14.7, grouped after new-api components/settings):
// one form over the plugin settings; Save writes only the changed keys.
// Without plugin:manage everything is read-only.
const f = useSettings()
provideSettings(f)
const t = useModHost().t
onMounted(f.load)
defineExpose({ reload: () => (f.dirty.value ? undefined : f.load()) })
</script>

<template>
  <div>
    <SSpinner v-if="f.loading.value && !f.loaded.value" block />
    <SAlert v-else-if="f.error.value && !f.loaded.value" tone="danger">
      {{ f.error.value }}
      <template #actions><SButton size="sm" @click="f.load">{{ t('retry') }}</SButton></template>
    </SAlert>
    <template v-else>
      <div class="mod-set-bar">
        <SAlert v-if="!f.canWrite" tone="info" dense class="mod-set-bar-note">{{ t('settingsPage.readOnly') }}</SAlert>
        <template v-else>
          <SBadge v-if="f.dirty.value" tone="warning" dot>{{ t('settingsPage.unsaved', { n: f.dirtyKeys.value.length }) }}</SBadge>
          <span class="mod-ml-auto mod-set-bar-actions">
            <SButton size="sm" :disabled="!f.dirty.value || f.saving.value" @click="f.reset">{{ t('settingsPage.discard') }}</SButton>
            <SButton size="sm" variant="primary" :loading="f.saving.value" :disabled="!f.dirty.value" @click="f.save">{{ t('save') }}</SButton>
          </span>
        </template>
      </div>
      <div class="mod-set-sections">
        <GeneralSection />
        <BlockSection />
        <RecordsSection />
        <WatchSection />
        <AnalysisSection />
        <JevSection />
        <AlertsSection />
        <PerformanceSection />
      </div>
    </template>
  </div>
</template>

<style scoped>
.mod-set-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem 0;
  background: rgb(var(--bg));
}
.mod-set-bar-note {
  flex: 1;
}
.mod-set-bar-actions {
  display: inline-flex;
  gap: 0.5rem;
}
.mod-set-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
