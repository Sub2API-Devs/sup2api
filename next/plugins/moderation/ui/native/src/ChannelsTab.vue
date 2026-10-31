<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SChip, SDescriptions, SField, SHint, SInput, SModal, SSegmented, SSelect, SSwitch, STable, type DescItem, type TableColumn } from '@sub2api/ui'
import CostSummaryText from './pages/CostSummaryText.vue'
import { loadStatus, prime, status } from './pages/catalog'
import { proxyField, proxyNeedsKey, toggleBody, validProxy, type EmptyProxy } from './pages/channelForm'
import {
  callCostText,
  canManage,
  deleteChannel,
  enumLabel,
  errorMessage,
  fetchChannels,
  money,
  saveChannel,
  testChannel,
  useModHost,
  type Channel,
  type ChannelTestResult,
  type ChannelType,
  type Protocol
} from './host'

// Channels (CONTRACTS §72.6, §72.14.3, §72.14.6): the upstreams auditors
// call. Keys and proxies are sealed with the host key and never shown again
// (only the last 4 characters of the key and whether a proxy is set).
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => host.i18n.formatNumber(v ?? 0)
const manage = computed(() => canManage())

const rows = ref<Channel[]>([])
const loading = ref(false)
const error = ref('')

async function reload() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await fetchChannels()
    prime('channels', rows.value)
  } catch (e) {
    error.value = errorMessage(e, t('channels.loadFailed'))
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  reload()
  loadStatus()
})
defineExpose({ reload })

/** The 1 h error rate turns red above the alert threshold of the settings (default 5 %). */
const alertPercent = computed(() => status.value?.error_rate_alert_percent ?? 5)
const pct = (v: number) => `${host.i18n.formatNumber(v * 100, 1)}%`

const columns = computed<TableColumn[]>(() => {
  const c: TableColumn[] = [
    { key: 'name', label: t('channels.col.name'), nowrap: true },
    { key: 'type', label: t('channels.col.type'), nowrap: true },
    { key: 'base_url', label: t('channels.col.baseUrl'), ellipsis: '13rem' },
    { key: 'model', label: t('channels.col.model'), ellipsis: '10rem' },
    { key: 'used_by', label: t('pagesP3.channels.usedBy') },
    { key: 'health', label: t('pagesP3.channels.health'), align: 'right', nowrap: true },
    { key: 'today', label: t('pagesP3.channels.today'), align: 'right', nowrap: true },
    { key: 'enabled', label: t('channels.col.enabled'), nowrap: true }
  ]
  if (manage.value) c.push({ key: 'actions', label: '', align: 'right' })
  return c
})

const typeOptions = computed(() => (['openai_moderation', 'typesafe', 'llm'] as ChannelType[]).map((v) => ({ value: v, label: t(`channelType.${v}`) })))
const protocols: Protocol[] = ['openai_chat', 'openai_responses', 'anthropic']
const protocolOptions = computed(() => protocols.map((v) => ({ value: v, label: t(`protocol.${v}`) })))
const defaultTimeout: Record<ChannelType, number> = { openai_moderation: 3000, typesafe: 8000, llm: 15000 }
const defaultModel: Record<ChannelType, string> = { openai_moderation: 'omni-moderation-latest', typesafe: 'jev-latest', llm: '' }

/** Price column: priced / free / not priced (with the reason as a tooltip and sub line). */
function priceState(c: Channel): { tone: 'success' | 'info' | 'warning' | 'gray'; label: string; sub: string } | null {
  const p = c.price_state
  if (!p) return null
  const model = p.billing_model || c.billing_model || c.model
  if (p.free) return { tone: 'info', label: t('channels.free'), sub: '' }
  if (p.priced) return { tone: 'success', label: t('channels.priced'), sub: c.billing_model ? t('channels.pricedAs', { model }) : '' }
  return { tone: 'warning', label: t('channels.unpriced'), sub: p.reason ? enumLabel('priceReason', p.reason) : '' }
}

// ---- add / edit
const editOpen = ref(false)
const editing = ref<Channel | null>(null)
const form = reactive({
  type: 'openai_moderation' as ChannelType,
  protocol: 'openai_chat' as Protocol,
  name: '',
  base_url: '',
  api_key: '',
  proxy: '',
  emptyProxy: 'keep' as EmptyProxy,
  model: '',
  billing_model: '',
  timeout_ms: 3000 as number | null,
  enabled: true
})
const formErr = reactive<Record<string, string>>({})
const saving = ref(false)

