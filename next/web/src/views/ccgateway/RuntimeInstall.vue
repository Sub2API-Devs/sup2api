<script setup lang="ts">
// "Runtime" card of the CCGateway settings: the container images and the
// controller of the per-account containers are published on GHCR; the core
// installs or upgrades them on the Docker host over SSH, or through the
// control panel in controller mode (GET /system/ccgateway/runtime, POST
// .../runtime/install, CONTRACTS §49.16 / §53.6). In controller mode images can
// also be uploaded (docker save archives, chunked, see ./imageUpload). Images
// show their short digest; states and failure reasons are codes translated
// here. The account editor links here (#ccgateway-runtime) when a runtime is not_configured.
// Existing account containers are never recreated for a new app image: their
// worker program is replaced in place (POST .../runtime/workers, and the
// `workers` of an applied app upload, §53.7); the per-account results show here.
// The runtime images also ship inside the ccgateway plugin package (§53.10):
// in controller mode the card shows them (GET runtime `bundled`) and pushes the
// ones the controller lacks (POST .../runtime/bundled); the manual upload stays
// as an advanced option.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SDisclosure, SField, SHint, SIcon, SInput, SProgress, SSelect, SSettingsGroup, STable, confirm, toast, type TableColumn } from '@sub2api/ui'
import type { CcgBundledReport, CcgBundledResult, CcgRuntimeImages, CcgWorkerResult, CcgWorkersReport } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useCcgError } from './ccgError'
import { knownReason, reasonOf, setupProblems } from './ccgAuthFlow'
import { BUNDLED_ROLES, BUNDLED_TIMEOUT_MS, RUNTIME_COMPONENTS, bundledAllEnabled, bundledState, componentImages, runtimeState, displayImage } from './runtimeInstall'
import { IMAGE_ROLES, WORKERS_TIMEOUT_MS, createUploadTransport, formatMiB, imageFileProblem, isAbort, uploadImage, uploadPercent, type ImageLoadResult, type ImageRole, type UploadPhase, type UploadPosition } from './imageUpload'

const props = defineProps<{ disabled?: boolean; mode?: string; accountRuntimes?: boolean; hasAdminKey?: boolean }>()
const emit = defineEmits<{ (event: 'changed'): void }>()
const { t, te } = useI18n()
const auth = useAuthStore()
const describe = useCcgError()
const ANCHOR = 'ccgateway-runtime'

const info = ref<CcgRuntimeImages | null>(null)
const loading = ref(false)
const installing = ref(false)
/** Load or install failure, translated. */
const error = ref<{ title: string; detail: string } | null>(null)
const manage = computed(() => auth.has('settings:manage'))
const controller = computed(() => props.mode === 'controller')
const state = computed(() => runtimeState(info.value))
const badge = computed(() => ({ notInstalled: 'gray', upToDate: 'success', outdated: 'warning', unknown: 'gray' } as const)[state.value])
/** Why the installed state is unknown (GET reason). */
const readReason = computed(() => {
  const r = info.value?.reason
  if (!r) return ''
  const k = knownReason(r)
  return k ? t(`ccgateway.reason.${k}`) : r
})
const componentColumns = computed<TableColumn[]>(() => [
  { key: 'component', label: t('ccgateway.runtimeInstall.component') },
  { key: 'expected', label: t('ccgateway.runtimeInstall.expected') },
  { key: 'installed', label: t('ccgateway.runtimeInstall.installed') }
])
const componentRows = computed(() => RUNTIME_COMPONENTS.map(key => ({ key })))
const bundledColumns = computed<TableColumn[]>(() => [
  { key: 'role', label: t('ccgateway.bundled.component') },
  { key: 'image', label: t('ccgateway.bundled.image') },
  { key: 'state', label: t('ccgateway.bundled.onController') }
])
const bundledRows = computed(() => BUNDLED_ROLES.map(role => ({ role })))
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
  { key: 'reason', label: t('ccgateway.workers.reason') }
])
const action = computed<'install' | 'upgrade' | null>(() => (state.value === 'notInstalled' ? 'install' : state.value === 'outdated' ? 'upgrade' : null))

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

