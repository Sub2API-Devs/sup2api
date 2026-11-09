import { h, type Component, type FunctionalComponent } from 'vue'
import GroupPicker from '@/components/GroupPicker.vue'
import { hostComponents } from '@/components/plugin/hostComponents'

/** SchemaForm's props of every widget that the core editors do not take. */
const SCHEMA_PROPS = new Set(['schema', 'ui', 'multiple'])

/** A component as a widget: the SchemaForm-only props are not passed on. */
function widget(component: Component): FunctionalComponent {
  const w: FunctionalComponent = (_, { attrs }) => h(component, Object.fromEntries(Object.entries(attrs).filter(([k]) => !SCHEMA_PROPS.has(k))))
  w.inheritAttrs = false
  return w
}

/**
 * Console widgets for `@sub2api/ui`'s SchemaForm (`ui:widget` name ->
 * component): account credential schemas and plugin settings may reference
 * `proxy-select` / `group-select`, which need the console lookups; the
 * `upstream` field of a custom upstream type uses `upstream-editor`, which
 * reads the account type from the account editor (ACCOUNT_FORM_KEY). The
 * core account editors (docs/COMMON-CONTROLS.md §3) store the account API's
 * format, which is what the core executes.
 *   <SchemaForm :widgets="schemaWidgets" ... />
 */
export const schemaWidgets: Record<string, Component> = {
  'proxy-select': hostComponents.ProxyPicker,
  'group-select': GroupPicker,
  'upstream-editor': hostComponents.UpstreamEditor,
  'param-override': widget(hostComponents.ParamOverrideEditor),
  'header-passthrough': widget(hostComponents.HeaderPassthroughEditor),
  'rate-limits': widget(hostComponents.RateLimitEditor),
  'model-limits': widget(hostComponents.ModelLimitsEditor),
  'model-mapping': widget(hostComponents.ModelMappingEditor)
}
