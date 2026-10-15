<script setup lang="ts">
import { SButton, SCard, SEmpty, SSpinner } from '@sub2api/ui'
import { useGrowthHost } from './host'

// First-load states of a useRemote resource: spinner, then the error with a
// retry; the default slot once data is there.
defineProps<{ loading: boolean; error: string; ready: boolean }>()
const emit = defineEmits<{ (e: 'retry'): void }>()
const host = useGrowthHost()
</script>

<template>
  <SSpinner v-if="loading && !ready" block />
  <SCard v-else-if="error && !ready" class="growth-page">
    <SEmpty icon="warning" :text="error">
      <template #actions>
        <SButton size="sm" @click="emit('retry')">{{ host.t('retry') }}</SButton>
      </template>
    </SEmpty>
  </SCard>
  <slot v-else />
</template>
