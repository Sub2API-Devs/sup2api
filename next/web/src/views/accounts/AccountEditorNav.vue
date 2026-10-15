<script setup lang="ts">
// Side column of the account editor: the account type and the sections
// (number, title, one-line summary, a dot when a field of it has an error).
import { useI18n } from 'vue-i18n'
import { SIcon, SStatusDot } from '@sub2api/ui'
import type { AccountType } from '@/api/types'
import { lt } from '@/i18n'
import PluginAvatar from '@/views/plugins/parts/PluginAvatar.vue'
import PlatformBadges from '@/views/platforms/PlatformBadges.vue'
import type { EditorSection } from './editorErrors'

defineProps<{
  accountType: AccountType | null
  sections: Array<{ key: EditorSection; icon: string; label: string; summary: string }>
  errors: Record<EditorSection, boolean>
}>()
const active = defineModel<EditorSection>({ required: true })
const { t } = useI18n()
</script>

<template>
  <aside class="space-y-3 self-start md:sticky md:top-0">
    <div v-if="accountType" class="hidden rounded-2xl border border-line bg-surface-2 p-3 md:block" data-testid="editor-type-card">
      <div class="flex items-center gap-2.5">
        <PluginAvatar :name="lt(accountType.plugin_name) || accountType.plugin_key" :plugin-key="accountType.plugin_key" :icon="accountType.icon" :asset-base="accountType.asset_base" size="md" />
        <div class="min-w-0">
          <div class="truncate text-sm font-semibold text-fg">{{ lt(accountType.label) || accountType.type }}</div>
          <div class="truncate text-xs text-fg-muted">
            {{ lt(accountType.plugin_name) || accountType.plugin_key }}<span v-if="accountType.plugin_version" class="font-mono"> · v{{ accountType.plugin_version }}</span>
          </div>
        </div>
      </div>
      <div v-if="accountType.platforms.length" class="mt-2.5 flex flex-wrap gap-1 text-xs">
        <PlatformBadges :items="accountType.platforms" />
      </div>
    </div>

    <nav :aria-label="t('accounts.editorUi.navigation')" class="flex gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
      <button
        v-for="(section, i) in sections"
        :key="section.key"
        type="button"
        :aria-pressed="active === section.key"
        :data-testid="`account-section-${section.key}`"
        class="group flex min-w-[11rem] shrink-0 items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors md:min-w-0"
        :class="active === section.key ? 'bg-primary-50 ring-1 ring-primary-200 dark:bg-primary-900/20 dark:ring-primary-800' : 'hover:bg-surface-2'"
        @click="active = section.key"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
          :class="active === section.key ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30' : 'bg-surface-2 text-fg-muted group-hover:text-fg'"
        >
          <SIcon :name="section.icon" class="h-4 w-4" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-1.5 text-sm font-medium" :class="active === section.key ? 'text-primary-700 dark:text-primary-300' : 'text-fg'">
            <span class="text-xs tabular-nums opacity-50">{{ i + 1 }}</span>
            {{ section.label }}
            <SStatusDot v-if="errors[section.key]" tone="danger" :label="t('accounts.editorUi.sectionHasErrors')" sr-only :title="t('accounts.editorUi.sectionHasErrors')" />
          </span>
          <span class="mt-0.5 block truncate text-xs text-fg-muted" :title="section.summary">{{ section.summary }}</span>
        </span>
      </button>
    </nav>
  </aside>
</template>
