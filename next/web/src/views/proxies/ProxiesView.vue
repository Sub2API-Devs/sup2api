<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import {
  SBadge,
  SButton,
  SDropdown,
  SField,
  SIcon,
  SModal,
  SPageHeader,
  SPagination,
  SSelect,
  SSpinner,
  SSwitch,
  STable,
  confirm,
  toast,
  type TableColumn
} from '@sub2api/ui'
import type { Proxy, ProxyTestResult } from '@/api/types'
import { statusTone } from '@/api/admin'
import { useList } from '@/composables/useList'
import { useProxiesLookup } from '@/composables/lookups'
import { PROXY_KEYS, useOwnership } from '@/composables/useOwnership'
import { useAuthStore } from '@/stores/auth'
import { fieldErrors, notifyError } from '@/utils/errors'
import { formatDateTime } from '@/utils/format'
import { parseProxyURL } from '@/utils/proxyUrl'

const { t } = useI18n()
const auth = useAuthStore()
const own = useOwnership()
// Ownership (CONTRACTS §21): proxy:manage acts on every proxy, proxy:own:manage
// only on the caller's; the list is already scoped by the server.
const canCreate = computed(() => auth.has([...PROXY_KEYS.manage]))
const canEditRow = (p: Proxy) => own.can(p, PROXY_KEYS.manage)
const showOwner = computed(() => own.scopeOf(PROXY_KEYS.read) === 'all')
const list = useList<Proxy>('/proxies', { mine: '', created_by: '' })
const onlyMine = computed({
  get: () => list.filters.mine === 'true',
  set: (v: boolean) => {
    list.filters.mine = v ? 'true' : ''
  }
})

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'name', label: t('common.name') },
    { key: 'protocol', label: t('proxies.protocol') },
    { key: 'address', label: t('proxies.address') },
    { key: 'auth', label: t('proxies.auth') },
    { key: 'status', label: t('common.status') },
    { key: 'test', label: t('proxies.testResult') }
  ]
  if (showOwner.value) cols.push({ key: 'created_by', label: t('proxies.createdBy') })
  cols.push({ key: 'created_at', label: t('common.createdAt') })
  if (canCreate.value) cols.push({ key: 'actions', label: t('common.actions'), align: 'right' })
  return cols
})

function statusLabel(s: string) {
  const k = `common.status_.${s}`
  const v = t(k)
  return v === k ? s : v
}

function changed() {
  list.reload()
  useProxiesLookup(true)
}

// ------------------------------------------------------------------ test

const testing = ref<Record<number, boolean>>({})
const results = ref<Record<number, ProxyTestResult & { error?: string }>>({})

async function test(p: Proxy) {
  testing.value = { ...testing.value, [p.id]: true }
  try {
    const r = await api.post<ProxyTestResult>(`/proxies/${p.id}/test`)
    results.value = { ...results.value, [p.id]: r }
  } catch (e) {
    notifyError(e)
    results.value = { ...results.value, [p.id]: { ok: false, message: e instanceof Error ? e.message : String(e) } }
  } finally {
    testing.value = { ...testing.value, [p.id]: false }
  }
}

// ------------------------------------------------------------------ create / edit

const open = ref(false)
const saving = ref(false)
const editing = ref<Proxy | null>(null)
const errors = ref<Record<string, string>>({})
const form = reactive({
  name: '',
  protocol: 'http' as Proxy['protocol'],
  host: '',
  port: 8080 as number | string,
  username: '',
  password: '',
  /** Edit only: explicitly clear the stored password. */
  clearPassword: false,
  status: 'active'
})

const protocolOptions = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks5', label: 'SOCKS5' }
]
const statusOptions = computed(() => [
  { value: 'active', label: t('common.status_.active') },
  { value: 'disabled', label: t('common.status_.disabled') }
])

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', protocol: 'http', host: '', port: 8080, username: '', password: '', clearPassword: false, status: 'active' })
  errors.value = {}
  pasteUrl.value = ''
  pasteError.value = ''
  open.value = true
}

function openEdit(p: Proxy) {
  editing.value = p
  // The password is never returned (only has_password); empty means "keep the stored one".
  Object.assign(form, { name: p.name, protocol: p.protocol, host: p.host, port: p.port, username: p.username || '', password: '', clearPassword: false, status: p.status || 'active' })
  errors.value = {}
  pasteUrl.value = ''
  pasteError.value = ''
  open.value = true
}

const hasStoredPassword = computed(() => !!editing.value?.has_password)

// ------------------------------------------------------------------ paste a proxy URL -> fields (client side, CONTRACTS §21.5)

