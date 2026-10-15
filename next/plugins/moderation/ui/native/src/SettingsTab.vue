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

/** Shows a settings form from the server (secrets masked). */
function apply(f: SettingsForm) {
  form.value = f
  values.value = JSON.parse(JSON.stringify(f.values || {}))
  errors.value = {}
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    apply(await fetchSettingsForm())
  } catch (e) {
    loadError.value = errorMessage(e, t('llm.loadFailed'))
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** Sets the field errors of a failed save; returns the message of the save bar. */
function saveFailure(e: unknown): string {
  if (!isApiError(e) || !Object.keys(e.fields).length) return errorMessage(e, t('llm.saveFailed'))
  const { fields, root } = settingsFieldErrors(e.fields)
  errors.value = fields
  // Errors of the whole object or of fields that are not on this tab cannot be shown at a field.
  const elsewhere = Object.entries(fields).filter(([k]) => !LLM_FIELDS.includes(k.split('.')[0]))
  const lines = [...root, ...elsewhere.map(([k, v]) => `${k}: ${v}`)]
  return lines.length ? lines.join('; ') : t('llm.fixErrors')
}

async function save() {
  if (schemaForm.value && !schemaForm.value.validate()) return
  saving.value = true
  saveError.value = ''
  errors.value = {}
  try {
    // The response is the stored form (server-side normalisation, secrets masked).
    apply(await saveSettings(values.value))
    host.toast(t('llm.saved'), 'success')
  } catch (e) {
    saveError.value = saveFailure(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
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
