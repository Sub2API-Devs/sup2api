<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SHint, SSelect } from '@sub2api/ui'
import CCGatewayAccountAuth from './CCGatewayAccountAuth.vue'
const { t } = useI18n()
const accounts = ref<Array<{ value: number; label: string; type: string }>>([])
const selected = ref<number | null>(null), error = ref('')
const apiKeyMode = computed(() => accounts.value.find(a => a.value === selected.value)?.type === 'apikey')
onMounted(async () => {
  try {
    const r = await api.list<{ id: number; name: string; type: string }>('/accounts', { plugin_key: 'ccgateway', page_size: 200 })
    accounts.value = r.items.map(a => ({ value: a.id, label: `${a.name} #${a.id}`, type: a.type }))
    selected.value = accounts.value[0]?.value ?? null
  } catch {
    error.value = t('ccgateway.runtime.failed')
  }
})
</script>
<template>
  <SCard :title="t('ccgateway.runtime.title')">
    <div class="space-y-4">
      <SHint>{{ t('ccgateway.runtime.hint') }}</SHint>
      <SHint tone="warning">{{ t('ccgateway.runtime.switchHint') }}</SHint>
      <SButton to="/accounts">{{ t('ccgateway.auth.accounts') }}</SButton>
      <SSelect v-model="selected" :options="accounts" :placeholder="t('ccgateway.runtime.select')" />
      <SHint v-if="error" tone="danger">{{ error }}</SHint>
      <CCGatewayAccountAuth v-if="selected" :account-id="selected" :api-key-mode="apiKeyMode" />
    </div>
  </SCard>
</template>
