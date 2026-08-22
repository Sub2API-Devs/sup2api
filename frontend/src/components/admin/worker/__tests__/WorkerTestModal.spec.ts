import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkerTestModal from '../WorkerTestModal.vue'
import type { Worker } from '@/api/admin'

const { testConnection, copyToClipboard } = vi.hoisted(() => ({
  testConnection: vi.fn(),
  copyToClipboard: vi.fn()
}))

vi.mock('@/api/admin', () => ({
  adminAPI: {
    workers: {
      testConnection
    }
  }
}))

vi.mock('@/composables/useClipboard', () => ({
  useClipboard: () => ({
    copyToClipboard
  })
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, string | number>) => {
        if (params) {
          return `${key}:${Object.values(params).join(',')}`
        }
        return key
      }
    })
  }
})

const worker: Worker = {
  id: 1,
  name: 'Local Gateway',
  base_url: 'http://gateway:9999',
  remote_worker_id: 'gateway-local',
  instance_id: 'instance-1',
  protocol_version: 'aicodex.proxy-worker/v2',
  version: '1.0.0',
  status: 'ready',
  enabled: true,
  log_stream_key: 'logs',
  last_heartbeat_latency_ms: 12,
  consecutive_failures: 0,
  heartbeat_interval_seconds: 15,
  heartbeat_timeout_seconds: 5,
  account_count: 2,
  proxy_count: 1,
  log_count: 3,
  created_at: '2026-08-09T10:00:00Z',
  updated_at: '2026-08-09T10:00:00Z'
}

function mountModal() {
  return mount(WorkerTestModal, {
    props: {
      show: false,
      worker
    },
    global: {
      stubs: {
        BaseDialog: { template: '<div><slot /><slot name="footer" /></div>' },
        Select: { template: '<div class="select-stub"></div>' },
        Icon: true
      }
    }
  })
}

describe('WorkerTestModal', () => {
  beforeEach(() => {
    testConnection.mockReset()
    copyToClipboard.mockReset()
  })

  it('runs a heartbeat probe and prints identity plus ready checks', async () => {
    testConnection.mockResolvedValue({
      identity: {
        protocol_version: 'aicodex.proxy-worker/v2',
        worker_id: 'gateway-local',
        instance_id: 'instance-1',
        version: 'vdev-4f835d60'
      },
      ready: {
        ready: true,
        checks: {
          caddy_runtime: 'ok',
          database: 'ok'
        }
      }
    })

    const wrapper = mountModal()
    await wrapper.setProps({ show: true })
    await wrapper.get('[data-testid="worker-test-start"]').trigger('click')
    await flushPromises()

    expect(testConnection).toHaveBeenCalledWith(1, expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(wrapper.text()).toContain('admin.workers.identityVerified')
    expect(wrapper.text()).toContain('protocol_version: aicodex.proxy-worker/v2')
    expect(wrapper.text()).toContain('admin.workers.heartbeatReady')
    expect(wrapper.text()).toContain('checks.caddy_runtime: ok')
    expect(wrapper.text()).toContain('admin.workers.testCompleted')
    expect(wrapper.emitted('completed')).toHaveLength(1)
  })

  it('shows the probe error in the console when heartbeat fails', async () => {
    testConnection.mockRejectedValue({ message: 'worker unreachable' })

    const wrapper = mountModal()
    await wrapper.setProps({ show: true })
    await wrapper.get('[data-testid="worker-test-start"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('admin.workers.errorPrefix:worker unreachable')
    expect(wrapper.text()).toContain('worker unreachable')
    expect(wrapper.emitted('completed')).toHaveLength(1)
  })

  it('ignores a canceled probe after the dialog is reopened and a new probe starts', async () => {
    let rejectFirst!: (reason: unknown) => void
    let resolveSecond!: (value: unknown) => void
    testConnection
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectFirst = reject }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve }))

    const wrapper = mountModal()
    await wrapper.setProps({ show: true })
    await wrapper.get('[data-testid="worker-test-start"]').trigger('click')
    await wrapper.setProps({ show: false })
    await wrapper.setProps({ show: true })
    await wrapper.get('[data-testid="worker-test-start"]').trigger('click')

    rejectFirst(new DOMException('canceled', 'AbortError'))
    await flushPromises()
    expect(wrapper.text()).toContain('admin.workers.connectingHeartbeat')
    expect(wrapper.get('[data-testid="worker-test-start"]').attributes('disabled')).toBeDefined()

    resolveSecond({
      identity: {
        protocol_version: 'aicodex.proxy-worker/v2',
        worker_id: 'gateway-local',
        instance_id: 'instance-2',
        version: 'v2'
      },
      ready: { ready: true }
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.workers.testCompleted')
    expect(wrapper.emitted('completed')).toHaveLength(1)
  })
})
