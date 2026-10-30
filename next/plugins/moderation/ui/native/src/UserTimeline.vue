<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SAlert, SBadge, SBulkBar, SButton, SCheckbox, SEmpty, SHint } from '@sub2api/ui'
import CategoryChips from './CategoryChips.vue'
import FlowRef from './FlowRef.vue'
import ResultBadge from './ResultBadge.vue'
import ReviewActions from './ReviewActions.vue'
import VerdictBadge from './VerdictBadge.vue'
import { useCatalog } from './catalog'
import { dt } from './format'
import { canManage, errorMessage, fetchUserEvents, useModHost, type ModEvent, type ReviewStatus, type SourceFilter } from './host'
import { useBulkReview } from './useBulkReview'

// The suspicious records of a user (new-api user timeline), newest first,
// optionally of one source (group → flow@version); manage users review
// checked records in bulk. Reloads when `version` changes.
const props = defineProps<{ userId: number; version: number; source: SourceFilter | null }>()
const emit = defineEmits<{
  (e: 'open-record', id: number): void
  (e: 'total', n: number): void
  (e: 'clear-source'): void
  (e: 'show-user', id: number): void
}>()
const t = useModHost().t
const catalog = useCatalog()
const manage = computed(() => canManage())

const records = ref<ModEvent[]>([])
const total = ref(0)
const error = ref('')
let seq = 0
async function load() {
  const my = ++seq
  error.value = ''
  try {
    const r = await fetchUserEvents(props.userId, props.source)
    if (my !== seq) return
    records.value = r.items
    total.value = r.page.total ?? r.items.length
    if (!props.source) emit('total', total.value)
  } catch (e) {
    if (my === seq) error.value = errorMessage(e, t('watch.loadFailed'))
  }
}
watch(() => [props.userId, props.version, props.source], load, { immediate: true })

function reviewed(ids: number[], status: ReviewStatus) {
  for (const r of records.value) if (ids.includes(r.id)) r.review_status = status
}
function removed(id: number) {
  records.value = records.value.filter((r) => r.id !== id)
  total.value = Math.max(0, total.value - 1)
}
defineExpose({ reviewed, removed })

const { checked, reviewing, review } = useBulkReview(reviewed)
watch(records, () => (checked.value = []))
const toggle = (id: number, on: boolean) => (checked.value = on ? [...checked.value, id] : checked.value.filter((x) => x !== id))
</script>

<template>
  <div class="mod-stack">
    <div v-if="source" class="mod-counts">
      <SBadge tone="info">
        {{ catalog.groupName(source.group_id) }} → <FlowRef :flow-id="source.flow_id" :version="source.flow_version" />
      </SBadge>
      <SButton size="xs" variant="ghost" icon="x" @click="emit('clear-source')">{{ t('watchSummary.allSources') }}</SButton>
    </div>
    <SBulkBar v-if="manage && records.length" :count="checked.length" :total="total" :page-selected="checked.length === records.length" @select-page="checked = records.map((r) => r.id)" @clear="checked = []">
      <template #idle>{{ t('review.hint') }}</template>
      <ReviewActions :loading="reviewing" @review="review" />
    </SBulkBar>
    <SAlert v-if="error" tone="danger" dense>{{ error }}</SAlert>
    <SEmpty v-else-if="!records.length" :text="t('watch.noSuspicious')" icon="eyeglass" />
    <ol v-else class="mod-timeline">
      <li v-for="r in records" :key="r.id" class="mod-timeline-row">
        <SCheckbox v-if="manage" :model-value="checked.includes(r.id)" :aria-label="`#${r.id}`" @update:model-value="toggle(r.id, $event)" />
        <button type="button" class="mod-timeline-item" @click="emit('open-record', r.id)">
          <span class="mod-history-head">
            <ResultBadge :result="r.result" />
            <VerdictBadge :event="r" />
            <CategoryChips :categories="r.hit_categories" />
            <SHint inline size="xs" class="mod-ml-auto">{{ dt(r.created_at) }} · #{{ r.id }}</SHint>
          </span>
          <span class="mod-sub mod-timeline-text">{{ r.text_excerpt || '—' }}</span>
          <span v-if="r.ai_reason" class="mod-sub mod-timeline-text">AI: {{ r.ai_reason }}</span>
        </button>
      </li>
    </ol>
    <div v-if="total > records.length" class="mod-center">
      <SButton size="sm" variant="ghost" @click="emit('show-user', userId)">{{ t('watch.allRecords') }}</SButton>
    </div>
  </div>
</template>
