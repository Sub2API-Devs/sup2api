<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SButton, SField, SHint, SModal, SSegmented, SSelect } from '@sub2api/ui'
import { bindingKind } from './bindingOps'
import { useCatalog } from './catalog'
import { idNumber } from './forms'
import { putBinding, toastError, useModHost } from './host'
import type { Binding, BindingKind } from './types'

// Adds or edits one binding (PUT /bindings, CONTRACTS §72.17): what it
// covers (a group, an account within a group, an account in any group) and
// the flow it runs, or "not moderated". The group and the account are picked
// with the host's EntityPicker. An edit keeps what the binding covers and
// only changes the flow. Adding a binding that exists asks before it replaces
// the flow. Saving takes effect at once and creates no version. A binding to
// a disabled or unpublished flow does not apply (requests go by a wider
// binding): the form warns and points to "not moderated".
const props = defineProps<{ open: boolean; binding: Binding | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()
const host = useModHost()
const t = host.t
const { EntityPicker } = host.components
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

// The default group (0) is no row of the lookup, and only a group binding
// takes it: the group picker's own candidate there, dropped when the kind
// changes.
const defaultGroup = computed(() => (form.kind === 'group' ? [{ id: 0, name: t('flows.defaultGroup') }] : []))
watch(
  () => form.kind,
  (kind) => {
    if (kind !== 'group' && form.group === '0') form.group = ''
  }
)
/** Within a group, its accounts are listed first (the others cannot serve its requests). */
const accountScope = computed(() => (form.kind === 'group_account' && idNumber(form.group) > 0 ? { prefer_group_id: form.group } : undefined))

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

async function save() {
  errs.group = errs.account = undefined
  const group = needsGroup.value ? idNumber(form.group) : 0
  const account = needsAccount.value ? idNumber(form.account) : 0
  if (Number.isNaN(group) || (form.kind === 'group_account' && group <= 0)) errs.group = t('bindings.groupRequired')
  if (Number.isNaN(account) || (needsAccount.value && account <= 0)) errs.account = t('bindings.accountRequired')
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
        <EntityPicker v-model:id="form.group" kind="group" :extra="defaultGroup" :disabled="!!binding" />
      </SField>
      <SField v-if="needsAccount" :label="t('bindings.col.account')" required :error="errs.account">
        <EntityPicker v-model:id="form.account" kind="account" :scope="accountScope" :disabled="!!binding" />
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
