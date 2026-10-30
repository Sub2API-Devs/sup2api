<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { SBadge, SLink } from '@sub2api/ui'
import AsyncCard from './AsyncCard.vue'
import CategoryChips from '../CategoryChips.vue'
import UserRef from '../UserRef.vue'
import { onOverviewTick } from './tick'
import { useAsync } from '../useAsync'
import { enumLabel, fetchWatchList, levelTone, trendTone, useModHost } from '../host'

// "最需关注的人": the first six of the watch list in its default order (new
// records since last seen first). A row opens the user's watch detail.
const emit = defineEmits<{ (e: 'open-watch', userId: number): void; (e: 'go-tab', tab: string): void }>()
const t = useModHost().t

const list = useAsync(() => fetchWatchList({ page: 1, page_size: 6, sort: 'new' }), () => t('watch.loadFailed'))
onMounted(list.reload)
onOverviewTick(list.reload)
const items = computed(() => list.data.value?.items || [])
</script>

<template>
  <AsyncCard
    :title="t('attention.title')"
    :subtitle="t('attention.hint')"
    :error="list.error.value"
    :loading="list.loading.value"
    :empty="!items.length"
    :empty-text="t('attention.empty')"
    empty-icon="user"
  >
    <template #actions><SLink as="button" @click="emit('go-tab', 'watch')">{{ t('attention.all') }}</SLink></template>
    <ul class="mod-attention">
      <li v-for="w in items" :key="w.user_id">
        <button type="button" class="mod-attention-item" @click="emit('open-watch', w.user_id)">
          <span class="mod-attention-row">
            <UserRef :user-id="w.user_id" />
            <SBadge :tone="levelTone(w.level)" size="xs">{{ enumLabel('level', w.level) }}</SBadge>
          </span>
          <CategoryChips :categories="w.top_categories" :other="w.top_other" />
          <span class="mod-attention-row">
            <span v-if="w.hits_since_seen" class="mod-text-warning mod-sub">{{ t('attention.new', { n: w.hits_since_seen }) }}</span>
            <span v-else class="mod-sub">{{ t('attention.noNew') }}</span>
            <SBadge v-if="w.latest_trend" size="xs" :tone="trendTone(w.latest_trend)">{{ enumLabel('trend', w.latest_trend) }}</SBadge>
          </span>
        </button>
      </li>
    </ul>
  </AsyncCard>
</template>
