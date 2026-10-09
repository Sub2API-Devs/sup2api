<script setup lang="ts">
import { computed, ref } from 'vue'
import { api } from '@sub2api/host'
import { useI18n } from 'vue-i18n'
import { isFeatureCatalog, type FeatureCatalog } from './featureCatalog'

const props = defineProps<{ featureId: string }>()
const { t } = useI18n()
interface Capability {
  protocol_version: number
  build: { version: string; revision: string; modified: boolean }
  code_catalog: FeatureCatalog
  policy_schema_versions: number[]
  helper_history_schema_versions?: number[]
  runtime_probes: Array<{ name: string; status: string; value?: string }>
  model_provider_verification: 'not_run'
}
const accounts = ref<Array<{ id: number; name: string }>>([])
const selectedAccount = ref<{ id: number; name: string } | null>(null)
const accountOptions = computed(() => selectedAccount.value && !accounts.value.some(item => item.id === selectedAccount.value?.id) ? [selectedAccount.value, ...accounts.value] : accounts.value)
const search = ref(''), accountPage = ref(1), total = ref(0), accountsBusy = ref(false), accountsFailed = ref(false)
const pageSize = 20
let listSequence = 0
const account = ref(''), busy = ref(false), failed = ref(false), opened = ref(false)
const result = ref<Capability | null>(null)
const feature = computed(() => result.value?.code_catalog.features.find(item => item.id === props.featureId))
function valid(value: unknown): value is Capability {
  if (!value || typeof value !== 'object') return false
  const v = value as Capability
  return v.protocol_version === 1 && !!v.build && typeof v.build.version === 'string' && typeof v.build.revision === 'string' && typeof v.build.modified === 'boolean' && isFeatureCatalog(v.code_catalog) &&
    (v.helper_history_schema_versions === undefined || (Array.isArray(v.helper_history_schema_versions) && v.helper_history_schema_versions.length <= 16 && new Set(v.helper_history_schema_versions).size === v.helper_history_schema_versions.length && v.helper_history_schema_versions.every(n => Number.isSafeInteger(n) && n > 0 && n <= 1024))) &&
    Array.isArray(v.policy_schema_versions) && v.policy_schema_versions.every(n => Number.isSafeInteger(n) && n > 0) && Array.isArray(v.runtime_probes) &&
    v.runtime_probes.every(p => p.name === 'cli_version' && ['observed', 'unavailable'].includes(p.status) && (p.value === undefined || typeof p.value === 'string')) && v.model_provider_verification === 'not_run'
}
async function open() {
  opened.value = true
  await loadAccounts(1)
}
async function loadAccounts(page: number) {
  const sequence = ++listSequence
  accountsBusy.value = true; accountsFailed.value = false
  try {
    const response = await api.list<{ id: number; name: string }>('/accounts', { plugin_key: 'ccgateway', page, page_size: pageSize, q: search.value.trim() })
    if (sequence !== listSequence) return
    accounts.value = response.items
    accountPage.value = page
    total.value = response.page?.total ?? response.items.length
  } catch { if (sequence === listSequence) accountsFailed.value = true }
  finally { if (sequence === listSequence) accountsBusy.value = false }
}
function selectAccount() {
  selectedAccount.value = accountOptions.value.find(item => String(item.id) === account.value) || null
  result.value = null; failed.value = false
}
async function inspect() {
  result.value = null; failed.value = false
  if (!account.value || busy.value) return
  const selected = account.value
  busy.value = true
  try {
    const value = await api.get<unknown>(`/system/ccgateway/accounts/${selected}/features`)
    if (!valid(value)) throw new Error('invalid runtime capability response')
    if (account.value === selected) result.value = value
  } catch { if (account.value === selected) failed.value = true }
  finally { busy.value = false }
}
</script>

