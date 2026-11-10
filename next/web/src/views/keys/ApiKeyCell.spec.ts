import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ApiKeyCell from './ApiKeyCell.vue'
import type { ApiKey } from '@/api/types'

const { post, copyText, notifyError, toast } = vi.hoisted(() => ({
  post: vi.fn(),
  copyText: vi.fn(),
  notifyError: vi.fn(),
  toast: vi.fn()
}))
vi.mock('@sub2api/ui', async original => ({ ...(await original<typeof import('@sub2api/ui')>()), toast }))
vi.mock('@sub2api/host', () => ({ api: { post } }))
vi.mock('@/utils/format', () => ({ copyText }))
vi.mock('@/utils/errors', () => ({ notifyError }))
enableAutoUnmount(afterEach)

const key = (k: Partial<ApiKey> = {}) => ({ id: 7, key_prefix: 'sk-s2a-demo1', copyable: true, ...k }) as ApiKey
const render = (apiKey = key()) => {
  i18n.global.locale.value = 'zh'
  return mount(ApiKeyCell, { props: { apiKey }, global: { plugins: [i18n] } })
}
type Cell = ReturnType<typeof render>
const eye = (w: Cell) => w.get('[data-testid="reveal-api-key"]')
const copy = (w: Cell) => w.get('[data-testid="copy-api-key"]')
const shownKey = (w: Cell) => w.get('code').text()

