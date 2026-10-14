<script setup lang="ts">
import { isDev } from '../dev'
import { computed, ref, useId, watch, type Component } from 'vue'
import { useUiLocale, useUiT } from '../i18n'
import SField from '../SField.vue'
import SSettingRow from '../SSettingRow.vue'
import SSettingsGroup from '../SSettingsGroup.vue'
import SKeyValue from '../SKeyValue.vue'
import SSwitch from '../SSwitch.vue'
import STagInput from '../STagInput.vue'
import SIcon from '../SIcon.vue'
import SInput from '../SInput.vue'
import STextarea from '../STextarea.vue'
import SSelect from '../SSelect.vue'
import SSegmented from '../SSegmented.vue'
import SRadioGroup from '../SRadioGroup.vue'
import SCheckbox from '../SCheckbox.vue'
import SButton from '../SButton.vue'
import { fromLocalInput, toLocalInput } from '../timeRange'
import type { SelectOption } from '../types'
import {
  BUILTIN_WIDGETS,
  SECRET_MASK,
  childUI,
  enumOptions,
  fieldHelp,
  fieldLabel,
  fieldSection,
  isVisible,
  localizedText,
  orderedKeys,
  resolveWidget,
  schemaType,
  uiGet,
  withDefaults as fillDefaults,
  type FieldSection,
  type JSONSchema,
  type UISchema
} from './schema'

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
const locale = computed(() => currentLocale())

const requested = computed(() => uiGet<string>(props.ui, 'widget'))
const custom = computed<Component | undefined>(() => (requested.value ? props.widgets?.[requested.value] : undefined))
const warned = new Set<string>()
const widget = computed(() => {
  const w = resolveWidget(props.schema, props.ui, BUILTIN_WIDGETS)
  const r = requested.value
  if (r && !custom.value && !BUILTIN_WIDGETS.includes(r) && !warned.has(r) && isDev) {
    warned.add(r)
    console.warn(`[@sub2api/ui] SchemaForm: unknown ui:widget "${r}" for "${props.path || props.name}"; rendering "${w}" instead.`)
  }
  return w
})
const label = computed(() => fieldLabel(props.name, props.schema, props.ui, locale.value))
const help = computed(() => fieldHelp(props.schema, props.ui, locale.value))
const details = computed(() => localizedText(uiGet(props.ui, 'details'), locale.value))
const placeholder = computed(() => {
  const p = uiGet(props.ui, 'placeholder') ?? props.schema.examples?.[0]
  return p === undefined ? '' : localizedText(p, locale.value)
})
const options = computed(() => enumOptions(props.schema, props.ui, locale.value) || [])
const selectOptions = computed<SelectOption[]>(() => options.value.map((o) => ({ value: o.value, label: o.label })))
const uiOptions = computed<Record<string, any>>(() => uiGet(props.ui, 'options') || {})
const unit = computed(() => (uiOptions.value.unit === undefined ? undefined : localizedText(uiOptions.value.unit, locale.value)))
const error = computed(() => props.errors[props.path])
/** Value cannot change (schema readOnly, ui:readonly): text controls stay focusable and selectable. */
const readonlyField = computed(() => props.schema.readOnly === true || uiGet(props.ui, 'readonly') === true)
/** Disabled or read-only: for controls without a readonly state (select, switch, lists). */
const readOnly = computed(() => props.disabled || readonlyField.value)
const settings = computed(() => props.layout === 'settings')

function set(v: any) {
  emit('update:modelValue', v)
}

// ---------------------------------------------------------------- object
const keys = computed(() => orderedKeys(props.schema, props.ui))
const requiredKeys = computed<string[]>(() => props.schema.required || [])
function setChild(k: string, v: any) {
  const next = { ...(props.modelValue || {}) }
  if (v === undefined) delete next[k]
  else next[k] = v
  set(next)
}
function childVisible(k: string) {
  const cu = childUI(props.ui, k)
  return isVisible(cu, props.root) && uiGet(cu, 'widget') !== 'hidden'
}

