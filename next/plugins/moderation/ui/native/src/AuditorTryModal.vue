<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SAlert, SBadge, SButton, SHint, SModal, STextarea } from '@sub2api/ui'
import CategoryChips from './CategoryChips.vue'
import CostBadge from './CostBadge.vue'
import ImageInput from './ImageInput.vue'
import { categoryLabel, enumLabel, ms, score } from './format'
import { tryAuditor, useModHost } from './host'
import { useAsync } from './useAsync'
import type { AuditorTryTarget } from './types'

// Tries an auditor on a text and images: a stored one from its row, or the
// editor's unsaved edits (target.draft). The inputs are kept between tries.
const props = defineProps<{ target: AuditorTryTarget | null }>()
const open = defineModel<boolean>('open', { required: true })
const host = useModHost()
const t = host.t

const text = ref('')
const images = ref<string[]>([])
// Only the latest try writes the result; opening again drops a pending one.
const attempt = useAsync(() => tryAuditor(props.target!.id, text.value, images.value, props.target!.draft), () => t('actionFailed'))
const { data: result, loading: trying, error: failure } = attempt
watch(open, (v) => v && attempt.reset())

function run() {
  if (!props.target) return
  attempt.reset()
  attempt.reload()
}

const scores = computed(() =>
  Object.entries(result.value?.scores || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
)
</script>

<template>
  <SModal v-model:open="open" :title="t('auditors.tryTitle', { name: target?.name || '' })" width="lg">
    <div class="mod-form">
      <SHint size="xs">{{ t('auditors.tryHint') }}</SHint>
      <ImageInput v-model="images">
        <STextarea v-model="text" :rows="5" :placeholder="t('test.placeholder')" />
      </ImageInput>
      <SAlert v-if="failure" tone="danger" dense>{{ failure }}</SAlert>
      <div v-if="result" class="mod-verdict">
        <div class="mod-verdict-head">
          <SBadge v-if="result.error" tone="warning">{{ enumLabel('err', result.err) }} {{ result.status || '' }}</SBadge>
          <SBadge v-else-if="result.skipped" tone="gray">{{ t('trace.skipped') }}</SBadge>
          <SBadge v-else :tone="result.hit ? 'danger' : 'success'">{{ result.hit ? t('trace.hit') : t('trace.pass') }}</SBadge>
          <SHint inline size="xs">{{ ms(result.latency_ms) }} · {{ result.model || '' }}</SHint>
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
    <template #footer>
      <SButton @click="open = false">{{ host.i18n.t('ui.close') }}</SButton>
      <SButton variant="primary" icon="play" :loading="trying" :disabled="!text.trim() && !images.length" @click="run">{{ t('test.run') }}</SButton>
    </template>
  </SModal>
</template>
