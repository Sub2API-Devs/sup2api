import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { i18n } from '@/i18n'
import MyModelsView from './MyModelsView.vue'

const get = vi.hoisted(() => vi.fn())
vi.mock('@sub2api/host', async (orig) => ({ ...(await orig<object>()), api: { get } }))
enableAutoUnmount(afterEach)

const groups = [
  { id: 1, name: 'default', rate_multiplier: '1', effective_rate: '0.9', rate_source: 'discount', exclusive: false },
  { id: 2, name: 'vip', rate_multiplier: '1.2', effective_rate: '1.5', rate_source: 'segment', exclusive: true }
]
const [basic, vip] = groups.map(({ id, name }) => ({ id, name }))
const prices = [
  { model: 'tokens', mode: 'per_token', config: { p: 3, c: 15, cr: 0.3, cc: 3.75 }, expression: '', groups: [basic, vip] },
  { model: 'one-shot', mode: 'per_request', config: { price: 0.2 }, expression: '', groups: [basic] },
  { model: 'tiered', mode: 'expression', config: { tiers: [{ name: 'a', p: 1, c: 2 }, { name: 'b', p: 3, c: 4 }] }, expression: '', groups: [basic] },
  { model: 'custom', mode: 'expression', config: {}, expression: 'p * 2 + unknown(1)', groups: [] }
]
const everyGroup = { group: null, rate_multiplier: '1', prices }
const inVip = { group: vip, rate_multiplier: '1.5', rate_source: 'segment', prices: [{ ...prices[0], groups: undefined, source: 'segment' }] }

/** The prices are asked for a tick after the choice: only the latest choice counts. */
async function settle() {
  await flushPromises()
  await new Promise((r) => setTimeout(r))
  await flushPromises()
}
async function render(path = '/me/models') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/me/models', component: MyModelsView }] })
  await router.push(path)
  const w = mount(MyModelsView, { global: { plugins: [i18n, router] } })
  await settle()
  return { w, router }
}
type View = Awaited<ReturnType<typeof render>>['w']
const row = (w: View, model: string) => w.findAll('tr').find((r) => r.text().includes(model))!
const unit = (w: View) => w.get('[data-testid="models-unit"]').text()

describe('models and prices', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    get.mockReset()
    get.mockImplementation(async (path: string, q: Record<string, string>) => {
      if (path === '/me/groups') return groups
      return q.group_id === '2' ? inVip : everyGroup
    })
  })

  it('shows each kind of price', async () => {
    const { w } = await render()
    expect(row(w, 'tokens').text()).toContain('$3')
    expect(row(w, 'tokens').text()).toContain('$3.75')
    expect(row(w, 'one-shot').text()).toContain('$0.2 / 次')
    expect(row(w, 'tiered').text()).toContain('显示第一档')
    expect(row(w, 'tiered').text()).toContain('$1')
    expect(row(w, 'custom').text()).toContain('按规则计费')
  })

  it('marks each model with its vendor, in the vendor colour', async () => {
    const named = [{ ...prices[0], model: 'claude-sonnet-4-5' }, { ...prices[1], model: 'seedance-pro' }, prices[3]]
    get.mockImplementation(async (path: string) => (path === '/me/groups' ? groups : { ...everyGroup, prices: named }))
    const { w } = await render()
    const badges = w.findAll('[data-testid="model-badge"]')
    expect(badges.map((b) => b.get('.truncate').text())).toEqual(['claude-sonnet-4-5', 'seedance-pro', 'custom'])
    expect(badges.map((b) => b.get('[data-brand]').attributes('data-brand'))).toEqual(['anthropic', 'doubao', 'custom'])
    expect(badges.every((b) => b.classes().includes('brand-tint'))).toBe(true)
  })

  it('opens on every group: the base prices, and which of the groups provide each model', async () => {
    const { w, router } = await render()
    expect(get).toHaveBeenLastCalledWith('/me/prices', {})
    expect(w.get('[data-testid="models-group"]').findAll('option').map((o) => o.text())).toEqual(['全部分组 · 基础价', 'default · ×0.9', 'vip · ×1.5 · 专属'])
    expect(w.find('[data-testid="models-base-note"]').exists()).toBe(true)
    expect(unit(w)).toContain('基础价')
    expect(row(w, 'tokens').findAll('[data-testid="models-row-group"]').map((c) => c.text())).toEqual(['default', 'vip'])
    expect(row(w, 'custom').text()).toContain('暂无分组提供')

    // A group of a model opens what the caller pays there.
    await row(w, 'tokens').findAll('[data-testid="models-row-group"] button')[1].trigger('click')
    await settle()
    expect(router.currentRoute.value.query).toEqual({ group: '2' })
    expect(get).toHaveBeenLastCalledWith('/me/prices', { group_id: '2' })
  })

  it('multiplies by the rate of the caller in the chosen group, and searches', async () => {
    const { w, router } = await render()
    await w.get('[data-testid="models-group"]').setValue('2')
    await settle()
    expect(router.currentRoute.value.query).toEqual({ group: '2' })
    expect(get).toHaveBeenLastCalledWith('/me/prices', { group_id: '2' })
    expect(row(w, 'tokens').text()).toContain('$4.5')
    expect(row(w, 'tokens').get('[data-testid="models-own-price"]').text()).toBe('专属价')
    expect(unit(w)).toContain('×1.5')
    expect(unit(w)).toContain('你在该分组有专属倍率')
    expect(w.text()).not.toContain('one-shot')
    // One group: no base price note, no column of groups.
    expect(w.find('[data-testid="models-base-note"]').exists()).toBe(false)
    expect(w.find('[data-testid="models-row-group"]').exists()).toBe(false)

    await w.get('[data-testid="models-search"]').setValue('nothing')
    expect(w.text()).toContain('这个分组没有可用模型')

    await w.get('[data-testid="models-group"]').setValue('0')
    await settle()
    expect(router.currentRoute.value.query).toEqual({})
    expect(get).toHaveBeenLastCalledWith('/me/prices', {})
  })

  it('opens the group named in the address', async () => {
    const { w } = await render('/me/models?group=2')
    expect(get.mock.calls.filter(([path]) => path === '/me/prices')).toEqual([['/me/prices', { group_id: '2' }]])
    expect((w.get('[data-testid="models-group"]').element as HTMLSelectElement).selectedIndex).toBe(2)
    expect(row(w, 'tokens').text()).toContain('$4.5')
  })
})
