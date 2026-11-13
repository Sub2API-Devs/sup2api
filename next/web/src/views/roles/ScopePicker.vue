<script setup lang="ts">
// The scopes of one scoped action (CONTRACTS §21), stacked: every row, the
// rows the holder created, chosen groups, chosen accounts or proxies, and
// accounts within a chosen group. "All" includes the rest (greyed out). Only
// what the editor's own scopes imply is offered (`offer`); granted scopes
// beyond it can only be removed. Ids show by name through the lookup, a
// deleted one as "#12 (deleted)".
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCheckbox, SChip, SHint } from '@sub2api/ui'
import EntityPicker from '@/components/EntityPicker.vue'
import type { EntityKind } from '@/components/entity/entities'
import { scopeSuffix, type Scope, type ScopeResource } from '@/authz/implies'
import { choiceOf, scopesOf, type Offer, type ScopeChoice, type ScopeOffer } from '@/authz/scopeChoice'
import { useScopeLabels } from './scopeLabels'

const props = defineProps<{ action: string; resource: ScopeResource; scopes: Scope[]; offer: ScopeOffer; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:scopes', v: Scope[]): void }>()
const { t } = useI18n()
const { rowLabel: label } = useScopeLabels()

const choice = computed(() => choiceOf(props.scopes))
/** Everything but "all" waits while every row is chosen. */
const narrowOff = computed(() => props.disabled || choice.value.all)
const rowKind = computed<EntityKind>(() => props.resource)
const grouped = computed(() => props.resource === 'account')

function set(patch: Partial<ScopeChoice>) {
  emit('update:scopes', scopesOf({ ...choice.value, ...patch }))
}

/** The ids a fixed offer lists, with those granted beyond it (removable only). */
const listed = (offer: Offer, held: number[]) => (Array.isArray(offer) ? [...new Set([...offer, ...held])] : held)
const offered = (offer: Offer, id: number) => offer === 'any' || (Array.isArray(offer) && offer.includes(id))
const toggled = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
const added = (list: number[], id: string) => (id && !list.includes(Number(id)) ? [...list, Number(id)] : list)

// group/<g>/account/<id>: the group is picked first, then an account preferring it.
const pairGroup = ref('')
function addPair(account: string) {
  const g = Number(pairGroup.value)
  if (!g || !account || choice.value.pairs.some(([pg, id]) => pg === g && id === Number(account))) return
  set({ pairs: [...choice.value.pairs, [g, Number(account)]] })
}
</script>

<template>
  <div class="space-y-2 rounded-lg bg-surface-2 px-3 py-2 text-sm" :data-testid="`scope-${action}`">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
      <SCheckbox
        v-if="offer.all || choice.all"
        size="xs"
        :model-value="choice.all"
        :disabled="disabled"
        :label="t('roles.scope.all')"
        data-testid="scope-all"
        @update:model-value="set({ all: !!$event })"
      />
      <SCheckbox
        v-if="offer.own || choice.own"
        size="xs"
        :model-value="choice.own || choice.all"
        :disabled="narrowOff"
        :label="t('roles.scope.own')"
        data-testid="scope-own"
        @update:model-value="set({ own: !!$event })"
      />
      <SHint v-if="choice.all" inline size="xs">{{ t('roles.scope.allHint') }}</SHint>
      <SHint v-else-if="!scopes.length" inline size="xs" class="text-warning-600 dark:text-warning-400">{{ t('roles.scope.none') }}</SHint>
    </div>

    <!-- group/<g> -->
    <div v-if="grouped && (offer.groups || choice.groups.length)" class="flex flex-wrap items-center gap-1.5" :class="choice.all ? 'opacity-60' : ''" data-testid="scope-groups">
      <SHint inline size="xs" class="w-28 shrink-0">{{ t('roles.scope.groups') }}</SHint>
      <SChip
        v-for="g in listed(offer.groups, choice.groups)"
        :key="g"
        size="xs"
        :pressed="offer.groups === 'any' ? undefined : choice.groups.includes(g)"
        :tone="offer.groups === 'any' ? 'primary' : 'neutral'"
        :closable="offer.groups === 'any' && !narrowOff"
        :disabled="narrowOff || (!offered(offer.groups, g) && !choice.groups.includes(g))"
        @close="set({ groups: choice.groups.filter((x) => x !== g) })"
        @update:pressed="set({ groups: toggled(choice.groups, g) })"
      >{{ label('group', g) }}</SChip>
      <EntityPicker v-if="offer.groups === 'any' && !narrowOff" class="min-w-40 flex-1" kind="group" size="sm" :exclude="choice.groups" @update:id="set({ groups: added(choice.groups, $event) })" />
    </div>

    <!-- account/<id>, proxy/<id> -->
    <div v-if="offer.ids || choice.ids.length" class="flex flex-wrap items-center gap-1.5" :class="choice.all ? 'opacity-60' : ''" data-testid="scope-ids">
      <SHint inline size="xs" class="w-28 shrink-0">{{ t(grouped ? 'roles.scope.accounts' : 'roles.scope.proxies') }}</SHint>
      <SChip
        v-for="id in listed(offer.ids, choice.ids)"
        :key="id"
        size="xs"
        :pressed="offer.ids === 'any' ? undefined : choice.ids.includes(id)"
        :tone="offer.ids === 'any' ? 'primary' : 'neutral'"
        :closable="offer.ids === 'any' && !narrowOff"
        :disabled="narrowOff || (!offered(offer.ids, id) && !choice.ids.includes(id))"
        @close="set({ ids: choice.ids.filter((x) => x !== id) })"
        @update:pressed="set({ ids: toggled(choice.ids, id) })"
      >{{ label(rowKind, id) }}</SChip>
      <EntityPicker v-if="offer.ids === 'any' && !narrowOff" class="min-w-40 flex-1" :kind="rowKind" size="sm" :exclude="choice.ids" @update:id="set({ ids: added(choice.ids, $event) })" />
    </div>

    <!-- group/<g>/account/<id> -->
    <div v-if="grouped && (offer.groups || choice.pairs.length)" class="flex flex-wrap items-center gap-1.5" :class="choice.all ? 'opacity-60' : ''" data-testid="scope-pairs">
      <SHint inline size="xs" class="w-28 shrink-0">{{ t('roles.scope.pairs') }}</SHint>
      <SChip
        v-for="[g, id] in choice.pairs"
        :key="`${g}/${id}`"
        size="xs"
        tone="primary"
        :closable="!narrowOff"
        @close="set({ pairs: choice.pairs.filter(([pg, pid]) => pg !== g || pid !== id) })"
      >{{ label('group', g) }} / {{ label('account', id) }}</SChip>
      <template v-if="offer.groups && !narrowOff">
        <EntityPicker
          v-if="offer.groups === 'any'"
          v-model:id="pairGroup"
          class="min-w-36"
          kind="group"
          size="sm"
          :placeholder="t('roles.scope.pairGroup')"
          data-testid="scope-pair-group"
        />
        <template v-else>
          <SChip v-for="g in offer.groups" :key="g" size="xs" :pressed="pairGroup === String(g)" @update:pressed="pairGroup = $event ? String(g) : ''">{{ label('group', g) }}</SChip>
        </template>
        <EntityPicker
          v-if="pairGroup"
          class="min-w-36 flex-1"
          kind="account"
          size="sm"
          :placeholder="t('roles.scope.pairAccount')"
          :scope="{ prefer_group_id: pairGroup }"
          data-testid="scope-pair-account"
          @update:id="addPair"
        />
      </template>
    </div>

    <!-- held, not offered: group/*, group/*/account/<id> -->
    <div v-if="choice.other.length" class="flex flex-wrap items-center gap-1.5" data-testid="scope-other">
      <SHint inline size="xs" class="w-28 shrink-0">{{ t('roles.scope.other') }}</SHint>
      <SChip
        v-for="s in choice.other"
        :key="scopeSuffix(action, s)"
        size="xs"
        :closable="!narrowOff"
        class="font-mono"
        @close="set({ other: choice.other.filter((o) => o !== s) })"
      >{{ scopeSuffix(action, s) }}</SChip>
    </div>
  </div>
</template>
