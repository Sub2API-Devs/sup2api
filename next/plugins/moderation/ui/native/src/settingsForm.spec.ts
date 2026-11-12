import { describe, expect, it } from 'vitest'
import schema from '../../../forms/settings.schema.json'
import ui from '../../../forms/settings.ui.json'
import { currentSettings, CUSTOM_KEYS, displayValues, editableKeys, HIT_DAYS, LEGACY_KEY, RETIRED, schemaKeys, sectionsOf, sentValue, settingSections, settingsKey } from './settingsForm'
import { NAV_GROUPS } from './nav'
import { mergeSettings, type PageValues } from './settingsMerge'

const MASK = '******'
/** The stored 0.1 API key: in the schema (the core masks it), never on the page. */
const LEGACY = [LEGACY_KEY]
/** Keys removed from the schema (0.11.0) that settings stored before may still hold. */
const REMOVED = ['allowlist_user_ids', 'blocklist_user_ids', 'exempt_user_ids', 'base_url', 'model', 'categories', 'group_ids', 'retention_days', 'on_error', 'analysis_channel_id', 'cache_ttl_seconds', 'ban_window_hours']

const sections = settingSections(schema, ui)
const zh = (v: unknown) => (v as { zh: string }).zh

describe('settingSections', () => {
  it('groups every field but the 0.1 API key by ui:section, in ui:order', () => {
    expect(sections.map((g) => `${g.page}/${zh(g.title)}`)).toEqual([
      'policy/执行方式',
      'cache/判定缓存与重放',
      'cache/送审输入上限',
      'lists/自动观察与封禁',
      'jev/Jev 默认题集',
      'response/拦截响应',
      'records/记录内容',
      'records/保留期',
      'advanced/性能',
      'advanced/告警与通知'
    ])
    const shown = sections.flatMap((g) => g.keys)
    expect(shown).toEqual(ui['ui:order'].filter((k) => !LEGACY.includes(k)))
    expect(new Set(shown).size).toBe(shown.length)
    expect(Object.keys(schema.properties).filter((k) => !shown.includes(k)).sort()).toEqual([...LEGACY].sort())
    expect(sections.filter((g) => g.collapsed).map((g) => g.id)).toEqual([])
  })

  it('puts every section on a settings page of the sidebar, and every such page has a section', () => {
    const pages = NAV_GROUPS.flatMap((g) => g.items.filter((i) => i.access === 'settings').map((i) => i.key as string))
    expect([...new Set(sections.map((g) => g.page))].sort()).toEqual([...pages].sort())
    for (const p of pages) expect(sectionsOf(sections, p).length).toBeGreaterThan(0)
  })

  it('shows the 0.8.0 settings where the design puts them', () => {
    expect(sections[0].keys).toEqual(['mode', 'fail_policy'])
    expect(sectionsOf(sections, 'lists')[0].keys[0]).toBe('auto_watch')
    const shown = sections.flatMap((g) => g.keys)
    expect(shown[shown.indexOf('store_text') + 1]).toBe('record_pass_input_message')
    expect(sections.find((g) => g.keys.includes('verdict_cache_days'))?.keys).toContain('cache_entries')
    // the ban window in seconds, with the duration widget like the escalation window
    expect(sectionsOf(sections, 'lists').flatMap((g) => g.keys)).toContain('ban_window_seconds')
    expect((ui as Record<string, any>).ban_window_seconds['ui:widget']).toBe('duration')
  })

  it('declares the new key of each retired one, and no longer the removed keys', () => {
    for (const [old, r] of Object.entries(RETIRED)) {
      expect(schema.properties).not.toHaveProperty(old)
      expect(schema.properties).toHaveProperty(r.key)
    }
    for (const k of REMOVED) expect(schema.properties).not.toHaveProperty(k)
  })

  it('keeps api_key a secret of the schema, so the core masks it', () => {
    expect(schema.properties.api_key.writeOnly).toBe(true)
  })

  it('leaves out fields before any section only when hidden, and groups without visible fields', () => {
    const s = { properties: { a: {}, b: {}, c: {} } }
    expect(settingSections(s, { 'ui:order': ['a', 'b', 'c'], b: { 'ui:section': 'B' }, c: { 'ui:widget': 'hidden' } })).toEqual([
      { id: '', page: '', title: '', description: '', collapsed: false, keys: ['a'] },
      { id: 'b', page: '', title: 'B', description: '', collapsed: false, keys: ['b'] }
    ])
    expect(settingSections(s, { a: { 'ui:widget': 'hidden' }, b: { 'ui:widget': 'hidden' }, c: { 'ui:section': { title: 'C', collapsed: true }, 'ui:widget': 'hidden' } })).toEqual([])
    expect(settingSections(null, ui)).toEqual([])
  })
})