// ---------------------------------------------------------------- worker update in place (§53.7)

/** The Docker connection is set up for per-account containers (SSH, local Docker or the control panel). */
const workersReady = computed(() => setupProblems({ account_runtimes: props.accountRuntimes, mode: props.mode, has_admin_key: props.hasAdminKey }).length === 0)
const updatingWorkers = ref(false)
const workersError = ref('')
/** Last report: of the button, or of an applied app upload. */
const workers = ref<CcgWorkersReport | null>(null)
const workerCounts = computed(() => {
  const list = workers.value?.results || []
  const updated = list.filter(r => r.status === 'updated').length
  const unchanged = list.filter(r => r.status === 'unchanged').length
  return { total: list.length, updated, unchanged, other: list.length - updated - unchanged }
})
const WORKER_TONES = { updated: 'success', unchanged: 'gray', busy: 'warning', not_running: 'warning', rolled_back: 'danger', failed: 'danger' } as const

function shortSha(sha?: string): string {
  return sha && /^[0-9a-f]{64}$/.test(sha) ? sha.slice(0, 12) : ''
}
function workerStatus(r: CcgWorkerResult): string {
  return te(`ccgateway.workers.statuses.${r.status}`) ? t(`ccgateway.workers.statuses.${r.status}`) : r.status
}
function workerReason(code?: string): string {
  if (!code) return ''
  return te(`ccgateway.workers.reasons.${code}`) ? t(`ccgateway.workers.reasons.${code}`) : code
}

async function updateWorkers() {
  if (updatingWorkers.value) return
  const ok = await confirm({ title: t('ccgateway.workers.confirmTitle'), message: t('ccgateway.workers.confirmMessage'), confirmText: t('ccgateway.workers.update') })
  if (!ok || updatingWorkers.value) return
  updatingWorkers.value = true
  workersError.value = ''
  try {
    // One synchronous request: every runtime in turn, at most 5 minutes each, 25 minutes in all (the core keeps going if this tab gives up).
    workers.value = await api.post<CcgWorkersReport>('/system/ccgateway/runtime/workers', {}, { signal: AbortSignal.timeout(WORKERS_TIMEOUT_MS) })
    toast(t('ccgateway.workers.done'), 'success')
  } catch (e) {
    workersError.value = describe(e) || t('ccgateway.workers.failed')
  } finally {
    updatingWorkers.value = false
  }
}

// ---------------------------------------------------------------- bundled images (§53.10)

const pushing = ref(false)
const bundledError = ref('')
const bundledReport = ref<CcgBundledReport | null>(null)
const BUNDLED_TONES = { enabled: 'success', notEnabled: 'warning', unknown: 'gray', installOnly: 'gray' } as const
const RESULT_TONES = { loaded: 'success', present: 'gray', failed: 'danger' } as const

function bundledStatus(r: CcgBundledResult): string {
  return te(`ccgateway.bundled.statuses.${r.status}`) ? t(`ccgateway.bundled.statuses.${r.status}`) : r.status
}
/** A failed role's code: the shared reasons first, then the worker update's, else the code itself. */
function bundledReason(code?: string): string {
  if (!code) return ''
  const k = knownReason(code)
  if (k) return t(`ccgateway.reason.${k}`)
  return workerReason(code)
}
function roleLabel(role: string): string {
  return te(`ccgateway.bundled.roles.${role}`) ? t(`ccgateway.bundled.roles.${role}`) : role
}

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
    if (report.workers) workers.value = report.workers
    const failed = (report.results || []).some(r => r.status === 'failed')
    toast(t(failed ? 'ccgateway.bundled.partial' : 'ccgateway.bundled.done'), failed ? 'warning' : 'success')
    // Applied images are written into the saved configuration (images.<role>).
    emit('changed')
    if (report.runtime) info.value = report.runtime
    else await load()
  } catch (e) {
    bundledError.value = describe(e) || t('ccgateway.bundled.failed')
  } finally {
    pushing.value = false
  }
}

// ---------------------------------------------------------------- image upload (control panel mode, §53.6)