describe('API key cell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    copyText.mockResolvedValue(true)
    post.mockResolvedValue({ key: 'sk-s2a-demo1-full-secret' })
  })

  it('masks the key after its prefix until the eye reveals it in place, and hides it again', async () => {
    const w = render()
    expect(shownKey(w)).toBe('sk-s2a-demo1******')
    expect(eye(w).attributes('aria-label')).toBe('显示密钥')
    await eye(w).trigger('click')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/me/api-keys/7/reveal', {})
    expect(shownKey(w)).toBe('sk-s2a-demo1-full-secret')
    expect(eye(w).attributes('aria-label')).toBe('隐藏密钥')
    await eye(w).trigger('click')
    expect(shownKey(w)).toBe('sk-s2a-demo1******')
  })

  it('reveals a key once: showing it again and copying it reuse the answer', async () => {
    const w = render()
    await eye(w).trigger('click')
    await flushPromises()
    await eye(w).trigger('click')
    await eye(w).trigger('click')
    await copy(w).trigger('click')
    await flushPromises()
    expect(post).toHaveBeenCalledTimes(1)
    expect(copyText).toHaveBeenCalledWith('sk-s2a-demo1-full-secret')
  })

  it('copies the full key without displaying it', async () => {
    const w = render()
    await copy(w).trigger('click')
    await flushPromises()
    expect(copyText).toHaveBeenCalledWith('sk-s2a-demo1-full-secret')
    expect(toast).toHaveBeenCalledWith('已复制', 'success')
    expect(w.text()).not.toContain('full-secret')
    copyText.mockResolvedValue(false)
    await copy(w).trigger('click')
    await flushPromises()
    expect(toast).toHaveBeenLastCalledWith(expect.stringContaining('复制失败'), 'error')
  })

  it('switches both buttons off on a legacy key and says why', async () => {
    const w = render(key({ copyable: false }))
    for (const button of [eye(w), copy(w)]) {
      expect(button.attributes('disabled')).toBeDefined()
      expect(button.attributes('title')).toContain('旧密钥')
    }
    await eye(w).trigger('click')
    await copy(w).trigger('click')
    expect(post).not.toHaveBeenCalled()
    expect(shownKey(w)).toBe('sk-s2a-demo1******')
  })

  it('keeps the mask and copies nothing when the server refuses to reveal the key', async () => {
    const refused = Object.assign(new Error('This legacy key cannot be recovered.'), { status: 409 })
    post.mockRejectedValue(refused)
    const w = render()
    await eye(w).trigger('click')
    await flushPromises()
    await copy(w).trigger('click')
    await flushPromises()
    expect(notifyError).toHaveBeenCalledTimes(2)
    expect(notifyError).toHaveBeenCalledWith(refused)
    expect(copyText).not.toHaveBeenCalled()
    expect(shownKey(w)).toBe('sk-s2a-demo1******')
    expect(eye(w).attributes('disabled')).toBeUndefined()
  })

  it('forgets the revealed key once the key is regenerated', async () => {
    const w = render()
    await eye(w).trigger('click')
    await flushPromises()
    await w.setProps({ apiKey: key({ key_prefix: 'sk-s2a-fresh' }) })
    expect(shownKey(w)).toBe('sk-s2a-fresh******')
    post.mockResolvedValue({ key: 'sk-s2a-fresh-new-secret' })
    await copy(w).trigger('click')
    await flushPromises()
    expect(copyText).toHaveBeenCalledWith('sk-s2a-fresh-new-secret')
  })

  describe('when a reveal answers after the cell turned to another key', () => {
    let answer!: (v: { key: string }) => void
    beforeEach(() => post.mockImplementationOnce(() => new Promise(resolve => (answer = resolve))))

    it('does not show the key of the row it showed before', async () => {
      const w = render()
      await eye(w).trigger('click')
      expect(eye(w).attributes('disabled')).toBeDefined()
      await w.setProps({ apiKey: key({ id: 8, key_prefix: 'sk-s2a-other' }) })
      // The new key is not kept waiting for the old one's reveal.
      expect(eye(w).attributes('disabled')).toBeUndefined()
      answer({ key: 'sk-s2a-demo1-full-secret' })
      await flushPromises()
      expect(shownKey(w)).toBe('sk-s2a-other******')
      expect(eye(w).attributes('aria-label')).toBe('显示密钥')

      post.mockResolvedValue({ key: 'sk-s2a-other-full-secret' })
      await eye(w).trigger('click')
      await flushPromises()
      expect(post).toHaveBeenLastCalledWith('/me/api-keys/8/reveal', {})
      expect(shownKey(w)).toBe('sk-s2a-other-full-secret')
    })

    it('tells keys apart by id, not by what shows of them', async () => {
      const w = render()
      await eye(w).trigger('click')
      await w.setProps({ apiKey: key({ id: 8 }) })
      answer({ key: 'sk-s2a-demo1-full-secret' })
      await flushPromises()
      expect(shownKey(w)).toBe('sk-s2a-demo1******')
    })

    it('does not copy, show or keep the old key once the key was regenerated meanwhile', async () => {
      const w = render()
      await copy(w).trigger('click')
      await w.setProps({ apiKey: key({ key_prefix: 'sk-s2a-fresh' }) })
      answer({ key: 'sk-s2a-demo1-full-secret' })
      await flushPromises()
      expect(copyText).not.toHaveBeenCalled()
      expect(toast).not.toHaveBeenCalled()
      post.mockResolvedValue({ key: 'sk-s2a-fresh-new-secret' })
      await eye(w).trigger('click')
      await flushPromises()
      expect(shownKey(w)).toBe('sk-s2a-fresh-new-secret')
    })

    it('still shows the key when only the list reloaded: the row is the same key in a new object', async () => {
      const w = render()
      await eye(w).trigger('click')
      await w.setProps({ apiKey: key() })
      answer({ key: 'sk-s2a-demo1-full-secret' })
      await flushPromises()
      expect(shownKey(w)).toBe('sk-s2a-demo1-full-secret')
    })

    it('says nothing of a reveal that failed for the key it no longer shows', async () => {
      post.mockReset()
      let fail!: (e: Error) => void
      post.mockImplementationOnce(() => new Promise((_, no) => (fail = no)))
      const w = render()
      await eye(w).trigger('click')
      await w.setProps({ apiKey: key({ id: 8, key_prefix: 'sk-s2a-other' }) })
      fail(new Error('gone'))
      await flushPromises()
      expect(notifyError).not.toHaveBeenCalled()
    })
  })
})
