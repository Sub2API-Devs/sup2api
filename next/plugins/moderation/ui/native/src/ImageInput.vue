<script setup lang="ts">
import { ref } from 'vue'
import { SButton, SField, SInput } from '@sub2api/ui'
import { useModHost } from './host'

// The images of a test, try or simulation (new-api auditor-try-panel):
// files picked, or pasted into the text box of the default slot, become data
// URLs; an image URL (or data URL) can be added by hand. The console forwards
// at most 1 MiB per plugin request (core routes.MaxBodyBytes), so all images
// together stay under MAX_IMAGE_CHARS.
const images = defineModel<string[]>({ required: true })
defineProps<{ size?: 'sm' }>()
const host = useModHost()
const t = host.t

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
/** Data URL characters per request: 1 MiB less room for the text. */
const MAX_IMAGE_CHARS = 900 << 10
/** The same cap in KB of image files (base64 is 4/3 of the bytes). */
const MAX_KB = Math.floor((MAX_IMAGE_CHARS * 3) / 4 / 1024)

const picker = ref<HTMLInputElement | null>(null)
const url = ref('')

function fits(src: string) {
  if (images.value.reduce((n, s) => n + s.length, src.length) <= MAX_IMAGE_CHARS) return true
  host.toast(t('test.imagesTooLarge', { kb: MAX_KB }), 'error')
  return false
}

async function addFiles(files: File[]) {
  for (const file of files) {
    if (!IMAGE_TYPES.includes(file.type)) {
      host.toast(t('test.imageType'), 'error')
      continue
    }
    const src = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
    if (!src || !fits(src)) return
    images.value = [...images.value, src]
  }
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files || [])]
  input.value = ''
  addFiles(files)
}

function onPaste(e: ClipboardEvent) {
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'))
  if (!files.length) return
  e.preventDefault()
  addFiles(files)
}

function addUrl() {
  const src = url.value.trim()
  if (!src || !fits(src)) return
  images.value = [...images.value, src]
  url.value = ''
}

const remove = (i: number) => (images.value = images.value.filter((_, j) => j !== i))
</script>

<template>
  <div class="mod-form" @paste="onPaste">
    <slot />
    <SField :label="t('test.images')" :hint="t('test.imagesHint', { kb: MAX_KB })" :size="size">
      <div class="mod-form">
        <div v-if="images.length" class="mod-image-list">
          <figure v-for="(src, i) in images" :key="i" class="mod-image-item">
            <img v-if="src.startsWith('data:image/')" :src="src" :alt="t('input.image')" />
            <span v-else class="mod-image-url" :title="src">{{ src }}</span>
            <SButton size="xs" variant="ghost" icon="x" icon-only :aria-label="t('test.removeImage')" @click="remove(i)" />
          </figure>
        </div>
        <div class="mod-image-actions">
          <input ref="picker" type="file" multiple :accept="IMAGE_TYPES.join(',')" hidden @change="onPick" />
          <SButton size="sm" icon="upload" @click="picker?.click()">{{ t('test.attachImage') }}</SButton>
          <SInput v-model="url" size="sm" placeholder="https://" :aria-label="t('test.imageUrl')" @keydown.enter.prevent="addUrl" />
          <SButton size="sm" icon="plus" :disabled="!url.trim()" @click="addUrl">{{ t('test.addImageUrl') }}</SButton>
        </div>
      </div>
    </SField>
  </div>
</template>
