<script setup lang="ts">
// One content file of a request log (full level, settings:manage), loaded
// 1 MiB at a time. Everything is shown as text nodes; nothing in a log is
// rendered as HTML or followed as a link. `initialRaw`: start in the raw view.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SCheckbox, SCode, SCopyButton, SEmpty, SHint, SSegmented, SSpinner, toast, type SelectOption } from '@sub2api/ui'
import { errorMessage } from '@/utils/errors'
import { hexPreview, joinBytes, jsonlBlocks, prettyJSON, readChunk, downloadFile, sizeText, sseBlocks, textOf, viewOf } from './requestLogViewer'

const props = defineProps<{ accountId: number; log: string; requestId: string; name: string; initialRaw?: boolean }>()
const { t } = useI18n()

// Formatting a large JSON value is slow and unreadable: past this only the raw text.
const FORMAT_LIMIT = 1 << 20
// Lines / events shown as blocks; the rest is in the raw view.
const BLOCK_LIMIT = 500

const bytes = ref<Uint8Array>(new Uint8Array())
const size = ref(0)
const loading = ref(false)
const error = ref('')
const raw = ref(!!props.initialRaw)
const wrap = ref(true)
const downloading = ref(false)
let abort: AbortController | null = null

const text = computed(() => textOf(bytes.value))
const view = computed(() => viewOf(props.name, text.value, bytes.value))
const complete = computed(() => bytes.value.length >= size.value)
const formatted = computed(() => {
  if (raw.value || view.value !== 'json') return null
  return complete.value && bytes.value.length <= FORMAT_LIMIT ? prettyJSON(text.value) : null
})
const allBlocks = computed(() => {
  if (raw.value) return null
  if (view.value === 'jsonl') return jsonlBlocks(complete.value ? text.value : text.value.slice(0, text.value.lastIndexOf('\n') + 1))
  if (view.value === 'sse') return sseBlocks(complete.value ? text.value : text.value.slice(0, text.value.lastIndexOf('\n\n') + 2))
  return null
})
const blocks = computed(() => allBlocks.value?.slice(0, BLOCK_LIMIT) ?? null)
const blocksCut = computed(() => (allBlocks.value?.length ?? 0) > BLOCK_LIMIT)
const modeOptions = computed<SelectOption[]>(() => [
  { value: 'formatted', label: view.value === 'sse' ? t('ccgateway.logViewer.content.sse') : view.value === 'jsonl' ? t('ccgateway.logViewer.content.lines') : t('ccgateway.logViewer.content.formatted') },
  { value: 'raw', label: t('ccgateway.logViewer.content.raw') }
])

async function load(offset: number) {
  if (!props.name) return
  abort?.abort()
  const controller = (abort = new AbortController())
  loading.value = true
  error.value = ''
  try {
    const chunk = await readChunk(props.accountId, props.log, props.name, offset, controller.signal)
    if (controller !== abort) return
    bytes.value = offset === 0 ? chunk.bytes : joinBytes(bytes.value, chunk.bytes)
    size.value = chunk.size
  } catch (e) {
    if (controller === abort && !controller.signal.aborted) error.value = errorMessage(e)
  } finally {
    if (controller === abort) loading.value = false
  }
}

watch(() => props.name, () => {
  bytes.value = new Uint8Array()
  size.value = 0
  raw.value = !!props.initialRaw
  void load(0)
}, { immediate: true })

// Content is not kept once the viewer closes.
onBeforeUnmount(() => {
  abort?.abort()
  bytes.value = new Uint8Array()
})

async function download() {
  if (downloading.value || !props.name) return
  downloading.value = true
  try {
    await downloadFile(props.accountId, props.log, props.name, `${props.requestId}-${props.name}`)
  } catch (e) {
    toast(errorMessage(e), 'error')
  } finally {
    downloading.value = false
  }
}

const shownText = computed(() => (view.value === 'binary' ? hexPreview(bytes.value) : formatted.value ?? text.value))
const copyText = computed(() => (view.value === 'binary' ? '' : text.value))
</script>

<template>
  <div class="min-w-0 space-y-2" :data-testid="`request-log-file-view-${name}`">
    <div class="flex flex-wrap items-center gap-2">
      <span class="font-mono text-sm font-medium">{{ name }}</span>
      <SHint inline size="xs">{{ sizeText(size) }}</SHint>
      <span class="flex-1" />
      <SSegmented v-if="view === 'json' || view === 'jsonl' || view === 'sse'" :model-value="raw ? 'raw' : 'formatted'" :options="modeOptions" size="sm" :aria-label="t('ccgateway.logViewer.content.mode')" data-testid="request-log-view-mode" @update:model-value="raw = $event === 'raw'" />
      <SCheckbox v-model="wrap" size="sm">{{ t('ccgateway.logViewer.content.wrap') }}</SCheckbox>
      <SCopyButton :text="copyText" :label="t('ccgateway.logViewer.content.copy')" :disabled="!copyText" />
      <SButton size="sm" icon="download" :loading="downloading" data-testid="request-log-download" @click="download">{{ t('ccgateway.logViewer.content.download') }}</SButton>
    </div>
    <SAlert v-if="error" tone="danger">{{ error }}</SAlert>
    <div v-else-if="loading && !bytes.length" class="flex justify-center py-10"><SSpinner /></div>
    <SEmpty v-else-if="!bytes.length" size="sm" :text="t('ccgateway.logViewer.content.empty')" />
    <template v-else>
      <SHint v-if="view === 'json' && !raw && formatted === null" size="xs">{{ complete ? t('ccgateway.logViewer.content.tooLarge') : t('ccgateway.logViewer.content.partialJSON') }}</SHint>
      <SHint v-if="view === 'binary'" size="xs">{{ t('ccgateway.logViewer.content.binary') }}</SHint>
      <SHint v-if="blocksCut" size="xs">{{ t('ccgateway.logViewer.content.blocksCut', { n: BLOCK_LIMIT, total: allBlocks?.length }) }}</SHint>
      <div v-if="blocks" class="max-h-[60vh] space-y-1.5 overflow-auto" data-testid="request-log-blocks">
        <details v-for="(b, i) in blocks" :key="i" class="rounded-md border border-line" :open="blocks.length <= 20">
          <summary class="cursor-pointer select-none bg-surface-2 px-2 py-1 font-mono text-xs">{{ b.title }}</summary>
          <SCode class="!m-0 !rounded-none !border-0 text-xs" :wrap="wrap" :text="b.body" />
        </details>
      </div>
      <SCode v-else class="max-h-[60vh] overflow-auto text-xs" :wrap="wrap" :text="shownText" data-testid="request-log-text" />
      <div v-if="!complete" class="flex justify-center">
        <SButton size="sm" :loading="loading" data-testid="request-log-more" @click="load(bytes.length)">
          {{ t('ccgateway.logViewer.content.more', { loaded: sizeText(bytes.length), total: sizeText(size) }) }}
        </SButton>
      </div>
    </template>
  </div>
</template>
