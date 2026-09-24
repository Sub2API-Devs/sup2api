<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SSpinner, toast } from '@sub2api/ui'
import SchemaForm from '@/components/schema/SchemaForm.vue'
import type { UIPlugin, UIPluginPage } from '@/api/types'
import { assetURL } from '@/stores/plugins'
import { errorMessage, fieldErrors, notifyError } from '@/utils/errors'
import { fetchAsset, parseRouteRef } from './declarative'

// Declarative plugin form page: JSON Schema from the package (page.schema),
// initial values from page.source (optional), submitted to page.submit.
// The schema file may be a plain JSON Schema or {schema, ui_schema}; a
// sibling "<name>.ui.json" next to "<name>.schema.json" is used as uiSchema.
const props = defineProps<{ plugin: UIPlugin; page: UIPluginPage }>()
const { t } = useI18n()

const schema = ref<Record<string, any> | null>(null)
const uiSchema = ref<Record<string, any> | null>(null)
const value = ref<Record<string, any>>({})
const errors = ref<Record<string, string>>({})
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const form = ref<InstanceType<typeof SchemaForm>>()

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    if (!props.page.schema) throw new Error('page.schema missing')
    const doc = await fetchAsset<Record<string, any>>(assetURL(props.plugin, props.page.schema))
    if (!doc) throw new Error(`cannot load ${props.page.schema}`)
    if (doc.schema && typeof doc.schema === 'object') {
      schema.value = doc.schema
      uiSchema.value = doc.ui_schema || doc.uiSchema || null
    } else {
      schema.value = doc
      if (props.page.schema.endsWith('.schema.json')) {
        uiSchema.value = await fetchAsset(assetURL(props.plugin, props.page.schema.replace(/\.schema\.json$/, '.ui.json'))).catch(() => null)
      }
    }
    const src = parseRouteRef(props.page.source)
    if (src) {
      const data = await api.request(src.method, `/p/${props.plugin.key}${src.path}`)
      value.value = data && typeof data === 'object' && !Array.isArray(data) ? (data.values ?? data) : {}
    }
  } catch (e) {
    loadError.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

async function submit() {
  const target = parseRouteRef(props.page.submit, 'POST')
  if (!target || !form.value?.validate()) return
  saving.value = true
  errors.value = {}
  try {
    await api.request(target.method, `/p/${props.plugin.key}${target.path}`, { body: value.value })
    toast(t('common.saved'), 'success')
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) notifyError(e)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="card max-w-3xl p-6">
    <div v-if="loading" class="flex justify-center py-10"><SSpinner /></div>
    <p v-else-if="loadError" class="text-sm text-red-500">{{ loadError }}</p>
    <form v-else-if="schema" @submit.prevent="submit">
      <SchemaForm ref="form" v-model="value" :schema="schema" :ui-schema="uiSchema" :errors="errors" />
      <div v-if="page.submit" class="mt-6 flex justify-end">
        <SButton type="submit" variant="primary" :loading="saving">{{ t('common.save') }}</SButton>
      </div>
    </form>
  </div>
</template>
