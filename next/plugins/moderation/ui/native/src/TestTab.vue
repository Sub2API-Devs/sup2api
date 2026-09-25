<script setup lang="ts">
import { computed, ref } from 'vue'
import { SBadge, SButton, SCard, SEmpty, SIcon } from '@sub2api/ui'
import { isApiError } from '@sub2api/host'
import VerdictBadge from './VerdictBadge.vue'
import CategoryChips from './CategoryChips.vue'
import {
  canOpenSettings,
  enumLabel,
  errorMessage,
  openSettings,
  runTest,
  severityTone,
  useModHost,
  type ChatMessage,
  type ChatToolCall,
  type TestResult
} from './host'

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
        <textarea
          v-model="text"
          class="input mod-textarea"
          rows="8"
          :placeholder="t('test.placeholder')"
          @keydown="onKey"
        />
        <div class="mod-test-actions">
          <span class="muted mod-small">{{ t('test.samples') }}：</span>
          <button v-for="s in samples" :key="s" type="button" class="btn btn-ghost btn-sm" @click="useSample(s)">{{ t(`test.sample.${s}`) }}</button>
          <SButton variant="primary" class="mod-ml-auto" :loading="running" :disabled="!text.trim()" @click="run">
            <SIcon v-if="!running" name="play" class="mod-icon" />{{ running ? t('test.running') : t('test.run') }}
          </SButton>
        </div>
      </SCard>

      <SCard :title="t('test.result')">
        <div v-if="notConfigured" class="mod-callout mod-callout-flat">
          <SIcon name="warning" class="mod-callout-icon" />
          <p class="mod-callout-text">{{ t('test.notConfigured') }}</p>
          <SButton v-if="canOpenSettings()" variant="primary" size="sm" @click="openSettings">
            <SIcon name="settings" class="mod-icon" />{{ t('settings') }}
          </SButton>
        </div>
        <p v-else-if="failure" class="mod-alert mod-alert-danger mod-mb-0">{{ failure }}</p>
        <SEmpty v-else-if="!result" :text="running ? t('test.running') : t('test.empty')" icon="eyeglass" />
        <div v-else class="mod-verdict">
          <div class="mod-verdict-head">
            <VerdictBadge :verdict="result.verdict" />
            <SBadge v-if="result.severity" :tone="severityTone(result.severity)">{{ t('test.severity') }}: {{ enumLabel('severity', result.severity) }}</SBadge>
          </div>
          <dl class="kv">
            <dt>{{ t('test.categories') }}</dt>
            <dd><CategoryChips :categories="result.categories" wrap /></dd>
            <dt>{{ t('test.reason') }}</dt>
            <dd>{{ result.reason || '—' }}</dd>
            <template v-if="result.error">
              <dt>{{ t('test.error') }}</dt>
              <dd class="mod-text-danger mod-prewrap">{{ result.error }}</dd>
            </template>
            <dt>{{ t('test.latency') }}</dt>
            <dd class="mod-num">{{ t('ms', { n: num(result.latency_ms) }) }}</dd>
            <dt>{{ t('test.turns') }}</dt>
            <dd class="mod-num">{{ num(result.turns) }}</dd>
            <dt>{{ t('test.tokens') }}</dt>
            <dd class="mod-num">{{ t('test.tokensValue', { p: num(result.usage?.prompt_tokens), c: num(result.usage?.completion_tokens) }) }}</dd>
          </dl>
        </div>
      </SCard>
    </div>

    <SCard v-if="result" :title="t('test.transcript')" :subtitle="t('test.transcriptHint')" class="mod-section">
      <SEmpty v-if="!transcript.length" :text="t('test.noTranscript')" />
      <ol v-else class="mod-chat">
        <li v-for="(m, i) in transcript" :key="i" class="mod-msg" :class="`mod-msg-${m.role}`">
          <div class="mod-msg-head">
            <span class="mod-msg-role">{{ roleLabel(m.role) }}</span>
            <span class="muted mod-small">#{{ i + 1 }}</span>
            <code v-if="m.tool_call_id" class="mod-code">{{ t('test.toolCallId') }}: {{ m.tool_call_id }}</code>
          </div>
          <details v-if="m.role === 'system'" class="mod-msg-details">
            <summary class="link mod-small">{{ t('test.showSystem') }}</summary>
            <pre class="mod-msg-body">{{ contentText(m) }}</pre>
          </details>
          <template v-else>
            <pre v-if="contentText(m)" class="mod-msg-body">{{ contentText(m) }}</pre>
            <p v-else-if="!m.tool_calls?.length" class="muted mod-small">{{ t('test.emptyContent') }}</p>
          </template>
          <div v-for="(tc, j) in m.tool_calls || []" :key="tc.id || j" class="mod-tool">
            <div class="mod-tool-head">
              <SIcon name="code" class="mod-icon" />
              <span>{{ t('test.toolCall') }}</span>
              <code class="mod-code mod-code-plain">{{ tc.function?.name || '?' }}</code>
              <code v-if="tc.id" class="mod-code">{{ tc.id }}</code>
            </div>
            <pre class="code-block mod-tool-args">{{ prettyArgs(tc) }}</pre>
          </div>
        </li>
      </ol>
    </SCard>
  </div>
</template>
