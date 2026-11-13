<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SButton, SDropdown, SHint, SSectionTitle } from '@sub2api/ui'
import UserListBadge from './UserListBadge.vue'
import UserRef from './UserRef.vue'
import WatchActions from './WatchActions.vue'
import { dt, enumLabel, num } from './format'
import { canManage, useModHost } from './host'
import { levelTone } from './tones'
import type { UserState, Watch } from './types'
import { coreUser } from './users'
import { userListOf, useUserLock } from './userLock'

// The record user's state now (new-api record-user-section): watch level,
// allowlist / blocklist, moderator, banned; manage users change the watch
// level inline and lock the user on a user list or unlock it (userLock.ts;
// lists-changed: reload the state). Moderators are never put on the watch
// list; a user on a user list keeps the level the list fixes.
// openable: the user links to the user detail drawer (open-user).
const props = defineProps<{ userId: number; state: UserState; openable?: boolean }>()
const emit = defineEmits<{
  (e: 'watch-changed', w: Watch | null): void
  (e: 'lists-changed'): void
  (e: 'show-user', id: number): void
  (e: 'open-user', id: number): void
}>()
const t = useModHost().t
const w = computed(() => props.state.watch)
const canWatch = computed(() => canManage() && !props.state.staff)
/** core account status and roles (when user:read is granted) */
const account = computed(() => coreUser(props.userId))
const lock = useUserLock(() => emit('lists-changed'))
const list = computed(() => userListOf(props.state))
const onLock = (key: string) => lock.run(props.userId, key, list.value)
</script>

<template>
  <div>
    <SSectionTitle tag="p">
      {{ t('userState.title') }}
      <template #actions>
        <SButton size="sm" variant="ghost" @click="emit('show-user', userId)">{{ t('watch.allRecords') }}</SButton>
      </template>
    </SSectionTitle>
    <div class="mod-user-state">
      <UserRef :user-id="userId" :link="openable" :title="openable ? t('events.openUser') : undefined" @click="emit('open-user', $event)" />
      <SBadge v-if="account?.status && account.status !== 'active'" tone="danger">{{ enumLabel('userStatus', account.status) }}</SBadge>
      <SBadge v-for="r in account?.roles || []" :key="r" tone="gray" size="xs">{{ r }}</SBadge>
      <SBadge v-if="state.staff" tone="purple">{{ t('userState.staff') }}</SBadge>
      <UserListBadge :allowlisted="state.allowlisted" :blocklisted="state.blocklisted" :locked="w?.locked" />
      <SBadge v-if="state.blocked" tone="danger">{{ state.blocked_until ? t('userState.bannedUntil', { time: dt(state.blocked_until) }) : t('userState.banned') }}</SBadge>
      <template v-if="w">
        <SBadge :tone="levelTone(w.level)">{{ t('userState.watching', { level: enumLabel('level', w.level) }) }}</SBadge>
        <SHint inline size="xs">
          {{ w.expires_at ? t('userState.until', { time: dt(w.expires_at) }) : t('watch.noExpiry') }} · {{ t('userState.violations', { n: num(w.violation_count) }) }}
        </SHint>
      </template>
      <SHint v-else-if="!state.staff" inline size="xs">{{ t('userState.notWatched') }}</SHint>
      <span v-if="canWatch" class="mod-ml-auto mod-inline mod-gap">
        <WatchActions :user-id="userId" :watch="w" :allowlisted="state.allowlisted" :blocklisted="state.blocklisted" @changed="emit('watch-changed', $event)" />
        <SDropdown :actions="lock.items(list)" :label="t('lock.menu')" @select="onLock" />
      </span>
    </div>
  </div>
</template>
