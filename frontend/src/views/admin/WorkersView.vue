<template>
  <AppLayout>
    <TablePageLayout>
      <template #actions>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ t('admin.workers.title') }}</h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('admin.workers.description') }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
              {{ t('admin.workers.autoHeartbeatRefresh') }}
            </span>
            <button class="btn btn-secondary" :disabled="loading" @click="loadWorkers(true)">
              <Icon name="refresh" size="sm" :class="['mr-2', loading ? 'animate-spin' : '']" />
              {{ t('common.refresh') }}
            </button>
            <button class="btn btn-primary" data-testid="add-worker" @click="openCreateWorkerDialog">
              <Icon name="plus" size="sm" class="mr-2" />
              {{ t('admin.workers.addWorker') }}
            </button>
          </div>
        </div>
      </template>

      <template #filters>
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative min-w-[260px] flex-1 md:max-w-md">
            <Icon name="search" size="sm" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input v-model.trim="searchQuery" class="input pl-10" :placeholder="t('admin.workers.searchPlaceholder')" />
          </div>
          <select v-model="statusFilter" class="input w-auto min-w-[150px]">
            <option value="all">{{ t('admin.workers.allStatuses') }}</option>
            <option value="healthy">{{ t('admin.workers.healthy') }}</option>
            <option value="unhealthy">{{ t('admin.workers.unhealthy') }}</option>
            <option value="disabled">{{ t('admin.workers.disabled') }}</option>
          </select>
          <div class="ml-auto flex items-center gap-4 text-sm text-gray-500 dark:text-dark-400">
            <span>{{ t('admin.workers.totalWorkers', { count: workers.length }) }}</span>
            <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-emerald-500"></span>{{ healthyCount }} {{ t('admin.workers.healthy') }}</span>
          </div>
        </div>
      </template>

      <template #table>
        <div class="table-wrapper h-full overflow-auto">
          <table class="w-full min-w-[1080px] table-fixed text-left">
            <thead class="sticky top-0 z-10 bg-gray-50/95 backdrop-blur dark:bg-dark-800/95">
              <tr>
                <th class="w-[19%]">{{ t('admin.workers.name') }}</th>
                <th class="w-[24%]">{{ t('admin.workers.endpointAndVersion') }}</th>
                <th class="w-[16%]">{{ t('admin.workers.heartbeatStatus') }}</th>
                <th class="w-[12%]">{{ t('admin.workers.enabled') }}</th>
                <th class="w-[14%]">{{ t('admin.workers.resources') }}</th>
                <th class="w-[15%] text-right">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading && workers.length === 0">
                <td colspan="6" class="py-20 text-center"><LoadingSpinner /></td>
              </tr>
              <tr v-else-if="filteredWorkers.length === 0">
                <td colspan="6" class="py-20 text-center">
                  <Icon name="server" size="xl" class="mx-auto text-gray-300 dark:text-dark-500" />
                  <p class="mt-3 font-medium text-gray-700 dark:text-gray-200">{{ t('admin.workers.noWorkers') }}</p>
                  <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('admin.workers.noWorkersHint') }}</p>
                </td>
              </tr>
              <tr v-for="worker in filteredWorkers" v-else :key="worker.id" class="group hover:bg-gray-50/70 dark:hover:bg-dark-700/30">
                <td>
                  <div class="font-medium text-gray-900 dark:text-white">{{ worker.name }}</div>
                  <div class="mt-1 truncate font-mono text-xs text-gray-400" :title="worker.remote_worker_id">{{ worker.remote_worker_id }}</div>
                </td>
                <td>
                  <div class="max-w-[220px] truncate text-sm text-gray-700 dark:text-gray-200" :title="worker.base_url">{{ worker.base_url }}</div>
                  <div class="mt-1 truncate text-xs text-gray-400">v{{ worker.version || '-' }} · {{ worker.instance_id || '-' }}</div>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <span :class="['h-2.5 w-2.5 rounded-full', heartbeatDotClass(worker)]"></span>
                    <span :class="['badge', workerStatusClass(worker)]">{{ workerStatusLabel(worker) }}</span>
                  </div>
                  <div class="mt-1.5 text-xs text-gray-400">
                    {{ worker.last_heartbeat_at ? formatRelative(worker.last_heartbeat_at) : t('admin.workers.notChecked') }}
                    <span v-if="worker.last_heartbeat_latency_ms"> · {{ worker.last_heartbeat_latency_ms }}ms</span>
                  </div>
                  <div v-if="worker.last_error" class="mt-1 max-w-[240px] truncate text-xs text-red-500" :title="worker.last_error">{{ worker.last_error }}</div>
                </td>
                <td>
                  <div class="flex items-center gap-2" @click.stop>
                    <Toggle :model-value="worker.enabled" @update:model-value="setWorkerEnabled(worker, $event)" />
                    <span class="hidden text-xs 2xl:inline" :class="worker.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'">
                      {{ worker.enabled ? t('admin.workers.enabled') : t('admin.workers.disabled') }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="flex flex-col items-start gap-1">
                    <button class="whitespace-nowrap rounded-md bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:bg-primary-950/30 dark:text-primary-300" data-testid="worker-accounts" @click="openWorkerDetail(worker)">
                      {{ t('admin.workers.accounts') }} {{ worker.account_count ?? 0 }}
                    </button>
                    <button class="whitespace-nowrap rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-dark-700 dark:text-gray-200" data-testid="worker-usage" @click="openWorkerUsage(worker)">
                      {{ t('admin.workers.usageRecords') }} {{ worker.log_count ?? 0 }}
                    </button>
                  </div>
                </td>
                <td class="text-right">
                  <div class="flex justify-end gap-1">
                    <button class="worker-action" :title="t('common.edit')" data-testid="edit-worker" @click="openEditWorkerDialog(worker)"><Icon name="edit" size="sm" /></button>
                    <button class="worker-action" :title="t('admin.workers.testConnection')" :disabled="isBusy(`worker-test-${worker.id}`)" @click="testWorker(worker)"><Icon name="play" size="sm" /></button>
                    <button class="worker-action" :title="t('admin.workers.usageRecords')" @click="openWorkerUsage(worker)"><Icon name="document" size="sm" /></button>
                    <button class="worker-action text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" :title="t('common.delete')" @click="workerPendingDelete = worker"><Icon name="trash" size="sm" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </TablePageLayout>

    <BaseDialog :show="showWorkerDialog" :title="workerDialogTitle" width="wide" @close="showWorkerDialog = false">
      <form id="worker-form" class="grid gap-5 md:grid-cols-2" @submit.prevent="saveWorker">
        <div>
          <label class="input-label">{{ t('admin.workers.name') }}</label>
          <input v-model.trim="workerForm.name" class="input" required :placeholder="t('admin.workers.namePlaceholder')" />
        </div>
        <div>
          <label class="input-label">{{ t('admin.workers.baseUrl') }}</label>
          <input v-model.trim="workerForm.base_url" class="input font-mono" required placeholder="http://ai-gateway:9999" />
          <p class="mt-1 text-xs text-gray-500">{{ t('admin.workers.baseUrlHint') }}</p>
        </div>
        <template v-if="workerDialogMode === 'create'">
          <div>
            <label class="input-label">{{ t('admin.workers.pairingToken') }}</label>
            <input v-model.trim="workerForm.pairing_token" type="password" class="input font-mono" required autocomplete="one-time-code" />
            <p class="mt-1 text-xs text-gray-500">{{ t('admin.workers.pairingTokenHint') }}</p>
          </div>
          <div>
            <label class="input-label">{{ t('admin.workers.workerId') }}</label>
            <input v-model.trim="workerForm.worker_id" class="input font-mono" required />
          </div>
        </template>
        <div>
          <label class="input-label">{{ t('admin.workers.managementKey') }}</label>
          <input v-model="workerForm.management_key" type="password" class="input font-mono" :required="workerDialogMode === 'create'" autocomplete="new-password" :placeholder="workerDialogMode === 'edit' ? t('admin.workers.keepSecretPlaceholder') : ''" />
          <p class="mt-1 text-xs text-gray-500">{{ t('admin.workers.managementKeyHint') }}</p>
        </div>
        <div v-if="workerDialogMode === 'create'">
          <label class="input-label">{{ t('admin.workers.vaultKey') }}</label>
          <input v-model="workerForm.vault_key" type="password" class="input font-mono" required autocomplete="new-password" />
          <p class="mt-1 text-xs text-gray-500">{{ t('admin.workers.vaultKeyHint') }}</p>
        </div>
        <template v-if="workerDialogMode === 'create'">
          <div>
            <label class="input-label">{{ t('admin.workers.controlPlaneTarget') }}</label>
            <input v-model.trim="workerForm.control_plane_target" class="input font-mono" required placeholder="sub2api:9090" />
            <p class="mt-1 text-xs text-gray-500">{{ t('admin.workers.controlPlaneTargetHint') }}</p>
          </div>
          <label class="mt-6 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
            <Toggle v-model="workerForm.control_plane_insecure" />
            <span>{{ t('admin.workers.controlPlaneInsecure') }}</span>
          </label>
        </template>
        <div>
          <label class="input-label">{{ t('admin.workers.heartbeatInterval') }}</label>
          <input v-model.number="workerForm.heartbeat_interval_seconds" type="number" min="5" max="3600" class="input" required />
          <p class="mt-1 text-xs text-gray-500">{{ t('admin.workers.heartbeatIntervalHint') }}</p>
        </div>
        <div>
          <label class="input-label">{{ t('admin.workers.heartbeatTimeout') }}</label>
          <input v-model.number="workerForm.heartbeat_timeout_seconds" type="number" min="1" max="30" class="input" required />
        </div>
        <label class="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-dark-700 dark:text-gray-200 md:col-span-2">
          <Toggle v-model="workerForm.enabled" />
          <span><strong>{{ t('admin.workers.enableOnSave') }}</strong><span class="ml-2 text-gray-500">{{ t('admin.workers.disableGateHint') }}</span></span>
        </label>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="showWorkerDialog = false">{{ t('common.cancel') }}</button>
        <button form="worker-form" class="btn btn-primary" :disabled="isBusy('worker-save')">{{ workerDialogMode === 'create' ? t('common.create') : t('common.save') }}</button>
      </template>
    </BaseDialog>

    <BaseDialog :show="showDetailDialog" :title="detailTitle" width="extra-wide" @close="closeDetailDialog">
      <div v-if="selectedWorker" class="space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-dark-800">
          <div>
            <div class="flex items-center gap-2"><span class="font-medium text-gray-900 dark:text-white">{{ selectedWorker.name }}</span><span :class="['badge', workerStatusClass(selectedWorker)]">{{ workerStatusLabel(selectedWorker) }}</span></div>
            <div class="mt-1 font-mono text-xs text-gray-400">{{ selectedWorker.remote_worker_id }} · {{ selectedWorker.base_url }}</div>
          </div>
        </div>

        <div>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-gray-500">{{ t('admin.workers.accountsHint') }}</p>
            <div class="flex gap-2"><button class="btn btn-secondary" @click="loadAccounts"><Icon name="refresh" size="sm" /></button><button class="btn btn-secondary" @click="openOAuthDialog">{{ t('admin.workers.addOAuth') }}</button><button class="btn btn-primary" @click="openAPIKeyDialog">{{ t('admin.workers.addApiKey') }}</button></div>
          </div>
          <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-dark-700">
            <table class="w-full min-w-[720px] text-left text-sm"><thead class="bg-gray-50 dark:bg-dark-800"><tr><th>{{ t('admin.workers.accountName') }}</th><th>{{ t('admin.workers.accountType') }}</th><th>{{ t('common.status') }}</th><th>{{ t('admin.workers.models') }}</th><th class="text-right">{{ t('common.actions') }}</th></tr></thead><tbody>
              <tr v-if="detailLoading && accounts.length === 0"><td colspan="5" class="py-12 text-center"><LoadingSpinner /></td></tr>
              <tr v-else-if="accounts.length === 0"><td colspan="5" class="py-12 text-center text-gray-500">{{ t('admin.workers.noAccounts') }}</td></tr>
              <tr v-for="account in accounts" v-else :key="account.id"><td><div class="font-medium">{{ account.name || `#${account.remote_account_id}` }}</div><div class="text-xs text-gray-400">#{{ account.remote_account_id }}</div></td><td>{{ account.kind === 'openai_oauth' ? 'OAuth' : 'API Key' }}</td><td><span class="badge badge-gray">{{ account.status }}</span></td><td>{{ metadataText(account, 'models') || '-' }}</td><td><div class="flex justify-end gap-2"><button v-if="account.kind === 'openai_oauth'" class="btn btn-secondary px-3 py-1.5 text-xs" @click="refreshAccount(account)">{{ t('admin.workers.refreshCredential') }}</button><button class="btn btn-secondary px-3 py-1.5 text-xs" @click="testAccount(account)">{{ t('admin.workers.testAccount') }}</button><button class="btn btn-danger px-3 py-1.5 text-xs" @click="accountPendingDelete = { workerId: selectedWorker.id, account }">{{ t('common.delete') }}</button></div></td></tr>
            </tbody></table>
          </div>
        </div>

      </div>
    </BaseDialog>

    <BaseDialog :show="showAPIKeyDialog" :title="t('admin.workers.addApiKey')" @close="showAPIKeyDialog = false">
      <form id="worker-api-key-form" class="space-y-4" @submit.prevent="createAPIKeyAccount"><AccountFields :model-value="accountForm" @update:model-value="Object.assign(accountForm, $event)" /><div><label class="input-label">API Key</label><input v-model="accountForm.api_key" type="password" class="input font-mono" required autocomplete="new-password" /></div></form>
      <template #footer><button class="btn btn-secondary" @click="showAPIKeyDialog = false">{{ t('common.cancel') }}</button><button form="worker-api-key-form" class="btn btn-primary" :disabled="isBusy('account-create')">{{ t('common.create') }}</button></template>
    </BaseDialog>

    <BaseDialog :show="showOAuthDialog" :title="t('admin.workers.addOAuth')" @close="closeOAuthDialog">
      <form v-if="!oauthSession" id="worker-oauth-start-form" class="space-y-4" @submit.prevent="startOAuth"><AccountFields :model-value="oauthAccountForm" @update:model-value="Object.assign(oauthAccountForm, $event)" /><p class="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{{ t('admin.workers.oauthStartHint') }}</p></form>
      <form v-else id="worker-oauth-complete-form" class="space-y-4" @submit.prevent="completeOAuth"><p class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{{ t('admin.workers.oauthCallbackHint') }}</p><a v-if="oauthAuthorizeUrl" :href="oauthAuthorizeUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"><Icon name="externalLink" size="sm" />{{ t('admin.workers.openOAuthPage') }}</a><div><label class="input-label">{{ t('admin.workers.oauthCallback') }}</label><textarea v-model.trim="oauthCallbackInput" class="input min-h-28 font-mono text-xs" required :placeholder="t('admin.workers.oauthCallbackPlaceholder')"></textarea></div></form>
      <template #footer><button class="btn btn-secondary" @click="closeOAuthDialog">{{ t('common.cancel') }}</button><button :form="oauthSession ? 'worker-oauth-complete-form' : 'worker-oauth-start-form'" class="btn btn-primary" :disabled="isBusy('oauth')">{{ oauthSession ? t('admin.workers.completeOAuth') : t('admin.workers.startOAuth') }}</button></template>
    </BaseDialog>

    <ConfirmDialog :show="workerPendingDelete !== null" :title="t('admin.workers.deleteWorker')" :message="t('admin.workers.deleteConfirm', { name: workerPendingDelete?.name || '' })" danger @confirm="deleteWorker" @cancel="workerPendingDelete = null" />
    <ConfirmDialog :show="accountPendingDelete !== null" :title="t('admin.workers.deleteAccount')" :message="t('admin.workers.deleteAccountConfirm', { name: accountPendingDelete?.account.name || accountPendingDelete?.account.remote_account_id || '' })" danger @confirm="deleteAccount" @cancel="accountPendingDelete = null" />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, onUnmounted, reactive, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { adminAPI, type Worker, type WorkerAccount, type WorkerAccountInput } from '@/api/admin'
import AppLayout from '@/components/layout/AppLayout.vue'
import TablePageLayout from '@/components/layout/TablePageLayout.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import Toggle from '@/components/common/Toggle.vue'
import Icon from '@/components/icons/Icon.vue'
import { useAppStore } from '@/stores/app'
import { formatDateTime } from '@/utils/format'
import { sanitizeUrl } from '@/utils/url'

const { t } = useI18n()
const router = useRouter()
const appStore = useAppStore()
const workers = ref<Worker[]>([])
const accounts = ref<WorkerAccount[]>([])
const selectedWorker = ref<Worker | null>(null)
const loading = ref(false)
const detailLoading = ref(false)
const busyAction = ref('')
const searchQuery = ref('')
const statusFilter = ref('all')
const showWorkerDialog = ref(false)
const workerDialogMode = ref<'create' | 'edit'>('create')
const editingWorkerId = ref<number | null>(null)
const showDetailDialog = ref(false)
const showAPIKeyDialog = ref(false)
const showOAuthDialog = ref(false)
const workerPendingDelete = ref<Worker | null>(null)
const accountPendingDelete = ref<{ workerId: number; account: WorkerAccount } | null>(null)
let refreshTimer: ReturnType<typeof setInterval> | undefined
let workersRequestSequence = 0
let detailPendingRequests = 0

const emptyAccountForm = (): WorkerAccountInput => ({ name: '', base_url: '', models: '', group: 'default', test_model: '' })
const emptyWorkerForm = () => ({ name: '', base_url: '', pairing_token: '', worker_id: '', management_key: '', vault_key: '', control_plane_target: 'sub2api:9090', control_plane_insecure: true, enabled: true, heartbeat_interval_seconds: 15, heartbeat_timeout_seconds: 5 })
const workerForm = reactive(emptyWorkerForm())
const accountForm = reactive<WorkerAccountInput>({ ...emptyAccountForm(), api_key: '' })
const oauthAccountForm = reactive<WorkerAccountInput>(emptyAccountForm())
const oauthSession = ref<{ session_id: string; authorize_url: string; expires_in: number } | null>(null)
const oauthCallbackInput = ref('')

const filteredWorkers = computed(() => workers.value.filter((worker) => {
  const query = searchQuery.value.toLowerCase()
  const searchMatch = !query || [worker.name, worker.remote_worker_id, worker.base_url, worker.instance_id].some((value) => value?.toLowerCase().includes(query))
  const healthy = worker.enabled && ['ready', 'connected'].includes(worker.status)
  const statusMatch = statusFilter.value === 'all' || (statusFilter.value === 'healthy' && healthy) || (statusFilter.value === 'unhealthy' && worker.enabled && !healthy) || (statusFilter.value === 'disabled' && !worker.enabled)
  return searchMatch && statusMatch
}))
const healthyCount = computed(() => workers.value.filter(isWorkerHealthy).length)
const workerDialogTitle = computed(() => workerDialogMode.value === 'create' ? t('admin.workers.addWorker') : t('admin.workers.editWorker'))
const detailTitle = computed(() => `${selectedWorker.value?.name || ''} · ${t('admin.workers.accounts')}`)
const oauthAuthorizeUrl = computed(() => oauthSession.value ? sanitizeUrl(oauthSession.value.authorize_url) : '')

const AccountFields = defineComponent({
  props: { modelValue: { type: Object as PropType<WorkerAccountInput>, required: true } }, emits: ['update:modelValue'],
  setup(props, { emit }) {
    const field = (key: keyof WorkerAccountInput, label: string, placeholder = '') => h('div', [h('label', { class: 'input-label' }, label), h('input', { value: props.modelValue[key] || '', placeholder, class: 'input', required: key === 'name', onInput: (event: Event) => emit('update:modelValue', { ...props.modelValue, [key]: (event.target as HTMLInputElement).value }) })])
    return () => h('div', { class: 'space-y-4' }, [field('name', t('admin.workers.accountName'), t('admin.workers.accountNamePlaceholder')), field('models', t('admin.workers.models'), t('admin.workers.modelsPlaceholder')), field('group', t('admin.workers.group'), 'default'), field('base_url', t('admin.workers.upstreamBaseUrl'), t('admin.workers.optional')), field('test_model', t('admin.workers.testModel'), t('admin.workers.optional'))])
  }
})

function isBusy(action: string) { return busyAction.value === action }
function errorMessage(error: unknown, fallback: string) { return (error as { message?: string })?.message || fallback }
function randomBase64(byteLength: number) { const bytes = crypto.getRandomValues(new Uint8Array(byteLength)); return btoa(String.fromCharCode(...bytes)) }
function isWorkerHealthy(worker: Worker) { return worker.enabled && ['ready', 'connected'].includes(worker.status) }
function workerStatusClass(worker: Worker) { if (!worker.enabled) return 'badge-gray'; if (isWorkerHealthy(worker)) return 'badge-success'; if (worker.status === 'unready') return 'badge-warning'; return 'badge-danger' }
function heartbeatDotClass(worker: Worker) { if (!worker.enabled) return 'bg-gray-300'; if (isWorkerHealthy(worker)) return 'bg-emerald-500'; if (worker.status === 'unready') return 'bg-amber-500'; return 'bg-red-500' }
function workerStatusLabel(worker: Worker) { return !worker.enabled ? t('admin.workers.disabled') : t(`admin.workers.status.${worker.status}`, worker.status) }
function formatRelative(value: string) { const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 10) return t('admin.workers.justNow'); if (seconds < 60) return t('admin.workers.secondsAgo', { seconds }); const minutes = Math.floor(seconds / 60); if (minutes < 60) return t('admin.workers.minutesAgo', { minutes }); return formatDateTime(value) }