describe('schemaKeys', () => {
  it('leaves the keys with a custom editor to it', () => {
    const widgets = schemaKeys(editableKeys(sections))
    for (const k of CUSTOM_KEYS) expect(widgets).not.toContain(k)
    expect(widgets).toContain('mode')
  })
})

describe('currentSettings', () => {
  it('drops every key the schema does not declare, and keeps the declared ones', () => {
    const stored = { mode: 'enforce', notify_webhook_secret: MASK, allowlist_user_ids: ['7'], exempt_user_ids: ['7'], base_url: 'https://old.example', analysis_channel_id: 5 }
    expect(currentSettings(schema, stored)).toEqual({ mode: 'enforce', notify_webhook_secret: MASK })
    expect(currentSettings(null, stored)).toBe(stored)
  })

  it('drops the 0.1 API key, masked or not, though the schema declares it', () => {
    for (const v of [MASK, 'sk-old']) expect(currentSettings(schema, { mode: 'enforce', [LEGACY_KEY]: v })).toEqual({ mode: 'enforce' })
  })

  it('folds cache_ttl_seconds into the cache days never stored: 0 = off, else whole days rounded up, at most 7', () => {
    const days = (ttl: unknown, s: Record<string, unknown> = {}) => currentSettings(schema, { ...s, cache_ttl_seconds: ttl }).verdict_cache_days
    expect(days(0)).toBe(0)
    expect(days(600)).toBe(1)
    expect(days(86400)).toBe(1)
    expect(days(86401)).toBe(2)
    expect(days(604800)).toBe(7)
    expect(days(604801)).toBe(7)
    expect(days(86400 * 90)).toBe(7)
    expect(days(600, { verdict_cache_days: 14 })).toBe(14)
    expect(days('x')).toBeUndefined()
  })

  it('folds ban_window_hours into ban_window_seconds never stored', () => {
    expect(currentSettings(schema, { ban_window_hours: 12 })).toEqual({ ban_window_seconds: 43200 })
    expect(currentSettings(schema, { ban_window_hours: 12, ban_window_seconds: 600 })).toEqual({ ban_window_seconds: 600 })
  })

  it('folds retention_days into hit_retention_days never stored: never below its default, at most its maximum', () => {
    const hit = schema.properties.hit_retention_days
    expect(HIT_DAYS).toEqual({ default: hit.default, max: hit.maximum })
    const days = (v: unknown, s: Record<string, unknown> = {}) => currentSettings(schema, { ...s, retention_days: v }).hit_retention_days
    expect(days(30)).toBe(180)
    expect(days(400)).toBe(400)
    expect(days(9999)).toBe(3650)
    expect(days(400, { hit_retention_days: 20 })).toBe(20)
    expect(days('x')).toBeUndefined()
  })

  it('leaves settings already current as they are', () => {
    const s = { mode: 'observe', verdict_cache_days: 3, ban_window_seconds: 7200 }
    expect(currentSettings(schema, s)).toEqual(s)
  })
})

