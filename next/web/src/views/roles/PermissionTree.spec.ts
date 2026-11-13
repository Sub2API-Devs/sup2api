import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { PermissionItem, PermissionModule } from '@/api/types'
import { parsePermission } from '@/authz/implies'
import PermissionTree from './PermissionTree.vue'
import ScopePicker from './ScopePicker.vue'

enableAutoUnmount(afterEach)
vi.mock('@/components/entity/lookup', () => ({ useEntityNames: () => ({ label: (_kind: string, id: number) => `#${id}`, gone: () => false }) }))

const perm = (key: string, status = 'active'): PermissionItem => ({ key, label: key, sensitive: false, status })
const mod: PermissionModule = {
  module: 'demo',
  label: 'Demo',
  source: 'plugin',
  status: 'active',
  permissions: [perm('p.active'), perm('p.removed', 'removed'), perm('p.disabled', 'disabled')]
}

const render = (granted: string[]) => mount(PermissionTree, { props: { modules: [mod], granted: new Set(granted) }, global: { plugins: [i18n] } })
// Inputs: the module's "select all" first, then one per permission in order.
const boxes = (w: ReturnType<typeof render>) => w.findAll<HTMLInputElement>('input[type="checkbox"]')
const lastEmitted = (w: ReturnType<typeof render>) => [...(w.emitted('update:granted')!.at(-1)![0] as Set<string>)].sort()

describe('PermissionTree removed permissions', () => {
  it('cannot tick a removed permission and marks it', () => {
    const w = render([])
    const removed = boxes(w)[2]
    expect(removed.element.disabled).toBe(true)
    expect(w.text()).toContain(i18n.global.t('roles.removed'))
    // Disabled plugin permissions stay selectable.
    expect(boxes(w)[3].element.disabled).toBe(false)
  })

  it('can untick a removed permission that is still granted', async () => {
    const w = render(['p.removed'])
    const removed = boxes(w)[2]
    expect(removed.element.disabled).toBe(false)
    await removed.setValue(false)
    expect(lastEmitted(w)).toEqual([])
  })

  it('select all skips removed permissions and then counts as all', async () => {
    const w = render([])
    await boxes(w)[0].setValue(true)
    expect(lastEmitted(w)).toEqual(['p.active', 'p.disabled'])

    const full = render(['p.active', 'p.disabled'])
    expect(boxes(full)[0].element.checked).toBe(true)
    await boxes(full)[0].setValue(false)
    expect(lastEmitted(full)).toEqual([])
  })

  it('clearing the module also drops a granted removed permission', async () => {
    const w = render(['p.active', 'p.removed', 'p.disabled'])
    expect(boxes(w)[0].element.checked).toBe(true)
    await boxes(w)[0].setValue(false)
    expect(lastEmitted(w)).toEqual([])
  })
})

describe('PermissionTree step-up marks', () => {
  it('marks step-up permissions and explains the mark only when there is one', () => {
    const selfMod: PermissionModule = { module: 'self', label: 'Self', source: 'core', status: 'active', permissions: [perm('self:profile'), { ...perm('self:security'), step_up: true }] }
    const w = mount(PermissionTree, { props: { modules: [selfMod, mod], granted: new Set<string>() }, global: { plugins: [i18n] } })
    expect(w.findAll('[data-testid="permission-step-up"]')).toHaveLength(1)
    expect(w.text()).toContain(i18n.global.t('roles.stepUpLegend'))
    expect(render([]).text()).not.toContain(i18n.global.t('roles.stepUpLegend'))
  })
})

describe('PermissionTree scoped actions', () => {
  const accountMod: PermissionModule = {
    module: 'account',
    label: 'Accounts',
    source: 'core',
    status: 'active',
    permissions: [{ ...perm('account:read'), scope_type: 'account' }, perm('account:relay')]
  }
  const limitOf = (keys: string[]) => (action: string) => keys.filter((k) => k.startsWith(action)).map((k) => parsePermission(k)!.scope)
  const renderScoped = (granted: string[], limit?: string[]) =>
    mount(PermissionTree, { props: { modules: [accountMod], granted: new Set(granted), scopeLimit: limit && limitOf(limit) }, global: { plugins: [i18n], stubs: { EntityPicker: true } } })

  it('shows one row per action, its scopes open while ticked', () => {
    const w = renderScoped(['account:read:own', 'account:read:group/3'])
    expect(boxes(w)[1].element.checked).toBe(true)
    expect(w.find('[data-testid="scope-account:read"]').exists()).toBe(true)
    expect(renderScoped([]).find('[data-testid="scope-account:read"]').exists()).toBe(false)
  })

  it('ticks an action at the widest scope the editor holds, and unticks every scope of it', async () => {
    const w = renderScoped([], ['account:read:own'])
    await boxes(w)[1].setValue(true)
    expect(lastEmitted(w)).toEqual(['account:read:own'])
    const full = renderScoped(['account:read:own', 'account:read:group/3'])
    await boxes(full)[1].setValue(false)
    expect(lastEmitted(full)).toEqual([])
    const all = renderScoped([])
    await boxes(all)[0].setValue(true)
    expect(lastEmitted(all)).toEqual(['account:read', 'account:relay'])
  })

  it('opens the scopes to choose from when the editor holds no own or full scope', async () => {
    const w = renderScoped([], ['account:read:group/3'])
    await boxes(w)[1].setValue(true)
    expect(lastEmitted(w)).toEqual([])
    expect(w.find('[data-testid="scope-account:read"]').text()).toContain(i18n.global.t('roles.scope.none'))
  })

  it('emits the scopes chosen in the picker as canonical keys beside the others', async () => {
    const w = renderScoped(['account:read', 'account:relay'])
    w.findComponent(ScopePicker).vm.$emit('update:scopes', [parsePermission('account:read:own')!.scope])
    expect(lastEmitted(w)).toEqual(['account:read:own', 'account:relay'])
  })

  it('keeps the scopes open while narrowing a loaded "all", and closes them when the row is unticked', async () => {
    const w = renderScoped(['account:read'])
    w.findComponent(ScopePicker).vm.$emit('update:scopes', [])
    expect(lastEmitted(w)).toEqual([])
    await w.setProps({ granted: new Set<string>() })
    expect(w.find('[data-testid="scope-account:read"]').text()).toContain(i18n.global.t('roles.scope.none'))
    await boxes(w)[1].setValue(true)
    await w.setProps({ granted: new Set(['account:read']) })
    await boxes(w)[1].setValue(false)
    await w.setProps({ granted: new Set<string>() })
    expect(w.find('[data-testid="scope-account:read"]').exists()).toBe(false)
  })
})

