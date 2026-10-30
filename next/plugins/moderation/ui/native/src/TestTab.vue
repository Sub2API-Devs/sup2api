<script setup lang="ts">
import { computed, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SEmpty, SField, SGrid, SHint, SSelect, STextarea } from '@sub2api/ui'
import ResultBadge from './ResultBadge.vue'
import CategoryChips from './CategoryChips.vue'
import TraceView from './TraceView.vue'
import CostBadge from './CostBadge.vue'
import { useCatalog } from './catalog'
import { enumLabel, errorMessage, runTest, severityTone, useModHost, type TestResult } from './host'

const emit = defineEmits<{ (e: 'go-tab', tab: string): void }>()

// Playground: POST /test {text, images, flow_id} -> result + per-stage trace.
// Nothing is cached, recorded or counted.
const host = useModHost()
const t = host.t

const text = ref('')
const images = ref('')
const flowId = ref<number>(0)
const running = ref(false)
const result = ref<TestResult | null>(null)
const failure = ref('')
const notConfigured = ref(false)

const catalog = useCatalog()
const flowOptions = computed(() => [
  { value: 0, label: t('test.defaultFlow') },
  ...catalog.state.flows.filter((f) => f.version > 0 && f.enabled).map((f) => ({ value: f.id, label: `${f.name} v${f.version}` }))
])

const samples = ['normal', 'suspicious', 'jailbreak'] as const
function useSample(k: (typeof samples)[number]) {
  text.value = t(`test.sample.${k}Text`)
}

async function run() {
  const imgs = images.value.split('\n').map((s) => s.trim()).filter(Boolean)
  if (!text.value.trim() && !imgs.length) {
    failure.value = t('test.required')
    return
  }
  running.value = true
  failure.value = ''
  notConfigured.value = false
  result.value = null
  try {
    result.value = await runTest(text.value, imgs, flowId.value)
  } catch (e) {
    if (isApiError(e) && e.code === 'not_configured') notConfigured.value = true
    else failure.value = errorMessage(e, t('test.failed'))
  } finally {
    running.value = false
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run()
}
</script>

<template>
  <div>
    <SHint class="mod-hint">{{ t('test.hint') }}</SHint>

    <SGrid template="repeat(auto-fit, minmax(340px, 1fr))" class="mod-test-grid">
      <SCard :title="t('test.title')">
        <div class="mod-form">
          <SField :label="t('test.flow')">
            <SSelect v-model="flowId" :options="flowOptions" />
          </SField>
          <STextarea v-model="text" class="mod-textarea" :rows="8" :placeholder="t('test.placeholder')" :aria-label="t('test.title')" @keydown="onKey" />
          <SField :label="t('test.images')" :hint="t('test.imagesHint')">
            <STextarea v-model="images" :rows="2" />
          </SField>
        </div>
        <div class="mod-test-actions">
          <SHint inline size="xs">{{ t('labelColon', { label: t('test.samples') }) }}</SHint>
          <SButton v-for="s in samples" :key="s" variant="ghost" size="sm" @click="useSample(s)">{{ t(`test.sample.${s}`) }}</SButton>
          <SButton variant="primary" icon="play" class="mod-ml-auto" :loading="running" :disabled="!text.trim() && !images.trim()" @click="run">
            {{ running ? t('test.running') : t('test.run') }}
          </SButton>
        </div>
      </SCard>

      <SCard :title="t('test.result')">
        <SAlert v-if="notConfigured" tone="warning">
          {{ t('test.notConfigured') }}
          <template #actions>
            <SButton variant="primary" size="sm" @click="emit('go-tab', 'flows')">{{ t('tabs.flows') }}</SButton>
          </template>
        </SAlert>
        <SAlert v-else-if="failure" tone="danger">{{ failure }}</SAlert>
        <SEmpty v-else-if="!result" :text="running ? t('test.running') : t('test.empty')" icon="eyeglass" />
        <div v-else class="mod-verdict">
          <div class="mod-verdict-head">
            <ResultBadge :result="result.result" />
            <SBadge v-if="result.severity" :tone="severityTone(result.severity)">{{ t('detail.f.severity') }}: {{ enumLabel('severity', result.severity) }}</SBadge>
            <SHint inline size="xs">#{{ result.flow_id }} v{{ result.flow_version }}</SHint>
            <CostBadge :cost="result.cost" class="mod-ml-auto" />
          </div>
          <CategoryChips :categories="result.categories" wrap />
        </div>
      </SCard>
    </SGrid>

    <SCard v-if="result" :title="t('detail.trace')" class="mod-section">
      <TraceView :trace="result.trace" />
    </SCard>
  </div>
</template>
