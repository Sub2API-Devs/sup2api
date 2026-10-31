<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { SBadge, SHint } from '@sub2api/ui'
import { enumLabel, levelTone, useModHost, type ModEventDetail, type Watch } from '../host'
import { groupName, loadGroups } from '../directory'
import UserCell from './UserCell.vue'
import WatchActions from './WatchActions.vue'

// Who sent the request and the user's state now (GET /events/:id user):
// watch list entry, exempt, staff, blocked; manage users change the watch
// list entry right here.
const props = defineProps<{ event: ModEventDetail }>()
const emit = defineEmits<{ (e: 'watch-changed', w: Watch | null): void }>()
const host = useModHost()
const t = host.t
onMounted(loadGroups)
const u = computed(() => props.event.user)
const w = computed(() => u.value?.watch || null)
const expiry = computed(() => (w.value?.expires_at ? t('pagesP3.user.until', { time: host.i18n.formatDateTime(w.value.expires_at) }) : t('watch.noExpiry')))
</script>

<template>
  <div class="mod-pg-card">
    <dl class="mod-pg-dl">
      <dt>{{ t('detail.f.user') }}</dt>
      <dd><UserCell :id="event.user_id" /></dd>
      <dt>{{ t('detail.f.group') }}</dt>
      <dd>{{ groupName(event.group_id) }}<span v-if="event.api_key_id" class="mod-sub"> · {{ t('detail.f.key') }} #{{ event.api_key_id }}</span></dd>
      <dt>{{ t('events.watch') }}</dt>
      <dd class="mod-pg-state">
        <template v-if="w">
          <SBadge :tone="levelTone(w.level)">{{ enumLabel('level', w.level) }}</SBadge>
          <span class="mod-sub">{{ enumLabel('watchSource', w.source) }} · {{ expiry }}</span>
          <SBadge v-if="w.hits_since_seen" size="xs" tone="warning">{{ t('pagesP3.watch.newN', { n: w.hits_since_seen }) }}</SBadge>
        </template>
        <SHint v-else-if="u" inline size="xs">{{ t('pagesP3.user.notWatched') }}</SHint>
        <SHint v-else inline size="xs">—</SHint>
        <SBadge v-if="u?.blocked" tone="danger" dot>{{ t('pagesP3.user.blocked') }}</SBadge>
        <SBadge v-if="u?.exempt" tone="info">{{ t('pagesP3.user.exemptBadge') }}</SBadge>
        <SBadge v-if="u?.staff" tone="purple">{{ t('pagesP3.user.staffBadge') }}</SBadge>
      </dd>
    </dl>
    <div v-if="u && event.user_id" class="mod-pg-card-actions">
      <WatchActions :user-id="event.user_id" :watch="w" :staff="u.staff" :exempt="u.exempt" @changed="emit('watch-changed', $event)" />
    </div>
  </div>
</template>

<style scoped>
.mod-pg-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid rgb(var(--line));
  border-radius: 0.5rem;
}
.mod-pg-dl {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.5rem 1rem;
  margin: 0;
  font-size: 0.875rem;
}
.mod-pg-dl dt {
  color: rgb(var(--fg-muted));
}
.mod-pg-dl dd {
  margin: 0;
}
.mod-pg-state {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}
.mod-pg-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
