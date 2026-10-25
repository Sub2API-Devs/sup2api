import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import KeyGroupCell from './KeyGroupCell.vue'

const render = (props: Record<string, unknown>) => mount(KeyGroupCell, { props: { name: 'vip', ...props }, global: { plugins: [i18n], stubs: { PlatformBadges: true } } })

describe('API key group cell', () => {
  it('shows the rate multiplier only when it is not ×1', () => {
    expect(render({ multiplier: '0.8' }).text()).toContain('×0.8')
    expect(render({ multiplier: 1 }).text()).not.toContain('×')
    expect(render({}).text()).not.toContain('×')
  })
})
