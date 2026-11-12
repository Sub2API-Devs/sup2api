<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SIcon } from '@sub2api/ui'
import { useModHost } from './host'
import { userListOf } from './userLock'

// The user list of the settings a user is on (0.8.0): allowlist = only
// moderated after the request, never refused; blocklist = always moderated
// first. A user on both lists is blocklisted (the API then reports only
// that). locked: the user's watch entry is locked (0.10.0, userLock.ts): a
// lock icon, and the tooltip says the level is fixed; an entry still locked
// after the user left the lists (unlocked shortly) shows the lock alone.
const props = defineProps<{ allowlisted?: boolean; blocklisted?: boolean; locked?: boolean; size?: 'xs' | 'sm' }>()
const t = useModHost().t
const list = computed(() => userListOf(props))
const title = computed(() => [...(list.value ? [t(`lists.hint.${list.value}`)] : []), ...(props.locked ? [t('lock.fixed')] : [])].join(' · '))
</script>

<template>
  <SBadge v-if="list || locked" :tone="list === 'blocklist' ? 'danger' : list ? 'success' : 'gray'" :size="size" :title="title">
    <SIcon v-if="locked" name="lock" class="mod-lock-icon" />{{ list ? t(`lists.name.${list}`) : t('lock.badge') }}
  </SBadge>
</template>
