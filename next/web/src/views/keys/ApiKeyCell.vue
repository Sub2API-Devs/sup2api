<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCode, confirm, toast } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { copyText } from '@/utils/format'
import { notifyError } from '@/utils/errors'

const props = withDefaults(defineProps<{ apiKey: ApiKey; allowed?: boolean }>(), { allowed: true })
const { t } = useI18n()
const copying = ref(false)
const rotating = ref(false)
const emit = defineEmits<{ (e: 'rotated'): void }>()
async function rotate() {
  if (rotating.value || !props.allowed) return
  if (!await confirm({ title: t('apikeys.rotate'), message: t('apikeys.rotateConfirm', { name: props.apiKey.name }), danger: true })) return
  rotating.value = true
  try {
    await api.post(`/me/api-keys/${props.apiKey.id}/rotate`, {})
    toast(t('apikeys.rotated'), 'success')
    emit('rotated')
  } catch (e) { notifyError(e) }
  finally { rotating.value = false }
}
async function copy() {
  if (copying.value || !props.allowed || !props.apiKey.copyable) return
  copying.value = true
  try {
    const result = await api.post<{ key: string }>(`/me/api-keys/${props.apiKey.id}/reveal`, {})
    const ok = await copyText(result.key)
    toast(t(ok ? 'common.copied' : 'common.copyFailed'), ok ? 'success' : 'error')
  } catch (e) {
    notifyError(e)
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <div class="inline-flex items-center gap-0.5 whitespace-nowrap">
    <SCode inline class="mr-1" :text="`${apiKey.key_prefix}…`" />
    <SButton v-if="allowed" variant="ghost" size="xs" :disabled="copying || rotating || !apiKey.copyable" :title="t(apiKey.copyable ? 'common.copy' : 'apikeys.legacyCopyHint')" :aria-label="t('common.copy')" icon-only icon="copy" data-testid="copy-api-key" @click.stop="copy" />
    <SButton v-if="allowed" variant="ghost" size="xs" :disabled="rotating || copying" :title="t('apikeys.rotate')" :aria-label="t('apikeys.rotate')" icon-only icon="refresh" data-testid="rotate-api-key" @click.stop="rotate" />
  </div>
</template>
