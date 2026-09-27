<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import SchemaField from './SchemaField.vue'
import { validate as runValidate, withDefaults as fillDefaults, type JSONSchema, type UISchema } from './schema'

// Renders a JSON Schema object form (account credentials, plugin settings,
// declarative plugin form pages). v-model is the object value.
const props = defineProps<{
  schema: JSONSchema
  uiSchema?: UISchema | null
  modelValue: Record<string, any> | null | undefined
  /** Server-side field errors (path -> message). */
  errors?: Record<string, string>
  disabled?: boolean
  /** Host-provided widgets by `ui:widget` name (see SchemaField). */
  widgets?: Record<string, Component>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, any>): void }>()
const { t } = useI18n()

const localErrors = ref<Record<string, string>>({})
const allErrors = computed(() => ({ ...(props.errors || {}), ...localErrors.value }))

// Apply schema defaults once per schema.
watch(
  () => props.schema,
  (s) => {
    if (!s) return
    const filled = fillDefaults(s, props.modelValue || {})
    if (JSON.stringify(filled) !== JSON.stringify(props.modelValue || {})) emit('update:modelValue', filled)
  },
  { immediate: true }
)

function onUpdate(v: any) {
  localErrors.value = {}
  emit('update:modelValue', v || {})
}

/** Validates visible fields; returns true when valid and shows messages otherwise. */
function validate(): boolean {
  localErrors.value = runValidate(props.schema, props.uiSchema || undefined, props.modelValue || {}, {
    required: t('ui.schema.v.required'),
    minLength: (n) => t('ui.schema.v.minLength', { n }),
    maxLength: (n) => t('ui.schema.v.maxLength', { n }),
    pattern: t('ui.schema.v.pattern'),
    minimum: (n) => t('ui.schema.v.minimum', { n }),
    maximum: (n) => t('ui.schema.v.maximum', { n }),
    integer: t('ui.schema.v.integer'),
    url: t('ui.schema.v.url')
  })
  return Object.keys(localErrors.value).length === 0
}

defineExpose({ validate })
</script>

<template>
  <div class="space-y-4">
    <SchemaField
      name=""
      path=""
      :schema="schema"
      :ui="uiSchema || undefined"
      :model-value="modelValue || {}"
      :root="modelValue || {}"
      :errors="allErrors"
      :disabled="disabled"
      :widgets="widgets"
      bare
      @update:model-value="onUpdate"
    />
  </div>
</template>
