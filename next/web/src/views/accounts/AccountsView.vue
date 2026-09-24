<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SDropdown, SIcon, SModal, SPageHeader, SPagination, SSwitch, STable, STabs, confirm, toast, type TableColumn } from '@sub2api/ui'
import type { Account, AccountTestResult, AccountType } from '@/api/types'
import { useList } from '@/composables/useList'
import { useGroupsLookup } from '@/composables/lookups'
import { useAuthStore } from '@/stores/auth'
import { usePluginStore } from '@/stores/plugins'
import { errorMessage, notifyError } from '@/utils/errors'
import { copyText, formatDateTime, formatRelative, formatTime } from '@/utils/format'
import { useAccountTypes } from './accountTypes'
import AccountTypePicker from './AccountTypePicker.vue'
import AccountEditor from './AccountEditor.vue'

const { t } = useI18n()
const auth = useAuthStore()
const plugins = usePluginStore()
const accountTypes = useAccountTypes()
accountTypes.load()
const { groups } = useGroupsLookup()

const list = useList<Account>('/accounts', { platform: '', group_id: '', status: '', q: '' })

const columns = computed<TableColumn[]>(() => [
  { key: 'id', label: 'ID', width: '64px' },
  { key: 'name', label: t('common.name') },
  { key: 'type', label: t('accounts.type') },
  { key: 'groups', label: t('accounts.groups') },
  { key: 'status', label: t('common.status') },
  { key: 'priority', label: t('accounts.priorityShort'), align: 'right' },
  { key: 'concurrency', label: t('accounts.concurrency'), align: 'right' },
  { key: 'actions', label: t('common.actions'), align: 'right' }
])

function groupNames(ids: number[] | undefined) {
  if (!ids?.length) return '—'
  return ids.map((id) => groups.value.find((g) => g.id === id)?.name || `#${id}`).join(', ')
}

function coolingDown(a: Account) {
  return !!a.cooldown_until && new Date(a.cooldown_until).getTime() > Date.now()
}

type StatusView = { tone: 'success' | 'warning' | 'danger' | 'gray'; label: string; detail?: string }
function statusOf(a: Account): StatusView {
  if (a.orphaned) return { tone: 'gray', label: t('accounts.status.orphaned'), detail: t('accounts.orphanedHint', { plugin: a.plugin_key }) }
  if (a.status === 'disabled') return { tone: 'danger', label: t('accounts.status.disabled'), detail: a.status_reason }
  if (a.status === 'error') return { tone: 'danger', label: t('accounts.status.error'), detail: a.status_reason }
  if (coolingDown(a)) {
    return {
      tone: 'warning',
      label: t('accounts.status.cooldown'),
      detail: t('accounts.cooldownUntil', { time: formatTime(a.cooldown_until) }) + (a.cooldown_reason ? `（${a.cooldown_reason}）` : '')
    }
  }
  if (!a.schedulable) return { tone: 'gray', label: t('accounts.status.unschedulable') }
  return { tone: 'success', label: t('accounts.status.active') }
}

// ---------------------------------------------------------------- auto refresh (in_use / cooldown)
const autoRefresh = ref(true)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (autoRefresh.value && !editorOpen.value && !document.hidden) list.reload()
  }, 10000)
})
onBeforeUnmount(() => clearInterval(timer))

// ---------------------------------------------------------------- create / edit
const editorOpen = ref(false)
const step = ref<1 | 2>(1)
const pickedType = ref<AccountType | null>(null)
const editing = ref<Account | null>(null)
const editorLoading = ref(false)

const editorTitle = computed(() => {
  if (editing.value) return `${t('accounts.editTitle')} · ${editing.value.name}`
  if (step.value === 1) return t('accounts.newStep1')
  return `${t('accounts.newTitle')} · ${pickedType.value ? accountTypes.label(pickedType.value.platform, pickedType.value.type) : ''}`
})

function openCreate() {
  editing.value = null
  pickedType.value = null
  step.value = 1
  editorOpen.value = true
}

function pick(at: AccountType) {
  pickedType.value = at
  step.value = 2
}

