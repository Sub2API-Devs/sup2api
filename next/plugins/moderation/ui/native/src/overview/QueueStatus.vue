<script setup lang="ts">
import { computed } from 'vue'
import { SGrid, SProgress } from '@sub2api/ui'
import { useModHost } from '../host'
import { useOverviewData } from './useOverview'
import { useFormat } from './format'

// Queues of the node that served the page (status.queue): background
// moderation, pricing and AI analysis, with their drops.
const ov = useOverviewData()
const t = useModHost().t
const { n } = useFormat()

const q = computed(() => ov.status.data.value?.queue)
const runtime = computed(() => ov.status.data.value?.runtime)
const queues = computed(() => {
  const x = q.value
  if (!x) return []
  return [
    { key: 'post', len: x.post_queue, cap: x.post_queue_cap, sub: t('overviewP3.queue.dropped', { n: n(x.dropped_post_full) }), bad: x.dropped_post_full > 0 },
    { key: 'price', len: x.price_queue, cap: x.price_queue_cap, sub: t('overviewP3.queue.dropped', { n: n(x.dropped_costs) }), bad: x.dropped_costs > 0 },
    {
      key: 'analysis',
      len: x.analysis_running,
      cap: x.analysis_concurrency,
      sub: t('overviewP3.queue.analysisSub', { pending: n(x.analysis_pending) }),
      bad: false
    }
  ]
})
</script>

<template>
  <div v-if="q">
    <SGrid template="repeat(auto-fit, minmax(200px, 1fr))">
      <div v-for="x in queues" :key="x.key" class="mod-ov-queue">
        <div class="mod-sub">{{ t(`overviewP3.queue.${x.key}`) }}</div>
        <div class="mod-num">{{ n(x.len) }} / {{ n(x.cap) }}</div>
        <SProgress :value="x.len" :max="x.cap || 1" size="sm" :tone="x.cap > 0 && x.len >= x.cap ? 'warning' : 'info'" aria-hidden="true" />
        <div class="mod-sub mod-num" :class="x.bad ? 'mod-danger' : ''">{{ x.sub }}</div>
      </div>
    </SGrid>
    <p v-if="runtime" class="mod-sub mod-num mod-ov-runtime">
      {{ t('overviewP3.queue.runtime', { inflight: n(runtime.inflight), calls: n(runtime.calls), errors: n(runtime.errors), cache: n(runtime.cache_hits), entries: n(runtime.cache_entries) }) }}
    </p>
  </div>
</template>

<style scoped>
.mod-ov-queue {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.625rem;
  border: 1px solid rgb(var(--line));
  border-radius: 0.5rem;
  font-size: 0.875rem;
}
.mod-ov-queue .mod-sub {
  margin-top: 0;
}
.mod-ov-runtime {
  margin: 0.5rem 0 0;
}
</style>
