<script setup lang="ts">
import { computed, watch } from 'vue'
import { useList } from '@sub2api/host'
import { SAlert, SButton, SHint } from '@sub2api/ui'
import KeyStatusTable from './KeyStatusTable.vue'
import { useCatalog } from './catalog'
import { applyQuery, canManage, dashboardRoute, errorMessage, keyOf, useDwHost, useReset, type KeyStatus } from './host'

// account.detail.tabs slot: every key of one account (degraded or not) with
// the same table as the status tab, a reset of all of them and a jump to the
// account's events on the plugin page.
const props = defineProps<{ account: { id: number; name?: string } }>()
const host = useDwHost()
const t = host.t
const manage = computed(() => canManage())
const catalog = useCatalog()

const query = () => ({ account_id: String(props.account.id), group_id: '', model: '', degraded: '' })
const list = useList<KeyStatus>(host.pluginApi, '/status', query(), { pageSize: 50 })
const error = computed(() => (list.error.value ? errorMessage(list.error.value, t('status.loadFailed')) : ''))
watch(() => props.account.id, () => applyQuery(list, query()))

const { busy, reset } = useReset(list.reload)
const accountLabel = () => catalog.accountName(props.account.id, props.account.name)
const resetRow = (r: KeyStatus) =>
  reset({ account_id: r.account_id, group_id: r.group_id, model: r.model }, t('status.resetKeyConfirm', { account: accountLabel(), group: catalog.groupName(r.group_id), model: r.model }), keyOf(r))
const resetAll = () => reset({ account_id: props.account.id, group_id: 0, model: '' }, t('accountTab.resetAllConfirm', { account: accountLabel() }), 'all')

const showEvents = (r: KeyStatus) => host.router.push(dashboardRoute('events', r))
</script>

<template>
  <div>
    <div class="dw-toolbar dw-toolbar-start">
      <SHint inline class="dw-grow">{{ t('accountTab.hint') }}</SHint>
      <SButton size="sm" icon="chart" :to="dashboardRoute('events', { account_id: account.id })">{{ t('accountTab.events') }}</SButton>
      <SButton v-if="manage" size="sm" variant="danger" icon="refresh" :loading="busy === 'all'" :disabled="!list.items.value.length" @click="resetAll">{{ t('accountTab.resetAll') }}</SButton>
    </div>
    <SAlert v-if="error" tone="danger" class="dw-section">{{ error }}</SAlert>
    <KeyStatusTable class="dw-section" :list="list" :busy="busy" hide-account @reset="resetRow" @show-events="showEvents" />
  </div>
</template>
