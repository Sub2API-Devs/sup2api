import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), clear: vi.fn(), reset: vi.fn(), replace: vi.fn() }))
vi.mock('@sub2api/host', async (orig) => ({ ...(await orig<object>()), api: { get: mocks.get, post: mocks.post }, session: { clear: mocks.clear } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ me: { id: 1 } }) }))
vi.mock('@/stores/plugins', () => ({ usePluginStore: () => ({ reset: mocks.reset }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: mocks.replace }) }))
enableAutoUnmount(afterEach)

import TransferSuperAdminDialog from './TransferSuperAdminDialog.vue'

const EntityPicker = { props: ['id', 'exclude'], emits: ['update:id'], template: '<input :data-exclude="JSON.stringify(exclude)" @input="$emit(\'update:id\', $event.target.value)" />' }
const render = () => mount(TransferSuperAdminDialog, { props: { open: true }, global: { plugins: [i18n], stubs: { teleport: true, EntityPicker } }, attachTo: document.body })
const transfer = async (w: ReturnType<typeof render>, id: string) => {
  await w.get('[data-testid="transfer-target"]').setValue(id)
  await w.get('form').trigger('submit')
  await flushPromises()
}

describe('TransferSuperAdminDialog', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    for (const f of Object.values(mocks)) f.mockReset()
    mocks.get.mockResolvedValue({ id: 9, status: 'active' })
  })

  it('picks anyone but the caller, sends only the target, then signs out', async () => {
    mocks.post.mockResolvedValue(null)
    const w = render()
    expect(w.get('[data-testid="transfer-target"]').attributes('data-exclude')).toBe('[1]')
    await transfer(w, '9')
    expect(mocks.post).toHaveBeenCalledWith('/system/super-admin/transfer', { target_user_id: 9 })
    expect(mocks.clear).toHaveBeenCalled()
    expect(mocks.reset).toHaveBeenCalled()
    expect(mocks.replace).toHaveBeenCalledWith('/login')
  })

  it('shows a rejected target next to the picker and stays signed in', async () => {
    const { ApiError } = await import('@sub2api/host')
    mocks.post.mockRejectedValue(new ApiError(400, { code: 'invalid_argument', message: 'bad', details: { fields: [{ field: 'target_user_id', code: 'invalid', message: '目标用户已停用' }] } }))
    const w = render()
    await transfer(w, '9')
    expect(w.text()).toContain('目标用户已停用')
    expect(mocks.clear).not.toHaveBeenCalled()
  })

  it('refuses an inactive target before the verification is spent', async () => {
    mocks.get.mockResolvedValue({ id: 9, status: 'disabled' })
    const w = render()
    await transfer(w, '9')
    expect(mocks.post).not.toHaveBeenCalled()
    expect(w.text()).toContain('只能移交给状态正常的用户')
  })
})
