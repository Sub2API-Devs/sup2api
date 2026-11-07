import { describe, expect, it, vi } from 'vitest'
import type { Account } from '@/api/types'
import { i18n } from '@/i18n'
import { pluginAccountActionKey, rowActions, runRowAction, type RowActionDeps } from './accountRowActions'

const reset = { pluginKey: 'dynweight', id: 'reset', label: { en: 'Reset dynamic weight', zh: '重置动态权重' }, route: 'POST /reset', icon: 'refresh', danger: true }
const account = { id: 7, name: 'a', orphaned: false } as Account

function deps(over: Partial<RowActionDeps> = {}): RowActionDeps {
  const yes = () => true
  return {
    canReveal: yes, canResetStatus: yes, canRefreshCreds: yes, canUpdate: yes, canDelete: yes, running: () => false,
    openDetail: vi.fn(), reveal: vi.fn(), resetStatus: vi.fn(), refreshCreds: vi.fn(), remove: vi.fn(), runPluginAction: vi.fn(),
    pluginActions: [reset], runPluginAccountAction: vi.fn(),
    ...over
  }
}

describe('declared plugin account actions in the row menu (CONTRACTS §23.3 UI 3.6)', () => {
  it('lists each declared action before delete with its colour, and runs it by key', () => {
    i18n.global.locale.value = 'zh'
    const d = deps()
    const keys = rowActions(account, d).map((x) => x.key)
    expect(keys.indexOf('pa:dynweight:reset')).toBe(keys.indexOf('delete') - 1)
    expect(rowActions(account, d).find((x) => x.key === pluginAccountActionKey(reset))).toMatchObject({ label: '重置动态权重', icon: 'refresh', danger: true, hidden: false })
    runRowAction(account, 'pa:dynweight:reset', d)
    expect(d.runPluginAccountAction).toHaveBeenCalledWith(account, reset)
    expect(d.runPluginAction).not.toHaveBeenCalled()
  })

  it('hides the entries from callers without update rights and on orphaned accounts', () => {
    const hidden = (a: Account, d: RowActionDeps) => rowActions(a, d).find((x) => x.key === 'pa:dynweight:reset')!.hidden
    expect(hidden(account, deps({ canUpdate: () => false }))).toBe(true)
    expect(hidden({ ...account, orphaned: true }, deps())).toBe(true)
    expect(rowActions(account, deps({ pluginActions: [] })).some((x) => x.key.startsWith('pa:'))).toBe(false)
  })
})