async function loadWorkers(showSpinner = false) { const requestSequence = ++workersRequestSequence; if (showSpinner || workers.value.length === 0) loading.value = true; try { const nextWorkers = await adminAPI.workers.list(); if (requestSequence !== workersRequestSequence) return; workers.value = nextWorkers; if (selectedWorker.value) { selectedWorker.value = workers.value.find((item) => item.id === selectedWorker.value?.id) || null; if (!selectedWorker.value) closeDetailDialog() } } catch (error) { if (requestSequence === workersRequestSequence) appStore.showError(errorMessage(error, t('admin.workers.loadFailed'))) } finally { if (requestSequence === workersRequestSequence) loading.value = false } }
function openCreateWorkerDialog() { workerDialogMode.value = 'create'; editingWorkerId.value = null; Object.assign(workerForm, emptyWorkerForm(), { worker_id: `gateway-${Array.from(crypto.getRandomValues(new Uint8Array(6)), (value) => value.toString(16).padStart(2, '0')).join('')}`, management_key: randomBase64(32), vault_key: randomBase64(32) }); showWorkerDialog.value = true }
function openEditWorkerDialog(worker: Worker) { workerDialogMode.value = 'edit'; editingWorkerId.value = worker.id; Object.assign(workerForm, emptyWorkerForm(), { name: worker.name, base_url: worker.base_url, management_key: '', enabled: worker.enabled, heartbeat_interval_seconds: worker.heartbeat_interval_seconds || 15, heartbeat_timeout_seconds: worker.heartbeat_timeout_seconds || 5 }); showWorkerDialog.value = true }
async function saveWorker() { busyAction.value = 'worker-save'; try { if (workerDialogMode.value === 'create') await adminAPI.workers.create({ ...workerForm }); else if (editingWorkerId.value) await adminAPI.workers.update(editingWorkerId.value, { name: workerForm.name, base_url: workerForm.base_url, management_key: workerForm.management_key || undefined, enabled: workerForm.enabled, heartbeat_interval_seconds: workerForm.heartbeat_interval_seconds, heartbeat_timeout_seconds: workerForm.heartbeat_timeout_seconds }); showWorkerDialog.value = false; await loadWorkers(); appStore.showSuccess(t(workerDialogMode.value === 'create' ? 'admin.workers.workerCreated' : 'admin.workers.workerUpdated')) } catch (error) { appStore.showError(errorMessage(error, t(workerDialogMode.value === 'create' ? 'admin.workers.createFailed' : 'admin.workers.updateFailed'))) } finally { busyAction.value = '' } }
async function setWorkerEnabled(worker: Worker, enabled: boolean) { if (isBusy(`worker-enable-${worker.id}`)) return; busyAction.value = `worker-enable-${worker.id}`; const previous = { enabled: worker.enabled, status: worker.status, last_error: worker.last_error }; worker.enabled = enabled; worker.status = enabled ? 'unknown' : 'disabled'; try { const updated = await adminAPI.workers.setEnabled(worker.id, enabled); Object.assign(worker, updated); appStore.showSuccess(t(enabled ? 'admin.workers.workerEnabled' : 'admin.workers.workerDisabled')) } catch (error) { Object.assign(worker, previous); appStore.showError(errorMessage(error, t('admin.workers.enableFailed'))) } finally { busyAction.value = '' } }
async function testWorker(worker: Worker) { busyAction.value = `worker-test-${worker.id}`; try { await adminAPI.workers.testConnection(worker.id); await loadWorkers(); appStore.showSuccess(t('admin.workers.connectionHealthy')) } catch (error) { await loadWorkers(); appStore.showError(errorMessage(error, t('admin.workers.connectionFailed'))) } finally { busyAction.value = '' } }
async function deleteWorker() { const worker = workerPendingDelete.value; if (!worker) return; busyAction.value = 'worker-delete'; try { await adminAPI.workers.remove(worker.id); workerPendingDelete.value = null; await loadWorkers(); appStore.showSuccess(t('admin.workers.workerDeleted')) } catch (error) { appStore.showError(errorMessage(error, t('admin.workers.deleteFailed'))) } finally { busyAction.value = '' } }

