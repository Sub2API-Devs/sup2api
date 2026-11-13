import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { PermissionItem, PermissionModule } from '@/api/types'
import PermissionTree from './PermissionTree.vue'

enableAutoUnmount(afterEach)

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

describe('PermissionTree descriptions', () => {
  it('shows the key and the description on hover', () => {
    const described: PermissionModule = { ...mod, permissions: [{ ...perm('p.active'), description: { en: 'Does things', zh: '做事' } }, perm('p.plain')] }
    const w = mount(PermissionTree, { props: { modules: [described], granted: new Set<string>() }, global: { plugins: [i18n] } })
    const titles = w.findAll('span[title]').map((s) => s.attributes('title'))
    expect(titles).toContain('p.active\nDoes things')
    expect(titles).toContain('p.plain')
  })
})
