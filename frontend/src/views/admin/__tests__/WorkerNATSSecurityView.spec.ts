import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import WorkerNATSSecurityView from '@/views/admin/WorkerNATSSecurityView.vue'

const { getNATSSecurity, updateNATSSecurity, showSuccess, showError } = vi.hoisted(() => ({
  getNATSSecurity: vi.fn(),
  updateNATSSecurity: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn()
}))

vi.mock('@/api/admin', () => ({ adminAPI: { workers: { getNATSSecurity, updateNATSSecurity } } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ showSuccess, showError }) }))
vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})

const config = {
  authentication_mode: 'nkey_jwt_nsc', ready: true,
  worker_url: 'tls://nats.example.com:443', subject: 'sup2api.usage.settlements.v1', credential_ttl_days: 0,
  operator_id: 'O123', operator_name: 'Sup2API', account_id: 'A123', account_name: 'Workers',
  issuer_configured: true, control_credentials_configured: true
}

describe('WorkerNATSSecurityView', () => {
  beforeEach(() => {
    getNATSSecurity.mockReset().mockResolvedValue({ ...config })
    updateNATSSecurity.mockReset().mockImplementation(async (input) => ({ ...config, ...input }))
    showSuccess.mockReset()
    showError.mockReset()
  })

  it('shows the nsc trust chain and persists the Worker endpoint policy', async () => {
    const wrapper = mount(WorkerNATSSecurityView, {
      global: { stubs: { AppLayout: { template: '<main><slot /></main>' }, LoadingSpinner: true, Icon: true } }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Sup2API · O123')
    expect(wrapper.text()).toContain('Workers · A123')
    await wrapper.get('#worker-nats-url').setValue('wss://nats.example.com/ws')
    await wrapper.get('#worker-nats-ttl').setValue('90')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(updateNATSSecurity).toHaveBeenCalledWith({ worker_url: 'wss://nats.example.com/ws', credential_ttl_days: 90 })
    expect(showSuccess).toHaveBeenCalled()
  })
})
