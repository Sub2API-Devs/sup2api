import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import LoginView from './LoginView.vue'

const auth = vi.hoisted(() => ({ login: vi.fn(), loginSecondFactor: vi.fn(), loginWithPasskey: vi.fn(), sessionExpired: false }))
const replace = vi.hoisted(() => vi.fn())
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: { redirect: '/me/profile' } }), useRouter: () => ({ replace }) }))
vi.mock('@/utils/webauthn', () => ({ passkeySupported: () => true, passkeyCancelled: (e: any) => e?.cancelled === true }))
enableAutoUnmount(afterEach)

async function signIn(w: ReturnType<typeof mount>) {
  await w.get('input[type="email"]').setValue('a@example.com')
  await w.get('input[type="password"]').setValue('pw')
  await w.get('form').trigger('submit')
  await flushPromises()
}

describe('login page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
  })
  const render = () => mount(LoginView, { global: { plugins: [i18n] } })

  it('signs in with the password alone when the account has no second factor', async () => {
    auth.login.mockResolvedValue(undefined)
    const w = render()
    await signIn(w)
    expect(replace).toHaveBeenCalledWith('/me/profile')
    expect(w.find('[data-testid="login-two-factor"]').exists()).toBe(false)
  })

  it('asks for the code after a correct password, and only then signs in', async () => {
    auth.login.mockResolvedValue('flow-1')
    auth.loginSecondFactor.mockResolvedValue(undefined)
    const w = render()
    await signIn(w)
    expect(replace).not.toHaveBeenCalled()
    await w.get('[data-testid="login-two-factor"] input').setValue(' 123456 ')
    await w.get('[data-testid="login-two-factor"]').trigger('submit')
    await flushPromises()
    expect(auth.loginSecondFactor).toHaveBeenCalledWith('flow-1', '123456')
    expect(replace).toHaveBeenCalledWith('/me/profile')
  })

  it('says a wrong code is wrong and clears it for the next try', async () => {
    auth.login.mockResolvedValue('flow-1')
    const { ApiError } = await import('@sub2api/host')
    auth.loginSecondFactor.mockRejectedValue(new ApiError(400, { code: 'invalid_argument', message: 'bad', details: { fields: [{ field: 'code', code: 'incorrect', message: 'x' }] } }))
    const w = render()
    await signIn(w)
    const input = w.get('[data-testid="login-two-factor"] input')
    await input.setValue('000000')
    await w.get('[data-testid="login-two-factor"]').trigger('submit')
    await flushPromises()
    expect(w.get('[data-testid="login-error"]').text()).toBe('验证码不正确')
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(replace).not.toHaveBeenCalled()
  })

  it('signs in with a passkey; a dismissed prompt shows nothing', async () => {
    const w = render()
    auth.loginWithPasskey.mockRejectedValueOnce({ cancelled: true })
    await w.get('[data-testid="login-passkey"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="login-error"]').exists()).toBe(false)
    expect(replace).not.toHaveBeenCalled()
    auth.loginWithPasskey.mockResolvedValueOnce(undefined)
    await w.get('[data-testid="login-passkey"]').trigger('click')
    await flushPromises()
    expect(replace).toHaveBeenCalledWith('/me/profile')
  })
})
