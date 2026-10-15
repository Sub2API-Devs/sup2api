import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { SInput, SModal, SDropdown, SSelect, SSwitch } from '@sub2api/ui'
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
  policy.retry_rules[0]!.action = 'retry'
  return policy
}
beforeEach(() => {
  vi.clearAllMocks()
  permissions.manage = true
  i18n.global.locale.value = 'zh'
  api.get.mockResolvedValue({ configured: true, policy: fixture() })
})

describe('core failure policy settings', () => {
  it('shows five extra retries allocated in pairs across accounts', () => {
    const policy = { ...fixture(), max_retries: 5, retries_per_account: 2 }
    expect(retryAccountSequence(policy)).toEqual(['A', 'A', 'A', 'B', 'B', 'C'])
    expect(retryAccountSequence({ ...policy, switch_account: false })).toEqual(['A', 'A', 'A', 'A', 'A', 'A'])
    expect(retryAccountSequence({ ...policy, retries_per_account: 0 })).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    const wrapper = mount(FailurePolicyControls, { props: { modelValue: policy, disabled: false, errors: {} }, global })
    expect(wrapper.get('[data-testid="retry-sequence"]').text()).toContain('A → A → A → B → B → C')
  })

  it('keeps legacy migration in a visible draft until explicitly published', async () => {
    const legacy = fixture()
    legacy.schema_version = 1
    legacy.retry_rules[0]!.same_account_retries = 2
    legacy.retry_rules[0]!.exhausted_action = 'switch_reset'
    const draft = editablePolicy(legacy)
    expect(draft).toMatchObject({ schema_version: 2, retries_per_account: 2, switch_account: true, reset_sticky: true })
    expect(legacy.schema_version).toBe(1)
    api.get.mockResolvedValue({ configured: true, policy: legacy })
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    expect(wrapper.text()).toContain('统一重试计划的迁移草稿')
    expect(api.put).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="settings-save"]').attributes('disabled')).toBeUndefined()
  })

  it('publishes keyword-only rules without adding a status condition', async () => {
    const p = fixture()
    p.retry_rules[0]!.match.status_codes = ''
    p.retry_rules[0]!.match.keywords = [' quota ']
    api.get.mockResolvedValue({ configured: true, policy: p })
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    wrapper.findComponent(FailurePolicyControls).findAllComponents(SInput)[0]!.vm.$emit('update:modelValue', 5)
    await flushPromises()
    api.put.mockImplementation((_path, body) => Promise.resolve({ configured: true, policy: { ...body.policy, revision: 8 } }))
    await wrapper.get('[data-testid="settings-save"]').trigger('click')
    await flushPromises()
    expect(api.put.mock.calls[0]![1].policy.retry_rules[0].match).toMatchObject({ status_codes: '', keywords: ['quota'] })
  })

  it.each([null, 1.5])('rejects empty or fractional budgets before publishing: %s', async value => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    wrapper.findComponent(FailurePolicyControls).findAllComponents(SInput)[0]!.vm.$emit('update:modelValue', value)
    await flushPromises()
    await wrapper.get('[data-testid="settings-save"]').trigger('click')
    await flushPromises()
    expect(api.put).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请填写整数，不能留空')
  })

  it('allows read-only users to inspect scopes, retry limits and follow-up actions', async () => {
    permissions.manage = false
    const p = fixture()
    const rule = p.retry_rules[0]!
    rule.match.groups = [17]
    rule.match.models = ['limited-model']
    rule.match.protocols = ['anthropic']
    rule.action = 'retry'
    p.retries_per_account = 3
    api.get.mockResolvedValue({ configured: true, policy: p })
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    await wrapper.get('[data-testid="retry-rules"] button[aria-expanded]').trigger('click')
    const details = wrapper.get('[data-testid="failure-rule-details"]')
    expect(details.text()).toContain('17')
    expect(details.text()).toContain('limited-model')
    expect(details.text()).toContain('anthropic')
    expect(details.text()).toContain('按统一计划重试')
    expect(wrapper.findComponent(FailurePolicyControls).findAllComponents(SInput)[1]!.props('modelValue')).toBe(3)
    expect(details.findAll('input, textarea, select')).toHaveLength(0)
    expect(wrapper.find('[data-testid="settings-save"]').exists()).toBe(false)
  })
  it('publishes status-only rules with the loaded revision and preserves empty keywords', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    const toggle = wrapper.findAllComponents(SSwitch)[0]!
    toggle.vm.$emit('update:modelValue', false)
    await flushPromises()
    api.put.mockImplementation((_path, body) => Promise.resolve({ configured: true, policy: { ...body.policy, revision: 8 } }))
    await wrapper.get('[data-testid="settings-save"]').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith(
      '/settings/failure-policy',
      expect.objectContaining({
        expected_revision: 7,
        policy: expect.objectContaining({
          retry_enabled: false,
          retry_rules: [expect.objectContaining({ match: expect.objectContaining({ status_codes: '429', keywords: [] }) })]
        })
      })
    )
    expect(wrapper.text()).toContain('策略版本 8')
  })

  it('discards nested edits without corrupting the saved policy', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    wrapper.findAllComponents(SSwitch).at(-1)!.vm.$emit('update:modelValue', false)
    await flushPromises()
    await wrapper.get('[data-testid="settings-reset"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAllComponents(SSwitch).at(-1)!.props('modelValue')).toBe(true)
    expect(wrapper.get('[data-testid="settings-save"]').attributes('disabled')).toBeDefined()
  })

  it('uses the shared save bar and disallows all mutations for read-only users', async () => {
    permissions.manage = false
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    expect(wrapper.find('[data-testid="settings-save"]').exists()).toBe(false)
    expect(wrapper.findAllComponents(SSwitch).every(s => s.props('disabled'))).toBe(true)
    expect(wrapper.findAllComponents(SDropdown)).toHaveLength(0)
  })

  it('keeps the draft on revision conflict', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    wrapper.findAllComponents(SSwitch)[0]!.vm.$emit('update:modelValue', false)
    await flushPromises()
    api.put.mockRejectedValue(new Error('策略已更新，请重新加载'))
    await wrapper.get('[data-testid="settings-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('策略已更新')
    expect(wrapper.findAllComponents(SSwitch)[0]!.props('modelValue')).toBe(false)
  })
})

