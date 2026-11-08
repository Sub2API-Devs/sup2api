import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ParamOverrideField from './ParamOverrideField.vue'

const mocks = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@sub2api/host', async importOriginal => ({ ...(await importOriginal<typeof import('@sub2api/host')>()), api: mocks }))

enableAutoUnmount(afterEach)
const override = {
  operations: [
    { description: 'fix temperature', mode: 'set', path: 'temperature', value: 0.7 },
    { mode: 'delete_header', path: 'x-foo', logic: 'OR', conditions: [{ path: 'model', mode: 'prefix', value: 'claude-' }] }
  ]
}

function render(modelValue: Record<string, unknown> | null = override) {
  const w = mount(ParamOverrideField, {
    props: {
      modelValue,
      models: ['claude-sonnet-4-5'],
      'onUpdate:modelValue': (v: unknown) => void w.setProps({ modelValue: v as Record<string, unknown> | null })
    },
    global: { plugins: [i18n], stubs: { Teleport: true } },
    attachTo: document.body
  })
  return w
}

const body = () => document.body
const q = (id: string) => body().querySelector<HTMLElement>(`[data-testid="${id}"]`)
const input = async (id: string, value: string) => {
  const el = q(id)!.matches('input,textarea') ? (q(id) as HTMLInputElement) : q(id)!.querySelector<HTMLInputElement>('input,textarea')!
  el.value = value
  el.dispatchEvent(new Event('input'))
  await flushPromises()
}
const click = async (el: Element | null) => {
  ;(el as HTMLElement).click()
  await flushPromises()
}
const view = (label: string) => [...q('po-view')!.querySelectorAll('button,label')].find(b => b.textContent?.trim() === label) ?? null

describe('request parameter override editor', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    mocks.post.mockReset()
  })

  it('summarizes the override on the row', () => {
    const w = render()
    expect(w.get('[data-testid="account-param-override-summary"]').text()).toBe('2 条操作 · 含 1 条请求头操作')
    expect(w.text()).toContain('1. fix temperature')
    expect(w.text()).toContain('2. 当 model 前缀是 claude- → 删除请求头 x-foo')
    expect(render(null).get('[data-testid="account-param-override-summary"]').text()).toBe('未设置')
  })

  it('adds an operation in the visual editor and applies the override', async () => {
    const w = render()
    await w.get('[data-testid="account-param-override-edit"]').trigger('click')
    await flushPromises()
    expect(q('po-nav')!.querySelectorAll('button')).toHaveLength(2)
    await click(q('po-add'))
    await input('po-path', 'max_tokens')
    await input('po-value', '8192')
    await click(q('po-apply'))
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({
      operations: [...override.operations, { mode: 'set', path: 'max_tokens', value: 8192 }]
    })
  })

  it('keeps Apply blocked while an operation is invalid', async () => {
    const w = render()
    await w.get('[data-testid="account-param-override-edit"]').trigger('click')
    await flushPromises()
    await click(q('po-add'))
    await click(q('po-apply'))
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(q('po-nav')!.querySelector('[role="img"]')).not.toBeNull()
  })

  it('mirrors valid JSON into the operations', async () => {
    const w = render(null)
    await w.get('[data-testid="account-param-override-edit"]').trigger('click')
    await flushPromises()
    await click(view('JSON'))
    await input('po-json', '{"temperature": 1}')
    await click(view('可视化'))
    expect(q('po-nav')!.textContent).toContain('设置 temperature = 1')
    await click(q('po-apply'))
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ operations: [{ mode: 'set', path: 'temperature', value: 1 }] })
  })

  it('dry-runs the draft on the server', async () => {
    mocks.post.mockResolvedValue({
      body: { temperature: 0.7 },
      set_headers: {},
      delete_headers: ['x-foo'],
      return_error: null,
      error: null
    })
    const w = render()
    await w.get('[data-testid="account-param-override-edit"]').trigger('click')
    await flushPromises()
    await click(view('试运行'))
    await click(q('po-preview-run'))
    expect(mocks.post).toHaveBeenCalledWith(
      '/accounts/param-override/preview',
      expect.objectContaining({ param_override: override, model: 'claude-sonnet-4-5' })
    )
    expect(q('po-preview-headers')!.textContent).toContain('x-foo')
    expect(q('po-preview-result')!.textContent).toContain('"temperature": 0.7')
    mocks.post.mockResolvedValue({
      body: null,
      set_headers: {},
      delete_headers: [],
      return_error: null,
      error: 'operations[0] (trim_space): not a string'
    })
    await click(q('po-preview-run'))
    expect(q('po-preview-failed')!.textContent).toContain('not a string')
  })
})
