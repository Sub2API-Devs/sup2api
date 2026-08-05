<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ t('admin.workers.title') }}</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('admin.workers.description') }}</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary" :disabled="loading" @click="loadWorkers">
            <Icon name="refresh" size="md" :class="['mr-2', loading ? 'animate-spin' : '']" />
            {{ t('common.refresh') }}
          </button>
          <button class="btn btn-primary" @click="openCreateWorkerDialog">
            <Icon name="plus" size="md" class="mr-2" />
            {{ t('admin.workers.addWorker') }}
          </button>
        </div>
      </div>

      <div class="grid min-h-[560px] gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-900">
          <div class="border-b border-gray-100 px-4 py-3 dark:border-dark-700">
            <div class="flex items-center justify-between">
              <h2 class="font-medium text-gray-900 dark:text-white">{{ t('admin.workers.workerList') }}</h2>
              <span class="badge badge-gray">{{ workers.length }}</span>
            </div>
          </div>

          <div v-if="loading && workers.length === 0" class="flex justify-center py-16">
            <LoadingSpinner />
          </div>
          <div v-else-if="workers.length === 0" class="px-5 py-12 text-center">
            <Icon name="server" size="xl" class="mx-auto text-gray-300 dark:text-dark-500" />
            <p class="mt-4 font-medium text-gray-700 dark:text-gray-200">{{ t('admin.workers.noWorkers') }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('admin.workers.noWorkersHint') }}</p>
          </div>
          <div v-else class="divide-y divide-gray-100 dark:divide-dark-700">
            <button
              v-for="worker in workers"
              :key="worker.id"
              type="button"
              class="w-full px-4 py-4 text-left transition-colors"
              :class="selectedWorkerId === worker.id
                ? 'bg-primary-50 dark:bg-primary-950/30'
                : 'hover:bg-gray-50 dark:hover:bg-dark-800'"
              @click="selectWorker(worker.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-medium text-gray-900 dark:text-white">{{ worker.name }}</p>
                  <p class="mt-1 truncate text-xs text-gray-500 dark:text-dark-400">{{ worker.base_url }}</p>
                </div>
                <span :class="['badge', workerStatusClass(worker.status)]">{{ worker.status }}</span>
              </div>
              <div class="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-dark-500">
                <span class="truncate">{{ worker.remote_worker_id }}</span>
                <span>{{ worker.version || '-' }}</span>
              </div>
            </button>
          </div>
        </section>

        <section class="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-900">
          <div v-if="!selectedWorker" class="flex h-full min-h-[420px] items-center justify-center px-6 text-center">
            <div>
              <Icon name="server" size="xl" class="mx-auto text-gray-300 dark:text-dark-500" />
              <p class="mt-4 text-gray-500 dark:text-dark-400">{{ t('admin.workers.selectWorker') }}</p>
            </div>
          </div>

          <template v-else>
            <div class="border-b border-gray-100 p-5 dark:border-dark-700">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ selectedWorker.name }}</h2>
                    <span :class="['badge', workerStatusClass(selectedWorker.status)]">{{ selectedWorker.status }}</span>
                  </div>
                  <div class="mt-2 grid gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-dark-400 sm:grid-cols-2">
                    <span>{{ t('admin.workers.workerId') }}: {{ selectedWorker.remote_worker_id }}</span>
                    <span>{{ t('admin.workers.instanceId') }}: {{ selectedWorker.instance_id || '-' }}</span>
                    <span>{{ t('admin.workers.protocol') }}: {{ selectedWorker.protocol_version }}</span>
                    <span>{{ t('admin.workers.lastSeen') }}: {{ selectedWorker.last_seen_at ? formatDateTime(selectedWorker.last_seen_at) : '-' }}</span>
                  </div>
                  <p v-if="selectedWorker.last_error" class="mt-2 text-xs text-red-600 dark:text-red-400">
                    {{ selectedWorker.last_error }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button class="btn btn-secondary" :disabled="isBusy('worker-test')" @click="testWorker">
                    <Icon name="play" size="sm" class="mr-2" />
                    {{ t('admin.workers.testConnection') }}
                  </button>
                  <button class="btn btn-danger" :disabled="isBusy('worker-delete')" @click="workerPendingDelete = selectedWorker">
                    <Icon name="trash" size="sm" class="mr-2" />
                    {{ t('common.delete') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="flex border-b border-gray-100 px-5 dark:border-dark-700">
              <button
                v-for="tab in tabs"
                :key="tab.value"
                type="button"
                class="border-b-2 px-4 py-3 text-sm font-medium transition-colors"
                :class="activeTab === tab.value
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-gray-200'"
                @click="activeTab = tab.value"
              >
                {{ tab.label }}
              </button>
            </div>

            <div v-if="activeTab === 'accounts'" class="p-5">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p class="text-sm text-gray-500 dark:text-dark-400">{{ t('admin.workers.accountsHint') }}</p>
                <div class="flex items-center gap-2">
                  <button class="btn btn-secondary" :disabled="detailLoading" @click="loadAccounts">
                    <Icon name="refresh" size="sm" :class="detailLoading ? 'animate-spin' : ''" />
                  </button>
                  <button class="btn btn-secondary" @click="openOAuthDialog">
                    <Icon name="key" size="sm" class="mr-2" />
                    {{ t('admin.workers.addOAuth') }}
                  </button>
                  <button class="btn btn-primary" @click="openAPIKeyDialog">
                    <Icon name="plus" size="sm" class="mr-2" />
                    {{ t('admin.workers.addApiKey') }}
                  </button>
                </div>
              </div>

              <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-dark-700">
                <table class="w-full min-w-[720px] text-left text-sm">
                  <thead class="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-dark-800 dark:text-dark-400">
                    <tr>
                      <th class="px-4 py-3">{{ t('admin.workers.accountName') }}</th>
                      <th class="px-4 py-3">{{ t('admin.workers.accountType') }}</th>
                      <th class="px-4 py-3">{{ t('common.status') }}</th>
                      <th class="px-4 py-3">{{ t('admin.workers.models') }}</th>
                      <th class="px-4 py-3 text-right">{{ t('common.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
                    <tr v-if="detailLoading && accounts.length === 0">
                      <td colspan="5" class="px-4 py-12 text-center"><LoadingSpinner /></td>
                    </tr>
                    <tr v-else-if="accounts.length === 0">
                      <td colspan="5" class="px-4 py-12 text-center text-gray-500 dark:text-dark-400">{{ t('admin.workers.noAccounts') }}</td>
                    </tr>
                    <tr v-for="account in accounts" v-else :key="account.id" class="text-gray-700 dark:text-gray-200">
                      <td class="px-4 py-3">
                        <div class="font-medium text-gray-900 dark:text-white">{{ account.name || `#${account.remote_account_id}` }}</div>
                        <div class="mt-0.5 text-xs text-gray-400">#{{ account.remote_account_id }}</div>
                      </td>
                      <td class="px-4 py-3">{{ account.kind === 'openai_oauth' ? 'OAuth' : 'API Key' }}</td>
                      <td class="px-4 py-3"><span class="badge badge-gray">{{ account.status }}</span></td>
                      <td class="max-w-[220px] truncate px-4 py-3">{{ metadataText(account, 'models') || '-' }}</td>
                      <td class="px-4 py-3">
                        <div class="flex justify-end gap-2">
                          <button
                            v-if="account.kind === 'openai_oauth'"
                            class="btn btn-secondary px-3 py-1.5 text-xs"
                            :disabled="isBusy(`refresh-${account.id}`)"
                            @click="refreshAccount(account)"
                          >
                            {{ t('admin.workers.refreshCredential') }}
                          </button>
                          <button
                            class="btn btn-secondary px-3 py-1.5 text-xs"
                            :disabled="isBusy(`test-${account.id}`)"
                            @click="testAccount(account)"
                          >
                            {{ t('admin.workers.testAccount') }}
                          </button>
                          <button
                            class="btn btn-danger px-3 py-1.5 text-xs"
                            :disabled="isBusy(`delete-${account.id}`)"
                            @click="accountPendingDelete = { workerId: selectedWorker.id, account }"
                          >
                            {{ t('common.delete') }}
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-else class="p-5">
              <div class="mb-4 flex items-center justify-between gap-3">
                <p class="text-sm text-gray-500 dark:text-dark-400">{{ t('admin.workers.logsHint') }}</p>
                <button class="btn btn-secondary" :disabled="detailLoading" @click="loadLogs(false)">
                  <Icon name="refresh" size="sm" :class="['mr-2', detailLoading ? 'animate-spin' : '']" />
                  {{ t('common.refresh') }}
                </button>
              </div>
              <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-dark-700">
                <table class="w-full min-w-[840px] text-left text-sm">
                  <thead class="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-dark-800 dark:text-dark-400">
                    <tr>
                      <th class="px-4 py-3">{{ t('admin.workers.time') }}</th>
                      <th class="px-4 py-3">{{ t('admin.workers.requestId') }}</th>
                      <th class="px-4 py-3">{{ t('admin.workers.model') }}</th>
                      <th class="px-4 py-3">{{ t('admin.workers.channel') }}</th>
                      <th class="px-4 py-3">{{ t('admin.workers.tokens') }}</th>
                      <th class="px-4 py-3">{{ t('admin.workers.latency') }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
                    <tr v-if="detailLoading && logs.length === 0">
                      <td colspan="6" class="px-4 py-12 text-center"><LoadingSpinner /></td>
                    </tr>
                    <tr v-else-if="logs.length === 0">
                      <td colspan="6" class="px-4 py-12 text-center text-gray-500 dark:text-dark-400">{{ t('admin.workers.noLogs') }}</td>
                    </tr>
                    <tr v-for="entry in logs" v-else :key="entry.id" class="text-gray-700 dark:text-gray-200">
                      <td class="whitespace-nowrap px-4 py-3">{{ logTime(entry) }}</td>
                      <td class="max-w-[180px] truncate px-4 py-3 font-mono text-xs" :title="entry.request_id">{{ entry.request_id || '-' }}</td>
                      <td class="px-4 py-3">{{ entry.model_name || '-' }}</td>
                      <td class="px-4 py-3">{{ entry.channel_id || '-' }}</td>
                      <td class="px-4 py-3">{{ payloadNumber(entry, 'total_tokens') }}</td>
                      <td class="px-4 py-3">{{ payloadNumber(entry, 'use_time', 's') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="logs.length >= logPageSize" class="mt-4 flex justify-center">
                <button class="btn btn-secondary" :disabled="detailLoading" @click="loadLogs(true)">{{ t('admin.workers.loadMore') }}</button>
              </div>
            </div>
          </template>
        </section>
      </div>
    </div>

    <BaseDialog :show="showCreateDialog" :title="t('admin.workers.addWorker')" @close="showCreateDialog = false">
      <form id="worker-create-form" class="space-y-4" @submit.prevent="createWorker">
        <div>
          <label class="input-label">{{ t('admin.workers.name') }}</label>
          <input v-model.trim="workerForm.name" class="input" required :placeholder="t('admin.workers.namePlaceholder')" />
        </div>
        <div>
          <label class="input-label">{{ t('admin.workers.baseUrl') }}</label>
          <input v-model.trim="workerForm.base_url" class="input font-mono" required placeholder="http://ai-gateway:9999" />
          <p class="mt-1 text-xs text-gray-500 dark:text-dark-400">{{ t('admin.workers.baseUrlHint') }}</p>
        </div>
        <div>
          <label class="input-label">{{ t('admin.workers.pairingToken') }}</label>
          <input v-model.trim="workerForm.pairing_token" type="password" class="input font-mono" required autocomplete="one-time-code" />
          <p class="mt-1 text-xs text-gray-500 dark:text-dark-400">{{ t('admin.workers.pairingTokenHint') }}</p>
        </div>
        <div>
          <label class="input-label">{{ t('admin.workers.workerId') }}</label>
          <input v-model.trim="workerForm.worker_id" class="input font-mono" required />
        </div>
        <div>
          <label class="input-label">{{ t('admin.workers.managementKey') }}</label>
          <input v-model="workerForm.management_key" type="password" class="input font-mono" required autocomplete="new-password" />
          <p class="mt-1 text-xs text-gray-500 dark:text-dark-400">{{ t('admin.workers.managementKeyHint') }}</p>
        </div>
        <div>
          <label class="input-label">{{ t('admin.workers.vaultKey') }}</label>
          <input v-model="workerForm.vault_key" type="password" class="input font-mono" required autocomplete="new-password" />
          <p class="mt-1 text-xs text-gray-500 dark:text-dark-400">{{ t('admin.workers.vaultKeyHint') }}</p>
        </div>
        <div>
          <label class="input-label">{{ t('admin.workers.controlPlaneTarget') }}</label>
          <input v-model.trim="workerForm.control_plane_target" class="input font-mono" required placeholder="sub2api:9090" />
          <p class="mt-1 text-xs text-gray-500 dark:text-dark-400">{{ t('admin.workers.controlPlaneTargetHint') }}</p>
        </div>
        <label class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
          <input v-model="workerForm.control_plane_insecure" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600" />
          <span>{{ t('admin.workers.controlPlaneInsecure') }}</span>
        </label>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="showCreateDialog = false">{{ t('common.cancel') }}</button>
        <button form="worker-create-form" class="btn btn-primary" :disabled="isBusy('worker-create')">{{ t('common.create') }}</button>
      </template>
    </BaseDialog>

    <BaseDialog :show="showAPIKeyDialog" :title="t('admin.workers.addApiKey')" @close="showAPIKeyDialog = false">
      <form id="worker-api-key-form" class="space-y-4" @submit.prevent="createAPIKeyAccount">
        <AccountFields :model-value="accountForm" @update:model-value="Object.assign(accountForm, $event)" />
        <div>
          <label class="input-label">API Key</label>
          <input v-model="accountForm.api_key" type="password" class="input font-mono" required autocomplete="new-password" />
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="showAPIKeyDialog = false">{{ t('common.cancel') }}</button>
        <button form="worker-api-key-form" class="btn btn-primary" :disabled="isBusy('account-create')">{{ t('common.create') }}</button>
      </template>
    </BaseDialog>

    <BaseDialog :show="showOAuthDialog" :title="t('admin.workers.addOAuth')" @close="closeOAuthDialog">
      <form v-if="!oauthSession" id="worker-oauth-start-form" class="space-y-4" @submit.prevent="startOAuth">
        <AccountFields :model-value="oauthAccountForm" @update:model-value="Object.assign(oauthAccountForm, $event)" />
        <p class="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">{{ t('admin.workers.oauthStartHint') }}</p>
      </form>
      <form v-else id="worker-oauth-complete-form" class="space-y-4" @submit.prevent="completeOAuth">
        <p class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-300">{{ t('admin.workers.oauthCallbackHint') }}</p>
        <div>
          <label class="input-label">{{ t('admin.workers.oauthCallback') }}</label>
          <textarea v-model.trim="oauthCallbackInput" class="input min-h-28 font-mono text-xs" required :placeholder="t('admin.workers.oauthCallbackPlaceholder')"></textarea>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="closeOAuthDialog">{{ t('common.cancel') }}</button>
        <button
          :form="oauthSession ? 'worker-oauth-complete-form' : 'worker-oauth-start-form'"
          class="btn btn-primary"
          :disabled="isBusy('oauth')"
        >
          {{ oauthSession ? t('admin.workers.completeOAuth') : t('admin.workers.startOAuth') }}
        </button>
      </template>
    </BaseDialog>

    <ConfirmDialog
      :show="workerPendingDelete !== null"
      :title="t('admin.workers.deleteWorker')"
      :message="t('admin.workers.deleteConfirm', { name: workerPendingDelete?.name || '' })"
      danger
      @confirm="deleteWorker"
      @cancel="workerPendingDelete = null"
    />
    <ConfirmDialog
      :show="accountPendingDelete !== null"
      :title="t('admin.workers.deleteAccount')"
      :message="t('admin.workers.deleteAccountConfirm', { name: accountPendingDelete?.account.name || accountPendingDelete?.account.remote_account_id || '' })"
      danger
      @confirm="deleteAccount"
      @cancel="accountPendingDelete = null"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI, type Worker, type WorkerAccount, type WorkerAccountInput, type WorkerLog } from '@/api/admin'
import AppLayout from '@/components/layout/AppLayout.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import Icon from '@/components/icons/Icon.vue'
import { useAppStore } from '@/stores/app'
import { formatDateTime } from '@/utils/format'
import { sanitizeUrl } from '@/utils/url'

const { t } = useI18n()
const appStore = useAppStore()
const workers = ref<Worker[]>([])
const accounts = ref<WorkerAccount[]>([])
const logs = ref<WorkerLog[]>([])
const selectedWorkerId = ref<number | null>(null)
const activeTab = ref<'accounts' | 'logs'>('accounts')
const loading = ref(false)
const detailLoading = ref(false)
const busyAction = ref('')
const showCreateDialog = ref(false)
const showAPIKeyDialog = ref(false)
const showOAuthDialog = ref(false)
const workerPendingDelete = ref<Worker | null>(null)
const accountPendingDelete = ref<{ workerId: number; account: WorkerAccount } | null>(null)
const accountDialogWorkerId = ref<number | null>(null)
const oauthWorkerId = ref<number | null>(null)
const logPageSize = 50

const emptyAccountForm = (): WorkerAccountInput => ({ name: '', base_url: '', models: '', group: 'default', test_model: '' })
const emptyWorkerForm = () => ({
  name: '', base_url: '', pairing_token: '', worker_id: '', management_key: '', vault_key: '',
  control_plane_target: 'sub2api:9090', control_plane_insecure: true
})
const workerForm = reactive(emptyWorkerForm())
const accountForm = reactive<WorkerAccountInput>({ ...emptyAccountForm(), api_key: '' })
const oauthAccountForm = reactive<WorkerAccountInput>(emptyAccountForm())
const oauthSession = ref<{ session_id: string; authorize_url: string; expires_in: number } | null>(null)
const oauthCallbackInput = ref('')

const selectedWorker = computed(() => workers.value.find((item) => item.id === selectedWorkerId.value) || null)
const tabs = computed(() => [
  { value: 'accounts' as const, label: `${t('admin.workers.accounts')} (${accounts.value.length})` },
  { value: 'logs' as const, label: t('admin.workers.consumeLogs') }
])

const AccountFields = defineComponent({
  props: { modelValue: { type: Object as PropType<WorkerAccountInput>, required: true } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const field = (key: keyof WorkerAccountInput, label: string, placeholder = '') => h('div', [
      h('label', { class: 'input-label' }, label),
      h('input', {
        value: props.modelValue[key] || '',
        placeholder,
        class: 'input',
        required: key === 'name',
        onInput: (event: Event) => emit('update:modelValue', { ...props.modelValue, [key]: (event.target as HTMLInputElement).value })
      })
    ])
    return () => h('div', { class: 'space-y-4' }, [
      field('name', t('admin.workers.accountName'), t('admin.workers.accountNamePlaceholder')),
      field('models', t('admin.workers.models'), t('admin.workers.modelsPlaceholder')),
      field('group', t('admin.workers.group'), 'default'),
      field('base_url', t('admin.workers.upstreamBaseUrl'), t('admin.workers.optional')),
      field('test_model', t('admin.workers.testModel'), t('admin.workers.optional'))
    ])
  }
})

function isBusy(action: string) {
  return busyAction.value === action
}

function errorMessage(error: unknown, fallback: string) {
  return (error as { message?: string })?.message || fallback
}

async function loadWorkers() {
  loading.value = true
  try {
    workers.value = await adminAPI.workers.list()
    if (!workers.value.some((item) => item.id === selectedWorkerId.value)) {
      selectedWorkerId.value = workers.value[0]?.id ?? null
    }
  } catch (error) {
    appStore.showError(errorMessage(error, t('admin.workers.loadFailed')))
  } finally {
    loading.value = false
  }
}

async function selectWorker(id: number) {
  if (selectedWorkerId.value === id) return
  selectedWorkerId.value = id
}

async function loadAccounts() {
  const workerId = selectedWorkerId.value
  if (!workerId) return
  detailLoading.value = true
  try {
    const result = await adminAPI.workers.listAccounts(workerId)
    if (selectedWorkerId.value === workerId) accounts.value = result
  } catch (error) {
    appStore.showError(errorMessage(error, t('admin.workers.accountsLoadFailed')))
  } finally {
    detailLoading.value = false
  }
}

async function loadLogs(append: boolean) {
  const workerId = selectedWorkerId.value
  if (!workerId) return
  detailLoading.value = true
  try {
    const beforeId = append ? logs.value.at(-1)?.id : undefined
    const page = await adminAPI.workers.listLogs(workerId, logPageSize, beforeId)
    if (selectedWorkerId.value === workerId) logs.value = append ? [...logs.value, ...page] : page
  } catch (error) {
    appStore.showError(errorMessage(error, t('admin.workers.logsLoadFailed')))
  } finally {
    detailLoading.value = false
  }
}

async function createWorker() {
  busyAction.value = 'worker-create'
  try {
    const worker = await adminAPI.workers.create({ ...workerForm })
    showCreateDialog.value = false
    Object.assign(workerForm, emptyWorkerForm())
    await loadWorkers()
    selectedWorkerId.value = worker.id
    appStore.showSuccess(t('admin.workers.workerCreated'))
  } catch (error) {
    appStore.showError(errorMessage(error, t('admin.workers.createFailed')))
  } finally {
    busyAction.value = ''
  }
}

function randomBase64(byteLength: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return btoa(String.fromCharCode(...bytes))
}

function openCreateWorkerDialog() {
  Object.assign(workerForm, emptyWorkerForm(), {
    worker_id: `gateway-${Array.from(crypto.getRandomValues(new Uint8Array(6)), (value) => value.toString(16).padStart(2, '0')).join('')}`,
    management_key: randomBase64(32),
    vault_key: randomBase64(32)
  })
  showCreateDialog.value = true
}

async function testWorker() {
  if (!selectedWorkerId.value) return
  busyAction.value = 'worker-test'
  try {
    await adminAPI.workers.testConnection(selectedWorkerId.value)
    await loadWorkers()
    appStore.showSuccess(t('admin.workers.connectionHealthy'))
  } catch (error) {
    await loadWorkers()
    appStore.showError(errorMessage(error, t('admin.workers.connectionFailed')))
  } finally {
    busyAction.value = ''
  }
}

async function deleteWorker() {
  const worker = workerPendingDelete.value
  if (!worker) return
  busyAction.value = 'worker-delete'
  try {
    await adminAPI.workers.remove(worker.id)
    workerPendingDelete.value = null
    if (selectedWorkerId.value === worker.id) selectedWorkerId.value = null
    await loadWorkers()
    appStore.showSuccess(t('admin.workers.workerDeleted'))
  } catch (error) {
    appStore.showError(errorMessage(error, t('admin.workers.deleteFailed')))
  } finally {
    busyAction.value = ''
  }
}

function openAPIKeyDialog() {
  accountDialogWorkerId.value = selectedWorkerId.value
  showAPIKeyDialog.value = accountDialogWorkerId.value !== null
}

async function createAPIKeyAccount() {
  const workerId = accountDialogWorkerId.value
  if (!workerId) return
  busyAction.value = 'account-create'
  try {
    await adminAPI.workers.createAPIKeyAccount(workerId, { ...accountForm })
    showAPIKeyDialog.value = false
    accountDialogWorkerId.value = null
    Object.assign(accountForm, { ...emptyAccountForm(), api_key: '' })
    if (selectedWorkerId.value === workerId) await loadAccounts()
    appStore.showSuccess(t('admin.workers.accountCreated'))
  } catch (error) {
    appStore.showError(errorMessage(error, t('admin.workers.accountCreateFailed')))
  } finally {
    busyAction.value = ''
  }
}

function openOAuthDialog() {
  oauthWorkerId.value = selectedWorkerId.value
  if (!oauthWorkerId.value) return
  oauthSession.value = null
  oauthCallbackInput.value = ''
  Object.assign(oauthAccountForm, emptyAccountForm())
  showOAuthDialog.value = true
}

function closeOAuthDialog() {
  showOAuthDialog.value = false
  oauthSession.value = null
  oauthCallbackInput.value = ''
  oauthWorkerId.value = null
}

async function startOAuth() {
  const workerId = oauthWorkerId.value
  if (!workerId) return
  busyAction.value = 'oauth'
  try {
    const session = await adminAPI.workers.startOAuth(workerId, { ...oauthAccountForm })
    oauthSession.value = session
    const authorizeUrl = sanitizeUrl(session.authorize_url)
    if (authorizeUrl) window.open(authorizeUrl, '_blank', 'noopener,noreferrer')
    else appStore.showWarning(t('admin.workers.oauthUrlInvalid'))
  } catch (error) {
    appStore.showError(errorMessage(error, t('admin.workers.oauthStartFailed')))
  } finally {
    busyAction.value = ''
  }
}

async function completeOAuth() {
  const workerId = oauthWorkerId.value
  if (!workerId || !oauthSession.value) return
  busyAction.value = 'oauth'
  try {
    await adminAPI.workers.completeOAuth(workerId, {
      session_id: oauthSession.value.session_id,
      input: oauthCallbackInput.value
    })
    closeOAuthDialog()
    if (selectedWorkerId.value === workerId) await loadAccounts()
    appStore.showSuccess(t('admin.workers.oauthCompleted'))
  } catch (error) {
    appStore.showError(errorMessage(error, t('admin.workers.oauthCompleteFailed')))
  } finally {
    busyAction.value = ''
  }
}

async function refreshAccount(account: WorkerAccount) {
	const workerId = selectedWorkerId.value
	if (!workerId) return
  busyAction.value = `refresh-${account.id}`
  try {
		await adminAPI.workers.refreshAccount(workerId, account.remote_account_id)
		if (selectedWorkerId.value === workerId) await loadAccounts()
    appStore.showSuccess(t('admin.workers.refreshSuccess'))
  } catch (error) {
    appStore.showError(errorMessage(error, t('admin.workers.refreshFailed')))
  } finally {
    busyAction.value = ''
  }
}

async function testAccount(account: WorkerAccount) {
	const workerId = selectedWorkerId.value
	if (!workerId) return
  busyAction.value = `test-${account.id}`
  try {
    const model = metadataText(account, 'test_model') || metadataText(account, 'models').split(',')[0]?.trim()
		await adminAPI.workers.testAccount(workerId, account.remote_account_id, { model: model || undefined })
		if (selectedWorkerId.value === workerId) await loadAccounts()
    appStore.showSuccess(t('admin.workers.accountHealthy'))
  } catch (error) {
    appStore.showError(errorMessage(error, t('admin.workers.accountTestFailed')))
  } finally {
    busyAction.value = ''
  }
}

async function deleteAccount() {
  const pending = accountPendingDelete.value
  if (!pending) return
  const { workerId, account } = pending
  busyAction.value = `delete-${account.id}`
  try {
    await adminAPI.workers.deleteAccount(workerId, account.remote_account_id)
    accountPendingDelete.value = null
    if (selectedWorkerId.value === workerId) await loadAccounts()
    appStore.showSuccess(t('admin.workers.accountDeleted'))
  } catch (error) {
    appStore.showError(errorMessage(error, t('admin.workers.accountDeleteFailed')))
  } finally {
    busyAction.value = ''
  }
}

function metadataText(account: WorkerAccount, key: string) {
  const value = account.metadata?.[key]
  return value == null ? '' : String(value)
}

function workerStatusClass(status: string) {
  if (status === 'ready' || status === 'connected') return 'badge-success'
  if (status === 'unready') return 'badge-warning'
  if (status === 'unreachable') return 'badge-danger'
  return 'badge-gray'
}

function logTime(entry: WorkerLog) {
  if (entry.worker_created_at > 0) return formatDateTime(new Date(entry.worker_created_at * 1000))
  return formatDateTime(entry.consumed_at)
}

function payloadNumber(entry: WorkerLog, key: string, suffix = '') {
  const value = entry.payload?.[key]
  return value == null || value === '' ? '-' : `${value}${suffix}`
}

watch(selectedWorkerId, async () => {
  accounts.value = []
  logs.value = []
  if (selectedWorkerId.value) await Promise.all([loadAccounts(), loadLogs(false)])
})

onMounted(loadWorkers)
</script>
