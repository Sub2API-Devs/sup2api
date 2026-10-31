<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SButton, SField, SHint, SModal, STextarea } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { importConfig, toastError, useModHost } from './host'
import type { ImportResult } from './types'

// Imports a new-api moderation export (POST /import, §72.12): the JSON is
// previewed first (counts, keys, validation per item), then imported.
// Imported channels are disabled; the Jev default set is only reported (it
// is a setting the administrator saves).
const open = defineModel<boolean>('open', { required: true })
const host = useModHost()
const t = host.t
const catalog = useCatalog()

const text = ref('')
const preview = ref<ImportResult | null>(null)
/** "channels[0].name: …" lines of the last validation, or the JSON error. */
const problems = ref<string[]>([])
const busy = ref(false)

watch(open, (v) => {
  if (!v) return
  text.value = ''
  preview.value = null
  problems.value = []
})
// a preview is of the text it was made from
watch(text, () => {
  preview.value = null
  problems.value = []
})

function parse(): unknown {
  try {
    return JSON.parse(text.value)
  } catch {
    problems.value = [t('import.invalidJson')]
    return undefined
  }
}

/** Field errors as lines; false when the error has none (toasted instead). */
function showProblems(e: unknown): boolean {
  const fields = isApiError(e) ? Object.entries(e.fields) : []
  problems.value = fields.map(([path, msg]) => `${path}: ${msg}`)
  return fields.length > 0
}

async function run(dryRun: boolean) {
  const data = parse()
  if (data === undefined) return
  busy.value = true
  problems.value = []
  try {
    const r = await importConfig(data, dryRun)
    if (dryRun) {
      preview.value = r
      return
    }
    host.toast(t('import.done', { channels: r.channels, auditors: r.auditors }), 'success')
    open.value = false
    void catalog.refresh(['channels', 'auditors'])
  } catch (e) {
    if (!showProblems(e)) toastError(e)
  } finally {
    busy.value = false
  }
}

const canImport = computed(() => !!preview.value && (preview.value.channels > 0 || preview.value.auditors > 0))
</script>

<template>
  <SModal v-model:open="open" :title="t('import.title')" width="lg">
    <div class="mod-form">
      <SHint>{{ t('import.hint') }}</SHint>
      <SField :label="t('import.data')">
        <STextarea v-model="text" :rows="12" class="mod-mono" placeholder='{"channels": [], "auditors": []}' />
      </SField>
      <SAlert v-if="problems.length" tone="danger" dense>
        <ul class="mod-problems">
          <li v-for="p in problems" :key="p">{{ p }}</li>
        </ul>
      </SAlert>
      <template v-else-if="preview">
        <SAlert :tone="canImport ? 'info' : 'warning'" dense>
          {{ canImport ? t('import.previewText', { channels: preview.channels, keys: preview.keys, auditors: preview.auditors }) : t('import.nothing') }}
        </SAlert>
        <SHint v-if="preview.jev_default_set" size="xs">{{ t('import.jevNote') }}</SHint>
      </template>
    </div>
    <template #footer>
      <SButton @click="open = false">{{ host.i18n.t('ui.cancel') }}</SButton>
      <SButton v-if="!canImport" variant="primary" :loading="busy" :disabled="!text.trim()" @click="run(true)">{{ t('import.preview') }}</SButton>
      <SButton v-else variant="primary" :loading="busy" @click="run(false)">{{ t('import.confirm') }}</SButton>
    </template>
  </SModal>
</template>
