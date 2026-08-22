<template>
  <BaseDialog
    :show="show"
    :title="t('admin.workers.testConnection')"
    width="normal"
    @close="handleClose"
  >
    <div class="space-y-4">
      <div
        v-if="worker"
        class="flex items-center justify-between rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-3 dark:border-dark-500 dark:from-dark-700 dark:to-dark-600"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600"
          >
            <Icon name="play" size="md" class="text-white" :stroke-width="2" />
          </div>
          <div>
            <div class="font-semibold text-gray-900 dark:text-gray-100">{{ worker.name }}</div>
            <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span
                class="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium uppercase dark:bg-dark-500"
              >
                {{ t('admin.workers.workerKind') }}
              </span>
              <span class="max-w-[220px] truncate font-mono" :title="worker.remote_worker_id">
                {{ worker.remote_worker_id }}
              </span>
            </div>
          </div>
        </div>
        <span
          :class="[
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            statusBadgeClass
          ]"
        >
          {{ statusLabel }}
        </span>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('admin.workers.selectTestItem') }}
        </label>
        <Select
          v-model="selectedTest"
          :options="testOptions"
          :disabled="status === 'connecting'"
        />
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ t('admin.workers.heartbeatProbeHint') }}
        </p>
      </div>

      <div class="group relative">
        <div
          ref="terminalRef"
          class="max-h-[240px] min-h-[120px] overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 p-4 font-mono text-sm dark:border-gray-800 dark:bg-black"
        >
          <div v-if="status === 'idle'" class="flex items-center gap-2 text-gray-500">
            <Icon name="play" size="sm" :stroke-width="2" />
            <span>{{ t('admin.workers.readyToTest') }}</span>
          </div>
          <div v-else-if="status === 'connecting'" class="flex items-center gap-2 text-yellow-400">
            <Icon name="refresh" size="sm" class="animate-spin" :stroke-width="2" />
            <span>{{ t('admin.workers.connectingHeartbeat') }}</span>
          </div>

          <div v-for="(line, index) in outputLines" :key="index" :class="line.class">
            {{ line.text }}
          </div>

          <div
            v-if="status === 'success'"
            class="mt-3 flex items-center gap-2 border-t border-gray-700 pt-3 text-green-400"
          >
            <Icon name="check" size="sm" :stroke-width="2" />
            <span>{{ t('admin.workers.testCompleted') }}</span>
          </div>
          <div
            v-else-if="status === 'error'"
            class="mt-3 flex items-center gap-2 border-t border-gray-700 pt-3 text-red-400"
          >
            <Icon name="x" size="sm" :stroke-width="2" />
            <span>{{ errorMessage || t('admin.workers.testFailed') }}</span>
          </div>
        </div>

        <button
          v-if="outputLines.length > 0"
          class="absolute right-2 top-2 rounded-lg bg-gray-800/80 p-1.5 text-gray-400 opacity-0 transition-all hover:bg-gray-700 hover:text-white group-hover:opacity-100"
          :title="t('admin.workers.copyOutput')"
          @click="copyOutput"
        >
          <Icon name="link" size="sm" :stroke-width="2" />
        </button>
      </div>

      <div class="flex items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400">
        <span class="flex items-center gap-1">
          <Icon name="grid" size="sm" :stroke-width="2" />
          {{ t('admin.workers.testItem') }}
        </span>
        <span class="flex items-center gap-1">
          <Icon name="chat" size="sm" :stroke-width="2" />
          {{ t('admin.workers.heartbeatTestMode') }}
        </span>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-300 dark:hover:bg-dark-500"
          @click="handleClose"
        >
          {{ t('common.close') }}
        </button>
        <button
          data-testid="worker-test-start"
          :disabled="!canStartTest"
          :class="[
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            !canStartTest
              ? 'cursor-not-allowed bg-primary-400 text-white'
              : status === 'success'
                ? 'bg-green-500 text-white hover:bg-green-600'
                : status === 'error'
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-primary-500 text-white hover:bg-primary-600'
          ]"
          @click="startTest"
        >
          <Icon
            v-if="status === 'connecting'"
            name="refresh"
            size="sm"
            class="animate-spin"
            :stroke-width="2"
          />
          <Icon v-else-if="status === 'idle'" name="play" size="sm" :stroke-width="2" />
          <Icon v-else name="refresh" size="sm" :stroke-width="2" />
          <span>
            {{
              status === 'connecting'
                ? t('admin.workers.testing')
                : status === 'idle'
                  ? t('admin.workers.startTest')
                  : t('admin.workers.retry')
            }}
          </span>
        </button>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI, type Worker, type WorkerIdentity } from '@/api/admin'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Select from '@/components/common/Select.vue'
import { Icon } from '@/components/icons'
import { useClipboard } from '@/composables/useClipboard'

interface OutputLine {
  text: string
  class: string
}

const props = defineProps<{
  show: boolean
  worker: Worker | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'completed'): void
}>()

