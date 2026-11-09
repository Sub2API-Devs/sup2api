import type { Component } from 'vue'
import GroupPicker from '@/components/GroupPicker.vue'
import ProxyPicker from '@/components/ProxyPicker.vue'
import UpstreamEditor from '@/views/accounts/upstream/UpstreamEditor.vue'

/**
 * Console widgets for `@sub2api/ui`'s SchemaForm (`ui:widget` name ->
 * component): account credential schemas and plugin settings may reference
 * `proxy-select` / `group-select`, which need the console lookups; the
 * `upstream` field of a custom upstream type uses `upstream-editor`, which
 * reads the account type from the account editor (ACCOUNT_FORM_KEY).
 *   <SchemaForm :widgets="schemaWidgets" ... />
 */
export const schemaWidgets: Record<string, Component> = {
  'proxy-select': ProxyPicker,
  'group-select': GroupPicker,
  'upstream-editor': UpstreamEditor
}
