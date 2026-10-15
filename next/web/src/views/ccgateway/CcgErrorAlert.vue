<script setup lang="ts">
// A failed CCGateway step or call: danger notice with the translated cause
// ("Reason: …"). The default slot replaces the cause; #actions holds the
// recovery buttons. data-testid / data-reason fall through to the notice.
import { useI18n } from 'vue-i18n'
import { SAlert } from '@sub2api/ui'

defineProps<{ title?: string; detail?: string }>()
const { t } = useI18n()
</script>

<template>
  <SAlert tone="danger" dense :title="title">
    <slot><span v-if="detail" class="break-all">{{ t('ccgateway.accountAuth.reason', { message: detail }) }}</span></slot>
    <template v-if="$slots.actions" #actions><slot name="actions" /></template>
  </SAlert>
</template>
