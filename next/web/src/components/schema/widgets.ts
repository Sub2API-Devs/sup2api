import type { Component } from 'vue'
import GroupPicker from '@/components/GroupPicker.vue'
import ProxyPicker from '@/components/ProxyPicker.vue'

/**
 * Console widgets for `@sub2api/ui`'s SchemaForm (`ui:widget` name ->
 * component): account credential schemas and plugin settings may reference
 * `proxy-select` / `group-select`, which need the console lookups.
 *   <SchemaForm :widgets="schemaWidgets" ... />
 */
export const schemaWidgets: Record<string, Component> = {
  'proxy-select': ProxyPicker,
  'group-select': GroupPicker
}
