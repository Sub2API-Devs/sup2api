<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SField, SHint, SInput, SModal, SSegmented, SSelect, STextarea } from '@sub2api/ui'
import CategoryChips from './CategoryChips.vue'
import CostBadge from './CostBadge.vue'
import ResultBadge from './ResultBadge.vue'
import TraceView from './TraceView.vue'
import { enumLabel, errorMessage, fetchFlowVersions, severityTone, simulateFlow, useModHost, type Flow, type SimulateBody, type TestResult } from './host'

// Flow simulation (§72.13.5): runs the draft, the published version or an
// older version with the current auditors on a text or a stored record.
// Nothing is recorded, counted or cached; the cost goes to source "simulate".
const props = defineProps<{ open: boolean; flow: Flow | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
const host = useModHost()
const t = host.t

const source = ref<SimulateBody['source']>('draft')
const version = ref<number>(0)
const versions = ref<number[]>([])
const input = ref<'text' | 'event'>('text')
const text = ref('')
const images = ref('')
const eventId = ref('')
const running = ref(false)
const result = ref<TestResult | null>(null)
const failure = ref('')

watch(
  () => [props.open, props.flow?.id] as const,
  async ([open]) => {
    if (!open || !props.flow) return
    result.value = null
    failure.value = ''
    source.value = props.flow.dirty || !props.flow.version ? 'draft' : 'published'
    versions.value = []
    try {
      const r = await fetchFlowVersions(props.flow.id)
      versions.value = (r.items || []).map((x) => x.version)
      version.value = versions.value[0] || 0
    } catch {
      /* only the "a version" choice needs the list */
    }
  },
  { immediate: true }
)

const sourceOptions = computed(() => [
  { value: 'draft', label: t('flows.simSourceDraft') },
  { value: 'published', label: t('flows.simSourcePublished'), disabled: !props.flow?.version },
  { value: 'version', label: t('flows.simSourceVersion'), disabled: !versions.value.length }
])
const versionOptions = computed(() => versions.value.map((v) => ({ value: v, label: `v${v}` })))
const inputOptions = computed(() => [
  { value: 'text', label: t('flows.simInputText') },
  { value: 'event', label: t('flows.simInputEvent') }
])

async function run() {
  const f = props.flow
  if (!f) return
  const body: SimulateBody = { source: source.value }
  if (source.value === 'version') body.version = Number(version.value)
  if (input.value === 'event') {
    const id = Number(eventId.value.trim())
    if (!Number.isSafeInteger(id) || id <= 0) {
      failure.value = t('flows.simRequired')
      return
    }
    body.event_id = id
  } else {
    const imgs = images.value.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!text.value.trim() && !imgs.length) {
      failure.value = t('flows.simRequired')
      return
    }
    body.text = text.value
    if (imgs.length) body.images = imgs
  }
  running.value = true
  failure.value = ''
  result.value = null
  try {
    result.value = await simulateFlow(f.id, body)
  } catch (e) {
    failure.value = isApiError(e) && e.code === 'no_text' ? t('flows.noText') : errorMessage(e, t('test.failed'))
  } finally {
    running.value = false
  }
}
</script>

<template>
  <SModal :open="open" :title="t('flows.simulateTitle', { name: flow?.name || '' })" width="xl" @update:open="emit('update:open', $event)">
    <div class="mod-form">
      <SHint size="xs">{{ t('flows.simulateHint') }}</SHint>
      <div class="mod-form-row">
        <SField :label="t('flows.simSource')" size="sm">
          <SSegmented v-model="source" size="sm" :options="sourceOptions" />
        </SField>
        <SField v-if="source === 'version'" :label="t('flows.versionNo')" size="sm">
          <SSelect v-model="version" :options="versionOptions" size="sm" />
        </SField>
        <SField :label="t('flows.simInput')" size="sm">
          <SSegmented v-model="input" size="sm" :options="inputOptions" />
        </SField>
      </div>
      <template v-if="input === 'text'">
        <STextarea v-model="text" :rows="5" :placeholder="t('test.placeholder')" :aria-label="t('flows.simInputText')" />
        <SField :label="t('test.images')" :hint="t('test.imagesHint')" size="sm">
          <STextarea v-model="images" :rows="2" />
        </SField>
      </template>
      <SField v-else :label="t('flows.eventId')" :hint="t('flows.eventIdHint')" size="sm">
        <SInput v-model="eventId" inputmode="numeric" size="sm" />
      </SField>

      <SAlert v-if="failure" tone="danger" dense>{{ failure }}</SAlert>
      <template v-if="result">
        <div class="mod-verdict-head">
          <ResultBadge :result="result.result" />
          <SBadge v-if="result.severity" :tone="severityTone(result.severity)">{{ t('detail.f.severity') }}: {{ enumLabel('severity', result.severity) }}</SBadge>
          <SHint inline size="xs">#{{ result.flow_id }} {{ result.flow_version ? `v${result.flow_version}` : t('flows.simSourceDraft') }}</SHint>
          <CostBadge :cost="result.cost" class="mod-ml-auto" />
        </div>
        <CategoryChips v-if="result.categories?.length" :categories="result.categories" wrap />
        <TraceView :trace="result.trace" />
      </template>
    </div>
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ host.i18n.t('ui.close') }}</SButton>
      <SButton variant="primary" icon="play" :loading="running" @click="run">{{ running ? t('test.running') : t('test.run') }}</SButton>
    </template>
  </SModal>
</template>