async function openEdit(a: Account) {
  editorLoading.value = true
  editorOpen.value = true
  step.value = 2
  try {
    const full = await api.get<Account>(`/accounts/${a.id}`)
    editing.value = full
    await accountTypes.load()
    pickedType.value = accountTypes.find(full.platform, full.type) || null
  } catch (e) {
    notifyError(e)
    editorOpen.value = false
  } finally {
    editorLoading.value = false
  }
}

function onSaved() {
  editorOpen.value = false
  list.reload()
}

// ---------------------------------------------------------------- test
const testOpen = ref(false)
const testing = ref(false)
const testTarget = ref<Account | null>(null)
const testModel = ref('')
const testResult = ref<AccountTestResult | null>(null)
const testError = ref('')

function openTest(a: Account) {
  testTarget.value = a
  testModel.value = ''
  testResult.value = null
  testError.value = ''
  testOpen.value = true
}

async function runTest() {
  if (!testTarget.value) return
  testing.value = true
  testResult.value = null
  testError.value = ''
  try {
    testResult.value = await api.post<AccountTestResult>(`/accounts/${testTarget.value.id}/test`, testModel.value ? { model: testModel.value } : {})
  } catch (e) {
    testError.value = errorMessage(e)
  } finally {
    testing.value = false
  }
}

// ---------------------------------------------------------------- reveal credentials
const revealOpen = ref(false)
const revealed = ref<Record<string, unknown> | null>(null)
async function reveal(a: Account) {
  try {
    revealed.value = await api.post<Record<string, unknown>>(`/accounts/${a.id}/credentials/reveal`)
    revealOpen.value = true
  } catch (e) {
    notifyError(e)
  }
}
async function copyRevealed() {
  if (revealed.value && (await copyText(JSON.stringify(revealed.value, null, 2)))) toast(t('common.copied'), 'success')
}

// ---------------------------------------------------------------- detail
const detailOpen = ref(false)
const detail = ref<Account | null>(null)
const detailTab = ref('overview')
const detailTabs = computed(() => [
  { key: 'overview', label: t('accounts.overview') },
  ...plugins.slotEntries('account.detail.tabs').map((e) => ({ key: `${e.pluginKey}:${e.name}`, label: tabLabel(e.pluginKey, e.name) }))
])
function tabLabel(pluginKey: string, name: string) {
  const msgKey = `plugin.${pluginKey}.tabs.${name}`
  const translated = t(msgKey)
  return translated !== msgKey ? translated : `${pluginKey} · ${name}`
}
const detailSlot = computed(() => plugins.slotEntries('account.detail.tabs').find((e) => `${e.pluginKey}:${e.name}` === detailTab.value))

async function openDetail(a: Account) {
  detailTab.value = 'overview'
  detail.value = a
  detailOpen.value = true
  try {
    detail.value = await api.get<Account>(`/accounts/${a.id}`)
  } catch (e) {
    notifyError(e)
  }
}

// ---------------------------------------------------------------- row actions
async function toggleSchedulable(a: Account, v: boolean) {
  try {
    await api.patch(`/accounts/${a.id}`, { schedulable: v })
    a.schedulable = v
  } catch (e) {
    notifyError(e)
  }
}

async function remove(a: Account) {
  if (!(await confirm({ message: t('common.confirmDelete', { name: a.name }), danger: true }))) return
  try {
    await api.del(`/accounts/${a.id}`)
    toast(t('common.deleted'), 'success')
    list.reload()
  } catch (e) {
    notifyError(e)
  }
}

function actionsFor(a: Account) {
  return [
    { key: 'detail', label: t('common.detail') },
    { key: 'reveal', label: t('accounts.revealCredentials'), hidden: !auth.has('account:credential:view') || a.orphaned },
    { key: 'delete', label: t('common.delete'), danger: true, hidden: !auth.has('account:delete') }
  ]
}

function onAction(a: Account, key: string) {
  if (key === 'detail') openDetail(a)
  else if (key === 'reveal') reveal(a)
  else if (key === 'delete') remove(a)
}

const statusOptions = ['active', 'disabled', 'error']
</script>

