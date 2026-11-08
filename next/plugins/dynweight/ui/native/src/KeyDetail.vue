<script setup lang="ts">
import { computed } from 'vue'
import { SIcon, SLink } from '@sub2api/ui'
import { configRoute, formatMs, successRate, useDwHost, weightOf, type KeyStatus, type ThresholdCount } from './host'

// The evaluation detail of a key (new-api's dynamic weight hover section),
// as label · value pairs: weight, floor and the configuration in force,
// success rates, the open window, the last evaluated window with its
// threshold counts, the last change and the next evaluation; beside them
// (below in a narrow container such as the account detail) each rule in a mini
// table: its trigger (M of N windows), the window hits, this window's
// verdict and samples. A missing climb item is one line linking to the
// configuration.
const props = defineProps<{ row: KeyStatus }>()
const host = useDwHost()
const t = host.t

const rate = successRate
const counts = (items: ThresholdCount[], samples: number) => items.map(x => `≥${formatMs(x.ms)} ${x.count}/${samples}`).join(' · ')
const time = (unix: number) => (unix ? host.i18n.formatDateTime(unix * 1000) : '—')

/** A rule's bitmap padded to its N windows: hit, miss, or not judged yet (oldest first). */
const bits = (bitmap: string, periods: number) => [
  ...Array<string>(Math.max(periods - bitmap.length, 0)).fill(''),
  ...bitmap.slice(-periods)
]

const cur = computed(() => props.row.current)
const judged = computed(() => !!props.row.eval_window && props.row.adjusting)
</script>

<template>
  <div class="dw-acct-detail">
    <div v-if="row.adjusting && row.no_climb_strategy" class="dw-acct-noclimb">
      <SIcon name="warning" />
      <span>{{ t('acct.detail.noClimb') }}</span>
      <SLink :to="configRoute()">{{ t('acct.detail.toConfig') }}</SLink>
    </div>
    <div class="dw-acct-detail-body">
      <dl class="dw-acct-pairs">
        <div>
          <dt>{{ t('detail.weight') }}</dt>
          <dd class="dw-num">
            {{ weightOf(row.effective) }} / {{ row.base
            }}<template v-if="row.weight_min > 0"> · {{ t('detail.floor', { n: row.weight_min }) }}</template> ·
            {{ t(row.group_configured ? 'acct.table.group' : 'acct.table.global') }}
          </dd>
        </div>
        <div>
          <dt>{{ t('detail.successRate') }}</dt>
          <dd class="dw-num">
            <template v-if="row.recent.windows">{{
              t('detail.recent', {
                n: row.recent.windows,
                rate: rate(row.recent.total, row.recent.fail),
                ok: row.recent.total - row.recent.fail,
                total: row.recent.total
              })
            }}</template>
            <template v-else>—</template>
          </dd>
        </div>
        <div>
          <dt>{{ t('detail.current', { s: cur.elapsed_seconds }) }}</dt>
          <dd class="dw-num">
            {{
              t('detail.currentCounts', {
                total: cur.total,
                stream: cur.stream_total,
                fail: cur.fail,
                streamFail: cur.stream_fail,
                rate: rate(cur.total, cur.fail)
              })
            }}
          </dd>
        </div>
        <div>
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
        </div>
        <div v-if="row.eval_window && row.thresholds.length">
          <dt>{{ t('metric.ttfb') }}</dt>
          <dd class="dw-num">{{ counts(row.thresholds, row.ttfb_samples) }}</dd>
        </div>
        <div v-if="row.eval_window && row.latency_thresholds.length">
          <dt>{{ t('metric.latency') }}</dt>
          <dd class="dw-num">
            {{ counts(row.latency_thresholds, row.latency_samples) }}
          </dd>
        </div>
        <div>
          <dt>{{ t('detail.lastChange') }}</dt>
          <dd>
            {{ row.last_change ? `${t(`kind.${row.last_change}`)} · ${time(row.changed_at)}` : '—' }}
          </dd>
        </div>
        <div>
          <dt>{{ t('detail.nextEval') }}</dt>
          <dd>{{ row.adjusting ? time(row.next_eval_at) : '—' }}</dd>
        </div>
      </dl>

      <div v-if="row.rules.length" class="dw-acct-rules">
        <table class="dw-acct-mini">
          <thead>
            <tr>
              <th>{{ t('acct.detail.rules') }}</th>
              <th>{{ t('acct.detail.trigger') }}</th>
              <th :title="t('detail.bitmap')">
                {{ t('acct.detail.windows') }}
              </th>
              <th>{{ t('acct.detail.current') }}</th>
              <th>{{ t('acct.detail.samples') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in row.rules" :key="r.name">
              <td class="dw-acct-ellipsis" :title="r.name">
                {{ r.name }}<span v-if="r.scope !== 'all'" class="dw-acct-muted"> · {{ t(`scope.${r.scope}`) }}</span>
              </td>
              <td class="dw-num">
                {{ t('acct.detail.mOfN', { m: r.hit_periods, n: r.periods }) }}
              </td>
              <td>
                <span class="dw-bits" :title="t('detail.bitmap')">
                  <i
                    v-for="(b, j) in bits(r.bitmap, r.periods)"
                    :key="j"
                    :class="b === '1' ? 'dw-bit-hit' : b === '0' ? 'dw-bit-miss' : ''"
                  />
                </span>
              </td>
              <td>
                <template v-if="judged">
                  <span :class="r.fired ? 'dw-acct-danger' : r.hit ? 'dw-acct-degrading' : 'dw-acct-muted'">
                    {{
                      r.fired ? t('detail.fired') : t(r.unjudged ? 'acct.detail.unjudged' : r.hit ? 'acct.detail.hit' : 'acct.detail.miss')
                    }}
                  </span>
                </template>
                <template v-else>—</template>
              </td>
              <td class="dw-num">
                {{
                  !judged || r.no_samples
                    ? '—'
                    : r.lookback > 1
                      ? t('acct.detail.samplesN', { n: r.samples, lookback: r.lookback })
                      : r.samples
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
