<script setup lang="ts">
// One JSON Schema field (SchemaForm renders the root object with it). Picks
// the widget (ui:widget, else the one the schema implies), resolves label /
// help / placeholder / errors, and renders the widget's control inside an
// SField (stacked) or SSettingRow (settings layout) frame. Objects render
// their own frame (SchemaObject); in the stacked layout a switch carries its
// label itself.
import { computed, ref, type Component } from 'vue'
import { useUiLocale, useUiT } from '../i18n'
import { isDev } from '../dev'
import SField from '../SField.vue'
import SSettingRow from '../SSettingRow.vue'
import SchemaObject from './SchemaObject.vue'
import { CONTROLS, WIDE_WIDGETS } from './controls'
import type { ControlContext } from './controls/context'
import { BUILTIN_WIDGETS, SECRET_MASK, fieldHelp, fieldLabel, localizedText, resolveWidget, schemaType, uiGet, type JSONSchema, type UISchema } from './schema'

defineOptions({ name: 'SchemaField' })

const props = withDefaults(
  defineProps<{
    name: string
    path: string
    schema: JSONSchema
    ui?: UISchema
    modelValue: any
    root: any
    errors: Record<string, string>
    required?: boolean
    disabled?: boolean
    /** Render without label (array items, root object). */
    bare?: boolean
    /**
     * Host-provided widgets by `ui:widget` name (e.g. the console's
     * `proxy-select` / `group-select` pickers). A matching component is rendered
     * inside SField with `modelValue`, `schema`, `ui`, `multiple` (array
     * schemas) and `disabled`, and must emit `update:modelValue`. Unknown widget
     * names fall back to the widget the schema type implies.
     */
    widgets?: Record<string, Component>
    /** stacked: label above the control; settings: SSettingsGroup / SSettingRow. */
    layout?: 'stacked' | 'settings'
  }>(),
  { layout: 'stacked' }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()
const t = useUiT()
const currentLocale = useUiLocale()

const requested = computed(() => uiGet<string>(props.ui, 'widget'))
const custom = computed<Component | undefined>(() => (requested.value ? props.widgets?.[requested.value] : undefined))
const warned = new Set<string>()
const widget = computed(() => {
  const w = resolveWidget(props.schema, props.ui, BUILTIN_WIDGETS)
  const r = requested.value
  if (isDev && r && !custom.value && !BUILTIN_WIDGETS.includes(r) && !warned.has(r)) {
    warned.add(r)
    console.warn(`[@sub2api/ui] SchemaForm: unknown ui:widget "${r}" for "${props.path || props.name}"; rendering "${w}" instead.`)
  }
  return w
})
const control = computed(() => custom.value ?? CONTROLS[widget.value] ?? CONTROLS.text)

const settings = computed(() => props.layout === 'settings')
const options = computed<Record<string, any>>(() => uiGet(props.ui, 'options') || {})
const readonly = computed(() => props.schema.readOnly === true || uiGet(props.ui, 'readonly') === true)

/** Message of a control whose text is not a value yet (JSON). */
const controlError = ref('')
const rowFrame = computed(() => settings.value && !props.bare)
const stackedRow = computed(() => WIDE_WIDGETS.has(widget.value) || (!!custom.value && options.value.stacked !== false))
const ctx = computed<ControlContext>(() => {
  const locale = currentLocale()
  const placeholder = uiGet(props.ui, 'placeholder') ?? props.schema.examples?.[0]
  return {
    widget: widget.value,
    name: props.name,
    path: props.path,
    schema: props.schema,
    ui: props.ui,
    root: props.root,
    errors: props.errors,
    widgets: props.widgets,
    layout: props.layout,
    bare: !!props.bare,
    label: fieldLabel(props.name, props.schema, props.ui, locale),
    help: fieldHelp(props.schema, props.ui, locale),
    details: localizedText(uiGet(props.ui, 'details'), locale),
    placeholder: placeholder === undefined ? '' : localizedText(placeholder, locale),
    options: options.value,
    locale,
    disabled: !!props.disabled,
    readonly: readonly.value,
    locked: !!props.disabled || readonly.value,
    fieldClass: settings.value && !props.bare && !stackedRow.value ? 'w-full sm:w-64' : 'w-full',
    inlineLabel: widget.value === 'switch' && !custom.value && !rowFrame.value,
    setError: (message) => (controlError.value = message)
  }
})

const hint = computed(() => {
  // A base URL locked by the server (CONTRACTS §21.3) only says so: the
  // plugin's own help would contradict it.
  const h = widget.value === 'url-presets' && ctx.value.locked ? t('ui.schema.setByAdmin') : ctx.value.help
  if (widget.value !== 'secret' || props.modelValue !== SECRET_MASK) return h
  return h ? `${h} ${t('ui.schema.secretKeep')}` : t('ui.schema.secretKeep')
})
const frameProps = computed(() => {
  const common = { error: props.errors[props.path] || controlError.value || undefined, required: props.required }
  if (rowFrame.value) return { ...common, label: ctx.value.label, description: hint.value || undefined, stacked: stackedRow.value }
  return { ...common, label: props.bare || ctx.value.inlineLabel ? undefined : ctx.value.label, hint: hint.value || undefined }
})

function set(v: unknown) {
  emit('update:modelValue', v)
}
</script>

<template>
  <SchemaObject v-if="widget === 'object' && !custom" :model-value="modelValue" :ctx="ctx" @update:model-value="set" />
  <component :is="rowFrame ? SSettingRow : SField" v-else v-bind="frameProps">
    <template v-if="ctx.details" #details>{{ ctx.details }}</template>
    <component
      :is="control"
      v-if="custom"
      :model-value="modelValue"
      :schema="schema"
      :ui="ui"
      :multiple="schemaType(schema) === 'array'"
      :disabled="ctx.locked"
      @update:model-value="set"
    />
    <component :is="control" v-else :model-value="modelValue" :ctx="ctx" @update:model-value="set" />
  </component>
</template>
