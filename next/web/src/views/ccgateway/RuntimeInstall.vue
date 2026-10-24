<script setup lang="ts">
// "Runtime" card of the CCGateway settings: the container images and the
// controller of the per-account containers are published on GHCR; the core
// installs or upgrades them on the Docker host over SSH, or through the
// control panel in controller mode (GET /system/ccgateway/runtime, POST
// .../runtime/install, CONTRACTS §49.16 / §53.6). In controller mode images can
// also be uploaded (RuntimeImageUpload). Images show their short digest;
// states and failure reasons are codes translated here. The account editor
// links here (#ccgateway-runtime) when a runtime is not_configured.
// Existing account containers are never recreated for a new app image: their
// worker program is replaced in place (POST .../runtime/workers, and the
// `workers` of an applied app upload, §53.7); the per-account results show here.
// The runtime images also ship inside the ccgateway plugin package (§53.10):
// in controller mode the card shows them (GET runtime `bundled`) and pushes the
// ones the controller lacks (POST .../runtime/bundled); the manual upload stays
// as an advanced option. The paired Worker + CLI update activates `cliVersion`,
// the version of the saved CC configuration (the core refuses a paired update
// without one, so the action is off while it is unknown).
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SHint, SSettingsGroup, STable, confirm, toast, type TableColumn, type Tone } from '@sub2api/ui'
import type { CcgBundledReport, CcgRuntimeImages, CcgWorkersReport } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import CcgErrorAlert from './CcgErrorAlert.vue'
import RuntimeImageUpload from './RuntimeImageUpload.vue'
import { useCcgText } from './ccgError'
import { knownReason, setupProblems } from './ccgAuthFlow'
import { BUNDLED_ROLES, BUNDLED_TIMEOUT_MS, RUNTIME_COMPONENTS, bundledAllEnabled, bundledState, componentImages, runtimeState, displayImage } from './runtimeInstall'
import { WORKERS_TIMEOUT_MS, type ImageLoadResult } from './imageUpload'

const props = defineProps<{ disabled?: boolean; mode?: string; accountRuntimes?: boolean; hasAdminKey?: boolean; cliVersion: string }>()
const emit = defineEmits<{ (event: 'changed'): void }>()
const { t, te } = useI18n()
const auth = useAuthStore()
const { describe, reasonLabel } = useCcgText()
const ANCHOR = 'ccgateway-runtime'

const STATE_TONES = { notInstalled: 'gray', upToDate: 'success', outdated: 'warning', unknown: 'gray' } as const
const BUNDLED_TONES = { enabled: 'success', notEnabled: 'warning', unknown: 'gray', installOnly: 'gray' } as const
const WORKER_TONES: Record<string, Tone> = { updated: 'success', unchanged: 'gray', busy: 'warning', not_running: 'warning', rolled_back: 'danger', failed: 'danger' }
const RESULT_TONES: Record<string, Tone> = { loaded: 'success', present: 'gray', failed: 'danger' }

const info = ref<CcgRuntimeImages | null>(null)
const loading = ref(false)
const installing = ref(false)
const updatingWorkers = ref(false)
const pairedUpdate = ref(false)
const pairedReport = ref(false)
const pushing = ref(false)
const uploading = ref(false)
/** Load or install failure, translated. */
const error = ref<{ title: string; detail: string } | null>(null)
const manage = computed(() => auth.has('settings:manage'))
const controller = computed(() => props.mode === 'controller')
/** One action at a time: the others wait (each shows its own spinner). */
const locked = computed(() => !!props.disabled || installing.value || updatingWorkers.value || pushing.value || uploading.value)
const state = computed(() => runtimeState(info.value))
const action = computed<'install' | 'upgrade' | null>(() => (state.value === 'notInstalled' ? 'install' : state.value === 'outdated' ? 'upgrade' : null))

/** A code translated under `prefix`, else the code itself. */
const codeText = (prefix: string, code?: string) => (!code ? '' : te(`${prefix}.${code}`) ? t(`${prefix}.${code}`) : code)
const roleLabel = (role: string) => codeText('ccgateway.bundled.roles', role)
const workerReason = (code?: string) => codeText('ccgateway.workers.reasons', code)
/** A failed role's code: the shared reasons first, then the worker update's, else the code itself. */
const bundledReason = (code?: string) => (knownReason(code) ? reasonLabel(code) : workerReason(code))
const shortSha = (sha?: string) => (sha && /^[0-9a-f]{64}$/.test(sha) ? sha.slice(0, 12) : '')

