import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { SInput, SModal, SSelect, SSwitch } from '@sub2api/ui'
import { ApiError } from '@sub2api/host'
import { i18n } from '@/i18n'
import FailurePolicySettings from './FailurePolicySettings.vue'
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
  it('saves sections independently, preserves the other draft and advances the revision', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    const retry = wrapper.get('[data-testid="retry-rules"]')
    const account = wrapper.get('[data-testid="account-rules"]')
    await retry.get('[data-testid="rule-name"]').setValue('新重试名称')
    await account.get('[data-testid="add-rule"]').trigger('click')
    await wrapper.get('[data-testid="retry-save"]').trigger('click')
    await flushPromises()
    expect(api.put.mock.calls[0]![1].policy.account_rules).toEqual([])
    expect(account.findAll('[data-testid="rule-name"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="retry-save"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="account-save"]').attributes('disabled')).toBeUndefined()
    await account.get('[data-testid="rule-codes"]').setValue('401')
    await retry.get('[data-testid="rule-codes"]').setValue('invalid draft')
    await wrapper.get('[data-testid="account-save"]').trigger('click')
    await flushPromises()
    expect(api.put.mock.calls[1]![1]).toMatchObject({ expected_revision: 8, policy: {
      retry_rules: [{ name: '新重试名称', match: { status_codes: '429' } }],
      account_rules: [{ match: { status_codes: '401' } }]
    } })
    expect((retry.get('[data-testid="rule-codes"]').element as HTMLInputElement).value).toBe('invalid draft')
    expect(wrapper.get('[data-testid="account-save"]').attributes('disabled')).toBeDefined()
  })

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
    expect(wrapper.get('[data-testid="retry-settings"] [data-testid="retry-save"]').text()).toBe('保存')
    expect(wrapper.get('[data-testid="disable-settings"] [data-testid="account-save"]').text()).toBe('保存')
    expect(wrapper.find('[data-testid="settings-save"]').exists()).toBe(false)
    expect(wrapper.findAll('h3').filter(h => h.text() === '调度策略')).toHaveLength(0)
    expect(i18n.global.t('failurePolicy.title')).toBe('调度策略')
    expect(wrapper.find('[data-testid="settings-reset"]').exists()).toBe(false)
    for (const label of ['历史版本', '累计等待上限', 'Retry-After', '换号出口限制']) expect(wrapper.text()).not.toContain(label)
    // The only per-rule switch is Go regex; rules have no enable switch.
    expect(wrapper.get('[data-testid="retry-rules"]').findAll('[data-testid="rule-regex"]').map(s => s.attributes('aria-label'))).toEqual(['Go 正则'])
    expect(wrapper.get('[data-testid="retry-rules"]').findAllComponents(SSwitch)).toHaveLength(1)
  })
  it('saves a fixed v4 plan and ignores inactive empty retry counts', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    const controls = wrapper.findComponent(FailurePolicyControls)
    controls.findAllComponents(SInput)[1]!.vm.$emit('update:modelValue', null)
    controls.findComponent(SSwitch).vm.$emit('update:modelValue', false)
    await flushPromises()
    await wrapper.get('[data-testid="retry-save"]').trigger('click')
    await flushPromises()
    expect(api.put.mock.calls[0]![1]).toMatchObject({
      expected_revision: 7,
      policy: {
        schema_version: 4,
        reset_sticky: true,
        switch_account: false,
        retries_per_account: 0,
        respect_retry_after: false,
        max_wait_ms: 0,
        egress: 'account_configured'
      }
    })
    expect(wrapper.get('[data-testid="retry-save"]').attributes('disabled')).toBeDefined()
  })
  it.each([null, 1.5])('rejects empty or fractional retry budgets: %s', async value => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    wrapper.findComponent(FailurePolicyControls).findAllComponents(SInput)[0]!.vm.$emit('update:modelValue', value)
    await flushPromises()
    await wrapper.get('[data-testid="retry-save"]').trigger('click')
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
    expect(draft).toMatchObject({ schema_version: 4, retries_per_account: 2, switch_account: true, reset_sticky: true })
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
    await wrapper.get('[data-testid="retry-save"]').trigger('click')
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
    expect(wrapper.find('[data-testid="retry-save"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="account-save"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="edit-rule"]').exists()).toBe(false)
    expect(wrapper.find('[data-reorder-handle]').exists()).toBe(false)
    for (const input of wrapper.findAll('[data-testid="retry-rules"] input, [data-testid="retry-rules"] textarea')) expect(input.attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="retry-rules"] button[aria-expanded]').trigger('click')
    expect(wrapper.get('[data-testid="failure-rule-details"]').text()).toContain('limited-model')
  })
})
describe('rule interaction', () => {
  it('saves Go expressions verbatim one per line without a relationship control', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    const table = wrapper.get('[data-testid="retry-rules"]')
    await table.get('[data-testid="rule-regex"]').setValue(true)
    await table.get('[data-testid="rule-keywords"]').setValue('^QUOTA\\D+$\n\n(?i)denied')
    expect(table.find('[data-testid="rule-mode"]').exists()).toBe(false)
    expect(table.text()).not.toContain('条件关系')
    await wrapper.get('[data-testid="retry-save"]').trigger('click')
    expect(api.put.mock.calls[0]![1].policy.retry_rules[0].match).toMatchObject({
      keyword_regex: true, keywords: ['^QUOTA\\D+$', '', '(?i)denied'], mode: 'all'
    })
  })
  it('shows Go validation errors on the correct row after sorting and clears corrected row errors', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    const table = wrapper.get('[data-testid="retry-rules"]')
    await table.get('[data-testid="rule-regex"]').setValue(true)
    await table.get('[data-testid="rule-keywords"]').setValue('quota\n\n[')
    api.put.mockRejectedValue(new ApiError(400, { code: 'invalid_argument', message: '无效的参数', details: {
      fields: [{ field: 'retry_rules.0.match.keywords', message: '第 3 行：Go 正则表达式无效' }]
    } }))
    await wrapper.get('[data-testid="retry-save"]').trigger('click')
    await flushPromises()
    expect(table.get('[data-testid="rule-keywords"]').attributes('aria-invalid')).toBe('true')
    expect(table.text()).toContain('第 3 行')
    await table.get('[data-testid="add-rule"]').trigger('click')
    await table.get('[data-reorder-handle="0"]').trigger('keydown', { key: 'ArrowDown' })
    expect(table.findAll('[data-testid="rule-keywords"]')[1]!.attributes('aria-invalid')).toBe('true')
    await table.findAll('[data-testid="rule-keywords"]')[1]!.setValue('valid')
    expect(table.findAll('[data-testid="rule-keywords"]')[1]!.attributes('aria-invalid')).not.toBe('true')
  })

  it('adds and edits inline, copies independently and saves normalized conditions without a modal', async () => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => { throw new Error('unavailable in HTTP') })
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    const table = wrapper.get('[data-testid="retry-rules"]')
    expect(wrapper.findAll('h5').filter(h => h.text() === '自动重试')).toHaveLength(1)
    expect(table.text()).not.toContain('重试与换号规则')
    await table.get('[data-testid="add-rule"]').trigger('click')
    expect(table.findAll('[data-testid="rule-name"]')).toHaveLength(2)
    expect(wrapper.findComponent(SModal).exists()).toBe(false)
    await table.findAll('[data-testid="rule-name"]')[1]!.setValue(' 多个错误码 ')
    await table.findAll('[data-testid="rule-codes"]')[1]!.setValue('401，403,429,500-599')
    await table.findAll('[data-testid="copy-rule"]')[1]!.trigger('click')
    await table.findAll('[data-testid="rule-name"]')[2]!.setValue('副本独立修改')
    expect((table.findAll('[data-testid="rule-name"]')[1]!.element as HTMLInputElement).value).toBe(' 多个错误码 ')
    await wrapper.get('[data-testid="retry-save"]').trigger('click')
    await flushPromises()
    const rows = api.put.mock.calls[0]![1].policy.retry_rules
    expect(rows[1]).toMatchObject({ name: '多个错误码', match: { status_codes: '401,403,429,500-599' } })
    expect(rows[2].id).not.toBe(rows[1].id)
    await table.findAll('[data-testid="remove-rule"]')[2]!.trigger('click')
    expect(table.findAll('[data-testid="rule-name"]')).toHaveLength(2)
  })
  it('uses public table handles and direct actions', async () => {
    const rules = [newFailureRule('A', false), newFailureRule('B', false)]
    const wrapper = mount(FailureRulesTable, { props: { modelValue: rules, account: false, disabled: false }, global })
    await wrapper.get('[data-reorder-handle="0"]').trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[rules[1], rules[0]]])
    expect(wrapper.find('[aria-haspopup="menu"]').exists()).toBe(false)
    expect(wrapper.findAll('thead th').map(cell => cell.text())).toEqual(['', '规则名称 / 错误来源', '错误码', '关键词', 'Go 正则', '操作'])
  })
  it('validates inline conditions before Save and keeps errors attached after reorder', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    const table = wrapper.get('[data-testid="retry-rules"]')
    await table.get('[data-testid="add-rule"]').trigger('click')
    await wrapper.get('[data-testid="retry-save"]').trigger('click')
    expect(api.put).not.toHaveBeenCalled()
    expect(table.findAll('textarea')[1]!.attributes('aria-invalid')).toBe('true')
    await table.get('[data-reorder-handle="1"]').trigger('keydown', { key: 'ArrowUp' })
    expect(table.findAll('textarea')[0]!.attributes('aria-invalid')).toBe('true')
    await table.findAll('[data-testid="rule-codes"]')[0]!.setValue('500-401')
    await wrapper.get('[data-testid="retry-save"]').trigger('click')
    expect(api.put).not.toHaveBeenCalled()
    expect(table.findAll('[data-testid="rule-codes"]')[0]!.attributes('aria-invalid')).toBe('true')
    await table.findAll('[data-testid="rule-codes"]')[0]!.setValue('503')
    await wrapper.get('[data-testid="retry-save"]').trigger('click')
    expect(api.put).toHaveBeenCalledTimes(1)
  })
  it('saves keyword-only disable rules one per line with no action or advanced controls', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    const table = wrapper.get('[data-testid="account-rules"]')
    await table.get('[data-testid="add-rule"]').trigger('click')
    await table.get('[data-testid="rule-keywords"]').setValue(' quota \n\npermission denied\nquota')
    await wrapper.get('[data-testid="account-save"]').trigger('click')
    expect(api.put.mock.calls[0]![1].policy.account_rules[0]).toMatchObject({
      enabled: true, action: 'disable', match: { status_codes: '', keywords: ['quota', 'permission denied'] }
    })
    expect(table.find('[data-testid="rule-action"]').exists()).toBe(false)
    expect(table.findAll('[data-testid="rule-regex"]').map(s => s.attributes('aria-label'))).toEqual(['Go 正则'])
    expect(table.findAllComponents(SSwitch)).toHaveLength(1)
    expect(wrapper.text()).not.toContain('高级匹配范围')
  })
  it('preserves scope and fixes condition matching to AND when editing inline', async () => {
    const policy = fixture()
    Object.assign(policy.retry_rules[0]!.match, { source: 'core', groups: [1], models: ['limited-*'], protocols: ['anthropic'], keywords: ['quota'], mode: 'any' })
    api.get.mockResolvedValue({ configured: true, policy })
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    await wrapper.get('[data-testid="rule-name"]').setValue('改名')
    await wrapper.get('[data-testid="retry-save"]').trigger('click')
    expect(api.put.mock.calls[0]![1].policy.retry_rules[0].match).toEqual({ ...policy.retry_rules[0]!.match, mode: 'all' })
    expect(normalizedPolicy(fixture()).retry_rules[0]!.match.keywords).toEqual([])
  })
})