// Fields grouped by ui:section: the keys before the first section form an
// untitled group, then each section runs until the next one.
interface KeyGroup {
  id: string
  section: FieldSection | null
  keys: string[]
}
const keyGroups = computed<KeyGroup[]>(() => {
  const out: KeyGroup[] = []
  let cur: KeyGroup = { id: '', section: null, keys: [] }
  for (const k of keys.value) {
    const s = fieldSection(childUI(props.ui, k), locale.value)
    if (s) {
      if (cur.keys.length) out.push(cur)
      cur = { id: k, section: s, keys: [] }
    }
    cur.keys.push(k)
  }
  if (cur.keys.length) out.push(cur)
  return out
})
const openSections = ref<Record<string, boolean>>({})
const hasValue = (v: unknown) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)
function childPath(k: string) {
  return props.path ? `${props.path}.${k}` : k
}
/** A collapsed section opens by itself while one of its fields holds a value or an error. */
function groupOpen(g: KeyGroup): boolean {
  if (!g.section?.collapsed) return true
  if (openSections.value[g.id] !== undefined) return openSections.value[g.id]
  return g.keys.some((k) => {
    const p = childPath(k)
    return hasValue(props.modelValue?.[k]) || Object.keys(props.errors).some((e) => e === p || e.startsWith(p + '.'))
  })
}
function toggleGroup(g: KeyGroup) {
  openSections.value = { ...openSections.value, [g.id]: !groupOpen(g) }
}
function setGroupOpen(g: KeyGroup, v: boolean) {
  openSections.value = { ...openSections.value, [g.id]: v }
}

// ---------------------------------------------------------------- secret
const secretExisting = computed(() => props.modelValue === SECRET_MASK)
function onSecret(v: unknown) {
  const s = String(v ?? '')
  set(s === '' && secretExisting.value ? SECRET_MASK : s)
}

// ---------------------------------------------------------------- number / date
function onNumber(v: unknown) {
  set(v === null || v === undefined || v === '' ? undefined : v)
}
function onDateTime(v: unknown) {
  const s = fromLocalInput(typeof v === 'string' ? v : '')
  set(s || undefined)
}

// ---------------------------------------------------------------- select
const searchable = computed(() => (uiOptions.value.searchable === undefined ? selectOptions.value.length >= 10 : !!uiOptions.value.searchable))
function onSelect(v: unknown) {
  set(v === null ? undefined : v)
}

// ---------------------------------------------------------------- multi-select
const multiOptions = computed(() => enumOptions(props.schema.items || {}, childUI(props.ui, 'items'), locale.value) || [])
function toggleMulti(v: any, on: boolean) {
  const cur: any[] = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  const i = cur.indexOf(v)
  if (on && i < 0) cur.push(v)
  if (!on && i >= 0) cur.splice(i, 1)
  set(cur)
}

// ---------------------------------------------------------------- object-list
const itemSchema = computed<JSONSchema>(() => props.schema.items || {})
const items = computed<any[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []))
// Stable keys per item, so removing or moving one keeps the others' state.
let keySeq = 0
const itemKeys = ref<number[]>([])
watch(
  () => items.value.length,
  (n) => {
    const k = itemKeys.value.slice(0, n)
    while (k.length < n) k.push(++keySeq)
    itemKeys.value = k
  },
  { immediate: true }
)
const canAdd = computed(() => props.schema.maxItems === undefined || items.value.length < props.schema.maxItems)
function itemTitle(i: number): string {
  const tpl = uiOptions.value.itemTitle
  return tpl === undefined ? t('ui.item', { n: i + 1 }) : localizedText(tpl, locale.value).replace('{n}', String(i + 1))
}
function addItem() {
  const cur = [...items.value]
  cur.push(fillDefaults(itemSchema.value, schemaType(itemSchema.value) === 'object' ? {} : undefined))
  itemKeys.value = [...itemKeys.value, ++keySeq]
  set(cur)
}
function setItem(i: number, v: any) {
  const cur = [...items.value]
  cur[i] = v
  set(cur)
}
function removeItem(i: number) {
  const cur = [...items.value]
  cur.splice(i, 1)
  const k = [...itemKeys.value]
  k.splice(i, 1)
  itemKeys.value = k
  set(cur)
}
function moveItem(i: number, d: -1 | 1) {
  const j = i + d
  if (j < 0 || j >= items.value.length) return
  const cur = [...items.value]
  ;[cur[i], cur[j]] = [cur[j], cur[i]]
  const k = [...itemKeys.value]
  ;[k[i], k[j]] = [k[j], k[i]]
  itemKeys.value = k
  set(cur)
}

