<script setup lang="ts">
// Header passthrough rules (CONTRACTS §81): names, `*` or `regex:` patterns;
// the v-model is the account's `header_passthrough`. Credential and hop-by-hop
// headers are refused by the server whatever the rules say.
import { useI18n } from 'vue-i18n'
import { STagInput } from '@sub2api/ui'

const model = defineModel<string[]>({ required: true })
defineProps<{ disabled?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <STagInput :model-value="model ?? []" :placeholder="t('accounts.headerPassthrough.placeholder')" :disabled="disabled" @update:model-value="model = $event" />
</template>