function openEdit(c: Channel | null) {
  editing.value = c
  for (const k of Object.keys(formErr)) delete formErr[k]
  if (c)
    Object.assign(form, {
      type: c.type,
      protocol: (protocols as string[]).includes(c.protocol) ? c.protocol : 'openai_chat',
      name: c.name,
      base_url: c.base_url,
      api_key: '',
      proxy: '',
      emptyProxy: 'keep',
      model: c.model,
      billing_model: c.billing_model || '',
      timeout_ms: c.timeout_ms,
      enabled: c.enabled
    })
  else Object.assign(form, { type: 'openai_moderation', protocol: 'openai_chat', name: '', base_url: '', api_key: '', proxy: '', emptyProxy: 'keep', model: '', billing_model: '', timeout_ms: null, enabled: true })
  editOpen.value = true
}

const proxyValue = computed(() => proxyField(form.proxy, { creating: !editing.value, hadProxy: !!editing.value?.has_proxy, empty: form.emptyProxy }))
const emptyProxyOptions = computed(() => [
  { value: 'keep', label: t('pagesP3.proxy.keep') },
  { value: 'clear', label: t('pagesP3.proxy.clear') }
])

async function save() {
  for (const k of Object.keys(formErr)) delete formErr[k]
  const proxy = proxyValue.value
  if (proxy && !validProxy(proxy)) formErr.proxy = t('pagesP3.proxy.invalid')
  if (proxyNeedsKey(proxy, { creating: !editing.value, hasKey: !!editing.value?.has_key, newKey: form.api_key })) formErr.api_key = t('pagesP3.proxy.needKey')
  if (Object.keys(formErr).length) return
  saving.value = true
  try {
    const body: Record<string, unknown> = {
      type: form.type,
      name: form.name,
      base_url: form.base_url,
      model: form.model,
      billing_model: form.billing_model.trim(),
      timeout_ms: form.timeout_ms ? Number(form.timeout_ms) : 0,
      enabled: form.enabled
    }
    if (form.type === 'llm') body.protocol = form.protocol
    if (form.api_key.trim()) body.api_key = form.api_key.trim()
    if (proxy !== undefined) body.proxy = proxy
    await saveChannel(editing.value?.id ?? null, body)
    host.toast(t('saved'), 'success')
    editOpen.value = false
    reload()
  } catch (e) {
    const fields = isApiError(e) ? e.fields : {}
    Object.assign(formErr, fields)
    if (!Object.keys(fields).length) host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    saving.value = false
  }
}

// ---- enable / disable in the row (full body, only `enabled` changes; key and proxy kept)
const toggling = ref<number | null>(null)
async function toggle(c: Channel, enabled: boolean) {
  const names = (c.used_by || []).map((a) => a.name)
  let message = t('pagesP3.channels.enableDesc')
  if (!enabled) message = c.is_analysis ? t('pagesP3.channels.disableAnalysis') : names.length ? t('pagesP3.channels.disableUsed', { names: names.join('、') }) : t('pagesP3.channels.disableUnused')
  const ok = await host.confirm({
    title: t(enabled ? 'pagesP3.channels.enableTitle' : 'pagesP3.channels.disableTitle', { name: c.name }),
    message,
    confirmText: enabled ? t('enabled') : t('disabled'),
    danger: !enabled
  })
  if (!ok) return
  toggling.value = c.id
  try {
    await saveChannel(c.id, toggleBody(c, enabled))
    host.toast(t(enabled ? 'pagesP3.channels.enabledOk' : 'pagesP3.channels.disabledOk', { name: c.name }), 'success')
    reload()
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    toggling.value = null
  }
}

