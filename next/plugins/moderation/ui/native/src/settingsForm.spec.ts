import { describe, expect, it } from 'vitest'
import schema from '../../../forms/settings.schema.json'
import ui from '../../../forms/settings.ui.json'
import { CUSTOM_KEYS, displayValues, editableKeys, LEGACY_KEY, schemaKeys, sentSetting, sentValue, settingSections, settingsKey, verdictCacheOff, withRetiredCleared } from './settingsForm'
import { mergeSettings, type PageValues } from './settingsMerge'

const MASK = '******'
/** The converted 0.1 fields and the keys retired in 0.8.0: in the schema (the core validates and masks them), never on the page. */
const LEGACY = ['base_url', 'api_key', 'model', 'system_prompt', 'categories', 'tool_choice', 'max_turns', 'temperature', 'max_tokens', 'timeout_ms', 'on_error', 'sample_rate', 'group_ids', 'model_patterns', 'retention_days', 'exempt_user_ids', 'cache_ttl_seconds']

const sections = settingSections(schema, ui)
const zh = (v: unknown) => (v as { zh: string }).zh

describe('settingSections', () => {
  it('groups every field but the 0.1 and retired ones by ui:section, in ui:order', () => {
    expect(sections.map((g) => zh(g.title))).toEqual(['运行模式与用户名单', '拦截响应', '观察名单与封禁', 'AI 分析', '记录与保留', '性能与缓存', '输入范围', '告警与通知', 'Jev 默认题集'])
    const shown = sections.flatMap((g) => g.keys)
    expect(shown).toEqual(ui['ui:order'].filter((k) => !LEGACY.includes(k)))
    expect(new Set(shown).size).toBe(shown.length)
    expect(Object.keys(schema.properties).filter((k) => !shown.includes(k)).sort()).toEqual([...LEGACY].sort())
    expect(sections.filter((g) => g.collapsed).map((g) => g.id)).toEqual(['max_concurrency', 'min_chars'])
  })

  it('shows the 0.8.0 settings where the design puts them', () => {
    expect(sections[0].keys).toEqual(['mode', 'allowlist_user_ids', 'blocklist_user_ids'])
    const shown = sections.flatMap((g) => g.keys)
    expect(shown[shown.indexOf('store_text') + 1]).toBe('record_pass_input_message')
    expect(sections.find((g) => g.keys.includes('verdict_cache_days'))?.keys).toContain('cache_entries')
  })

  it('keeps api_key a secret of the schema, so the core masks it', () => {
    expect(schema.properties.api_key.writeOnly).toBe(true)
  })

  it('leaves out fields before any section only when hidden, and groups without visible fields', () => {
    const s = { properties: { a: {}, b: {}, c: {} } }
    expect(settingSections(s, { 'ui:order': ['a', 'b', 'c'], b: { 'ui:section': 'B' }, c: { 'ui:widget': 'hidden' } })).toEqual([
      { id: '', title: '', description: '', collapsed: false, keys: ['a'] },
      { id: 'b', title: 'B', description: '', collapsed: false, keys: ['b'] }
    ])
    expect(settingSections(s, { a: { 'ui:widget': 'hidden' }, b: { 'ui:widget': 'hidden' }, c: { 'ui:section': { title: 'C', collapsed: true }, 'ui:widget': 'hidden' } })).toEqual([])
    expect(settingSections(null, ui)).toEqual([])
  })
})

describe('editableKeys', () => {
  it('adds the 0.1 API key only while one is stored, and never renders it with a schema widget', () => {
    expect(editableKeys(sections, {})).not.toContain(LEGACY_KEY)
    const keys = editableKeys(sections, { api_key: MASK })
    expect(keys).toContain(LEGACY_KEY)
    const widgets = schemaKeys(keys)
    expect(widgets).not.toContain(LEGACY_KEY)
    for (const k of CUSTOM_KEYS) expect(widgets).not.toContain(k)
    expect(widgets).toContain('mode')
  })
})

