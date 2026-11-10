import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { ApiKey } from '@/api/types'
import KeyUseMenu from './KeyUseMenu.vue'

const { post, open, notifyError } = vi.hoisted(() => ({ post: vi.fn(), open: vi.fn(), notifyError: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: { post } }))
vi.mock('./openApp', () => ({ useOpenApp: () => open }))
vi.mock('@/utils/errors', () => ({ notifyError }))
enableAutoUnmount(afterEach)
const key = (k: Partial<ApiKey> = {}) =>
  ({ id: 7, name: 'laptop', group_id: 1, key_prefix: 'sk-s2a-abcd', status: 'active', created_at: '', copyable: true, ...k }) as ApiKey

// The menu teleports to <body>, so its items are read from the document.
const menu = <E extends Element = HTMLButtonElement>(selector: string) => Array.from(document.body.querySelectorAll<E>(selector))
const items = () => menu('[role="menuitem"]')
const header = () => menu<HTMLElement>('[data-testid="key-apps-header"]').map(h => h.textContent)

async function opened(props: { apiKey?: ApiKey; platforms?: string[] | null } = {}) {
  const w = mount(KeyUseMenu, {
    props: { apiKey: key(), platforms: ['anthropic', 'openai'], ...props },
    global: { plugins: [i18n] },
    attachTo: document.body
  })
  await w.get('[data-testid="key-quick-setup"]').trigger('click')
  const pick = (label: string) =>
    items()
      .find(b => b.textContent?.trim() === label)!
      .click()
  return { w, pick }
}

describe('API key quick setup menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    post.mockResolvedValue({ key: 'sk-s2a-full-secret' })
  })
  it("lists an import into each app of the key's platforms, then the manual guide", async () => {
    await opened()
    expect(header()).toEqual(['一键导入到'])
    expect(items().map(b => b.textContent?.trim())).toEqual(['CC Switch · Claude Code', 'CC Switch · Codex CLI', 'Magpie', '手动配置说明'])
    expect(menu('[role="separator"]')).toHaveLength(1)
    expect(post).not.toHaveBeenCalled()
  })
  it('reveals the key and opens the picked app on it', async () => {
    const { w, pick } = await opened()
    pick('Magpie')
    await w.vm.$nextTick()
    expect(w.get('[data-testid="key-quick-setup"]').attributes('disabled')).toBeDefined()
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/me/api-keys/7/reveal', {})
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 'magpie', app: 'Magpie' }), 'sk-s2a-full-secret')
    expect(w.get('[data-testid="key-quick-setup"]').attributes('disabled')).toBeUndefined()
    expect(w.emitted('guide')).toBeUndefined()
  })
  it('opens CC Switch for the client picked', async () => {
    const { pick } = await opened()
    pick('CC Switch · Codex CLI')
    await flushPromises()
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 'ccswitch:codex', app: 'CC Switch' }), 'sk-s2a-full-secret')
  })
  it('reports a key that could not be revealed and opens nothing', async () => {
    const failure = new Error('boom')
    post.mockRejectedValue(failure)
    const { w, pick } = await opened()
    pick('Magpie')
    await flushPromises()
    expect(notifyError).toHaveBeenCalledWith(failure)
    expect(open).not.toHaveBeenCalled()
    expect(w.get('[data-testid="key-quick-setup"]').attributes('disabled')).toBeUndefined()
  })
  it('disables the imports of a legacy key and says why, leaving the guide', async () => {
    const { w, pick } = await opened({ apiKey: key({ copyable: false }) })
    expect(header()).toEqual(['旧密钥只保存了哈希，无法一键导入；新建密钥后即可使用。'])
    expect(items().map(b => b.disabled)).toEqual([true, true, true, false])
    pick('Magpie')
    await flushPromises()
    expect(post).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
    pick('手动配置说明')
    expect(w.emitted('guide')).toHaveLength(1)
  })
  it.each([[['volcengine']], [null]])('offers only the guide for platforms %j', async platforms => {
    const { w, pick } = await opened({ platforms })
    expect(items().map(b => b.textContent?.trim())).toEqual(['手动配置说明'])
    expect(header()).toEqual([])
    expect(menu('[role="separator"]')).toEqual([])
    pick('手动配置说明')
    expect(w.emitted('guide')).toHaveLength(1)
    expect(post).not.toHaveBeenCalled()
  })
})
