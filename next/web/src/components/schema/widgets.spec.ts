import { beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { SchemaForm, SKeyValue, STagInput } from '@sub2api/ui'
import { i18n } from '@/i18n'
import ModelLimitsEditor from '@/views/accounts/ModelLimitsEditor.vue'
import { hostComponents } from '@/components/plugin/hostComponents'
import { schemaWidgets } from './widgets'

vi.mock('@/composables/lookups', () => ({
  useProxiesLookup: () => ({ proxies: { value: [] } }),
  useGroupsLookup: () => ({ groups: { value: [] } })
}))

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

async function render(value: Record<string, unknown>) {
  const w = mount(SchemaForm, {
    props: {
      schema,
      uiSchema,
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
