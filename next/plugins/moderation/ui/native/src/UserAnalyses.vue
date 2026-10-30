<script setup lang="ts">
import { ref, watch } from 'vue'
import { SAlert, SButton, SEmpty } from '@sub2api/ui'
import AnalysisCard from './AnalysisCard.vue'
import { errorMessage, fetchWatchAnalyses, useModHost, type Analysis } from './host'

// The AI analyses of a user, newest first, ten at a time. Reloads when
// `version` changes (an analysis finished).
const props = defineProps<{ userId: number; version: number }>()
const emit = defineEmits<{ (e: 'open-record', id: number): void; (e: 'total', n: number): void }>()
const t = useModHost().t

const items = ref<Analysis[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref('')
let seq = 0

async function load(p = 1) {
  const my = ++seq
  loading.value = true
  error.value = ''
  try {
    const r = await fetchWatchAnalyses(props.userId, p)
    if (my !== seq) return
    items.value = p === 1 ? r.items : [...items.value, ...r.items]
    total.value = r.page.total ?? r.items.length
    page.value = p
    emit('total', total.value)
  } catch (e) {
    if (my === seq) error.value = errorMessage(e, t('watch.loadFailed'))
  } finally {
    if (my === seq) loading.value = false
  }
}
watch(() => [props.userId, props.version], () => load(), { immediate: true })
</script>

<template>
  <div>
    <SAlert v-if="error" tone="danger" dense>{{ error }}</SAlert>
    <SEmpty v-else-if="!loading && !items.length" :text="t('watch.noAnalyses')" icon="eyeglass" />
    <div v-else class="mod-analysis-list">
      <AnalysisCard v-for="a in items" :key="a.id" :analysis="a" @open-record="emit('open-record', $event)" />
      <div v-if="items.length < total" class="mod-center">
        <SButton size="sm" :loading="loading" @click="load(page + 1)">{{ t('watch.loadMore') }}</SButton>
      </div>
    </div>
  </div>
</template>