const role = ref<ImageRole>('app')
const file = ref<File | null>(null)
/** Bumped to clear the file input after an upload. */
const fileKey = ref(0)
const roleOptions = computed(() => IMAGE_ROLES.map(value => ({ value, label: t(`ccgateway.imageUpload.roles.${value}`) })))
const phase = ref<UploadPhase | null>(null)
const progress = ref<UploadPosition | null>(null)
const uploadResult = ref<ImageLoadResult | null>(null)
const uploadError = ref('')
let abort: AbortController | null = null
const uploading = computed(() => phase.value !== null)
const fileProblem = computed(() => (file.value ? imageFileProblem(file.value) : null))
const percent = computed(() => uploadPercent(progress.value))

function pick(files: unknown) {
  const list = files as ArrayLike<File> | null
  file.value = list && list.length ? list[0] : null
  uploadError.value = ''
  uploadResult.value = null
}

/** Upload failure, translated; an upload the controller no longer has is not a missing container. */
function uploadFailure(e: unknown): string {
  return reasonOf(e) === 'not_found' ? t('ccgateway.imageUpload.notFound') : describe(e) || t('ccgateway.imageUpload.failed')
}

async function upload() {
  const f = file.value
  if (!f || uploading.value) return
  const problem = imageFileProblem(f)
  if (problem) { uploadError.value = t(`ccgateway.imageUpload.problem.${problem}`); return }
  const ok = await confirm({ title: t('ccgateway.imageUpload.confirmTitle'), message: t(`ccgateway.imageUpload.confirm.${role.value}`), confirmText: t('ccgateway.imageUpload.submit') })
  if (!ok || uploading.value) return
  uploadError.value = ''
  uploadResult.value = null
  progress.value = { offset: 0, size: f.size }
  phase.value = 'upload'
  abort = new AbortController()
  try {
    const result = await uploadImage(f, role.value, createUploadTransport(), {
      signal: abort.signal,
      onProgress: p => { progress.value = p },
      onPhase: p => { phase.value = p }
    })
    uploadResult.value = result
    if (result?.workers) workers.value = result.workers
    toast(t('ccgateway.imageUpload.done'), 'success')
    file.value = null
    fileKey.value++
    // The applied image is written into the saved configuration (images.<role>).
    emit('changed')
    if (result?.runtime) info.value = result.runtime
    else await load()
  } catch (e) {
    uploadError.value = isAbort(e, abort?.signal) ? t('ccgateway.imageUpload.cancelled') : uploadFailure(e)
  } finally {
    phase.value = null
    abort = null
  }
}

/** Cancels the chunk upload (the upload is deleted); loading, once started, runs to its end in the core. */
function cancelUpload() {
  if (phase.value === 'upload') abort?.abort()
}

