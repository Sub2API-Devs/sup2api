<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SField, SHint, SInput, SSpinner, toast } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { useUpdatesStore } from '@/stores/updates'
import { errorMessage, notifyError } from '@/utils/errors'

const { t } = useI18n(), auth = useAuthStore(), updates = useUpdatesStore()
const repository = ref(''), original = ref(''), loaded = ref(false), loading = ref(false), saving = ref(false), error = ref('')
const dirty = computed(() => loaded.value && repository.value.trim() !== original.value)
async function load() {
  loading.value = true; error.value = ''
  try { const r = await api.get<{ repository: string }>('/system/update-source'); repository.value = original.value = r.repository; loaded.value = true }
  catch (e) { error.value = errorMessage(e) } finally { loading.value = false }
}
async function save() {
  saving.value = true
  try {
    const r = await api.put<{ repository: string }>('/system/update-source', { repository: repository.value.trim() })
    repository.value = original.value = r.repository
    updates.invalidate()
    if (auth.has('system:update:read')) void updates.check()
    toast(t('common.saved'), 'success')
  } catch (e) { notifyError(e) } finally { saving.value = false }
}
onMounted(load)
</script>

<template>
  <SCard :title="t('coreUpdates.sourceTitle')" :subtitle="t('coreUpdates.sourceDescription')">
    <div v-if="loading && !loaded" class="py-6 text-center"><SSpinner /></div>
    <div v-else class="space-y-4">
      <SHint v-if="error" tone="danger">{{ error }}</SHint>
      <SField :label="t('coreUpdates.repository')" :hint="t('coreUpdates.repositoryHint')">
        <SInput v-model="repository" placeholder="owner/repository" :disabled="!loaded || !auth.has('settings:manage') || saving" />
      </SField>
      <SHint>{{ t('coreUpdates.sourceTrust') }}</SHint>
      <div class="flex justify-end gap-2">
        <SButton v-if="!loaded" size="sm" @click="load">{{ t('coreUpdates.retry') }}</SButton>
        <SButton v-if="dirty" size="sm" :disabled="saving" @click="repository = original">{{ t('common.reset') }}</SButton>
        <SButton v-if="auth.has('settings:manage')" size="sm" variant="primary" :loading="saving" :disabled="!dirty" @click="save">{{ t('common.save') }}</SButton>
      </div>
    </div>
  </SCard>
</template>
