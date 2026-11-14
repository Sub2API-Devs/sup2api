import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import PasskeysCard from './PasskeysCard.vue'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() }))
const ui = vi.hoisted(() => ({ confirm: vi.fn(), toast: vi.fn() }))
const webauthn = vi.hoisted(() => ({ createPasskey: vi.fn() }))
vi.mock('@sub2api/host', async (orig) => ({ ...(await orig<object>()), api }))
vi.mock('@sub2api/ui', async (orig) => ({ ...(await orig<object>()), confirm: ui.confirm, toast: ui.toast }))
vi.mock('@/utils/webauthn', async (orig) => ({ ...(await orig<object>()), passkeySupported: () => true, createPasskey: webauthn.createPasskey }))
enableAutoUnmount(afterEach)

const ROW = { id: 7, name: 'MacBook', rp_id: 'localhost', created_at: '2026-11-01T00:00:00Z', last_used_at: null }
const render = () => mount(PasskeysCard, { global: { plugins: [i18n], stubs: { teleport: true } }, attachTo: document.body })
const nameInput = (w: ReturnType<typeof render>) => w.get('[data-testid="passkey-name"] input, input[data-testid="passkey-name"]')
const submit = async (w: ReturnType<typeof render>) => {
  await w.findAll('form').at(-1)!.trigger('submit')
  await flushPromises()
}

describe('PasskeysCard', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    for (const f of [api.get, api.post, api.patch, api.del, ui.confirm, ui.toast, webauthn.createPasskey]) f.mockReset()
    api.get.mockResolvedValue([ROW])
    ui.confirm.mockResolvedValue(true)
  })

  it('adds one without a password: begin takes no body (the step-up dialog verifies), then finish', async () => {
    api.post.mockImplementation(async (path: string) => (path === '/me/passkeys/begin' ? { flow_token: 'ft', options: { publicKey: {} } } : {}))
    webauthn.createPasskey.mockResolvedValue({ id: 'new' })
    const w = render()
    await flushPromises()
    await w.get('[data-testid="passkey-add"]').trigger('click')
    expect(w.find('input[type="password"]').exists()).toBe(false)
    await nameInput(w).setValue('Phone')
    await submit(w)
    expect(api.post.mock.calls[0]).toEqual(['/me/passkeys/begin'])
    expect(api.post).toHaveBeenLastCalledWith('/me/passkeys/finish', { flow_token: 'ft', name: 'Phone', credential: { id: 'new' } })
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('renames one', async () => {
    api.patch.mockResolvedValue({ ...ROW, name: 'Work' })
    const w = render()
    await flushPromises()
    await w.get('[data-testid="passkey-rename"]').trigger('click')
    expect((nameInput(w).element as HTMLInputElement).value).toBe('MacBook')
    await nameInput(w).setValue(' Work ')
    await submit(w)
    expect(api.patch).toHaveBeenCalledWith('/me/passkeys/7', { name: 'Work' })
    expect(api.post).not.toHaveBeenCalled()
  })

  it('removes one after a confirmation, with no body', async () => {
    api.del.mockResolvedValue(null)
    const w = render()
    await flushPromises()
    await w.get('[data-testid="passkey-remove"]').trigger('click')
    await flushPromises()
    expect(api.del).toHaveBeenCalledWith('/me/passkeys/7')
  })
})
