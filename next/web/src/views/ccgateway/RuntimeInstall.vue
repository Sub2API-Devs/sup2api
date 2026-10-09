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
import { SBadge, SButton, SCard, SHint, SIcon, confirm, toast } from '@sub2api/ui'
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
const fileInput = ref<HTMLInputElement | null>(null)
const phase = ref<UploadPhase | null>(null)
const progress = ref<UploadPosition | null>(null)
const uploadResult = ref<ImageLoadResult | null>(null)
const uploadError = ref('')
let abort: AbortController | null = null
const uploading = computed(() => phase.value !== null)
const fileProblem = computed(() => (file.value ? imageFileProblem(file.value) : null))
const percent = computed(() => uploadPercent(progress.value))

function pick(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] || null
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
    if (fileInput.value) fileInput.value.value = ''
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
      <div class="space-y-3 text-sm">
        <slot />
        <SHint v-if="readReason" tone="warning">{{ t('ccgateway.runtimeInstall.reason', { message: readReason }) }}</SHint>
        <div v-if="error" class="space-y-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert" data-testid="ccgateway-runtime-error">
          <div class="font-medium">{{ error.title }}</div>
          <div v-if="error.detail" class="break-all opacity-80">{{ t('ccgateway.runtimeInstall.reason', { message: error.detail }) }}</div>
        </div>
        <table v-if="info" class="w-full text-xs">
          <thead>
            <tr class="text-left text-gray-500 dark:text-dark-400">
              <th class="py-1 pr-3 font-medium">{{ t('ccgateway.runtimeInstall.component') }}</th>
              <th class="py-1 pr-3 font-medium">{{ t('ccgateway.runtimeInstall.expected') }}</th>
              <th class="py-1 font-medium">{{ t('ccgateway.runtimeInstall.installed') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in RUNTIME_COMPONENTS" :key="c" class="border-t border-gray-100 dark:border-dark-700" :data-component="c">
              <td class="py-1.5 pr-3 text-gray-700 dark:text-gray-300">{{ t(`ccgateway.runtimeInstall.components.${c}`) }}</td>
              <td class="py-1.5 pr-3 font-mono" :title="componentImages(info, c).expected">{{ displayImage(componentImages(info, c).expected) || t('ccgateway.runtimeInstall.unavailable') }}</td>
              <td class="py-1.5 font-mono" :class="componentImages(info, c).installed && displayImage(componentImages(info, c).installed) !== displayImage(componentImages(info, c).expected) ? 'text-amber-600 dark:text-amber-400' : ''" :title="componentImages(info, c).installed">
                {{ displayImage(componentImages(info, c).installed) || t('ccgateway.runtimeInstall.unavailable') }}
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="info?.installed?.version" class="text-xs text-gray-500 dark:text-dark-400">{{ t('ccgateway.runtimeInstall.version', { version: info.installed.version }) }}</p>
        <div v-if="manage && info && action" class="flex flex-wrap items-center gap-3">
          <SButton type="button" variant="primary" :loading="installing" :disabled="props.disabled || loading || uploading || updatingWorkers || pushing" data-testid="ccgateway-runtime-install" @click="install">
            <SIcon v-if="!installing" name="download" class="h-4 w-4" />{{ t(`ccgateway.runtimeInstall.${action}`) }}
          </SButton>
          <span v-if="installing" class="text-xs text-gray-500 dark:text-dark-400">{{ t('ccgateway.runtimeInstall.installing') }}</span>
        </div>
        <SHint v-else-if="!manage && action" size="xs">{{ t('ccgateway.runtimeInstall.readOnly') }}</SHint>
        <div v-if="controller && info && info.bundled !== undefined" class="space-y-2 border-t border-gray-100 pt-3 dark:border-dark-700" data-testid="ccgateway-bundled">
          <template v-if="info.bundled">
            <div>
              <p class="text-sm font-medium" data-testid="ccgateway-bundled-title">{{ t('ccgateway.bundled.title', { version: info.bundled.version }) }}</p>
              <p class="mt-1 text-xs text-gray-500">{{ t('ccgateway.bundled.hint') }}</p>
            </div>
            <table class="w-full text-xs">
              <thead>
                <tr class="text-left text-gray-500 dark:text-dark-400">
                  <th class="py-1 pr-3 font-medium">{{ t('ccgateway.bundled.component') }}</th>
                  <th class="py-1 pr-3 font-medium">{{ t('ccgateway.bundled.image') }}</th>
                  <th class="py-1 font-medium">{{ t('ccgateway.bundled.onController') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in BUNDLED_ROLES" :key="r" class="border-t border-gray-100 dark:border-dark-700" :data-role="r" :data-state="bundledState(info, r)">
                  <td class="py-1.5 pr-3 text-gray-700 dark:text-gray-300">{{ roleLabel(r) }}</td>
                  <td class="py-1.5 pr-3 break-all font-mono">{{ info.bundled.images[r] || t('ccgateway.runtimeInstall.unavailable') }}</td>
                  <td class="py-1.5"><SBadge :tone="BUNDLED_TONES[bundledState(info, r)]">{{ t(`ccgateway.bundled.states.${bundledState(info, r)}`) }}</SBadge></td>
                </tr>
              </tbody>
            </table>
            <div v-if="manage" class="flex flex-wrap items-center gap-3">
              <SButton type="button" :variant="bundledAllEnabled(info) ? 'secondary' : 'primary'" size="sm" :loading="pushing" :disabled="props.disabled || loading || installing || uploading || updatingWorkers" data-testid="ccgateway-bundled-push" @click="pushBundled">
                <SIcon v-if="!pushing" name="upload" class="h-4 w-4" />{{ t('ccgateway.bundled.push') }}
              </SButton>
              <span v-if="pushing" class="text-xs text-gray-500 dark:text-dark-400">{{ t('ccgateway.bundled.pushing') }}</span>
              <span v-else-if="bundledAllEnabled(info)" class="text-xs text-gray-500 dark:text-dark-400" data-testid="ccgateway-bundled-current">{{ t('ccgateway.bundled.allEnabled') }}</span>
            </div>
          </template>
          <SHint v-else tone="warning" data-testid="ccgateway-bundled-none">{{ t('ccgateway.bundled.none') }}</SHint>
          <p v-if="bundledError" role="alert" class="break-all text-xs text-red-600" data-testid="ccgateway-bundled-error">{{ bundledError }}</p>
          <div v-if="bundledReport" class="space-y-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-dark-700" role="status" data-testid="ccgateway-bundled-result">
            <p class="text-sm font-medium">{{ t('ccgateway.bundled.resultTitle') }}</p>
            <table class="w-full text-xs">
              <thead>
                <tr class="text-left text-gray-500 dark:text-dark-400">
                  <th class="py-1 pr-3 font-medium">{{ t('ccgateway.bundled.component') }}</th>
                  <th class="py-1 pr-3 font-medium">{{ t('ccgateway.bundled.image') }}</th>
                  <th class="py-1 pr-3 font-medium">{{ t('ccgateway.bundled.status') }}</th>
                  <th class="py-1 font-medium">{{ t('ccgateway.bundled.reason') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in bundledReport.results" :key="r.role" class="border-t border-gray-100 dark:border-dark-700" :data-role="r.role" :data-status="r.status">
                  <td class="py-1.5 pr-3">{{ roleLabel(r.role) }}</td>
                  <td class="py-1.5 pr-3 break-all font-mono">{{ r.ref }}</td>
                  <td class="py-1.5 pr-3"><SBadge :tone="RESULT_TONES[r.status] || 'gray'">{{ bundledStatus(r) }}</SBadge></td>
                  <td class="py-1.5 break-all text-gray-600 dark:text-gray-400">{{ bundledReason(r.reason) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <details v-if="controller && manage" class="border-t border-gray-100 pt-3 dark:border-dark-700" data-testid="ccgateway-image-upload">
          <summary class="cursor-pointer text-sm font-medium">{{ t('ccgateway.imageUpload.advanced') }}</summary>
          <div class="mt-3 space-y-3">
            <div><p class="text-sm font-medium">{{ t('ccgateway.imageUpload.title') }}</p><p class="mt-1 text-xs text-gray-500">{{ t('ccgateway.imageUpload.hint') }}</p></div>
            <div class="grid gap-3 sm:grid-cols-3">
              <label class="block text-sm">{{ t('ccgateway.imageUpload.role') }}<select v-model="role" class="input mt-1 w-full" :disabled="props.disabled || uploading || installing || updatingWorkers || pushing" data-testid="image-upload-role"><option v-for="r in IMAGE_ROLES" :key="r" :value="r">{{ t(`ccgateway.imageUpload.roles.${r}`) }}</option></select></label>
              <label class="block min-w-0 text-sm sm:col-span-2">{{ t('ccgateway.imageUpload.file') }}<input ref="fileInput" type="file" accept=".tar,.tar.gz,.tgz,application/x-tar,application/gzip" class="input mt-1 w-full" :disabled="props.disabled || uploading || installing || updatingWorkers || pushing" data-testid="image-upload-file" @change="pick" /></label>
            </div>
            <p v-if="role === 'app'" class="text-xs text-gray-500" data-testid="image-upload-app-hint">{{ t('ccgateway.imageUpload.appHint') }}</p>
            <p v-if="fileProblem" role="alert" class="text-xs text-red-600">{{ t(`ccgateway.imageUpload.problem.${fileProblem}`) }}</p>
            <div v-if="uploading && progress" class="space-y-1" data-testid="image-upload-progress">
              <div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-700" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="percent"><div class="h-full bg-teal-500 transition-all" :style="{ width: percent + '%' }" /></div>
              <p class="text-xs text-gray-500">{{ phase === 'load' ? t('ccgateway.imageUpload.loading') : t('ccgateway.imageUpload.uploading', { percent, done: formatMiB(progress.offset), total: formatMiB(progress.size) }) }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <SButton type="button" variant="primary" size="sm" :loading="uploading" :disabled="props.disabled || installing || updatingWorkers || pushing || !file || !!fileProblem" data-testid="image-upload-submit" @click="upload"><SIcon v-if="!uploading" name="upload" class="h-4 w-4" />{{ t('ccgateway.imageUpload.submit') }}</SButton>
              <SButton v-if="phase === 'upload'" type="button" size="sm" data-testid="image-upload-cancel" @click="cancelUpload">{{ t('ccgateway.imageUpload.cancel') }}</SButton>
            </div>
            <p v-if="uploadError" role="alert" class="break-all text-xs text-red-600" data-testid="image-upload-error">{{ uploadError }}</p>
            <div v-if="uploadResult" class="space-y-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300" role="status" data-testid="image-upload-result">
              <div class="font-medium">{{ t('ccgateway.imageUpload.done') }}</div>
              <div class="break-all font-mono">{{ t('ccgateway.imageUpload.result', { ref: uploadResult.ref }) }}</div>
              <div class="break-all font-mono">{{ t('ccgateway.imageUpload.sha256', { sha: uploadResult.sha256 }) }}</div>
            </div>
          </div>
        </details>
        <div v-if="manage && workersReady" class="space-y-2 border-t border-gray-100 pt-3 dark:border-dark-700" data-testid="ccgateway-workers">
          <p class="text-xs text-gray-500">{{ t('ccgateway.workers.hint') }}</p>
          <div class="flex flex-wrap items-center gap-3">
            <SButton type="button" size="sm" :loading="updatingWorkers" :disabled="props.disabled || installing || uploading || pushing" data-testid="ccgateway-workers-update" @click="updateWorkers">
              <SIcon v-if="!updatingWorkers" name="refresh" class="h-4 w-4" />{{ t('ccgateway.workers.update') }}
            </SButton>
            <span v-if="updatingWorkers" class="text-xs text-gray-500 dark:text-dark-400">{{ t('ccgateway.workers.updating') }}</span>
          </div>
          <p v-if="workersError" role="alert" class="break-all text-xs text-red-600" data-testid="ccgateway-workers-error">{{ workersError }}</p>
        </div>
        <div v-if="workers" class="space-y-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-dark-700" role="status" data-testid="ccgateway-workers-result">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <p class="text-sm font-medium">{{ t('ccgateway.workers.title') }}</p>
            <p class="break-all font-mono text-xs text-gray-500" :title="workers.image">{{ t('ccgateway.workers.image', { image: displayImage(workers.image) || workers.image }) }}</p>
          </div>
          <SHint v-if="workers.reason" tone="warning" data-testid="ccgateway-workers-list-failed">{{ t('ccgateway.workers.listFailed', { reason: workerReason(workers.reason) }) }}</SHint>
          <p v-else-if="!workers.results.length" class="text-xs text-gray-500">{{ t('ccgateway.workers.empty') }}</p>
          <template v-else>
            <p class="text-xs text-gray-500" data-testid="ccgateway-workers-summary">{{ t('ccgateway.workers.summary', workerCounts) }}</p>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-left text-gray-500 dark:text-dark-400">
                    <th class="py-1 pr-3 font-medium">{{ t('ccgateway.workers.account') }}</th>
                    <th class="py-1 pr-3 font-medium">{{ t('ccgateway.workers.status') }}</th>
                    <th class="py-1 pr-3 font-medium">{{ t('ccgateway.workers.previous') }}</th>
                    <th class="py-1 pr-3 font-medium">{{ t('ccgateway.workers.current') }}</th>
                    <th class="py-1 font-medium">{{ t('ccgateway.workers.reason') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in workers.results" :key="r.key" class="border-t border-gray-100 dark:border-dark-700" :data-key="r.key" :data-status="r.status">
                    <td class="py-1.5 pr-3">
                      <span v-if="r.account_id != null" class="font-mono">#{{ r.account_id }}</span>
                      <span v-else class="text-gray-500">{{ t('ccgateway.workers.draft') }}</span>
                      <span v-if="r.key !== String(r.account_id)" class="ml-1 font-mono text-gray-400">{{ r.key }}</span>
                    </td>
                    <td class="py-1.5 pr-3"><SBadge :tone="WORKER_TONES[r.status] || 'gray'">{{ workerStatus(r) }}</SBadge></td>
                    <td class="py-1.5 pr-3 font-mono" :title="r.previous_sha256">{{ shortSha(r.previous_sha256) || '—' }}</td>
                    <td class="py-1.5 pr-3 font-mono" :title="r.sha256">{{ shortSha(r.sha256) || '—' }}</td>
                    <td class="py-1.5 break-all text-gray-600 dark:text-gray-400">{{ workerReason(r.reason) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </div>
    </SCard>
  </div>
</template>
