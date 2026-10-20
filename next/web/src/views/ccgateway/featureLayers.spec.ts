import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RequestPolicySettings from './RequestPolicySettings.vue'
import { defaultRequestPolicy, newRequestPolicy, normalizeRequestPolicy, validFeatureOverrides, validRequestPolicy, featureDifferenceCount, mergeFeaturePolicy } from './requestPolicy'

describe('CC feature layer contract', () => {
  it('keeps historical defaults and applies worker defaults only to explicit new policies', () => {
    expect(normalizeRequestPolicy({ cli_version: '2.1.302' }).build_attachment_sources).toEqual({})
    expect(normalizeRequestPolicy({ cli_version: '2.1.302' }).cli_version).toBe('2.1.304')
    expect(newRequestPolicy().build_attachment_sources).toEqual({ platform_name: 'worker', os_version: 'worker' })
  })
  it('merges sparse nested values and counts only actual differences', () => {
    const parent = newRequestPolicy()
    const override = { build_attachment_sources: { platform_name: 'worker' as const, shell: 'erase' as const }, build_billing_sources: { cc_version: 'worker' as const } }
    expect(featureDifferenceCount(parent, override)).toBe(2)
    expect(mergeFeaturePolicy(parent, override).build_attachment_sources).toEqual({ platform_name: 'worker', os_version: 'worker', shell: 'erase' })
    expect(parent.build_attachment_sources).not.toHaveProperty('shell')
  })
  it('rejects invalid and unknown source fields, billing erase and null overrides', () => {
    for (const overrides of [{ build_billing_sources: { cc_version: 'erase' } }, { build_attachment_sources: { user_email: 'erase' } }, { build_attachment_sources: null }, { relay_mode: null }, { cli_version: '2.1.304' }]) {
      expect(validFeatureOverrides(overrides as never)).toBe(false)
    }
    expect(validRequestPolicy({ ...defaultRequestPolicy(), schema_version: 2, build_attachment_sources: { worktree: 'erase', agent_proxy: 'worker' } })).toBe(true)
  })
  it('offers twelve fields, forbids billing erase and pins version read-only', () => {
    const w = mount(RequestPolicySettings, { props: { modelValue: defaultRequestPolicy() }, global: { plugins: [i18n] } })
    expect(w.findAll('[data-testid^="build-attachment-"]')).toHaveLength(10)
    expect(w.findAll('[data-testid^="billing-"]').filter(x => x.element.tagName === 'SELECT')).toHaveLength(2)
    expect(w.get<HTMLInputElement>('[data-testid="cli-version"]').element.readOnly).toBe(true)
    expect(w.get<HTMLSelectElement>('[data-testid="billing-cc_version"]').element.options).toHaveLength(2)
    expect(w.get<HTMLSelectElement>('[data-testid="build-attachment-shell"]').element.options).toHaveLength(3)
    w.unmount()
  })
  it('removes only an overridden field on follow and retains sources when direct disables editing', async () => {
    const w = mount(RequestPolicySettings, { props: { modelValue: defaultRequestPolicy(), inherited: defaultRequestPolicy(), overrides: { build_attachment_sources: { shell: 'worker', os_version: 'erase' } } }, global: { plugins: [i18n] } })
    await w.get('[data-testid="build-attachment-shell"]').setValue('0')
    expect(w.emitted('update:overrides')?.[0]?.[0]).toEqual({ build_attachment_sources: { os_version: 'erase' } })
    await w.setProps({ overrides: { relay_mode: 'direct', build_attachment_sources: { shell: 'worker' } } })
    expect(w.get<HTMLSelectElement>('[data-testid="build-attachment-shell"]').element.disabled).toBe(true)
    expect(w.get<HTMLSelectElement>('[data-testid="billing-cc_version"]').element.disabled).toBe(true)
    w.unmount()
  })
})
