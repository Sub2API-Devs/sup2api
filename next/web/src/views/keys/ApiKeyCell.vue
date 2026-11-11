<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SCode, toast } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { copyText } from '@/utils/format'
import { notifyError } from '@/utils/errors'
import { maskKey, revealKey } from './reveal'

// A key masked after its prefix, with an eye that shows the full key in
// place (revealed once, then toggled) and a copy button. A legacy key, kept
// only as a hash, can do neither: both buttons are off and say why.
const props = defineProps<{ apiKey: ApiKey }>()
const { t } = useI18n()
const full = ref('')
const shown = ref(false)
const busy = ref(false)
const off = computed(() => busy.value || !props.apiKey.copyable)
const legacyHint = computed(() => (props.apiKey.copyable ? '' : t('apikeys.legacyCopyHint')))
const eyeLabel = computed(() => t(shown.value ? 'apikeys.hideKey' : 'apikeys.showKey'))

// The cell turns to another key when its row is given another one, or its key
// is regenerated (another prefix): what was revealed, or is being revealed,
// is not that key.
let turn = 0
watch([() => props.apiKey.id, () => props.apiKey.key_prefix], () => {
  turn++
  full.value = ''
  shown.value = false
  busy.value = false
})

/** Runs `use` with the full key, fetched on first use; a refused reveal is toasted. */
async function withKey(use: (key: string) => unknown) {
  if (off.value) return
  const my = turn
  busy.value = true
  try {
    const key = full.value || (await revealKey(props.apiKey.id))
    if (my !== turn) return
    full.value = key
    await use(key)
  } catch (e) {
    if (my === turn) notifyError(e)
  } finally {
    if (my === turn) busy.value = false
  }
}

function toggle() {
  if (shown.value) shown.value = false
  else withKey(() => (shown.value = true))
}

const copy = () =>
  withKey(async key => {
    const ok = await copyText(key)
    toast(t(ok ? 'common.copied' : 'common.copyFailed'), ok ? 'success' : 'error')
  })
</script>

<template>
  <div class="inline-flex items-center gap-0.5 whitespace-nowrap" data-testid="api-key">
    <SCode inline class="mr-1" :text="shown ? full : maskKey(apiKey.key_prefix)" />
    <SButton
      variant="ghost"
      size="xs"
      icon-only
      :icon="shown ? 'eye-off' : 'eye'"
      :disabled="off"
      :title="legacyHint || eyeLabel"
      :aria-label="eyeLabel"
      data-testid="reveal-api-key"
      @click.stop="toggle"
    />
    <SButton
      variant="ghost"
      size="xs"
      icon-only
      icon="copy"
      :disabled="off"
      :title="legacyHint || t('common.copy')"
      :aria-label="t('common.copy')"
      data-testid="copy-api-key"
      @click.stop="copy"
    />
  </div>
</template>
