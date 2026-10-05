<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SIcon, toast } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { copyText } from '@/utils/format'
import { notifyError } from '@/utils/errors'

const props = withDefaults(defineProps<{ apiKey: ApiKey; admin?: boolean; allowed?: boolean }>(), { admin: false, allowed: true })
const { t } = useI18n()
const copying = ref(false)
async function copy() {
  if (copying.value || !props.allowed || !props.apiKey.copyable) return
  copying.value = true
  try {
    const result = await api.post<{ key: string }>(`${props.admin ? '/api-keys' : '/me/api-keys'}/${props.apiKey.id}/reveal`, {})
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
  <div class="inline-flex items-center gap-1.5 whitespace-nowrap">
    <code class="font-mono text-xs">{{ apiKey.key_prefix }}…</code>
    <button v-if="allowed" type="button" class="rounded p-1 text-fg-muted hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40" :disabled="copying || !apiKey.copyable" :title="t(apiKey.copyable ? 'common.copy' : 'apikeys.legacyCopyHint')" :aria-label="t('common.copy')" data-testid="copy-api-key" @click.stop="copy">
      <SIcon name="copy" class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