function closeDetailDialog() { showDetailDialog.value = false; showAPIKeyDialog.value = false; closeOAuthDialog(); selectedWorker.value = null; accounts.value = [] }
function beginDetailRequest() { detailPendingRequests += 1; detailLoading.value = true }
function finishDetailRequest() { detailPendingRequests = Math.max(0, detailPendingRequests - 1); detailLoading.value = detailPendingRequests > 0 }
async function openWorkerDetail(worker: Worker) { selectedWorker.value = worker; accounts.value = []; showDetailDialog.value = true; await loadAccounts() }
function openWorkerUsage(worker: Worker) { void router.push({ name: 'AdminUsage', query: { worker_id: String(worker.id), worker_name: worker.name } }) }
async function loadAccounts() { const workerId = selectedWorker.value?.id; if (!workerId) return; beginDetailRequest(); try { const nextAccounts = await adminAPI.workers.listAccounts(workerId); if (selectedWorker.value?.id === workerId) accounts.value = nextAccounts } catch (error) { if (selectedWorker.value?.id === workerId) appStore.showError(errorMessage(error, t('admin.workers.accountsLoadFailed'))) } finally { finishDetailRequest() } }
function openAPIKeyDialog() { showAPIKeyDialog.value = selectedWorker.value !== null }
async function createAPIKeyAccount() { const workerId = selectedWorker.value?.id; if (!workerId) return; busyAction.value = 'account-create'; try { await adminAPI.workers.createAPIKeyAccount(workerId, { ...accountForm }); showAPIKeyDialog.value = false; Object.assign(accountForm, { ...emptyAccountForm(), api_key: '' }); await loadAccounts(); await loadWorkers(); appStore.showSuccess(t('admin.workers.accountCreated')) } catch (error) { appStore.showError(errorMessage(error, t('admin.workers.accountCreateFailed'))) } finally { busyAction.value = '' } }
function openOAuthDialog() { if (!selectedWorker.value) return; oauthSession.value = null; oauthCallbackInput.value = ''; Object.assign(oauthAccountForm, emptyAccountForm()); showOAuthDialog.value = true }
function closeOAuthDialog() { showOAuthDialog.value = false; oauthSession.value = null; oauthCallbackInput.value = '' }
async function startOAuth() { const workerId = selectedWorker.value?.id; if (!workerId) return; busyAction.value = 'oauth'; try { const session = await adminAPI.workers.startOAuth(workerId, { ...oauthAccountForm }); oauthSession.value = session; const authorizeUrl = sanitizeUrl(session.authorize_url); if (authorizeUrl) window.open(authorizeUrl, '_blank', 'noopener,noreferrer'); else appStore.showWarning(t('admin.workers.oauthUrlInvalid')) } catch (error) { appStore.showError(errorMessage(error, t('admin.workers.oauthStartFailed'))) } finally { busyAction.value = '' } }
async function completeOAuth() { const workerId = selectedWorker.value?.id; if (!workerId || !oauthSession.value) return; busyAction.value = 'oauth'; try { await adminAPI.workers.completeOAuth(workerId, { session_id: oauthSession.value.session_id, input: oauthCallbackInput.value }); closeOAuthDialog(); await loadAccounts(); await loadWorkers(); appStore.showSuccess(t('admin.workers.oauthCompleted')) } catch (error) { appStore.showError(errorMessage(error, t('admin.workers.oauthCompleteFailed'))) } finally { busyAction.value = '' } }
async function refreshAccount(account: WorkerAccount) { const workerId = selectedWorker.value?.id; if (!workerId) return; try { await adminAPI.workers.refreshAccount(workerId, account.remote_account_id); await loadAccounts(); appStore.showSuccess(t('admin.workers.refreshSuccess')) } catch (error) { appStore.showError(errorMessage(error, t('admin.workers.refreshFailed'))) } }
async function testAccount(account: WorkerAccount) { const workerId = selectedWorker.value?.id; if (!workerId) return; try { const model = metadataText(account, 'test_model') || metadataText(account, 'models').split(',')[0]?.trim(); await adminAPI.workers.testAccount(workerId, account.remote_account_id, { model: model || undefined }); appStore.showSuccess(t('admin.workers.accountHealthy')) } catch (error) { appStore.showError(errorMessage(error, t('admin.workers.accountTestFailed'))) } }
async function deleteAccount() { const pending = accountPendingDelete.value; if (!pending) return; try { await adminAPI.workers.deleteAccount(pending.workerId, pending.account.remote_account_id); accountPendingDelete.value = null; await loadAccounts(); await loadWorkers(); appStore.showSuccess(t('admin.workers.accountDeleted')) } catch (error) { appStore.showError(errorMessage(error, t('admin.workers.accountDeleteFailed'))) } }
function metadataText(account: WorkerAccount, key: string) { const value = account.metadata?.[key]; return value == null ? '' : String(value) }

onMounted(async () => { await loadWorkers(true); refreshTimer = setInterval(() => loadWorkers(false), 10_000) })
onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer) })
</script>

<style scoped>
.worker-action { @apply rounded-lg p-2 text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-dark-400 dark:hover:bg-primary-950/30 dark:hover:text-primary-300; }
th { @apply whitespace-nowrap px-5 py-4 text-sm font-medium text-gray-600 dark:text-dark-300; }
td { @apply border-t border-gray-100 px-5 py-4 text-sm text-gray-700 dark:border-dark-800 dark:text-gray-300; }
</style>
