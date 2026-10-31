import { childUI, orderedKeys, uiGet, type JSONSchema, type UISchema } from '@sub2api/ui'

// The settings tab as a whole settings page (CONTRACTS §72.15, §75.5): the
// fields of forms/settings.schema.json in the order and ui:section groups of
// forms/settings.ui.json, without the hidden ones (the converted 0.1 fields,
// kept in the schema so the core still validates and masks them). The values
// of the keys this page does not edit go back as stored (settingsMerge.ts).

/** Keys with their own editor on the settings tab instead of the schema widget. */
export const CUSTOM_KEYS = ['analysis_channel_id', 'notify_webhook_url', 'notify_webhook_secret', 'jev_default_set'] as const
/** The stored 0.1 API key: hidden, but the page offers to clear it (a kept credential makes moderation:manage re-enter it, §75.1). */
export const LEGACY_KEY = 'api_key'

/** A ui:section group of visible fields; title / description are LocalizedText. */
export interface SettingSection {
  id: string
  title: unknown
  description: unknown
  collapsed: boolean
  keys: string[]
}

export const isHidden = (ui: UISchema | null | undefined, key: string) => uiGet(childUI(ui || undefined, key), 'widget') === 'hidden'

/**
 * The visible fields grouped by ui:section, in ui:order. Fields before the
 * first section form an untitled group (id ""); groups without a visible
 * field are left out.
 */
export function settingSections(schema: JSONSchema | null | undefined, ui: UISchema | null | undefined): SettingSection[] {
  if (!schema?.properties) return []
  const out: SettingSection[] = []
  let cur: SettingSection = { id: '', title: '', description: '', collapsed: false, keys: [] }
  for (const k of orderedKeys(schema, ui || undefined)) {
    const s = childUI(ui || undefined, k)?.['ui:section']
    if (s) {
      out.push(cur)
      const obj = typeof s === 'object' && !Array.isArray(s) && 'title' in s
      cur = { id: k, title: obj ? s.title : s, description: obj ? s.description || '' : '', collapsed: obj && s.collapsed === true, keys: [] }
    }
    if (!isHidden(ui, k)) cur.keys.push(k)
  }
  out.push(cur)
  return out.filter((g) => g.keys.length)
}

/** The keys this page edits: every visible field, and the 0.1 API key while one is stored (to clear it). */
export function editableKeys(sections: SettingSection[], stored: Record<string, unknown>): string[] {
  const keys = sections.flatMap((g) => g.keys)
  return stored[LEGACY_KEY] ? [...keys, LEGACY_KEY] : keys
}

/** The keys rendered by the schema widgets (editable keys without a custom editor). */
export const schemaKeys = (keys: readonly string[]) => keys.filter((k) => k !== LEGACY_KEY && !(CUSTOM_KEYS as readonly string[]).includes(k))

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

/** The value a schema widget shows for each key: the stored one, else the schema default. */
export function displayValues(schema: JSONSchema | null | undefined, stored: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of keys) out[k] = clone(stored[k] !== undefined ? stored[k] : schema?.properties?.[k]?.default)
  return out
}

/** A widget value as sent: null, and a blank in a field that is not a string (a cleared number), are undefined, so the default applies. */
export function sentValue(schema: JSONSchema | undefined, v: unknown): unknown {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'string' && v.trim() === '' && schema?.type !== 'string') return undefined
  return v
}

/** The settings key of an API field path: "values.<key>[.<path>]", "values/<key>/…" or "<key>". */
export const settingsKey = (path: string) =>
  path
    .replace(/^values(?=[./]|$)/, '')
    .replace(/^[./]/, '')
    .replace(/\//g, '.')
    .split(/[.[]/)[0]
