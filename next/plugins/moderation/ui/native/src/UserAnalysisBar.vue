<script setup lang="ts">
import { computed, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SBadge, SButton, SHint } from '@sub2api/ui'
import { dt, enumLabel, num } from './format'
import { analyzeWatch, canManage, createWatch, deleteWatch, errorMessage, toastError, updateWatch, useModHost } from './host'
import { suggestionTone, trendTone } from './tones'
import type { Suggestion, UserDetail, WatchLevel } from './types'

// The analysis state of a user: queued / running, progress towards the next
// automatic analysis, the latest conclusion, "重新分析" and "按 AI 建议执行"
// (new-api analysis-card), which applies the latest successful analysis'
// suggestion by hand, linked to it by analysis_id. Emits changed after an
// action so the drawer reloads the user.
const props = defineProps<{ detail: UserDetail; state: 'idle' | 'pending' | 'running' }>()
const emit = defineEmits<{ (e: 'changed'): void }>()
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())
const entry = computed(() => props.detail.watch)
const latest = computed(() => props.detail.latest_analysis)

const analyzing = ref(false)
async function analyze() {
  analyzing.value = true
  try {
    await analyzeWatch(props.detail.user_id)
    host.toast(t('watch.analyzeQueued'), 'success')
  } catch (e) {
    const code = isApiError(e) ? (e.status === 404 ? 'not_found' : e.code) : ''
    const known: Record<string, [string, 'warning' | 'info']> = {
      no_analysis_channel: ['watch.noAnalysisChannel', 'warning'],
      analysis_pending: ['watch.analysisPending', 'info'],
      not_found: ['watch.notWatched', 'warning']
    }
    const [key, tone] = known[code] ?? []
    host.toast(key ? t(key) : errorMessage(e, t('actionFailed')), tone ?? 'error')
  } finally {
    analyzing.value = false
  }
  emit('changed')
}

const SUGGESTED_LEVEL: Record<Suggestion, WatchLevel | null> = { block: 'enforce', observe: 'observe', release: null }
/**
 * The latest analysis finished but was not applied (status ok, error stale,
 * §72.13.4): the entry changed meanwhile. It is shown as stale and offers no
 * "按 AI 建议执行". A stale or failed latest analysis shows the entry's trend
 * (that of the last applied analysis), as the watch list row does.
 */
const stale = computed(() => latest.value?.error === 'stale')
const trend = computed(() => {
  const a = latest.value
  return a?.status === 'ok' && !stale.value ? a.trend || '' : entry.value?.latest_trend || ''
})
const suggestion = computed(() => {
  const d = props.detail
  const a = latest.value
  if (!manage.value || d.staff || d.exempt || stale.value || a?.status !== 'ok' || !a.suggestion) return null
  const level = SUGGESTED_LEVEL[a.suggestion]
  return level === (d.watch?.level ?? null) ? null : { key: a.suggestion, level, analysisId: a.id }
})
const applying = ref(false)
async function applySuggestion() {
  const s = suggestion.value
  if (!s) return
  const ok = await host.confirm({ message: t('watch.applyConfirm', { suggestion: enumLabel('suggestion', s.key) }), confirmText: t('watch.apply') })
  if (!ok) return
  const id = props.detail.user_id
  const link = { analysis_id: s.analysisId, reason: t('watch.applyReason', { id: s.analysisId }) }
  applying.value = true
  try {
    if (!s.level) await deleteWatch(id, link)
    else if (entry.value) await updateWatch(id, { level: s.level, ...link })
    else await createWatch({ user_id: id, level: s.level, ...link })
    host.toast(t('watch.saved'), 'success')
    emit('changed')
  } catch (e) {
    toastError(e)
  } finally {
    applying.value = false
  }
}
</script>

<template>
  <div class="mod-analysis-state">
    <span class="mod-cost-label">{{ t('watch.analysisState') }}</span>
    <SBadge v-if="state !== 'idle'" :tone="state === 'running' ? 'info' : 'warning'" dot>{{ enumLabel('analysisState', state) }}</SBadge>
    <SHint v-if="state !== 'idle' && entry?.analysis_requested_at" inline size="xs">
      {{ t('watch.queuedAt', { time: dt(entry.analysis_requested_at) }) }}<template v-if="entry.analysis_source"> · {{ enumLabel('source', entry.analysis_source) }}</template>
    </SHint>
    <SHint v-else-if="entry && detail.analysis.every" inline size="xs">
      {{ t('watch.untilNext', { n: num(detail.analysis.violations_since_analysis), every: num(detail.analysis.every) }) }}
    </SHint>
    <template v-if="latest">
      <span class="mod-sub">{{ t('watch.latest') }}</span>
      <SBadge v-if="latest.status !== 'ok'" :tone="latest.status === 'failed' ? 'danger' : 'warning'">{{ enumLabel('analysisStatus', latest.status) }}</SBadge>
      <SBadge v-else-if="stale" tone="warning" :title="enumLabel('analysisErr', 'stale')">{{ enumLabel('analysisStatus', 'stale') }}</SBadge>
      <SBadge v-if="trend" :tone="trendTone(trend)">{{ enumLabel('trend', trend) }}</SBadge>
      <SBadge v-if="latest.suggestion && !stale" :tone="suggestionTone(latest.suggestion)">{{ t('analysis.suggestion') }}: {{ enumLabel('suggestion', latest.suggestion) }}</SBadge>
      <SHint inline size="xs">{{ dt(latest.created_at) }}<template v-if="stale"> · {{ enumLabel('analysisErr', 'stale') }}</template></SHint>
    </template>
    <SHint v-else-if="state === 'idle'" inline size="xs">{{ t('watch.neverAnalyzed') }}</SHint>
    <span class="mod-ml-auto mod-inline mod-gap">
      <SButton v-if="suggestion" size="sm" :variant="suggestion.key === 'block' ? 'danger' : 'secondary'" :loading="applying" @click="applySuggestion">
        {{ t('watch.applySuggestion', { suggestion: enumLabel('suggestion', suggestion.key) }) }}
      </SButton>
      <SButton v-if="manage && entry" size="sm" variant="primary" icon="refresh" :loading="analyzing" :disabled="state !== 'idle'" @click="analyze">{{ t('watch.analyze') }}</SButton>
    </span>
  </div>
</template>
