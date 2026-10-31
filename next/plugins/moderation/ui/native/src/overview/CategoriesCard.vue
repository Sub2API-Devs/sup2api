<script setup lang="ts">
import { computed } from 'vue'
import { SAlert, SCard, SHint, SSpinner } from '@sub2api/ui'
import { categoryLabel, useModHost } from '../host'
import RankList from '../RankList.vue'
import { useOverviewData } from './useOverview'
import { useFormat } from './format'

// Today's suspicious requests by category (GET /stats/categories); a request
// counts once per category, and can hit several.
const ov = useOverviewData()
const t = useModHost().t
const { n } = useFormat()
const data = computed(() => ov.categories.data.value)
const items = computed(() => [...(data.value?.items || [])].sort((a, b) => b.count - a.count))
</script>

<template>
  <SCard :title="t('overviewP3.categories.title')" :subtitle="t('overviewP3.categories.hint')">
    <SAlert v-if="ov.categories.error.value" tone="danger">{{ ov.categories.error.value }}</SAlert>
    <SSpinner v-else-if="!data" block />
    <template v-else>
      <p v-if="items.length" class="mod-ov-cat-sum mod-num">
        <span>{{ t('overviewP3.categories.requests') }} <b>{{ n(data.suspicious_requests) }}</b></span>
        <span>{{ t('overviewP3.categories.hits') }} <b>{{ n(data.category_hits) }}</b></span>
      </p>
      <RankList :items="items" :item-key="(c) => c.category" tone="warning" :empty-text="t('overviewP3.categories.empty')" empty-icon="chart">
        <template #name="{ item: c }">
          <span class="mod-rank-name" :title="c.category">
            {{ categoryLabel(c.category) }}<code v-if="categoryLabel(c.category) !== c.category" class="mod-code">{{ c.category }}</code>
          </span>
        </template>
        <template #count="{ item: c }">{{ n(c.count) }}</template>
      </RankList>
      <SHint v-if="data.truncated" size="xs" tone="warning" class="mod-ov-cat-note">{{ t('overviewP3.categories.truncated') }}</SHint>
    </template>
  </SCard>
</template>

<style scoped>
.mod-ov-cat-sum {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
}
.mod-ov-cat-note {
  margin-top: 0.75rem;
}
</style>
