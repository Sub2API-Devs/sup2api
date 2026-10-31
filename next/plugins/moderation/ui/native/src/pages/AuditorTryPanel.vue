<script setup lang="ts">
import { computed, ref } from 'vue'
import { SAlert, SBadge, SButton, SField, SHint, STextarea } from '@sub2api/ui'
import CategoryChips from '../CategoryChips.vue'
import CostBadge from '../CostBadge.vue'
import { categoryLabel, enumLabel, errorMessage, score, tryAuditor, useModHost, type AuditorDraft, type TryResult } from '../host'

// Try a text and images with an auditor (POST /auditors/:id/try). With a
// draft the unsaved form is tried: id 0 = a new auditor (the whole draft),
// otherwise the draft fields override the stored auditor. Nothing is
// recorded; the call's cost goes to the channel under "审核器试跑".
const props = defineProps<{ auditorId: number; draft?: AuditorDraft; blocked?: string }>()
const host = useModHost()
const t = host.t

const text = ref('')
const images = ref('')
const result = ref<TryResult | null>(null)
const running = ref(false)

async function run() {
  running.value = true
  result.value = null
  try {
    const imgs = images.value.split('\n').map((s) => s.trim()).filter(Boolean)
    result.value = await tryAuditor(props.auditorId, text.value, imgs, props.draft)
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    running.value = false
  }
}

const scores = computed(() =>
  Object.entries(result.value?.scores || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
)
</script>

<template>
  <div class="mod-form">
    <STextarea v-model="text" :rows="4" :placeholder="t('test.placeholder')" :aria-label="t('pagesP3.try.text')" />
    <SField :label="t('test.images')" :hint="t('test.imagesHint')">
      <STextarea v-model="images" :rows="2" />
    </SField>
    <div class="mod-pg-try-actions">
      <SButton variant="primary" icon="play" :loading="running" :disabled="!!blocked || (!text.trim() && !images.trim())" @click="run">{{ t('test.run') }}</SButton>
      <SHint inline size="xs">{{ blocked || (draft ? t('pagesP3.try.draftHint') : t('auditors.tryHint')) }}</SHint>
    </div>
    <div v-if="result" class="mod-verdict">
      <div class="mod-verdict-head">
        <SBadge v-if="result.error || result.err" tone="warning">{{ enumLabel('err', result.err || result.error) }} {{ result.status || '' }}</SBadge>
        <SBadge v-else-if="result.skipped" tone="gray">{{ t('trace.skipped') }}</SBadge>
        <SBadge v-else :tone="result.hit ? 'danger' : 'success'">{{ result.hit ? t('trace.hit') : t('trace.pass') }}</SBadge>
        <SHint inline size="xs">{{ t('ms', { n: result.latency_ms }) }}<template v-if="result.model"> · {{ result.model }}</template><template v-if="result.rules_version"> · {{ result.rules_version }}</template></SHint>
        <SHint v-if="result.sent_images || result.skipped_images" inline size="xs">{{ t('trace.images', { sent: result.sent_images || 0, skipped: result.skipped_images || 0 }) }}</SHint>
        <CostBadge :cost="result.cost" class="mod-ml-auto" />
      </div>
      <SAlert v-if="result.error" tone="danger" dense>{{ result.error }}</SAlert>
      <CategoryChips v-if="result.hits?.length" :categories="result.hits" wrap />
      <div v-if="result.reason" class="mod-sub">{{ result.reason }}</div>
      <ul v-if="scores.length" class="mod-scores">
        <li v-for="[c, s] in scores" :key="c"><span>{{ categoryLabel(c) }}</span><span class="mod-num">{{ score(s) }}</span></li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.mod-pg-try-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
</style>
