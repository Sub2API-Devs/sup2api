<script setup lang="ts">
import { computed, inject, ref, watch, type Component } from 'vue'
import { useUiLocale, useUiT } from '../i18n'
import SchemaField from './SchemaField.vue'
import { SCHEMA_WIDGETS_KEY } from './widgets'
import { localizedText, uiGet, validate as runValidate, withDefaults as fillDefaults, type JSONSchema, type UISchema } from './schema'

// Renders a JSON Schema object form (account credentials, plugin settings,
// declarative plugin form pages). v-model is the object value.
// layout "stacked" (default): label above each control. layout "settings":
// every ui:section becomes an SSettingsGroup and each field an SSettingRow
// (switch / select / number / segmented on the right, wide controls below).
// `fields` (alias `only`) renders and validates only those top-level keys;
// the other values are kept as they are. Widgets: the injected host widgets
// (SCHEMA_WIDGETS_KEY) merged with the `widgets` prop.
const props = withDefaults(
  defineProps<{
    schema: JSONSchema
    uiSchema?: UISchema | null
    modelValue: Record<string, any> | null | undefined
    /** Server-side field errors (path -> message). */
    errors?: Record<string, string>
    disabled?: boolean
    /** Host-provided widgets by `ui:widget` name (see SchemaField). */
    widgets?: Record<string, Component>
    layout?: 'stacked' | 'settings'
    fields?: string[]
    only?: string[]
  }>(),
  { layout: 'stacked' }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, any>): void }>()
const t = useUiT()
const locale = useUiLocale()
const injected = inject(SCHEMA_WIDGETS_KEY, null)
const allWidgets = computed(() => ({ ...(injected || {}), ...(props.widgets || {}) }))

const localErrors = ref<Record<string, string>>({})
const allErrors = computed(() => ({ ...(props.errors || {}), ...localErrors.value }))

// The rendered part of the schema (fields / only).
const keep = computed(() => props.fields ?? props.only)
const view = computed<JSONSchema>(() => {
  const k = keep.value
  if (!k || !props.schema?.properties) return props.schema
  const properties = Object.fromEntries(Object.entries(props.schema.properties).filter(([key]) => k.includes(key)))
  return { ...props.schema, properties, required: (props.schema.required || []).filter((r: string) => k.includes(r)) }
})
const viewUI = computed<UISchema | undefined>(() => {
  const ui = props.uiSchema || undefined
  const k = keep.value
  if (!ui || !k) return ui
  const order = uiGet<string[]>(ui, 'order')
  if (!order) return ui
  const key = 'ui:order' in ui ? 'ui:order' : 'order'
  return { ...ui, [key]: order.filter((x) => x === '*' || k.includes(x)) }
})

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
  localErrors.value = runValidate(view.value, viewUI.value, props.modelValue || {}, {
    required: t('ui.schema.v.required'),
    minLength: (n) => t('ui.schema.v.minLength', { n }),
    maxLength: (n) => t('ui.schema.v.maxLength', { n }),
    pattern: t('ui.schema.v.pattern'),
    minimum: (n) => t('ui.schema.v.minimum', { n }),
    maximum: (n) => t('ui.schema.v.maximum', { n }),
    integer: t('ui.schema.v.integer'),
    url: t('ui.schema.v.url'),
    email: t('ui.schema.v.email'),
    minItems: (n) => t('ui.schema.v.minItems', { n }),
    maxItems: (n) => t('ui.schema.v.maxItems', { n }),
    text: (v) => localizedText(v, locale())
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
      :schema="view"
      :ui="viewUI"
      :model-value="modelValue || {}"
      :root="modelValue || {}"
      :errors="allErrors"
      :disabled="disabled"
      :widgets="allWidgets"
      :layout="layout"
      bare
      @update:model-value="onUpdate"
    />
  </div>
</template>
