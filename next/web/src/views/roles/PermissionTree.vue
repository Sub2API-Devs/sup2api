<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SCheckbox, SEmpty, SHint, SIcon, SSectionTitle } from '@sub2api/ui'
import type { PermissionItem, PermissionModule } from '@/api/types'
import { lt } from '@/i18n'

// Permission checkboxes of a role, one collapsible block per module (core
// modules first, then plugin modules). `allGranted` (superuser) ticks
// everything; changes are emitted as a new set.
const props = defineProps<{ modules: PermissionModule[]; granted: Set<string>; allGranted?: boolean; readOnly?: boolean }>()
const emit = defineEmits<{ (e: 'update:granted', v: Set<string>): void }>()
const { t } = useI18n()

const groups = computed(() => [props.modules.filter((m) => m.source !== 'plugin'), props.modules.filter((m) => m.source === 'plugin')])
const collapsed = ref(new Set<string>())

function flip<T>(set: Set<T>, key: T, on = !set.has(key)): Set<T> {
  const next = new Set(set)
  if (on) next.add(key)
  else next.delete(key)
  return next
}

const isChecked = (key: string) => !!props.allGranted || props.granted.has(key)
const grantedCount = (m: PermissionModule) => m.permissions.filter((p) => isChecked(p.key)).length
const inactive = (status: string) => status !== 'active' && status !== ''
const moduleInactive = (m: PermissionModule) => inactive(m.status)
const permInactive = (m: PermissionModule, p: PermissionItem) => moduleInactive(m) || inactive(p.status)

function moduleState(m: PermissionModule): 'all' | 'some' | 'none' {
  const n = grantedCount(m)
  if (n === 0) return 'none'
  return n === m.permissions.length ? 'all' : 'some'
}

function toggle(key: string) {
  if (!props.readOnly) emit('update:granted', flip(props.granted, key))
}

function toggleModule(m: PermissionModule) {
  if (props.readOnly) return
  const on = moduleState(m) !== 'all'
  emit('update:granted', m.permissions.reduce((s, p) => flip(s, p.key, on), props.granted))
}
</script>

<template>
  <div>
    <SSectionTitle :title="t('roles.permissions')" />
    <SEmpty v-if="!modules.length" :text="t('roles.noPermissions')" />
    <div class="space-y-2">
      <template v-for="(group, gi) in groups" :key="gi">
        <div v-if="gi === 1 && group.length" class="flex items-center gap-3 py-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
          <span class="h-px flex-1 bg-line" />
          {{ t('roles.pluginPermissions') }}
          <span class="h-px flex-1 bg-line" />
        </div>
        <div v-for="m in group" :key="m.module" class="rounded-xl border border-line" :class="moduleInactive(m) ? 'opacity-60' : ''">
          <div class="flex items-center gap-3 px-3 py-2">
            <button type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left" :aria-expanded="!collapsed.has(m.module)" @click="collapsed = flip(collapsed, m.module)">
              <SIcon :name="collapsed.has(m.module) ? 'chevron-right' : 'chevron-down'" class="h-4 w-4 shrink-0 text-fg-subtle" />
              <span class="truncate text-sm font-medium text-fg">{{ lt(m.label) || m.module }}</span>
              <SHint inline size="xs" class="hidden font-mono sm:inline">{{ m.module }}</SHint>
              <SBadge v-if="m.source === 'plugin' && m.status === 'disabled'" tone="warning">{{ t('roles.pluginDisabled') }}</SBadge>
              <SBadge v-else-if="m.status === 'removed'" tone="gray">{{ t('roles.removed') }}</SBadge>
              <SHint inline size="xs" class="ml-auto shrink-0">{{ grantedCount(m) }}/{{ m.permissions.length }}</SHint>
            </button>
            <SCheckbox
              size="xs"
              class="shrink-0"
              :model-value="moduleState(m) === 'all'"
              :indeterminate="moduleState(m) === 'some'"
              :disabled="readOnly || !m.permissions.length"
              :label="t('roles.selectAll')"
              @update:model-value="toggleModule(m)"
            />
          </div>
          <div v-if="!collapsed.has(m.module)" class="grid gap-x-4 gap-y-2 border-t border-line px-3 py-3 sm:grid-cols-2 xl:grid-cols-3">
            <!-- SCheckbox's own text span fixes the colour, so the inactive tone goes on the
                 slot content; [&>span]:min-w-0 lets the truncate inside shrink. -->
            <SCheckbox
              v-for="p in m.permissions"
              :key="p.key"
              class="min-w-0 [&>span]:min-w-0"
              :model-value="isChecked(p.key)"
              :disabled="readOnly"
              @update:model-value="toggle(p.key)"
            >
              <span class="flex min-w-0 items-center gap-2" :class="permInactive(m, p) ? 'text-fg-subtle' : ''" :title="p.key">
                <span class="truncate">{{ lt(p.label) || p.key }}</span>
                <span v-if="p.sensitive" class="shrink-0 text-warning-500 dark:text-warning-400" :title="t('roles.sensitive')" :aria-label="t('roles.sensitive')" role="img"><SIcon name="lock" class="h-3.5 w-3.5" /></span>
                <SBadge v-if="p.status === 'disabled' && !moduleInactive(m)" tone="warning">{{ t('roles.pluginDisabled') }}</SBadge>
              </span>
            </SCheckbox>
          </div>
        </div>
      </template>
    </div>
    <SHint size="xs" class="mt-3 flex items-center gap-1">
      <SIcon name="lock" class="h-3.5 w-3.5 text-warning-500 dark:text-warning-400" />{{ t('roles.sensitiveLegend') }}
    </SHint>
  </div>
</template>
