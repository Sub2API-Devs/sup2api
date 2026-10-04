<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import SField from '../SField.vue'
import SKeyValue from '../SKeyValue.vue'
import SSwitch from '../SSwitch.vue'
import STagInput from '../STagInput.vue'
import SIcon from '../SIcon.vue'
import {
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

const props = defineProps<{
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
   * names fall back to the built-in field.
   */
  widgets?: Record<string, Component>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()
const { t, locale } = useI18n()

const widget = computed(() => resolveWidget(props.schema, props.ui))
const custom = computed<Component | undefined>(() => props.widgets?.[widget.value])
const label = computed(() => fieldLabel(props.name, props.schema, props.ui, locale.value))
const help = computed(() => fieldHelp(props.schema, props.ui, locale.value))
const placeholder = computed(() => {
  const p = uiGet(props.ui, 'placeholder') ?? props.schema.examples?.[0]
  return p === undefined ? '' : localizedText(p, locale.value)
})
const options = computed(() => enumOptions(props.schema, props.ui, locale.value) || [])
const uiOptions = computed<Record<string, any>>(() => uiGet(props.ui, 'options') || {})
const error = computed(() => props.errors[props.path])
const readOnly = computed(() => props.disabled || props.schema.readOnly === true || uiGet(props.ui, 'readonly') === true)

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

// ---------------------------------------------------------------- secret
const reveal = ref(false)
const secretExisting = computed(() => props.modelValue === SECRET_MASK)
function onSecret(e: Event) {
  const v = (e.target as HTMLInputElement).value
  set(v === '' && secretExisting.value ? SECRET_MASK : v)
}

// ---------------------------------------------------------------- number
function onNumber(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '') return set(undefined)
  const n = Number(raw)
  set(Number.isFinite(n) ? n : raw)
}

// ---------------------------------------------------------------- select
function onSelect(e: Event) {
  const idx = Number((e.target as HTMLSelectElement).value)
  set(idx < 0 ? undefined : options.value[idx]?.value)
}
const selectedIndex = computed(() => options.value.findIndex((o) => o.value === props.modelValue))

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
function addItem() {
  const cur = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  cur.push(fillDefaults(itemSchema.value, schemaType(itemSchema.value) === 'object' ? {} : undefined))
  set(cur)
}
function setItem(i: number, v: any) {
  const cur = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  cur[i] = v
  set(cur)
}
function removeItem(i: number) {
  const cur = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  cur.splice(i, 1)
  set(cur)
}

// ---------------------------------------------------------------- json fallback
const jsonText = ref(props.modelValue === undefined ? '' : JSON.stringify(props.modelValue, null, 2))
const jsonError = ref('')
function onJSON(e: Event) {
  jsonText.value = (e.target as HTMLTextAreaElement).value
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

const presets = computed<string[]>(() => uiOptions.value.presets || props.schema.examples || [])
const listId = `s2a-presets-${Math.random().toString(36).slice(2)}`

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
// A locked base URL (CONTRACTS §21.3) shows only "set by an administrator";
// the plugin's own help text would contradict it.
const restrictedHint = computed(() => (widget.value === 'url-presets' && readOnly.value ? t('ui.schema.setByAdmin') : ''))
const fieldHint = computed(() => restrictedHint.value || help.value)
</script>

<template>
  <!-- host-provided widget (console pickers, plugin custom controls) -->
  <SField v-if="custom" :label="bare ? undefined : label" :hint="fieldHint" :error="error" :required="required">
    <component
      :is="custom"
      :model-value="modelValue"
      :schema="schema"
      :ui="ui"
      :multiple="schemaType(schema) === 'array'"
      :disabled="readOnly"
      @update:model-value="set"
    />
  </SField>

  <!-- object: nested fields -->
  <fieldset v-else-if="widget === 'object'" :class="bare ? 'space-y-4' : 'space-y-4 rounded-xl border border-gray-200 p-4 dark:border-dark-700'">
    <legend v-if="!bare" class="px-1 text-sm font-medium text-gray-700 dark:text-gray-300">{{ label }}</legend>
    <p v-if="!bare && help" class="input-hint !mt-0">{{ help }}</p>
    <template v-for="g in keyGroups" :key="g.id">
      <div v-if="g.section && g.keys.some(childVisible)" class="border-t border-gray-100 pt-4 dark:border-dark-700" data-testid="schema-section">
        <button
          v-if="g.section.collapsed"
          type="button"
          class="flex w-full items-start justify-between gap-3 text-left"
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

  <!-- switch: inline label -->
  <div v-else-if="widget === 'switch'">
    <SSwitch :model-value="!!modelValue" :disabled="readOnly" :label="label" @update:model-value="set" />
    <p v-if="error" class="input-error-text">{{ error }}</p>
    <p v-else-if="help" class="input-hint">{{ help }}</p>
  </div>

  <SField v-else :label="bare ? undefined : label" :hint="fieldHint" :error="error || jsonError" :required="required">
    <!-- secret -->
    <div v-if="widget === 'secret'" class="relative">
      <input
        :type="reveal ? 'text' : 'password'"
        class="input pr-10"
        :class="error ? 'input-error' : ''"
        :value="secretExisting ? '' : modelValue ?? ''"
        :placeholder="secretExisting ? SECRET_MASK : placeholder"
        :disabled="readOnly"
        autocomplete="new-password"
        @input="onSecret"
      />
      <button type="button" class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600" @click="reveal = !reveal">
        <SIcon :name="reveal ? 'eye-off' : 'eye'" class="h-4 w-4" />
      </button>
      <p v-if="secretExisting" class="input-hint">{{ t('ui.schema.secretKeep') }}</p>
    </div>

    <textarea
      v-else-if="widget === 'textarea'"
      class="input font-mono"
      :class="error ? 'input-error' : ''"
      :rows="uiOptions.rows || 4"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="readOnly"
      @input="set(($event.target as HTMLTextAreaElement).value)"
    />

    <select v-else-if="widget === 'select'" class="input" :class="error ? 'input-error' : ''" :value="selectedIndex" :disabled="readOnly" @change="onSelect">
      <option :value="-1">{{ placeholder || '—' }}</option>
      <option v-for="(o, i) in options" :key="i" :value="i">{{ o.label }}</option>
    </select>

    <input
      v-else-if="widget === 'number'"
      type="number"
      class="input"
      :class="error ? 'input-error' : ''"
      :value="modelValue ?? ''"
      :min="schema.minimum"
      :max="schema.maximum"
      :step="schemaType(schema) === 'integer' ? 1 : 'any'"
      :placeholder="placeholder"
      :disabled="readOnly"
      @input="onNumber"
    />

    <!-- url-presets restricted to schema.enum: choose only (CONTRACTS §21.3) -->
    <select
      v-else-if="widget === 'url-presets' && urlEnum"
      class="input"
      :class="error ? 'input-error' : ''"
      :value="modelValue ?? ''"
      :disabled="readOnly"
      data-testid="url-enum"
      @change="set(($event.target as HTMLSelectElement).value || undefined)"
    >
      <option v-if="!urlEnumOptions.includes(String(modelValue ?? ''))" value="">{{ placeholder || '—' }}</option>
      <option v-for="p in urlEnumOptions" :key="p" :value="p">{{ p }}</option>
    </select>

    <div v-else-if="widget === 'url-presets'" class="flex gap-2">
      <input
        type="url"
        class="input flex-1"
        :class="error ? 'input-error' : ''"
        :value="modelValue ?? ''"
        :placeholder="placeholder || presets[0]"
        :list="listId"
        :disabled="readOnly"
        @input="set(($event.target as HTMLInputElement).value || undefined)"
      />
      <datalist :id="listId">
        <option v-for="p in presets" :key="p" :value="p" />
      </datalist>
      <select v-if="presets.length" class="input !w-auto" :disabled="readOnly" @change="set(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''">
        <option value="">{{ t('ui.schema.presets') }}</option>
        <option v-for="p in presets" :key="p" :value="p">{{ p }}</option>
      </select>
    </div>

    <SKeyValue
      v-else-if="widget === 'key-value'"
      :model-value="modelValue"
      :disabled="readOnly"
      @update:model-value="set"
    />

    <SKeyValue
      v-else-if="widget === 'model-mapping'"
      :model-value="modelValue"
      :key-label="t('ui.schema.mappingFrom')"
      :value-label="t('ui.schema.mappingTo')"
      key-placeholder="claude-sonnet-4-5"
      value-placeholder="claude-sonnet-4-5-20250929"
      :disabled="readOnly"
      @update:model-value="set"
    />

    <STagInput v-else-if="widget === 'tags'" :model-value="modelValue" :placeholder="placeholder || undefined" :disabled="readOnly" @update:model-value="set" />

    <div v-else-if="widget === 'multi-select'" class="flex flex-wrap gap-x-4 gap-y-2 pt-1">
      <label v-for="o in multiOptions" :key="String(o.value)" class="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="checkbox"
          :checked="Array.isArray(modelValue) && modelValue.includes(o.value)"
          :disabled="readOnly"
          @change="toggleMulti(o.value, ($event.target as HTMLInputElement).checked)"
        />
        {{ o.label }}
      </label>
    </div>

    <div v-else-if="widget === 'object-list'" class="space-y-3">
      <div v-for="(item, i) in (modelValue || [])" :key="i" class="relative rounded-xl border border-gray-200 p-3 pr-10 dark:border-dark-700">
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
        <button v-if="!readOnly" type="button" class="btn btn-ghost btn-sm absolute right-1 top-1" @click="removeItem(Number(i))">×</button>
      </div>
      <button v-if="!readOnly" type="button" class="btn btn-secondary btn-sm" @click="addItem">+ {{ t('ui.add') }}</button>
    </div>

    <textarea v-else-if="widget === 'json'" class="input font-mono text-xs" rows="5" :value="jsonText" :disabled="readOnly" @input="onJSON" />

    <input
      v-else
      :type="schema.format === 'email' ? 'email' : schema.format === 'uri' || schema.format === 'url' ? 'url' : 'text'"
      class="input"
      :class="error ? 'input-error' : ''"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="readOnly"
      :maxlength="schema.maxLength"
      @input="set(($event.target as HTMLInputElement).value)"
    />
  </SField>
</template>
