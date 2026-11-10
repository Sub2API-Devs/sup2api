import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { Group } from '@/api/types'
import PlatformEndpointsPreview from '@/views/platforms/PlatformEndpointsPreview.vue'
import KeyGroupDetails from './KeyGroupDetails.vue'

const render = (group: Partial<Group>) => {
  i18n.global.locale.value = 'zh'
  return mount(KeyGroupDetails, {
    props: { group: { id: 1, name: 'default', rate_multiplier: '1', ...group } as Group },
    global: { plugins: [i18n], stubs: { PlatformEndpointsPreview: true, GroupBadge: true } }
  })
}

describe('API key group details', () => {
  it('lists a few endpoints of each platform of the group, the converted ones folded away', () => {
    const w = render({ platforms: ['anthropic'] })
    expect(w.text()).toContain('此分组的 Key 可以调用')
    expect(w.getComponent(PlatformEndpointsPreview).props()).toEqual({ ids: ['anthropic'], max: 3, fold: true })
  })

  it('warns instead when the group has no platform to serve', () => {
    const w = render({ platforms: [] })
    expect(w.text()).toContain('该分组暂时无法提供服务')
    expect(w.findComponent(PlatformEndpointsPreview).exists()).toBe(false)
  })
})
