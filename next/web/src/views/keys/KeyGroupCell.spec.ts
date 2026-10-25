import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import KeyGroupCell from './KeyGroupCell.vue'

vi.mock('@/composables/platforms', () => ({ usePlatforms: () => ({ load: vi.fn(), label: (v: string) => v }) }))
const render = (props: Record<string, unknown>) => mount(KeyGroupCell, { props: { name: 'vip', ...props }, global: { plugins: [i18n] } })

describe('API key group cell', () => {
  it('shows the group as a badge with its rate, warning when the key reaches no platform', () => {
    i18n.global.locale.value = 'zh'
    expect(render({ multiplier: '0.8', platforms: ['anthropic'] }).get('[data-testid="group-badge"]').text()).toBe('anthropicvip0.8x')
    expect(render({ platforms: [] }).text()).toContain('暂时无法提供服务')
    expect(render({}).text()).toBe('vip')
  })
})
