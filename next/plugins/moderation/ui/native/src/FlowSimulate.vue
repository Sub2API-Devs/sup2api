<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SButton, SField, SHint, SInput, SModal, SSegmented, SSelect, STextarea } from '@sub2api/ui'
import ImageInput from './ImageInput.vue'
import TestResultView from './TestResultView.vue'
import TraceView from './TraceView.vue'
import { enumOptions } from './format'
import { fetchFlowVersions, simulateFlow, useModHost } from './host'
import { useAsync } from './useAsync'
import type { Flow, SimulateBody, SimUserState } from './types'

// Flow simulation (§72.13.5): runs the draft, the published version or an
// older version with the current auditors on a text or a stored record.
// The user state picks the timing as a live request would run: unmarked and
// observe-level users after the upstream call, enforce-level users before it
// (a hit is refused). Nothing is recorded, counted or cached; the cost goes
// to source "simulate".
const props = defineProps<{ open: boolean; flow: Flow | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
const host = useModHost()
const t = host.t

const source = ref<SimulateBody['source']>('draft')
const version = ref<number>(0)
const versions = ref<number[]>([])
const userState = ref<SimUserState>('none')
const input = ref<'text' | 'event'>('text')
const text = ref('')
const images = ref<string[]>([])
const eventId = ref('')
const required = ref(false)

/** The request body of the inputs; null when they are missing. */
const body = computed<SimulateBody | null>(() => {
  const b: SimulateBody = { source: source.value, user_state: userState.value }
  if (source.value === 'version') b.version = Number(version.value)
  if (input.value === 'event') {
    const id = Number(eventId.value.trim())
    if (!Number.isSafeInteger(id) || id <= 0) return null
    b.event_id = id
    return b
  }
  if (!text.value.trim() && !images.value.length) return null
  b.text = text.value
  if (images.value.length) b.images = images.value
  return b
})
// Only the latest run shows; opening (another flow) drops the answers still
// pending for the previous one.
const sim = useAsync(() => simulateFlow(props.flow!.id, body.value!), () => t('test.failed'))
const result = sim.data
const running = sim.loading
const failure = computed(() => {
  if (required.value) return t('flows.simRequired')
  return isApiError(sim.failure.value) && sim.failure.value.code === 'no_text' ? t('flows.noText') : sim.error.value
})
let openSeq = 0

watch(
  () => [props.open, props.flow?.id] as const,
  async ([open]) => {
    if (!open || !props.flow) return
    const my = ++openSeq
    sim.reset()
    required.value = false
    source.value = props.flow.dirty || !props.flow.version ? 'draft' : 'published'
    versions.value = []
    try {
      const r = await fetchFlowVersions(props.flow.id)
      if (my !== openSeq) return
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
const userStateOptions = computed(() => enumOptions('flows.simUser', ['none', 'observe', 'enforce']))
const inputOptions = computed(() => [
  { value: 'text', label: t('flows.simInputText') },
  { value: 'event', label: t('flows.simInputEvent') }
])

function run() {
  if (!props.flow) return
  required.value = !body.value
  sim.reset()
  if (body.value) sim.reload()
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
        <SField :label="t('flows.simUserState')" :hint="t(`flows.simUserHint.${userState}`)" size="sm">
          <SSegmented v-model="userState" size="sm" :options="userStateOptions" />
        </SField>
        <SField :label="t('flows.simInput')" size="sm">
          <SSegmented v-model="input" size="sm" :options="inputOptions" />
        </SField>
      </div>
      <template v-if="input === 'text'">
        <ImageInput v-model="images" size="sm">
          <STextarea v-model="text" :rows="5" :placeholder="t('test.placeholder')" :aria-label="t('flows.simInputText')" />
        </ImageInput>
      </template>
      <SField v-else :label="t('flows.eventId')" :hint="t('flows.eventIdHint')" size="sm">
        <SInput v-model="eventId" inputmode="numeric" size="sm" />
      </SField>

      <SAlert v-if="failure" tone="danger" dense>{{ failure }}</SAlert>
      <template v-if="result">
        <TestResultView :result="result" />
        <TraceView :trace="result.trace" />
      </template>
    </div>
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ host.i18n.t('ui.close') }}</SButton>
      <SButton variant="primary" icon="play" :loading="running" @click="run">{{ running ? t('test.running') : t('test.run') }}</SButton>
    </template>
  </SModal>
</template>
