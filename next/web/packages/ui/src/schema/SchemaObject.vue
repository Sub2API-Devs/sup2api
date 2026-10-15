<script setup lang="ts">
// Object widget of SchemaField: its properties in ui:order, grouped by
// ui:section (the keys before the first section form an untitled group, then
// each section runs until the next one; collapsed sections open on click and
// by themselves while one of their fields holds a value or an error).
// Layouts: settings root (bare) = one SSettingsGroup per group; nested object
// in settings = a stacked row around a stacked sub-form; stacked = fieldset.
import { computed, ref } from 'vue'
import SSettingsGroup from '../SSettingsGroup.vue'
import SSettingRow from '../SSettingRow.vue'
import SDisclosure from '../SDisclosure.vue'
import { isBlank } from '../value'
import SchemaField from './SchemaField.vue'
import { childUI, fieldSection, isVisible, orderedKeys, uiGet, type FieldSection } from './schema'
import type { ControlContext } from './controls/context'

defineOptions({ name: 'SchemaObject' })
const props = defineProps<{ modelValue: any; ctx: ControlContext }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, unknown>): void }>()

interface KeyGroup {
  id: string
  section: FieldSection | null
  keys: string[]
}
const groups = computed<KeyGroup[]>(() => {
  const out: KeyGroup[] = []
  let cur: KeyGroup = { id: '', section: null, keys: [] }
  for (const k of orderedKeys(props.ctx.schema, props.ctx.ui)) {
    const section = fieldSection(childUI(props.ctx.ui, k), props.ctx.locale)
    if (section) {
      if (cur.keys.length) out.push(cur)
      cur = { id: k, section, keys: [] }
    }
    cur.keys.push(k)
  }
  if (cur.keys.length) out.push(cur)
  return out
})
function visible(k: string) {
  const ui = childUI(props.ctx.ui, k)
  return isVisible(ui, props.ctx.root) && uiGet(ui, 'widget') !== 'hidden'
}
/** Groups with at least one visible field, and those fields. */
const shown = computed(() => groups.value.map((g) => ({ ...g, keys: g.keys.filter(visible) })).filter((g) => g.keys.length))

const toggled = ref<Record<string, boolean>>({})
const childPath = (k: string) => (props.ctx.path ? `${props.ctx.path}.${k}` : k)
function groupOpen(g: KeyGroup): boolean {
  if (!g.section?.collapsed) return true
  if (toggled.value[g.id] !== undefined) return toggled.value[g.id]
  return g.keys.some((k) => {
    const p = childPath(k)
    return !isBlank(props.modelValue?.[k]) || Object.keys(props.ctx.errors).some((e) => e === p || e.startsWith(p + '.'))
  })
}
function setOpen(g: KeyGroup, open: boolean) {
  toggled.value = { ...toggled.value, [g.id]: open }
}

function setChild(k: string, v: unknown) {
  const next = { ...(props.modelValue || {}) }
  if (v === undefined) delete next[k]
  else next[k] = v
  emit('update:modelValue', next)
}
const required = computed<string[]>(() => props.ctx.schema.required || [])
const settings = computed(() => props.ctx.layout === 'settings')
function child(k: string) {
  const { schema, ui, root, errors, disabled, widgets } = props.ctx
  return {
    name: k,
    path: childPath(k),
    schema: schema.properties[k],
    ui: childUI(ui, k),
    modelValue: props.modelValue?.[k],
    root,
    errors,
    required: required.value.includes(k),
    disabled,
    widgets,
    layout: settings.value ? ('settings' as const) : ('stacked' as const)
  }
}
const nested = computed(() => ({ ...props.ctx, layout: 'stacked' as const, bare: true }))
</script>

<template>
  <div v-if="settings && ctx.bare" class="space-y-4">
    <SSettingsGroup
      v-for="g in shown"
      :key="g.id"
      :title="g.section?.title || undefined"
      :description="g.section?.description || undefined"
      :collapsible="!!g.section?.collapsed"
      :open="groupOpen(g)"
      data-testid="schema-section"
      @update:open="setOpen(g, $event)"
    >
      <SchemaField v-for="k in g.keys" :key="k" v-bind="child(k)" @update:model-value="setChild(k, $event)" />
    </SSettingsGroup>
  </div>

  <SSettingRow v-else-if="settings" :label="ctx.label" :description="ctx.help || undefined" stacked>
    <template v-if="ctx.details" #details>{{ ctx.details }}</template>
    <div class="w-full rounded-control border border-line p-4">
      <SchemaObject :model-value="modelValue" :ctx="nested" @update:model-value="emit('update:modelValue', $event)" />
    </div>
  </SSettingRow>

  <fieldset v-else :class="ctx.bare ? 'space-y-4' : 'space-y-4 rounded-xl border border-gray-200 p-4 dark:border-dark-700'">
    <legend v-if="!ctx.bare" class="px-1 text-sm font-medium text-gray-700 dark:text-gray-300">{{ ctx.label }}</legend>
    <p v-if="!ctx.bare && ctx.help" class="input-hint !mt-0">{{ ctx.help }}</p>
    <template v-for="g in shown" :key="g.id">
      <SDisclosure
        v-if="g.section?.collapsed"
        variant="section"
        class="border-t border-line pt-4"
        data-testid="schema-section"
        :label="g.section.title"
        :description="g.section.description || undefined"
        :open="groupOpen(g)"
        @update:open="setOpen(g, $event)"
      >
        <div class="space-y-4">
          <SchemaField v-for="k in g.keys" :key="k" v-bind="child(k)" @update:model-value="setChild(k, $event)" />
        </div>
      </SDisclosure>
      <template v-else>
        <div v-if="g.section" class="border-t border-line pt-4" data-testid="schema-section">
          <p class="text-sm font-semibold text-fg">{{ g.section.title }}</p>
          <p v-if="g.section.description" class="mt-0.5 text-xs text-fg-muted">{{ g.section.description }}</p>
        </div>
        <SchemaField v-for="k in g.keys" :key="k" v-bind="child(k)" @update:model-value="setChild(k, $event)" />
      </template>
    </template>
  </fieldset>
</template>