<template>
  <section class="space-y-2 rounded border border-gray-200 p-3 text-xs dark:border-dark-700" data-testid="worker-capabilities">
    <button v-if="!opened" type="button" class="text-teal-600" @click="open">{{ t('ccgateway.capability.inspect') }}</button>
    <template v-else>
      <form class="flex gap-2" @submit.prevent="loadAccounts(1)">
        <input v-model="search" type="search" class="input min-w-0 flex-1" :aria-label="t('ccgateway.capability.search')" :placeholder="t('ccgateway.capability.search')" data-testid="capability-account-search" />
        <button type="submit" class="btn btn-secondary btn-sm" :disabled="accountsBusy">{{ t('ccgateway.capability.search') }}</button>
      </form>
      <div class="flex flex-wrap gap-2">
        <select v-model="account" class="input min-w-40 flex-1" :aria-label="t('ccgateway.capability.account')" @change="selectAccount">
          <option value="">{{ t('ccgateway.capability.account') }}</option><option v-for="item in accountOptions" :key="item.id" :value="String(item.id)">#{{ item.id }} {{ item.name }}</option>
        </select>
        <button type="button" class="btn btn-secondary btn-sm" :disabled="busy || !account" data-testid="capability-inspect" @click="inspect">{{ t('ccgateway.capability.inspect') }}</button>
      </div>
      <div class="flex items-center justify-end gap-2">
        <button type="button" :disabled="accountsBusy || accountPage === 1" data-testid="capability-previous" @click="loadAccounts(accountPage - 1)">{{ t('ccgateway.features.previous') }}</button>
        <span>{{ accountPage }} / {{ Math.max(1, Math.ceil(total / pageSize)) }}</span>
        <button type="button" :disabled="accountsBusy || accountPage * pageSize >= total" data-testid="capability-next" @click="loadAccounts(accountPage + 1)">{{ t('ccgateway.features.next') }}</button>
      </div>
      <p>{{ t('ccgateway.capability.boundary') }}</p>
      <p v-if="busy || accountsBusy" role="status">{{ t('ccgateway.features.loading') }}</p>
      <p v-if="failed || accountsFailed" role="alert" class="text-amber-700">{{ t('ccgateway.capability.failed') }}</p>
      <dl v-if="result" class="grid gap-2 sm:grid-cols-2">
        <div><dt>{{ t('ccgateway.capability.build') }}</dt><dd class="break-all">{{ result.build.version }} · {{ result.build.revision }}{{ result.build.modified ? ' (modified)' : '' }}</dd></div>
        <div><dt>{{ t('ccgateway.capability.schema') }}</dt><dd>{{ result.code_catalog.catalog_version }} / {{ result.policy_schema_versions.join(', ') }}</dd></div>
        <div class="sm:col-span-2" data-testid="helper-history-capability"><dt>{{ t('ccgateway.capability.helperHistory') }}</dt><dd>{{ result.helper_history_schema_versions?.length ? result.helper_history_schema_versions.join(', ') : t('ccgateway.capability.helperUnreported') }}</dd><p class="mt-1 text-gray-500">{{ t('ccgateway.capability.helperBoundary') }}</p></div>
        <div><dt>{{ t('ccgateway.capability.code') }}</dt><dd>{{ feature ? t('ccgateway.features.status.' + feature.status) : t('ccgateway.capability.unreported') }}</dd></div>
        <div><dt>{{ t('ccgateway.capability.probes') }}</dt><dd v-for="probe in result.runtime_probes" :key="probe.name">{{ probe.name }}: {{ probe.status === 'observed' ? probe.value : t('ccgateway.capability.unreported') }}</dd><dd v-if="!result.runtime_probes.length">{{ t('ccgateway.capability.unreported') }}</dd></div>
        <div class="sm:col-span-2"><dt>{{ t('ccgateway.capability.provider') }}</dt><dd>{{ t('ccgateway.capability.notRun') }}</dd></div>
        <p v-if="feature" class="sm:col-span-2 text-gray-500">{{ feature.reason }}</p>
      </dl>
    </template>
  </section>
</template>
