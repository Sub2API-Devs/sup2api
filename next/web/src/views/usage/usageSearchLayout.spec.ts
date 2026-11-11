import { describe, expect, it } from 'vitest'
import { fieldParams, fieldPatch, fieldText, usageSearchLayout } from './usageFilters'

describe('id-or-name search boxes', () => {
  it.each([
    ['user', '7', { user_id: '7', user_email: '' }],
    ['user', ' 42 ', { user_id: ' 42 ', user_email: '' }],
    ['user', 'ann@', { user_id: '', user_email: 'ann@' }],
    ['api_key', '7a', { api_key_id: '', api_key_name: '7a' }],
    ['account', '25', { account_id: '25', account_name: '' }],
    ['user', '', { user_id: '', user_email: '' }],
    ['model_contains', '42', { model_contains: '42' }]
  ])('splits %s text %o into its parameters', (field, text, patch) => {
    expect(fieldPatch(field, text)).toEqual(patch)
  })

  it('shows the applied id, else the name, else nothing', () => {
    expect(fieldText({ user_id: 7, user_email: 'ann' }, 'user')).toBe('7')
    expect(fieldText({ api_key_name: 'laptop' }, 'api_key')).toBe('laptop')
    expect(fieldText({}, 'account')).toBe('')
    expect(fieldText({ client_ip: '192.0.2.7' }, 'client_ip')).toBe('192.0.2.7')
    expect(fieldParams('user')).toEqual(['user_id', 'user_email'])
  })
})

describe('usageSearchLayout', () => {
  const admin = { admin: true, accounts: true, groupSelect: true, errors: false }
  const self = { admin: false, accounts: false, groupSelect: false, errors: false }

  it('puts the model, user and API key on an operator\'s first row and the rest behind More filters', () => {
    const { primary, advanced } = usageSearchLayout(admin)
    expect(primary).toEqual(['model_contains', 'user', 'api_key'])
    expect(advanced).toEqual(['group_id', 'request_id', 'account', 'client_ip', 'protocol', 'conversion', 'success', 'billing_status'])
    expect(usageSearchLayout({ ...admin, accounts: false, groupSelect: false }).advanced.slice(0, 3)).toEqual(['group_name', 'request_id', 'client_ip'])
  })

  it('gives a user the group in place of the user, and no operator fields', () => {
    const { primary, advanced, params } = usageSearchLayout(self)
    expect(primary).toEqual(['model_contains', 'group_name', 'api_key'])
    expect(advanced).toEqual(['request_id', 'client_ip', 'protocol', 'success', 'billing_status'])
    for (const key of ['user_id', 'user_email', 'account_id', 'node_id', 'conversion']) expect(params).not.toContain(key)
  })

  it('swaps the status for the HTTP status and error type under failed requests, and does not tag the status set there', () => {
    const { advanced, tagged } = usageSearchLayout({ ...self, errors: true })
    expect(advanced).not.toContain('success')
    expect(advanced.slice(-2)).toEqual(['status_code', 'error_type'])
    expect(tagged).not.toContain('success')
    expect(usageSearchLayout(self).tagged).toContain('success')
  })

  it('keeps the parameters without a field, tagging all but the first row\'s', () => {
    const { params, tagged } = usageSearchLayout(admin)
    for (const key of ['group_name', 'client_request_id', 'platform', 'endpoint', 'plugin_key', 'account_type', 'node_id', 'upstream_model', 'upstream_protocol', 'stream', 'status_code']) {
      expect(params).toContain(key)
      expect(tagged).toContain(key)
    }
    for (const key of ['model_contains', 'user_id', 'user_email', 'api_key_id', 'api_key_name']) expect(tagged).not.toContain(key)
    expect(new Set(params).size).toBe(params.length)
  })
})
