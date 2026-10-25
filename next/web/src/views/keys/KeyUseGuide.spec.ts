import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { ApiKey } from '@/api/types'
import KeyUseGuide from './KeyUseGuide.vue'
import KeyCcSwitchButton from './KeyCcSwitchButton.vue'

const { post, open } = vi.hoisted(() => ({ post: vi.fn(), open: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: { post } }))
vi.mock('./ccSwitch', () => ({ useCcSwitch: () => open }))
vi.mock('@/composables/platforms', () => ({ usePlatforms: () => ({ load: vi.fn(), endpointsOf: () => [], label: (v: string) => v, find: () => undefined }) }))
enableAutoUnmount(afterEach)
const key = (k: Partial<ApiKey> = {}) => ({ id: 7, name: 'laptop', group_id: 1, key_prefix: 'sk-s2a-abcd', status: 'active', created_at: '', copyable: true, ...k }) as ApiKey
const global = { plugins: [i18n], stubs: { Teleport: true } }

describe('API key use guide', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    post.mockResolvedValue({ key: 'sk-s2a-full-secret' })
  })
  it('fills the full key into the client configuration of the key\'s platforms', async () => {
    const w = mount(KeyUseGuide, { props: { apiKey: key(), platforms: ['anthropic', 'openai'] }, global })
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/me/api-keys/7/reveal', {})
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(['Claude Code', 'Codex CLI'])
    expect(w.get('[data-testid="key-use-snippet"]').text()).toContain('sk-s2a-full-secret')
    await w.get('[data-testid="guide-ccswitch"]').trigger('click')
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 'claude' }), 'sk-s2a-full-secret')
  })
  it('shows a legacy key by its prefix without revealing or importing it', async () => {
    const w = mount(KeyUseGuide, { props: { apiKey: key({ copyable: false }), platforms: ['anthropic'] }, global })
    await flushPromises()
    expect(post).not.toHaveBeenCalled()
    expect(w.get('[data-testid="key-use-snippet"]').text()).toContain('sk-s2a-abcd…')
    expect(w.find('[data-testid="guide-ccswitch"]').exists()).toBe(false)
  })
})

describe('CC Switch import button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    post.mockResolvedValue({ key: 'sk-s2a-full-secret' })
  })
  it('imports for the only client of the key at once', async () => {
    const w = mount(KeyCcSwitchButton, { props: { apiKey: key(), platforms: ['openai'] }, global })
    await w.get('[data-testid="key-ccswitch"]').trigger('click')
    await flushPromises()
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 'codex' }), 'sk-s2a-full-secret')
  })
  it('is absent without a client and disabled for a legacy key', () => {
    expect(mount(KeyCcSwitchButton, { props: { apiKey: key(), platforms: ['volcengine'] }, global }).find('[data-testid="key-ccswitch"]').exists()).toBe(false)
    expect(mount(KeyCcSwitchButton, { props: { apiKey: key({ copyable: false }), platforms: ['anthropic'] }, global }).get('[data-testid="key-ccswitch"]').attributes('disabled')).toBeDefined()
  })
})
