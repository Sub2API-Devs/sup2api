<script setup lang="ts">
// "Advanced: upload an image by hand" of the runtime card (control panel mode,
// CONTRACTS §53.6): a docker save archive is uploaded in chunks
// (./imageUpload), then loaded and applied by the controller. Cancelling stops
// the chunk upload; loading, once started, runs to its end in the core.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SDisclosure, SField, SHint, SInput, SProgress, SSelect, confirm, toast } from '@sub2api/ui'
import { reasonOf } from './ccgAuthFlow'
import { useCcgError } from './ccgError'
import { IMAGE_ROLES, createUploadTransport, formatMiB, imageFileProblem, isAbort, uploadImage, uploadPercent, type ImageLoadResult, type ImageRole, type UploadPhase, type UploadPosition } from './imageUpload'

const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{
  /** The upload runs: the card locks its other actions meanwhile. */
  (e: 'busy', value: boolean): void
  /** The image was loaded and applied (written into the saved configuration as images.<role>). */
  (e: 'uploaded', result: ImageLoadResult): void
}>()
const { t } = useI18n()
const describe = useCcgError()

const role = ref<ImageRole>('app')
const file = ref<File | null>(null)
/** Bumped to clear the file input after an upload. */
const fileKey = ref(0)
const roleOptions = computed(() => IMAGE_ROLES.map(value => ({ value, label: t(`ccgateway.imageUpload.roles.${value}`) })))
const phase = ref<UploadPhase | null>(null)
const progress = ref<UploadPosition | null>(null)
const result = ref<ImageLoadResult | null>(null)
const error = ref('')
let abort: AbortController | null = null
const uploading = computed(() => phase.value !== null)
const fileProblem = computed(() => (file.value ? imageFileProblem(file.value) : null))
const percent = computed(() => uploadPercent(progress.value))
watch(uploading, (v) => emit('busy', v))

function pick(files: unknown) {
  const list = files as ArrayLike<File> | null
  file.value = list && list.length ? list[0] : null
  error.value = ''
  result.value = null
}

/** Upload failure, translated; an upload the controller no longer has is not a missing container. */
function uploadFailure(e: unknown): string {
  if (isAbort(e, abort?.signal)) return t('ccgateway.imageUpload.cancelled')
  return reasonOf(e) === 'not_found' ? t('ccgateway.imageUpload.notFound') : describe(e) || t('ccgateway.imageUpload.failed')
}

async function upload() {
  const f = file.value
  if (!f || uploading.value) return
  const problem = imageFileProblem(f)
  if (problem) {
    error.value = t(`ccgateway.imageUpload.problem.${problem}`)
    return
  }
  const ok = await confirm({ title: t('ccgateway.imageUpload.confirmTitle'), message: t(`ccgateway.imageUpload.confirm.${role.value}`), confirmText: t('ccgateway.imageUpload.submit') })
  if (!ok || uploading.value) return
  error.value = ''
  result.value = null
  progress.value = { offset: 0, size: f.size }
  phase.value = 'upload'
  abort = new AbortController()
  try {
    const r = await uploadImage(f, role.value, createUploadTransport(), {
      signal: abort.signal,
      onProgress: p => { progress.value = p },
      onPhase: p => { phase.value = p }
    })
    result.value = r
    toast(t('ccgateway.imageUpload.done'), 'success')
    file.value = null
    fileKey.value++
    emit('uploaded', r)
  } catch (e) {
    error.value = uploadFailure(e)
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
</script>

<template>
  <SDisclosure :label="t('ccgateway.imageUpload.advanced')" data-testid="ccgateway-image-upload">
    <div class="space-y-3">
      <div>
        <p class="text-sm font-medium text-fg">{{ t('ccgateway.imageUpload.title') }}</p>
        <p class="mt-1">{{ t('ccgateway.imageUpload.hint') }}</p>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <SField :label="t('ccgateway.imageUpload.role')">
          <SSelect :model-value="role" :options="roleOptions" :disabled="props.disabled" data-testid="image-upload-role" @update:model-value="role = $event as ImageRole" />
        </SField>
        <SField :label="t('ccgateway.imageUpload.file')" class="min-w-0 sm:col-span-2">
          <SInput :key="fileKey" :model-value="null" type="file" accept=".tar,.tar.gz,.tgz,application/x-tar,application/gzip" :disabled="props.disabled" data-testid="image-upload-file" @update:model-value="pick" />
        </SField>
      </div>
      <p v-if="role === 'app'" data-testid="image-upload-app-hint">{{ t('ccgateway.imageUpload.appHint') }}</p>
      <SHint v-if="fileProblem" tone="danger" size="xs" role="alert">{{ t(`ccgateway.imageUpload.problem.${fileProblem}`) }}</SHint>
      <SProgress v-if="uploading && progress" :value="percent" size="md" :indeterminate="phase === 'load'" :label="t('ccgateway.imageUpload.title')" data-testid="image-upload-progress">
        {{ phase === 'load' ? t('ccgateway.imageUpload.loading') : t('ccgateway.imageUpload.uploading', { percent, done: formatMiB(progress.offset), total: formatMiB(progress.size) }) }}
      </SProgress>
      <div class="flex flex-wrap items-center gap-2">
        <SButton variant="primary" size="sm" icon="upload" :loading="uploading" :disabled="props.disabled || !file || !!fileProblem" data-testid="image-upload-submit" @click="upload">{{ t('ccgateway.imageUpload.submit') }}</SButton>
        <SButton v-if="phase === 'upload'" size="sm" data-testid="image-upload-cancel" @click="cancelUpload">{{ t('ccgateway.imageUpload.cancel') }}</SButton>
      </div>
      <SAlert v-if="error" tone="danger" dense data-testid="image-upload-error"><span class="break-all">{{ error }}</span></SAlert>
      <SAlert v-if="result" tone="success" dense :title="t('ccgateway.imageUpload.done')" data-testid="image-upload-result">
        <div class="break-all font-mono">{{ t('ccgateway.imageUpload.result', { ref: result.ref }) }}</div>
        <div class="break-all font-mono">{{ t('ccgateway.imageUpload.sha256', { sha: result.sha256 }) }}</div>
      </SAlert>
    </div>
  </SDisclosure>
</template>
