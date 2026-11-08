<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useList } from '@sub2api/host'
import { SAlert, SButton, SIcon, SLink, STooltip } from '@sub2api/ui'
import KeyStatusTable from './KeyStatusTable.vue'
import { useCatalog } from './catalog'
import { floorText, overrideFields } from './configView'
import {
  applyQuery,
  canManage,
  configRoute,
  dashboardRoute,
  errorMessage,
  fetchConfig,
  keyOf,
  loadAccountWeight,
  useDwHost,
  useReset,
  type AccountOverride,
  type AccountWeight,
  type KeyStatus
} from './host'

// account.detail.tabs slot: every key of one account (degraded or not) in
// the status tab's table, under one summary line: how many keys, how many
// below their base and the lowest, the account's override with a link to
// edit it, a jump to its events and a reset of all its keys.
const props = defineProps<{ account: { id: number; name?: string } }>()
const host = useDwHost()
const t = host.t
const manage = computed(() => canManage())
const catalog = useCatalog()

const query = () => ({ account_id: String(props.account.id), group_id: '', model: '', degraded: '' })
const list = useList<KeyStatus>(host.pluginApi, '/status', query(), { pageSize: 50 })
const error = computed(() => (list.error.value ? errorMessage(list.error.value, t('status.loadFailed')) : ''))

// The degraded summary is the scheduling snapshot (GET /weights), as on the
// account list; the override comes from the configuration (undefined: it
// could not be read, null: none). Both optional.
const weight = ref<AccountWeight | null>(null)
const override = ref<AccountOverride | null | undefined>(null)
async function loadSummary() {
  const id = props.account.id
  const [w, cfg] = await Promise.all([loadAccountWeight(id), fetchConfig().catch(() => null)])
  if (props.account.id !== id) return
  weight.value = w
  override.value = cfg ? (cfg.config.accounts?.[String(id)] ?? null) : undefined
}
void loadSummary()
watch(
  () => props.account.id,
  () => {
    applyQuery(list, query())
    void loadSummary()
  }
)

// The fields the override sets, worded as on the config page's override table.
const overrideText = computed(() => {
  const o = override.value
  if (o === undefined) return t('acct.tab.overrideUnknown')
  if (!o) return t('acct.tab.overrideNone')
  const parts: string[] = []
  if (o.enabled !== undefined) parts.push(`${t('cfg.accounts.col.enabled')} ${overrideFields.enabled(t, { enabled: o.enabled })}`)
  if (o.exempt_status_codes !== undefined)
    parts.push(`${t('cfg.accounts.col.exempt')} ${overrideFields.exempt(t, { exempt_status_codes: o.exempt_status_codes })}`)
  if (o.min_weight_mode) parts.push(`${t('cfg.accounts.col.floor')} ${floorText(t, o.min_weight_mode, o.min_weight)}`)
  return parts.join(' · ') || t('acct.tab.overrideNone')
})

const { busy, reset } = useReset(() => Promise.all([list.reload(), loadSummary()]))
const accountLabel = () => catalog.accountName(props.account.id, props.account.name)
const resetRow = (r: KeyStatus) =>
  reset(
    { account_id: r.account_id, group_id: r.group_id, model: r.model },
    t('status.resetKeyConfirm', { account: accountLabel(), group: catalog.groupName(r.group_id), model: r.model }),
    keyOf(r)
  )
const resetAll = () =>
  reset({ account_id: props.account.id, group_id: 0, model: '' }, t('accountTab.resetAllConfirm', { account: accountLabel() }), 'all')

const showEvents = (r: KeyStatus) => host.router.push(dashboardRoute('events', r))
</script>

<template>
  <div>
    <div class="dw-acct-summary">
      <span class="dw-acct-summary-text">
        <span class="dw-num">{{ t('acct.tab.keys', { n: list.total.value }) }}</span>
        <template v-if="weight?.degraded">
          <span class="dw-acct-sep">·</span>
          <span class="dw-num">{{ t('acct.tab.below', { n: weight.degraded }) }}</span>
          <span class="dw-acct-sep">·</span>
          <span class="dw-num">{{ t('acct.tab.lowest', { w: weight.lowest, base: weight.base }) }}</span>
        </template>
        <span class="dw-acct-sep">·</span>
        <span>
          {{ t('acct.tab.override', { v: overrideText }) }}
          <SLink :to="configRoute(account.id)" class="dw-ml">{{ t('acct.tab.settings') }}</SLink>
        </span>
        <STooltip :content="t('accountTab.hint')" max-width="22rem">
          <span class="dw-acct-info" role="img" tabindex="0" :aria-label="t('accountTab.hint')"><SIcon name="info" /></span>
        </STooltip>
      </span>
      <span class="dw-acct-summary-actions">
        <SButton size="sm" icon="chart" :to="dashboardRoute('events', { account_id: account.id })">{{ t('acct.tab.events') }}</SButton>
        <SButton
          v-if="manage"
          size="sm"
          tone="danger"
          icon="refresh"
          :loading="busy === 'all'"
          :disabled="!list.items.value.length"
          @click="resetAll"
          >{{ t('acct.tab.resetAll') }}</SButton
        >
      </span>
    </div>
    <SAlert v-if="error" tone="danger" class="dw-section">{{ error }}</SAlert>
    <KeyStatusTable :list="list" :busy="busy" hide-account @reset="resetRow" @show-events="showEvents" />
  </div>
</template>