const componentColumns = computed<TableColumn[]>(() => [
  { key: 'component', label: t('ccgateway.runtimeInstall.component') },
  { key: 'expected', label: t('ccgateway.runtimeInstall.expected') },
  { key: 'installed', label: t('ccgateway.runtimeInstall.installed') }
])
/** Each component's images; `drift`: the controller runs another image than the saved one. */
const componentRows = computed(() => {
  const r = info.value
  if (!r) return []
  return RUNTIME_COMPONENTS.map(key => {
    const { expected, installed } = componentImages(r, key)
    return { key, expected, installed, drift: !!installed && displayImage(installed) !== displayImage(expected) }
  })
})
const bundledColumns = computed<TableColumn[]>(() => [
  { key: 'role', label: t('ccgateway.bundled.component') },
  { key: 'image', label: t('ccgateway.bundled.image') },
  { key: 'state', label: t('ccgateway.bundled.onController') }
])
const bundledRows = computed(() => {
  const r = info.value
  const images = r?.bundled?.images
  if (!r || !images) return []
  return BUNDLED_ROLES.map(role => ({ role, image: images[role] || '', state: bundledState(r, role) }))
})
const resultColumns = computed<TableColumn[]>(() => [
  { key: 'role', label: t('ccgateway.bundled.component') },
  { key: 'ref', label: t('ccgateway.bundled.image') },
  { key: 'status', label: t('ccgateway.bundled.status') },
  { key: 'reason', label: t('ccgateway.bundled.reason') }
])
const workerColumns = computed<TableColumn[]>(() => [
  { key: 'account', label: t('ccgateway.workers.account') },
  { key: 'status', label: t('ccgateway.workers.status') },
  { key: 'previous', label: t('ccgateway.workers.previous') },
  { key: 'current', label: t('ccgateway.workers.current') },
  ...(pairedReport.value ? [{ key: 'cli', label: t('ccgateway.workers.activeCLI') }] : []),
  { key: 'reason', label: t('ccgateway.workers.reason') }
])

async function load() {
  loading.value = true
  error.value = null
  try {
    info.value = await api.get<CcgRuntimeImages>('/system/ccgateway/runtime', undefined, { signal: AbortSignal.timeout(60000) })
  } catch (e) {
    info.value = null
    error.value = { title: t('ccgateway.runtimeInstall.loadFailed'), detail: describe(e) }
  } finally {
    loading.value = false
  }
}

async function install() {
  const what = action.value || 'upgrade'
  const ok = await confirm({
    title: t(`ccgateway.runtimeInstall.${what}`),
    message: t(controller.value ? 'ccgateway.runtimeInstall.confirmMessageController' : 'ccgateway.runtimeInstall.confirmMessage'),
    confirmText: t(`ccgateway.runtimeInstall.${what}`)
  })
  if (!ok) return
  installing.value = true
  error.value = null
  try {
    // Control panel mode may pull images and upgrade the controller itself (waiting for its health): allow as long as the SSH install.
    await api.post('/system/ccgateway/runtime/install', {}, { signal: AbortSignal.timeout(controller.value ? 20 * 60_000 : 300000) })
    toast(t('ccgateway.runtimeInstall.done'), 'success')
  } catch (e) {
    error.value = { title: t('ccgateway.runtimeInstall.failed'), detail: describe(e) }
  } finally {
    installing.value = false
  }
  if (!error.value) await load()
}

/** An applied image (bundled push or upload) is written into the saved configuration (images.<role>). */
async function applied(runtime?: CcgRuntimeImages | null, report?: CcgWorkersReport | null) {
  if (report) { workers.value = report; pairedReport.value = false }
  emit('changed')
  if (runtime) info.value = runtime
  else await load()
}

// ---------------------------------------------------------------- worker update in place (§53.7)

/** The Docker connection is set up for per-account containers (SSH, local Docker or the control panel). */
const workersReady = computed(() => manage.value && setupProblems({ account_runtimes: props.accountRuntimes, mode: props.mode, has_admin_key: props.hasAdminKey }).length === 0)
const workersError = ref('')
/** Last report: of the button, or of an applied image. */
const workers = ref<CcgWorkersReport | null>(null)
const workerCounts = computed(() => {
  const list = workers.value?.results || []
  const updated = list.filter(r => r.status === 'updated').length
  const unchanged = list.filter(r => r.status === 'unchanged').length
  return { total: list.length, updated, unchanged, other: list.length - updated - unchanged }
})

