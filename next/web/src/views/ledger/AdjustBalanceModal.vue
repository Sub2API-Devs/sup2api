<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SField, SModal, toast } from '@sub2api/ui'
import type { User } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { fieldErrors, notifyError } from '@/utils/errors'
import { formatMoney } from '@/utils/format'

// Adjust a user's balance (POST /users/:id/balance/adjust, balance:adjust — step-up is automatic).
const props = defineProps<{ open: boolean; userId?: number | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'done'): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const canSearch = computed(() => auth.has('user:read'))

const query = ref('')
const results = ref<User[]>([])
const selected = ref<User | null>(null)
const credit = ref(true)
const amount = ref('')
const note = ref('')
const errors = ref<Record<string, string>>({})
const busy = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.open,
  (v) => {
    if (!v) return
    query.value = props.userId ? String(props.userId) : ''
    results.value = []
    selected.value = null
    credit.value = true
    amount.value = ''
    note.value = ''
    errors.value = {}
  }
)

const userId = computed<number | null>(() => {
  if (selected.value) return selected.value.id
  const q = query.value.trim()
  return /^\d+$/.test(q) ? Number(q) : null
})

watch(query, (q) => {
  clearTimeout(timer)
  if (selected.value && q !== label(selected.value)) selected.value = null
  const s = q.trim()
  if (!canSearch.value || !s || /^\d+$/.test(s) || selected.value) {
    results.value = []
    return
  }
  timer = setTimeout(async () => {
    try {
      const r = await api.list<User>('/users', { q: s, page_size: 8 })
      results.value = r.items
    } catch {
      results.value = []
    }
  }, 300)
})

function label(u: User) {
  return u.display_name ? `${u.email} (${u.display_name})` : u.email
}

function pick(u: User) {
  selected.value = u
  query.value = label(u)
  results.value = []
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'adj-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
}

async function submit() {
  errors.value = {}
  if (!userId.value) errors.value.user = t('ledger.adjust.userRequired')
  const a = amount.value.trim()
  if (!/^\d+(\.\d{1,8})?$/.test(a) || Number(a) <= 0) errors.value.amount = t('ledger.adjust.amountInvalid')
  if (Object.keys(errors.value).length) return
  busy.value = true
  try {
    const r = await api.post<{ ledger_id?: number; balance_after?: string; duplicate?: boolean }>(
      `/users/${userId.value}/balance/adjust`,
      { amount: a, credit: credit.value, note: note.value },
      { headers: { 'Idempotency-Key': uuid() } }
    )
    toast(
      r?.duplicate
        ? t('ledger.adjust.duplicate')
        : r?.balance_after !== undefined
          ? t('ledger.adjust.doneBalance', { balance: formatMoney(r.balance_after) })
          : t('ledger.adjust.done'),
      'success'
    )
    if (userId.value === auth.me?.id) auth.refreshBalance()
    emit('done')
    emit('update:open', false)
  } catch (e) {
    const fe = fieldErrors(e)
    errors.value = fe
    if (!Object.keys(fe).length) notifyError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SModal :open="open" :title="t('ledger.adjust.title')" width="md" @update:open="emit('update:open', $event)">
    <div class="space-y-4">
      <SField :label="t('common.user')" :hint="canSearch ? t('ledger.adjust.userHintSearch') : t('ledger.adjust.userHintId')" :error="errors.user" required>
        <div class="relative">
          <input v-model="query" class="input" :placeholder="canSearch ? t('ledger.adjust.userPlaceholder') : 'ID'" autocomplete="off" />
          <div v-if="results.length" class="dropdown absolute left-0 right-0 z-10 mt-1">
            <div v-for="u in results" :key="u.id" class="dropdown-item" @mousedown.prevent="pick(u)">
              <span>{{ u.email }}</span>
              <span class="muted ml-2 text-xs">#{{ u.id }} {{ u.display_name }}</span>
            </div>
          </div>
        </div>
        <p v-if="userId" class="muted mt-1 text-xs">{{ t('ledger.adjust.target', { id: userId }) }}</p>
      </SField>
      <SField :label="t('ledger.adjust.direction')">
        <div class="flex gap-5 pt-1">
          <label class="flex items-center gap-2 text-sm">
            <input v-model="credit" type="radio" class="checkbox !rounded-full" :value="true" />
            {{ t('ledger.adjust.credit') }}
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input v-model="credit" type="radio" class="checkbox !rounded-full" :value="false" />
            {{ t('ledger.adjust.debit') }}
          </label>
        </div>
      </SField>
      <SField :label="t('ledger.adjust.amount')" :error="errors.amount" required>
        <div class="flex items-center gap-2">
          <span class="font-mono text-lg" :class="credit ? 'text-emerald-600' : 'text-red-600'">{{ credit ? '+' : '-' }}</span>
          <input v-model="amount" class="input font-mono" inputmode="decimal" placeholder="20.00" />
          <span class="muted">USD</span>
        </div>
      </SField>
      <SField :label="t('common.note')" :error="errors.note">
        <textarea v-model="note" rows="2" class="input" :placeholder="t('ledger.adjust.notePlaceholder')" />
      </SField>
      <p class="muted text-xs">{{ t('ledger.adjust.stepUpHint') }}</p>
    </div>
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ t('common.cancel') }}</SButton>
      <SButton variant="primary" :loading="busy" @click="submit">{{ t('common.confirm') }}</SButton>
    </template>
  </SModal>
</template>
