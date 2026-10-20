import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { i18n } from '@/i18n'
import AccountFeatureSettings from './AccountFeatureSettings.vue'
import { defaultRequestPolicy, type AccountFeaturePolicy, type FeaturePreview } from './requestPolicy'
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: mocks }))
function response(over: Partial<FeaturePreview> = {}): FeaturePreview {
  return { cc_feature_policy: { mode: 'custom', overrides: { build_billing_sources: { cc_version: 'worker' } }, revision: 4 }, groups: [{ id: 1, name: 'One' }, { id: 2, name: 'Two' }], effective: defaultRequestPolicy(), inherited: defaultRequestPolicy(), sources: {}, editable: true, disabled_reason: '', policy_revision: '1/1/4', ...over }
}
const Host = defineComponent({ components: { AccountFeatureSettings }, setup() { const draft = ref<AccountFeaturePolicy>(); return { draft } }, template: '<AccountFeatureSettings v-model="draft" :account-id="9" :can-edit="true" />' })
async function settle() { await flushPromises(); await vi.advanceTimersByTimeAsync(200); await flushPromises() }
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); i18n.global.locale.value = 'zh'; mocks.get.mockResolvedValue(response()); mocks.post.mockResolvedValue(response()) })
afterEach(() => vi.useRealTimers())
describe('account feature preview', () => {
  it('previews a shared draft and clears all overrides when returning to follow', async () => {
    const w = mount(Host, { global: { plugins: [i18n] } }); await settle()
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/accounts/9/cc-features/preview', expect.objectContaining({ group_id: 1, cc_feature_policy: expect.objectContaining({ revision: 4 }) }), expect.anything())
    await w.get('[data-testid="account-feature-mode"] input[value="follow"]').setValue(true); await settle()
    expect(w.vm.draft).toEqual({ mode: 'follow', overrides: {}, revision: 4 })
    w.unmount()
  })
  it('retains draft values in a disallowed group while displaying effective sources', async () => {
    const w = mount(Host, { global: { plugins: [i18n] } }); await settle()
    mocks.post.mockResolvedValue(response({ editable: false, disabled_reason: 'account_override_disabled', sources: { 'build_billing_sources.cc_version': 'group' } }))
    await w.get('[data-testid="account-feature-group"]').setValue('1'); await settle()
    expect(w.vm.draft?.overrides.build_billing_sources?.cc_version).toBe('worker')
    const billing = () => w.get('[data-testid="billing-cc_version"]').findAll('input')
    expect(billing().every(i => i.attributes('disabled') !== undefined)).toBe(true)
    expect(billing().findIndex(i => (i.element as HTMLInputElement).checked)).toBe(1) // client, the effective value
    w.unmount()
  })
  it('ignores an older response after a newer group selection', async () => {
    const w = mount(Host, { global: { plugins: [i18n] } }); await settle()
    let finish!: (v: FeaturePreview) => void
    mocks.post.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await w.get('[data-testid="account-feature-group"]').setValue('1'); await settle()
    mocks.post.mockResolvedValue(response({ editable: true }))
    await w.get('[data-testid="account-feature-group"]').setValue('0'); await settle()
    finish(response({ editable: false, disabled_reason: 'group_disabled' })); await flushPromises()
    expect(w.get('[data-testid="billing-cc_version"]').findAll('input').some(i => i.attributes('disabled') === undefined)).toBe(true)
    w.unmount()
  })
  it('uses read-only GET previews when account updates are forbidden', async () => {
    const w = mount(AccountFeatureSettings, { props: { accountId: 9, canEdit: false }, global: { plugins: [i18n] } }); await settle()
    expect(mocks.post).not.toHaveBeenCalled()
    expect(w.get('[data-testid="billing-cc_version"]').findAll('input').every(i => i.attributes('disabled') !== undefined)).toBe(true)
    w.unmount()
  })

  it('an obsolete preview failure cannot replace the latest successful group preview', async () => {
    const w = mount(Host, { global: { plugins: [i18n] } }); await settle()
    let rejectOld!: (error: Error) => void
    mocks.post.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject }))
    await w.get('[data-testid="account-feature-group"]').setValue('1'); await settle()
    mocks.post.mockResolvedValue(response({ editable: true }))
    await w.get('[data-testid="account-feature-group"]').setValue('0'); await settle()
    rejectOld(new Error('obsolete preview failed')); await flushPromises()
    expect(w.text()).not.toContain('无法读取生效配置')
    expect(w.get('[data-testid="billing-cc_version"]').findAll('input').some(i => i.attributes('disabled') === undefined)).toBe(true)
    w.unmount()
  })

  it('changing account cancels a pending debounce before loading the new account draft', async () => {
    const w = mount(AccountFeatureSettings, { props: { accountId: 9, canEdit: true }, global: { plugins: [i18n] } }); await settle()
    await w.get('[data-testid="account-feature-group"]').setValue('1')
    let loadNew!: (value: FeaturePreview) => void
    mocks.get.mockImplementationOnce(() => new Promise(resolve => { loadNew = resolve }))
    await w.setProps({ accountId: 10 })
    await vi.advanceTimersByTimeAsync(200); await flushPromises()
    expect(mocks.post.mock.calls.filter(([path]) => path.includes('/accounts/10/'))).toHaveLength(0)
    loadNew(response({ cc_feature_policy: { mode: 'follow', overrides: {}, revision: 17 } }))
    await settle()
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ mode: 'follow', overrides: {}, revision: 17 })
    w.unmount()
  })
})
