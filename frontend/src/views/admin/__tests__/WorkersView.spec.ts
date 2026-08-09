import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import WorkersView from '@/views/admin/WorkersView.vue'

const { list, update, setEnabled, listAccounts, listLogs, showSuccess, showError } = vi.hoisted(() => ({
  list: vi.fn(), update: vi.fn(), setEnabled: vi.fn(), listAccounts: vi.fn(), listLogs: vi.fn(),
  showSuccess: vi.fn(), showError: vi.fn()
}))

vi.mock('@/api/admin', () => ({
  adminAPI: { workers: {
    list, update, setEnabled, listAccounts, listLogs,
    create: vi.fn(), remove: vi.fn(), testConnection: vi.fn(), createAPIKeyAccount: vi.fn(),
    startOAuth: vi.fn(), completeOAuth: vi.fn(), refreshAccount: vi.fn(), testAccount: vi.fn(), deleteAccount: vi.fn()
  }}
}))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ showSuccess, showError, showWarning: vi.fn() }) }))
vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})

const worker = {
  id: 1, name: 'Local Gateway', base_url: 'http://gateway:9999', remote_worker_id: 'gateway-local',
  instance_id: 'instance-1', protocol_version: 'aicodex.proxy-worker/v1', version: '1.0.0',
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
    listLogs.mockReset().mockResolvedValue([])
    showSuccess.mockReset(); showError.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('filters rows and opens the selected Worker consumption logs', async () => {
    const wrapper = mountView(); await flushPromises()
    expect(wrapper.text()).toContain('Local Gateway')
    await wrapper.get('input[placeholder="admin.workers.searchPlaceholder"]').setValue('missing')
    expect(wrapper.text()).not.toContain('Local Gateway')
    await wrapper.get('input[placeholder="admin.workers.searchPlaceholder"]').setValue('gateway-local')
    await wrapper.get('[data-testid="worker-logs"]').trigger('click'); await flushPromises()
    expect(listAccounts).toHaveBeenCalledWith(1)
    expect(listLogs).toHaveBeenCalledWith(1, 50, undefined)
  })

  it('updates the enabled gate and submits a complete edit payload', async () => {
    const wrapper = mountView(); await flushPromises()
    await wrapper.get('.toggle').trigger('click'); await flushPromises()
    expect(setEnabled).toHaveBeenCalledWith(1, false)

    await wrapper.get('[data-testid="edit-worker"]').trigger('click')
    const form = wrapper.get('#worker-form')
    const inputs = form.findAll('input')
    await inputs[0].setValue('Renamed Worker')
    await form.trigger('submit'); await flushPromises()
    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({
      name: 'Renamed Worker', base_url: 'http://gateway:9999', enabled: false,
      heartbeat_interval_seconds: 15, heartbeat_timeout_seconds: 5
    }))
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
    const pendingLogs = new Map<number, (value: unknown[]) => void>()
    listAccounts.mockImplementation((id: number) => new Promise((resolve) => pendingAccounts.set(id, resolve)))
    listLogs.mockImplementation((id: number) => new Promise((resolve) => pendingLogs.set(id, resolve)))
    const wrapper = mountView(); await flushPromises()

    const logButtons = wrapper.findAll('[data-testid="worker-logs"]')
    await logButtons[0].trigger('click')
    await logButtons[1].trigger('click')
    pendingAccounts.get(2)?.([])
    pendingLogs.get(2)?.([{ id: 22, worker_id: 2, event_id: 'b', event_type: 'consume', instance_id: '', request_id: 'request-b', channel_id: 1, model_name: 'model-b', worker_created_at: 0, payload: {}, consumed_at: '2026-08-09T10:00:00Z' }])
    await flushPromises()
    expect(wrapper.text()).toContain('Gateway B')
    expect(wrapper.text()).toContain('request-b')

    pendingAccounts.get(1)?.([])
    pendingLogs.get(1)?.([{ id: 11, worker_id: 1, event_id: 'a', event_type: 'consume', instance_id: '', request_id: 'stale-request-a', channel_id: 1, model_name: 'model-a', worker_created_at: 0, payload: {}, consumed_at: '2026-08-09T10:00:00Z' }])
    await flushPromises()
    expect(wrapper.text()).toContain('request-b')
    expect(wrapper.text()).not.toContain('stale-request-a')
  })

  it('refreshes heartbeat state automatically every ten seconds', async () => {
    vi.useFakeTimers()
    mountView(); await flushPromises()
    expect(list).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10_000); await flushPromises()
    expect(list).toHaveBeenCalledTimes(2)
  })
})
