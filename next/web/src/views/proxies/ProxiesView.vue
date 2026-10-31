<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import {
  SStatusBadge,
  SDateTime,
  SBadge,
  SButton,
  SCode,
  SCheckbox,
  SDropdown,
  SField,
  SGrid,
  SHint,
  SIcon,
  SInput,
  SModal,
  SPageHeader,
  SPagination,
  SSelect,
  SSpinner,
  SSwitch,
  STable,
  toast,
  type TableColumn
} from '@sub2api/ui'
import type { Proxy, ProxyProbeResult, ProxyTestResult } from '@/api/types'
import { deleteWithConfirm, toggleStatus, useStatusOptions } from '@/composables/crud'
import { useList } from '@/composables/useList'
import { useProxiesLookup } from '@/composables/lookups'
import { PROXY_KEYS, useOwnership } from '@/composables/useOwnership'
import { useAuthStore } from '@/stores/auth'
import { fieldErrors, notifyError } from '@/utils/errors'
import { applyFormError } from '@/utils/formErrors'
import { parseProxyURL, type ProxySpec } from '@/utils/proxyUrl'

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
    { key: 'real_ip', label: t('proxies.realIp') },
    { key: 'status', label: t('common.status') },
    { key: 'test', label: t('proxies.testResult') }
  ]
  if (showOwner.value) cols.push({ key: 'created_by', label: t('proxies.createdBy') })
  cols.push({ key: 'created_at', label: t('common.createdAt') })
  if (canCreate.value) cols.push({ key: 'actions', label: t('common.actions'), align: 'right' })
  return cols
})

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
    // Reload the list to show the updated real_ip
    changed()
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
const statusOptions = useStatusOptions()

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
const probing = ref(false)
const probeResult = ref<ProxyProbeResult | null>(null)

function applyPastedUrl() {
  pasteError.value = ''
  const raw = pasteUrl.value.trim()
  if (!raw) return
  const r = parseProxyURL(raw)
  if (!r.ok) {
    pasteError.value = t(`proxies.pasteError.${r.error}`)
    return
  }
  fillFrom(r.spec)
  probeResult.value = null
}

/** Puts a parsed proxy URL into the form (and names the proxy after it when unnamed). */
function fillFrom(s: ProxySpec) {
  Object.assign(form, { protocol: s.protocol, host: s.host, port: s.port, username: s.username, password: s.password, clearPassword: false })
  if (!form.name.trim()) form.name = `${s.protocol}://${s.host}:${s.port}`.slice(0, 100)
  errors.value = {}
  pasteUrl.value = ''
}

/** POST /proxies/probe: tries the pasted proxy (socks5, http, then https without a scheme) and fills the form with the protocol that works. */
async function probeProxy() {
  pasteError.value = ''
  probeResult.value = null
  const raw = pasteUrl.value.trim()
  if (!raw) return
  probing.value = true
  try {
    const r = await api.post<ProxyProbeResult>('/proxies/probe', { proxy_url: raw })
    if (!r.ok) {
      const tried = r.attempts.map(a => `${a.protocol}: ${a.message || a.status || t('proxies.failed')}`).join('; ')
      pasteError.value = t('proxies.probeFailed', { error: tried })
      return
    }
    const parsed = parseProxyURL(r.proxy_url || '')
    if (parsed.ok) fillFrom(parsed.spec)
    else {
      errors.value = {}
      pasteUrl.value = ''
    }
    probeResult.value = r
    toast(t('proxies.probeSuccess', { protocol: (r.protocol || '').toUpperCase(), country: r.location?.country_code || '—' }), 'success')
  } catch (e) {
    if (fieldErrors(e).proxy_url) pasteError.value = t('proxies.pasteError.invalid')
    else notifyError(e)
  } finally {
    probing.value = false
  }
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
    applyFormError(e, errors)
  } finally {
    saving.value = false
  }
}

// ------------------------------------------------------------------ row menu

