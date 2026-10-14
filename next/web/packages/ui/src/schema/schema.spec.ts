import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import SchemaForm from './SchemaForm.vue'
import { SCHEMA_WIDGETS_KEY } from './widgets'
import { resolveWidget, validate, type ValidateMessages } from './schema'

enableAutoUnmount(afterEach)

const msgs: ValidateMessages = {
  required: 'req',
  minLength: (n) => `min${n}`,
  maxLength: (n) => `max${n}`,
  pattern: 'pat',
  minimum: (n) => `>=${n}`,
  maximum: (n) => `<=${n}`,
  integer: 'int',
  url: 'url',
  email: 'email',
  minItems: (n) => `items>=${n}`,
  maxItems: (n) => `items<=${n}`
}

function form(schema: any, value: any = {}, extra: Record<string, any> = {}) {
  const Host = defineComponent({
    setup() {
      const v = ref(value)
      return () => h(SchemaForm, { schema, modelValue: v.value, 'onUpdate:modelValue': (x: any) => (v.value = x), ...extra })
    }
  })
  return mount(Host, { attachTo: document.body })
}

describe('schema helpers', () => {
  it('falls back to the implied widget for unknown names when a list is given', () => {
    expect(resolveWidget({ type: 'boolean' }, { 'ui:widget': 'nope' }, ['switch'])).toBe('switch')
    expect(resolveWidget({ type: 'boolean' }, { 'ui:widget': 'nope' })).toBe('nope')
    expect(resolveWidget({ type: 'string', format: 'date-time' })).toBe('date-time')
  })

  it('validates email, pattern together with uri, item counts and custom messages', () => {
    const s = {
      type: 'object',
      properties: {
        mail: { type: 'string', format: 'email' },
        url: { type: 'string', format: 'uri', pattern: '^https://' },
        list: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
        code: { type: 'string', pattern: '^[a-z]+$' }
      }
    }
    const ui = { code: { 'ui:errorMessages': { pattern: { en: 'lowercase only', zh: '只能小写' } } } }
    expect(validate(s, ui, { mail: 'x', url: 'ftp://x', list: ['a'], code: 'A' }, msgs)).toEqual({ mail: 'email', url: 'pat', list: 'items>=2', code: 'lowercase only' })
    expect(validate(s, ui, { url: 'https://x', list: ['a', 'b', 'c', 'd'] }, msgs)).toEqual({ list: 'items<=3' })
    expect(validate({ type: 'object', properties: { u: { type: 'string', format: 'uri' } } }, undefined, { u: 'nope' }, msgs)).toEqual({ u: 'url' })
  })
})

