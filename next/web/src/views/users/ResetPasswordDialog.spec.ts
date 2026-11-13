import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { User } from '@/api/types'
import ResetPasswordDialog from './ResetPasswordDialog.vue'

const api = vi.hoisted(() => ({ patch: vi.fn() }))
vi.mock('@sub2api/host', async (orig) => ({ ...(await orig<object>()), api }))
enableAutoUnmount(afterEach)

const USER = { id: 5, email: 'u5@x', display_name: '', status: 'active' } as User
const render = () => mount(ResetPasswordDialog, { props: { open: true, user: USER }, global: { plugins: [i18n], stubs: { teleport: true } }, attachTo: document.body })
const fill = async (w: ReturnType<typeof render>, pw: string, again = pw) => {
  await w.get('[data-testid="reset-password-new"] input, input[data-testid="reset-password-new"]').setValue(pw)
  await w.get('[data-testid="reset-password-confirm"] input, input[data-testid="reset-password-confirm"]').setValue(again)
  await w.get('form').trigger('submit')
  await flushPromises()
}

describe('ResetPasswordDialog', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    api.patch.mockReset()
  })

  it('sets the password with PATCH /users/:id {password} alone', async () => {
    api.patch.mockResolvedValue(USER)
    const w = render()
    await fill(w, 'new-secret-1')
    expect(api.patch).toHaveBeenCalledWith('/users/5', { password: 'new-secret-1' })
    expect(w.emitted('update:open')).toEqual([[false]])
  })

  it('checks the confirmation before sending', async () => {
    const w = render()
    await fill(w, 'new-secret-1', 'x')
    expect(api.patch).not.toHaveBeenCalled()
    expect(w.text()).toContain('两次输入的密码不一致')
  })
})
