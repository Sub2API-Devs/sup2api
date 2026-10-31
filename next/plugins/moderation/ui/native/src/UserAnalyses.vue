<script setup lang="ts">
import { computed, watch } from 'vue'
import { SAlert, SButton, SEmpty } from '@sub2api/ui'
import AnalysisCard from './AnalysisCard.vue'
import { fetchWatchAnalyses, useModHost } from './host'
import type { Analysis } from './types'
import { useAsync } from './useAsync'

// The AI analyses of a user, newest first, ten at a time. Reloads when
// `version` changes (an analysis finished).
const props = defineProps<{ userId: number; version: number }>()
const emit = defineEmits<{ (e: 'open-record', id: number): void; (e: 'total', n: number): void }>()
const t = useModHost().t

interface Pages {
  items: Analysis[]
  total: number
  page: number
}
/** Page `p` merged after the loaded ones (page 1 replaces them). */
async function fetchPage(p: number): Promise<Pages> {
  const r = await fetchWatchAnalyses(props.userId, p)
  const before = p === 1 ? [] : data.value?.items || []
  return { items: [...before, ...r.items], total: r.page.total ?? r.items.length, page: p }
}
const { data, loading, error, reload, run } = useAsync(() => fetchPage(1), () => t('watch.loadFailed'))
const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const loadMore = () => run(() => fetchPage((data.value?.page ?? 0) + 1))
watch(() => [props.userId, props.version], reload, { immediate: true })
watch(data, (d) => d && emit('total', d.total))
</script>

<template>
  <div>
    <SAlert v-if="error" tone="danger" dense>{{ error }}</SAlert>
    <SEmpty v-else-if="!loading && !items.length" :text="t('watch.noAnalyses')" icon="eyeglass" />
    <div v-else class="mod-analysis-list">
      <AnalysisCard v-for="a in items" :key="a.id" :analysis="a" @open-record="emit('open-record', $event)" />
      <div v-if="items.length < total" class="mod-center">
        <SButton size="sm" :loading="loading" @click="loadMore">{{ t('watch.loadMore') }}</SButton>
      </div>
    </div>
  </div>
</template>
