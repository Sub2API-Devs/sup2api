<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SSettingsGroup, SSpinner } from '@sub2api/ui'
import type { EnvironmentValues } from '@/api/types'
import EnvironmentEditor from '@/components/environment/EnvironmentEditor.vue'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import { useSettingsForm } from '@/composables/useSettingsForm'
import { useAuthStore } from '@/stores/auth'

// The global layer of the environment variables (GET/PUT /settings/environment, CONTRACTS §74.3).
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))

interface Body { values: EnvironmentValues }
const { form, loading, saving, dirty, errors, isLoaded, load, save, reset } = useSettingsForm<Body>({
  path: '/settings/environment',
  defaults: { values: {} },
  fromServer: (r) => ({ values: { ...r.values } })
})

onMounted(load)
</script>

<template>
  <SSettingsGroup :title="t('settings.environment.title')" :description="t('settings.environment.subtitle')" data-testid="environment-settings">
    <template v-if="canManage" #actions><SettingsSaveBar :dirty="dirty" :saving="saving" :can-manage="canManage" @save="save" @reset="reset" /></template>
    <SSpinner v-if="loading && !isLoaded" block />
    <EnvironmentEditor v-else v-model="form.values" layer="global" field="values" :errors="errors" :disabled="!canManage" />
  </SSettingsGroup>
</template>