// ---- delete; 409 channel_in_use lists the auditors, 409 analysis_channel explains why
const blocked = ref<{ channel: Channel; analysis: boolean; auditors: Array<{ id: number; name: string }> } | null>(null)
async function remove(c: Channel) {
  const ok = await host.confirm({ message: t('channels.deleteConfirm', { name: c.name }), danger: true, confirmText: t('delete') })
  if (!ok) return
  try {
    await deleteChannel(c.id)
    host.toast(t('deleted'), 'success')
    reload()
  } catch (e) {
    if (isApiError(e) && e.status === 409 && (e.code === 'channel_in_use' || e.code === 'analysis_channel')) {
      const list = Array.isArray(e.details?.auditors) ? (e.details.auditors as Array<{ id: number; name: string }>) : c.used_by || []
      blocked.value = { channel: c, analysis: e.code === 'analysis_channel', auditors: list }
    } else host.toast(errorMessage(e, t('actionFailed')), 'error')
  }
}

// ---- test: the result (address, HTTP status, upstream message, cost) in a dialog
const testing = ref<number | null>(null)
const tested = ref<{ channel: Channel; r: ChannelTestResult } | null>(null)
async function test(c: Channel) {
  testing.value = c.id
  try {
    const r = await testChannel(c.id)
    tested.value = { channel: c, r }
    if (r.cost?.mode === 'priced') reload()
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    testing.value = null
  }
}
const testFields = computed<DescItem[]>(() => {
  const x = tested.value
  if (!x) return []
  const r = x.r
  const items: DescItem[] = [{ key: 'result', label: t('pagesP3.test.result') }]
  if (r.url) items.push({ key: 'url', label: t('pagesP3.test.url'), value: r.url, mono: true, copyable: true, full: true })
  if (r.status) items.push({ key: 'status', label: t('pagesP3.test.status'), value: String(r.status) })
  if (r.error) items.push({ key: 'error', label: t('pagesP3.test.error'), value: enumLabel('err', r.error) })
  if (r.message) items.push({ key: 'message', label: t('pagesP3.test.message'), full: true })
  items.push({ key: 'model', label: t('channels.col.model'), value: r.model || x.channel.model })
  items.push({ key: 'latency', label: t('trace.latency'), value: t('ms', { n: n(r.latency_ms) }) })
  if (r.cost !== undefined) items.push({ key: 'cost', label: t('cost.thisCall'), value: callCostText(r.cost).text })
  return items
})
</script>