describe('the save of the settings tab', () => {
  // What the page sends for a key: the widget value, or the mask of a kept secret.
  const page = (stored: Record<string, unknown>, form: Record<string, unknown>): PageValues => {
    const out: PageValues = {}
    for (const k of schemaKeys(editableKeys(sections))) out[k] = sentValue((schema.properties as Record<string, any>)[k], form[k])
    out.notify_webhook_url = stored.notify_webhook_url === MASK ? MASK : undefined
    out.notify_webhook_secret = stored.notify_webhook_secret === MASK ? MASK : undefined
    out.jev_default_set = (stored.jev_default_set as unknown) ?? null
    return out
  }
  /** Settings stored by an older version: current keys, retired keys and removed ones. */
  const raw = {
    mode: 'observe',
    watch_days: 14,
    notify_webhook_url: MASK,
    notify_webhook_secret: MASK,
    api_key: MASK,
    base_url: 'https://old.example',
    categories: [{ id: 'illegal', description: 'x' }],
    blocklist_user_ids: ['8'],
    analysis_every_violations: 30,
    cache_ttl_seconds: 3600,
    ban_window_hours: 12,
    retention_days: 400
  }
  // the page loads, and saves over, the stored values brought to the current schema
  const stored = currentSettings(schema, raw)
  const keys = editableKeys(sections)
  const form = displayValues(schema, stored, schemaKeys(keys))
  const initial = page(stored, form)
  const save = (edit: Record<string, unknown>) => mergeSettings(keys, stored, stored, initial, page(stored, { ...form, ...edit }))
  const RETIRED_KEYS = Object.keys(RETIRED)

  it('shows the folded values of the retired keys, and schema defaults for keys never stored', () => {
    expect(form.verdict_cache_days).toBe(1)
    expect(form.ban_window_seconds).toBe(43200)
    expect(form.hit_retention_days).toBe(400)
    expect(form.block_status).toBe(403)
    expect(form.auto_watch).toBe(true)
  })

  it('saves the settings brought to the current schema even when nothing was edited', () => {
    const m = save({})
    expect(m.changed).toEqual([])
    expect(m.values).toEqual({ mode: 'observe', watch_days: 14, notify_webhook_url: MASK, notify_webhook_secret: MASK, verdict_cache_days: 1, ban_window_seconds: 43200, hit_retention_days: 400 })
    // differs from what is stored, so the page PUTs it (SettingsTab save)
    expect(JSON.stringify(m.values)).not.toBe(JSON.stringify(raw))
  })

  it('writes the changed keys, leaving every retired and removed key absent', () => {
    const m = save({ mode: 'enforce', verdict_cache_days: 3 })
    expect(m.changed.sort()).toEqual(['mode', 'verdict_cache_days'])
    expect(m.values).toEqual({ ...stored, mode: 'enforce', verdict_cache_days: 3 })
    for (const k of [...RETIRED_KEYS, ...REMOVED, LEGACY_KEY]) expect(m.values).not.toHaveProperty(k)
  })

  it('removes cleared cache days: the retired key is gone, so the schema default applies', () => {
    const m = save({ verdict_cache_days: '' })
    expect(m.changed).toEqual(['verdict_cache_days'])
    expect(m.values).not.toHaveProperty('verdict_cache_days')
    expect(m.values).not.toHaveProperty('cache_ttl_seconds')
  })

  it('shows a cache turned off by the retired key as 0 days', () => {
    expect(displayValues(schema, currentSettings(schema, { cache_ttl_seconds: 0 }), ['verdict_cache_days'])).toEqual({ verdict_cache_days: 0 })
  })

  it('removes a number left empty, so its default applies', () => {
    const m = save({ watch_days: undefined })
    expect(m.changed).toEqual(['watch_days'])
    expect(m.values).not.toHaveProperty('watch_days')
    expect(sentValue({ type: 'integer' }, '')).toBeUndefined()
    expect(sentValue({ type: 'string' }, '')).toBe('')
  })
})

describe('settingsKey', () => {
  it('maps API field paths to the settings key', () => {
    expect(settingsKey('values/jev_default_set/items/3')).toBe('jev_default_set')
    expect(settingsKey('values.jev_default_set.items[0].question')).toBe('jev_default_set')
    expect(settingsKey('block_status')).toBe('block_status')
  })
})

describe('mergeSettings', () => {
  const KEYS = ['block_status', 'block_message', 'notify_webhook_secret', 'jev_default_set']
  const loaded = { block_status: 403, block_message: 'no', notify_webhook_secret: '******', jev_default_set: null, mode: 'observe' }
  const initial = { block_status: 403, block_message: 'no', notify_webhook_secret: '******', jev_default_set: null }

  it('writes only the keys this page changed, keeping later changes elsewhere', () => {
    const latest = { ...loaded, block_message: 'changed elsewhere', mode: 'enforce', other: 1 }
    const m = mergeSettings(KEYS, loaded, latest, initial, { ...initial, block_status: 451 })
    expect(m.changed).toEqual(['block_status'])
    expect(m.conflicts).toEqual([])
    expect(m.values).toEqual({ ...latest, block_status: 451 })
  })

  it('reports a key changed both here and elsewhere, and this page wins', () => {
    const latest = { ...loaded, block_status: 429 }
    const m = mergeSettings(KEYS, loaded, latest, initial, { ...initial, block_status: 451 })
    expect(m.conflicts).toEqual(['block_status'])
    expect(m.values.block_status).toBe(451)
  })

  it('removes a key emptied here (its default applies)', () => {
    const m = mergeSettings(KEYS, loaded, loaded, initial, { ...initial, block_message: undefined })
    expect(m.changed).toEqual(['block_message'])
    expect('block_message' in m.values).toBe(false)
  })

  it('keeps a stored secret (mask) and changes nothing when nothing was edited', () => {
    const m = mergeSettings(KEYS, loaded, loaded, initial, { ...initial })
    expect(m.changed).toEqual([])
    expect(m.values).toEqual(loaded)
  })

  it('compares structured values by content', () => {
    const set = { preamble: '', items: [{ category: 'a', threshold: 0.5 }] }
    const m = mergeSettings(KEYS, { ...loaded, jev_default_set: set }, { ...loaded, jev_default_set: set }, { ...initial, jev_default_set: set }, {
      ...initial,
      jev_default_set: { preamble: '', items: [{ category: 'a', threshold: 0.5 }] }
    })
    expect(m.changed).toEqual([])
  })
})
