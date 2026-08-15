import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import WorkersView from '@/views/admin/WorkersView.vue'

const { list, update, setEnabled, listAccounts, getConfig, push, showSuccess, showError } = vi.hoisted(() => ({
  list: vi.fn(), update: vi.fn(), setEnabled: vi.fn(), listAccounts: vi.fn(), getConfig: vi.fn(), push: vi.fn(),
  showSuccess: vi.fn(), showError: vi.fn()
}))

vi.mock('@/api/admin', () => ({
  adminAPI: { workers: {
    list, update, setEnabled, listAccounts, getConfig,
    create: vi.fn(), remove: vi.fn(), testConnection: vi.fn(), getNATSSecurity: vi.fn().mockResolvedValue({ worker_url: '' }), createAPIKeyAccount: vi.fn(),
    startOAuth: vi.fn(), completeOAuth: vi.fn(), refreshAccount: vi.fn(), testAccount: vi.fn(), deleteAccount: vi.fn()
  }}
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ showSuccess, showError, showWarning: vi.fn() }) }))
vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})

const worker = {
  id: 1, name: 'Local Gateway', base_url: 'http://gateway:9999', remote_worker_id: 'gateway-local',
  instance_id: 'instance-1', protocol_version: 'aicodex.proxy-worker/v2', version: '1.0.0',
  status: 'ready', enabled: true, log_stream_key: 'logs', last_seen_at: '2026-08-09T10:00:00Z',
  last_heartbeat_at: '2026-08-09T10:00:00Z', last_heartbeat_latency_ms: 12, consecutive_failures: 0,
  heartbeat_interval_seconds: 15, heartbeat_timeout_seconds: 5, account_count: 2, log_count: 3,
  created_at: '2026-08-09T10:00:00Z', updated_at: '2026-08-09T10:00:00Z'
}

const AppLayoutStub = defineComponent({ template: '<main><slot /></main>' })
const TablePageLayoutStub = defineComponent({ template: '<section><slot name="actions"/><slot name="filters"/><slot name="table"/></section>' })
const BaseDialogStub = defineComponent({ props: { show: Boolean }, template: '<div v-if="show" class="dialog"><slot/><slot name="footer"/></div>' })
const ToggleStub = defineComponent({
  props: { modelValue: Boolean }, emits: ['update:modelValue'],
  template: '<button class="toggle" @click="$emit(\'update:modelValue\', !modelValue)">{{ modelValue }}</button>'
})

function mountView() {
  return mount(WorkersView, { global: { stubs: {
    AppLayout: AppLayoutStub, TablePageLayout: TablePageLayoutStub, BaseDialog: BaseDialogStub,
    ConfirmDialog: true, LoadingSpinner: true, Toggle: ToggleStub, Icon: true
  } } })
}

