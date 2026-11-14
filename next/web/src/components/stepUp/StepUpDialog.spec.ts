import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import StepUpDialog from './StepUpDialog.vue'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
const webauthn = vi.hoisted(() => ({ supported: true, getPasskey: vi.fn() }))
vi.mock('@sub2api/host', async (orig) => ({ ...(await orig<object>()), api }))
vi.mock('@/utils/webauthn', async (orig) => ({ ...(await orig<object>()), passkeySupported: () => webauthn.supported, getPasskey: webauthn.getPasskey }))
enableAutoUnmount(afterEach)

type M = 'passkey' | 'totp' | 'password'
const methods = (available: M[], password_required = false) => ({
  scope: 'user.delete',
  password_required,
  methods: (['passkey', 'totp', 'password'] as M[]).map((method) => ({ method, available: available.includes(method) }))
})
const CONTEXT = 'DELETE /api/v1/users/5'
const render = (scope = 'user.delete') =>
  mount(StepUpDialog, { props: { open: true, scope, context: CONTEXT }, global: { plugins: [i18n], stubs: { teleport: true } }, attachTo: document.body })
const field = (w: ReturnType<typeof render>, id: string) => w.find(`[data-testid="${id}"] input, input[data-testid="${id}"]`)
const submit = async (w: ReturnType<typeof render>) => {
  await w.get('form').trigger('submit')
  await flushPromises()
}
const choose = async (w: ReturnType<typeof render>, m: M) => {
  await w.get(`[data-testid="step-up-method"] input[value="${m}"]`).setValue(true)
}