describe('rule preview', () => {
  it('rejects incomplete inline rules before preview', async () => {
    const policy = fixture()
    policy.retry_rules.push(newFailureRule('未完成', false))
    const wrapper = mount(FailurePolicyPreview, { props: { policy }, global })
    await wrapper.get('[data-testid="preview-policy"]').trigger('click')
    expect(api.post).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('至少填写一项')
  })
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
describe('explanations', () => {
  it('explains when retries happen and shows the attempt order step by step', async () => {
    const wrapper = mount(FailurePolicySettings, { global })
    await flushPromises()
    expect(wrapper.get('[data-testid="retry-notes"]').text()).toContain('只有命中下方「触发规则」任一条的错误才会重试')
    expect(wrapper.get('[data-testid="disable-notes"]').text()).toContain('额度重置后自动恢复')
    expect(wrapper.get('[data-testid="retry-rules"]').text()).toContain('触发规则')
    expect(wrapper.get('[data-testid="account-rules"]').text()).toContain('禁用条件')
    const controls = mount(FailurePolicyControls, {
      props: { modelValue: { ...fixture(), max_retries: 3, retries_per_account: 1 }, disabled: false, errors: {} },
      global
    })
    const sequence = controls.get('[data-testid="retry-sequence"]').text()
    expect(sequence).toContain('A → A → B → C')
    for (const label of ['账号 A', '首次请求', '原账号重试', '账号 B', '换号重试']) expect(sequence).toContain(label)
  })
  it('says in words when each rule matches and clears status codes for network errors', async () => {
    const rule = newFailureRule('transient', false)
    rule.match.status_codes = '408,429,500-599'
    const wrapper = mount(FailureRulesTable, { props: { modelValue: [rule], account: false, disabled: false }, global })
    expect(wrapper.get('[data-testid="rule-summary"]').text()).toBe('上游返回 408、429、500–599 时命中，不看错误内容。')
    rule.match.keywords = ['overloaded']
    await wrapper.setProps({ modelValue: [rule] })
    expect(wrapper.get('[data-testid="rule-summary"]').text()).toContain('且错误内容包含任一关键词')
    wrapper.findComponent(SSelect).vm.$emit('update:modelValue', 'transport')
    await flushPromises()
    expect(rule.match).toMatchObject({ source: 'transport', status_codes: '' })
    rule.match.keywords = []
    await wrapper.setProps({ modelValue: [rule] })
    expect(wrapper.get('[data-testid="rule-summary"]').text()).toBe('所有连接或网络错误（没有收到上游响应）都命中。')
    expect(wrapper.get('[data-testid="rule-codes"]').attributes('disabled')).toBeDefined()
    for (const field of wrapper.findAll('[data-testid="rule-codes"], [data-testid="rule-keywords"]')) expect(field.attributes('placeholder')).toBeUndefined()
    rule.match.source = 'upstream'
    await wrapper.setProps({ modelValue: [rule] })
    expect(wrapper.get('[data-testid="rule-summary"]').text()).toBe('还没有填写错误码或关键词，这条规则不会命中。')
  })
})
