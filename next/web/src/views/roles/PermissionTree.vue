<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { flip } from './flip'
import { SBadge, SCheckbox, SEmpty, SHint, SIcon, SSectionTitle } from '@sub2api/ui'
import type { PermissionItem, PermissionModule } from '@/api/types'
import { lt } from '@/i18n'
import { ALL_SCOPE, parsePermission, type Scope, type ScopeResource } from '@/authz/implies'
import { defaultScopes, offerOf, withScopes } from '@/authz/scopeChoice'
import ScopePicker from './ScopePicker.vue'

// Permission checkboxes of a role, one collapsible block per module (core
// modules first, then plugin modules). `allGranted` (superuser) ticks
// everything; changes are emitted as a new set. Permissions marked step_up
// carry a shield: using them needs a step-up verification each time.
// A scoped action (scope_type, CONTRACTS §21) is one row; ticked, its scopes
// open below it (ScopePicker), offered as far as `scopeLimit` (the editor's
// own scopes of the action) implies; without it everything is offered.
const props = defineProps<{ modules: PermissionModule[]; granted: Set<string>; allGranted?: boolean; readOnly?: boolean; scopeLimit?: (action: string) => Scope[] }>()
const emit = defineEmits<{ (e: 'update:granted', v: Set<string>): void }>()
const { t } = useI18n()

const anyStepUp = computed(() => props.modules.some((m) => m.permissions.some((p) => p.step_up)))
const groups = computed(() => [props.modules.filter((m) => m.source !== 'plugin'), props.modules.filter((m) => m.source === 'plugin')])
const collapsed = ref(new Set<string>())
/** Scoped actions whose scopes stay open while none is chosen (the editor is choosing). */
const opened = ref(new Set<string>())

const scoped = (p: PermissionItem) => !!p.scope_type
/** The granted scopes of each action. */
const grantedScopes = computed(() => {
  const out = new Map<string, Scope[]>()
  for (const k of props.granted) {
    const p = parsePermission(k)
    if (p) out.set(p.action, [...(out.get(p.action) ?? []), p.scope])
  }
  return out
})
const scopesOf = (key: string) => grantedScopes.value.get(key) ?? []
const offerFor = (key: string) => offerOf(props.scopeLimit ? props.scopeLimit(key) : [ALL_SCOPE])
const isChecked = (key: string) => !!props.allGranted || props.granted.has(key) || scopesOf(key).length > 0
const showScopes = (p: PermissionItem) => scoped(p) && !props.allGranted && (isChecked(p.key) || opened.value.has(p.key))

/** granted with p on or off; a scoped action goes on at its widest offered scope. */
function withItem(granted: Set<string>, p: PermissionItem, on: boolean): Set<string> {
  if (!scoped(p)) return flip(granted, p.key, on)
  if (on && isChecked(p.key)) return granted
  if (on) opened.value = flip(opened.value, p.key, true)
  return withScopes(granted, p.key, on ? defaultScopes(offerFor(p.key)) : [])
}
const grantedCount = (m: PermissionModule) => m.permissions.filter((p) => isChecked(p.key)).length
const inactive = (status: string) => status !== 'active' && status !== ''
const moduleInactive = (m: PermissionModule) => inactive(m.status)
const permInactive = (m: PermissionModule, p: PermissionItem) => moduleInactive(m) || inactive(p.status)
// A removed permission can only be unticked; disabled plugin ones stay selectable.
const selectable = (p: PermissionItem) => p.status !== 'removed' || isChecked(p.key)
const selectables = (m: PermissionModule) => m.permissions.filter(selectable)

// Ticked permissions are always selectable, so "all" means every selectable one.
function moduleState(m: PermissionModule): 'all' | 'some' | 'none' {
  const n = grantedCount(m)
  if (n === 0) return 'none'
  return n === selectables(m).length ? 'all' : 'some'
}

function toggle(p: PermissionItem) {
  if (props.readOnly || !selectable(p)) return
  const on = !isChecked(p.key)
  if (!on) opened.value = flip(opened.value, p.key, false)
  emit('update:granted', withItem(props.granted, p, on))
}

function toggleModule(m: PermissionModule) {
  if (props.readOnly) return
  const on = moduleState(m) !== 'all'
  emit('update:granted', selectables(m).reduce((s, p) => withItem(s, p, on), props.granted))
}

function setScopes(p: PermissionItem, scopes: Scope[]) {
  emit('update:granted', withScopes(props.granted, p.key, scopes))
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
              :disabled="readOnly || !selectables(m).length"
              :label="t('roles.selectAll')"
              @update:model-value="toggleModule(m)"
            />
          </div>
          <div v-if="!collapsed.has(m.module)" class="grid gap-x-4 gap-y-2 border-t border-line px-3 py-3 sm:grid-cols-2 xl:grid-cols-3">
            <!-- SCheckbox's own text span fixes the colour, so the inactive tone goes on the
                 slot content; [&>span]:min-w-0 lets the truncate inside shrink. -->
            <template v-for="p in m.permissions" :key="p.key">
              <SCheckbox
                class="min-w-0 [&>span]:min-w-0"
                :model-value="isChecked(p.key)"
                :disabled="readOnly || !selectable(p)"
                @update:model-value="toggle(p)"
              >
                <span class="flex min-w-0 items-center gap-2" :class="permInactive(m, p) ? 'text-fg-subtle' : ''" :title="p.key">
                  <span class="truncate">{{ lt(p.label) || p.key }}</span>
                  <span v-if="p.sensitive" class="shrink-0 text-warning-500 dark:text-warning-400" :title="t('roles.sensitive')" :aria-label="t('roles.sensitive')" role="img"><SIcon name="lock" class="h-3.5 w-3.5" /></span>
                  <span v-if="p.step_up" class="shrink-0 text-primary-500 dark:text-primary-400" :title="t('roles.stepUp')" :aria-label="t('roles.stepUp')" role="img" data-testid="permission-step-up"><SIcon name="shield" class="h-3.5 w-3.5" /></span>
                  <template v-if="!moduleInactive(m)">
                    <SBadge v-if="p.status === 'disabled'" tone="warning">{{ t('roles.pluginDisabled') }}</SBadge>
                    <SBadge v-else-if="p.status === 'removed'" tone="gray">{{ t('roles.removed') }}</SBadge>
                  </template>
                </span>
              </SCheckbox>
              <ScopePicker
                v-if="showScopes(p)"
                class="sm:col-span-2 xl:col-span-3"
                :action="p.key"
                :resource="p.scope_type as ScopeResource"
                :scopes="scopesOf(p.key)"
                :offer="offerFor(p.key)"
                :disabled="readOnly"
                @update:scopes="setScopes(p, $event)"
              />
            </template>
          </div>
        </div>
      </template>
    </div>
    <SHint size="xs" class="mt-3 flex items-center gap-1">
      <SIcon name="lock" class="h-3.5 w-3.5 text-warning-500 dark:text-warning-400" />{{ t('roles.sensitiveLegend') }}
    </SHint>
    <SHint v-if="anyStepUp" size="xs" class="mt-1 flex items-center gap-1">
      <SIcon name="shield" class="h-3.5 w-3.5 text-primary-500 dark:text-primary-400" />{{ t('roles.stepUpLegend') }}
    </SHint>
  </div>
</template>
