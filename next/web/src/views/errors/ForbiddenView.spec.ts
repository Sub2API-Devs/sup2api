import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ForbiddenView from './ForbiddenView.vue'

const nav = vi.hoisted(() => ({ query: {} as Record<string, string>, replace: vi.fn() }))
vi.mock('vue-router', async original => ({ ...(await original<object>()), useRoute: () => ({ query: nav.query }), useRouter: () => ({ replace: nav.replace }) }))

const render = () => mount(ForbiddenView, { global: { plugins: [i18n], stubs: { RouterLink: true } } })

describe('the forbidden page', () => {
  beforeEach(() => {
    nav.replace.mockReset()
    i18n.global.locale.value = 'zh'
  })

  it('names the missing permission', () => {
    nav.query = { perm: 'user:read' }
    const w = render()
    expect(w.text()).toContain('user:read')
    expect(w.find('[data-testid="forbidden-retry"]').exists()).toBe(false)
  })

  it('offers a retry of the page when the account could not be loaded, naming no permission', async () => {
    nav.query = { reason: 'load_failed', redirect: '/groups?x=1' }
    const w = render()
    expect(w.text()).toContain('加载失败')
    expect(w.text()).not.toContain('没有权限')
    await w.get('[data-testid="forbidden-retry"]').trigger('click')
    expect(nav.replace).toHaveBeenCalledWith('/groups?x=1')
  })

  it('retries the overview for a redirect that is not a path of the console', async () => {
    nav.query = { reason: 'load_failed', redirect: 'https://example.com' }
    await render().get('[data-testid="forbidden-retry"]').trigger('click')
    expect(nav.replace).toHaveBeenCalledWith('/dashboard')
  })
})
