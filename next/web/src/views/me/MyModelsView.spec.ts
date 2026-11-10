import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import MyModelsView from './MyModelsView.vue'

const get = vi.hoisted(() => vi.fn())
vi.mock('@sub2api/host', async (orig) => ({ ...(await orig<object>()), api: { get } }))
enableAutoUnmount(afterEach)

const groups = [{ id: 1, name: 'default', rate_multiplier: '1' }, { id: 2, name: 'vip', rate_multiplier: '1.5' }]
const prices = [
  { model: 'tokens', mode: 'per_token', config: { p: 3, c: 15, cr: 0.3, cc: 3.75 }, expression: '' },
  { model: 'one-shot', mode: 'per_request', config: { price: 0.2 }, expression: '' },
  { model: 'tiered', mode: 'expression', config: { tiers: [{ name: 'a', p: 1, c: 2 }, { name: 'b', p: 3, c: 4 }] }, expression: '' },
  { model: 'custom', mode: 'expression', config: {}, expression: 'p * 2 + unknown(1)' }
]

describe('models and prices', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    get.mockReset()
    get.mockImplementation(async (path: string, q: Record<string, string>) => {
      if (path === '/me/groups') return groups
      return q.group_id === '2' ? { group: { id: 2 }, rate_multiplier: '1.5', prices: prices.slice(0, 1) } : { group: { id: 1 }, rate_multiplier: '1', prices }
    })
  })
  const row = (w: ReturnType<typeof mount>, model: string) => w.findAll('tr').find((r) => r.text().includes(model))!.text()

  it('shows each kind of price', async () => {
    const w = mount(MyModelsView, { global: { plugins: [i18n] } })
    await flushPromises()
    expect(row(w, 'tokens')).toContain('$3')
    expect(row(w, 'tokens')).toContain('$3.75')
    expect(row(w, 'one-shot')).toContain('$0.2 / 次')
    expect(row(w, 'tiered')).toContain('显示第一档')
    expect(row(w, 'tiered')).toContain('$1')
    expect(row(w, 'custom')).toContain('按规则计费')
  })

  it('marks each model with its vendor, in the vendor colour', async () => {
    const named = [{ ...prices[0], model: 'claude-sonnet-4-5' }, { ...prices[1], model: 'seedance-pro' }, prices[3]]
    get.mockImplementation(async (path: string) => (path === '/me/groups' ? groups : { group: { id: 1 }, rate_multiplier: '1', prices: named }))
    const w = mount(MyModelsView, { global: { plugins: [i18n] } })
    await flushPromises()
    const badges = w.findAll('[data-testid="model-badge"]')
    expect(badges.map((b) => b.get('.truncate').text())).toEqual(['claude-sonnet-4-5', 'seedance-pro', 'custom'])
    expect(badges.map((b) => b.get('[data-brand]').attributes('data-brand'))).toEqual(['anthropic', 'doubao', 'custom'])
    expect(badges.every((b) => b.classes().includes('brand-tint'))).toBe(true)
  })

  it('multiplies by the rate of the chosen group, and searches', async () => {
    const w = mount(MyModelsView, { global: { plugins: [i18n] } })
    await flushPromises()
    await w.get('[data-testid="models-group"]').setValue('1')
    await flushPromises()
    expect(get).toHaveBeenLastCalledWith('/me/prices', { group_id: '2' })
    expect(row(w, 'tokens')).toContain('$4.5')
    expect(w.get('[data-testid="models-unit"]').text()).toContain('×1.5')
    expect(w.text()).not.toContain('one-shot')
  })
})
