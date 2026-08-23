import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import WorkerAccountTestModal from '@/components/admin/account/WorkerAccountTestModal.vue'

const { testAccount, showSuccess, showError } = vi.hoisted(() => ({
  testAccount: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn()
}))

vi.mock('@/api/admin', () => ({
  adminAPI: { workers: { testAccount } }
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ showSuccess, showError })
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) =>
        params ? `${key}:${Object.values(params).join('|')}` : key
    })
  }
})

const BaseDialogStub = defineComponent({
  props: { show: Boolean },
  emits: ['close'],
  template: '<section v-if="show"><slot/><footer><slot name="footer"/></footer></section>'
})

const SelectStub = defineComponent({
  props: { modelValue: [String, Number], options: Array, disabled: Boolean },
  emits: ['update:modelValue'],
  template: '<select :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="String(option.value)" :value="option.value">{{ option.label }}</option></select>'
})

const worker = {
  id: 7,
  name: 'Shanghai Worker',
  base_url: 'http://worker:9999',
  remote_worker_id: 'gateway-sh-01',
  instance_id: 'instance-1',
  protocol_version: 'aicodex.proxy-worker/v2',
  version: '1.0.0',
  status: 'ready',
  enabled: true,
  log_stream_key: '',
  last_heartbeat_latency_ms: 12,
  consecutive_failures: 0,
  heartbeat_interval_seconds: 15,
  heartbeat_timeout_seconds: 5,
  account_count: 1,
  proxy_count: 0,
  log_count: 0,
  created_at: '2026-08-22T10:00:00Z',
  updated_at: '2026-08-22T10:00:00Z'
}

const account = {
  id: 101,
  worker_id: 7,
  remote_account_id: 'remote-openai-1',
  name: 'Worker OpenAI',
  kind: 'openai_api_key',
  status: 'active',
  metadata: { models: 'gpt-5.4,gpt-5.6', test_model: 'gpt-5.6' },
  created_at: '2026-08-22T10:00:00Z',
  updated_at: '2026-08-22T10:00:00Z'
}

const mountModal = () => mount(WorkerAccountTestModal, {
  props: { show: true, account, worker, kindLabel: 'OpenAI / Key' },
  global: {
    stubs: {
      BaseDialog: BaseDialogStub,
      Select: SelectStub,
      Icon: true
    }
  }
})

describe('WorkerAccountTestModal', () => {
  beforeEach(() => {
    testAccount.mockReset().mockResolvedValue({
      ok: true,
      status_code: 200,
      latency_ms: 38,
      response_text: 'hello from Worker'
    })
    showSuccess.mockReset()
    showError.mockReset()
  })

  it('shows the account, owning Worker and configured model before testing', () => {
    const wrapper = mountModal()

    expect(wrapper.text()).toContain('Worker OpenAI')
    expect(wrapper.text()).toContain('Shanghai Worker')
    expect(wrapper.get('select').element.value).toBe('gpt-5.6')
    expect(testAccount).not.toHaveBeenCalled()
  })

  it('tests only after Start Test and renders status and latency in the dialog', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-testid="start-worker-account-test"]').trigger('click')
    await flushPromises()

    expect(testAccount).toHaveBeenCalledWith(
      7,
      'remote-openai-1',
      { model: 'gpt-5.6' },
      { signal: expect.any(AbortSignal) }
    )
    expect(wrapper.get('[data-testid="worker-test-output"]').text()).toContain('admin.accounts.workerTestHttpStatus:200')
    expect(wrapper.get('[data-testid="worker-test-output"]').text()).toContain('admin.accounts.workerTestLatency:38')
    expect(wrapper.get('[data-testid="worker-test-output"]').text()).toContain('admin.accounts.response')
    expect(wrapper.get('[data-testid="worker-test-output"]').text()).toContain('hello from Worker')
    expect(wrapper.emitted('tested')).toHaveLength(1)
  })

  it('keeps an upstream error inside the test dialog', async () => {
    testAccount.mockRejectedValueOnce({ message: 'upstream returned HTTP 401' })
    const wrapper = mountModal()

    await wrapper.get('[data-testid="start-worker-account-test"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="worker-test-output"]').text()).toContain('upstream returned HTTP 401')
    expect(wrapper.emitted('tested')).toBeUndefined()
  })
})