async function updateWorkers(paired = false) {
  if (locked.value || !workersReady.value || (paired && !props.cliVersion)) return
  const version = { version: props.cliVersion }
  const ok = await confirm({
    title: t(paired ? 'ccgateway.workers.pairedConfirmTitle' : 'ccgateway.workers.confirmTitle', version),
    message: t(paired ? 'ccgateway.workers.pairedConfirmMessage' : 'ccgateway.workers.confirmMessage', version),
    confirmText: t(paired ? 'ccgateway.workers.pairedUpdate' : 'ccgateway.workers.update', version)
  })
  if (!ok || locked.value || !workersReady.value) return
  pairedUpdate.value = paired
  updatingWorkers.value = true
  workersError.value = ''
  try {
    // One synchronous request: every runtime in turn, at most 5 minutes each, 25 minutes in all (the core keeps going if this tab gives up).
    workers.value = await api.post<CcgWorkersReport>('/system/ccgateway/runtime/workers', paired ? { components: ['worker', 'cli'], cli_version: props.cliVersion } : {}, { signal: AbortSignal.timeout(WORKERS_TIMEOUT_MS) })
    pairedReport.value = paired
    toast(t(paired ? 'ccgateway.workers.pairedDone' : 'ccgateway.workers.done'), 'success')
  } catch (e) {
    workersError.value = describe(e) || t('ccgateway.workers.failed')
  } finally {
    updatingWorkers.value = false
  }
}

// ---------------------------------------------------------------- bundled images (§53.10)

const bundledError = ref('')
const bundledReport = ref<CcgBundledReport | null>(null)

async function pushBundled() {
  if (pushing.value) return
  const ok = await confirm({ title: t('ccgateway.bundled.confirmTitle'), message: t('ccgateway.bundled.confirmMessage'), confirmText: t('ccgateway.bundled.push') })
  if (!ok || pushing.value) return
  pushing.value = true
  bundledError.value = ''
  bundledReport.value = null
  try {
    // One synchronous request (upload, load and apply per role, the worker update and a controller self-upgrade); the core keeps going if this tab gives up.
    const report = await api.post<CcgBundledReport>('/system/ccgateway/runtime/bundled', {}, { signal: AbortSignal.timeout(BUNDLED_TIMEOUT_MS) })
    bundledReport.value = report
    const failed = (report.results || []).some(r => r.status === 'failed')
    toast(t(failed ? 'ccgateway.bundled.partial' : 'ccgateway.bundled.done'), failed ? 'warning' : 'success')
    await applied(report.runtime, report.workers)
  } catch (e) {
    bundledError.value = describe(e) || t('ccgateway.bundled.failed')
  } finally {
    pushing.value = false
  }
}

const onUploaded = (r: ImageLoadResult) => applied(r.runtime, r.workers)

onMounted(async () => {
  await load()
  // Opened from the account editor's "open settings" link.
  if (location.hash === `#${ANCHOR}`) {
    await nextTick()
    document.getElementById(ANCHOR)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }
})
</script>

