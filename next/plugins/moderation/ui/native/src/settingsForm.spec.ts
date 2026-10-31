import { describe, expect, it } from 'vitest'
import schema from '../../../forms/settings.schema.json'
import ui from '../../../forms/settings.ui.json'
import { CUSTOM_KEYS, displayValues, editableKeys, LEGACY_KEY, schemaKeys, sentValue, settingSections, settingsKey } from './settingsForm'
import { mergeSettings, type PageValues } from './settingsMerge'

const MASK = '******'
/** The converted 0.1 fields: in the schema (the core validates and masks them), never on the page. */
const LEGACY = ['base_url', 'api_key', 'model', 'system_prompt', 'categories', 'tool_choice', 'max_turns', 'temperature', 'max_tokens', 'timeout_ms', 'on_error', 'sample_rate', 'group_ids', 'model_patterns', 'retention_days']

const sections = settingSections(schema, ui)
const zh = (v: unknown) => (v as { zh: string }).zh

describe('settingSections', () => {
  it('groups every field but the 0.1 ones by ui:section, in ui:order', () => {
    expect(sections.map((g) => zh(g.title))).toEqual(['运行模式与豁免', '拦截响应', '观察名单与封禁', 'AI 分析', '记录与保留', '性能与缓存', '输入范围', '告警与通知', 'Jev 默认题集'])
    const shown = sections.flatMap((g) => g.keys)
    expect(shown).toEqual(ui['ui:order'].filter((k) => !LEGACY.includes(k)))
    expect(new Set(shown).size).toBe(shown.length)
    expect(Object.keys(schema.properties).filter((k) => !shown.includes(k)).sort()).toEqual([...LEGACY].sort())
    expect(sections.filter((g) => g.collapsed).map((g) => g.id)).toEqual(['max_concurrency', 'min_chars'])
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
    for (const k of schemaKeys(editableKeys(sections, stored))) out[k] = sentValue((schema.properties as Record<string, any>)[k], form[k])
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
    const m = mergeSettings(keys, stored, stored, initial, page(stored, { ...form, mode: 'enforce', cache_ttl_seconds: 600 }))
    expect(m.changed.sort()).toEqual(['cache_ttl_seconds', 'mode'])
    expect(m.values).toEqual({ ...stored, mode: 'enforce', cache_ttl_seconds: 600 })
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
    expect(settingsKey('values/exempt_user_ids/3')).toBe('exempt_user_ids')
    expect(settingsKey('values.jev_default_set.items[0].question')).toBe('jev_default_set')
    expect(settingsKey('block_status')).toBe('block_status')
  })
})