const pasteUrl = ref('')
const pasteError = ref('')

function applyPastedUrl() {
  pasteError.value = ''
  const raw = pasteUrl.value.trim()
  if (!raw) return
  const r = parseProxyURL(raw)
  if (!r.ok) {
    pasteError.value = t(`proxies.pasteError.${r.error}`)
    return
  }
  const s = r.spec
  form.protocol = s.protocol
  form.host = s.host
  form.port = s.port
  form.username = s.username
  form.password = s.password
  form.clearPassword = false
  if (!form.name.trim()) form.name = `${s.protocol}://${s.host}:${s.port}`.slice(0, 100)
  errors.value = {}
  pasteUrl.value = ''
}

async function submit() {
  errors.value = {}
  if (!form.name.trim()) errors.value.name = t('common.required')
  if (!form.host.trim()) errors.value.host = t('common.required')
  const port = Number(form.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.value.port = t('proxies.portInvalid')
  if (Object.keys(errors.value).length) return
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    protocol: form.protocol,
    host: form.host.trim(),
    port,
    username: form.username.trim()
  }
  if (editing.value) {
    body.status = form.status
    // CONTRACTS §15.4: proxies have no mask convention. Omitted = keep the
    // stored password, "" = clear it, any other string = new password. So an
    // empty field is omitted; "" is sent only when the user asks to clear the
    // password or removes the username (credentials cleared).
    if (form.password) body.password = form.password
    else if (hasStoredPassword.value && (form.clearPassword || !body.username)) body.password = ''
  } else if (form.password) {
    body.password = form.password
  }
  saving.value = true
  try {
    if (editing.value) await api.patch(`/proxies/${editing.value.id}`, body)
    else await api.post('/proxies', body)
    toast(t(editing.value ? 'common.updated' : 'common.created'), 'success')
    open.value = false
    changed()
  } catch (e) {
    errors.value = fieldErrors(e)
    notifyError(e)
  } finally {
    saving.value = false
  }
}

// ------------------------------------------------------------------ row menu

async function onAction(p: Proxy, key: string) {
  if (key === 'toggle') {
    try {
      await api.patch(`/proxies/${p.id}`, { status: p.status === 'active' ? 'disabled' : 'active' })
      toast(t('common.updated'), 'success')
      changed()
    } catch (e) {
      notifyError(e)
    }
  } else if (key === 'delete') {
    const ok = await confirm({ title: t('common.delete'), message: t('common.confirmDelete', { name: p.name }), danger: true })
    if (!ok) return
    try {
      await api.del(`/proxies/${p.id}`)
      toast(t('common.deleted'), 'success')
      changed()
    } catch (e) {
      notifyError(e)
    }
  }
}
</script>