// ---------------------------------------------------------------- json fallback
const jsonText = ref(props.modelValue === undefined ? '' : JSON.stringify(props.modelValue, null, 2))
const jsonError = ref('')
function onJSON(v: unknown) {
  jsonText.value = String(v ?? '')
  if (!jsonText.value.trim()) {
    jsonError.value = ''
    return set(undefined)
  }
  try {
    set(JSON.parse(jsonText.value))
    jsonError.value = ''
  } catch {
    jsonError.value = t('ui.schema.invalidJSON')
  }
}
// Values set from outside (loaded, reset, defaults) replace the text unless
// it already says the same thing.
watch(
  () => props.modelValue,
  (v) => {
    if (widget.value !== 'json') return
    let same = false
    try {
      same = jsonText.value.trim() !== '' && JSON.stringify(JSON.parse(jsonText.value)) === JSON.stringify(v)
    } catch {
      same = false
    }
    if (same || (v === undefined && !jsonText.value.trim())) return
    jsonText.value = v === undefined ? '' : JSON.stringify(v, null, 2)
    jsonError.value = ''
  }
)

const presets = computed<string[]>(() => uiOptions.value.presets || props.schema.examples || [])
const listId = useId()

// url-presets with schema.enum (CONTRACTS §21.3): the server restricted the
// field to the allowed values (caller lacks account:settings:custom), so only
// those can be chosen. A stored value outside the list (set by an admin) stays
// selectable so editing other fields does not drop it.
const urlEnum = computed<string[] | null>(() => (Array.isArray(props.schema.enum) ? props.schema.enum.map(String) : null))
const urlEnumOptions = computed<string[]>(() => {
  const list = urlEnum.value || []
  const cur = typeof props.modelValue === 'string' ? props.modelValue : ''
  return cur && !list.includes(cur) ? [cur, ...list] : list
})
const urlEnumSelect = computed<SelectOption[]>(() => urlEnumOptions.value.map((p) => ({ value: p, label: p })))
// A locked base URL (CONTRACTS §21.3) shows only "set by an administrator";
// the plugin's own help text would contradict it.
const restrictedHint = computed(() => (widget.value === 'url-presets' && readOnly.value ? t('ui.schema.setByAdmin') : ''))
const fieldHint = computed(() => {
  const h = restrictedHint.value || help.value
  if (widget.value === 'secret' && secretExisting.value) return h ? `${h} ${t('ui.schema.secretKeep')}` : t('ui.schema.secretKeep')
  return h
})

// ---------------------------------------------------------------- frame
/** Widgets laid out below their label in the settings layout. */
const WIDE = new Set(['textarea', 'tags', 'key-value', 'model-mapping', 'object-list', 'json', 'multi-select', 'url-presets', 'radio', 'object'])
const stackedRow = computed(() => WIDE.has(widget.value) || (!!custom.value && uiOptions.value.stacked !== false))
const frame = computed(() => (settings.value && !props.bare ? SSettingRow : SField))
const frameProps = computed(() =>
  settings.value && !props.bare
    ? { label: label.value, description: fieldHint.value || undefined, error: error.value || jsonError.value || undefined, required: props.required, stacked: stackedRow.value }
    : { label: props.bare ? undefined : label.value, hint: fieldHint.value || undefined, error: error.value || jsonError.value || undefined, required: props.required }
)
/** Width of inline controls on the right of a settings row. */
const inlineWidth = computed(() => (settings.value && !props.bare && !stackedRow.value ? 'w-full sm:w-64' : 'w-full'))
const inputType = computed(() => (props.schema.format === 'email' ? 'email' : props.schema.format === 'uri' || props.schema.format === 'url' ? 'url' : 'text'))
</script>