describe('the save of the settings tab', () => {
  // What the page sends for a key: the widget value, or the mask of a kept secret.
  const page = (stored: Record<string, unknown>, form: Record<string, unknown>): PageValues => {
    const out: PageValues = {}
    for (const k of schemaKeys(editableKeys(sections, stored))) out[k] = sentSetting((schema.properties as Record<string, any>)[k], stored, k, form[k])
    out.analysis_channel_id = (form.analysis_channel_id as number) ?? 0
    out.notify_webhook_url = stored.notify_webhook_url === MASK ? MASK : undefined
    out.notify_webhook_secret = stored.notify_webhook_secret === MASK ? MASK : undefined
    out.jev_default_set = (stored.jev_default_set as unknown) ?? null
    if (stored.api_key) out.api_key = form.api_key
    return out
  }
  const stored = {
    mode: 'observe',
    watch_days: 14,
    notify_webhook_url: MASK,
    notify_webhook_secret: MASK,
    api_key: MASK,
    base_url: 'https://old.example',
    model: 'gpt-4o-mini',
    categories: [{ id: 'illegal', description: 'x' }],
    group_ids: [3],
    retention_days: 60
  }
  const keys = editableKeys(sections, stored)
  const form: Record<string, unknown> = { ...displayValues(schema, stored, schemaKeys(keys)), analysis_channel_id: 0, api_key: MASK }
  const initial = page(stored, form)

  it('shows schema defaults for keys never stored, without writing them', () => {
    expect(form.block_status).toBe(403)
    expect(form.auto_watch).toBe(true)
    const m = mergeSettings(keys, stored, stored, initial, page(stored, form))
    expect(m.changed).toEqual([])
    expect(m.values).toEqual(stored)
  })

  it('writes only the changed keys and sends the hidden 0.1 fields and kept secrets back as stored', () => {
    const m = mergeSettings(keys, stored, stored, initial, page(stored, { ...form, mode: 'enforce', verdict_cache_days: 3 }))
    expect(m.changed.sort()).toEqual(['mode', 'verdict_cache_days'])
    expect(m.values).toEqual({ ...stored, mode: 'enforce', verdict_cache_days: 3 })
  })

  // The same reading as settings.go DecodeSettings (TestExemptBecomesAllowlist).
  describe('the allowlist of settings saved before 0.8.0', () => {
    const old = { ...stored, exempt_user_ids: ['5', '9'] }
    const oldKeys = editableKeys(sections, old)
    const oldForm: Record<string, unknown> = { ...displayValues(schema, old, schemaKeys(oldKeys)), analysis_channel_id: 0, api_key: MASK }
    const oldInitial = page(old, oldForm)

    it('starts from the stored exempt_user_ids while allowlist_user_ids was never stored', () => {
      expect(oldForm.allowlist_user_ids).toEqual(['5', '9'])
      expect(oldForm.blocklist_user_ids).toEqual([])
      expect(oldKeys).not.toContain('exempt_user_ids')
      // nothing is written while nothing is edited
      const m = mergeSettings(oldKeys, old, old, oldInitial, page(old, oldForm))
      expect(m.changed).toEqual([])
      expect(m.values).toEqual(old)
    })

    it('uses allowlist_user_ids once it is stored, also when empty', () => {
      const both = { ...old, allowlist_user_ids: ['7'] }
      expect(displayValues(schema, both, ['allowlist_user_ids']).allowlist_user_ids).toEqual(['7'])
      expect(displayValues(schema, { ...old, allowlist_user_ids: [] }, ['allowlist_user_ids']).allowlist_user_ids).toEqual([])
      expect(displayValues(schema, stored, ['allowlist_user_ids']).allowlist_user_ids).toEqual([])
    })

    it('writes allowlist_user_ids and empties the retired key, so a 0.7.2 node does not keep exempting a removed user', () => {
      const m = mergeSettings(oldKeys, old, old, oldInitial, page(old, { ...oldForm, allowlist_user_ids: ['9', '12'] }))
      expect(m.changed).toEqual(['allowlist_user_ids'])
      expect(m.values).toEqual({ ...old, allowlist_user_ids: ['9', '12'] })
      expect(withRetiredCleared(m.values, m.changed)).toEqual({ ...old, allowlist_user_ids: ['9', '12'], exempt_user_ids: [] })
      // m.values itself is not mutated
      expect(m.values.exempt_user_ids).toEqual(['5', '9'])
    })

    it('leaves the retired key alone when the allowlist is not saved, and adds none', () => {
      const other = mergeSettings(oldKeys, old, old, oldInitial, page(old, { ...oldForm, mode: 'enforce' }))
      expect(other.changed).toEqual(['mode'])
      expect(withRetiredCleared(other.values, other.changed)).toBe(other.values)
      // no retired list, or an empty one: nothing to add
      const fresh = { ...stored, allowlist_user_ids: ['7'] }
      expect(withRetiredCleared(fresh, ['allowlist_user_ids'])).toBe(fresh)
      const emptied = { ...fresh, exempt_user_ids: [] }
      expect(withRetiredCleared(emptied, ['allowlist_user_ids'])).toBe(emptied)
      // the list another admin stored meanwhile (latest) is the one emptied
      expect(withRetiredCleared({ ...fresh, exempt_user_ids: ['3'] }, ['mode', 'allowlist_user_ids']).exempt_user_ids).toEqual([])
    })

    it('stores an emptied allowlist as [], so the retired list is not read again', () => {
      for (const emptied of [[], undefined, null]) {
        const m = mergeSettings(oldKeys, old, old, oldInitial, page(old, { ...oldForm, allowlist_user_ids: emptied }))
        expect(m.changed).toEqual(['allowlist_user_ids'])
        expect(m.values.allowlist_user_ids).toEqual([])
        expect(withRetiredCleared(m.values, m.changed).exempt_user_ids).toEqual([])
      }
      // without a retired list an emptied allowlist is simply removed
      expect(sentSetting(schema.properties.allowlist_user_ids, stored, 'allowlist_user_ids', undefined)).toBeUndefined()
      expect(sentSetting(schema.properties.blocklist_user_ids, old, 'blocklist_user_ids', undefined)).toBeUndefined()
    })
  })

  describe('the verdict cache of settings saved before 0.8.0', () => {
    const days = (s: Record<string, unknown>) => displayValues(schema, s, ['verdict_cache_days']).verdict_cache_days

    it('shows the days the retired cache_ttl_seconds gives, rounded up, 1 to 30', () => {
      expect(days({})).toBe(7)
      expect(days({ cache_ttl_seconds: 600 })).toBe(1)
      expect(days({ cache_ttl_seconds: 86400 })).toBe(1)
      expect(days({ cache_ttl_seconds: 86401 })).toBe(2)
      expect(days({ cache_ttl_seconds: 604800 })).toBe(7)
      expect(days({ cache_ttl_seconds: 600, verdict_cache_days: 14 })).toBe(14)
    })

    it('shows no days while the retired key keeps the cache off, and saving days turns it on', () => {
      const off = { ...stored, cache_ttl_seconds: 0 }
      expect(verdictCacheOff(off)).toBe(true)
      expect(verdictCacheOff({ ...off, verdict_cache_days: 7 })).toBe(false)
      expect(verdictCacheOff(stored)).toBe(false)
      expect(days(off)).toBeUndefined()
      const offKeys = editableKeys(sections, off)
      const offForm: Record<string, unknown> = { ...displayValues(schema, off, schemaKeys(offKeys)), analysis_channel_id: 0, api_key: MASK }
      const m = mergeSettings(offKeys, off, off, page(off, offForm), page(off, { ...offForm, verdict_cache_days: 7 }))
      expect(m.changed).toEqual(['verdict_cache_days'])
      expect(m.values).toEqual({ ...off, verdict_cache_days: 7 })
    })
  })

  // settings.go verdictCache: without verdict_cache_days a stored cache_ttl_seconds is read again.
  describe('cleared cache days while the retired cache_ttl_seconds is stored', () => {
    const cleared = (s: Record<string, unknown>) => {
      const ks = editableKeys(sections, s)
      const f: Record<string, unknown> = { ...displayValues(schema, s, schemaKeys(ks)), analysis_channel_id: 0, api_key: MASK }
      return mergeSettings(ks, s, s, page(s, f), page(s, { ...f, verdict_cache_days: '' }))
    }

    it('sends the schema default instead of removing the key', () => {
      // the retired key gives 1 day: without the new key the cache would stay at 1 day
      const hour = { ...stored, cache_ttl_seconds: 3600 }
      expect(cleared(hour).changed).toEqual(['verdict_cache_days'])
      expect(cleared(hour).values).toEqual({ ...hour, verdict_cache_days: 7 })
      // days stored over a retired 0: without the new key the cache would be off
      const both = { ...stored, cache_ttl_seconds: 0, verdict_cache_days: 3 }
      expect(cleared(both).values).toEqual({ ...both, verdict_cache_days: 7 })
      for (const empty of [undefined, null, '', ' ']) expect(sentSetting(schema.properties.verdict_cache_days, hour, 'verdict_cache_days', empty)).toBe(7)
    })

    it('removes the key without a retired one, and leaves an off cache off while the field was never filled', () => {
      const days = { ...stored, verdict_cache_days: 3 }
      expect(cleared(days).changed).toEqual(['verdict_cache_days'])
      expect(cleared(days).values).toEqual(stored)
      // the field is empty because the retired 0 keeps the cache off: nothing was cleared, nothing is written
      const off = { ...stored, cache_ttl_seconds: 0 }
      expect(cleared(off).changed).toEqual([])
      expect(cleared(off).values).toEqual(off)
      // other numbers are still removed
      expect(sentSetting(schema.properties.cache_entries, { ...stored, cache_ttl_seconds: 3600 }, 'cache_entries', '')).toBeUndefined()
    })
  })

  it('removes a number left empty, so its default applies', () => {
    const m = mergeSettings(keys, stored, stored, initial, page(stored, { ...form, watch_days: undefined }))
    expect(m.changed).toEqual(['watch_days'])
    expect(m.values).not.toHaveProperty('watch_days')
    expect(sentValue({ type: 'integer' }, '')).toBeUndefined()
    expect(sentValue({ type: 'string' }, '')).toBe('')
  })

  it('clears the stored 0.1 API key on request and keeps the other 0.1 fields', () => {
    const m = mergeSettings(keys, stored, stored, initial, page(stored, { ...form, api_key: undefined }))
    expect(m.changed).toEqual([LEGACY_KEY])
    const { api_key: _, ...rest } = stored
    expect(m.values).toEqual(rest)
  })
})

describe('settingsKey', () => {
  it('maps API field paths to the settings key', () => {
    expect(settingsKey('values/allowlist_user_ids/3')).toBe('allowlist_user_ids')
    expect(settingsKey('values.jev_default_set.items[0].question')).toBe('jev_default_set')
    expect(settingsKey('block_status')).toBe('block_status')
  })
})
