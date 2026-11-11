<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SButton, SField, SHint, SInput, SModal, SSegmented, SSelect } from '@sub2api/ui'
import { bindingKind } from './bindingOps'
import { useCatalog } from './catalog'
import { putBinding, toastError, useModHost } from './host'
import type { Binding, BindingKind, CoreAccount } from './types'

// Adds or edits one binding (PUT /bindings, CONTRACTS §72.17): what it
// covers (a group, an account within a group, an account in any group) and
// the flow it runs, or "not moderated". An edit keeps what the binding
// covers and only changes the flow. Adding a binding that exists asks before
// it replaces the flow. Saving takes effect at once and creates no version.
// A binding to a disabled or unpublished flow does not apply (requests go by
// a wider binding): the form warns and points to "not moderated".
const props = defineProps<{
  open: boolean
  binding: Binding | null
  /** the console's accounts; [] when not readable (ids are typed then) */
  accounts: CoreAccount[]
  accountLabel: (id: number) => string
}>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()
const host = useModHost()
const t = host.t
const catalog = useCatalog()

const form = reactive({ kind: 'group_account' as BindingKind, group: '' as string, account: '' as string, flow: 0 as number })
const errs = reactive<{ group?: string; account?: string }>({})
const saving = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const b = props.binding
    Object.assign(
      form,
      b
        ? { kind: bindingKind(b.group_id, b.account_id), group: String(b.group_id), account: String(b.account_id), flow: b.flow_id }
        : { kind: 'group_account', group: '', account: '', flow: catalog.state.flows.find((f) => f.enabled && f.version)?.id ?? 0 }
    )
    errs.group = errs.account = undefined
  }
)

const kindOptions = computed(() => (['group_account', 'account', 'group'] as const).map((k) => ({ value: k, label: t(`bindings.kind.${k}`) })))
const needsGroup = computed(() => form.kind !== 'account')
const needsAccount = computed(() => form.kind !== 'group')

/** Groups for the binding: the default group only for a group binding. */
const groupOptions = computed(() => {
  const all = catalog.groupOptions().map((o) => ({ value: String(o.value), label: o.value === 0 ? t('flows.defaultGroup') : o.label }))
  return form.kind === 'group' ? all : all.filter((o) => o.value !== '0')
})

/** Accounts of the chosen group first (the others cannot serve its requests). */
const accountOptions = computed(() => {
  const g = Number(form.group)
  const inGroup = (a: CoreAccount) => form.kind !== 'group_account' || !g || !a.group_ids || a.group_ids.includes(g)
  const list = props.accounts.filter(inGroup).map((a) => ({ value: String(a.id), label: `${a.name} #${a.id}` }))
  if (form.account && !list.some((o) => o.value === form.account)) list.unshift({ value: form.account, label: props.accountLabel(Number(form.account)) })
  return list
})

const flowOptions = computed(() => [
  { value: 0, label: t('bindings.exemptOption') },
  ...catalog.state.flows.map((f) => ({
    value: f.id,
    label: `${f.name} #${f.id}` + (!f.enabled ? ` · ${t('disabled')}` : !f.version ? ` · ${t('flows.unpublished')}` : '')
  }))
])
const flowWarning = computed(() => {
  const f = catalog.flow(form.flow)
  return f && (!f.enabled || !f.version) ? t('bindings.inactiveFlowWarn') : ''
})

const idOf = (v: unknown) => {
  const s = String(v ?? '').trim()
  return /^\d+$/.test(s) ? Number(s) : NaN
}

async function save() {
  errs.group = errs.account = undefined
  const group = needsGroup.value ? idOf(form.group) : 0
  const account = needsAccount.value ? idOf(form.account) : 0
  if (!Number.isSafeInteger(group) || (form.kind === 'group_account' && group <= 0)) errs.group = t('bindings.groupRequired')
  if (!Number.isSafeInteger(account) || (needsAccount.value && account <= 0)) errs.account = t('bindings.accountRequired')
  if (errs.group || errs.account) return
  const body = { group_id: group, account_id: account, flow_id: form.flow }
  saving.value = true
  try {
    try {
      await putBinding(body, !!props.binding)
    } catch (e) {
      if (!isApiError(e) || e.code !== 'binding_exists') throw e
      const now = Number(e.details.flow_id) || 0
      const message = t('bindings.replaceConfirm', { flow: now ? catalog.flowName(now) : t('bindings.exempt') })
      if (!(await host.confirm({ message, confirmText: t('bindings.replace') }))) return
      await putBinding(body, true)
    }
    host.toast(t('bindings.saved'), 'success')
    emit('update:open', false)
    emit('saved')
  } catch (e) {
    toastError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SModal :open="open" :title="binding ? t('bindings.editTitle') : t('bindings.add')" width="md" @update:open="emit('update:open', $event)">
    <form class="mod-form" @submit.prevent="save">
      <SField :label="t('bindings.col.kind')" :hint="t(`bindings.kindHint.${form.kind}`)">
        <SSegmented v-model="form.kind" :options="kindOptions" :disabled="!!binding" block />
      </SField>
      <SField v-if="needsGroup" :label="t('bindings.col.group')" required :error="errs.group">
        <SSelect
          v-if="groupOptions.length"
          v-model="form.group"
          :options="groupOptions"
          :disabled="!!binding"
          :placeholder="t('bindings.pickGroup')"
          searchable
        />
        <SInput v-else v-model="form.group" inputmode="numeric" :disabled="!!binding" :placeholder="t('bindings.groupIdPlaceholder')" />
      </SField>
      <SField v-if="needsAccount" :label="t('bindings.col.account')" required :error="errs.account" :hint="accounts.length ? '' : t('bindings.accountIdsHint')">
        <SSelect
          v-if="accounts.length"
          v-model="form.account"
          :options="accountOptions"
          :disabled="!!binding"
          :placeholder="t('bindings.pickAccount')"
          searchable
        />
        <SInput v-else v-model="form.account" inputmode="numeric" :disabled="!!binding" :placeholder="t('bindings.accountIdPlaceholder')" />
      </SField>
      <SField :label="t('bindings.col.flow')" :hint="t('bindings.flowHint')">
        <SSelect v-model="form.flow" :options="flowOptions" searchable />
      </SField>
      <SAlert v-if="flowWarning" tone="warning" dense>{{ flowWarning }}</SAlert>
      <SHint size="xs">{{ t('bindings.priorityHint') }}</SHint>
    </form>
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ host.i18n.t('ui.cancel') }}</SButton>
      <SButton variant="primary" :loading="saving" @click="save">{{ t('save') }}</SButton>
    </template>
  </SModal>
</template>
