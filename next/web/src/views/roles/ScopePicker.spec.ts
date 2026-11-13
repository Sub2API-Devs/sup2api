import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import { parsePermission, patternKey, type Scope } from '@/authz/implies'
import { offerOf } from '@/authz/scopeChoice'
import ScopePicker from './ScopePicker.vue'

vi.mock('@/components/entity/lookup', () => ({
  useEntityNames: () => ({ label: (_kind: string, id: number) => `#${id}`, gone: (_kind: string, id: number) => id === 12 })
}))
enableAutoUnmount(afterEach)

const EntityPicker = { name: 'EntityPicker', props: ['kind', 'scope', 'exclude', 'id', 'placeholder', 'size'], emits: ['update:id'], template: '<i class="picker" />' }
const sc = (action: string, suffix: string): Scope => parsePermission(suffix ? `${action}:${suffix}` : action)!.scope

function render(action: string, held: string[], limit: string[], resource: 'account' | 'proxy' = 'account') {
  return mount(ScopePicker, {
    props: { action, resource, scopes: held.map((k) => sc(action, k)), offer: offerOf(limit.map((k) => sc(action, k))) },
    global: { plugins: [i18n], stubs: { EntityPicker } }
  })
}
const emitted = (w: ReturnType<typeof render>, action: string) => (w.emitted('update:scopes')!.at(-1)![0] as Scope[]).map((scope) => patternKey({ action, scope }))

describe('ScopePicker', () => {
  it('stacks own, groups and accounts for a holder of every row, with pickers to add any', async () => {
    i18n.global.locale.value = 'en'
    const w = render('account:update', ['own', 'group/12'], [''])
    expect(w.get('[data-testid="scope-groups"]').text()).toContain('#12 (deleted)')
    const pickers = w.findAllComponents(EntityPicker)
    expect(pickers.map((p) => p.props('kind'))).toEqual(['group', 'account', 'group'])
    pickers[1].vm.$emit('update:id', '5')
    expect(emitted(w, 'account:update')).toEqual(['account:update:own', 'account:update:group/12', 'account:update:account/5'])
    await w.get('input[data-testid="scope-all"]').setValue(true)
    expect(emitted(w, 'account:update')).toEqual(['account:update'])
  })

  it('greys the rest out while every row is chosen', () => {
    const w = render('account:update', [''], [''])
    expect((w.get('input[data-testid="scope-own"]').element as HTMLInputElement).disabled).toBe(true)
    expect(w.findAllComponents(EntityPicker)).toHaveLength(0)
    expect(w.text()).toContain(i18n.global.t('roles.scope.allHint'))
  })

  it('offers a restricted editor only its own groups and ids, as toggles', async () => {
    const w = render('account:update', [], ['group/7', 'account/5'])
    expect(w.find('[data-testid="scope-all"]').exists()).toBe(false)
    expect(w.find('[data-testid="scope-own"]').exists()).toBe(false)
    expect(w.findAllComponents(EntityPicker).map((p) => p.props('kind'))).toEqual([])
    expect(w.text()).toContain(i18n.global.t('roles.scope.none'))
    await w.get('[data-testid="scope-groups"] [aria-pressed]').trigger('click')
    expect(emitted(w, 'account:update')).toEqual(['account:update:group/7'])
  })

  it('builds an account within a group: the group first, then an account preferring it', async () => {
    const w = render('account:read', [], [''])
    const groupPicker = w.findAllComponents(EntityPicker).find((p) => p.attributes('data-testid') === 'scope-pair-group')!
    groupPicker.vm.$emit('update:id', '3')
    await w.vm.$nextTick()
    const accountPicker = w.findAllComponents(EntityPicker).find((p) => p.attributes('data-testid') === 'scope-pair-account')!
    expect(accountPicker.props('scope')).toEqual({ prefer_group_id: '3' })
    accountPicker.vm.$emit('update:id', '9')
    expect(emitted(w, 'account:read')).toEqual(['account:read:group/3/account/9'])
  })

  it('offers proxies by id, without groups', () => {
    const w = render('proxy:manage', ['proxy/8'], ['own', 'proxy/8', 'proxy/9'], 'proxy')
    expect(w.find('[data-testid="scope-groups"]').exists()).toBe(false)
    expect(w.find('[data-testid="scope-pairs"]').exists()).toBe(false)
    expect(w.get('[data-testid="scope-ids"]').text()).toContain(i18n.global.t('roles.scope.proxies'))
    expect(w.findAll('[data-testid="scope-ids"] [aria-pressed]').map((c) => c.attributes('aria-pressed'))).toEqual(['true', 'false'])
  })

  it('keeps scopes it does not offer, removable', async () => {
    const w = render('account:read', ['group/*'], [''])
    expect(w.get('[data-testid="scope-other"]').text()).toContain('group/*')
  })

  it('names no row for account:create: groups and own only', () => {
    const w = render('account:create', [], [''])
    expect(w.find('[data-testid="scope-ids"]').exists()).toBe(false)
    expect(w.find('[data-testid="scope-pairs"]').exists()).toBe(false)
    expect(w.findAllComponents(EntityPicker).map((p) => p.props('kind'))).toEqual(['group'])
  })
})
