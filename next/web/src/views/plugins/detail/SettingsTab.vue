<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, toast } from '@sub2api/ui'
import SchemaForm from '@/components/schema/SchemaForm.vue'
import { fieldErrors, notifyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import type { PluginSettings } from '../pluginUtil'

// Plugin settings rendered from the plugin's JSON Schema. Secret values come
// back as "******"; sending "******" keeps the stored value.
const props = defineProps<{ pluginKey: string; settings: PluginSettings }>()
const emit = defineEmits<{ (e: 'saved'): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('plugin:manage'))

const values = ref<Record<string, any>>({})
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const form = ref<InstanceType<typeof SchemaForm>>()

watch(
  () => props.settings,
  (s) => {
    values.value = JSON.parse(JSON.stringify(s.values || {}))
    errors.value = {}
  },
  { immediate: true }
)

async function save() {
  if (form.value && !form.value.validate()) return
  saving.value = true
  errors.value = {}
  try {
    await api.put(`/plugins/${encodeURIComponent(props.pluginKey)}/settings`, { values: values.value })
    toast(t('common.saved'), 'success')
    emit('saved')
  } catch (e) {
    errors.value = fieldErrors(e, 'values.')
    if (!Object.keys(errors.value).length) errors.value = fieldErrors(e)
    notifyError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SCard :title="t('plugins.detail.tabs.settings')">
    <div class="max-w-2xl">
      <SchemaForm
        ref="form"
        v-model="values"
        :schema="(settings.schema as any)"
        :ui-schema="(settings.ui_schema as any) || null"
        :errors="errors"
        :disabled="!canManage"
      />
    </div>
    <div v-if="canManage" class="mt-4">
      <SButton variant="primary" :loading="saving" @click="save">{{ t('common.save') }}</SButton>
    </div>
  </SCard>
</template>
