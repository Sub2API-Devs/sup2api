<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SSpinner } from '@sub2api/ui'
import type { Account } from '@/api/types'
import { lt } from '@/i18n'
import { typeKey, useAccountTypes } from '@/views/accounts/accountTypes'

// Accounts of a group, of any account type (ARCHITECTURE §6.6: a group can
// mix types). Membership lives on the account (group_ids), so save() patches
// the accounts whose membership changed.
const props = defineProps<{ groupId: number | null }>()
const { t } = useI18n()
const accountTypes = useAccountTypes()
accountTypes.load()

const accounts = ref<Account[]>([])
const selected = ref(new Set<number>())
const initial = ref(new Set<number>())
const loading = ref(false)
const q = ref('')
const typeFilter = ref('')
const onlySelected = ref(false)

async function loadAll(): Promise<Account[]> {
  const out: Account[] = []
  for (let page = 1; page <= 20; page++) {
    const r = await api.list<Account>('/accounts', { page, page_size: 200 })
    out.push(...r.items)
    if (!r.items.length || out.length >= (r.page.total ?? out.length)) break
  }
  return out
}

watch(
  () => props.groupId,
  async (gid) => {
    loading.value = true
    q.value = ''
    typeFilter.value = ''
    onlySelected.value = false
    try {
      accounts.value = await loadAll()
    } catch {
      accounts.value = []
    } finally {
      loading.value = false
    }
    const ids = gid ? accounts.value.filter((a) => (a.group_ids || []).includes(gid)).map((a) => a.id) : []
    initial.value = new Set(ids)
    selected.value = new Set(ids)
  },
  { immediate: true }
)

/** Types present among the accounts, for the filter. */
const typeOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const a of accounts.value) {
    const k = typeKey(a.plugin_key, a.type)
    if (!seen.has(k)) seen.set(k, accountTypes.label(a.plugin_key, a.type, a.type_label))
  }
  return [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
})

const rows = computed(() => {
  const s = q.value.trim().toLowerCase()
  return accounts.value.filter((a) => {
    if (onlySelected.value && !selected.value.has(a.id)) return false
    if (typeFilter.value && typeKey(a.plugin_key, a.type) !== typeFilter.value) return false
    if (s && !`${a.name} ${a.plugin_key} ${a.type} ${lt(a.type_label)}`.toLowerCase().includes(s)) return false
    return true
  })
})

/** Selected count per account type, e.g. "Anthropic · API Key × 2". */
const mix = computed(() => {
  const m = new Map<string, number>()
  for (const a of accounts.value) {
    if (!selected.value.has(a.id)) continue
    const k = accountTypes.label(a.plugin_key, a.type, a.type_label)
    m.set(k, (m.get(k) || 0) + 1)
  }
  return [...m.entries()]
})

function toggle(id: number, on: boolean) {
  const s = new Set(selected.value)
  if (on) s.add(id)
  else s.delete(id)
  selected.value = s
}

function setVisible(on: boolean) {
  const s = new Set(selected.value)
  for (const a of rows.value) {
    if (on) s.add(a.id)
    else s.delete(a.id)
  }
  selected.value = s
}

const dirty = computed(() => {
  if (initial.value.size !== selected.value.size) return true
  for (const id of selected.value) if (!initial.value.has(id)) return true
  return false
})

/** Applies membership changes for group gid; returns the names that failed. */
async function save(gid: number): Promise<string[]> {
  const failed: string[] = []
  for (const a of accounts.value) {
    const want = selected.value.has(a.id)
    const had = (a.group_ids || []).includes(gid)
    if (want === had) continue
    const group_ids = want ? [...(a.group_ids || []), gid] : (a.group_ids || []).filter((x) => x !== gid)
    try {
      await api.patch(`/accounts/${a.id}`, { group_ids })
      a.group_ids = group_ids
    } catch {
      failed.push(a.name)
    }
  }
  initial.value = new Set(selected.value)
  return failed
}

function statusTone(a: Account) {
  if (a.orphaned) return 'gray'
  if (a.status === 'active') return a.schedulable ? 'success' : 'gray'
  return 'danger'
}

defineExpose({ save, dirty })
</script>

<template>
  <div>
    <div class="mb-2 flex flex-wrap items-center gap-2">
      <select v-model="typeFilter" class="input !w-52" data-testid="group-accounts-type">
        <option value="">{{ t('accounts.allTypes') }}</option>
        <option v-for="o in typeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <input v-model="q" class="input !w-48" :placeholder="t('common.searchPlaceholder')" />
      <label class="flex items-center gap-1.5 text-xs">
        <input v-model="onlySelected" type="checkbox" class="checkbox" />{{ t('groups.accounts.onlySelected') }}
      </label>
      <span class="ml-auto flex gap-2 text-xs">
        <button type="button" class="link" @click="setVisible(true)">{{ t('groups.accounts.selectVisible') }}</button>
        <button type="button" class="link" @click="setVisible(false)">{{ t('groups.accounts.clearVisible') }}</button>
      </span>
    </div>
    <div class="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-dark-600">
      <div v-if="loading" class="flex justify-center py-6"><SSpinner /></div>
      <p v-else-if="!rows.length" class="muted py-6 text-center text-sm">{{ t('groups.accounts.none') }}</p>
      <label
        v-for="a in rows"
        v-else
        :key="a.id"
        class="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 hover:bg-gray-50 dark:border-dark-700 dark:hover:bg-dark-800"
      >
        <input type="checkbox" class="checkbox" :checked="selected.has(a.id)" @change="toggle(a.id, ($event.target as HTMLInputElement).checked)" />
        <span class="min-w-0 flex-1 truncate font-medium">{{ a.name }}</span>
        <span class="w-44 shrink-0 text-right">
          <span class="block truncate text-xs">{{ accountTypes.typeLabel(a.plugin_key, a.type, a.type_label) }}</span>
          <span class="muted block truncate text-[11px]">{{ accountTypes.pluginName(a.plugin_key) }}</span>
        </span>
        <SBadge :tone="statusTone(a)" dot class="shrink-0">{{ a.orphaned ? t('accounts.status.orphaned') : t(`accounts.status.${a.status}`) }}</SBadge>
      </label>
    </div>
    <p class="input-hint">
      {{ t('groups.accounts.selected', { n: selected.size }) }}
      <template v-if="mix.length">: {{ mix.map(([k, n]) => `${k} × ${n}`).join('; ') }}</template>
    </p>
  </div>
</template>