function onAction(p: Proxy, key: string) {
  if (key === 'test') return test(p)
  if (key === 'toggle') return toggleStatus(`/proxies/${p.id}`, p.status, changed)
  if (key === 'delete') return deleteWithConfirm(`/proxies/${p.id}`, t('common.confirmDelete', { name: p.name }), changed)
}
</script>

<template>
  <div>
    <SPageHeader :title="t('proxies.title')" :description="t('proxies.description')">
      <template #actions>
        <SButton v-if="canCreate" variant="primary" data-testid="proxy-new" icon="plus" @click="openCreate">{{ t('proxies.create') }}</SButton>
      </template>
      <template #filters>
        <SInput
          v-if="showOwner"
          v-model="list.filters.created_by"
          class="w-32"
          inputmode="numeric"
          data-testid="created-by-filter"
          :aria-label="t('common.createdById')"
          :placeholder="t('common.createdById')"
        />
        <SSwitch v-model="onlyMine" :label="t('common.onlyMine')" data-testid="only-mine" />
      </template>
    </SPageHeader>

    <STable card :columns="columns" :rows="list.items.value" :loading="list.loading.value">
      <template #cell-name="{ row }">
        <span class="font-medium text-fg">{{ row.name }}</span>
      </template>
      <template #cell-protocol="{ row }">
        <SBadge tone="gray">{{ String(row.protocol).toUpperCase() }}</SBadge>
      </template>
      <template #cell-address="{ row }">
        <SCode inline :text="`${row.host}:${row.port}`" />
      </template>
      <template #cell-auth="{ row }">
        <span v-if="row.username" class="text-xs">{{ row.username }}<SHint v-if="row.has_password" inline size="xs"> / ••••</SHint></span>
        <SHint v-else-if="row.has_password" inline size="xs">••••</SHint>
        <SHint v-else inline>{{ t('common.none') }}</SHint>
      </template>
      <template #cell-real_ip="{ row }">
        <div v-if="row.real_ip" class="text-xs">
          <SCode inline :text="row.real_ip" />
          <SDateTime muted v-if="row.real_ip_updated_at" :value="row.real_ip_updated_at" mode="relative" class="block" />
        </div>
        <SHint v-else inline>—</SHint>
      </template>
      <template #cell-status="{ row }">
        <SStatusBadge :status="row.status" />
      </template>
      <template #cell-test="{ row }">
        <SSpinner v-if="testing[row.id]" size="sm" />
        <div v-else-if="results[row.id]" class="text-xs">
          <SHint v-if="results[row.id].ok" inline size="xs" tone="success" class="inline-flex items-center gap-1">
            <SIcon name="check" class="h-3.5 w-3.5" />
            {{ t('proxies.ok') }}
            <span v-if="results[row.id].latency_ms !== undefined">· {{ results[row.id].latency_ms }} ms</span>
          </SHint>
          <SHint v-else inline size="xs" tone="danger" class="inline-flex items-center gap-1">
            <SIcon name="x" class="h-3.5 w-3.5" />{{ t('proxies.failed') }}
          </SHint>
          <SHint v-if="results[row.id].ip" size="xs">{{ t('proxies.exitIp') }}: <SCode inline :text="results[row.id].ip" /></SHint>
          <SHint v-if="results[row.id].message" size="xs" class="max-w-xs truncate" :title="results[row.id].message">{{ results[row.id].message }}</SHint>
        </div>
        <SHint v-else inline>—</SHint>
      </template>
      <template #cell-created_by="{ row }">
        <span v-if="row.created_by_email" class="text-xs" :title="row.created_by ? `#${row.created_by}` : ''">{{ row.created_by_email }}</span>
        <SHint v-else-if="row.created_by" inline size="xs">#{{ row.created_by }}</SHint>
        <SHint v-else inline>—</SHint>
      </template>
      <template #cell-created_at="{ row }">
        <SDateTime mode="absolute" muted :value="row.created_at" />
      </template>
      <template #cell-actions="{ row }">
        <div v-if="canEditRow(row)" class="flex items-center justify-end gap-1">
          <SButton variant="ghost" size="sm" @click="openEdit(row)">{{ t('common.edit') }}</SButton>
          <SDropdown
            :actions="[
              { key: 'test', label: t('common.test'), disabled: !!testing[row.id] },
              { key: 'toggle', label: row.status === 'active' ? t('common.disable') : t('common.enable') },
              { key: 'delete', label: t('common.delete'), danger: true }
            ]"
            @select="onAction(row, $event)"
          />
        </div>
      </template>
      <template #footer>
        <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
      </template>
    </STable>

    <SModal v-model:open="open" :title="editing ? t('proxies.editTitle', { name: editing.name }) : t('proxies.create')" width="lg">
      <form class="space-y-4" @submit.prevent="submit">
        <SField :label="t('proxies.pasteUrl')" :hint="pasteError ? '' : t('proxies.pasteUrlHint')" :error="pasteError">
          <div class="flex gap-2">
            <SInput
              v-model="pasteUrl"
              class="flex-1 text-sm"
              mono
              :error="!!pasteError"
              autocomplete="off"
              spellcheck="false"
              data-testid="proxy-paste-url"
              placeholder="socks5://user:pass@host:port"
              @keydown.enter.prevent="probeProxy"
            />
            <SButton :disabled="!pasteUrl.trim() || probing" :loading="probing" data-testid="proxy-paste-probe" @click="probeProxy">{{ probing ? t('proxies.probing') : t('proxies.probeProxy') }}</SButton>
            <SButton :disabled="!pasteUrl.trim()" variant="secondary" data-testid="proxy-paste-apply" @click="applyPastedUrl">{{ t('proxies.pasteFill') }}</SButton>
          </div>
          <div v-if="probeResult?.ok" class="mt-2 text-xs text-fg-muted">
            <SIcon name="check" class="inline h-3.5 w-3.5 text-success-600 dark:text-success-400" />
            {{ String(probeResult.protocol).toUpperCase() }}<span v-if="probeResult.latency_ms"> · {{ probeResult.latency_ms }} ms</span>
            <span v-if="probeResult.location"> · {{ [probeResult.location.country_code, probeResult.location.timezone].filter(Boolean).join(' · ') }}</span>
            <span v-if="probeResult.ip" class="ml-2">{{ t('proxies.exitIp') }}: <SCode inline :text="probeResult.ip" /></span>
          </div>
        </SField>
        <SGrid>
          <SField :label="t('common.name')" required :error="errors.name">
            <SInput v-model="form.name" />
          </SField>
          <SField :label="t('proxies.protocol')" required :error="errors.protocol">
            <SSelect v-model="form.protocol" :options="protocolOptions" />
          </SField>
        </SGrid>
        <SGrid sm-template="1fr 140px">
          <SField :label="t('proxies.host')" required :error="errors.host">
            <SInput v-model="form.host" mono placeholder="10.0.0.5" />
          </SField>
          <SField :label="t('proxies.port')" required :error="errors.port">
            <SInput v-model.number="form.port" type="number" min="1" max="65535" mono />
          </SField>
        </SGrid>
        <SGrid>
          <SField :label="t('proxies.username')" :hint="t('common.optional')" :error="errors.username">
            <SInput v-model="form.username" autocomplete="off" />
          </SField>
          <SField
            :label="t('proxies.password')"
            :hint="editing ? (hasStoredPassword ? t('proxies.passwordKeep') : t('proxies.passwordNone')) : t('common.optional')"
            :error="errors.password"
          >
            <SInput
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              :disabled="form.clearPassword"
              :placeholder="editing && hasStoredPassword ? t('proxies.passwordStored') : ''"
            />
            <SCheckbox v-if="editing && hasStoredPassword" v-model="form.clearPassword" class="mt-1.5" :label="t('proxies.clearPassword')" data-testid="proxy-clear-password" />
          </SField>
        </SGrid>
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
