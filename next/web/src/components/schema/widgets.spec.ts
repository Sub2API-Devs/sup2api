import { beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { SchemaForm, SKeyValue, STagInput } from '@sub2api/ui'
import { i18n } from '@/i18n'
import ModelLimitsEditor from '@/views/accounts/ModelLimitsEditor.vue'
import EntityMultiPicker from '@/components/EntityMultiPicker.vue'
import EntityPicker from '@/components/EntityPicker.vue'
import { hostComponents } from '@/components/plugin/hostComponents'
import { schemaWidgets } from './widgets'

// The pickers look names up; no lookup answers here, so ids show as "#id".
vi.mock('@sub2api/host', async (original) => ({ ...(await original<typeof import('@sub2api/host')>()), api: { get: vi.fn(async () => ({ items: [], more: false })) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true, hasAction: () => true }) }))

const schema = {
  type: 'object',
  properties: {
    headers: { type: 'array', items: { type: 'string' } },
    limits: { type: 'object' },
    override: { type: 'object' },
    model_limits: { type: 'array', items: { type: 'object' } },
    mapping: { type: 'object' }
  }
}
const uiSchema = {
  headers: { 'ui:widget': 'header-passthrough' },
  limits: { 'ui:widget': 'rate-limits' },
  override: { 'ui:widget': 'param-override' },
  model_limits: { 'ui:widget': 'model-limits' },
  mapping: { 'ui:widget': 'model-mapping' }
}

async function render(value: Record<string, unknown>, form: { schema: object; uiSchema: object } = { schema, uiSchema }) {
  const w = mount(SchemaForm, {
    props: {
      ...form,
      modelValue: value,
      widgets: schemaWidgets,
      'onUpdate:modelValue': (v: Record<string, unknown>) => w.setProps({ modelValue: v })
    },
    global: { plugins: [i18n] }
  })
  await flushPromises()
  return w
}

describe('core editor widgets (docs/COMMON-CONTROLS.md §3)', () => {
  // The editors load on first use: load them before rendering.
  beforeAll(() => Promise.all(Object.values(hostComponents).map(c => (c as { __asyncLoader?: () => Promise<unknown> }).__asyncLoader?.())))

  it('registers the core editors next to the existing widgets', () => {
    expect(Object.keys(schemaWidgets)).toEqual([
      'proxy-select',
      'group-select',
      'entity-select',
      'upstream-editor',
      'param-override',
      'header-passthrough',
      'rate-limits',
      'model-limits',
      'model-mapping'
    ])
  })

  it('edits each field in the account API format, without the schema props on the controls', async () => {
    const w = await render({ headers: ['x-a'], limits: { rpm_limit: 1 }, mapping: { a: 'b' }, model_limits: [] })
    expect(w.getComponent(STagInput).props('modelValue')).toEqual(['x-a'])
    expect(w.getComponent(SKeyValue).props('modelValue')).toEqual({ a: 'b' })
    expect(w.find('[data-testid="account-param-override-summary"]').exists()).toBe(true)
    expect(w.find('[schema]').exists()).toBe(false)
    expect(w.find('[multiple]').exists()).toBe(false)

    w.getComponent(STagInput).vm.$emit('update:modelValue', ['x-a', '*'])
    await flushPromises()
    await w.get('input[data-testid="account-tpm_limit"]').setValue('5')
    w.getComponent(ModelLimitsEditor).vm.$emit('update:modelValue', [
      { lists: [['m-a'], []], max_concurrency: 2, rpm_limit: 0, tpm_limit: 0, spm_limit: 0 }
    ])
    await flushPromises()
    expect(w.props('modelValue')).toMatchObject({
      headers: ['x-a', '*'],
      limits: { rpm_limit: 1, tpm_limit: 5, spm_limit: 0 },
      model_limits: [{ models: ['m-a'], max_concurrency: 2, rpm_limit: 0, tpm_limit: 0, spm_limit: 0 }]
    })
    // The card being filled in (an empty list) stays.
    expect(w.getComponent(ModelLimitsEditor).props('modelValue')[0].lists).toEqual([['m-a'], []])
    // The session window joins the limits only once changed (absent = 1 minute).
    expect(w.props('modelValue')?.limits).not.toHaveProperty('spm_window_seconds')
    await w.get('input[data-testid="account-spm_limit-window"]').setValue('10')
    await flushPromises()
    expect(w.props('modelValue')?.limits).toEqual({ rpm_limit: 1, tpm_limit: 5, spm_limit: 0, spm_window_seconds: 600 })
  })
})

