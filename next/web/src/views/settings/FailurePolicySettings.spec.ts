import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { SInput, SModal, SSelect, SSwitch, STextarea } from '@sub2api/ui'
import { i18n } from '@/i18n'
import FailurePolicySettings from './FailurePolicySettings.vue'
import FailureRuleModal from './FailureRuleModal.vue'
import FailureRuleEditor from './FailureRuleEditor.vue'
import FailureRulesTable from './FailureRulesTable.vue'
import FailurePolicyPreview from './FailurePolicyPreview.vue'
import FailurePolicyControls from './FailurePolicyControls.vue'
import { editablePolicy, emptyFailurePolicy, newFailureRule, normalizedPolicy, retryAccountSequence } from './failurePolicy'
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }))
const permissions = vi.hoisted(() => ({ manage: true }))
vi.mock('@sub2api/host', async importOriginal => ({ ...(await importOriginal<typeof import('@sub2api/host')>()), api }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => permissions.manage }) }))
enableAutoUnmount(afterEach)
const global = { plugins: [i18n], stubs: { teleport: true } }
function fixture() {
  const policy = emptyFailurePolicy()
  policy.revision = 7
  policy.retry_enabled = true
  policy.retry_rules = [newFailureRule('429 换号', false)]
  policy.retry_rules[0]!.match.status_codes = '429'
  return policy
}
beforeEach(() => {
  vi.clearAllMocks()
  permissions.manage = true
  i18n.global.locale.value = 'zh'
  api.get.mockResolvedValue({ configured: true, policy: fixture() })
  api.put.mockImplementation((_path, body) => Promise.resolve({ configured: true, policy: { ...body.policy, revision: 8 } }))
})
describe('simplified failure settings', () => {
  it('keeps five additional retries in pairs and reveals only active account controls', async () => {
    const policy = { ...fixture(), max_retries: 5, retries_per_account: 2 }
    expect(retryAccountSequence(policy)).toEqual(['A', 'A', 'A', 'B', 'B', 'C'])
    const wrapper = mount(FailurePolicyControls, {
      props: { modelValue: { ...policy, switch_account: false }, disabled: false, errors: {} },
      global
    })
    expect(wrapper.find('input[aria-label="单账号重试次数"]').exists()).toBe(false)
    await wrapper.setProps({ modelValue: policy })
    expect(wrapper.find('input[aria-label="单账号重试次数"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="retry-sequence"]').text()).toContain('A → A → A → B → B → C')
    expect(wrapper.findAllComponents(SSwitch)).toHaveLength(1)
  })
  it('has only Save, with no removed controls, history or per-rule switches', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    expect(wrapper.get('[data-testid="settings-save"]').text()).toBe('保存')
    expect(wrapper.find('[data-testid="settings-reset"]').exists()).toBe(false)
    for (const label of ['历史版本', '累计等待上限', 'Retry-After', '换号出口限制']) expect(wrapper.text()).not.toContain(label)
    expect(wrapper.get('[data-testid="retry-rules"]').findAllComponents(SSwitch)).toHaveLength(0)
  })
  it('saves a fixed v3 plan and ignores inactive empty retry counts', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    const controls = wrapper.findComponent(FailurePolicyControls)
    controls.findAllComponents(SInput)[1]!.vm.$emit('update:modelValue', null)
    controls.findComponent(SSwitch).vm.$emit('update:modelValue', false)
    await flushPromises()
    await wrapper.get('[data-testid="settings-save"]').trigger('click')
    await flushPromises()
    expect(api.put.mock.calls[0]![1]).toMatchObject({
      expected_revision: 7,
      policy: {
        schema_version: 3,
        reset_sticky: true,
        switch_account: false,
        retries_per_account: 0,
        respect_retry_after: false,
        max_wait_ms: 0,
        egress: 'account_configured'
      }
    })
    expect(wrapper.get('[data-testid="settings-save"]').attributes('disabled')).toBeDefined()
  })
  it.each([null, 1.5])('rejects empty or fractional retry budgets: %s', async value => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    wrapper.findComponent(FailurePolicyControls).findAllComponents(SInput)[0]!.vm.$emit('update:modelValue', value)
    await flushPromises()
    await wrapper.get('[data-testid="settings-save"]').trigger('click')
    expect(api.put).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请填写整数，不能留空')
  })
  it('migrates only on save and preserves the original policy', async () => {
    const old = fixture()
    old.schema_version = 1
    old.retry_rules[0]!.same_account_retries = 2
    old.retry_rules[0]!.exhausted_action = 'switch_reset'
    const account = newFailureRule('账号错误', true)
    account.action = 'cooldown'
    account.match.status_codes = '401'
    old.account_rules = [account]
    const draft = editablePolicy(old)
    expect(draft).toMatchObject({ schema_version: 3, retries_per_account: 2, switch_account: true, reset_sticky: true })
    expect(draft.account_rules[0]!.action).toBe('disable')
    expect(old.account_rules[0]!.action).toBe('cooldown')
    api.get.mockResolvedValue({ configured: true, policy: old })
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    expect(wrapper.text()).toContain('保存前仍执行原策略')
    expect(api.put).not.toHaveBeenCalled()
  })
  it('keeps edits on revision conflict', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    wrapper.findComponent(FailurePolicyControls).findAllComponents(SInput)[0]!.vm.$emit('update:modelValue', 5)
    await flushPromises()
    api.put.mockRejectedValue(new Error('策略已更新，请重新加载'))
    await wrapper.get('[data-testid="settings-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('策略已更新')
    expect(wrapper.findComponent(FailurePolicyControls).findAllComponents(SInput)[0]!.props('modelValue')).toBe(5)
  })
  it('lets read-only users inspect scopes but prevents all mutations', async () => {
    permissions.manage = false
    const p = fixture()
    p.retry_rules[0]!.match.models = ['limited-model']
    api.get.mockResolvedValue({ configured: true, policy: p })
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    expect(wrapper.find('[data-testid="settings-save"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="edit-rule"]').exists()).toBe(false)
    expect(wrapper.find('[data-reorder-handle]').exists()).toBe(false)
    await wrapper.get('[data-testid="retry-rules"] button[aria-expanded]').trigger('click')
    expect(wrapper.get('[data-testid="failure-rule-details"]').text()).toContain('limited-model')
  })
})
describe('rule interaction', () => {
  it('opens add, edit and copy without crypto.randomUUID', async () => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('unavailable in HTTP')
    })
    const rule = fixture().retry_rules[0]!
    const wrapper = mount(FailureRulesTable, { props: { modelValue: [rule], account: false, disabled: false }, global })
    await wrapper.get('[data-testid="add-rule"]').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(SModal).props('open')).toBe(true)
    await wrapper.get('[data-testid="rule-name"]').setValue('多个错误码')
    await wrapper.get('[data-testid="rule-codes"]').setValue('401，403,429,500-599')
    await wrapper.get('[data-testid="apply-rule"]').trigger('click')
    const rows = wrapper.emitted('update:modelValue')![0]![0] as (typeof rule)[]
    expect(rows[1]!.match.status_codes).toBe('401,403,429,500-599')
    await wrapper.get('[data-testid="edit-rule"]').trigger('click')
    expect(wrapper.findComponent(FailureRuleModal).props('rule')!.name).toBe(rule.name)
    wrapper.findComponent(SModal).vm.$emit('update:open', false)
    await flushPromises()
    await wrapper.get('[data-testid="copy-rule"]').trigger('click')
    expect(wrapper.findComponent(FailureRuleModal).props('rule')!.id).not.toBe(rule.id)
  })
  it('uses public table handles and direct actions', async () => {
    const rules = [newFailureRule('A', false), newFailureRule('B', false)]
    const wrapper = mount(FailureRulesTable, { props: { modelValue: rules, account: false, disabled: false }, global })
    await wrapper.get('[data-reorder-handle="0"]').trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[rules[1], rules[0]]])
    expect(wrapper.find('[aria-haspopup="menu"]').exists()).toBe(false)
    expect(wrapper.findAll('thead th').map(cell => cell.text())).toEqual(['', '规则名称', '错误码', '关键词', '操作'])
  })
  it('rejects invalid or empty conditions inside the modal', async () => {
    const wrapper = mount(FailureRuleModal, { props: { open: true, rule: null, account: true }, global })
    await wrapper.get('[data-testid="apply-rule"]').trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.text()).toContain('至少填写一项')
    wrapper.findAllComponents(SInput)[1]!.vm.$emit('update:modelValue', '500-401')
    await wrapper.get('[data-testid="apply-rule"]').trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()
  })
  it('saves keyword-only disable rules, one keyword per line, without action controls', async () => {
    const wrapper = mount(FailureRuleModal, { props: { open: true, rule: null, account: true }, global })
    const textarea = wrapper.findComponent(STextarea)
    expect(textarea.props('rows')).toBe(6)
    textarea.vm.$emit('update:modelValue', ' quota \n\npermission denied')
    await wrapper.get('[data-testid="apply-rule"]').trigger('click')
    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      enabled: true,
      action: 'disable',
      match: { status_codes: '', keywords: ['quota', 'permission denied'] }
    })
    expect(wrapper.find('[data-testid="rule-action"]').exists()).toBe(false)
    expect(wrapper.findAllComponents(SSwitch)).toHaveLength(0)
  })
  it('clears status conditions when selecting transport errors', async () => {
    const rule = fixture().retry_rules[0]!
    const wrapper = mount(FailureRuleEditor, { props: { modelValue: rule, account: false }, global })
    await wrapper.get('button[aria-expanded]').trigger('click')
    wrapper
      .findAllComponents(SSelect)
      .find(s => s.attributes('data-testid') === 'rule-source')!
      .vm.$emit('update:modelValue', 'transport')
    await flushPromises()
    expect(rule.match.status_codes).toBe('')
    expect(normalizedPolicy(fixture()).retry_rules[0]!.match.keywords).toEqual([])
  })
})
describe('rule preview', () => {
  it('rejects missing active retry count before preview', async () => {
    const wrapper = mount(FailurePolicyPreview, { props: { policy: { ...fixture(), retries_per_account: null } }, global })
    await wrapper.get('[data-testid="preview-policy"]').trigger('click')
    expect(api.post).not.toHaveBeenCalled()
  })
  it('previews simplified rules without removed limits or side effects', async () => {
    api.post.mockResolvedValue({
      decision: { action: 'retry', account_action: 'disable', egress: 'account_configured' },
      text_truncated: false
    })
    const wrapper = mount(FailurePolicyPreview, { props: { policy: fixture() }, global })
    await wrapper.get('[data-testid="preview-policy"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="policy-preview-result"]').text()).not.toContain('换号出口限制')
    expect(api.put).not.toHaveBeenCalled()
  })
})
