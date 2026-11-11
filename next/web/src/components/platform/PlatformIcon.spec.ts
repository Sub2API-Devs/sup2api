import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlatformIcon from './PlatformIcon.vue'

const labels: Record<string, string> = { volcengine: '火山方舟', myvideo: 'MyVideo 视频' }
vi.mock('@/composables/platforms', () => ({ usePlatforms: () => ({ load: vi.fn(), label: (id: string) => labels[id] ?? id }) }))
const render = (id: string) => mount(PlatformIcon, { props: { id } })

describe('platform icon', () => {
  it("is the mark of the platform's vendor, named by the platform's label", () => {
    const w = render('volcengine')
    expect(w.element.tagName).toBe('svg')
    expect(w.attributes()).toMatchObject({ 'data-platform': 'volcengine', 'data-brand': 'doubao', role: 'img', 'aria-label': '火山方舟' })
  })

  it('is the first letter of the label for a platform without a mark', () => {
    const w = render('myvideo')
    expect(w.text()).toBe('M')
    expect(w.attributes()).toMatchObject({ 'data-platform': 'myvideo', 'aria-label': 'MyVideo 视频' })
  })
})
