<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SEmpty, SSpinner } from '@sub2api/ui'
import type { AccountType } from '@/api/types'
import { lt } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import PluginAvatar from '@/views/plugins/parts/PluginAvatar.vue'
import TrustBadge from '@/views/plugins/parts/TrustBadge.vue'
import AccountTypeEndpoints from './AccountTypeEndpoints.vue'
import PlatformBadges from '@/views/platforms/PlatformBadges.vue'
import { useAccountTypes } from './accountTypes'

// Step 1 of "new account" (wireframe A.3): account types of all enabled
// plugins, grouped by plugin, with the platforms each type supports and the
// endpoints it can serve (grouped by platform).
const emit = defineEmits<{ (e: 'pick', t: AccountType): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const { grouped, loaded, load } = useAccountTypes()
load(true)
</script>

<template>
  <div>
    <div v-if="!loaded" class="flex justify-center py-10"><SSpinner /></div>
    <SEmpty v-else-if="!grouped.length" :text="t('accounts.noTypes')" />
    <div v-else class="space-y-5">
      <section v-for="g in grouped" :key="g.plugin_key">
        <header class="mb-2 flex flex-wrap items-center gap-2">
          <PluginAvatar :name="lt(g.plugin_name) || g.plugin_key" :plugin-key="g.plugin_key" size="sm" />
          <span class="font-medium text-gray-900 dark:text-white">{{ lt(g.plugin_name) || g.plugin_key }}</span>
          <span class="muted font-mono text-xs">{{ g.plugin_key }}{{ g.plugin_version ? ` v${g.plugin_version}` : '' }}</span>
          <TrustBadge v-if="g.trust" :trust="g.trust" />
        </header>
        <div class="grid gap-3 sm:grid-cols-2">
          <button
            v-for="at in g.types"
            :key="`${at.plugin_key}/${at.type}`"
            type="button"
            class="card flex flex-col items-stretch gap-2 p-4 text-left transition hover:border-primary-300 hover:shadow-card-hover dark:hover:border-primary-700"
            :data-type="`${at.plugin_key}/${at.type}`"
            @click="emit('pick', at)"
          >
            <span>
              <span class="font-medium text-gray-900 dark:text-white">{{ lt(at.label) || at.type }}</span>
              <span class="muted ml-2 font-mono text-xs">{{ at.type }}</span>
            </span>
            <span v-if="at.description" class="block text-xs text-gray-500 dark:text-dark-400">{{ lt(at.description) }}</span>
            <span class="flex flex-wrap items-center gap-1 text-xs" data-testid="type-platforms">
              <span class="muted">{{ t('platforms.supported') }}:</span>
              <PlatformBadges :items="at.platforms" :empty="'—'" />
            </span>
            <span class="block border-t border-gray-100 pt-2 dark:border-dark-700">
              <span class="muted mb-1 block text-xs">{{ t('accounts.servesEndpoints') }}</span>
              <AccountTypeEndpoints :endpoints="at.endpoints" compact />
            </span>
          </button>
        </div>
      </section>
    </div>
    <p class="mt-4 text-sm text-gray-500 dark:text-dark-400">
      {{ t('accounts.noTypeHint') }}
      <RouterLink v-if="auth.has('plugin:market:read')" to="/market" class="link">{{ t('accounts.goMarket') }}</RouterLink>
    </p>
  </div>
</template>
