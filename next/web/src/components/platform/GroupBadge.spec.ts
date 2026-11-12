import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GroupBadge from './GroupBadge.vue'
import { platformBrand } from './brands'

const render = (props: Record<string, unknown>) => mount(GroupBadge, { props: { name: 'team', ...props } })

describe('group badge', () => {
  it('is tinted by its one platform, neutral for several, grey for none', () => {
    const one = render({ platforms: ['openai'] })
    expect(one.classes()).toContain('brand-tint')
    expect(one.attributes('style')).toContain(platformBrand('openai').color)
    expect(render({ platforms: ['openai', 'anthropic'] }).classes()).toContain('border')
    expect(render({}).classes()).toContain('bg-surface-2')
  })
  it('shows the name and the rate, without platform marks', () => {
    const w = render({ platforms: ['anthropic', 'volcengine'], rate: '1.50' })
    expect(w.find('[data-platform]').exists()).toBe(false)
    expect(w.text()).toBe('team×1.5')
    expect(render({ rate: null }).text()).toBe('team')
  })
})
