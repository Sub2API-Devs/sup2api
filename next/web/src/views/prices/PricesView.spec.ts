import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { i18n } from '@/i18n'
import type { Price } from '@/api/types'
import PricesView from './PricesView.vue'

const price = (id: number, model: string, note = ''): Price => ({
  id,
  model,
  note,
  mode: 'per_token',
  config: { p: 3, c: 15, cr: 0.3 },
  expression: '',
  expr_version: 1,
  expr_hash: '',
  source: 'manual',
  enabled: true
})
const prices = [price(11, 'claude-sonnet-4-5', 'negotiated'), price(12, 'gpt-4o*'), price(13, 'house-model')]
vi.mock('@/composables/useList', async importOriginal => ({
  ...(await importOriginal<object>()),
  useList: (_path: string, init: Record<string, unknown>) => ({
    items: ref(prices),
    loading: ref(false),
    error: ref(null),
    page: ref(1),
    pageSize: ref(20),
    total: ref(prices.length),
    filters: reactive({ ...init }),
    reload: vi.fn()
  })
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
enableAutoUnmount(afterEach)

async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/prices', component: PricesView },
      { path: '/prices/:id', component: { template: '<div />' } }
    ]
  })
  await router.push('/prices')
  i18n.global.locale.value = 'zh'
  return mount(PricesView, { global: { plugins: [i18n, router] } })
}

describe('model prices list', () => {
  it('links each model to its price, with the vendor mark and without a tint', async () => {
    const rows = (await render()).findAll('tbody tr')
    const links = rows.map(tr => tr.get('a'))
    expect(links.map(a => a.attributes('href'))).toEqual(['/prices/11', '/prices/12', '/prices/13'])
    const badges = links.map(a => a.get('[data-testid="model-badge"]'))
    expect(badges.map(b => b.get('.truncate').text())).toEqual(['claude-sonnet-4-5', 'gpt-4o*', 'house-model'])
    expect(badges.map(b => b.get('[data-brand]').attributes('data-brand'))).toEqual(['anthropic', 'openai', 'house-model'])
    expect(badges.some(b => b.classes().includes('brand-tint'))).toBe(false)
    expect(rows[0].text()).toContain('negotiated')
  })
})
