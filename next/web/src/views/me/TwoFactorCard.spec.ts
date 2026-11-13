import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import TwoFactorCard from './TwoFactorCard.vue'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
const ui = vi.hoisted(() => ({ confirm: vi.fn(), toast: vi.fn() }))
vi.mock('@sub2api/host', async (orig) => ({ ...(await orig<object>()), api }))
vi.mock('@sub2api/ui', async (orig) => ({ ...(await orig<object>()), confirm: ui.confirm, toast: ui.toast }))
enableAutoUnmount(afterEach)

const render = () => mount(TwoFactorCard, { global: { plugins: [i18n], stubs: { teleport: true } }, attachTo: document.body })
const submit = async (w: ReturnType<typeof render>) => {
  await w.findAll('form').at(-1)!.trigger('submit')
  await flushPromises()
}

describe('two-factor card', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    api.get.mockReset()
    api.post.mockReset()
    ui.confirm.mockReset().mockResolvedValue(true)
    ui.toast.mockReset()
  })

  it('enrols: the password, then a code from the new secret, then the backup codes once', async () => {
    let enabled = false
    api.get.mockImplementation(async () => ({ enabled, backup_codes_left: enabled ? 10 : 0 }))
    api.post.mockImplementation(async (path: string) => {
      if (path === '/me/two-factor/setup') return { flow_token: 'f', secret: 'SECRET', qr_code: 'data:image/png;base64,AA' }
      enabled = true
      return { backup_codes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] }
    })
    const w = render()
    await flushPromises()
    await w.get('[data-testid="two-factor-enable"]').trigger('click')
    await flushPromises()
    await w.get('[data-testid="two-factor-password"] input, input[data-testid="two-factor-password"]').setValue('pw')
    await submit(w)
    expect(api.post).toHaveBeenCalledWith('/me/two-factor/setup', { password: 'pw' })
    expect(w.get('[data-testid="two-factor-secret"]').text()).toBe('SECRET')
    await w.get('[data-testid="two-factor-code"] input, input[data-testid="two-factor-code"]').setValue('123456')
    await submit(w)
    expect(api.post).toHaveBeenCalledWith('/me/two-factor/enable', { flow_token: 'f', code: '123456' })
    expect(w.get('[data-testid="two-factor-backup-codes"]').text()).toContain('AAAAA-BBBBB')
    expect(w.find('[data-testid="two-factor-on"]').exists()).toBe(true)
    w.unmount()
  })

  it('stays on the code step after a wrong code', async () => {
    api.get.mockResolvedValue({ enabled: false, backup_codes_left: 0 })
    const { ApiError } = await import('@sub2api/host')
    api.post.mockImplementation(async (path: string) => {
      if (path === '/me/two-factor/setup') return { flow_token: 'f', secret: 'SECRET', qr_code: 'data:,' }
      throw new ApiError(400, { code: 'invalid_argument', message: 'bad', details: { fields: [{ field: 'code', code: 'incorrect', message: 'x' }] } })
    })
    const w = render()
    await flushPromises()
    await w.get('[data-testid="two-factor-enable"]').trigger('click')
    await flushPromises()
    await w.get('[data-testid="two-factor-password"] input, input[data-testid="two-factor-password"]').setValue('pw')
    await submit(w)
    await w.get('[data-testid="two-factor-code"] input, input[data-testid="two-factor-code"]').setValue('000000')
    await submit(w)
    expect(w.find('[data-testid="two-factor-secret"]').exists()).toBe(true)
    expect(w.text()).toContain('验证码不正确')
    w.unmount()
  })

  it('turns it off after a confirmation, with no body: the step-up dialog verifies', async () => {
    let enabled = true
    api.get.mockImplementation(async () => ({ enabled, backup_codes_left: 3 }))
    api.post.mockImplementation(async () => {
      enabled = false
      return null
    })
    const w = render()
    await flushPromises()
    await w.get('[data-testid="two-factor-disable"]').trigger('click')
    await flushPromises()
    expect(ui.confirm).toHaveBeenCalled()
    expect(api.post).toHaveBeenCalledWith('/me/two-factor/disable')
    expect(w.find('[data-testid="two-factor-enable"]').exists()).toBe(true)
    w.unmount()
  })

  it('keeps it on when the confirmation is declined', async () => {
    api.get.mockResolvedValue({ enabled: true, backup_codes_left: 3 })
    ui.confirm.mockResolvedValueOnce(false)
    const w = render()
    await flushPromises()
    await w.get('[data-testid="two-factor-disable"]').trigger('click')
    await flushPromises()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('regenerates the backup codes with no body and shows them once', async () => {
    api.get.mockResolvedValue({ enabled: true, backup_codes_left: 3 })
    api.post.mockResolvedValue({ backup_codes: ['NEW01-CODE1'] })
    const w = render()
    await flushPromises()
    await w.get('[data-testid="two-factor-regenerate"]').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/me/two-factor/backup-codes')
    expect(w.get('[data-testid="two-factor-backup-codes"]').text()).toContain('NEW01-CODE1')
  })

  it('says nothing when the verification is dismissed', async () => {
    const { ApiError, VERIFICATION_CANCELLED } = await import('@sub2api/host')
    api.get.mockResolvedValue({ enabled: true, backup_codes_left: 3 })
    api.post.mockRejectedValue(new ApiError(403, { code: VERIFICATION_CANCELLED, message: '' }))
    const w = render()
    await flushPromises()
    await w.get('[data-testid="two-factor-disable"]').trigger('click')
    await flushPromises()
    expect(ui.toast).not.toHaveBeenCalled()
  })
})
