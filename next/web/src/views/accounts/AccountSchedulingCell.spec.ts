import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { Account } from '@/api/types'
import { i18n } from '@/i18n'
import AccountSchedulingCell from './AccountSchedulingCell.vue'

const patch = vi.hoisted(() => vi.fn())
vi.mock('@sub2api/host', () => ({ api: { patch } }))
const notifyError = vi.hoisted(() => vi.fn())
vi.mock('@/utils/errors', () => ({ notifyError }))
enableAutoUnmount(afterEach)
const render = (editable = true) => mount(AccountSchedulingCell, { props: { editable, account: { id: 7, priority: 10, weight: 1 } as Account }, global: { plugins: [i18n] } })
describe('account inline scheduling', () => {
  beforeEach(() => { patch.mockReset(); notifyError.mockReset(); i18n.global.locale.value = 'zh' })
  it('saves only priority and weight without replacing the account', async () => {
    patch.mockResolvedValue({})
    const w = render()
    await w.get('[data-testid="schedule-inline-edit"]').trigger('click')
    const inputs = w.findAll('input')
    await inputs[0].setValue('3')
    await inputs[1].setValue('8')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(patch).toHaveBeenCalledWith('/accounts/7', { priority: 3, weight: 8 })
    expect(w.emitted('saved')).toEqual([[{ priority: 3, weight: 8 }]])
    expect(w.find('form').exists()).toBe(false)
  })
  it('rejects invalid weight and retains the editor on API failure', async () => {
    const w = render()
    await w.get('[data-testid="schedule-inline-edit"]').trigger('click')
    await w.findAll('input')[1].setValue('0')
    await w.get('form').trigger('submit')
    expect(patch).not.toHaveBeenCalled()
    await w.findAll('input')[1].setValue('2')
    const err = new Error('update failed')
    patch.mockRejectedValue(err)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(notifyError).toHaveBeenCalledWith(err)
    expect(w.emitted('saved')).toBeUndefined()
    expect(w.find('form').exists()).toBe(true)
  })
  it('does not offer editing without permission', () => {
    const w = render(false)
    expect(w.find('[data-testid="schedule-inline-edit"]').exists()).toBe(false)
    expect(w.text()).toContain('10 / 1')
  })
})
