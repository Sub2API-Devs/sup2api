<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SDrawer, SEmpty, SHint, SSpinner } from '@sub2api/ui'
import FlowStages from './FlowStages.vue'
import { specText } from './format'
import {
  canManage,
  errorMessage,
  fetchFlowVersion,
  fetchFlowVersions,
  rollbackFlow,
  useModHost,
  type Flow,
  type FlowVersionDetail,
  type FlowVersionItem
} from './host'

// Version history of a flow (§72.13.5): every published version, its stages
// with the current auditor names, and rollback (published again as a new version).
const props = defineProps<{ open: boolean; flow: Flow | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'rolled-back', f: Flow): void }>()
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const items = ref<FlowVersionItem[]>([])
const current = ref(0)
const loading = ref(false)
const error = ref('')
const details = ref<Record<number, FlowVersionDetail>>({})
const expanded = ref<number | null>(null)
const viewLoading = ref<number | null>(null)

async function load() {
  const f = props.flow
  if (!f) return
  loading.value = true
  error.value = ''
  try {
    const r = await fetchFlowVersions(f.id)
    items.value = r.items || []
    current.value = r.current_version
  } catch (e) {
    error.value = errorMessage(e, t('flows.loadFailed'))
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.flow?.id] as const,
  ([open]) => {
    if (!open) return
    details.value = {}
    expanded.value = null
    load()
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
    const nf = await rollbackFlow(f.id, v, current.value || f.version)
    host.toast(t('flows.rolledBack', { v: nf?.version ?? '' }), 'success')
    emit('rolled-back', nf)
    await load()
  } catch (e) {
    if (isApiError(e) && e.code === 'missing_auditors') {
      const ids = ((e.details?.auditor_ids || []) as number[]).map((x) => `#${x}`).join(', ')
      host.toast(t('flows.missingAuditors', { ids }), 'error')
    } else if (isApiError(e) && e.code === 'version_conflict') {
      host.toast(t('flows.versionConflict'), 'warning')
      load()
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
          <SHint inline size="xs">{{ host.i18n.formatDateTime(it.published_at) }}<template v-if="it.published_by"> · {{ t('flows.publishedBy', { id: it.published_by }) }}</template></SHint>
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