describe('shared rule editor and table', () => {
  it('edits an isolated modal draft and discards it on cancel', async () => {
    const rule = fixture().retry_rules[0]!
    const wrapper = mount(FailureRuleModal, { props: { open: false, rule, account: false }, global })
    await wrapper.setProps({ open: true })
    wrapper.findAllComponents(SInput)[0]!.vm.$emit('update:modelValue', 'changed')
    await flushPromises()
    wrapper.findComponent(SModal).vm.$emit('update:open', false)
    expect(rule.name).toBe('429 换号')
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('reorders with the existing table action menu', async () => {
    const a = newFailureRule('A', false),
      b = newFailureRule('B', false)
    const wrapper = mount(FailureRulesTable, { props: { modelValue: [a, b], account: false, disabled: false }, global })
    wrapper.findAllComponents(SDropdown)[0]!.vm.$emit('select', 'down')
    await flushPromises()
    const updated = wrapper.emitted('update:modelValue')![0]![0] as (typeof a)[]
    expect(updated.map(r => r.name)).toEqual(['B', 'A'])
  })

  it('clears impossible status filters when changing to transport errors', async () => {
    const rule = fixture().retry_rules[0]!
    const wrapper = mount(FailureRuleEditor, { props: { modelValue: rule, account: false }, global })
    wrapper.findAllComponents(SSelect)[0]!.vm.$emit('update:modelValue', 'transport')
    await flushPromises()
    expect(rule.match.status_codes).toBe('')
    expect(normalizedPolicy(fixture()).retry_rules[0]!.match.keywords).toEqual([])
  })

  it('offers only return and shared retry actions in request rules', () => {
    const rule = fixture().retry_rules[0]!
    const wrapper = mount(FailureRuleEditor, { props: { modelValue: rule, account: false }, global })
    const actions = wrapper.findAllComponents(SSelect).at(-1)!.props('options')
    expect(actions.map(option => option.value)).toEqual(['return', 'retry'])
    expect(wrapper.text()).not.toContain('原账号最多额外重试次数')
  })
})

describe('read-only rule preview', () => {
  it('rejects empty budgets before previewing', async () => {
    const wrapper = mount(FailurePolicyPreview, { props: { policy: { ...fixture(), max_wait_ms: null } }, global })
    await wrapper.get('[data-testid="preview-policy"]').trigger('click')
    await flushPromises()
    expect(api.post).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请填写整数，不能留空')
  })
  it('renders readable decisions without executing or publishing', async () => {
    api.post.mockResolvedValue({
      decision: { action: 'switch_reset', account_action: 'none', retry_rule: fixture().retry_rules[0]!.id },
      text_truncated: false
    })
    const wrapper = mount(FailurePolicyPreview, { props: { policy: fixture() }, global })
    await wrapper.get('[data-testid="preview-policy"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="policy-preview-result"]').text()).toContain('换号，重置绑定')
    expect(api.post).toHaveBeenCalledWith('/settings/failure-policy/preview', expect.any(Object))
    expect(api.put).not.toHaveBeenCalled()
  })
})
