<template>
  <BaseDialog
    :show="show"
    :title="t('admin.accounts.testAccountConnection')"
    width="normal"
    @close="handleClose"
  >
    <div class="space-y-4" data-testid="worker-account-test-modal">
      <div
        v-if="account"
        class="flex items-center justify-between rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-3 dark:border-dark-500 dark:from-dark-700 dark:to-dark-600"
      >
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600">
            <Icon name="play" size="md" class="text-white" :stroke-width="2" />
          </div>
          <div class="min-w-0">
            <div class="truncate font-semibold text-gray-900 dark:text-gray-100">{{ account.name }}</div>
            <div class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span class="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium uppercase dark:bg-dark-500">
                {{ kindLabel }}
              </span>
              <span>{{ t('admin.accounts.account') }}</span>
              <span v-if="worker" class="text-gray-300 dark:text-dark-400">·</span>
              <span v-if="worker" class="inline-flex min-w-0 items-center gap-1 text-primary-700 dark:text-primary-300">
                <Icon name="server" size="xs" :stroke-width="2" />
                <span class="truncate">{{ t('admin.accounts.workerTestOwner', { name: worker.name }) }}</span>
              </span>
            </div>
          </div>
        </div>
        <span
          :class="[
            'ml-3 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
            account.status === 'active'
              ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          ]"
        >
          {{ account.status }}
        </span>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('admin.accounts.selectTestModel') }}
        </label>
        <Select
          v-model="selectedModel"
          :options="modelOptions"
          :disabled="status === 'connecting'"
          :placeholder="t('admin.accounts.selectTestModel')"
          :searchable="modelOptions.length > 5"
          data-testid="worker-test-model"
        />
        <p v-if="modelOptions.length === 0" class="text-xs text-amber-600 dark:text-amber-400">
          {{ t('admin.accounts.workerTestModelUnavailable') }}
        </p>
      </div>

      <div class="group relative">
        <div
          ref="terminalRef"
          class="max-h-[240px] min-h-[150px] overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 p-4 font-mono text-sm dark:border-gray-800 dark:bg-black"
          data-testid="worker-test-output"
        >
          <div v-if="status === 'idle'" class="flex items-center gap-2 text-gray-500">
            <Icon name="play" size="sm" :stroke-width="2" />
            <span>{{ t('admin.accounts.readyToTest') }}</span>
          </div>
          <div v-else-if="status === 'connecting'" class="flex items-center gap-2 text-yellow-400">
            <Icon name="refresh" size="sm" class="animate-spin" :stroke-width="2" />
            <span>{{ t('admin.accounts.connectingToApi') }}</span>
          </div>

          <div v-for="(line, index) in outputLines" :key="index" :class="line.class">
            {{ line.text }}
          </div>

          <div v-if="status === 'success'" class="mt-3 flex items-center gap-2 border-t border-gray-700 pt-3 text-green-400">
            <Icon name="check" size="sm" :stroke-width="2" />
            <span>{{ t('admin.accounts.testCompleted') }}</span>
          </div>
          <div v-else-if="status === 'error'" class="mt-3 flex items-center gap-2 border-t border-gray-700 pt-3 text-red-400">
            <Icon name="x" size="sm" :stroke-width="2" />
            <span>{{ errorMessage }}</span>
          </div>
        </div>

        <button
          v-if="outputLines.length > 0"
          type="button"
          class="absolute right-2 top-2 rounded-lg bg-gray-800/80 p-1.5 text-gray-400 opacity-0 transition-all hover:bg-gray-700 hover:text-white group-hover:opacity-100"
          :title="t('admin.accounts.copyOutput')"
          @click="copyOutput"
        >
          <Icon name="link" size="sm" :stroke-width="2" />
        </button>
      </div>

      <div class="flex items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400">
        <span class="flex items-center gap-1">
          <Icon name="grid" size="sm" :stroke-width="2" />
          {{ t('admin.accounts.testModel') }}
        </span>
        <span class="flex min-w-0 items-center gap-1">
          <Icon name="server" size="sm" :stroke-width="2" />
          <span class="truncate">{{ workerIdentity }}</span>
        </span>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button type="button" class="btn btn-secondary" @click="handleClose">
          {{ t('common.close') }}
        </button>
        <button
          type="button"
          class="btn btn-primary flex items-center gap-2"
          :disabled="!canStart"
          data-testid="start-worker-account-test"
          @click="startTest"
        >
          <Icon v-if="status === 'connecting'" name="refresh" size="sm" class="animate-spin" :stroke-width="2" />
          <Icon v-else-if="status === 'idle'" name="play" size="sm" :stroke-width="2" />
          <Icon v-else name="refresh" size="sm" :stroke-width="2" />
          <span>{{ actionLabel }}</span>
        </button>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api/admin'
