<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SPageHeader } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import AdminDashboard from './AdminDashboard.vue'
import UserDashboard from './UserDashboard.vue'

// The landing page: the operator's dashboard with usage:all:read, the
// user's own otherwise (design §4.1 / §4.4).
const { t } = useI18n()
const auth = useAuthStore()
const admin = computed(() => auth.has('usage:all:read'))
const revision = ref(0)
const loading = ref(false)
</script>

<template>
  <div>
    <SPageHeader :title="t('dashboard.title')" :description="t('dashboard.welcome', { name: auth.me?.display_name || auth.me?.email || '' })">
      <template #actions>
        <SButton :loading="loading" icon="refresh" @click="revision++">{{ t('common.refresh') }}</SButton>
      </template>
    </SPageHeader>
    <AdminDashboard v-if="admin" :revision="revision" @update:loading="loading = $event" />
    <UserDashboard v-else :revision="revision" @update:loading="loading = $event" />
  </div>
</template>
