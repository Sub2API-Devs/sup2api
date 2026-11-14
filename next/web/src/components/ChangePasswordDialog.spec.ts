import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ChangePasswordDialog from './ChangePasswordDialog.vue'

const api = vi.hoisted(() => ({ put: vi.fn() }))
vi.mock('@sub2api/host', async (orig) => ({ ...(await orig<object>()), api }))
enableAutoUnmount(afterEach)

const render = () => mount(ChangePasswordDialog, { props: { open: true }, global: { plugins: [i18n], stubs: { teleport: true } }, attachTo: document.body })
const fill = async (w: ReturnType<typeof render>, pw: string, again = pw) => {
  await w.get('[data-testid="new-password"] input, input[data-testid="new-password"]').setValue(pw)
  await w.get('[data-testid="confirm-password"] input, input[data-testid="confirm-password"]').setValue(again)
  await w.get('form').trigger('submit')
  await flushPromises()
}

describe('ChangePasswordDialog', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    api.put.mockReset()
  })

  it('sends only the new password: the step-up dialog asks for the current one', async () => {
    api.put.mockResolvedValue(null)
    const w = render()
    expect(w.findAll('input')).toHaveLength(2)
    await fill(w, 'new-secret-1')
    expect(api.put).toHaveBeenCalledWith('/me/password', { new_password: 'new-secret-1' })
    expect(w.emitted('update:open')).toEqual([[false]])
  })

  it('checks the confirmation before sending', async () => {
    const w = render()
    await fill(w, 'new-secret-1', 'other')
    expect(api.put).not.toHaveBeenCalled()
    expect(w.text()).toContain('两次输入的密码不一致')
  })

  it('shows a rejected new password next to it', async () => {
    const { ApiError } = await import('@sub2api/host')
    api.put.mockRejectedValue(new ApiError(400, { code: 'invalid_argument', message: 'bad', details: { fields: [{ field: 'new_password', code: 'too_short', message: '至少 8 个字符' }] } }))
    const w = render()
    await fill(w, 'short')
    expect(w.text()).toContain('至少 8 个字符')
    expect(w.emitted('update:open')).toBeUndefined()
  })

  it('stays open and silent when the verification is dismissed', async () => {
    const { ApiError, VERIFICATION_CANCELLED } = await import('@sub2api/host')
    api.put.mockRejectedValue(new ApiError(403, { code: VERIFICATION_CANCELLED, message: '' }))
    const w = render()
    await fill(w, 'new-secret-1')
    expect(w.emitted('update:open')).toBeUndefined()
    expect(w.text()).not.toContain('已取消')
  })
})
