<script setup lang="ts">
import { computed } from 'vue'
import { SCode, SHint, SSectionTitle } from '@sub2api/ui'
import { useModHost } from '../host'
import { DEFAULT_BLOCK_MESSAGE } from './fields'
import { blockResponse, type BlockFormat } from './blockPreview'

// Preview of what a refused client receives, per endpoint format, and how a
// streaming request is refused (CONTRACTS §72.14.7, after new-api
// block-response-preview).
const props = defineProps<{ status: number; message: string }>()
const t = useModHost().t

const own = computed(() => props.message.trim())
const sent = computed(() => own.value || DEFAULT_BLOCK_MESSAGE)
const status = computed(() => (Number.isInteger(props.status) ? props.status : 403))
const blocks = computed(() =>
  (['openai', 'anthropic', 'gemini'] as BlockFormat[]).map((k) => ({ key: k, body: blockResponse(k, status.value, sent.value) }))
)
</script>

<template>
  <div class="mod-set-blocks">
    <SSectionTitle tag="p">
      {{ t('settingsPage.preview.title') }}
      <SHint inline size="xs" class="mod-set-gap">{{ t(own ? 'settingsPage.preview.own' : 'settingsPage.preview.builtin', { status }) }}</SHint>
    </SSectionTitle>
    <div class="mod-set-grid">
      <div v-for="b in blocks" :key="b.key" class="mod-set-block">
        <p class="mod-set-block-title">{{ t(`settingsPage.preview.${b.key}`) }}</p>
        <SHint size="xs">{{ t(`settingsPage.preview.${b.key}Note`) }}</SHint>
        <SCode :text="b.body" :data-testid="`block-preview-${b.key}`" />
      </div>
      <div class="mod-set-block">
        <p class="mod-set-block-title">{{ t('settingsPage.preview.stream') }}</p>
        <SHint size="xs">{{ t('settingsPage.preview.streamNote', { status }) }}</SHint>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mod-set-blocks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.mod-set-gap {
  margin-left: 0.5rem;
}
.mod-set-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(22rem, 100%), 1fr));
  gap: 0.75rem;
}
.mod-set-block {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.375rem;
}
.mod-set-block-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