onBeforeUnmount(() => abort?.abort())

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
        <SBadge v-if="info" :tone="badge" dot data-testid="ccgateway-runtime-state" :data-state="state">{{ t(`ccgateway.runtimeInstall.state.${state}`) }}</SBadge>
        <SButton type="button" size="sm" :loading="loading" :disabled="installing" :title="t('common.refresh')" :aria-label="t('common.refresh')" @click="load"><SIcon name="refresh" class="h-4 w-4" /></SButton>
      </template>
      <div class="space-y-4 text-sm">
        <SSettingsGroup :title="t('ccgateway.runtimeInstall.componentsTitle')" data-testid="ccgateway-runtime-components">
          <div class="space-y-3 py-4">
            <SHint v-if="readReason" tone="warning">{{ t('ccgateway.runtimeInstall.reason', { message: readReason }) }}</SHint>
            <SAlert v-if="error" tone="danger" dense :title="error.title" data-testid="ccgateway-runtime-error">
              <span v-if="error.detail" class="break-all">{{ t('ccgateway.runtimeInstall.reason', { message: error.detail }) }}</span>
            </SAlert>
            <STable v-if="info" :columns="componentColumns" :rows="componentRows" row-key="key" dense :row-attrs="r => ({ 'data-component': r.key })">
              <template #cell-component="{ row }">{{ t(`ccgateway.runtimeInstall.components.${row.key}`) }}</template>
              <template #cell-expected="{ row }"><span class="font-mono text-xs" :title="componentImages(info!, row.key).expected">{{ displayImage(componentImages(info!, row.key).expected) || t('ccgateway.runtimeInstall.unavailable') }}</span></template>
              <template #cell-installed="{ row }">
                <span class="font-mono text-xs" :class="componentImages(info!, row.key).installed && displayImage(componentImages(info!, row.key).installed) !== displayImage(componentImages(info!, row.key).expected) ? 'text-warning-600 dark:text-warning-400' : ''" :title="componentImages(info!, row.key).installed">{{ displayImage(componentImages(info!, row.key).installed) || t('ccgateway.runtimeInstall.unavailable') }}</span>
              </template>
            </STable>
            <SHint v-if="info?.installed?.version" size="xs">{{ t('ccgateway.runtimeInstall.version', { version: info.installed.version }) }}</SHint>
            <div v-if="manage && info && action" class="flex flex-wrap items-center gap-3">
              <SButton type="button" variant="primary" :loading="installing" :disabled="props.disabled || loading || uploading || updatingWorkers || pushing" data-testid="ccgateway-runtime-install" @click="install">
                <SIcon v-if="!installing" name="download" class="h-4 w-4" />{{ t(`ccgateway.runtimeInstall.${action}`) }}
              </SButton>
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
              <STable :columns="bundledColumns" :rows="bundledRows" row-key="role" dense :row-attrs="r => ({ 'data-role': r.role, 'data-state': bundledState(info!, r.role) })">
                <template #cell-role="{ row }">{{ roleLabel(row.role) }}</template>
                <template #cell-image="{ row }"><span class="break-all font-mono text-xs">{{ info!.bundled!.images[row.role] || t('ccgateway.runtimeInstall.unavailable') }}</span></template>
                <template #cell-state="{ row }"><SBadge :tone="BUNDLED_TONES[bundledState(info!, row.role)]">{{ t(`ccgateway.bundled.states.${bundledState(info!, row.role)}`) }}</SBadge></template>
              </STable>
              <div v-if="manage" class="flex flex-wrap items-center gap-3">
                <SButton type="button" :variant="bundledAllEnabled(info) ? 'secondary' : 'primary'" size="sm" :loading="pushing" :disabled="props.disabled || loading || installing || uploading || updatingWorkers" data-testid="ccgateway-bundled-push" @click="pushBundled">
                  <SIcon v-if="!pushing" name="upload" class="h-4 w-4" />{{ t('ccgateway.bundled.push') }}
                </SButton>
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
                <template #cell-status="{ row }"><SBadge :tone="RESULT_TONES[row.status as keyof typeof RESULT_TONES] || 'gray'">{{ bundledStatus(row) }}</SBadge></template>
                <template #cell-reason="{ row }"><span class="break-all text-fg-muted">{{ bundledReason(row.reason) }}</span></template>
              </STable>
            </SCard>
          </div>
        </SSettingsGroup>
        <SSettingsGroup v-if="(manage && workersReady) || workers" :title="t('ccgateway.workers.groupTitle')" :description="manage && workersReady ? t('ccgateway.workers.hint') : ''" data-testid="ccgateway-workers-group">
          <div class="space-y-3 py-4">
            <div v-if="manage && workersReady" class="space-y-2" data-testid="ccgateway-workers">
              <div class="flex flex-wrap items-center gap-3">
                <SButton type="button" size="sm" :loading="updatingWorkers" :disabled="props.disabled || installing || uploading || pushing" data-testid="ccgateway-workers-update" @click="updateWorkers">
                  <SIcon v-if="!updatingWorkers" name="refresh" class="h-4 w-4" />{{ t('ccgateway.workers.update') }}
                </SButton>
                <SHint v-if="updatingWorkers" inline size="xs">{{ t('ccgateway.workers.updating') }}</SHint>
              </div>
              <SAlert v-if="workersError" tone="danger" dense data-testid="ccgateway-workers-error"><span class="break-all">{{ workersError }}</span></SAlert>
            </div>
            <SCard v-if="workers" variant="flat" :title="t('ccgateway.workers.title')" role="status" data-testid="ccgateway-workers-result">
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
                    <template #cell-status="{ row }"><SBadge :tone="WORKER_TONES[row.status as keyof typeof WORKER_TONES] || 'gray'">{{ workerStatus(row) }}</SBadge></template>
                    <template #cell-previous="{ row }"><span class="font-mono" :title="row.previous_sha256">{{ shortSha(row.previous_sha256) || '—' }}</span></template>
                    <template #cell-current="{ row }"><span class="font-mono" :title="row.sha256">{{ shortSha(row.sha256) || '—' }}</span></template>
                    <template #cell-reason="{ row }"><span class="break-all text-fg-muted">{{ workerReason(row.reason) }}</span></template>
                  </STable>
                </template>
              </div>
            </SCard>
          </div>
        </SSettingsGroup>
        <SDisclosure v-if="controller && manage" :label="t('ccgateway.imageUpload.advanced')" data-testid="ccgateway-image-upload">
          <div class="space-y-3">
            <div><p class="text-sm font-medium text-fg">{{ t('ccgateway.imageUpload.title') }}</p><p class="mt-1">{{ t('ccgateway.imageUpload.hint') }}</p></div>
            <div class="grid gap-3 sm:grid-cols-3">
              <SField :label="t('ccgateway.imageUpload.role')">
                <SSelect :model-value="role" :options="roleOptions" :disabled="props.disabled || uploading || installing || updatingWorkers || pushing" data-testid="image-upload-role" @update:model-value="role = $event as ImageRole" />
              </SField>
              <SField :label="t('ccgateway.imageUpload.file')" class="min-w-0 sm:col-span-2">
                <SInput :key="fileKey" :model-value="null" type="file" accept=".tar,.tar.gz,.tgz,application/x-tar,application/gzip" :disabled="props.disabled || uploading || installing || updatingWorkers || pushing" data-testid="image-upload-file" @update:model-value="pick" />
              </SField>
            </div>
            <p v-if="role === 'app'" data-testid="image-upload-app-hint">{{ t('ccgateway.imageUpload.appHint') }}</p>
            <SHint v-if="fileProblem" tone="danger" size="xs" role="alert">{{ t(`ccgateway.imageUpload.problem.${fileProblem}`) }}</SHint>
            <SProgress v-if="uploading && progress" :value="percent" size="md" :indeterminate="phase === 'load'" :label="t('ccgateway.imageUpload.title')" data-testid="image-upload-progress">
              {{ phase === 'load' ? t('ccgateway.imageUpload.loading') : t('ccgateway.imageUpload.uploading', { percent, done: formatMiB(progress.offset), total: formatMiB(progress.size) }) }}
            </SProgress>
            <div class="flex flex-wrap items-center gap-2">
              <SButton type="button" variant="primary" size="sm" :loading="uploading" :disabled="props.disabled || installing || updatingWorkers || pushing || !file || !!fileProblem" data-testid="image-upload-submit" @click="upload"><SIcon v-if="!uploading" name="upload" class="h-4 w-4" />{{ t('ccgateway.imageUpload.submit') }}</SButton>
              <SButton v-if="phase === 'upload'" type="button" size="sm" data-testid="image-upload-cancel" @click="cancelUpload">{{ t('ccgateway.imageUpload.cancel') }}</SButton>
            </div>
            <SAlert v-if="uploadError" tone="danger" dense data-testid="image-upload-error"><span class="break-all">{{ uploadError }}</span></SAlert>
            <SAlert v-if="uploadResult" tone="success" dense :title="t('ccgateway.imageUpload.done')" data-testid="image-upload-result">
              <div class="break-all font-mono">{{ t('ccgateway.imageUpload.result', { ref: uploadResult.ref }) }}</div>
              <div class="break-all font-mono">{{ t('ccgateway.imageUpload.sha256', { sha: uploadResult.sha256 }) }}</div>
            </SAlert>
          </div>
        </SDisclosure>
      </div>
    </SCard>
  </div>
</template>
