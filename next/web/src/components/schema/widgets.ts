import { h, type Component, type FunctionalComponent } from 'vue'
import { schemaType, uiGet, type JSONSchema, type UISchema } from '@sub2api/ui'
import EntityInput from '@/components/EntityInput.vue'
import GroupPicker from '@/components/GroupPicker.vue'
import { ENTITIES, type EntityKind } from '@/components/entity/entities'
import { hostComponents } from '@/components/plugin/hostComponents'

/** SchemaForm's props of every widget that the core editors do not take. */
const SCHEMA_PROPS = new Set(['schema', 'ui', 'multiple'])

/** A component as a widget: the SchemaForm-only props are not passed on. */
function widget(component: Component): FunctionalComponent {
  const w: FunctionalComponent = (_, { attrs }) =>
    h(component, Object.fromEntries(Object.entries(attrs).filter(([k]) => !SCHEMA_PROPS.has(k))))
  w.inheritAttrs = false
  return w
}

const NUMBER_TYPES = new Set(['integer', 'number'])

/**
 * `entity-select`: picks the entity of `ui:options.kind` (ENTITIES) by name or
 * id. An array schema holds several ids, any other one; the ids are stored as
 * the schema types them (`items.type` of an array): numbers for integer /
 * number, else strings, and no entity as null or ''. `ui:options` may also
 * carry `mine` (only the caller's own) and `max` (of an array).
 */
const EntitySelect: FunctionalComponent = (_, { attrs }) => {
  const { schema, ui, ...field } = attrs as Omit<InstanceType<typeof EntityInput>['$props'], 'kind'> & { schema?: JSONSchema; ui?: UISchema }
  const options = uiGet<{ kind?: EntityKind; mine?: boolean; max?: number }>(ui, 'options') ?? {}
  // A schema that names no entity the console knows gets no control: the bare label shows the mistake.
  if (!options.kind || !(options.kind in ENTITIES)) return null
  const stored = field.multiple ? schema?.items : schema
  return h(EntityInput, { ...field, kind: options.kind, mine: options.mine, max: options.max, numeric: NUMBER_TYPES.has(schemaType(stored)) })
}
EntitySelect.inheritAttrs = false

/**
 * Console widgets for `@sub2api/ui`'s SchemaForm (`ui:widget` name ->
 * component): account credential schemas and plugin settings may reference
 * `proxy-select` / `group-select` and `entity-select` (UI 3.12), which need
 * the console's entity lookup; the `upstream` field of a custom upstream type
 * uses `upstream-editor`, which reads the account type from the account
 * editor (ACCOUNT_FORM_KEY). The core account editors
 * (docs/COMMON-CONTROLS.md §3) store the account API's
 * format, which is what the core executes.
 *   <SchemaForm :widgets="schemaWidgets" ... />
 */
export const schemaWidgets: Record<string, Component> = {
  'proxy-select': hostComponents.ProxyPicker,
  'group-select': GroupPicker,
  'entity-select': EntitySelect,
  'upstream-editor': hostComponents.UpstreamEditor,
  'param-override': widget(hostComponents.ParamOverrideEditor),
  'header-passthrough': widget(hostComponents.HeaderPassthroughEditor),
  'rate-limits': widget(hostComponents.RateLimitEditor),
  'model-limits': widget(hostComponents.ModelLimitsEditor),
  'model-mapping': widget(hostComponents.ModelMappingEditor)
}
