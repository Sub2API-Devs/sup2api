import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ApiKeyCell from './ApiKeyCell.vue'
import type { ApiKey } from '@/api/types'
const post = vi.hoisted(() => vi.fn())
const copyText = vi.hoisted(() => vi.fn())
const notifyError = vi.hoisted(() => vi.fn())
const confirm = vi.hoisted(() => vi.fn())
vi.mock('@sub2api/ui', async (original) => ({ ...await original<typeof import('@sub2api/ui')>(), confirm }))
vi.mock('@sub2api/host', () => ({ api: { post } }))
vi.mock('@/utils/format', () => ({ copyText }))
vi.mock('@/utils/errors', () => ({ notifyError }))
enableAutoUnmount(afterEach)
const render = (props = {}) => mount(ApiKeyCell, { props: { apiKey: { id: 7, key_prefix: 'sk-s2a-demo', copyable: true } as ApiKey, ...props }, global: { plugins: [i18n] } })
describe('API key copy', () => {
  beforeEach(() => { vi.clearAllMocks(); copyText.mockResolvedValue(true) })
  it('copies the full key from the owner endpoint without displaying it', async () => {
    post.mockResolvedValue({ key: 'full-secret-for-test' })
    const w = render()
    await w.get('button').trigger('click'); await flushPromises()
    expect(post).toHaveBeenCalledWith('/me/api-keys/7/reveal', {})
    expect(copyText).toHaveBeenCalledWith('full-secret-for-test')
    expect(w.text()).not.toContain('full-secret-for-test')
  })
  it('uses the admin endpoint and respects permissions and legacy availability', async () => {
    post.mockResolvedValue({ key: 'test-key' })
    const w = render({ admin: true })
    await w.get('button').trigger('click'); await flushPromises()
    expect(post).toHaveBeenCalledWith('/api-keys/7/reveal', {})
    expect(render({ allowed: false }).find('button').exists()).toBe(false)
    expect(render({ apiKey: { id: 8, key_prefix: 'legacy' } as ApiKey }).get('button').attributes('disabled')).toBeDefined()
  })
  it('does not copy a prefix when reveal fails', async () => {
    const err = new Error('denied'); post.mockRejectedValue(err)
    const w = render()
    await w.get('button').trigger('click'); await flushPromises()
    expect(copyText).not.toHaveBeenCalled()
    expect(notifyError).toHaveBeenCalledWith(err)
    expect(w.get('button').attributes('disabled')).toBeUndefined()
  })
  it('regenerates only after confirmation and refreshes the row', async () => {
    const w = render()
    confirm.mockResolvedValue(false)
    await w.get('[data-testid="rotate-api-key"]').trigger('click'); await flushPromises()
    expect(post).not.toHaveBeenCalled()
    confirm.mockResolvedValue(true); post.mockResolvedValue({})
    await w.get('[data-testid="rotate-api-key"]').trigger('click'); await flushPromises()
    expect(post).toHaveBeenCalledWith('/me/api-keys/7/rotate', {})
    expect(w.emitted('rotated')).toEqual([[]])
  })
})
