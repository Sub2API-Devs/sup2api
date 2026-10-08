import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import CredentialStatusNotice from './CredentialStatusNotice.vue'
import { canAutoStartAuthorization } from './credentialStatus'

describe('local credential status', () => {
  it('does not start authorization for unresolved helper/FD sources or expired tokens', () => {
    expect(canAutoStartAuthorization({ healthy: true, logged_in: false, credential_source_unresolved: true })).toBe(false)
    expect(canAutoStartAuthorization({ healthy: true, logged_in: false, access_token_expired: true })).toBe(false)
    expect(canAutoStartAuthorization({ healthy: true, logged_in: false })).toBe(true)
    expect(canAutoStartAuthorization(null)).toBe(false)
  })
  it('separates presence and expiry from online validity', () => {
    i18n.global.locale.value = 'zh'
    const wrapper = mount(CredentialStatusNotice, { props: { status: { healthy: true, logged_in: true, credential_present: true, status_source: 'local_snapshot', online_verified: false, access_token_expired: true } }, global: { plugins: [i18n] } })
    expect(wrapper.text()).toContain('在线有效性以实际请求为准')
    expect(wrapper.text()).toContain('等待原生 CLI')
    expect(wrapper.text()).not.toContain('重新授权')
    expect(wrapper.text()).not.toContain('已授权')
  })
  it('does not invent local or online verification for a legacy response', () => {
    const wrapper = mount(CredentialStatusNotice, { props: { status: { healthy: true, logged_in: true } }, global: { plugins: [i18n] } })
    expect(wrapper.find('[data-testid="ccgateway-local-credential-status"]').exists()).toBe(false)
  })
})
