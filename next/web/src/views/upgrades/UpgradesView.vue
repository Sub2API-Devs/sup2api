<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCard, SField, SHint, SPageHeader, SSelect, STable, type TableColumn, type Tone } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import { formatDateTime } from '@/utils/format'

interface Release { digest: string; manifest: { release_id: string; build_id: string; source_commit: string; created_at: string } }
interface Node { node_id: string; release_digest: string; mode: string; ready: boolean; last_seen: string; enabled: boolean; stopped: boolean; error?: string }
interface Step { step_id: number; node_id: string; action: string; status: string; error?: string }
interface Plan { id: string; release_digest: string; status: string; cursor: number; error?: string; nodes: string[]; created_at: string; steps?: Step[] }
interface Preflight { release_digest: string; expected_revision: number; primary_node: string; nodes: string[]; blockers: string[]; strategy: string }
interface Event { id: number; kind: string; message: string; created_at: string }
const { t, te } = useI18n()
const auth = useAuthStore(), route = useRoute(), router = useRouter()
const releases = ref<Release[]>([]), nodes = ref<Node[]>([]), plans = ref<Plan[]>([]), events = ref<Event[]>([])
const target = ref<string | number | boolean | null>(''), selected = ref<Plan | null>(null), preflight = ref<Preflight | null>(null)
const loading = ref(true), busy = ref(false), available = ref(false), primary = ref(''), revision = ref(0), stale = ref(false)
const selectedID = ref(typeof route.query.upgrade === 'string' ? route.query.upgrade : '')
let timer: ReturnType<typeof setInterval> | undefined, inflight = false, disposed = false
let requestKey = crypto.randomUUID()
const canExecute = computed(() => auth.has('system:update:execute'))
const canRecover = computed(() => auth.has('system:update:recover'))
const options = computed(() => releases.value.map(r => ({ value: r.digest, label: r.manifest.release_id + ' · ' + r.digest.slice(0, 12) })))
const active = computed(() => plans.value.some(p => !['completed', 'cancelled', 'failed', 'superseded'].includes(p.status)))
const columns = computed<TableColumn[]>(() => [{ key: 'node_id', label: t('upgrades.node') }, { key: 'release_digest', label: t('upgrades.version') }, { key: 'mode', label: t('upgrades.mode') }, { key: 'ready', label: t('upgrades.ready') }, { key: 'last_seen', label: t('upgrades.lastSeen') }, { key: 'error', label: t('upgrades.reason') }, ...(canRecover.value ? [{ key: 'manage', label: t('upgrades.manageNode') }] : [])])
const stepColumns = computed<TableColumn[]>(() => [{ key: 'node_id', label: t('upgrades.node') }, { key: 'action', label: t('upgrades.step') }, { key: 'status', label: t('upgrades.status') }, { key: 'error', label: t('upgrades.reason') }])
const readyToCreate = computed(() => canExecute.value && available.value && !stale.value && !active.value && !!preflight.value && preflight.value.blockers.length === 0 && preflight.value.expected_revision === revision.value && preflight.value.release_digest === target.value)
function label(group: string, value: string) { const key = `upgrades.${group}.${value}`; return te(key) ? t(key) : value }
function tone(status: string): Tone { return ['completed', 'done', 'ready'].includes(status) ? 'success' : ['failed', 'error'].includes(status) ? 'danger' : ['paused', 'pending', 'running'].includes(status) ? 'warning' : 'gray' }
function version(digest: string) { return releases.value.find(r => r.digest === digest)?.manifest.release_id || digest.slice(0, 12) || '—' }
watch(target, () => { preflight.value = null; requestKey = crypto.randomUUID() })
async function load(manual = false) {
  if (inflight || disposed) return
  inflight = true
  try {
    const [rs, state] = await Promise.all([api.get<{ releases: Release[] }>('/system/releases'), api.get<{ upgrades: Plan[]; nodes: Node[]; revision: number; primary_node: string }>('/system/upgrades')])
    if (disposed) return
    releases.value = rs.releases || []; plans.value = state.upgrades || []; nodes.value = state.nodes || []; primary.value = state.primary_node; revision.value = state.revision
    available.value = true; stale.value = false
    if (preflight.value && preflight.value.expected_revision !== revision.value) preflight.value = null
    if (!selectedID.value && plans.value.length) selectedID.value = plans.value[0].id
    if (selectedID.value) await loadPlan(selectedID.value)
  } catch (e) { if (manual || !stale.value) notifyError(e); stale.value = true } finally { inflight = false; loading.value = false }
}
async function loadPlan(id: string) {
  const [plan, log] = await Promise.all([api.get<Plan>(`/system/upgrades/${encodeURIComponent(id)}`), api.get<{ events: Event[] }>(`/system/upgrades/${encodeURIComponent(id)}/events`)])
  if (disposed || id !== selectedID.value) return
  selected.value = plan; events.value = log.events || []
}
async function selectPlan(id: string) { selectedID.value = id; await router.replace({ query: { ...route.query, upgrade: id } }); try { await loadPlan(id) } catch (e) { notifyError(e) } }
async function check() {
  busy.value = true; preflight.value = null
  try { preflight.value = await api.post<Preflight>('/system/upgrades/preflight', { release_digest: target.value }) } catch (e) { notifyError(e) } finally { busy.value = false }
}
async function create() {
  if (!readyToCreate.value || !preflight.value) return
  busy.value = true
  try {
    const plan = await api.post<Plan>('/system/upgrades', { release_digest: preflight.value.release_digest, expected_revision: preflight.value.expected_revision, idempotency_key: requestKey })
    preflight.value = null; requestKey = crypto.randomUUID(); await selectPlan(plan.id); await load()
  } catch (e) { notifyError(e) } finally { busy.value = false }
}
async function action(kind: 'pause' | 'resume' | 'cancel' | 'rollback') {
  if (!selected.value) return
  busy.value = true
  try {
    const plan = await api.post<Plan>(`/system/upgrades/${encodeURIComponent(selected.value.id)}/${kind}`, {})
    if (kind === 'rollback') await selectPlan(plan.id)
    await load()
  } catch (e) { notifyError(e) } finally { busy.value = false }
}
async function setNodeEnabled(node: Node, enabled: boolean) {
  busy.value = true
  try {
    await api.post(`/system/nodes/${encodeURIComponent(node.node_id)}/${enabled ? 'enable' : 'disable'}`, {})
    await load()
  } catch (e) { notifyError(e) } finally { busy.value = false }
}
onMounted(() => { void load(); timer = setInterval(() => { if (document.visibilityState !== 'hidden') void load() }, 5000) })
onBeforeUnmount(() => { disposed = true; clearInterval(timer) })
</script>