<template>
  <div :id="ANCHOR" data-testid="ccgateway-runtime">
    <SCard :title="t('ccgateway.runtimeInstall.title')" :subtitle="t(controller ? 'ccgateway.runtimeInstall.subtitleController' : 'ccgateway.runtimeInstall.subtitle')">
      <template #actions>
        <SBadge v-if="info" :tone="STATE_TONES[state]" dot data-testid="ccgateway-runtime-state" :data-state="state">{{ t(`ccgateway.runtimeInstall.state.${state}`) }}</SBadge>
        <SButton size="sm" icon="refresh" icon-only :loading="loading" :disabled="installing" :title="t('common.refresh')" :aria-label="t('common.refresh')" @click="load" />
      </template>
      <div class="space-y-4 text-sm">
        <SSettingsGroup :title="t('ccgateway.runtimeInstall.componentsTitle')" data-testid="ccgateway-runtime-components">
          <div class="space-y-3 py-4">
            <SHint v-if="info?.reason" tone="warning">{{ t('ccgateway.accountAuth.reason', { message: reasonLabel(info.reason) }) }}</SHint>
            <CcgErrorAlert v-if="error" :title="error.title" :detail="error.detail" data-testid="ccgateway-runtime-error" />
            <STable v-if="info" :columns="componentColumns" :rows="componentRows" row-key="key" dense :row-attrs="r => ({ 'data-component': r.key })">
              <template #cell-component="{ row }">{{ t(`ccgateway.runtimeInstall.components.${row.key}`) }}</template>
              <template #cell-expected="{ row }"><span class="font-mono text-xs" :title="row.expected">{{ displayImage(row.expected) || t('ccgateway.runtimeInstall.unavailable') }}</span></template>
              <template #cell-installed="{ row }">
                <span class="font-mono text-xs" :class="{ 'text-warning-600 dark:text-warning-400': row.drift }" :title="row.installed">{{ displayImage(row.installed) || t('ccgateway.runtimeInstall.unavailable') }}</span>
              </template>
            </STable>
            <SHint v-if="info?.installed?.version" size="xs">{{ t('ccgateway.runtimeInstall.version', { version: info.installed.version }) }}</SHint>
            <div v-if="manage && info && action" class="flex flex-wrap items-center gap-3">
              <SButton variant="primary" icon="download" :loading="installing" :disabled="locked || loading" data-testid="ccgateway-runtime-install" @click="install">{{ t(`ccgateway.runtimeInstall.${action}`) }}</SButton>
              <SHint v-if="installing" inline size="xs">{{ t('ccgateway.runtimeInstall.installing') }}</SHint>
            </div>
            <SHint v-else-if="!manage && action" size="xs">{{ t('ccgateway.runtimeInstall.readOnly') }}</SHint>
          </div>
        </SSettingsGroup>
        <slot />
        <SSettingsGroup v-if="controller && info && info.bundled !== undefined" :description="info.bundled ? t('ccgateway.bundled.hint') : ''" data-testid="ccgateway-bundled">
          <template #title>
            <h5 class="text-sm font-semibold text-fg" data-testid="ccgateway-bundled-title">{{ info.bundled ? t('ccgateway.bundled.title', { version: info.bundled.version }) : t('ccgateway.bundled.groupTitle') }}</h5>
          </template>
          <div class="space-y-3 py-4">
            <template v-if="info.bundled">
              <STable :columns="bundledColumns" :rows="bundledRows" row-key="role" dense :row-attrs="r => ({ 'data-role': r.role, 'data-state': r.state })">
                <template #cell-role="{ row }">{{ roleLabel(row.role) }}</template>
                <template #cell-image="{ row }"><span class="break-all font-mono text-xs">{{ row.image || t('ccgateway.runtimeInstall.unavailable') }}</span></template>
                <template #cell-state="{ row }"><SBadge :tone="BUNDLED_TONES[row.state]">{{ t(`ccgateway.bundled.states.${row.state}`) }}</SBadge></template>
              </STable>
              <div v-if="manage" class="flex flex-wrap items-center gap-3">
                <SButton :variant="bundledAllEnabled(info) ? 'secondary' : 'primary'" size="sm" icon="upload" :loading="pushing" :disabled="locked || loading" data-testid="ccgateway-bundled-push" @click="pushBundled">{{ t('ccgateway.bundled.push') }}</SButton>
                <SHint v-if="pushing" inline size="xs">{{ t('ccgateway.bundled.pushing') }}</SHint>
                <SHint v-else-if="bundledAllEnabled(info)" inline size="xs" data-testid="ccgateway-bundled-current">{{ t('ccgateway.bundled.allEnabled') }}</SHint>
              </div>
            </template>
            <SHint v-else tone="warning" data-testid="ccgateway-bundled-none">{{ t('ccgateway.bundled.none') }}</SHint>
            <SAlert v-if="bundledError" tone="danger" dense data-testid="ccgateway-bundled-error"><span class="break-all">{{ bundledError }}</span></SAlert>
            <SCard v-if="bundledReport" variant="flat" :title="t('ccgateway.bundled.resultTitle')" :padded="false" role="status" data-testid="ccgateway-bundled-result">
              <STable :columns="resultColumns" :rows="bundledReport.results" row-key="role" dense :row-attrs="r => ({ 'data-role': r.role, 'data-status': r.status })">
                <template #cell-role="{ row }">{{ roleLabel(row.role) }}</template>
                <template #cell-ref="{ row }"><span class="break-all font-mono text-xs">{{ row.ref }}</span></template>
                <template #cell-status="{ row }"><SBadge :tone="RESULT_TONES[row.status] || 'gray'">{{ codeText('ccgateway.bundled.statuses', row.status) }}</SBadge></template>
                <template #cell-reason="{ row }"><span class="break-all text-fg-muted">{{ bundledReason(row.reason) }}</span></template>
              </STable>
            </SCard>
          </div>
        </SSettingsGroup>
        <SSettingsGroup v-if="workersReady || workers" :title="t('ccgateway.workers.groupTitle')" :description="workersReady ? t('ccgateway.workers.hint') : ''" data-testid="ccgateway-workers-group">
          <div class="space-y-3 py-4">
            <div v-if="workersReady" class="space-y-2" data-testid="ccgateway-workers">
              <div class="flex flex-wrap items-center gap-3">
                <SButton size="sm" icon="refresh" :loading="updatingWorkers && !pairedUpdate" :disabled="locked" data-testid="ccgateway-workers-update" @click="updateWorkers(false)">{{ t('ccgateway.workers.update') }}</SButton>
                <SButton size="sm" variant="primary" icon="refresh" :loading="updatingWorkers && pairedUpdate" :disabled="locked || !cliVersion" data-testid="ccgateway-workers-cli-update" @click="updateWorkers(true)">{{ t('ccgateway.workers.pairedUpdate', { version: cliVersion }) }}</SButton>
                <SHint v-if="updatingWorkers" inline size="xs">{{ t('ccgateway.workers.updating') }}</SHint>
              </div>
              <SHint data-testid="ccgateway-workers-cli-hint">{{ t('ccgateway.workers.pairedHint', { version: cliVersion }) }}</SHint>
              <SAlert v-if="workersError" tone="danger" dense data-testid="ccgateway-workers-error"><span class="break-all">{{ workersError }}</span></SAlert>
            </div>
            <SCard v-if="workers" variant="flat" :title="pairedReport ? t('ccgateway.workers.pairedTitle', { version: workers.cli_version || cliVersion }) : t('ccgateway.workers.title')" role="status" data-testid="ccgateway-workers-result">
              <template #actions><span class="break-all font-mono text-xs text-fg-muted" :title="workers.image">{{ t('ccgateway.workers.image', { image: displayImage(workers.image) || workers.image }) }}</span></template>
              <div class="space-y-2">
                <SHint v-if="workers.reason" tone="warning" data-testid="ccgateway-workers-list-failed">{{ t('ccgateway.workers.listFailed', { reason: workerReason(workers.reason) }) }}</SHint>
                <SHint v-else-if="!workers.results.length" size="xs">{{ t('ccgateway.workers.empty') }}</SHint>
                <template v-else>
                  <SHint size="xs" data-testid="ccgateway-workers-summary">{{ t('ccgateway.workers.summary', workerCounts) }}</SHint>
                  <STable :columns="workerColumns" :rows="workers.results" row-key="key" dense :row-attrs="r => ({ 'data-key': r.key, 'data-status': r.status })">
                    <template #cell-account="{ row }">
                      <span v-if="row.account_id != null" class="font-mono">#{{ row.account_id }}</span>
                      <span v-else class="text-fg-muted">{{ t('ccgateway.workers.draft') }}</span>
                      <span v-if="row.key !== String(row.account_id)" class="ml-1 font-mono text-fg-subtle">{{ row.key }}</span>
                    </template>
                    <template #cell-status="{ row }"><SBadge :tone="WORKER_TONES[row.status] || 'gray'">{{ codeText('ccgateway.workers.statuses', row.status) }}</SBadge></template>
                    <template #cell-cli="{ row }">
                      <div class="space-y-1 text-xs" data-testid="ccgateway-worker-cli">
                        <span class="font-mono">{{ row.cli_version || '—' }}</span>
                        <span v-if="row.cli_patch" class="block break-all font-mono">{{ row.cli_patch }}</span>
                        <span v-if="row.cli_sha256" class="block font-mono" :title="row.cli_sha256">{{ shortSha(row.cli_sha256) }}</span>
                        <SBadge v-if="row.online !== undefined" :tone="row.online ? 'success' : 'warning'">{{ t(row.online ? 'ccgateway.workers.online' : 'ccgateway.workers.offline') }}</SBadge>
                      </div>
                    </template>
                    <template #cell-previous="{ row }"><span class="font-mono" :title="row.previous_sha256">{{ shortSha(row.previous_sha256) || '—' }}</span></template>
                    <template #cell-current="{ row }"><span class="font-mono" :title="row.sha256">{{ shortSha(row.sha256) || '—' }}</span></template>
                    <template #cell-reason="{ row }"><span class="break-all text-fg-muted">{{ workerReason(row.reason) }}</span></template>
                  </STable>
                </template>
              </div>
            </SCard>
          </div>
        </SSettingsGroup>
        <RuntimeImageUpload v-if="controller && manage" :disabled="locked" @busy="uploading = $event" @uploaded="onUploaded" />
      </div>
    </SCard>
  </div>
</template>
