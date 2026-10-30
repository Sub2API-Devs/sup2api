<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SDrawer, SEmpty, SHint, SSpinner } from '@sub2api/ui'
import FlowStages from './FlowStages.vue'
import { dt, specText } from './format'
import { useAsync } from './useAsync'
import {
  canManage,
  errorMessage,
  fetchFlowVersion,
  fetchFlowVersions,
  rollbackFlow,
  useModHost,
  type Flow,
  type FlowVersionDetail
} from './host'

// Version history of a flow (§72.13.5): every published version, its stages
// with the current auditor names, and rollback (published again as a new version).
const props = defineProps<{ open: boolean; flow: Flow | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'rolled-back', f: Flow): void }>()
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const { data, loading, error, reload: load } = useAsync(() => fetchFlowVersions(props.flow!.id), () => t('flows.loadFailed'))
const items = computed(() => data.value?.items || [])
const details = ref<Record<number, FlowVersionDetail>>({})
const expanded = ref<number | null>(null)
const viewLoading = ref<number | null>(null)

watch(
  () => [props.open, props.flow?.id] as const,
  ([open, id]) => {
    if (!open || !id) return
    data.value = null
    details.value = {}
    expanded.value = null
    void load()
  },
  { immediate: true }
)

async function view(v: number) {
  const f = props.flow
  if (!f) return
  if (expanded.value === v) {
    expanded.value = null
    return
  }
  expanded.value = v
  if (details.value[v]) return
  viewLoading.value = v
  try {
    details.value = { ...details.value, [v]: await fetchFlowVersion(f.id, v) }
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
    expanded.value = null
  } finally {
    viewLoading.value = null
  }
}

const rolling = ref<number | null>(null)
async function rollback(v: number) {
  const f = props.flow
  if (!f) return
  const ok = await host.confirm({ message: t('flows.rollbackConfirm', { name: f.name, v }), confirmText: t('flows.rollback') })
  if (!ok) return
  rolling.value = v
  try {
    const nf = await rollbackFlow(f.id, v, data.value?.current_version || f.version)
    host.toast(t('flows.rolledBack', { v: nf?.version ?? '' }), 'success')
    emit('rolled-back', nf)
    await load()
  } catch (e) {
    if (isApiError(e) && e.code === 'missing_auditors') {
      const ids = ((e.details?.auditor_ids || []) as number[]).map((x) => `#${x}`).join(', ')
      host.toast(t('flows.missingAuditors', { ids }), 'error')
    } else if (isApiError(e) && e.code === 'version_conflict') {
      host.toast(t('flows.versionConflict'), 'warning')
      void load()
    } else host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    rolling.value = null
  }
}
</script>

<template>
  <SDrawer :open="open" :title="t('flows.versionsTitle', { name: flow?.name || '' })" width="lg" @update:open="emit('update:open', $event)">
    <SSpinner v-if="loading && !items.length" block />
    <SAlert v-else-if="error" tone="danger">{{ error }}</SAlert>
    <SEmpty v-else-if="!items.length" :text="t('flows.noVersions')" />
    <ol v-else class="mod-history">
      <li v-for="it in items" :key="it.version" class="mod-version">
        <div class="mod-history-head">
          <strong class="mod-num">v{{ it.version }}</strong>
          <SBadge v-if="it.current" tone="info">{{ t('flows.current') }}</SBadge>
          <SHint inline size="xs">{{ dt(it.published_at) }}<template v-if="it.published_by"> · {{ t('flows.publishedBy', { id: it.published_by }) }}</template></SHint>
          <span class="mod-ml-auto">
            <SButton size="sm" variant="ghost" :loading="viewLoading === it.version" @click="view(it.version)">{{ t('flows.view') }}</SButton>
            <SButton v-if="manage && !it.current" size="sm" variant="ghost" icon="refresh" :loading="rolling === it.version" @click="rollback(it.version)">{{ t('flows.rollback') }}</SButton>
          </span>
        </div>
        <div v-if="expanded === it.version && details[it.version]" class="mod-version-body">
          <div class="mod-sub">{{ specText(details[it.version].spec) }}</div>
          <FlowStages :stages="details[it.version].stages || []" />
        </div>
      </li>
    </ol>
  </SDrawer>
</template>
