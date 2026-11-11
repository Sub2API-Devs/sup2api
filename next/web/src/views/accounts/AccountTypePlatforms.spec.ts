import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { AccountTypePlatform } from '@/api/types'
import { i18n } from '@/i18n'
import AccountTypePlatforms from './AccountTypePlatforms.vue'

vi.mock('@/composables/platforms', () => ({
  usePlatforms: () => ({ load: vi.fn(), label: (id: string, fallback?: { zh: string } | null) => fallback?.zh ?? id })
}))

const platform = (id: string, label: string, available = true): AccountTypePlatform => ({
  id,
  label: { en: label, zh: label },
  builtin: available,
  available
})
const render = (items: AccountTypePlatform[]) => mount(AccountTypePlatforms, { props: { items }, global: { plugins: [i18n] } })

describe('account type platforms', () => {
  it('shows each supported platform as a brand badge', () => {
    i18n.global.locale.value = 'zh'
    const badges = render([platform('anthropic', 'Anthropic'), platform('openai', 'OpenAI')]).findAll('[data-testid="platform-badge"]')
    expect(badges.map(b => b.text())).toEqual(['Anthropic', 'OpenAI'])
    expect(badges.every(b => b.classes().includes('brand-tint'))).toBe(true)
  })

  it('marks a platform whose plugin is not enabled, saying why', () => {
    i18n.global.locale.value = 'zh'
    const [foo, openai] = render([platform('foo', 'Foo', false), platform('openai', 'OpenAI')]).findAll('[data-testid="platform-badge"]')
    expect(foo.classes()).not.toContain('brand-tint')
    expect(foo.get('.line-through').text()).toBe('Foo')
    expect(foo.get('[role="img"]').attributes('aria-label')).toBe('声明平台 "foo" 的插件未启用，该账号类型暂时不服务此平台。')
    expect(openai.find('.line-through').exists()).toBe(false)
  })

  it('shows a dash for a type that declares no platform', () => {
    const w = render([])
    expect(w.find('[data-testid="platform-badge"]').exists()).toBe(false)
    expect(w.text()).toBe('—')
  })
})
