import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import { useScopeLabels } from './scopeLabels'

vi.mock('@/components/entity/lookup', () => ({
  useEntityNames: () => ({ label: (kind: string, id: number) => (id === 3 ? `cc-low #3` : `#${id}`), gone: (_kind: string, id: number) => id === 12 })
}))

function labels() {
  let out!: ReturnType<typeof useScopeLabels>
  mount(defineComponent({ setup: () => ((out = useScopeLabels()), () => h('i')) }), { global: { plugins: [i18n] } })
  return out
}

describe('useScopeLabels', () => {
  it('sums up the narrower scopes of a role per action, by name, a deleted row marked', () => {
    i18n.global.locale.value = 'en'
    const { summary } = labels()
    expect(summary(['user:read', 'account:read', 'account:update:own', 'account:update:group/3', 'account:delete:group/3/account/12', 'proxy:manage:proxy/8', 'account:test:group/*'])).toBe(
      'Accounts · Edit: Created by them, cc-low #3; Accounts · Delete: cc-low #3 / #12 (deleted); Proxies · Manage: #8; Accounts · Test: group/*'
    )
    expect(summary(['account:read', 'user:read'])).toBe('')
    i18n.global.locale.value = 'zh'
    expect(labels().summary(['account:credential:view:own'])).toBe('账号 · 查看凭证：自己创建的')
    i18n.global.locale.value = 'en'
  })
})