<template>
  <div>
    <SPageHeader :title="t('accounts.title')" :description="t('accounts.subtitle')">
      <template #actions>
        <SSwitch v-model="autoRefresh" :label="t('accounts.autoRefresh')" />
        <SButton @click="list.reload()"><SIcon name="refresh" class="h-4 w-4" /></SButton>
        <SButton v-permission="'account:create'" variant="primary" @click="openCreate"><SIcon name="plus" class="h-4 w-4" />{{ t('accounts.new') }}</SButton>
      </template>
      <template #filters>
        <select v-model="list.filters.platform" class="input !w-40">
          <option value="">{{ t('accounts.allPlatforms') }}</option>
          <option v-for="p in accountTypes.platforms()" :key="p" :value="p">{{ p }}</option>
        </select>
        <select v-model="list.filters.group_id" class="input !w-40">
          <option value="">{{ t('accounts.allGroups') }}</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
        <select v-model="list.filters.status" class="input !w-36">
          <option value="">{{ t('accounts.allStatus') }}</option>
          <option v-for="s in statusOptions" :key="s" :value="s">{{ t(`accounts.status.${s}`) }}</option>
        </select>
        <div class="relative w-64">
          <SIcon name="search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input v-model="list.filters.q" class="input !pl-9" :placeholder="t('common.searchPlaceholder')" />
        </div>
      </template>
    </SPageHeader>

    <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value">
      <template #cell-name="{ row }">
        <button class="link font-medium" @click="openDetail(row)">{{ row.name }}</button>
        <div v-if="row.last_used_at" class="text-xs text-gray-400">{{ t('accounts.lastUsed') }} {{ formatRelative(row.last_used_at, t) }}</div>
      </template>
      <template #cell-type="{ row }">
        <span class="whitespace-nowrap">{{ accountTypes.label(row.platform, row.type) }}</span>
        <SBadge v-if="row.orphaned" tone="gray" class="ml-1">{{ t('accounts.status.orphaned') }}</SBadge>
      </template>
      <template #cell-groups="{ row }">{{ groupNames(row.group_ids) }}</template>
      <template #cell-status="{ row }">
        <SBadge :tone="statusOf(row).tone" dot>{{ statusOf(row).label }}</SBadge>
        <div v-if="statusOf(row).detail" class="mt-0.5 max-w-[16rem] truncate text-xs text-gray-500 dark:text-dark-400" :title="statusOf(row).detail">
          {{ statusOf(row).detail }}
        </div>
      </template>
      <template #cell-concurrency="{ row }">
        <span class="tabular-nums" :class="row.max_concurrency && (row.in_use || 0) >= row.max_concurrency ? 'font-semibold text-amber-600' : ''">
          {{ row.in_use ?? 0 }}/{{ row.max_concurrency || '∞' }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <SSwitch
            v-if="auth.has('account:update') && !row.orphaned"
            :model-value="row.schedulable"
            :title="t('accounts.schedulable')"
            @update:model-value="toggleSchedulable(row, $event)"
          />
          <SButton v-if="auth.has('account:test') && !row.orphaned" size="sm" variant="ghost" @click="openTest(row)">{{ t('common.test') }}</SButton>
          <SButton v-if="auth.has('account:update')" size="sm" variant="ghost" @click="openEdit(row)">{{ t('common.edit') }}</SButton>
          <SDropdown :actions="actionsFor(row)" @select="onAction(row, $event)" />
        </div>
      </template>
    </STable>
    <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />

    <!-- create / edit -->
    <SModal v-model:open="editorOpen" :title="editorTitle" width="xl" persistent>
      <div v-if="editorLoading" class="py-10 text-center text-gray-400">{{ t('common.loading') }}</div>
      <AccountTypePicker v-else-if="!editing && step === 1" @pick="pick" />
      <AccountEditor
        v-else
        :account-type="pickedType"
        :account="editing"
        @saved="onSaved"
        @cancel="editorOpen = false"
        @back="step = 1"
        @test="openTest"
      />
    </SModal>

    <!-- test -->
    <SModal v-model:open="testOpen" :title="`${t('accounts.testConnection')} · ${testTarget?.name || ''}`" width="md">
      <div class="space-y-4">
        <div class="flex gap-2">
          <input v-model="testModel" class="input" :placeholder="t('accounts.testModelPlaceholder')" @keydown.enter="runTest" />
          <SButton variant="primary" :loading="testing" @click="runTest">{{ t('common.test') }}</SButton>
        </div>
        <div v-if="testResult" class="rounded-xl p-4 text-sm" :class="testResult.ok ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'">
          <p class="font-medium" :class="testResult.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'">
            {{ testResult.ok ? t('accounts.testOk') : t('accounts.testFailed') }}
          </p>
          <dl class="kv mt-2">
            <dt>HTTP</dt>
            <dd>{{ testResult.status }}</dd>
            <dt>{{ t('accounts.latency') }}</dt>
            <dd>{{ testResult.latency_ms }} ms</dd>
            <template v-if="testResult.message">
              <dt>{{ t('accounts.message') }}</dt>
              <dd class="break-all">{{ testResult.message }}</dd>
            </template>
          </dl>
        </div>
        <p v-if="testError" class="text-sm text-red-500">{{ testError }}</p>
      </div>
    </SModal>

    <!-- reveal -->
    <SModal v-model:open="revealOpen" :title="t('accounts.revealCredentials')" width="lg" @close="revealed = null">
      <p class="mb-3 text-sm text-amber-600 dark:text-amber-400">{{ t('accounts.revealWarning') }}</p>
      <pre class="code-block">{{ JSON.stringify(revealed, null, 2) }}</pre>
      <template #footer>
        <SButton @click="copyRevealed"><SIcon name="copy" class="h-4 w-4" />{{ t('common.copy') }}</SButton>
        <SButton variant="primary" @click="revealOpen = false">{{ t('common.close') }}</SButton>
      </template>
    </SModal>

    <!-- detail -->
    <SModal v-model:open="detailOpen" :title="detail?.name || ''" width="xl">
      <template v-if="detail">
        <STabs v-model="detailTab" :tabs="detailTabs" class="mb-4" />
        <div v-if="detailTab === 'overview'" class="space-y-4">
          <dl class="kv">
            <dt>ID</dt>
            <dd>{{ detail.id }}</dd>
            <dt>{{ t('accounts.type') }}</dt>
            <dd>{{ accountTypes.label(detail.platform, detail.type) }} <span class="muted">({{ detail.plugin_key }})</span></dd>
            <dt>{{ t('common.status') }}</dt>
            <dd>
              <SBadge :tone="statusOf(detail).tone" dot>{{ statusOf(detail).label }}</SBadge>
              <span v-if="statusOf(detail).detail" class="ml-2 text-xs muted">{{ statusOf(detail).detail }}</span>
            </dd>
            <dt>{{ t('accounts.groups') }}</dt>
            <dd>{{ groupNames(detail.group_ids) }}</dd>
            <dt>{{ t('accounts.priority') }}</dt>
            <dd>{{ detail.priority }}</dd>
            <dt>{{ t('accounts.concurrency') }}</dt>
            <dd>{{ detail.in_use ?? 0 }}/{{ detail.max_concurrency || '∞' }}</dd>
            <dt>{{ t('accounts.schedulable') }}</dt>
            <dd>{{ detail.schedulable ? t('common.yes') : t('common.no') }}</dd>
            <dt>{{ t('accounts.lastUsed') }}</dt>
            <dd>{{ formatDateTime(detail.last_used_at) }}</dd>
            <dt>{{ t('common.createdAt') }}</dt>
            <dd>{{ formatDateTime(detail.created_at) }}</dd>
          </dl>
          <div v-if="detail.credentials">
            <h4 class="section-title">{{ t('accounts.credentials') }}</h4>
            <pre class="code-block">{{ JSON.stringify(detail.credentials, null, 2) }}</pre>
          </div>
        </div>
        <component :is="detailSlot.component" v-else-if="detailSlot" :account="detail" />
      </template>
    </SModal>
  </div>
</template>
