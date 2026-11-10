import { childUI, orderedKeys, uiGet, type JSONSchema, type UISchema } from '@sub2api/ui'

// The settings tab as a whole settings page (CONTRACTS §72.15, §75.5): the
// fields of forms/settings.schema.json in the order and ui:section groups of
// forms/settings.ui.json, without the hidden ones (the converted 0.1 fields
// and the keys retired in 0.8.0, kept in the schema so the core still
// validates and masks them). The values of the keys this page does not edit
// go back as stored (settingsMerge.ts).
//
// Two keys of 0.8.0 replace a retired one that the plugin still reads until
// the new key is stored (settings.go DecodeSettings); the page shows what
// the plugin reads and only ever writes the new key:
//   allowlist_user_ids  ← exempt_user_ids
//   verdict_cache_days  ← cache_ttl_seconds (0 = cache off, else whole days, rounded up, 1–30)

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

export const ALLOWLIST_KEY = 'allowlist_user_ids'
export const CACHE_DAYS_KEY = 'verdict_cache_days'
const RETIRED_ALLOWLIST = 'exempt_user_ids'
const RETIRED_CACHE_TTL = 'cache_ttl_seconds'
const DAY_SECONDS = 86400
const CACHE_DAYS_MAX = 30

/** The stored settings turn the verdict cache off: only the retired cache_ttl_seconds = 0 does, until verdict_cache_days is saved. */
export const verdictCacheOff = (stored: Record<string, unknown>) => stored[CACHE_DAYS_KEY] === undefined && stored[RETIRED_CACHE_TTL] === 0

/** What the plugin reads for a key never stored whose retired key is: undefined = nothing (the schema default applies). */
function retiredValue(stored: Record<string, unknown>, k: string): unknown {
  if (k === ALLOWLIST_KEY) return stored[RETIRED_ALLOWLIST]
  const ttl = stored[RETIRED_CACHE_TTL]
  if (k !== CACHE_DAYS_KEY || typeof ttl !== 'number' || !(ttl > 0)) return undefined
  return Math.min(CACHE_DAYS_MAX, Math.max(1, Math.ceil(ttl / DAY_SECONDS)))
}

/**
 * The value a schema widget shows for each key: the stored one, else what
 * its retired key gives, else the schema default. The cache days stay empty
 * while the retired key keeps the cache off (the default would look like
 * a running cache).
 */
export function displayValues(schema: JSONSchema | null | undefined, stored: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    const v = stored[k] !== undefined ? stored[k] : retiredValue(stored, k)
    out[k] = clone(v !== undefined || (k === CACHE_DAYS_KEY && verdictCacheOff(stored)) ? v : schema?.properties?.[k]?.default)
  }
  return out
}

/** A widget value as sent: null, and a blank in a field that is not a string (a cleared number), are undefined, so the default applies. */
export function sentValue(schema: JSONSchema | undefined, v: unknown): unknown {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'string' && v.trim() === '' && schema?.type !== 'string') return undefined
  return v
}

/**
 * sentValue of a key of the page. An allowlist emptied while the retired
 * exempt_user_ids still holds users is sent as [], not removed: without the
 * key the plugin would read the retired list again.
 */
export function sentSetting(schema: JSONSchema | undefined, stored: Record<string, unknown>, k: string, v: unknown): unknown {
  const sent = sentValue(schema, v)
  const retired = stored[RETIRED_ALLOWLIST]
  return sent === undefined && k === ALLOWLIST_KEY && Array.isArray(retired) && retired.length ? [] : sent
}

/** The settings key of an API field path: "values.<key>[.<path>]", "values/<key>/…" or "<key>". */
export const settingsKey = (path: string) =>
  path
    .replace(/^values(?=[./]|$)/, '')
    .replace(/^[./]/, '')
    .replace(/\//g, '.')
    .split(/[.[]/)[0]
