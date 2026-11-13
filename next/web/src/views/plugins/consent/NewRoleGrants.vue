<script setup lang="ts">
// The role grants of a plugin's new permissions (CONTRACTS P4C): on the
// consent page those the approval makes, on the plugin page those a built-in
// upgrade held back for review. A grant that needs confirmation (a sensitive
// permission, or a role other than admin, operator and supplier) is marked.
import { useI18n } from 'vue-i18n'
import { SAlert, SBadge, SCard, SHint, SIcon } from '@sub2api/ui'
import type { PluginRoleGrant } from '@/api/types'
import { lt } from '@/i18n'
import { useAssignableRoles } from '@/composables/useAssignableRoles'

withDefaults(defineProps<{ grants: PluginRoleGrant[]; needConsent?: boolean; title?: string; hint?: string }>(), { needConsent: false, title: undefined, hint: undefined })
const { t } = useI18n()
const managed = useAssignableRoles()
const roleName = (key: string) => lt(managed.get(key)?.name) || key
</script>

<template>
  <SCard v-if="grants.length" :title="title || t('plugins.consent.roleGrantsTitle')" data-testid="new-role-grants">
    <SAlert v-if="needConsent" tone="warning" class="mb-3" data-testid="role-grants-need-consent">{{ t('plugins.consent.roleGrantsNeedConsent') }}</SAlert>
    <SHint size="xs" class="mb-2">{{ hint || t('plugins.consent.roleGrantsHint') }}</SHint>
    <ul class="space-y-1 text-sm">
      <li
        v-for="g in grants"
        :key="`${g.version || ''}/${g.permission}/${g.role}`"
        class="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1"
        :class="g.needs_consent ? 'bg-orange-50 dark:bg-orange-900/20' : ''"
        :data-needs-consent="g.needs_consent || undefined"
      >
        <span class="font-mono text-xs">{{ g.permission }}</span>
        <SIcon name="chevron-right" class="h-3 w-3 text-gray-400" />
        <SBadge tone="primary">{{ roleName(g.role) }}</SBadge>
        <SIcon v-if="g.sensitive" name="lock" class="h-3 w-3 text-orange-500" />
        <SHint inline size="xs">{{ g.via === 'inherit' ? t('plugins.consent.viaInherit') : t('plugins.consent.viaDefault') }}</SHint>
        <SHint v-if="g.version" inline size="xs" class="font-mono">v{{ g.version }}</SHint>
        <SBadge v-if="g.needs_consent" tone="warning">{{ t('plugins.consent.needsConsent') }}</SBadge>
      </li>
    </ul>
    <slot name="actions" />
  </SCard>
</template>