<template>
  <div>
    <SHint class="mod-hint">{{ t('channels.hint') }}</SHint>
    <div v-if="manage" class="mod-toolbar">
      <SButton variant="primary" icon="plus" @click="openEdit(null)">{{ t('channels.add') }}</SButton>
    </div>
    <SAlert v-if="error" tone="danger" class="mod-block">{{ error }}</SAlert>

    <SCard :padded="false">
      <STable :columns="columns" :rows="rows" :loading="loading" :empty-text="t('channels.empty')" dense>
        <template #cell-name="{ row }">
          {{ row.name }} <span class="mod-sub mod-num">#{{ row.id }}</span>
          <SBadge v-if="row.is_analysis" size="xs" tone="purple" class="mod-ml" :title="t('pagesP3.channels.analysisHint')">{{ t('pagesP3.channels.analysis') }}</SBadge>
          <div class="mod-sub">
            <template v-if="row.has_key">{{ t('channels.col.key') }} <code class="mod-code mod-code-plain">…{{ row.api_key_tail || '****' }}</code></template>
            <SBadge v-else size="xs" tone="warning">{{ t('channels.noKey') }}</SBadge>
            <SBadge v-if="row.has_proxy" size="xs" tone="info" class="mod-ml">{{ t('pagesP3.proxy.has') }}</SBadge>
          </div>
        </template>
        <template #cell-type="{ row }">
          {{ enumLabel('channelType', row.type) }}
          <div v-if="row.type === 'llm' && row.protocol" class="mod-sub">{{ enumLabel('protocol', row.protocol) }}</div>
        </template>
        <template #cell-base_url="{ row }">
          <code class="mod-code mod-code-plain" :title="row.base_url">{{ row.base_url }}</code>
          <div class="mod-sub mod-num">{{ t('channels.col.timeout') }} {{ t('ms', { n: n(row.timeout_ms) }) }}</div>
        </template>
        <template #cell-model="{ row }">
          <span :title="row.model">{{ row.model || '—' }}</span>
          <div v-if="row.billing_model" class="mod-sub" :title="t('channels.billingModel')">{{ t('channels.pricedAs', { model: row.billing_model }) }}</div>
          <div v-if="priceState(row)" class="mod-sub">
            <SBadge size="xs" :tone="priceState(row)!.tone" :title="priceState(row)!.sub">{{ priceState(row)!.label }}</SBadge>
            <span v-if="priceState(row)!.sub && !row.price_state?.priced" class="mod-price-reason"> {{ priceState(row)!.sub }}</span>
          </div>
        </template>
        <template #cell-used_by="{ row }">
          <span v-if="row.used_by?.length" class="mod-pg-used">
            <SChip v-for="a in row.used_by" :key="a.id" size="xs" :title="`#${a.id}`">{{ a.name }}</SChip>
          </span>
          <SHint v-else-if="!row.is_analysis" inline size="xs">{{ t('pagesP3.channels.notUsed') }}</SHint>
          <SBadge v-if="row.is_analysis" size="xs" tone="purple">{{ t('pagesP3.channels.analysis') }}</SBadge>
        </template>
        <template #cell-health="{ row }">
          <template v-if="row.health">
            <span class="mod-num">{{ t('channels.callsN', { n: n(row.health.calls_1h) }) }}</span>
            <div class="mod-sub mod-num">
              <span :class="row.health.error_rate_1h * 100 > alertPercent ? 'mod-pg-alert' : ''">{{ t('pagesP3.channels.errRate', { rate: pct(row.health.error_rate_1h) }) }}</span>
              · <CostSummaryText :summary="row.health.cost_1h" />
            </div>
          </template>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-today="{ row }">
          <template v-if="row.health">
            <CostSummaryText :summary="row.health.cost_today" :sources="row.health.cost_today_sources" breakdown />
            <div class="mod-sub mod-num">{{ t('pagesP3.channels.tokens', { n: n(row.health.tokens_today) }) }}</div>
          </template>
          <SHint v-else inline>—</SHint>
          <div v-if="row.cost_30d" class="mod-sub mod-num">{{ t('pagesP3.channels.cost30d', { cost: money(row.cost_30d.cost) }) }}</div>
        </template>
        <template #cell-enabled="{ row }">
          <SSwitch v-if="manage" :model-value="row.enabled" :disabled="toggling === row.id" :aria-label="row.enabled ? t('enabled') : t('disabled')" @update:model-value="toggle(row, $event)" />
          <SBadge v-else :tone="row.enabled ? 'success' : 'gray'" dot>{{ row.enabled ? t('enabled') : t('disabled') }}</SBadge>
        </template>
        <template #cell-actions="{ row }">
          <SButton size="sm" variant="ghost" :loading="testing === row.id" @click="test(row)">{{ t('channels.test') }}</SButton>
          <SButton size="sm" variant="ghost" @click="openEdit(row)">{{ t('edit') }}</SButton>
          <SButton size="sm" variant="ghost" @click="remove(row)">{{ t('delete') }}</SButton>
        </template>
      </STable>
    </SCard>

    <SModal v-model:open="editOpen" :title="editing ? t('channels.editTitle', { name: editing.name }) : t('channels.add')" width="lg">
      <form class="mod-form" @submit.prevent="save">
        <SField :label="t('channels.col.type')" :error="formErr.type" :hint="editing ? t('channels.typeFixed') : t(`channelTypeHint.${form.type}`)">
          <SSelect v-model="form.type" :options="typeOptions" :disabled="!!editing" />
        </SField>
        <SField v-if="form.type === 'llm'" :label="t('channels.protocol')" :error="formErr.protocol" :hint="t('channels.protocolHint')">
          <SSelect v-model="form.protocol" :options="protocolOptions" />
        </SField>
        <SField :label="t('channels.col.name')" required :error="formErr.name">
          <SInput v-model="form.name" :maxlength="64" />
        </SField>
        <SField :label="t('channels.col.baseUrl')" required :error="formErr.base_url" :hint="t('channels.baseUrlHint')">
          <SInput v-model="form.base_url" placeholder="https://api.openai.com" />
        </SField>
        <SField :label="t('channels.apiKey')" :error="formErr.api_key" :hint="editing?.has_key ? t('pagesP3.proxy.keepKey', { tail: editing.api_key_tail }) : ''">
          <SInput v-model="form.api_key" type="password" autocomplete="off" />
        </SField>
        <SField :label="t('pagesP3.proxy.label')" :error="formErr.proxy" :hint="editing?.has_proxy ? t('pagesP3.proxy.hasHint') : t('pagesP3.proxy.hint')">
          <SInput v-model="form.proxy" autocomplete="off" :placeholder="editing?.has_proxy ? t('pagesP3.proxy.has') : 'socks5://127.0.0.1:1080'" />
        </SField>
        <SField v-if="editing?.has_proxy && !form.proxy.trim()" :label="t('pagesP3.proxy.emptyMode')" :hint="form.emptyProxy === 'clear' && editing.has_key && !form.api_key.trim() ? t('pagesP3.proxy.needKey') : ''">
          <SSegmented v-model="form.emptyProxy" :options="emptyProxyOptions" size="sm" />
        </SField>
        <SField :label="t('channels.col.model')" :error="formErr.model" :required="form.type === 'llm'">
          <SInput v-model="form.model" :placeholder="defaultModel[form.type] || 'gpt-4o-mini'" />
        </SField>
        <SField v-if="form.type !== 'openai_moderation'" :label="t('channels.billingModel')" :error="formErr.billing_model" :hint="t('channels.billingModelHint')">
          <SInput v-model="form.billing_model" :maxlength="128" :placeholder="form.model || defaultModel[form.type] || ''" />
        </SField>
        <SField :label="t('channels.col.timeout')" :error="formErr.timeout_ms" :hint="t('channels.timeoutHint', { n: defaultTimeout[form.type] })">
          <SInput v-model="form.timeout_ms" type="number" min="500" max="60000" step="100" :placeholder="String(defaultTimeout[form.type])" />
        </SField>
        <SField :label="t('channels.col.enabled')" :hint="t('pagesP3.channels.enabledHint')">
          <SSwitch v-model="form.enabled" />
        </SField>
      </form>
      <template #footer>
        <SButton @click="editOpen = false">{{ host.i18n.t('ui.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving" @click="save">{{ t('save') }}</SButton>
      </template>
    </SModal>

    <SModal :open="!!tested" :title="t('pagesP3.test.title', { name: tested?.channel.name || '' })" width="lg" @update:open="!$event && (tested = null)">
      <SDescriptions v-if="tested" :items="testFields" :columns="2" dense>
        <template #item-result>
          <SBadge :tone="tested.r.ok ? 'success' : 'danger'" dot>{{ tested.r.ok ? t('pagesP3.test.ok') : t('pagesP3.test.failed') }}</SBadge>
        </template>
        <template #item-message><span class="mod-prewrap mod-pg-break">{{ tested.r.message }}</span></template>
      </SDescriptions>
      <template #footer>
        <SButton @click="tested = null">{{ host.i18n.t('ui.close') }}</SButton>
      </template>
    </SModal>

    <SModal :open="!!blocked" :title="t('pagesP3.channels.cannotDelete', { name: blocked?.channel.name || '' })" width="md" @update:open="!$event && (blocked = null)">
      <div v-if="blocked" class="mod-form">
        <p v-if="blocked.analysis" class="mod-pg-p">{{ t('pagesP3.channels.analysisInUse') }}</p>
        <template v-else>
          <p class="mod-pg-p">{{ t('pagesP3.channels.inUse') }}</p>
          <ul class="mod-pg-list">
            <li v-for="a in blocked.auditors" :key="a.id">{{ a.name }} <span class="mod-sub mod-num">#{{ a.id }}</span></li>
          </ul>
          <SHint size="xs">{{ t('pagesP3.channels.inUseHint') }}</SHint>
        </template>
      </div>
      <template #footer>
        <SButton @click="blocked = null">{{ host.i18n.t('ui.close') }}</SButton>
      </template>
    </SModal>
  </div>
</template>

<style scoped>
.mod-pg-used {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  max-width: 14rem;
}
.mod-pg-alert {
  font-weight: 600;
  color: rgb(220 38 38);
}
.mod-pg-break {
  word-break: break-all;
}
.mod-pg-p {
  margin: 0;
  font-size: 0.875rem;
}
.mod-pg-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.875rem;
}
</style>
