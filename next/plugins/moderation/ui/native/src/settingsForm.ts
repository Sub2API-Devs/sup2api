import { childUI, orderedKeys, uiGet, type JSONSchema, type UISchema } from '@sub2api/ui'

// The settings tab as a whole settings page (CONTRACTS §72.15, §75.5): the
// fields of forms/settings.schema.json in the order and ui:section groups of
// forms/settings.ui.json, without the hidden ones (the 0.1 API key). The
// values of the keys this page does not edit go back as stored
// (settingsMerge.ts).
//
// The plugin cannot rewrite its stored settings, so the page brings them to
// the current schema (currentSettings) before it shows or saves them: a key
// the schema no longer declares is dropped (the core refuses it), and the
// value of a retired key is folded into the key that replaced it while that
// was never stored (RETIRED).

/** Keys with their own editor on the settings tab instead of the schema widget. */
export const CUSTOM_KEYS = ['notify_webhook_url', 'notify_webhook_secret', 'jev_default_set'] as const
/** The stored 0.1 API key: hidden, but the page offers to clear it (a kept credential makes moderation:manage re-enter it, §75.1). */
export const LEGACY_KEY = 'api_key'

/** A ui:section group of visible fields; title / description are LocalizedText; page = the settings page showing it (nav.ts). */
export interface SettingSection {
  id: string
  page: string
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
  let cur: SettingSection = { id: '', page: '', title: '', description: '', collapsed: false, keys: [] }
  for (const k of orderedKeys(schema, ui || undefined)) {
    const s = childUI(ui || undefined, k)?.['ui:section']
    if (s) {
      out.push(cur)
      const obj = typeof s === 'object' && !Array.isArray(s) && 'title' in s
      cur = { id: k, page: obj ? String(s.page || '') : '', title: obj ? s.title : s, description: obj ? s.description || '' : '', collapsed: obj && s.collapsed === true, keys: [] }
    }
    if (!isHidden(ui, k)) cur.keys.push(k)
  }
  out.push(cur)
  return out.filter((g) => g.keys.length)
}

/** The page that offers to clear a stored 0.1 API key. */
export const LEGACY_KEY_PAGE = 'policy'

/** The sections of one settings page. */
export const sectionsOf = (sections: SettingSection[], page: string) => sections.filter((g) => g.page === page)

/** The keys a page edits: its visible fields, and on LEGACY_KEY_PAGE the 0.1 API key while one is stored (to clear it). */
export function editableKeys(sections: SettingSection[], stored: Record<string, unknown>, page: string): string[] {
  const keys = sections.flatMap((g) => g.keys)
  return stored[LEGACY_KEY] && page === LEGACY_KEY_PAGE ? [...keys, LEGACY_KEY] : keys
}

/** The keys rendered by the schema widgets (editable keys without a custom editor). */
export const schemaKeys = (keys: readonly string[]) => keys.filter((k) => k !== LEGACY_KEY && !(CUSTOM_KEYS as readonly string[]).includes(k))

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

export const CACHE_DAYS_KEY = 'verdict_cache_days'
const DAY_SECONDS = 86400
const CACHE_DAYS_MAX = 30
const HOUR_SECONDS = 3600

/** A finite number through f, else undefined (nothing to fold). */
const numberTo = (f: (n: number) => number) => (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? f(v) : undefined)

/** Retired keys and the key that replaced each, with the conversion of a stored value. */
export const RETIRED: Readonly<Record<string, { key: string; convert: (v: unknown) => unknown }>> = {
  // 0 = cache off, else whole days, rounded up, 1–30
  cache_ttl_seconds: { key: CACHE_DAYS_KEY, convert: numberTo((s) => (s > 0 ? Math.min(CACHE_DAYS_MAX, Math.ceil(s / DAY_SECONDS)) : 0)) },
  ban_window_hours: { key: 'ban_window_seconds', convert: numberTo((h) => h * HOUR_SECONDS) }
}

/**
 * The stored settings as the current schema reads them: each retired value
 * folded into its new key when that was never stored, then every key the
 * schema does not declare dropped. Without a schema they are kept as stored.
 */
export function currentSettings(schema: JSONSchema | null | undefined, stored: Record<string, unknown>): Record<string, unknown> {
  const declared = schema?.properties
  if (!declared) return stored
  const out: Record<string, unknown> = { ...stored }
  for (const [old, r] of Object.entries(RETIRED)) {
    const v = out[r.key] === undefined ? r.convert(stored[old]) : undefined
    if (v !== undefined) out[r.key] = v
  }
  for (const k of Object.keys(out)) if (!(k in declared)) delete out[k]
  return out
}

/** The value a schema widget shows for each key: the stored one (currentSettings), else the schema default. */
export function displayValues(schema: JSONSchema | null | undefined, stored: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((k) => [k, clone(stored[k] !== undefined ? stored[k] : schema?.properties?.[k]?.default)]))
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