describe('WorkersView operations table', () => {
  beforeEach(() => {
    list.mockReset().mockResolvedValue([{ ...worker }])
    update.mockReset().mockImplementation(async (_id, input) => ({ ...worker, ...input }))
    setEnabled.mockReset().mockImplementation(async (_id, enabled) => ({ ...worker, enabled, status: enabled ? 'unknown' : 'disabled' }))
    listAccounts.mockReset().mockResolvedValue([])
    getConfig.mockReset().mockResolvedValue({
      worker_id: 'gateway-local', nats_url: 'nats://nats:4222',
      control_plane_target: 'sub2api:9090', control_plane_insecure: true,
    })
    push.mockReset().mockResolvedValue(undefined)
    showSuccess.mockReset(); showError.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('filters rows and opens the selected Worker usage records', async () => {
    const wrapper = mountView(); await flushPromises()
    expect(wrapper.text()).toContain('Local Gateway')
    await wrapper.get('input[placeholder="admin.workers.searchPlaceholder"]').setValue('missing')
    expect(wrapper.text()).not.toContain('Local Gateway')
    await wrapper.get('input[placeholder="admin.workers.searchPlaceholder"]').setValue('gateway-local')
    await wrapper.get('[data-testid="worker-usage"]').trigger('click'); await flushPromises()
    expect(push).toHaveBeenCalledWith({ name: 'AdminUsage', query: { worker_id: '1', worker_name: 'Local Gateway' } })
  })

  it('updates the enabled gate and submits a complete edit payload', async () => {
    const wrapper = mountView(); await flushPromises()
    await wrapper.get('.toggle').trigger('click'); await flushPromises()
    expect(setEnabled).toHaveBeenCalledWith(1, false)

    await wrapper.get('[data-testid="edit-worker"]').trigger('click')
    await flushPromises()
    const form = wrapper.get('#worker-form')
    const inputs = form.findAll('input')
    await inputs[0].setValue('Renamed Worker')
    await form.trigger('submit'); await flushPromises()
    expect(getConfig).toHaveBeenCalledWith(1)
    expect(form.text()).toContain('admin.workers.natsUrl')
    expect(form.text()).not.toContain('admin.workers.managementKey')
    expect(form.text()).not.toContain('admin.workers.vaultKey')
    expect(form.text()).toContain('admin.workers.controlPlaneTarget')
    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({
      name: 'Renamed Worker', base_url: 'http://gateway:9999', enabled: false,
      nats_url: 'nats://nats:4222', control_plane_target: 'sub2api:9090', control_plane_insecure: true,
      heartbeat_interval_seconds: 15, heartbeat_timeout_seconds: 5
    }))
  })

  it('does not push default runtime fields when Worker config cannot be loaded', async () => {
    getConfig.mockRejectedValueOnce(new Error('worker unreachable'))
    const wrapper = mountView(); await flushPromises()
    await wrapper.get('[data-testid="edit-worker"]').trigger('click')
    await flushPromises()
    const form = wrapper.get('#worker-form')
    await form.findAll('input')[0].setValue('Renamed Worker')
    await form.trigger('submit'); await flushPromises()
    expect(update).toHaveBeenCalledWith(1, {
      name: 'Renamed Worker', base_url: 'http://gateway:9999', enabled: true,
      heartbeat_interval_seconds: 15, heartbeat_timeout_seconds: 5
    })
  })

  it('rolls back both the switch and status when the enabled update fails', async () => {
    setEnabled.mockRejectedValueOnce(new Error('network failed'))
    const wrapper = mountView(); await flushPromises()
    expect(wrapper.text()).toContain('admin.workers.status.ready')

    await wrapper.get('.toggle').trigger('click'); await flushPromises()

    expect(showError).toHaveBeenCalled()
    expect(wrapper.get('.toggle').text()).toBe('true')
    expect(wrapper.text()).toContain('admin.workers.status.ready')
    expect(wrapper.text()).not.toContain('admin.workers.status.disabled')
  })

  it('does not let a slower previous Worker detail request replace the current Worker', async () => {
    const workerB = { ...worker, id: 2, name: 'Gateway B', remote_worker_id: 'gateway-b' }
    list.mockResolvedValueOnce([{ ...worker }, workerB])
    const pendingAccounts = new Map<number, (value: unknown[]) => void>()
    listAccounts.mockImplementation((id: number) => new Promise((resolve) => pendingAccounts.set(id, resolve)))
    const wrapper = mountView(); await flushPromises()

    const accountButtons = wrapper.findAll('[data-testid="worker-accounts"]')
    await accountButtons[0].trigger('click')
    await accountButtons[1].trigger('click')
    pendingAccounts.get(2)?.([{ id: 22, worker_id: 2, remote_account_id: 'account-b', name: 'Account B', kind: 'openai_api_key', status: 'active', metadata: {}, created_at: '', updated_at: '' }])
    await flushPromises()
    expect(wrapper.text()).toContain('Gateway B')
    expect(wrapper.text()).toContain('Account B')

    pendingAccounts.get(1)?.([{ id: 11, worker_id: 1, remote_account_id: 'stale', name: 'Stale Account', kind: 'openai_api_key', status: 'active', metadata: {}, created_at: '', updated_at: '' }])
    await flushPromises()
    expect(wrapper.text()).toContain('Account B')
    expect(wrapper.text()).not.toContain('Stale Account')
  })

  it('refreshes heartbeat state automatically every ten seconds', async () => {
    vi.useFakeTimers()
    mountView(); await flushPromises()
    expect(list).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10_000); await flushPromises()
    expect(list).toHaveBeenCalledTimes(2)
  })
})
