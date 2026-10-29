import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { Account } from '@/api/types'
import { i18n } from '@/i18n'
import AccountNumberCell from './AccountNumberCell.vue'

const patch = vi.hoisted(() => vi.fn())
vi.mock('@sub2api/host', () => ({ api: { patch } }))
const notifyError = vi.hoisted(() => vi.fn())
vi.mock('@/utils/errors', () => ({ notifyError }))
const toast = vi.hoisted(() => vi.fn())
vi.mock('@sub2api/ui', async (orig) => ({ ...(await orig<object>()), toast }))
enableAutoUnmount(afterEach)
const render = (field: 'priority' | 'weight', editable = true) =>
  mount(AccountNumberCell, { props: { field, editable, account: { id: 7, priority: 10, weight: 1 } as Account }, global: { plugins: [i18n] } })

describe('account inline priority / weight', () => {
  beforeEach(() => {
    patch.mockReset()
    notifyError.mockReset()
    toast.mockReset()
    i18n.global.locale.value = 'zh'
  })
  it('saves only the edited field when the box is left', async () => {
    patch.mockResolvedValue({})
    const w = render('priority')
    const input = w.get('[data-testid="account-priority-input"]')
    await input.setValue('3')
    await input.trigger('blur')
    await flushPromises()
    expect(patch).toHaveBeenCalledWith('/accounts/7', { priority: 3 })
    expect(w.emitted('saved')).toEqual([[{ priority: 3 }]])
  })
  it('sends nothing for an unchanged or out-of-range value and restores the saved one', async () => {
    const w = render('weight')
    const input = w.get('[data-testid="account-weight-input"]')
    await input.trigger('blur')
    await input.setValue('0')
    await input.trigger('blur')
    expect(patch).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('权重须为 1–1000 的整数', 'warning')
    expect((input.element as HTMLInputElement).value).toBe('1')
  })
  it('Escape restores the saved value; a failed save reports and restores', async () => {
    const w = render('weight')
    const input = w.get('[data-testid="account-weight-input"]')
    await input.setValue('5')
    await input.trigger('keydown', { key: 'Escape' })
    expect((input.element as HTMLInputElement).value).toBe('1')
    const err = new Error('update failed')
    patch.mockRejectedValue(err)
    await input.setValue('4')
    await input.trigger('blur')
    await flushPromises()
    expect(notifyError).toHaveBeenCalledWith(err)
    expect(w.emitted('saved')).toBeUndefined()
    expect((input.element as HTMLInputElement).value).toBe('1')
  })
  it('does not offer editing without permission', () => {
    const w = render('priority', false)
    expect(w.find('input').exists()).toBe(false)
    expect(w.get('[data-testid="account-priority"]').text()).toBe('10')
  })
})