<template>
  <!-- host-provided widget (console pickers, plugin custom controls) -->
  <component :is="frame" v-if="custom" v-bind="frameProps">
    <template v-if="details" #details>{{ details }}</template>
    <component
      :is="custom"
      :model-value="modelValue"
      :schema="schema"
      :ui="ui"
      :multiple="schemaType(schema) === 'array'"
      :disabled="readOnly"
      @update:model-value="set"
    />
  </component>

  <!-- root object in the settings layout: one SSettingsGroup per section -->
  <div v-else-if="widget === 'object' && bare && settings" class="space-y-4">
    <template v-for="g in keyGroups" :key="g.id">
      <SSettingsGroup
        v-if="g.keys.some(childVisible)"
        :title="g.section?.title || undefined"
        :description="g.section?.description || undefined"
        :collapsible="!!g.section?.collapsed"
        :open="groupOpen(g)"
        data-testid="schema-section"
        @update:open="setGroupOpen(g, $event)"
      >
        <template v-for="k in g.keys" :key="k">
          <SchemaField
            v-if="childVisible(k)"
            :name="k"
            :path="childPath(k)"
            :schema="schema.properties[k]"
            :ui="childUI(ui, k)"
            :model-value="modelValue?.[k]"
            :root="root"
            :errors="errors"
            :required="requiredKeys.includes(k)"
            :disabled="disabled"
            :widgets="widgets"
            layout="settings"
            @update:model-value="setChild(k, $event)"
          />
        </template>
      </SSettingsGroup>
    </template>
  </div>

  <!-- nested object in the settings layout: a stacked row around a stacked sub-form -->
  <SSettingRow v-else-if="widget === 'object' && settings" :label="label" :description="help || undefined" stacked>
    <template v-if="details" #details>{{ details }}</template>
    <div class="w-full rounded-control border border-line p-4">
      <SchemaField
        :name="name"
        :path="path"
        :schema="schema"
        :ui="ui"
        :model-value="modelValue"
        :root="root"
        :errors="errors"
        :disabled="disabled"
        :widgets="widgets"
        bare
        @update:model-value="set"
      />
    </div>
  </SSettingRow>

  <!-- object: nested fields -->
  <fieldset v-else-if="widget === 'object'" :class="bare ? 'space-y-4' : 'space-y-4 rounded-xl border border-gray-200 p-4 dark:border-dark-700'">
    <legend v-if="!bare" class="px-1 text-sm font-medium text-gray-700 dark:text-gray-300">{{ label }}</legend>
    <p v-if="!bare && help" class="input-hint !mt-0">{{ help }}</p>
    <template v-for="g in keyGroups" :key="g.id">
      <div v-if="g.section && g.keys.some(childVisible)" class="border-t border-gray-100 pt-4 dark:border-dark-700" data-testid="schema-section">
        <button
          v-if="g.section.collapsed"
          type="button"
          class="flex w-full items-start justify-between gap-3 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
          :aria-expanded="groupOpen(g)"
          @click="toggleGroup(g)"
        >
          <span class="min-w-0">
            <span class="block text-sm font-semibold text-gray-800 dark:text-gray-200">{{ g.section.title }}</span>
            <span v-if="g.section.description" class="mt-0.5 block text-xs text-gray-500 dark:text-dark-400">{{ g.section.description }}</span>
          </span>
          <SIcon name="chevron-down" class="mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform" :class="groupOpen(g) ? 'rotate-180' : ''" />
        </button>
        <template v-else>
          <div class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ g.section.title }}</div>
          <p v-if="g.section.description" class="mt-0.5 text-xs text-gray-500 dark:text-dark-400">{{ g.section.description }}</p>
        </template>
      </div>
      <template v-for="k in g.keys" :key="k">
        <SchemaField
          v-if="groupOpen(g) && childVisible(k)"
          :name="k"
          :path="childPath(k)"
          :schema="schema.properties[k]"
          :ui="childUI(ui, k)"
          :model-value="modelValue?.[k]"
          :root="root"
          :errors="errors"
          :required="requiredKeys.includes(k)"
          :disabled="disabled"
          :widgets="widgets"
          @update:model-value="setChild(k, $event)"
        />
      </template>
    </template>
  </fieldset>

  <!-- switch in the settings layout: the row label names it -->
  <SSettingRow v-else-if="widget === 'switch' && settings && !bare" :label="label" :description="help || undefined" :error="error" :required="required">
    <template v-if="details" #details>{{ details }}</template>
    <SSwitch :model-value="!!modelValue" :disabled="readOnly" @update:model-value="set" />
  </SSettingRow>

  <!-- switch: inline label -->
  <div v-else-if="widget === 'switch'">
    <SSwitch :model-value="!!modelValue" :disabled="readOnly" :label="label" :error="!!error" @update:model-value="set" />
    <p v-if="error" class="input-error-text">{{ error }}</p>
    <p v-else-if="help" class="input-hint">{{ help }}</p>
  </div>

  <component :is="frame" v-else v-bind="frameProps">
    <template v-if="details" #details>{{ details }}</template>
    <SInput
      v-if="widget === 'secret'"
      type="password"
      revealable
      :class="inlineWidth"
      :model-value="secretExisting ? '' : (modelValue ?? '')"
      :placeholder="secretExisting ? SECRET_MASK : placeholder"
      :disabled="disabled"
      :readonly="readonlyField"
      autocomplete="new-password"
      @update:model-value="onSecret"
    />

    <STextarea
      v-else-if="widget === 'textarea'"
      :mono="!!uiOptions.mono"
      :rows="uiOptions.rows || 4"
      :model-value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonlyField"
      @update:model-value="set"
    />

    <SSelect
      v-else-if="widget === 'select'"
      :class="inlineWidth"
      :model-value="modelValue"
      :options="selectOptions"
      :placeholder="placeholder || '—'"
      :searchable="searchable"
      :disabled="readOnly"
      @update:model-value="onSelect"
    />

    <SSegmented v-else-if="widget === 'segmented'" :model-value="modelValue" :options="selectOptions" :size="settings ? 'sm' : 'md'" :disabled="readOnly" @update:model-value="set" />

    <SRadioGroup v-else-if="widget === 'radio'" :model-value="modelValue" :options="selectOptions" :inline="!!uiOptions.inline" :disabled="readOnly" @update:model-value="set" />

    <SInput
      v-else-if="widget === 'number'"
      type="number"
      :class="inlineWidth"
      :model-value="modelValue ?? null"
      :min="schema.minimum"
      :max="schema.maximum"
      :step="schemaType(schema) === 'integer' ? 1 : 'any'"
      :suffix="unit"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonlyField"
      @update:model-value="onNumber"
    />

    <SInput
      v-else-if="widget === 'date-time'"
      type="datetime-local"
      :class="inlineWidth"
      :model-value="toLocalInput(modelValue)"
      :disabled="disabled"
      :readonly="readonlyField"
      @update:model-value="onDateTime"
    />

    <SInput
      v-else-if="widget === 'date' || widget === 'time'"
      :type="widget"
      :class="inlineWidth"
      :model-value="modelValue ?? ''"
      :disabled="disabled"
      :readonly="readonlyField"
      @update:model-value="set($event || undefined)"
    />

    <!-- url-presets restricted to schema.enum: choose only (CONTRACTS §21.3) -->
    <SSelect
      v-else-if="widget === 'url-presets' && urlEnum"
      :model-value="urlEnumOptions.includes(String(modelValue ?? '')) ? modelValue : null"
      :options="urlEnumSelect"
      :placeholder="urlEnumOptions.includes(String(modelValue ?? '')) ? undefined : placeholder || '—'"
      :disabled="readOnly"
      data-testid="url-enum"
      @update:model-value="set($event || undefined)"
    />

    <div v-else-if="widget === 'url-presets'" class="flex gap-2">
      <SInput
        type="url"
        class="flex-1"
        :model-value="modelValue ?? ''"
        :placeholder="placeholder || presets[0]"
        :list="listId"
        :disabled="disabled"
        :readonly="readonlyField"
        @update:model-value="set($event || undefined)"
      />
      <datalist :id="listId">
        <option v-for="p in presets" :key="p" :value="p" />
      </datalist>
      <select
        v-if="presets.length"
        class="input !w-auto"
        :disabled="readOnly"
        :aria-label="t('ui.schema.presets')"
        @change="set(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''"
      >
        <option value="">{{ t('ui.schema.presets') }}</option>
        <option v-for="p in presets" :key="p" :value="p">{{ p }}</option>
      </select>
    </div>

    <SKeyValue
      v-else-if="widget === 'key-value'"
      :model-value="modelValue"
      :key-label="uiOptions.keyLabel ? localizedText(uiOptions.keyLabel, locale) : undefined"
      :value-label="uiOptions.valueLabel ? localizedText(uiOptions.valueLabel, locale) : undefined"
      :key-placeholder="uiOptions.keyPlaceholder ? localizedText(uiOptions.keyPlaceholder, locale) : undefined"
      :value-placeholder="uiOptions.valuePlaceholder ? localizedText(uiOptions.valuePlaceholder, locale) : undefined"
      :mono="!!uiOptions.mono"
      :disabled="readOnly"
      @update:model-value="set"
    />

    <SKeyValue
      v-else-if="widget === 'model-mapping'"
      :model-value="modelValue"
      :key-label="uiOptions.keyLabel ? localizedText(uiOptions.keyLabel, locale) : t('ui.schema.mappingFrom')"
      :value-label="uiOptions.valueLabel ? localizedText(uiOptions.valueLabel, locale) : t('ui.schema.mappingTo')"
      :key-placeholder="uiOptions.keyPlaceholder ? localizedText(uiOptions.keyPlaceholder, locale) : undefined"
      :value-placeholder="uiOptions.valuePlaceholder ? localizedText(uiOptions.valuePlaceholder, locale) : undefined"
      mono
      separator
      :disabled="readOnly"
      @update:model-value="set"
    />

    <STagInput v-else-if="widget === 'tags'" :model-value="modelValue" :placeholder="placeholder || undefined" :disabled="readOnly" @update:model-value="set" />

    <div v-else-if="widget === 'multi-select'" class="flex flex-wrap gap-x-4 gap-y-2 pt-1" role="group">
      <SCheckbox
        v-for="o in multiOptions"
        :key="String(o.value)"
        :model-value="Array.isArray(modelValue) && modelValue.includes(o.value)"
        :label="o.label"
        :disabled="readOnly"
        @update:model-value="toggleMulti(o.value, $event)"
      />
    </div>

    <div v-else-if="widget === 'object-list'" class="w-full space-y-3">
      <div v-for="(item, i) in items" :key="itemKeys[i]" class="rounded-xl border border-gray-200 p-3 dark:border-dark-700" data-testid="schema-list-item">
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-fg-muted">{{ itemTitle(i) }}</span>
          <div v-if="!readOnly" class="flex items-center gap-0.5">
            <SButton variant="ghost" size="sm" icon="chevron-down" icon-only class="[&>svg]:rotate-180" :aria-label="t('ui.moveUp')" :title="t('ui.moveUp')" :disabled="i === 0" @click="moveItem(i, -1)" />
            <SButton variant="ghost" size="sm" icon="chevron-down" icon-only :aria-label="t('ui.moveDown')" :title="t('ui.moveDown')" :disabled="i === items.length - 1" @click="moveItem(i, 1)" />
            <SButton variant="ghost" size="sm" icon="x" icon-only tone="danger" :aria-label="t('ui.removeItem', { name: itemTitle(i) })" :title="t('ui.remove')" @click="removeItem(i)" />
          </div>
        </div>
        <SchemaField
          :name="String(i)"
          :path="`${path}.${i}`"
          :schema="itemSchema"
          :ui="childUI(ui, 'items')"
          :model-value="item"
          :root="root"
          :errors="errors"
          :disabled="disabled"
          :widgets="widgets"
          bare
          @update:model-value="setItem(Number(i), $event)"
        />
      </div>
      <SButton v-if="!readOnly" size="sm" icon="plus" :disabled="!canAdd" @click="addItem">{{ t('ui.add') }}</SButton>
    </div>

    <STextarea v-else-if="widget === 'json'" mono class="text-xs" :rows="uiOptions.rows || 5" :model-value="jsonText" :disabled="disabled" :readonly="readonlyField" @update:model-value="onJSON" />

    <SInput
      v-else
      :type="inputType"
      :class="inlineWidth"
      :model-value="modelValue ?? ''"
      :placeholder="placeholder"
      :mono="!!uiOptions.mono"
      :suffix="unit"
      :disabled="disabled"
      :readonly="readonlyField"
      :maxlength="schema.maxLength"
      @update:model-value="set"
    />
  </component>
</template>
