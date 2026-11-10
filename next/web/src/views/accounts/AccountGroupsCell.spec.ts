import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountGroupsCell from './AccountGroupsCell.vue'

const groups = [
  { id: 1, name: 'default', platforms: ['anthropic', 'openai'] },
  { id: 2, name: 'vip', platforms: ['anthropic'] },
  { id: 3, name: 'batch', platforms: [] },
  { id: 4, name: 'trial' }
]
const render = (props: InstanceType<typeof AccountGroupsCell>['$props']) => mount(AccountGroupsCell, { props })
const badges = (w: ReturnType<typeof render>) => w.findAll('[data-testid="group-badge"]')

describe('account groups cell', () => {
  it('shows each group as a badge without platform marks, tinted when the group serves one platform', () => {
    const w = render({ groups: groups.slice(0, 2) })
    expect(badges(w).map(b => b.text())).toEqual(['default', 'vip'])
    expect(w.find('[data-platform], [data-brand], svg').exists()).toBe(false)
    expect(badges(w).map(b => b.classes().includes('brand-tint'))).toEqual([false, true])
    expect(w.text()).toBe('defaultvip')
  })

  it('shows the first two groups and counts the rest, the tooltip naming them all', () => {
    const w = render({ groups })
    expect(badges(w).map(b => b.text())).toEqual(['default', 'vip'])
    expect(w.text()).toBe('defaultvip+2')
    expect(w.get('[data-testid="account-groups"]').attributes('title')).toBe('default, vip, batch, trial')
  })

  it('shows a dash for an account in no group', () => {
    const w = render({ groups: [] })
    expect(badges(w)).toHaveLength(0)
    expect(w.text()).toBe('—')
  })
})
