<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SHint } from '@sub2api/ui'
import GroupBadge from '@/components/platform/GroupBadge.vue'

// Group of an API key as a badge of the platforms the key can access
// (CONTRACTS §13) and its rate multiplier. `platforms` undefined: the server
// did not report them; empty: the key reaches no platform. `status` other
// than active says why the group cannot serve the key (deleted, disabled,
// no longer open to the owner); the owner then picks another group.
const props = defineProps<{ name: string; multiplier?: string | number; platforms?: string[] | null; status?: string }>()
const { t } = useI18n()
const problem = computed(() => (props.status && props.status !== 'active' ? `apikeys.groupState.${props.status}` : ''))
</script>

<template>
  <div class="flex min-w-0 max-w-72 items-center gap-2 whitespace-nowrap" data-testid="key-group">
    <GroupBadge v-if="status !== 'deleted'" :name="name" :platforms="platforms" :rate="multiplier" />
    <SHint v-if="problem" inline tone="danger" size="xs" data-testid="key-group-problem">{{ t(problem) }}</SHint>
    <SHint v-else-if="platforms && !platforms.length" inline tone="warning" size="xs">{{ t('platforms.keyNoPlatforms') }}</SHint>
  </div>
</template>
