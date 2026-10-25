import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n'
import { useAccountTypes } from './accountTypes'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: { get: mocks.get } }))

// The plugin's read-only extensions (CONTRACTS §59) are shown as facts of the
// account: only readOnly properties, with a value, labelled by x-label.
describe('account type plugin facts', () => {
  beforeEach(async () => {
    i18n.global.locale.value = 'zh'
    mocks.get.mockResolvedValue([{
      plugin_key: 'ccgateway', type: 'managed', label: { en: 'Claude Code' }, form: { mode: 'schema' }, sensitive_fields: [], platforms: [], endpoints: [],
      extensions_schema: { type: 'object', properties: {
        locale: { type: 'string' },
        account_email: { type: 'string', readOnly: true, 'x-label': { en: 'Login email', zh: '登录邮箱' } },
        plan_note: { type: 'string', readOnly: true },
      } },
    }])
    await useAccountTypes().load(true)
  })

  it('lists the read-only extensions that have a value', () => {
    const { pluginFacts } = useAccountTypes()
    expect(pluginFacts('ccgateway', 'managed', { locale: 'en-US', account_email: 'ops@example.com', plan_note: 'x' })).toEqual([
      { key: 'account_email', label: '登录邮箱', value: 'ops@example.com' },
      { key: 'plan_note', label: 'plan_note', value: 'x' },
    ])
    expect(pluginFacts('ccgateway', 'managed', { locale: 'en-US', account_email: '' })).toEqual([])
    expect(pluginFacts('ccgateway', 'managed', { account_email: { nested: true } })).toEqual([])
    expect(pluginFacts('ccgateway', 'managed', null)).toEqual([])
    expect(pluginFacts('other', 'managed', { account_email: 'ops@example.com' })).toEqual([])
  })
})
