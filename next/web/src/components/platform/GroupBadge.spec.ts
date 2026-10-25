import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GroupBadge from './GroupBadge.vue'
import { platformTheme } from './platformTheme'

vi.mock('@/composables/platforms', () => ({ usePlatforms: () => ({ load: vi.fn(), label: (v: string) => ({ volcengine: '火山方舟' })[v] ?? v }) }))
const render = (props: Record<string, unknown>) => mount(GroupBadge, { props: { name: 'team', ...props } })

describe('group badge', () => {
  it('takes the colours of its platform, the composite theme for several', () => {
    expect(render({ platforms: ['openai'] }).classes().join(' ')).toContain(platformTheme(['openai']).badge.split(' ')[0])
    expect(render({ platforms: ['openai', 'anthropic'] }).classes().join(' ')).toContain('bg-cyan-50')
    expect(render({ platforms: ['unknown-platform'] }).classes().join(' ')).toContain('bg-violet-50')
    expect(render({}).classes().join(' ')).toContain('bg-gray-100')
  })
  it('shows each platform as its mark or initial, the name and the rate', () => {
    const w = render({ platforms: ['anthropic', 'volcengine'], rate: '1.50' })
    expect(w.findAll('[data-platform]').map((p) => p.attributes('aria-label'))).toEqual(['anthropic', '火山方舟'])
    expect(w.find('svg[data-platform="anthropic"]').exists()).toBe(true)
    expect(w.get('span[data-platform="volcengine"]').text()).toBe('火')
    expect(w.text()).toBe('anthropic火team1.5x') // the mark's <title> is its label
    expect(render({ rate: null }).text()).toBe('team')
  })
})
