<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SHint } from '@sub2api/ui'
import GroupBadge from '@/components/platform/GroupBadge.vue'

// An account's groups as badges, each tinted by the platform its group
// serves (when the groups lookup knows them): the first two, then "+N";
// the title lists every name.
const props = defineProps<{ groups: { id: number; name: string; platforms?: string[] | null }[] }>()
const MAX = 2
const title = computed(() => props.groups.map(g => g.name).join(', '))
</script>

<template>
  <div class="flex max-w-56 items-center gap-1" :title="title" data-testid="account-groups">
    <!-- `!`: the badge's own max-w-full comes later in the stylesheet and would win. -->
    <GroupBadge v-for="g in groups.slice(0, MAX)" :key="g.id" :name="g.name" :platforms="g.platforms" class="!max-w-40" />
    <SBadge v-if="groups.length > MAX" tone="gray">+{{ groups.length - MAX }}</SBadge>
    <SHint v-if="!groups.length" size="xs">—</SHint>
  </div>
</template>
