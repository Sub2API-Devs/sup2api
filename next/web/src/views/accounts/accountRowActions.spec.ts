import { describe, expect, it, vi } from 'vitest'
import type { Account } from '@/api/types'
import { i18n } from '@/i18n'
import { actionAppliesTo, pluginAccountActionKey, rowActions, runRowAction, type RowActionDeps } from './accountRowActions'

const reset = { pluginKey: 'dynweight', id: 'reset', label: { en: 'Reset dynamic weight', zh: '重置动态权重' }, permission: 'dynweight:manage', route: 'POST /reset', icon: 'refresh', danger: true }
const account = { id: 7, name: 'a', orphaned: false } as Account

function deps(over: Partial<RowActionDeps> = {}): RowActionDeps {
  const yes = () => true
  return {
    canReveal: yes, canResetStatus: yes, canDisable: yes, canRefreshCreds: yes, canUpdate: yes, canDelete: yes, running: () => false,
    openDetail: vi.fn(), reveal: vi.fn(), resetStatus: vi.fn(), disable: vi.fn(), refreshCreds: vi.fn(), remove: vi.fn(), runPluginAction: vi.fn(),
    declaredActions: [reset], runPluginAccountAction: vi.fn(),
    ...over
  }
}

describe('declared plugin account actions in the row menu (CONTRACTS §23.3 UI 3.6)', () => {
  it('lists each declared action before delete with its colour, and runs it by key', () => {
    i18n.global.locale.value = 'zh'
    const d = deps()
    const keys = rowActions(account, d).map((x) => x.key)
    expect(keys.indexOf('declared:dynweight:reset')).toBe(keys.indexOf('delete') - 1)
    expect(rowActions(account, d).find((x) => x.key === pluginAccountActionKey(reset))).toMatchObject({ label: '重置动态权重', icon: 'refresh', danger: true, hidden: false })
    runRowAction(account, 'declared:dynweight:reset', d)
    expect(d.runPluginAccountAction).toHaveBeenCalledWith(account, reset)
    expect(d.runPluginAction).not.toHaveBeenCalled()
  })

  it('hides the entries from callers without update rights and on orphaned accounts', () => {
    const hidden = (a: Account, d: RowActionDeps) => rowActions(a, d).find((x) => x.key === 'declared:dynweight:reset')?.hidden
    expect(hidden(account, deps({ canUpdate: () => false }))).toBe(true)
    expect(hidden({ ...account, orphaned: true }, deps())).toBe(true)
    expect(rowActions(account, deps({ declaredActions: [] })).some((x) => x.key.startsWith('declared:'))).toBe(false)
  })

  it('shows an action with visibleFor "all" to callers without update rights, but still not on orphaned accounts', () => {
    const all = deps({ declaredActions: [{ ...reset, visibleFor: 'all' }], canUpdate: () => false })
    const hidden = (a: Account) => rowActions(a, all).find((x) => x.key === 'declared:dynweight:reset')?.hidden
    expect(hidden(account)).toBe(false)
    expect(hidden({ ...account, orphaned: true })).toBe(true)
  })
})

describe('declared plugin account actions limited to account types (CONTRACTS §91b UI 3.8)', () => {
  const typed = { ...reset, accountTypes: ['device'] }
  const row = (over: Partial<Account> = {}) => ({ ...account, plugin_key: 'dynweight', type: 'device', ...over }) as Account
  const yes = () => true
  const no = () => false

  it('applies only to rows of the listed types of its own plugin, on top of visibleFor and orphaned', () => {
    expect(actionAppliesTo(typed, row(), yes)).toBe(true)
    expect(actionAppliesTo(typed, row({ type: 'apikey' }), yes)).toBe(false)
    // Another plugin's account type of the same name is not the plugin's.
    expect(actionAppliesTo(typed, row({ plugin_key: 'codex' }), yes)).toBe(false)
    expect(actionAppliesTo(typed, row(), no)).toBe(false)
    expect(actionAppliesTo({ ...typed, visibleFor: 'all' }, row(), no)).toBe(true)
    expect(actionAppliesTo({ ...typed, visibleFor: 'all' }, row({ orphaned: true }), yes)).toBe(false)
    // Without accountTypes every row qualifies, whatever its plugin.
    expect(actionAppliesTo(reset, row({ plugin_key: 'codex', type: 'apikey' }), yes)).toBe(true)
  })

  it('hides the row menu entry on other types', () => {
    const d = deps({ declaredActions: [typed] })
    const hidden = (a: Account) => rowActions(a, d).find((x) => x.key === 'declared:dynweight:reset')?.hidden
    expect([hidden(row()), hidden(row({ type: 'apikey' }))]).toEqual([false, true])
  })
})
