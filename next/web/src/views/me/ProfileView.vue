<script setup lang="ts">
// Mine > Account: the caller's profile and preferences, and how they sign in
// (CONTRACTS §79).
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCard, SField, SInput, SPageHeader, SSegmented, toast } from '@sub2api/ui'
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'
import { currentLocale, setLocale, type Locale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import type { Me } from '@/api/types'
import { notifyError } from '@/utils/errors'
import AccessKeysCard from './AccessKeysCard.vue'
import PasskeysCard from './PasskeysCard.vue'
import SessionsCard from './SessionsCard.vue'
import TwoFactorCard from './TwoFactorCard.vue'

const { t } = useI18n()
const auth = useAuthStore()

const displayName = ref(auth.me?.display_name || '')
watch(() => auth.me?.display_name, (v) => (displayName.value = v || ''))
const saving = ref(false)
async function save() {
  saving.value = true
  try {
    auth.me = await api.put<Me>('/me', { display_name: displayName.value })
    toast(t('common.saved'), 'success')
  } catch (e) {
    notifyError(e)
  } finally {
    saving.value = false
  }
}

const locale = ref<Locale>(currentLocale())
watch(locale, setLocale)
const pwdOpen = ref(false)
</script>

<template>
  <div class="flex flex-col gap-4">
    <SPageHeader :title="t('me.profile.title')" :description="t('me.profile.description')" />
    <SCard :title="t('me.profile.basics')" padded data-testid="profile-basics">
      <form class="grid max-w-2xl gap-4 sm:grid-cols-2" @submit.prevent="save">
        <SField :label="t('me.profile.email')"><SInput :model-value="auth.me?.email || ''" disabled /></SField>
        <SField :label="t('me.profile.displayName')"><SInput v-model="displayName" :maxlength="100" data-testid="profile-name" /></SField>
        <SField :label="t('me.profile.roles')">
          <div class="flex min-h-8 flex-wrap items-center gap-1">
            <SBadge v-for="r in auth.me?.roles || []" :key="r" tone="gray">{{ r }}</SBadge>
          </div>
        </SField>
        <SField :label="t('me.profile.language')">
          <SSegmented v-model="locale" size="sm" :aria-label="t('me.profile.language')" :options="[{ value: 'zh', label: '中文' }, { value: 'en', label: 'English' }]" />
        </SField>
        <div class="sm:col-span-2">
          <SButton type="submit" variant="primary" size="sm" :loading="saving" :disabled="displayName === (auth.me?.display_name || '')" data-testid="profile-save">{{ t('common.save') }}</SButton>
        </div>
      </form>
    </SCard>
    <SCard :title="t('me.password.title')" :subtitle="t('me.password.description')" :padded="false">
      <template #actions><SButton size="sm" icon="lock" data-testid="profile-password" @click="pwdOpen = true">{{ t('nav.changePassword') }}</SButton></template>
    </SCard>
    <TwoFactorCard />
    <PasskeysCard />
    <SessionsCard />
    <AccessKeysCard />
    <ChangePasswordDialog v-model:open="pwdOpen" />
  </div>
</template>
