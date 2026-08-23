import { defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeLocationKey, routerKey } from 'vue-router'

import AccountsView from '@/views/admin/AccountsView.vue'

const {
  listMainAccounts,
  listWorkers,
  listWorkerAccounts,
  testWorkerAccount,
  updateWorkerAccount,
  deleteWorkerAccount,
  replace,
  showSuccess,
  showError
} = vi.hoisted(() => ({
  listMainAccounts: vi.fn(),
  listWorkers: vi.fn(),
  listWorkerAccounts: vi.fn(),
  testWorkerAccount: vi.fn(),
  updateWorkerAccount: vi.fn(),
  deleteWorkerAccount: vi.fn(),
  replace: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn()
}))

vi.mock('@/api/admin', () => ({
  adminAPI: {
    accounts: {
      list: listMainAccounts,
      getBatchTodayStats: vi.fn().mockResolvedValue({ stats: {} }),
      getUpstreamBillingProbeSettings: vi.fn().mockResolvedValue({ enabled: false })
    },
    workers: {
      list: listWorkers,
      listAccounts: listWorkerAccounts,
      testAccount: testWorkerAccount,
      updateAccount: updateWorkerAccount,
      deleteAccount: deleteWorkerAccount,
      refreshAccount: vi.fn()
    },
    proxies: { getAll: vi.fn().mockResolvedValue([]) },
    groups: { getAll: vi.fn().mockResolvedValue([]) }
  }
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ showSuccess, showError, showWarning: vi.fn(), showInfo: vi.fn() })
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ token: 'test-token', isSimpleMode: false })
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
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

const workerAccount = {
  id: 101,
  worker_id: 7,
  remote_account_id: 'remote-openai-1',
  name: 'Worker OpenAI',
  kind: 'openai_api_key',
  status: 'active',
  metadata: { models: 'gpt-5.4', group: 'default' },
  created_at: '2026-08-22T10:00:00Z',
  updated_at: '2026-08-22T10:00:00Z'
}

const DataTableStub = defineComponent({
  props: { data: { type: Array, default: () => [] } },
  template: `
    <div data-test="data-table">
      <div v-for="row in data" :key="row.management_key || row.id" data-test="row">
        <slot name="cell-name" :row="row" :value="row.name" />
        <slot name="cell-worker" :row="row" />
        <slot name="cell-actions" :row="row" />
      </div>
    </div>
  `
})

const ConfirmDialogStub = defineComponent({
  props: { show: Boolean },
  emits: ['confirm', 'cancel'],
  template: '<button v-if="show" data-test="confirm-delete" @click="$emit(\'confirm\')">confirm</button>'
})

const BaseDialogStub = defineComponent({
  props: { show: Boolean },
  template: '<div v-if="show" data-test="base-dialog"><slot/><slot name="footer"/></div>'
})

const WorkerAccountTestModalStub = defineComponent({
  props: { show: Boolean, account: Object, worker: Object, kindLabel: String },
  template: '<div v-if="show" data-testid="worker-account-test-dialog">{{ account?.name }} · {{ worker?.name }}</div>'
})

function mountView() {
  const route = reactive({ query: { account_scope: 'worker', worker_id: '7' } })
  return mount(AccountsView, {
    global: {
      provide: {
        [routeLocationKey as symbol]: route,
        [routerKey as symbol]: { replace }
      },
      stubs: {
        Teleport: true,
        AppLayout: { template: '<main><slot /></main>' },
        TablePageLayout: { template: '<section><slot name="filters"/><slot name="table"/><slot name="pagination"/></section>' },
        DataTable: DataTableStub,
        AccountTableFilters: true,
        AccountTableActions: true,
        AccountBulkActionsBar: true,
        CreateAccountModal: true,
        EditAccountModal: true,
        ReAuthAccountModal: true,
        AccountTestModal: true,
        WorkerAccountTestModal: WorkerAccountTestModalStub,
        AccountStatsModal: true,
        ScheduledTestsPanel: true,
        AccountActionMenu: true,
        SyncFromCrsModal: true,
        ImportDataModal: true,
        BulkEditAccountModal: true,
        TempUnschedStatusModal: true,
        ConfirmDialog: ConfirmDialogStub,
        BaseDialog: BaseDialogStub,
        ErrorPassthroughRulesModal: true,
        TLSFingerprintProfilesModal: true,
        TotpStepUpDialog: true,
        Pagination: true,
        Icon: true
      }
    }
  })
}

