<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SchemaForm, SHint, toast } from '@sub2api/ui'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import { fieldErrors, notifyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { settingsFieldErrors, type PluginSettings } from '../pluginUtil'

// Plugin settings rendered from the plugin's JSON Schema in the settings
// layout (one SSettingsGroup per ui:section, one SSettingRow per field).
// Secret values come back as "******"; sending "******" keeps the stored value.
// Host widgets (proxy-select, group-select) are injected app-wide.
const props = defineProps<{ pluginKey: string; settings: PluginSettings }>()
const emit = defineEmits<{ (e: 'saved'): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('plugin:manage'))

const values = ref<Record<string, any>>({})
const loaded = ref('')
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const form = ref<InstanceType<typeof SchemaForm>>()

watch(
  () => props.settings,
  (s) => {
    values.value = JSON.parse(JSON.stringify(s.values || {}))
    errors.value = {}
    loaded.value = ''
  },
  { immediate: true }
)

// The first emitted value (after SchemaForm fills defaults) is the baseline for "unsaved changes".
watch(
  values,
  (v) => {
    if (!loaded.value) loaded.value = JSON.stringify(v)
  },
  { deep: true, flush: 'post' }
)
const dirty = computed(() => !!loaded.value && JSON.stringify(values.value) !== loaded.value)

function reset() {
  values.value = JSON.parse(JSON.stringify(props.settings.values || {}))
  errors.value = {}
  loaded.value = ''
}

async function save() {
  if (form.value && !form.value.validate()) return
  saving.value = true
  errors.value = {}
  try {
    await api.put(`/plugins/${encodeURIComponent(props.pluginKey)}/settings`, { values: values.value })
    toast(t('common.saved'), 'success')
    loaded.value = JSON.stringify(values.value)
    emit('saved')
  } catch (e) {
    const { fields, root } = settingsFieldErrors(fieldErrors(e))
    errors.value = fields
    // Errors of the whole object have no field to show at.
    if (root.length) toast(root.join('; '), 'error')
    else notifyError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl space-y-4" data-testid="plugin-settings">
    <SchemaForm
      ref="form"
      v-model="values"
      :schema="(settings.schema as any)"
      :ui-schema="(settings.ui_schema as any) || null"
      :errors="errors"
      :disabled="!canManage"
      layout="settings"
    />
    <div v-if="canManage" class="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-dark-700 dark:bg-dark-800/95">
      <SHint v-if="dirty" size="xs" tone="warning" class="mr-auto" data-testid="plugin-settings-dirty">{{ t('plugins.settings.unsaved') }}</SHint>
      <SettingsSaveBar :dirty="dirty" :saving="saving" @save="save" @reset="reset" />
    </div>
  </div>
</template>