describe('SchemaForm', () => {
  it('renders an unknown widget as its type with a dev warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const w = form({ type: 'object', properties: { on: { type: 'boolean' } } }, {}, { uiSchema: { on: { 'ui:widget': 'mystery' } } })
    await flushPromises()
    expect(w.find('input[role="switch"]').exists()).toBe(true)
    expect(warn).toHaveBeenCalled()
  })

  it('uses injected host widgets, overridden by the prop', async () => {
    const Picker = defineComponent({ props: ['modelValue'], setup: () => () => h('i', { class: 'injected' }) })
    const Mine = defineComponent({ props: ['modelValue'], setup: () => () => h('i', { class: 'mine' }) })
    const schema = { type: 'object', properties: { a: { type: 'integer' }, b: { type: 'integer' } } }
    const uiSchema = { a: { 'ui:widget': 'pick' }, b: { 'ui:widget': 'other' } }
    const w = mount(SchemaForm, {
      props: { schema, uiSchema, modelValue: {}, widgets: { other: Mine } },
      global: { provide: { [SCHEMA_WIDGETS_KEY as symbol]: { pick: Picker, other: Picker } } }
    })
    expect(w.find('.injected').exists()).toBe(true)
    expect(w.find('.mine').exists()).toBe(true)
    expect(w.findAll('.injected')).toHaveLength(1)
  })

  it('settings layout renders sections as groups and fields as rows', async () => {
    const schema = {
      type: 'object',
      properties: { enabled: { type: 'boolean', title: 'Enabled' }, notes: { type: 'string', format: 'textarea' }, limit: { type: 'integer' } }
    }
    const uiSchema = { limit: { 'ui:section': { title: 'Limits' }, 'ui:options': { unit: 'rpm' }, 'ui:details': 'Long text' } }
    const w = form(schema, {}, { uiSchema, layout: 'settings' })
    await flushPromises()
    const groups = w.findAll('[data-testid="schema-section"]')
    expect(groups).toHaveLength(2)
    expect(groups[1].text()).toContain('Limits')
    expect(groups[1].text()).toContain('rpm')
    expect(groups[1].text()).toContain('Details')
    const sw = w.get('input[role="switch"]')
    expect(w.get(`label[for="${sw.attributes('id')}"]`).text()).toContain('Enabled')
  })

  it('renders only the requested fields and keeps the others', async () => {
    const schema = { type: 'object', required: ['b'], properties: { a: { type: 'string' }, b: { type: 'string' } } }
    const w = mount(SchemaForm, { props: { schema, modelValue: { a: 'x' }, fields: ['a'] } })
    expect(w.findAll('input')).toHaveLength(1)
    expect((w.vm as any).validate()).toBe(true)
    await w.get('input').setValue('y')
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([{ a: 'y' }])
  })

  it('object-list keeps item state while moving, honours maxItems and labels remove buttons', async () => {
    const schema = { type: 'object', properties: { rules: { type: 'array', maxItems: 2, items: { type: 'object', properties: { name: { type: 'string' } } } } } }
    const w = form(schema, { rules: [{ name: 'one' }, { name: 'two' }] }, { uiSchema: { rules: { 'ui:options': { itemTitle: 'Rule {n}' } } } })
    await flushPromises()
    expect(w.text()).toContain('Rule 1')
    expect(w.find('button[aria-label="Remove Rule 1"]').exists()).toBe(true)
    const add = w.findAll('button').find((b) => b.text() === 'Add')!
    expect(add.attributes('disabled')).toBeDefined()
    await w.get('button[aria-label="Move down"]').trigger('click')
    const values = w.findAll('[data-testid="schema-list-item"] input').map((i) => (i.element as HTMLInputElement).value)
    expect(values).toEqual(['two', 'one'])
  })

  it('json widget follows outside values; read-only text stays readonly, not disabled', async () => {
    const schema = { type: 'object', properties: { extra: { type: 'object' }, id: { type: 'string', readOnly: true } } }
    const Host = defineComponent({
      setup() {
        const v = ref<any>({ id: 'abc' })
        return { v }
      },
      render() {
        return h(SchemaForm, { schema, modelValue: this.v, 'onUpdate:modelValue': (x: any) => (this.v = x) })
      }
    })
    const w = mount(Host)
    await flushPromises()
    ;(w.vm as any).v = { id: 'abc', extra: { a: 1 } }
    await flushPromises()
    expect((w.get('textarea').element as HTMLTextAreaElement).value).toContain('"a": 1')
    const id = w.get('input')
    expect(id.attributes('readonly')).toBeDefined()
    expect(id.attributes('disabled')).toBeUndefined()
  })

  it('model-mapping has no hard-coded model placeholders', () => {
    const schema = { type: 'object', properties: { m: { type: 'object', additionalProperties: { type: 'string' } } } }
    const w = mount(SchemaForm, { props: { schema, modelValue: { m: { a: 'b' } }, uiSchema: { m: { 'ui:widget': 'model-mapping', 'ui:options': { keyPlaceholder: 'from' } } } } })
    const inputs = w.findAll('input')
    expect(inputs[0].attributes('placeholder')).toBe('from')
    expect(inputs[1].attributes('placeholder')).toBeUndefined()
  })

  it('uses a searchable select for long enums and segmented / radio widgets', async () => {
    const many = Array.from({ length: 12 }, (_, i) => `v${i}`)
    const schema = { type: 'object', properties: { pick: { type: 'string', enum: many }, mode: { type: 'string', enum: ['a', 'b'] }, kind: { type: 'string', enum: ['x', 'y'] } } }
    const w = mount(SchemaForm, { props: { schema, modelValue: {}, uiSchema: { mode: { 'ui:widget': 'segmented' }, kind: { 'ui:widget': 'radio' } } } })
    expect(w.find('input[role="combobox"]').exists()).toBe(true)
    expect(w.findAll('[role="radiogroup"]')).toHaveLength(2)
  })
})
