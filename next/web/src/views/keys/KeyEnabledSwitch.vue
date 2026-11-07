<script setup lang="ts">
// The on/off switch of an API key: beside the row actions in the table,
// beside the status on a phone card.
import { useI18n } from 'vue-i18n'
import { SSwitch } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'

defineProps<{ apiKey: ApiKey; disabled?: boolean }>()
defineEmits<{ (e: 'change', on: boolean): void }>()
const { t } = useI18n()
</script>

<template>
  <SSwitch
    :model-value="apiKey.status === 'active'"
    :disabled="disabled"
    :aria-label="t(apiKey.status === 'active' ? 'common.disable' : 'common.enable')"
    :title="t(apiKey.status === 'active' ? 'common.disable' : 'common.enable')"
    data-testid="key-enabled-switch"
    @update:model-value="$emit('change', $event)"
  />
</template>
