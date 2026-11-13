<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SIcon } from '@sub2api/ui'
import { useModHost } from './host'
import { userListOf } from './userLock'

// The user list a user is on (0.8.0): allowlist = only moderated after the
// request, never refused; blocklist = always moderated first. locked: the
// user's watch entry is locked (0.10.0, userLock.ts): a lock icon, and the
// tooltip says the level is fixed.
const props = defineProps<{ allowlisted?: boolean; blocklisted?: boolean; locked?: boolean; size?: 'xs' | 'sm' }>()
const t = useModHost().t
const list = computed(() => userListOf(props))
const title = computed(() => [t(`lists.hint.${list.value}`), ...(props.locked ? [t('lock.fixed')] : [])].join(' · '))
</script>

<template>
  <SBadge v-if="list" :tone="list === 'blocklist' ? 'danger' : 'success'" :size="size" :title="title">
    <SIcon v-if="locked" name="lock" class="mod-lock-icon" />{{ t(`lists.name.${list}`) }}
  </SBadge>
</template>
