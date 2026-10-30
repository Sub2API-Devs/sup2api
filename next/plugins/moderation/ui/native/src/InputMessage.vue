<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SButton, SCode, SCopyButton, SHint, SSectionTitle, SSegmented } from '@sub2api/ui'
import { num } from './format'
import { enumLabel, errorMessage, fetchEventInput, useModHost, type EventInput } from './host'

// The saved input message of a record (new-api record-input-message-section):
// loaded on demand; text segments with their role and image thumbnails, the
// raw JSON, or the full extracted text. Remote images load only on click, so
// opening a record does not call a URL the user supplied.
const props = defineProps<{ eventId: number; size: number; inputText?: string }>()
const host = useModHost()
const t = host.t

const input = ref<EventInput | null>(null)
const loading = ref(false)
const view = ref<'parts' | 'text' | 'raw'>('parts')
/** indexes of the remote images the reviewer chose to load */
const loaded = ref(new Set<number>())
watch(
  () => props.eventId,
  () => {
    input.value = null
    loaded.value = new Set()
  }
)

async function load() {
  loading.value = true
  try {
    input.value = await fetchEventInput(props.eventId)
    if (!input.value.parts?.length) view.value = props.inputText ? 'text' : 'raw'
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    loading.value = false
  }
}

/** Only image data URLs and http(s) URLs reach <img> / <a>: the message is user input. */
const safeSrc = (src?: string) => (src && /^(data:image\/|https?:\/\/)/i.test(src) ? src : '')
const parts = computed(() =>
  (input.value?.parts || []).map((p, i) => {
    const src = safeSrc(p.src)
    return { ...p, src, remote: !!src && !src.startsWith('data:') && !loaded.value.has(i) }
  })
)
const loadImage = (i: number) => (loaded.value = new Set(loaded.value).add(i))

const raw = computed(() => (input.value?.messages ? JSON.stringify(input.value.messages, null, 2) : ''))
const viewOptions = computed(() => [
  { value: 'parts', label: t('input.parts'), disabled: !input.value?.parts?.length },
  { value: 'text', label: t('input.text'), disabled: !props.inputText },
  { value: 'raw', label: t('input.raw') }
])
const copyText = computed(() => (view.value === 'text' ? props.inputText || '' : raw.value))
</script>

<template>
  <div>
    <SSectionTitle tag="p">
      {{ t('detail.input') }}
      <SHint inline size="xs" class="mod-chars">{{ t('detail.bytes', { n: num(size) }) }}</SHint>
      <template #actions>
        <SButton v-if="!input" size="sm" :loading="loading" @click="load">{{ t('detail.loadInput') }}</SButton>
        <template v-else>
          <SSegmented v-model="view" :options="viewOptions" size="sm" />
          <SCopyButton v-if="view !== 'parts' && copyText" :text="copyText" />
        </template>
      </template>
    </SSectionTitle>
    <template v-if="input">
      <ol v-if="view === 'parts'" class="mod-input-parts">
        <li v-for="(p, i) in parts" :key="i" class="mod-msg">
          <div class="mod-msg-head mod-sub">{{ enumLabel('role', p.role) }}</div>
          <div v-if="p.type === 'text'" class="mod-msg-body mod-prewrap">{{ p.text }}</div>
          <SButton v-else-if="p.remote" size="sm" variant="ghost" icon="eye" :title="p.src" @click="loadImage(i)">{{ t('input.loadImage') }}</SButton>
          <a v-else-if="p.src" :href="p.src" target="_blank" rel="noopener noreferrer" class="mod-input-image">
            <img :src="p.src" :alt="p.mime || t('input.image')" loading="lazy" referrerpolicy="no-referrer" />
          </a>
          <SHint v-else inline size="xs">{{ t('input.image') }} {{ p.mime }}</SHint>
        </li>
      </ol>
      <SCode v-else-if="view === 'text'" :text="inputText || ''" class="mod-text-block" />
      <SCode v-else :text="raw" class="mod-text-block" />
    </template>
  </div>
</template>
