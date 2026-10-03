<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SEmpty, SGrid, SHint, SInput, SLink, SSpinner } from '@sub2api/ui'
import type { AccountType } from '@/api/types'
import { lt } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import PluginAvatar from '@/views/plugins/parts/PluginAvatar.vue'
import TrustBadge from '@/views/plugins/parts/TrustBadge.vue'
import AccountTypeEndpoints from './AccountTypeEndpoints.vue'
import PlatformBadges from '@/views/platforms/PlatformBadges.vue'
import { typeKey, useAccountTypes } from './accountTypes'

// Step 1 of "new account" (wireframe A.3 / CONTRACTS §18.4): one flat grid of
// compact cards, one per account type. Endpoints are collapsed by default.
const emit = defineEmits<{ (e: 'pick', t: AccountType): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const { grouped, loaded, load } = useAccountTypes()
load(true)

/** Flattened list of account types, keeping the per-plugin server order. */
const items = computed(() => grouped.value.flatMap((g) => g.types))

const search = ref('')
const filteredItems = computed(() => {
  const q = search.value.trim().toLocaleLowerCase()
  return items.value.filter(at => !q || [lt(at.label), lt(at.plugin_name), at.plugin_key, at.type, lt(at.description)].some(v => v?.toLocaleLowerCase().includes(q)))
})

const expanded = ref<Record<string, boolean>>({})
function toggle(at: AccountType) {
  const k = typeKey(at.plugin_key, at.type)
  expanded.value = { ...expanded.value, [k]: !expanded.value[k] }
}
const isOpen = (at: AccountType) => !!expanded.value[typeKey(at.plugin_key, at.type)]
</script>

<template>
  <div>
    <div v-if="!loaded" class="flex justify-center py-10"><SSpinner /></div>
    <SEmpty v-else-if="!items.length" :text="t('accounts.noTypes')" />
    <template v-else>
    <SInput v-model="search" class="mb-4" :placeholder="t('accounts.editorUi.searchTypes')" :aria-label="t('accounts.editorUi.searchTypes')" />
    <SEmpty v-if="!filteredItems.length" :text="t('common.noData')" />
    <SGrid v-else :gap="3" :lg-cols="3">
      <div
        v-for="at in filteredItems"
        :key="typeKey(at.plugin_key, at.type)"
        role="button"
        tabindex="0"
        class="card flex cursor-pointer flex-col gap-2 p-3 text-left transition hover:border-primary-300 hover:shadow-card-hover dark:hover:border-primary-700"
        :data-type="typeKey(at.plugin_key, at.type)"
        @click="emit('pick', at)"
        @keydown.enter.self.prevent="emit('pick', at)"
        @keydown.space.self.prevent="emit('pick', at)"
      >
        <div class="flex items-start gap-2">
          <PluginAvatar :name="lt(at.plugin_name) || at.plugin_key" :plugin-key="at.plugin_key" size="sm" />
          <div class="min-w-0 flex-1">
            <div class="truncate font-medium text-gray-900 dark:text-white">{{ lt(at.label) || at.type }}</div>
            <SHint size="xs" class="truncate">
              {{ lt(at.plugin_name) || at.plugin_key }}
              <span class="font-mono">{{ at.plugin_version ? `v${at.plugin_version}` : '' }}</span>
            </SHint>
          </div>
          <TrustBadge v-if="at.trust" :trust="at.trust" />
        </div>

        <div class="flex flex-wrap items-center gap-1 text-xs" data-testid="type-platforms">
          <PlatformBadges :items="at.platforms" :empty="'—'" />
        </div>

        <SHint v-if="at.description" size="xs" class="line-clamp-2">{{ lt(at.description) }}</SHint>

        <div class="mt-auto border-t border-gray-100 pt-2 dark:border-dark-700">
          <SLink
            as="button"
            class="text-xs"
            data-testid="type-endpoints-toggle"
            :aria-expanded="isOpen(at)"
            @click.stop="toggle(at)"
          >
            {{ t('accounts.endpointCount', { n: at.endpoints.length }) }}
            <span aria-hidden="true">{{ isOpen(at) ? '▴' : '▾' }}</span>
          </SLink>
          <div v-if="isOpen(at)" class="mt-1.5" @click.stop>
            <AccountTypeEndpoints :endpoints="at.endpoints" compact />
          </div>
        </div>
      </div>
    </SGrid>
    </template>
    <SHint class="mt-4">
      {{ t('accounts.noTypeHint') }}
      <SLink v-if="auth.has('plugin:market:read')" to="/market">{{ t('accounts.goMarket') }}</SLink>
    </SHint>
  </div>
</template>
