<script setup lang="ts">
import { computed, ref } from 'vue'
import { SAlert, SBadge, SButton, SCard, SCode, SDescItem, SDescriptions, SDisclosure, SEmpty, SHint, SIcon, STextarea } from '@sub2api/ui'
import { isApiError } from '@sub2api/host'
import VerdictBadge from './VerdictBadge.vue'
import CategoryChips from './CategoryChips.vue'
import {
  canManageSettings,
  enumLabel,
  errorMessage,
  runTest,
  severityTone,
  useModHost,
  type ChatMessage,
  type ChatToolCall,
  type TestResult
} from './host'

const emit = defineEmits<{ (e: 'go-settings'): void }>()

// Playground: POST /test {text} -> verdict + agent transcript.
const host = useModHost()
const t = host.t
const num = (v: number | undefined | null) => host.i18n.formatNumber(v ?? 0)

const text = ref('')
const running = ref(false)
const result = ref<TestResult | null>(null)
const failure = ref('')
const notConfigured = ref(false)

const samples = ['normal', 'suspicious', 'jailbreak'] as const

function useSample(k: (typeof samples)[number]) {
  text.value = t(`test.sample.${k}Text`)
}

async function run() {
  if (!text.value.trim()) {
    failure.value = t('test.required')
    return
  }
  running.value = true
  failure.value = ''
  notConfigured.value = false
  result.value = null
  try {
    result.value = await runTest(text.value)
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

// ---- transcript rendering

function contentText(m: ChatMessage): string {
  const c = m.content
  if (c === null || c === undefined) return ''
  if (typeof c === 'string') return c
  if (Array.isArray(c)) {
    return c
      .map((p) => (typeof p?.text === 'string' ? p.text : JSON.stringify(p, null, 2)))
      .filter(Boolean)
      .join('\n')
  }
  return JSON.stringify(c, null, 2)
}

/** Pretty-prints tool call arguments (a JSON string per the OpenAI format). */
function prettyArgs(tc: ChatToolCall): string {
  const a = tc.function?.arguments
  if (a === undefined || a === null || a === '') return ''
  if (typeof a !== 'string') return JSON.stringify(a, null, 2)
  try {
    return JSON.stringify(JSON.parse(a), null, 2)
  } catch {
    return a
  }
}

function roleLabel(role: string): string {
  return enumLabel('role', role)
}

const transcript = computed(() => result.value?.transcript || [])
</script>

<template>
  <div class="mod-test">
    <p class="mod-hint">{{ t('test.hint') }}</p>

    <div class="mod-test-grid">
      <SCard :title="t('test.title')">
        <STextarea v-model="text" class="mod-textarea" :rows="8" :placeholder="t('test.placeholder')" :aria-label="t('test.title')" @keydown="onKey" />
        <div class="mod-test-actions">
          <SHint inline size="xs">{{ t('labelColon', { label: t('test.samples') }) }}</SHint>
          <SButton v-for="s in samples" :key="s" variant="ghost" size="sm" @click="useSample(s)">{{ t(`test.sample.${s}`) }}</SButton>
          <SButton variant="primary" icon="play" class="mod-ml-auto" :loading="running" :disabled="!text.trim()" @click="run">
            {{ running ? t('test.running') : t('test.run') }}
          </SButton>
        </div>
      </SCard>

      <SCard :title="t('test.result')">
        <SAlert v-if="notConfigured" tone="warning">
          {{ t('test.notConfigured') }}
          <template v-if="canManageSettings()" #actions>
            <SButton variant="primary" size="sm" icon="settings" @click="emit('go-settings')">{{ t('tabs.settings') }}</SButton>
          </template>
        </SAlert>
        <SAlert v-else-if="failure" tone="danger">{{ failure }}</SAlert>
        <SEmpty v-else-if="!result" :text="running ? t('test.running') : t('test.empty')" icon="eyeglass" />
        <div v-else class="mod-verdict">
          <div class="mod-verdict-head">
            <VerdictBadge :verdict="result.verdict" />
            <SBadge v-if="result.severity" :tone="severityTone(result.severity)">{{ t('test.severity') }}: {{ enumLabel('severity', result.severity) }}</SBadge>
          </div>
          <SDescriptions dense>
            <SDescItem :label="t('test.categories')"><CategoryChips :categories="result.categories" wrap /></SDescItem>
            <SDescItem :label="t('test.reason')" :value="result.reason" />
            <SDescItem v-if="result.error" :label="t('test.error')">
              <span class="mod-text-danger mod-prewrap">{{ result.error }}</span>
            </SDescItem>
            <SDescItem :label="t('test.latency')" :value="t('ms', { n: num(result.latency_ms) })" />
            <SDescItem :label="t('test.turns')" :value="num(result.turns)" />
            <SDescItem :label="t('test.tokens')" :value="t('test.tokensValue', { p: num(result.usage?.prompt_tokens), c: num(result.usage?.completion_tokens) })" />
          </SDescriptions>
        </div>
      </SCard>
    </div>

    <SCard v-if="result" :title="t('test.transcript')" :subtitle="t('test.transcriptHint')" class="mod-section">
      <SEmpty v-if="!transcript.length" :text="t('test.noTranscript')" />
      <ol v-else class="mod-chat">
        <li v-for="(m, i) in transcript" :key="i" class="mod-msg" :class="`mod-msg-${m.role}`">
          <div class="mod-msg-head">
            <span class="mod-msg-role">{{ roleLabel(m.role) }}</span>
            <SHint inline size="xs">#{{ i + 1 }}</SHint>
            <code v-if="m.tool_call_id" class="mod-code">{{ t('test.toolCallId') }}: {{ m.tool_call_id }}</code>
          </div>
          <SDisclosure v-if="m.role === 'system'" :label="t('test.showSystem')">
            <pre class="mod-msg-body">{{ contentText(m) }}</pre>
          </SDisclosure>
          <template v-else>
            <pre v-if="contentText(m)" class="mod-msg-body">{{ contentText(m) }}</pre>
            <SHint v-else-if="!m.tool_calls?.length" size="xs">{{ t('test.emptyContent') }}</SHint>
          </template>
          <div v-for="(tc, j) in m.tool_calls || []" :key="tc.id || j" class="mod-tool">
            <div class="mod-tool-head">
              <SIcon name="code" class="mod-icon" />
              <span>{{ t('test.toolCall') }}</span>
              <code class="mod-code mod-code-plain">{{ tc.function?.name || '?' }}</code>
              <code v-if="tc.id" class="mod-code">{{ tc.id }}</code>
            </div>
            <SCode :text="prettyArgs(tc)" class="mod-tool-args" />
          </div>
        </li>
      </ol>
    </SCard>
  </div>
</template>
