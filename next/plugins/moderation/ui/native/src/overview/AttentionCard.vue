<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SCard, SEmpty, SLink } from '@sub2api/ui'
import { enumLabel, levelTone, trendTone, useModHost } from '../host'
import { userName } from '../directory'
import { useOverviewData } from './useOverview'
import { useFormat } from './format'

// "Most in need of attention": the first users of the watch list by records
// since the last level change (status.attention). A row opens their records.
const emit = defineEmits<{ (e: 'show-user', userId: number): void; (e: 'go-tab', tab: string): void }>()
const ov = useOverviewData()
const t = useModHost().t
const { n, time } = useFormat()
const rows = computed(() => ov.status.data.value?.attention || [])
</script>

<template>
  <SCard :title="t('overviewP3.attention.title')" :subtitle="t('overviewP3.attention.hint')">
    <template #actions>
      <SLink as="button" @click="emit('go-tab', 'watch')">{{ t('overviewP3.attention.all') }}</SLink>
    </template>
    <SEmpty v-if="!rows.length" icon="user" :title="t('overviewP3.attention.empty')" :text="t('overviewP3.attention.emptyHint')" size="sm" />
    <ul v-else class="mod-ov-people">
      <li v-for="u in rows" :key="u.user_id">
        <button type="button" class="mod-ov-person" @click="emit('show-user', u.user_id)">
          <span class="mod-ov-person-head">
            <span class="mod-ov-person-name">{{ userName(u.user_id) }}</span>
            <SBadge :tone="levelTone(u.level)" size="xs">{{ enumLabel('level', u.level) }}</SBadge>
          </span>
          <span class="mod-ov-person-row">
            <span v-if="u.hits_since_seen > 0" class="mod-ov-new">{{ t('overviewP3.attention.new', { n: n(u.hits_since_seen) }) }}</span>
            <span v-else class="mod-sub">{{ t('overviewP3.attention.noNew') }}</span>
            <SBadge v-if="u.latest_trend" :tone="trendTone(u.latest_trend)" size="xs">{{ enumLabel('trend', u.latest_trend) }}</SBadge>
            <span v-else class="mod-sub">{{ t('overviewP3.attention.noTrend') }}</span>
          </span>
          <span class="mod-sub mod-num">{{ t('overviewP3.attention.total', { n: n(u.hit_count), at: time(u.last_hit_at) }) }}</span>
        </button>
      </li>
    </ul>
  </SCard>
</template>

<style scoped>
.mod-ov-people {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.mod-ov-person {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.625rem;
  border: 1px solid rgb(var(--line));
  border-radius: 0.5rem;
  background: transparent;
  color: inherit;
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
}
.mod-ov-person:hover {
  background: rgb(var(--surface-2));
}
.mod-ov-person:focus-visible {
  outline: 2px solid rgb(59 130 246 / 0.5);
  outline-offset: 1px;
}
.mod-ov-person-head,
.mod-ov-person-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.mod-ov-person-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.mod-ov-new {
  color: #d97706;
  font-size: 0.75rem;
  font-weight: 600;
}
.mod-ov-person .mod-sub {
  margin-top: 0;
}
</style>
