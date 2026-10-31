<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { SBadge, SChip, SHint } from '@sub2api/ui'
import { categoryLabel, enumLabel, levelTone, useModHost, type ModEvent, type Watch } from '../host'
import { groupName, loadGroups } from '../directory'
import type { WatchItem } from '../stats'
import UserCell from './UserCell.vue'
import NextAnalysisText from './NextAnalysisText.vue'
import WatchActions from './WatchActions.vue'
import { distribution } from './watchSummary'

// User card of the watch list detail (new-api user-detail-summary.tsx): the
// entry now, the 30-day figures of the list row, the distribution of the
// loaded suspicious records, the progress to the next automatic analysis and
// the watch list actions.
const props = defineProps<{ watch: Watch; item?: WatchItem | null; records: ModEvent[]; recordsTotal: number; every: number }>()
const emit = defineEmits<{ (e: 'changed', w: Watch | null): void }>()
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => host.i18n.formatNumber(v ?? 0)
const dt = (v: string | null | undefined) => (v ? host.i18n.formatDateTime(v) : '—')
onMounted(loadGroups)

const d = computed(() => distribution(props.records))
const state = computed(() => {
  const w = props.watch
  const until = w.expires_at ? t('pagesP3.user.until', { time: dt(w.expires_at) }) : t('watch.noExpiry')
  return `${enumLabel('watchSource', w.source)} · ${t('pagesP3.wcard.since', { time: dt(w.since_at) })} · ${until}`
})
</script>

<template>
  <div class="mod-pg-wcard">
    <div class="mod-pg-wcard-head">
      <b><UserCell :id="watch.user_id" /></b>
      <SBadge :tone="levelTone(watch.level)">{{ enumLabel('level', watch.level) }}</SBadge>
      <SBadge v-if="watch.hits_since_seen" tone="warning">{{ t('pagesP3.watch.newN', { n: n(watch.hits_since_seen) }) }}</SBadge>
      <SHint inline size="xs">{{ state }}</SHint>
    </div>

    <dl class="mod-pg-wcard-dl">
      <dt>{{ t('pagesP3.wcard.counts') }}</dt>
      <dd class="mod-num">
        {{ t('pagesP3.wcard.countsValue', { v: n(watch.violation_count), h: n(watch.hit_count) }) }}
        <span class="mod-sub"> · {{ t('watch.col.lastHit') }} {{ dt(watch.last_hit_at) }}</span>
      </dd>

      <template v-if="item">
        <dt>{{ t('pagesP3.wcard.days30') }}</dt>
        <dd class="mod-num">
          {{ t('pagesP3.watch.suspiciousN', { n: n(item.suspicious_total) }) }} · {{ t('pagesP3.watch.sev', { high: n(item.severity?.high), medium: n(item.severity?.medium), low: n(item.severity?.low) }) }}
          <span v-if="item.groups?.length" class="mod-sub"> · {{ item.groups.map(groupName).join('、') }}</span>
        </dd>
        <template v-if="item.top_categories?.length">
          <dt>{{ t('pagesP3.watch.col.categories') }}</dt>
          <dd class="mod-pg-wcard-chips">
            <SChip v-for="c in item.top_categories" :key="c.category" size="xs" tone="warning" :title="c.category">{{ categoryLabel(c.category) }} {{ n(c.count) }}</SChip>
            <span v-if="item.other_categories" class="mod-sub">{{ t('pagesP3.watch.otherN', { n: n(item.other_categories) }) }}</span>
          </dd>
        </template>
      </template>

      <template v-if="records.length">
        <dt>{{ t('pagesP3.wcard.dist', { n: n(records.length) }) }}</dt>
        <dd class="mod-pg-wcard-dist">
          <span>{{ t('pagesP3.wcard.review', { p: n(d.review.pending), fp: n(d.review.false_positive), c: n(d.review.confirmed) }) }}</span>
          <span>{{ t('pagesP3.watch.sev', { high: n(d.severity.high), medium: n(d.severity.medium), low: n(d.severity.low) }) }}</span>
          <span>{{ t('pagesP3.wcard.ai', { v: n(d.ai.violation), fp: n(d.ai.false_positive), u: n(d.ai.unsure), none: n(d.ai.none) }) }}</span>
          <SHint v-if="recordsTotal > records.length" inline size="xs">{{ t('pagesP3.wcard.partial', { n: n(recordsTotal) }) }}</SHint>
        </dd>
      </template>

      <dt>{{ t('pagesP3.next.title') }}</dt>
      <dd><NextAnalysisText :watch="watch" :every="every" /></dd>

      <template v-if="watch.note">
        <dt>{{ t('watch.col.note') }}</dt>
        <dd class="mod-prewrap">{{ watch.note }}</dd>
      </template>
    </dl>

    <div class="mod-pg-wcard-actions">
      <slot />
      <WatchActions :user-id="watch.user_id" :watch="watch" @changed="emit('changed', $event)" />
    </div>
  </div>
</template>

<style scoped>
.mod-pg-wcard {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid rgb(var(--line));
  border-radius: 0.5rem;
}
.mod-pg-wcard-head,
.mod-pg-wcard-chips,
.mod-pg-wcard-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.mod-pg-wcard-chips {
  gap: 0.25rem;
}
.mod-pg-wcard-dl {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.5rem 1rem;
  margin: 0;
  font-size: 0.875rem;
}
.mod-pg-wcard-dl dt {
  color: rgb(var(--fg-muted));
}
.mod-pg-wcard-dl dd {
  margin: 0;
}
.mod-pg-wcard-dist {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-variant-numeric: tabular-nums;
}
</style>
