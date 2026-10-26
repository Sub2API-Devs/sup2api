import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RequestPolicySettings from './RequestPolicySettings.vue'
import { defaultRequestPolicy, newRequestPolicy, normalizeRequestPolicy, validFeatureOverrides, validRequestPolicy, featureDifferenceCount, mergeFeaturePolicy, type FeatureOverrides } from './requestPolicy'

beforeEach(() => { i18n.global.locale.value = 'zh' })

describe('CC feature layer contract', () => {
  it('keeps historical defaults and applies worker defaults only to explicit new policies', () => {
    expect(normalizeRequestPolicy({ cli_version: '2.1.302' }).build_attachment_sources).toEqual({})
    // A saved CLI version is kept (the core checks it against the runtimes);
    // no saved one is the packaged default.
    expect(normalizeRequestPolicy({ cli_version: '2.1.302' }).cli_version).toBe('2.1.302')
    expect(normalizeRequestPolicy({}).cli_version).toBe('2.1.310')
    expect(newRequestPolicy().build_attachment_sources).toEqual({ platform_name: 'worker', os_version: 'worker' })
  })
  it('merges sparse nested values and counts only actual differences', () => {
    const parent = newRequestPolicy()
    const override = { build_attachment_sources: { platform_name: 'worker' as const, shell: 'erase' as const }, build_billing_sources: { cc_version: 'worker' as const } }
    expect(featureDifferenceCount(parent, override)).toBe(2)
    expect(mergeFeaturePolicy(parent, override).build_attachment_sources).toEqual({ platform_name: 'worker', os_version: 'worker', shell: 'erase' })
    expect(parent.build_attachment_sources).not.toHaveProperty('shell')
  })
  // The system prompt and each attachment and tool inherit on their own; an
  // omitted choice is its level's default (the four default tools are on).
  it('merges what a request without a billing header is given choice by choice', () => {
    const parent = { ...newRequestPolicy(), build_injection: { system_prompt: true, attachments: { environment: true, date: true } } }
    const override = { build_injection: { attachments: { date: false }, tools: { Read: true, Agent: true } } }
    expect(mergeFeaturePolicy(parent, override).build_injection).toEqual({ system_prompt: true, attachments: { environment: true, date: false }, tools: { Read: true, Agent: true } })
    expect(featureDifferenceCount(parent, override)).toBe(2)
    expect(parent.build_injection.attachments).toEqual({ environment: true, date: true })
    expect(validFeatureOverrides(override)).toBe(true)
    for (const bad of [{ build_injection: { tools: { Glob: true } } }, { build_injection: { tools: { ToolSearch: true } } }, { build_injection: { attachments: { skills: true } } }, { build_injection: { system_prompt: 'yes' } }]) {
      expect(validFeatureOverrides(bad as never)).toBe(false)
    }
  })
  it('rejects invalid and unknown source fields, billing erase and null overrides', () => {
    for (const overrides of [{ build_billing_sources: { cc_version: 'erase' } }, { build_attachment_sources: { user_email: 'erase' } }, { build_attachment_sources: null }, { relay_mode: null }, { relay_mode: 'native' }, { level: '' }, { level: 'medium' }, { cli_version: '2.1.304' }]) {
      expect(validFeatureOverrides(overrides as never)).toBe(false)
    }
    for (const overrides of [{ level: 'none' }, { level: 'high', relay_mode: 'build' }, { relay_mode: 'direct' }]) {
      expect(validFeatureOverrides(overrides as never)).toBe(true)
    }
    expect(validRequestPolicy({ ...defaultRequestPolicy(), schema_version: 1, build_attachment_sources: { worktree: 'erase', agent_proxy: 'worker' } })).toBe(true)
  })
  // An override's level wins; one saved before levels is read as the core
  // migrates it: direct is none, build lifts only an inherited none.
  it('resolves an override level and a legacy override mode like the core', () => {
    const low = defaultRequestPolicy(), none = { ...defaultRequestPolicy(), level: 'none' as const }
    expect(mergeFeaturePolicy(low, { level: 'high' }).level).toBe('high')
    expect(mergeFeaturePolicy(low, { level: 'micro', relay_mode: 'direct' }).level).toBe('micro')
    expect(mergeFeaturePolicy(low, { relay_mode: 'direct' }).level).toBe('none')
    expect(mergeFeaturePolicy(low, { relay_mode: 'build' }).level).toBe('low')
    expect(mergeFeaturePolicy(low, { relay_mode: 'build' })).not.toHaveProperty('relay_mode')
    const lifted = mergeFeaturePolicy(none, { relay_mode: 'build', build_attachment_sources: { shell: 'worker' } })
    expect(lifted.level).toBe('low')
    expect(lifted.build_injection).toEqual({ attachments: { environment: false, model: false, total_tokens: false, date: false } })
    expect(mergeFeaturePolicy(none, { relay_mode: 'build' }).level).toBe('micro')
    expect(featureDifferenceCount(low, { level: 'low' })).toBe(0)
    expect(featureDifferenceCount(low, { level: 'high', relay_mode: 'direct' })).toBe(1)
    expect(featureDifferenceCount(low, { relay_mode: 'direct' })).toBe(1)
    expect(featureDifferenceCount(low, { relay_mode: 'build' })).toBe(0)
  })
  it('offers twelve fields, forbids billing erase and shows the pinned version', async () => {
    const w = mount(RequestPolicySettings, { props: { modelValue: defaultRequestPolicy() }, global: { plugins: [i18n] } })
    const enabled = (testId: string) => w.get(`[data-testid="${testId}"]`).findAll('input').filter(i => i.attributes('disabled') === undefined).map(i => i.attributes('value'))
    // The field matrix is folded under its generated summary.
    expect(w.find('[data-testid^="build-attachment-"]').exists()).toBe(false)
    expect(w.get('[data-testid="environment-convert-summary"]').text()).toBe('全部保留客户端')
    await w.get('[data-testid="environment-convert-edit"] button').trigger('click')
    expect(w.findAll('[data-testid^="build-attachment-"]')).toHaveLength(10)
    expect(w.findAll('[data-testid^="billing-cc_"]').filter(x => x.attributes('role') === 'radiogroup')).toHaveLength(2)
    expect(w.get('[data-testid="cli-version"]').text()).toBe('CLI 2.1.310')
    expect(w.find('[data-testid="cli-version"] input').exists()).toBe(false)
    expect(enabled('billing-cc_version')).toEqual(['client', 'worker'])
    expect(enabled('build-attachment-shell')).toEqual(['client', 'worker', 'erase'])
    // The global layer has no follow toggles.
    expect(w.find('[data-testid^="layer-mode-"]').exists()).toBe(false)
    w.unmount()
  })
  it('summarizes the field conversion from its values', async () => {
    const w = mount(RequestPolicySettings, { props: { modelValue: { ...newRequestPolicy(), build_attachment_sources: { platform_name: 'worker', os_version: 'worker', shell: 'erase' } } }, global: { plugins: [i18n] } })
    expect(w.get('[data-testid="environment-convert-summary"]').text()).toBe('平台名称、系统版本用服务端；擦除 1 项；其余保留客户端')
    await w.setProps({ modelValue: { ...newRequestPolicy(), build_attachment_sources: { platform_name: 'worker', os_version: 'worker', shell: 'worker', worktree: 'worker' } } })
    expect(w.get('[data-testid="environment-convert-summary"]').text()).toBe('4 项用服务端；其余保留客户端')
    w.unmount()
  })
  // Each configurable card follows or customizes as a whole; a following card
  // shows what it inherits, read-only, and customizing copies all of it.
  it('follows or customizes each layer as a whole at a group', async () => {
    const inherited = { ...newRequestPolicy(), level: 'low' as const, build_billing_sources: { cc_version: 'worker' as const } }
    const w = mount(RequestPolicySettings, { props: { modelValue: inherited, inherited, overrides: {} }, global: { plugins: [i18n] } })
    const mode = (layer: string) => w.get(`[data-testid="layer-mode-${layer}"]`).findAll('input').find(i => (i.element as HTMLInputElement).checked)?.attributes('value')
    for (const layer of ['level', 'billing', 'environment', 'prompt']) expect(mode(layer)).toBe('follow')
    // Following shows the inherited values, greyed.
    expect(w.get<HTMLSelectElement>('[data-testid="request-level"]').element.value).toBe('2')
    expect(w.get('[data-testid="request-level"]').attributes('disabled')).toBeDefined()
    expect(w.get<HTMLInputElement>('[data-testid="billing-cc_version"] input[value="worker"]').element.checked).toBe(true)
    expect(w.get('[data-testid="billing-cc_version"]').findAll('input').every(i => i.attributes('disabled') !== undefined)).toBe(true)
    expect(w.get('[data-testid="injection-attachments-date"] button').attributes('disabled')).toBeDefined()
    // The prompt layer is above low: folded, and its toggle waits for the level.
    expect(w.get('[data-testid="prompt-tools"]').attributes('data-locked')).toBe('true')
    expect(w.get('[data-testid="layer-mode-prompt"] input').attributes('disabled')).toBeDefined()
    await w.get('[data-testid="layer-mode-billing"] input[value="custom"]').setValue(true)
    expect(w.emitted('update:overrides')?.at(-1)?.[0]).toEqual({ build_billing_entrypoint: 'sdk-cli', build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'client' } })
    await w.setProps({ overrides: w.emitted('update:overrides')!.at(-1)![0] as FeatureOverrides })
    expect(mode('billing')).toBe('custom')
    await w.get('[data-testid="billing-cc_entrypoint"] input[value="worker"]').setValue(true)
    expect(w.emitted('update:overrides')?.at(-1)?.[0]).toEqual({ build_billing_entrypoint: 'sdk-cli', build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'worker' } })
    await w.get('[data-testid="layer-mode-billing"] input[value="follow"]').setValue(true)
    expect(w.emitted('update:overrides')?.at(-1)?.[0]).toEqual({})
    // Customizing the environment writes all ten fields and all four attachments.
    await w.get('[data-testid="layer-mode-environment"] input[value="custom"]').setValue(true)
    const env = w.emitted('update:overrides')!.at(-1)![0] as Record<string, Record<string, unknown>>
    expect(Object.keys(env.build_attachment_sources!)).toHaveLength(10)
    expect(env.build_attachment_sources).toMatchObject({ platform_name: 'worker', os_version: 'worker', shell: 'client' })
    expect(env.build_injection).toEqual({ attachments: { environment: true, model: true, total_tokens: true, date: true } })
    w.unmount()
  })
  // A layer above the level folds away with the level it needs; its choices
  // stay in the overrides. Billing applies at every level.
  it('retains a customized layer when a lower level folds it', async () => {
    const w = mount(RequestPolicySettings, { props: { modelValue: defaultRequestPolicy(), inherited: defaultRequestPolicy(), overrides: { build_attachment_sources: { shell: 'worker', os_version: 'erase' } } }, global: { plugins: [i18n] } })
    await w.get('[data-testid="environment-convert-edit"] button').trigger('click')
    await w.get('[data-testid="build-attachment-shell"]').findAll('input')[0]!.setValue(true)
    expect(w.emitted('update:overrides')?.[0]?.[0]).toEqual({ build_attachment_sources: { shell: 'client', os_version: 'erase' } })
    for (const overrides of [{ level: 'none' as const, build_attachment_sources: { shell: 'worker' as const } }, { relay_mode: 'direct' as const, build_attachment_sources: { shell: 'worker' as const } }]) {
      await w.setProps({ overrides })
      expect(w.find('[data-testid="build-attachment-shell"]').exists()).toBe(false)
      expect(w.get('[data-testid="build-attachments"]').attributes('data-locked')).toBe('true')
      expect(w.get('[data-testid="build-attachments"]').text()).toContain('提升到低注入后生效')
      expect(w.get('[data-testid="identity-lines"]').text()).toContain('提升到微注入后生效')
      expect(w.find('[data-testid="billing-cc_version"]').exists()).toBe(true)
      expect(w.get<HTMLSelectElement>('[data-testid="request-level"]').element.value).toBe('0')
      // A legacy relay mode alone already customizes the level.
      expect(w.get<HTMLInputElement>('[data-testid="layer-mode-level"] input[value="custom"]').element.checked).toBe(true)
    }
    w.unmount()
  })
  it('writes only the level of a customized level layer and follows by deleting it', async () => {
    const w = mount(RequestPolicySettings, { props: { modelValue: defaultRequestPolicy(), inherited: { ...defaultRequestPolicy(), level: 'micro' }, overrides: { relay_mode: 'direct' } }, global: { plugins: [i18n] } })
    expect(w.get('[data-testid="request-level"]').findAll('option').map(o => o.text())).toEqual(['0 注入', '微注入', '低注入（默认）', '高注入'])
    await w.get('[data-testid="request-level"]').setValue('3')
    expect(w.emitted('update:overrides')?.at(-1)?.[0]).toEqual({ level: 'high' })
    await w.setProps({ overrides: { level: 'high' } })
    expect(w.get('[data-testid="prompt-tools"]').attributes('data-locked')).toBeUndefined()
    expect(w.get('[data-testid="level-desc"]').text()).toContain('内置系统提示词')
    await w.get('[data-testid="layer-mode-level"] input[value="follow"]').setValue(true)
    expect(w.emitted('update:overrides')?.at(-1)?.[0]).toEqual({})
    await w.setProps({ overrides: {} })
    expect(w.get<HTMLSelectElement>('[data-testid="request-level"]').element.value).toBe('1')
    await w.get('[data-testid="layer-mode-level"] input[value="custom"]').setValue(true)
    expect(w.emitted('update:overrides')?.at(-1)?.[0]).toEqual({ level: 'micro' })
    w.unmount()
  })
})
