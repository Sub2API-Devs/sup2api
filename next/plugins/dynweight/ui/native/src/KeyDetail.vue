<script setup lang="ts">
import { computed } from 'vue'
import { SAlert, SBadge } from '@sub2api/ui'
import { formatMs, successRate, useDwHost, weightOf, type KeyStatus, type ThresholdCount } from './host'

// The evaluation detail of a key (new-api's dynamic weight hover section):
// weight and floor, where the configuration comes from, success rates, the
// open window, the last evaluated window with its threshold counts, each
// rule's progress towards firing (M of N windows), the last change and the
// next evaluation.
const props = defineProps<{ row: KeyStatus }>()
const host = useDwHost()
const t = host.t

const rate = successRate
const counts = (items: ThresholdCount[], samples: number) => items.map((x) => `≥${formatMs(x.ms)} ${x.count}/${samples}`).join(' · ')
const time = (unix: number) => (unix ? host.i18n.formatDateTime(unix * 1000) : '—')

/** A rule's bitmap padded to its N windows: hit, miss, or not judged yet (oldest first). */
const bits = (bitmap: string, periods: number) => [...Array<string>(Math.max(periods - bitmap.length, 0)).fill(''), ...bitmap.slice(-periods)]

const cur = computed(() => props.row.current)
</script>

<template>
  <div class="dw-detail">
    <SAlert v-if="row.adjusting && row.no_climb_strategy" tone="warning">{{ t('detail.noClimb') }}</SAlert>
    <dl class="dw-detail-grid">
      <dt>{{ t('detail.weight') }}</dt>
      <dd>
        <span class="dw-num">{{ weightOf(row.effective) }} / {{ row.base }}</span>
        <template v-if="row.weight_min > 0"> · {{ t('detail.floor', { n: row.weight_min }) }}</template>
        · {{ t(row.group_configured ? 'detail.groupConfig' : 'detail.globalConfig') }}
      </dd>

      <dt>{{ t('detail.successRate') }}</dt>
      <dd class="dw-num">
        <template v-if="row.recent.windows">{{ t('detail.recent', { n: row.recent.windows, rate: rate(row.recent.total, row.recent.fail), ok: row.recent.total - row.recent.fail, total: row.recent.total }) }} · </template>
        <template v-if="row.eval_window">{{ t('detail.lastRate', { rate: rate(row.total, row.fail), ok: row.total - row.fail, total: row.total }) }}</template>
        <template v-else>—</template>
      </dd>

      <dt>{{ t('detail.current', { s: cur.elapsed_seconds }) }}</dt>
      <dd class="dw-num">
        {{ t('detail.currentCounts', { total: cur.total, stream: cur.stream_total, fail: cur.fail, streamFail: cur.stream_fail, rate: rate(cur.total, cur.fail) }) }}
      </dd>

      <dt>{{ t('detail.last') }}</dt>
      <dd class="dw-num">
        <template v-if="row.eval_window">
          {{ t('detail.lastCounts', { start: time(row.eval_window), total: row.total, fail: row.fail }) }}
          <template v-if="row.lookback > 1"> · {{ t('detail.merged', { n: row.lookback }) }}</template>
          <template v-if="!row.error_evaluable"> · {{ t('detail.notEvaluable') }}</template>
          <template v-if="row.verdict"> · {{ t(`verdict.${row.verdict}`) }}</template>
        </template>
        <template v-else>{{ t('status.notEvaluated') }}</template>
      </dd>

      <template v-if="row.eval_window && row.thresholds.length">
        <dt>{{ t('metric.ttfb') }}</dt>
        <dd class="dw-num">{{ counts(row.thresholds, row.ttfb_samples) }}</dd>
      </template>
      <template v-if="row.eval_window && row.latency_thresholds.length">
        <dt>{{ t('metric.latency') }}</dt>
        <dd class="dw-num">{{ counts(row.latency_thresholds, row.latency_samples) }}</dd>
      </template>

      <template v-for="(r, i) in row.rules" :key="r.name">
        <dt>{{ i + 1 }}. {{ r.name }}</dt>
        <dd class="dw-rule">
          <SBadge v-if="r.scope !== 'all'" size="xs">{{ t(`scope.${r.scope}`) }}</SBadge>
          <span>{{ t('detail.mOfN', { m: r.hit_periods, n: r.periods }) }}</span>
          <span class="dw-bits" :title="t('detail.bitmap')">
            <i v-for="(b, j) in bits(r.bitmap, r.periods)" :key="j" :class="b === '1' ? 'dw-bit-hit' : b === '0' ? 'dw-bit-miss' : ''" />
          </span>
          <template v-if="row.eval_window && row.adjusting">
            <span>{{ t(r.hit ? 'detail.hit' : 'detail.miss') }}</span>
            <span v-if="!r.no_samples" class="dw-sub">{{ t('status.ruleSamples', { n: r.samples, lookback: r.lookback }) }}</span>
            <SBadge v-if="r.fired" tone="danger" size="xs">{{ t('detail.fired') }}</SBadge>
          </template>
        </dd>
      </template>

      <dt>{{ t('detail.lastChange') }}</dt>
      <dd>{{ row.last_change ? `${t(`kind.${row.last_change}`)} · ${time(row.changed_at)}` : '—' }}</dd>
      <dt>{{ t('detail.nextEval') }}</dt>
      <dd>{{ row.adjusting ? time(row.next_eval_at) : '—' }}</dd>
    </dl>
  </div>
</template>
