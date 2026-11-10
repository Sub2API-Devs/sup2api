import { beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import PlatformEndpointsPreview from './PlatformEndpointsPreview.vue'

// The real platform list on a mocked API: the built-in platforms and two of plugins.
const get = vi.hoisted(() => vi.fn())
vi.mock('@sub2api/host', async original => ({ ...(await original<typeof import('@sub2api/host')>()), api: { get } }))

const render = (props: InstanceType<typeof PlatformEndpointsPreview>['$props']) =>
  mount(PlatformEndpointsPreview, { props, global: { plugins: [i18n] } })
const sections = (w: ReturnType<typeof render>) => w.findAll('[data-testid="platform-endpoints"] > [data-platform]')
const ids = (w: ReturnType<typeof render>) => sections(w).map(s => s.attributes('data-platform'))

describe('platform endpoints preview', () => {
  beforeAll(async () => {
    i18n.global.locale.value = 'zh'
    const { BUILTIN_PLATFORMS } = await import('@/composables/platforms')
    get.mockResolvedValue([
      ...BUILTIN_PLATFORMS,
      {
        id: 'myvideo',
        label: { en: 'MyVideo', zh: 'MyVideo 视频' },
        builtin: false,
        endpoints: [{ method: 'POST', path: '/v1/video/generations', protocol: 'myvideo.generate', billing: 'usage' }]
      },
      { id: 'bare', label: { en: 'Bare', zh: 'Bare' }, builtin: false, endpoints: null }
    ])
    render({ ids: [] })
    await flushPromises()
  })

  it('lists the endpoints of each platform under its brand badge, free ones marked', () => {
    const w = render({ ids: ['anthropic', 'myvideo'] })
    expect(ids(w)).toEqual(['anthropic', 'myvideo'])
    const [anthropic, video] = sections(w)
    expect(anthropic.get('[data-testid="platform-badge"]').text()).toBe('Anthropic')
    expect(anthropic.findAll('li').map(li => li.text())).toEqual(['POST /v1/messages', 'POST /v1/messages/count_tokens(不计费)'])
    expect(video.get('[data-testid="platform-badge"]').text()).toBe('MMyVideo 视频')
    expect(w.text()).not.toContain('经协议转换')
  })

  it('cuts each platform at `max` endpoints and counts the rest', () => {
    const items = sections(render({ ids: ['openai'], max: 2 }))[0]
      .findAll('li')
      .map(li => li.text())
    expect(items).toEqual(['POST /v1/chat/completions', 'POST /v1/responses', '另有 1 个'])
  })

  it('says so when a platform has no endpoint or is not in the list', () => {
    const [bare, gone] = sections(render({ ids: ['bare', 'gone'] }))
    expect(bare.text()).toContain('此平台没有声明端点。')
    expect(gone.text()).toContain('暂时无法获取该平台的端点。')
  })

  it('adds, when asked, the endpoints of other platforms reached through conversion, marked as such', () => {
    const w = render({ ids: ['anthropic'], converted: true })
    expect(ids(w)).toEqual(['anthropic', 'openai', 'gemini'])
    const [anthropic, openai] = sections(w)
    expect(anthropic.attributes('data-converted')).toBeUndefined()
    expect(anthropic.text()).not.toContain('经协议转换')
    expect(openai.attributes('data-converted')).toBe('true')
    expect(openai.text()).toContain('经协议转换')
    expect(openai.findAll('li').map(li => li.text())).toEqual(['POST /v1/chat/completions', 'POST /v1/responses'])
    // A platform without a text endpoint converts to nothing.
    expect(ids(render({ ids: ['myvideo'], converted: true }))).toEqual(['myvideo'])
  })
})