describe('entity widgets (docs/COMMON-CONTROLS.md §6)', () => {
  const entity = (kind: string, options: object = {}) => ({ 'ui:widget': 'entity-select', 'ui:options': { kind, ...options } })
  const form = {
    schema: {
      type: 'object',
      properties: {
        owner: { type: ['integer', 'null'] },
        model: { type: 'string' },
        reviewers: { type: 'array', items: { type: 'integer' } },
        models: { type: 'array', items: { type: 'string' } },
        locked: { type: 'integer', readOnly: true },
        proxy_id: { type: ['integer', 'null'] },
        group_ids: { type: 'array', items: { type: 'integer' } }
      }
    },
    uiSchema: {
      owner: entity('user'),
      model: entity('model', { mine: true }),
      reviewers: entity('user', { max: 3 }),
      models: entity('model'),
      locked: entity('group'),
      proxy_id: { 'ui:widget': 'proxy-select' },
      group_ids: { 'ui:widget': 'group-select' }
    }
  }
  const single = (w: Awaited<ReturnType<typeof render>>, kind: string) => w.findAllComponents(EntityPicker).find((p) => p.props('kind') === kind && !p.props('exclude')?.length)!
  const multi = (w: Awaited<ReturnType<typeof render>>, kind: string) => w.findAllComponents(EntityMultiPicker).find((p) => p.props('kind') === kind)!
  /** One pick, and the form's new value back in it (the next pick builds on it). */
  async function pick(picker: { vm: { $emit: (event: string, value: unknown) => void } }, event: string, value: unknown) {
    picker.vm.$emit(event, value)
    await flushPromises()
  }

  it('entity-select picks one id for a scalar, stored as the schema types it, and null or \'\' for none', async () => {
    const w = await render({ owner: 7, model: 'gpt-4o', locked: 0 }, form)
    expect(single(w, 'user').props()).toMatchObject({ id: '7', disabled: false })
    expect(single(w, 'user').props('mine')).toBeFalsy()
    expect(single(w, 'model').props()).toMatchObject({ id: 'gpt-4o', mine: true })
    // 0 is no entity; a read-only field cannot be changed.
    expect(single(w, 'group').props()).toMatchObject({ id: '', disabled: true })

    await pick(single(w, 'user'), 'update:id', '12')
    await pick(single(w, 'model'), 'update:id', 'claude-opus-5')
    expect(w.props('modelValue')).toMatchObject({ owner: 12, model: 'claude-opus-5' })
    await pick(single(w, 'user'), 'update:id', '')
    await pick(single(w, 'model'), 'update:id', '')
    expect(w.props('modelValue')).toMatchObject({ owner: null, model: '' })
  })

  it('entity-select picks several for an array, the ids stored as its items are typed', async () => {
    const w = await render({ reviewers: [7, 12], models: ['gpt-4o'] }, form)
    expect(multi(w, 'user').props()).toMatchObject({ ids: ['7', '12'], max: 3 })
    expect(multi(w, 'model').props()).toMatchObject({ ids: ['gpt-4o'], max: undefined })
    await pick(multi(w, 'user'), 'update:ids', ['7', '12', '31'])
    await pick(multi(w, 'model'), 'update:ids', [])
    expect(w.props('modelValue')).toMatchObject({ reviewers: [7, 12, 31], models: [] })
    // Nothing stored yet is an empty list.
    expect(multi(await render({}, form), 'user').props('ids')).toEqual([])
  })

  // "constructor" is on every object: only the table's own entries are kinds.
  it.each(['tenant', 'constructor'])('entity-select with the kind "%s", which the console does not know, renders no control', async (kind) => {
    const w = await render({ owner: 7 }, { schema: { type: 'object', properties: { owner: { type: 'integer' } } }, uiSchema: { owner: entity(kind) } })
    expect(w.findComponent(EntityPicker).exists()).toBe(false)
    expect(w.find('input').exists()).toBe(false)
    expect(w.text()).toContain('Owner')
  })

  it('proxy-select and group-select keep their values: a proxy id or null, a list of group ids', async () => {
    const w = await render({ proxy_id: 42, group_ids: [1, 2] }, form)
    expect(single(w, 'proxy').props()).toMatchObject({ id: '42', placeholder: 'No proxy' })
    expect(multi(w, 'group').props('ids')).toEqual(['1', '2'])
    expect(w.find('[schema]').exists()).toBe(false)
    expect(w.find('[multiple]').exists()).toBe(false)
    await pick(single(w, 'proxy'), 'update:id', '')
    await pick(multi(w, 'group'), 'update:ids', ['2', '5'])
    expect(w.props('modelValue')).toMatchObject({ proxy_id: null, group_ids: [2, 5] })
    await pick(single(w, 'proxy'), 'update:id', '9')
    expect(w.props('modelValue')).toMatchObject({ proxy_id: 9 })
  })
})
