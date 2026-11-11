import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { SFormModal, SInput } from '@sub2api/ui'
import { i18n } from '@/i18n'
import EntityPicker from '@/components/EntityPicker.vue'
import AdjustBalanceModal from './AdjustBalanceModal.vue'

const mocks = vi.hoisted(() => ({ post: vi.fn(), toast: vi.fn(), refreshBalance: vi.fn() }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<typeof import('@sub2api/host')>()), api: { post: mocks.post } }))
vi.mock('@sub2api/ui', async (original) => ({ ...(await original<typeof import('@sub2api/ui')>()), toast: mocks.toast }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ me: { id: 1 }, refreshBalance: mocks.refreshBalance }) }))

enableAutoUnmount(afterEach)

/** The dialog once opened (it resets its form on opening), for `userId` when the opener names one. */
async function opened(userId: number | null = null) {
  const w = mount(AdjustBalanceModal, { attachTo: document.body, props: { open: false, userId, currentBalance: '12.5' }, global: { plugins: [i18n], stubs: { EntityPicker: true } } })
  await w.setProps({ open: true })
  return w
}
/** The dialog is teleported: its text and nodes are read from the page. */
const balance = () => document.body.querySelector('[data-testid="adjust-current-balance"]')
const picker = (w: Awaited<ReturnType<typeof opened>>) => w.findComponent(EntityPicker)
async function submit(w: Awaited<ReturnType<typeof opened>>, amount: string) {
  await w.findComponent(SInput).setValue(amount)
  w.findComponent(SFormModal).vm.$emit('submit')
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  i18n.global.locale.value = 'en'
  mocks.post.mockResolvedValue({ ledger_id: 9, balance_after: '32.5' })
})

describe('AdjustBalanceModal', () => {
  it('opens on the user it was given and adjusts that user', async () => {
    const w = await opened(7)
    expect(picker(w).props()).toMatchObject({ kind: 'user', id: '7' })
    expect(balance()?.textContent).toContain('12.5')
    await submit(w, '20')
    expect(mocks.post).toHaveBeenCalledWith('/users/7/balance/adjust', { amount: '20', credit: true, note: '' }, { headers: { 'Idempotency-Key': expect.any(String) } })
    expect(w.emitted('done')).toHaveLength(1)
    expect(w.emitted('update:open')).toEqual([[false]])
    expect(mocks.refreshBalance).not.toHaveBeenCalled()
  })

  it('adjusts the picked user; the known balance is only that of the user it was opened on', async () => {
    const w = await opened(7)
    picker(w).vm.$emit('update:id', '1')
    await flushPromises()
    expect(balance()).toBeNull()
    await submit(w, '0.5')
    expect(mocks.post.mock.calls[0][0]).toBe('/users/1/balance/adjust')
    // The caller's own balance changed.
    expect(mocks.refreshBalance).toHaveBeenCalled()
  })

  it('asks for a user and a positive amount before sending anything', async () => {
    const w = await opened()
    expect(picker(w).props('id')).toBe('')
    await submit(w, '-3')
    expect(mocks.post).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Choose a user')
    expect(document.body.textContent).toContain('Enter a positive amount')
    expect(w.emitted('done')).toBeUndefined()
  })
})