<template>
  <div>
    <SPageHeader :title="t('proxies.title')" :description="t('proxies.description')">
      <template #actions>
        <SButton v-if="canCreate" variant="primary" data-testid="proxy-new" @click="openCreate">+ {{ t('proxies.create') }}</SButton>
      </template>
      <template #filters>
        <input
          v-if="showOwner"
          v-model="list.filters.created_by"
          class="input !w-32"
          inputmode="numeric"
          data-testid="created-by-filter"
          :placeholder="t('common.createdById')"
        />
        <SSwitch v-model="onlyMine" :label="t('common.onlyMine')" data-testid="only-mine" />
      </template>
    </SPageHeader>

    <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value">
      <template #cell-name="{ row }">
        <span class="font-medium text-gray-900 dark:text-white">{{ row.name }}</span>
      </template>
      <template #cell-protocol="{ row }">
        <SBadge tone="gray">{{ String(row.protocol).toUpperCase() }}</SBadge>
      </template>
      <template #cell-address="{ row }">
        <code class="font-mono text-xs">{{ row.host }}:{{ row.port }}</code>
      </template>
      <template #cell-auth="{ row }">
        <span v-if="row.username" class="text-xs">{{ row.username }}<span v-if="row.has_password" class="muted"> / ••••</span></span>
        <span v-else-if="row.has_password" class="text-xs muted">••••</span>
        <span v-else class="muted">{{ t('common.none') }}</span>
      </template>
      <template #cell-status="{ row }">
        <SBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</SBadge>
      </template>
      <template #cell-test="{ row }">
        <SSpinner v-if="testing[row.id]" size="sm" />
        <div v-else-if="results[row.id]" class="text-xs">
          <span v-if="results[row.id].ok" class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <SIcon name="check" class="h-3.5 w-3.5" />
            {{ t('proxies.ok') }}
            <span v-if="results[row.id].latency_ms !== undefined">· {{ results[row.id].latency_ms }} ms</span>
          </span>
          <span v-else class="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
            <SIcon name="x" class="h-3.5 w-3.5" />{{ t('proxies.failed') }}
          </span>
          <div v-if="results[row.id].ip" class="muted">{{ t('proxies.exitIp') }}: <code>{{ results[row.id].ip }}</code></div>
          <div v-if="results[row.id].message" class="muted max-w-xs truncate" :title="results[row.id].message">{{ results[row.id].message }}</div>
        </div>
        <span v-else class="muted">—</span>
      </template>
      <template #cell-created_by="{ row }">
        <span v-if="row.created_by_email" class="text-xs" :title="row.created_by ? `#${row.created_by}` : ''">{{ row.created_by_email }}</span>
        <span v-else-if="row.created_by" class="text-xs muted">#{{ row.created_by }}</span>
        <span v-else class="muted">-</span>
      </template>
      <template #cell-created_at="{ row }">
        <span class="muted">{{ formatDateTime(row.created_at) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div v-if="canEditRow(row)" class="flex items-center justify-end gap-1">
          <SButton variant="ghost" size="sm" :disabled="testing[row.id]" @click="test(row)">{{ t('common.test') }}</SButton>
          <SButton variant="ghost" size="sm" @click="openEdit(row)">{{ t('common.edit') }}</SButton>
          <SDropdown
            :actions="[
              { key: 'toggle', label: row.status === 'active' ? t('common.disable') : t('common.enable') },
              { key: 'delete', label: t('common.delete'), danger: true }
            ]"
            @select="onAction(row, $event)"
          />
        </div>
      </template>
    </STable>
    <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />

    <SModal v-model:open="open" :title="editing ? t('proxies.editTitle', { name: editing.name }) : t('proxies.create')" width="lg">
      <form class="space-y-4" @submit.prevent="submit">
        <SField :label="t('proxies.pasteUrl')" :hint="pasteError ? '' : t('proxies.pasteUrlHint')" :error="pasteError">
          <div class="flex gap-2">
            <input
              v-model="pasteUrl"
              class="input flex-1 font-mono text-sm"
              :class="pasteError ? 'input-error' : ''"
              autocomplete="off"
              spellcheck="false"
              data-testid="proxy-paste-url"
              placeholder="socks5://user:pass@host:port"
              @keydown.enter.prevent="applyPastedUrl"
            />
            <SButton :disabled="!pasteUrl.trim()" data-testid="proxy-paste-apply" @click="applyPastedUrl">{{ t('proxies.pasteFill') }}</SButton>
          </div>
        </SField>
        <div class="grid gap-4 sm:grid-cols-2">
          <SField :label="t('common.name')" required :error="errors.name">
            <input v-model="form.name" class="input" />
          </SField>
          <SField :label="t('proxies.protocol')" required :error="errors.protocol">
            <SSelect v-model="form.protocol" :options="protocolOptions" />
          </SField>
        </div>
        <div class="grid gap-4 sm:grid-cols-[1fr_140px]">
          <SField :label="t('proxies.host')" required :error="errors.host">
            <input v-model="form.host" class="input font-mono" placeholder="10.0.0.5" />
          </SField>
          <SField :label="t('proxies.port')" required :error="errors.port">
            <input v-model.number="form.port" type="number" min="1" max="65535" class="input font-mono" />
          </SField>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <SField :label="t('proxies.username')" :hint="t('common.optional')" :error="errors.username">
            <input v-model="form.username" class="input" autocomplete="off" />
          </SField>
          <SField
            :label="t('proxies.password')"
            :hint="editing ? (hasStoredPassword ? t('proxies.passwordKeep') : t('proxies.passwordNone')) : t('common.optional')"
            :error="errors.password"
          >
            <input
              v-model="form.password"
              type="password"
              class="input"
              autocomplete="new-password"
              :disabled="form.clearPassword"
              :placeholder="editing && hasStoredPassword ? t('proxies.passwordStored') : ''"
            />
            <label v-if="editing && hasStoredPassword" class="mt-1.5 flex items-center gap-1.5 text-xs">
              <input v-model="form.clearPassword" type="checkbox" class="checkbox" data-testid="proxy-clear-password" />
              {{ t('proxies.clearPassword') }}
            </label>
          </SField>
        </div>
        <SField v-if="editing" :label="t('common.status')" :error="errors.status">
          <SSelect v-model="form.status" :options="statusOptions" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="open = false">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving" @click="submit">{{ editing ? t('common.save') : t('common.create') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