describe('AccountsView Worker account management', () => {
  beforeEach(() => {
    listMainAccounts.mockReset().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 })
    listWorkers.mockReset().mockResolvedValue([worker])
    listWorkerAccounts.mockReset().mockResolvedValue([workerAccount])
    testWorkerAccount.mockReset().mockResolvedValue({ success: true })
    updateWorkerAccount.mockReset().mockResolvedValue(workerAccount)
    deleteWorkerAccount.mockReset().mockResolvedValue(undefined)
    replace.mockReset().mockResolvedValue(undefined)
    showSuccess.mockReset()
    showError.mockReset()
  })

  it('lists a Worker account and opens its test dialog without immediately testing', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[data-testid="worker-account-scope"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('Worker OpenAI')
    expect(wrapper.text()).toContain('Shanghai Worker')
    expect(wrapper.get('[data-testid="account-worker-badge"]').attributes('title')).toBe('Shanghai Worker · gateway-sh-01')
    expect(listWorkerAccounts).toHaveBeenCalledWith(7)

    await wrapper.get('[data-testid="worker-account-more"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="worker-account-action-menu"]').find('button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="worker-account-test-dialog"]').text()).toContain('Worker OpenAI · Shanghai Worker')
    expect(testWorkerAccount).not.toHaveBeenCalled()
  })

  it('deletes the real credential through the selected Worker', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('[data-test="row"]').find('button[title="common.delete"]').trigger('click')
    await wrapper.get('[data-test="confirm-delete"]').trigger('click')
    await flushPromises()

    expect(deleteWorkerAccount).toHaveBeenCalledWith(7, 'remote-openai-1')
    expect(showSuccess).toHaveBeenCalledWith('admin.accounts.workerAccountDeleted')
  })

  it('edits Worker account metadata without replacing its credential', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('[data-testid="edit-worker-account"]').trigger('click')
    await wrapper.get('[data-testid="worker-account-edit-name"]').setValue('Renamed Worker OpenAI')
    await wrapper.get('#worker-account-edit-form').trigger('submit')
    await flushPromises()

    expect(updateWorkerAccount).toHaveBeenCalledWith(7, 'remote-openai-1', expect.objectContaining({
      name: 'Renamed Worker OpenAI',
      kind: 'openai_api_key',
      models: 'gpt-5.4',
      group: 'default'
    }))
    expect(showSuccess).toHaveBeenCalledWith('admin.accounts.workerAccountUpdated')
  })

  it('filters a multi-Worker account list from the scope header', async () => {
    const workerB = {
      ...worker,
      id: 8,
      name: 'Tokyo Worker',
      remote_worker_id: 'gateway-tk-02',
      account_count: 1
    }
    const workerAccountB = {
      ...workerAccount,
      id: 102,
      worker_id: 8,
      remote_account_id: 'remote-openai-2',
      name: 'Tokyo OpenAI'
    }
    listWorkers.mockResolvedValueOnce([worker, workerB])
    listWorkerAccounts.mockImplementation((id: number) => Promise.resolve(id === 7 ? [workerAccount] : [workerAccountB]))

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[data-testid="worker-filter-toolbar-item"]').find('[data-testid="worker-account-filter"]').exists()).toBe(true)
    expect(wrapper.get('[role="tablist"]').find('[data-testid="worker-account-filter"]').exists()).toBe(false)

    const workerFilter = wrapper.get('[data-testid="worker-account-filter"]')
    expect(workerFilter.findAll('option')).toHaveLength(3)
    expect(workerFilter.text()).toContain('Shanghai Worker · gateway-sh-01')
    expect(workerFilter.text()).toContain('Tokyo Worker · gateway-tk-02')

    await workerFilter.setValue('8')
    await flushPromises()

    expect(wrapper.text()).toContain('Tokyo OpenAI')
    expect(wrapper.text()).not.toContain('Worker OpenAI')
    expect(replace).toHaveBeenLastCalledWith({
      query: { account_scope: 'worker', worker_id: '8' }
    })
  })
})
