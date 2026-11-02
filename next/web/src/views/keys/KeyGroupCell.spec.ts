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

  it('says why the group cannot serve the key: deleted (no badge), disabled or no longer open', () => {
    i18n.global.locale.value = 'zh'
    const deleted = render({ name: '', platforms: [], status: 'deleted' })
    expect(deleted.find('[data-testid="group-badge"]').exists()).toBe(false)
    expect(deleted.get('[data-testid="key-group-problem"]').text()).toBe('分组已删除，请重新选择分组')
    expect(deleted.text()).not.toContain('暂时无法提供服务')
    const disabled = render({ platforms: ['anthropic'], status: 'disabled' })
    expect(disabled.find('[data-testid="group-badge"]').exists()).toBe(true)
    expect(disabled.get('[data-testid="key-group-problem"]').text()).toBe('分组已停用')
    expect(render({ platforms: ['anthropic'], status: 'unavailable' }).text()).toContain('分组已不对你开放')
    expect(render({ platforms: ['anthropic'], status: 'active' }).find('[data-testid="key-group-problem"]').exists()).toBe(false)
    // A state added by a newer server shows no hint rather than a raw message key.
    expect(render({ platforms: ['anthropic'], status: 'paused' }).text()).not.toContain('apikeys.')
  })
})