const { t } = useI18n()
const { copyToClipboard } = useClipboard()

const terminalRef = ref<HTMLElement | null>(null)
const status = ref<'idle' | 'connecting' | 'success' | 'error'>('idle')
const outputLines = ref<OutputLine[]>([])
const errorMessage = ref('')
const selectedTest = ref('heartbeat')
let abortController: AbortController | null = null
let requestGeneration = 0

const testOptions = computed(() => [
  { value: 'heartbeat', label: t('admin.workers.heartbeatProbeLabel') }
])

const canStartTest = computed(() => Boolean(props.worker) && status.value !== 'connecting')

const statusLabel = computed(() => {
  if (!props.worker) return ''
  if (!props.worker.enabled) return t('admin.workers.disabled')
  return t(`admin.workers.status.${props.worker.status}`, props.worker.status)
})

const statusBadgeClass = computed(() => {
  if (!props.worker?.enabled) return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  if (['ready', 'connected'].includes(props.worker.status)) {
    return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
  }
  if (props.worker.status === 'unready') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
  }
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
})

watch(
  () => props.show,
  (open) => {
    if (open) {
      resetState()
      return
    }
    abortRequest()
  }
)

function resetState() {
  status.value = 'idle'
  outputLines.value = []
  errorMessage.value = ''
  selectedTest.value = 'heartbeat'
}

function handleClose() {
  abortRequest()
  emit('close')
}

function abortRequest() {
  requestGeneration += 1
  if (!abortController) return
  const controller = abortController
  abortController = null
  controller.abort()
}

function addLine(text: string, className = 'text-gray-300') {
  outputLines.value.push({ text, class: className })
  void scrollToBottom()
}

async function scrollToBottom() {
  await nextTick()
  if (terminalRef.value) {
    terminalRef.value.scrollTop = terminalRef.value.scrollHeight
  }
}

function formatValue(value: unknown): string {
  if (value == null || value === '') return '-'
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(', ') : '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function flattenFields(value: unknown, prefix = ''): Array<{ key: string; value: string }> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
      flattenFields(nested, prefix ? `${prefix}.${key}` : key)
    )
  }
  return prefix ? [{ key: prefix, value: formatValue(value) }] : []
}

function printIdentity(identity?: WorkerIdentity) {
  if (!identity) return
  const fields: Array<[string, unknown]> = [
    ['protocol_version', identity.protocol_version],
    ['worker_id', identity.worker_id],
    ['instance_id', identity.instance_id],
    ['version', identity.version],
    ['generation', identity.generation],
    ['capabilities', identity.capabilities]
  ]
  for (const [key, value] of fields) {
    if (value == null || (Array.isArray(value) && value.length === 0)) continue
    addLine(`  ${key}: ${formatValue(value)}`, 'text-gray-400')
  }
}

function printReady(ready?: Record<string, unknown>) {
  if (!ready) return
  for (const field of flattenFields(ready)) {
    addLine(`  ${field.key}: ${field.value}`, 'text-cyan-300')
  }
}

function requestErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return t('common.unknownError')
}

function isCanceled(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'ERR_CANCELED'
}

async function startTest() {
  if (!props.worker || !canStartTest.value) return

  resetState()
  status.value = 'connecting'
  addLine(t('admin.workers.startingHeartbeatForWorker', { name: props.worker.name }), 'text-blue-400')
  addLine(t('admin.workers.testWorkerAddress', { url: props.worker.base_url }), 'text-gray-400')
  addLine(t('admin.workers.testWorkerId', { id: props.worker.remote_worker_id }), 'text-gray-400')
  addLine(
    t('admin.workers.testHeartbeatTimeout', { seconds: props.worker.heartbeat_timeout_seconds || 5 }),
    'text-gray-400'
  )
  addLine('')
  addLine(t('admin.workers.probingIdentity'), 'text-yellow-400')

  abortRequest()
  const generation = requestGeneration
  const controller = new AbortController()
  abortController = controller

  try {
    const result = await adminAPI.workers.testConnection(props.worker.id, { signal: controller.signal })
    if (generation !== requestGeneration) return
    addLine(t('admin.workers.identityVerified'), 'text-green-400')
    printIdentity(result.identity)
    addLine('')
    addLine(t('admin.workers.probingReady'), 'text-yellow-400')
    addLine(t('admin.workers.heartbeatReady'), 'text-green-400')
    printReady(result.ready)
    status.value = 'success'
    emit('completed')
  } catch (error: unknown) {
    if (generation !== requestGeneration) return
    if (isCanceled(error)) {
      status.value = 'idle'
      return
    }
    status.value = 'error'
    const message = requestErrorMessage(error)
    errorMessage.value = message
    addLine(t('admin.workers.errorPrefix', { message }), 'text-red-400')
    emit('completed')
  } finally {
    if (abortController === controller) abortController = null
  }
}

function copyOutput() {
  copyToClipboard(outputLines.value.map((line) => line.text).join('\n'), t('admin.workers.outputCopied'))
}
</script>
