<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SField, SInput, SKeyValue, STextarea } from '@sub2api/ui'
import { errorMessage } from '@/utils/errors'
import type { Override } from './model'

// Dry run: the server applies the draft to a sample request with the same
// engine the gateway uses (POST /accounts/param-override/preview) and shows
// the body and headers that would go upstream, or the error it would return.
const props = defineProps<{ override: Override | null; model: string }>()
const { t } = useI18n()
const P = 'accounts.paramOverride.preview'

interface PreviewResult {
  body: unknown
  set_headers: Record<string, string>
  delete_headers: string[]
  return_error: { status: number; code: string; message: string; skip_retry: boolean } | null
}

const model = ref(props.model)
const headers = ref<Record<string, string>>({})
const sample = ref(
  JSON.stringify(
    { model: props.model, max_tokens: 1024, temperature: 1, top_p: 0.9, messages: [{ role: 'user', content: 'Hello' }] },
    null,
    2
  )
)
const running = ref(false)
const failure = ref('')
const result = ref<PreviewResult | null>(null)

const sampleError = computed(() => {
  try {
    const v = JSON.parse(sample.value)
    return v && typeof v === 'object' && !Array.isArray(v) ? '' : t(`${P}.notObject`)
  } catch (e) {
    return (e as Error).message
  }
})
const headerRows = computed(() => Object.entries(result.value?.set_headers ?? {}))

async function run() {
  if (sampleError.value) return
  running.value = true
  failure.value = ''
  try {
    result.value = await api.post<PreviewResult>('/accounts/param-override/preview', {
      param_override: props.override,
      body: JSON.parse(sample.value),
      model: model.value.trim(),
      headers: headers.value
    })
  } catch (e) {
    result.value = null
    failure.value = errorMessage(e)
  } finally {
    running.value = false
  }
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="po-preview">
    <div class="space-y-3">
      <SField :label="t(`${P}.model`)" :hint="t(`${P}.modelHint`)">
        <SInput v-model="model" size="sm" mono />
      </SField>
      <SField :label="t(`${P}.body`)" :error="sampleError">
        <STextarea v-model="sample" size="sm" mono :rows="12" data-testid="po-preview-body" />
      </SField>
      <SField :label="t(`${P}.headers`)">
        <SKeyValue
          v-model="headers"
          size="sm"
          mono
          key-placeholder="anthropic-beta"
          value-placeholder="context-1m-2025-08-07"
          :add-label="t(`${P}.addHeader`)"
        />
      </SField>
      <SButton
        variant="primary"
        size="sm"
        icon="play"
        :loading="running"
        :disabled="!!sampleError"
        data-testid="po-preview-run"
        @click="run"
        >{{ t(`${P}.run`) }}</SButton
      >
    </div>

    <div class="min-w-0 space-y-3">
      <SAlert v-if="failure" tone="danger" dense>{{ failure }}</SAlert>
      <p v-else-if="!result" class="rounded-xl border border-dashed border-line p-6 text-center text-sm text-fg-muted">
        {{ t(`${P}.empty`) }}
      </p>
      <template v-else>
        <SAlert v-if="result.return_error" tone="warning" dense data-testid="po-preview-error">
          {{ t(`${P}.returns`, { status: result.return_error.status, message: result.return_error.message }) }}
          <span class="text-fg-muted">· {{ result.return_error.skip_retry ? t(`${P}.noRetry`) : t(`${P}.retry`) }}</span>
        </SAlert>
        <template v-else>
          <SField :label="t(`${P}.resultHeaders`)">
            <div class="rounded-lg border border-line px-3 py-2 font-mono text-xs" data-testid="po-preview-headers">
              <div v-for="[k, v] in headerRows" :key="k" class="break-all">
                <span class="text-success-600 dark:text-success-400">+ {{ k }}:</span> {{ v }}
              </div>
              <div v-for="k in result.delete_headers" :key="k" class="text-danger-600 dark:text-danger-400">− {{ k }}</div>
              <div v-if="!headerRows.length && !result.delete_headers.length" class="font-sans text-fg-muted">
                {{ t(`${P}.noHeaders`) }}
              </div>
            </div>
          </SField>
          <SField :label="t(`${P}.resultBody`)">
            <pre
              class="max-h-96 overflow-auto rounded-lg border border-line bg-surface-2 p-3 font-mono text-xs"
              data-testid="po-preview-result"
              >{{ JSON.stringify(result.body, null, 2) }}</pre>
          </SField>
        </template>
      </template>
    </div>
  </div>
</template>
