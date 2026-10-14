<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SButton, SchemaForm, SSpinner } from '@sub2api/ui'
import {
  LLM_FIELDS,
  canManageSettings,
  errorMessage,
  fetchSettingsForm,
  saveSettings,
  settingsFieldErrors,
  useModHost,
  type SettingsForm
} from './host'

// LLM configuration tab: the connection, prompt and model-call part of the
// plugin's settings schema (forms/settings.ui.json), rendered by SchemaForm.
// The other settings stay on the console's plugin settings page; saving here
// sends the whole object back, with the untouched fields as loaded.
const host = useModHost()
const t = host.t
const canEdit = canManageSettings()

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const form = ref<SettingsForm | null>(null)
const values = ref<Record<string, any>>({})
const errors = ref<Record<string, string>>({})
const schemaForm = ref<InstanceType<typeof SchemaForm>>()

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const f = await fetchSettingsForm()
    form.value = f
    values.value = JSON.parse(JSON.stringify(f?.values || {}))
    errors.value = {}
  } catch (e) {
    loadError.value = errorMessage(e, t('llm.loadFailed'))
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function save() {
  if (schemaForm.value && !schemaForm.value.validate()) return
  saving.value = true
  saveError.value = ''
  errors.value = {}
  try {
    await saveSettings(values.value)
    host.toast(t('llm.saved'), 'success')
    // Re-load to pick up server-side normalisation (masked secrets).
    await load()
  } catch (e) {
    if (isApiError(e) && Object.keys(e.fields).length) {
      errors.value = settingsFieldErrors(e.fields)
      // Errors of fields that are not on this tab (or of the whole object) go to the save bar.
      const other = Object.entries(errors.value).filter(([k]) => !LLM_FIELDS.includes(k.split('.')[0]))
      saveError.value = other.length ? other.map(([k, v]) => `${k}: ${v}`).join('; ') : t('llm.fixErrors')
    } else {
      saveError.value = errorMessage(e, t('llm.saveFailed'))
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mod-settings">
    <SSpinner v-if="loading && !form" block />
    <SAlert v-else-if="loadError" tone="danger">
      {{ loadError }}
      <template #actions>
        <SButton size="sm" @click="load">{{ t('retry') }}</SButton>
      </template>
    </SAlert>
    <template v-else-if="form?.schema">
      <SchemaForm
        ref="schemaForm"
        v-model="values"
        :schema="form.schema"
        :ui-schema="form.ui_schema || null"
        :errors="errors"
        :disabled="!canEdit"
        :fields="LLM_FIELDS"
        layout="settings"
      />

      <div v-if="canEdit" class="mod-settings-footer">
        <SAlert v-if="saveError" tone="danger" dense class="mod-grow">{{ saveError }}</SAlert>
        <SButton variant="primary" icon="check" :loading="saving" @click="save">{{ t('llm.save') }}</SButton>
      </div>
    </template>
  </div>
</template>