<template>
  <div class="space-y-5">
    <SPageHeader :title="t('upgrades.title')" :description="t('upgrades.description')"><template #actions><SButton :loading="loading" @click="load(true)">{{ t('common.refresh') }}</SButton></template></SPageHeader>
    <SHint v-if="stale" tone="warning">{{ t(available ? 'upgrades.stale' : 'upgrades.unavailable') }}</SHint>
    <template v-if="available">
      <SCard :title="t('upgrades.nodes')">
        <p class="mb-4 text-sm text-gray-500">{{ t('upgrades.primary') }}: {{ primary || '—' }}</p>
        <STable :columns="columns" :rows="nodes" row-key="node_id">
          <template #cell-release_digest="{ row }"><span :title="row.release_digest">{{ version(row.release_digest) }}</span></template>
          <template #cell-mode="{ row }">{{ label('modes', row.mode) }}</template>
          <template #cell-ready="{ row }"><SBadge :tone="row.ready ? 'success' : 'warning'">{{ t(!row.enabled ? 'upgrades.disabled' : row.ready ? 'upgrades.serving' : row.stopped ? 'upgrades.stopped' : 'upgrades.waiting') }}</SBadge></template>
          <template #cell-last_seen="{ row }">{{ formatDateTime(row.last_seen) }}</template>
          <template #cell-manage="{ row }"><SButton size="sm" :disabled="busy || stale" @click="setNodeEnabled(row, !row.enabled)">{{ t(row.enabled ? 'upgrades.disableNode' : 'upgrades.enableNode') }}</SButton></template>
        </STable>
      </SCard>
      <SCard v-if="canExecute" :title="t('upgrades.newPlan')">
        <div class="space-y-4">
          <SHint tone="warning">{{ t('upgrades.maintenanceWindow') }}</SHint>
          <SHint>{{ t('upgrades.independentPlugins') }}</SHint>
          <SField :label="t('upgrades.target')"><SSelect v-model="target" :options="options" :placeholder="t('upgrades.choose')" :disabled="busy || active" /></SField>
          <SHint v-if="!releases.length">{{ t('upgrades.noReleases') }}</SHint>
          <SHint v-if="active">{{ t('upgrades.activePlan') }}</SHint>
          <div class="flex gap-2"><SButton :disabled="!target || active || stale" :loading="busy" @click="check">{{ t('upgrades.preflight') }}</SButton><SButton variant="primary" :disabled="!readyToCreate" :loading="busy" @click="create">{{ t('upgrades.start') }}</SButton></div>
          <div v-if="preflight" class="space-y-2">
            <p class="text-sm">{{ t('upgrades.order') }}: {{ preflight.nodes.join(' → ') }}</p>
            <p class="text-sm text-gray-500">{{ t('upgrades.sequence') }}</p>
            <SHint v-if="!preflight.blockers.length" tone="success">{{ t('upgrades.preflightOK') }}</SHint>
            <ul v-else class="list-disc space-y-1 pl-5 text-sm text-red-600 dark:text-red-400"><li v-for="reason in preflight.blockers" :key="reason">{{ reason }}</li></ul>
          </div>
        </div>
      </SCard>
      <SCard :title="t('upgrades.history')">
        <div v-if="plans.length" class="mb-4 flex flex-wrap gap-2"><SButton v-for="plan in plans" :key="plan.id" size="sm" :variant="selectedID === plan.id ? 'primary' : 'secondary'" @click="selectPlan(plan.id)">{{ version(plan.release_digest) }} · {{ label('states', plan.status) }}</SButton></div>
        <SHint v-else>{{ t('upgrades.noPlans') }}</SHint>
        <div v-if="selected" class="space-y-4">
          <div class="flex flex-wrap items-center gap-3"><SBadge :tone="tone(selected.status)">{{ label('states', selected.status) }}</SBadge><span class="text-sm">{{ formatDateTime(selected.created_at) }}</span><code class="text-xs text-gray-500">{{ selected.id }}</code></div>
          <SHint v-if="selected.error" tone="warning">{{ selected.error }}</SHint>
          <SHint v-if="selected.status === 'paused'">{{ t('upgrades.recovery') }}</SHint>
          <div v-if="canRecover" class="flex gap-2">
            <SButton v-if="selected.status === 'running'" :loading="busy" :disabled="stale" @click="action('pause')">{{ t('upgrades.pause') }}</SButton>
            <SButton v-if="selected.status === 'paused'" :loading="busy" :disabled="stale" @click="action('resume')">{{ t('upgrades.resume') }}</SButton>
            <SButton v-if="selected.status === 'paused'" :loading="busy" :disabled="stale" @click="action('rollback')">{{ t('upgrades.rollback') }}</SButton>
            <SButton v-if="['running', 'paused'].includes(selected.status)" :loading="busy" :disabled="stale" @click="action('cancel')">{{ t('upgrades.cancel') }}</SButton>
          </div>
          <STable :columns="stepColumns" :rows="selected.steps || []" row-key="step_id"><template #cell-action="{ row }">{{ label('actions', row.action) }}</template><template #cell-status="{ row }"><SBadge :tone="tone(row.status)">{{ label('states', row.status) }}</SBadge></template></STable>
          <ol class="space-y-2 text-sm"><li v-for="event in events" :key="event.id" class="flex flex-wrap gap-2"><time class="text-gray-500">{{ formatDateTime(event.created_at) }}</time><span>{{ event.message }}</span></li></ol>
        </div>
      </SCard>
    </template>
  </div>
</template>
