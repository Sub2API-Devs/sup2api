<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SAlert, SButton, SCode, SCopyButton, SDisclosure, SHint, SModal, SSectionTitle, SSpinner } from '@sub2api/ui'
import { errorMessage, fetchEventInput, useModHost } from '../host'
import { messageParts, type MessagePart } from './inputParts'

// The saved user messages of a record (GET /events/:id/input), loaded on
// demand: text parts, image thumbnails (click to enlarge) and the raw JSON.
const props = defineProps<{ eventId: number; size: number }>()
const host = useModHost()
const t = host.t

const raw = ref<unknown>(undefined)
const loading = ref(false)
const error = ref('')
const preview = ref<string | null>(null)
const failed = ref(new Set<number>())

watch(
  () => props.eventId,
  () => {
    raw.value = undefined
    error.value = ''
    failed.value = new Set()
  }
)

async function load() {
  const id = props.eventId
  loading.value = true
  error.value = ''
  try {
    const r = await fetchEventInput(id)
    if (props.eventId === id) raw.value = r.messages ?? null
  } catch (e) {
    error.value = errorMessage(e, t('pagesP3.input.loadFailed'))
  } finally {
    loading.value = false
  }
}

const parts = computed(() => (raw.value === undefined ? [] : messageParts(raw.value)))
const texts = computed(() => parts.value.filter((p): p is Extract<MessagePart, { type: 'text' }> => p.type === 'text'))
const images = computed(() => parts.value.filter((p): p is Extract<MessagePart, { type: 'image' }> => p.type === 'image'))
const json = computed(() => (raw.value === undefined || raw.value === null ? '' : JSON.stringify(raw.value, null, 2)))
const markFailed = (i: number) => (failed.value = new Set([...failed.value, i]))
</script>

<template>
  <div>
    <SSectionTitle tag="p">
      {{ t('detail.input') }}
      <SHint inline size="xs" class="mod-chars">{{ t('detail.bytes', { n: host.i18n.formatNumber(size) }) }}</SHint>
      <template #actions>
        <SButton v-if="raw === undefined" size="sm" :loading="loading" @click="load">{{ t('detail.loadInput') }}</SButton>
        <SCopyButton v-else-if="json" :text="json" />
      </template>
    </SSectionTitle>
    <SSpinner v-if="loading" block />
    <SAlert v-else-if="error" tone="danger" dense>{{ error }}</SAlert>
    <div v-else-if="raw !== undefined" class="mod-pg-input">
      <SHint v-if="!parts.length" size="xs">{{ t('pagesP3.input.empty') }}</SHint>
      <div v-if="texts.length" class="mod-pg-input-text">
        <p v-for="(p, i) in texts" :key="i" class="mod-prewrap">{{ p.text }}</p>
      </div>
      <ul v-if="images.length" class="mod-pg-thumbs">
        <li v-for="(img, i) in images" :key="i">
          <div v-if="!img.src || failed.has(i)" class="mod-pg-thumb mod-pg-thumb-off" role="img" :aria-label="t('pagesP3.input.image', { n: i + 1 })">
            <span>{{ t('pagesP3.input.imageFailed') }}</span>
            <code>{{ [img.kind, img.mime].filter(Boolean).join(' · ') }}</code>
          </div>
          <button v-else type="button" class="mod-pg-thumb" :aria-label="t('pagesP3.input.openImage', { n: i + 1 })" @click="preview = img.src">
            <img :src="img.src" :alt="t('pagesP3.input.image', { n: i + 1 })" loading="lazy" referrerpolicy="no-referrer" @error="markFailed(i)" />
          </button>
          <a v-if="img.kind === 'url' && img.src" :href="img.src" target="_blank" rel="noreferrer noopener" class="mod-pg-thumb-link" :title="img.src">{{ img.src }}</a>
        </li>
      </ul>
      <SDisclosure v-if="json" :label="t('pagesP3.input.raw')">
        <SCode :text="json" class="mod-text-block" />
      </SDisclosure>
    </div>

    <SModal :open="!!preview" :title="t('pagesP3.input.imageTitle')" width="xl" @update:open="!$event && (preview = null)">
      <img v-if="preview" :src="preview" :alt="t('pagesP3.input.imageTitle')" referrerpolicy="no-referrer" class="mod-pg-preview" />
    </SModal>
  </div>
</template>

<style scoped>
.mod-pg-input {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.mod-pg-input-text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 18rem;
  overflow-y: auto;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  background: rgb(var(--surface-2));
  font-size: 0.875rem;
}
.mod-pg-input-text p {
  margin: 0;
}
.mod-pg-thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.mod-pg-thumbs li {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.25rem;
}
.mod-pg-thumb {
  display: flex;
  height: 6rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0;
  border: 1px solid rgb(var(--line));
  border-radius: 0.375rem;
  background: rgb(var(--surface-2));
  cursor: zoom-in;
}
.mod-pg-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.mod-pg-thumb-off {
  flex-direction: column;
  gap: 0.25rem;
  padding: 0 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  color: rgb(var(--fg-subtle));
  cursor: default;
}
.mod-pg-thumb-off code {
  word-break: break-all;
}
.mod-pg-thumb-link {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
}
.mod-pg-preview {
  display: block;
  max-width: 100%;
  max-height: 75vh;
  margin: 0 auto;
  object-fit: contain;
}
</style>