describe('StepUpDialog', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    api.get.mockReset()
    api.post.mockReset()
    webauthn.supported = true
    webauthn.getPasskey.mockReset()
  })

  it('names the operation and defaults to the passkey: begin, assertion, then the proof', async () => {
    api.get.mockResolvedValue(methods(['passkey', 'totp']))
    api.post.mockImplementation(async (path: string) => (path === '/me/verify/begin' ? { flow_token: 'ft', options: { publicKey: {} } } : { proof: 'P' }))
    webauthn.getPasskey.mockResolvedValue({ id: 'cred' })
    const w = render()
    await flushPromises()
    expect(api.get).toHaveBeenCalledWith('/me/verify/methods', { scope: 'user.delete', context: CONTEXT })
    expect(w.text()).toContain('删除用户')
    expect(w.find('[data-testid="step-up-passkey-hint"]').exists()).toBe(true)
    expect(field(w, 'step-up-password').exists()).toBe(false)
    await submit(w)
    expect(api.post).toHaveBeenCalledWith('/me/verify/begin', { scope: 'user.delete' })
    expect(api.post).toHaveBeenLastCalledWith('/me/verify', { scope: 'user.delete', context: CONTEXT, method: 'passkey', flow_token: 'ft', credential: { id: 'cred' } })
    expect(w.emitted('verified')).toEqual([['P']])
  })

  it('switches to a code', async () => {
    api.get.mockResolvedValue(methods(['passkey', 'totp']))
    api.post.mockResolvedValue({ proof: 'P' })
    const w = render()
    await flushPromises()
    await choose(w, 'totp')
    await field(w, 'step-up-code').setValue(' 123456 ')
    await submit(w)
    expect(api.post).toHaveBeenCalledWith('/me/verify', { scope: 'user.delete', context: CONTEXT, method: 'totp', code: '123456' })
    expect(w.emitted('verified')).toEqual([['P']])
  })

  it('skips the passkey when the browser cannot use one, and offers no password beside a strong method', async () => {
    webauthn.supported = false
    api.get.mockResolvedValue(methods(['passkey', 'totp']))
    const w = render()
    await flushPromises()
    expect(w.find('[data-testid="step-up-method"]').exists()).toBe(false)
    expect(field(w, 'step-up-code').exists()).toBe(true)
    expect(field(w, 'step-up-password').exists()).toBe(false)
  })

  it('takes the password with the second factor when the scope requires it', async () => {
    api.get.mockResolvedValue(methods(['totp'], true))
    api.post.mockResolvedValue({ proof: 'P' })
    const w = render('self.password.change')
    await flushPromises()
    expect(w.text()).toContain('登录密码')
    await field(w, 'step-up-password').setValue('pw')
    await field(w, 'step-up-code').setValue('123456')
    await submit(w)
    expect(api.post).toHaveBeenCalledWith('/me/verify', { scope: 'self.password.change', context: CONTEXT, method: 'totp', password: 'pw', code: '123456' })
  })

  it('falls back to the password alone when no strong method is set up', async () => {
    api.get.mockResolvedValue(methods(['password']))
    api.post.mockResolvedValue({ proof: 'P' })
    const w = render()
    await flushPromises()
    expect(field(w, 'step-up-code').exists()).toBe(false)
    await field(w, 'step-up-password').setValue('pw')
    await submit(w)
    expect(api.post).toHaveBeenCalledWith('/me/verify', { scope: 'user.delete', context: CONTEXT, method: 'password', password: 'pw' })
  })

  it('shows a wrong code next to the field and stays open', async () => {
    const { ApiError } = await import('@sub2api/host')
    api.get.mockResolvedValue(methods(['totp']))
    api.post.mockRejectedValue(new ApiError(400, { code: 'invalid_argument', message: 'bad', details: { fields: [{ field: 'code', code: 'incorrect', message: '验证码不正确' }] } }))
    const w = render()
    await flushPromises()
    await field(w, 'step-up-code').setValue('000000')
    await submit(w)
    expect(w.text()).toContain('验证码不正确')
    expect(w.emitted('verified')).toBeUndefined()
  })

  it('shows a refused passkey in the alert', async () => {
    const { ApiError } = await import('@sub2api/host')
    api.get.mockResolvedValue(methods(['passkey']))
    api.post.mockImplementation(async (path: string) => {
      if (path === '/me/verify/begin') return { flow_token: 'ft', options: { publicKey: {} } }
      throw new ApiError(400, { code: 'invalid_argument', message: 'bad', details: { fields: [{ field: 'credential', code: 'failed', message: 'passkey verification failed' }] } })
    })
    webauthn.getPasskey.mockResolvedValue({ id: 'cred' })
    const w = render()
    await flushPromises()
    await submit(w)
    expect(w.get('[data-testid="step-up-error"]').text()).toContain('passkey verification failed')
  })

  it('takes the password with a passkey when the scope requires it', async () => {
    api.get.mockResolvedValue(methods(['passkey'], true))
    api.post.mockImplementation(async (path: string) => (path === '/me/verify/begin' ? { flow_token: 'ft', options: { publicKey: {} } } : { proof: 'P' }))
    webauthn.getPasskey.mockResolvedValue({ id: 'cred' })
    const w = render('superadmin.transfer')
    await flushPromises()
    await field(w, 'step-up-password').setValue('pw')
    await submit(w)
    expect(api.post).toHaveBeenLastCalledWith('/me/verify', { scope: 'superadmin.transfer', context: CONTEXT, method: 'passkey', password: 'pw', flow_token: 'ft', credential: { id: 'cred' } })
  })

  it('says so when only passkeys are set up and the browser cannot use them', async () => {
    webauthn.supported = false
    api.get.mockResolvedValue(methods(['passkey']))
    const w = render()
    await flushPromises()
    expect(w.get('[data-testid="step-up-none"]').text()).toContain('只设置了通行密钥')
  })

  it('reports nothing when the passkey prompt is dismissed', async () => {
    api.get.mockResolvedValue(methods(['passkey']))
    api.post.mockResolvedValue({ flow_token: 'ft', options: { publicKey: {} } })
    webauthn.getPasskey.mockRejectedValue(new DOMException('no', 'NotAllowedError'))
    const w = render()
    await flushPromises()
    await submit(w)
    expect(w.find('[data-testid="step-up-error"]').exists()).toBe(false)
    expect(w.emitted('verified')).toBeUndefined()
  })
})
