<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { SButton, SField, SInput, SModal, SSelect, SSwitch } from '@sub2api/ui'
import { DEFAULT_CHANNEL_TIMEOUT_MS } from './flowOps'
import { applyFieldErrors, clearErrors, type FieldErrors } from './forms'
import { channelBody, errorMessage, saveChannel, useModHost, type Channel, type ChannelType, type Protocol } from './host'

// Creates or edits a channel (channel null = new). The key is write-only and
// kept when left empty; the proxy is shown without its password and sent
// only when changed.
const props = defineProps<{ channel: Channel | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ (e: 'saved'): void }>()
const host = useModHost()
const t = host.t

const PROTOCOLS: Protocol[] = ['openai_chat', 'openai_responses', 'anthropic']
const DEFAULT_MODEL: Record<ChannelType, string> = { openai_moderation: 'omni-moderation-latest', typesafe: 'jev-latest', llm: '' }
const typeOptions = computed(() => (['openai_moderation', 'typesafe', 'llm'] as ChannelType[]).map((v) => ({ value: v, label: t(`channelType.${v}`) })))
const protocolOptions = computed(() => PROTOCOLS.map((v) => ({ value: v, label: t(`protocol.${v}`) })))

const form = reactive({
  type: 'openai_moderation' as ChannelType,
  protocol: 'openai_chat' as Protocol,
  name: '',
  base_url: '',
  api_key: '',
  model: '',
  billing_model: '',
  timeout_ms: null as number | null,
  enabled: true,
  proxy: ''
})
const errs = reactive<FieldErrors>({})
const saving = ref(false)
const defaultTimeout = computed(() => DEFAULT_CHANNEL_TIMEOUT_MS[form.type])

watch(open, (v) => {
  if (!v) return
  const c = props.channel
  clearErrors(errs)
  Object.assign(form, {
    type: c?.type || 'openai_moderation',
    protocol: c && (PROTOCOLS as string[]).includes(c.protocol) ? c.protocol : 'openai_chat',
    name: c?.name || '',
    base_url: c?.base_url || '',
    api_key: '',
    model: c?.model || '',
    billing_model: c?.billing_model || '',
    timeout_ms: c?.timeout_ms ?? null,
    enabled: c?.enabled ?? true,
    proxy: c?.proxy || ''
  })
})

async function save() {
  clearErrors(errs)
  saving.value = true
  try {
    const body = channelBody({ ...form, timeout_ms: Number(form.timeout_ms) || 0, billing_model: form.billing_model.trim() })
    if (form.api_key.trim()) body.api_key = form.api_key.trim()
    // proxy: sent only when changed ('' removes it); the shown value has its password redacted.
    if (form.proxy.trim() !== (props.channel?.proxy || '')) body.proxy = form.proxy.trim()
    await saveChannel(props.channel?.id ?? null, body)
    host.toast(t('saved'), 'success')
    open.value = false
    emit('saved')
  } catch (e) {
    if (!applyFieldErrors(errs, e)) host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SModal v-model:open="open" :title="channel ? t('channels.editTitle', { name: channel.name }) : t('channels.add')" width="lg">
    <form class="mod-form" @submit.prevent="save">
      <SField :label="t('channels.col.type')" :error="errs.type" :hint="channel ? t('channels.typeFixed') : t(`channelTypeHint.${form.type}`)">
        <SSelect v-model="form.type" :options="typeOptions" :disabled="!!channel" />
      </SField>
      <SField v-if="form.type === 'llm'" :label="t('channels.protocol')" :error="errs.protocol" :hint="t('channels.protocolHint')">
        <SSelect v-model="form.protocol" :options="protocolOptions" />
      </SField>
      <SField :label="t('channels.col.name')" required :error="errs.name">
        <SInput v-model="form.name" :maxlength="64" />
      </SField>
      <SField :label="t('channels.col.baseUrl')" required :error="errs.base_url" :hint="t('channels.baseUrlHint')">
        <SInput v-model="form.base_url" placeholder="https://api.openai.com" />
      </SField>
      <SField :label="t('channels.apiKey')" :error="errs.api_key" :hint="channel?.has_key ? t('channels.keepKey', { tail: channel.api_key_tail }) : ''">
        <SInput v-model="form.api_key" type="password" autocomplete="off" />
      </SField>
      <SField :label="t('channels.col.model')" :error="errs.model" :required="form.type === 'llm'">
        <SInput v-model="form.model" :placeholder="DEFAULT_MODEL[form.type] || 'gpt-4o-mini'" />
      </SField>
      <SField v-if="form.type !== 'openai_moderation'" :label="t('channels.billingModel')" :error="errs.billing_model" :hint="t('channels.billingModelHint')">
        <SInput v-model="form.billing_model" :maxlength="128" :placeholder="form.model || DEFAULT_MODEL[form.type] || ''" />
      </SField>
      <SField :label="t('channels.col.timeout')" :error="errs.timeout_ms" :hint="t('channels.timeoutHint', { n: defaultTimeout })">
        <SInput v-model="form.timeout_ms" type="number" min="500" max="60000" step="100" :placeholder="String(defaultTimeout)" />
      </SField>
      <SField :label="t('channels.proxy')" :error="errs.proxy" :hint="channel?.has_key ? t('channels.proxyKeyHint') : t('channels.proxyHint')">
        <SInput v-model="form.proxy" autocomplete="off" placeholder="socks5://user:pass@host:1080" />
      </SField>
      <SField :label="t('channels.col.enabled')">
        <SSwitch v-model="form.enabled" />
      </SField>
    </form>
    <template #footer>
      <SButton @click="open = false">{{ host.i18n.t('ui.cancel') }}</SButton>
      <SButton variant="primary" :loading="saving" @click="save">{{ t('save') }}</SButton>
    </template>
  </SModal>
</template>