import type { Worker, WorkerAccount } from '@/api/admin'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Select from '@/components/common/Select.vue'
import Icon from '@/components/icons/Icon.vue'
import { useClipboard } from '@/composables/useClipboard'
import { extractApiErrorMessage } from '@/utils/apiError'

interface OutputLine {
  text: string
  class: string
}

const props = defineProps<{
  show: boolean
  account: WorkerAccount | null
  worker: Worker | null
  kindLabel: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'tested'): void
}>()

const { t } = useI18n()
const { copyToClipboard } = useClipboard()
const terminalRef = ref<HTMLElement | null>(null)
const selectedModel = ref('')
const status = ref<'idle' | 'connecting' | 'success' | 'error'>('idle')
const outputLines = ref<OutputLine[]>([])
const errorMessage = ref('')
let abortController: AbortController | null = null

const metadataText = (key: string) => {
  const value = props.account?.metadata?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

const modelOptions = computed(() => {
  const values = metadataText('models')
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean)
  const preferred = metadataText('test_model')
  if (preferred) values.unshift(preferred)
  return [...new Set(values)].map((value) => ({ value, label: value }))
})

const workerIdentity = computed(() => {
  if (!props.worker) return t('admin.accounts.workerAccounts')
  return `${props.worker.name} · ${props.worker.remote_worker_id}`
})

const canStart = computed(() => status.value !== 'connecting' && Boolean(props.account && selectedModel.value))
const actionLabel = computed(() => {
  if (status.value === 'connecting') return t('admin.accounts.testing')
  if (status.value === 'idle') return t('admin.accounts.startTest')
  return t('admin.accounts.retry')
})

const resetState = () => {
  status.value = 'idle'
  outputLines.value = []
  errorMessage.value = ''
}

const abortTest = () => {
  abortController?.abort()
  abortController = null
}

watch(
  () => [props.show, props.account?.remote_account_id] as const,
  ([show]) => {
    if (!show) {
      abortTest()
      return
    }
    resetState()
    selectedModel.value = metadataText('test_model') || String(modelOptions.value[0]?.value || '')
  },
  { immediate: true }
)

const addLine = (text: string, className = 'text-gray-300') => {
  outputLines.value.push({ text, class: className })
  void nextTick(() => {
    if (terminalRef.value) terminalRef.value.scrollTop = terminalRef.value.scrollHeight
  })
}

const resultNumber = (result: Record<string, unknown>, key: string) => {
  const value = result[key]
  return typeof value === 'number' ? value : Number(value)
}

const startTest = async () => {
  if (!props.account || !canStart.value) return
  resetState()
  status.value = 'connecting'
  addLine(t('admin.accounts.startingTestForAccount', { name: props.account.name }), 'text-blue-400')
  addLine(t('admin.accounts.workerTestOwnerLine', { worker: workerIdentity.value }), 'text-gray-400')
  addLine(t('admin.accounts.testAccountTypeLabel', { type: props.kindLabel }), 'text-gray-400')
  addLine(t('admin.accounts.usingModel', { model: selectedModel.value }), 'text-cyan-400')
  addLine('', 'text-gray-300')
  addLine(t('admin.accounts.sendingTestMessage'), 'text-gray-400')

  abortTest()
  abortController = new AbortController()
  try {
    const result = await adminAPI.workers.testAccount(
      props.account.worker_id,
      props.account.remote_account_id,
      { model: selectedModel.value },
      { signal: abortController.signal }
    )
    addLine(t('admin.accounts.connectedToApi'), 'text-green-400')
    const statusCode = resultNumber(result, 'status_code')
    const latency = resultNumber(result, 'latency_ms')
    if (Number.isFinite(statusCode) && statusCode > 0) {
      addLine(t('admin.accounts.workerTestHttpStatus', { status: statusCode }), 'text-gray-300')
    }
    if (Number.isFinite(latency) && latency >= 0) {
      addLine(t('admin.accounts.workerTestLatency', { latency }), 'text-gray-300')
    }
    addLine('', 'text-gray-300')
    addLine(t('admin.accounts.response'), 'text-yellow-400')
    const responseText = typeof result.response_text === 'string' ? result.response_text.trim() : ''
    addLine(
      responseText || t('admin.accounts.workerTestEmptyResponse'),
      responseText
        ? 'whitespace-pre-wrap break-words text-green-300'
        : 'text-gray-500'
    )
    status.value = 'success'
    emit('tested')
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      status.value = 'idle'
      return
    }
    const message = extractApiErrorMessage(error, t('admin.accounts.workerAccountTestFailed'))
    errorMessage.value = message
    addLine(t('admin.accounts.errorPrefix', { message }), 'text-red-400')
    status.value = 'error'
  } finally {
    abortController = null
  }
}

const handleClose = () => {
  abortTest()
  emit('close')
}

const copyOutput = () => {
  void copyToClipboard(outputLines.value.map((line) => line.text).join('\n'), t('admin.accounts.outputCopied'))
}
</script>
