<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { SHint } from '@sub2api/ui'
import AsyncCard from './AsyncCard.vue'
import RankList from '../RankList.vue'
import { onOverviewTick } from './tick'
import { categoryLabel, num } from '../format'
import { fetchCategoryStats, useModHost } from '../host'
import { useAsync } from '../useAsync'

// Today's suspicious requests by category (new-api categories-card), counted
// per request: a request can count once for each of several categories.
const t = useModHost().t
const stats = useAsync(fetchCategoryStats, () => t('stats.loadFailed'))
onMounted(stats.reload)
onOverviewTick(stats.reload)
const items = computed(() => stats.data.value?.items || [])
</script>

<template>
  <AsyncCard
    :title="t('categories.title')"
    :subtitle="t('categories.hint')"
    :error="stats.error.value"
    :loading="stats.loading.value"
    :empty="!items.length"
    :empty-text="t('categories.empty')"
  >
    <div class="mod-legend">
      <span>{{ t('categories.requests') }} <b class="mod-num">{{ num(stats.data.value?.suspicious_requests) }}</b></span>
      <span>{{ t('categories.hits') }} <b class="mod-num">{{ num(stats.data.value?.category_hits) }}</b></span>
    </div>
    <RankList :items="items" :item-key="(c) => c.category" tone="warning" :empty-text="t('categories.empty')" empty-icon="chart">
      <template #name="{ item: c }">
        <span class="mod-rank-name" :title="c.category">
          {{ categoryLabel(c.category, c.label) }}<code v-if="categoryLabel(c.category, c.label) !== c.category" class="mod-code">{{ c.category }}</code>
        </span>
      </template>
      <template #count="{ item: c }">{{ num(c.count) }}</template>
    </RankList>
    <SHint v-if="stats.data.value?.truncated" size="xs" tone="warning">{{ t('categories.truncated') }}</SHint>
  </AsyncCard>
</template>
