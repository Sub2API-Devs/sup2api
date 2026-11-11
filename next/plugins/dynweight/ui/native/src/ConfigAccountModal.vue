<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SAlert, SButton, SField, SFormModal, SHint, SInput, SSegmented, SSwitch } from '@sub2api/ui'
import ConfigFloorInput from './ConfigFloorInput.vue'
import { useCatalog } from './catalog'
import { inheritText, inheritedValue, isDraftKey, overrideFields, sourceLayers, type Draft, type OverrideField } from './configView'
import { useDialogSave, type SaveOutcome } from './dialogSave'
import { clone, overrideIncomplete, useDwHost, type AccountOverride, type Layer } from './host'

// One account override in a dialog. Each field is inherited until its
// "override" switch is on; while off it shows the value the account
// inherits. `target` is the account opened ('' = a new override, the account
// picked in the dialog; an id without an override opens as new for that
// account; one picked in the dialog that has an override already is refused:
// it is edited from the list). Save saves the override through `save` and
// closes once saved (`others`: other unsaved edits of the page go along).
const props = defineProps<{
  target: string | null
  draft: Draft
  accountGroups: Record<string, number[]>
  readonly?: boolean
  save: (id: string, o: AccountOverride) => Promise<SaveOutcome>
  others?: boolean
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'pick', id: string): void }>()
const host = useDwHost()
const t = host.t
const { EntityPicker } = host.components
const catalog = useCatalog()
const { saving, error, run } = useDialogSave()

const account = ref('')
const o = ref<AccountOverride>({})
const isNew = ref(false)

watch(
  () => props.target,
  id => {
    if (id === null) return
    account.value = id
    error.value = ''
    isNew.value = !props.draft.accounts[id]
    o.value = clone(props.draft.accounts[id] ?? {})
  },
  { immediate: true }
)
watch(account, id => id && emit('pick', id), { immediate: true })

const validId = computed(() => isDraftKey(account.value))
// Saving a new override over the one the picked account has would drop it.
const taken = computed(() => props.target === '' && account.value in props.draft.accounts)
/** The account is settled: its fields can be set and saved. */
const ready = computed(() => validId.value && !taken.value)
const groups = computed(() => (validId.value ? props.accountGroups[account.value] : undefined))
const sources = computed(() => sourceLayers(props.draft, groups.value))
const groupsLine = computed(() => {
  if (!validId.value) return ''
  if (!groups.value) return t('cfg.accountModal.groupsUnknown')
  if (!groups.value.length) return t('cfg.accountModal.noGroups')
  return t('cfg.accountModal.inGroups', { groups: groups.value.map(g => catalog.groupName(g)).join(t('cfg.sep')) })
})
const inherited = (f: OverrideField) => inheritText(t, sources.value, f, catalog.groupName).text

// Turning a field on starts from what the account inherits (the global
// layer's when its groups differ); off drops it from the override. The
// floor's mode and amount are one value: taken apart they could pair a
// percent with a fixed amount.
function seed<K extends (keyof Layer)[]>(...keys: K): { [I in keyof K]: Layer[K[I]] } {
  const one = inheritedValue(sources.value, l => JSON.stringify(keys.map(k => l[k])))
  return (one === null ? keys.map(k => props.draft[k]) : JSON.parse(one)) as { [I in keyof K]: Layer[K[I]] }
}
const custom = {
  enabled: computed({
    get: () => o.value.enabled !== undefined,
    set: (on: boolean) => (o.value.enabled = on ? false : undefined)
  }),
  exempt: computed({
    get: () => o.value.exempt_status_codes !== undefined,
    set: (on: boolean) => (o.value.exempt_status_codes = on ? seed('exempt_status_codes')[0] : undefined)
  }),
  floor: computed({
    get: () => o.value.min_weight_mode !== undefined,
    set: (on: boolean) => {
      const [mode, value] = on ? seed('min_weight_mode', 'min_weight') : [undefined, undefined]
      o.value.min_weight_mode = mode
      o.value.min_weight = value
    }
  })
}
const floor = computed({
  get: () => ({ mode: o.value.min_weight_mode ?? props.draft.min_weight_mode, value: o.value.min_weight }),
  set: v => {
    o.value.min_weight_mode = v.mode
    // An emptied input gives null, which overrideIncomplete reads as left empty.
    o.value.min_weight = v.value as number
  }
})
const floorError = computed(() => (overrideIncomplete(o.value) ? t('layer.required') : undefined))
const enabledOptions = computed(() => [
  { value: true, label: overrideFields.enabled(t, { enabled: true }) },
  { value: false, label: overrideFields.enabled(t, { enabled: false }) }
])
const nothing = computed(() => !custom.enabled.value && !custom.exempt.value && !custom.floor.value)

// An account picked before opening (a link to its override) is named in the title.
const title = computed(() => {
  if (!props.target) return t('cfg.accountModal.add')
  const account = catalog.accountName(Number(props.target))
  return isNew.value ? `${t('cfg.accountModal.add')} · ${account}` : t('cfg.accountModal.edit', { account })
})
const canSave = computed(() => ready.value && !floorError.value && !(isNew.value && nothing.value))

async function submit() {
  if (!canSave.value) return
  if (await run(() => props.save(account.value, clone(o.value)))) emit('close')
}

const footerHint = computed(() => {
  if (isNew.value && ready.value && nothing.value) return t('cfg.accountModal.nothing')
  return props.others ? t('cfg.saveOthers') : ''
})
</script>

<template>
  <SFormModal
    :open="target !== null"
    :title="title"
    :submit-text="t('config.save')"
    :submit-disabled="!canSave"
    :loading="saving"
    @update:open="!$event && emit('close')"
    @submit="submit"
  >
    <SAlert v-if="error" tone="danger">{{ error }}</SAlert>
    <SField
      v-if="target === '' && !readonly"
      :label="t('cfg.accountModal.account')"
      :error="taken ? t('cfg.accountModal.taken') : undefined"
    >
      <EntityPicker v-model:id="account" kind="account" />
    </SField>
    <SHint v-if="groupsLine" size="xs">{{ groupsLine }}</SHint>

    <fieldset class="dw-fieldset dw-cfg-ovr-list" :disabled="readonly || !ready">
      <div class="dw-cfg-ovr">
        <div class="dw-cfg-ovr-head">
          <span class="dw-cfg-ovr-label">{{ t('cfg.accountModal.enabled') }}</span>
          <SSwitch v-model="custom.enabled.value" size="sm" :label="t('cfg.accountModal.custom')" :disabled="readonly || !ready" />
        </div>
        <template v-if="custom.enabled.value">
          <SSegmented
            v-model="o.enabled"
            :options="enabledOptions"
            size="sm"
            :disabled="readonly"
            :aria-label="t('cfg.accountModal.enabled')"
          />
          <SHint size="xs">{{ t('cfg.accountModal.enabledHint') }}</SHint>
        </template>
        <SHint v-else size="xs">{{ inherited('enabled') }}</SHint>
      </div>

      <div class="dw-cfg-ovr">
        <div class="dw-cfg-ovr-head">
          <span class="dw-cfg-ovr-label">{{ t('cfg.accountModal.exempt') }}</span>
          <SSwitch v-model="custom.exempt.value" size="sm" :label="t('cfg.accountModal.custom')" :disabled="readonly || !ready" />
        </div>
        <SField v-if="custom.exempt.value" :hint="t('cfg.accountModal.exemptHint')">
          <SInput
            v-model="o.exempt_status_codes"
            placeholder="400,500-503"
            :disabled="readonly"
            :aria-label="t('cfg.accountModal.exempt')"
          />
        </SField>
        <SHint v-else size="xs">{{ inherited('exempt') }}</SHint>
      </div>

      <div class="dw-cfg-ovr">
        <div class="dw-cfg-ovr-head">
          <span class="dw-cfg-ovr-label">{{ t('cfg.accountModal.floor') }}</span>
          <SSwitch v-model="custom.floor.value" size="sm" :label="t('cfg.accountModal.custom')" :disabled="readonly || !ready" />
        </div>
        <SField v-if="custom.floor.value" :hint="t('layer.floorHint')" :error="floorError">
          <ConfigFloorInput v-model="floor" :disabled="readonly" :aria-label="t('cfg.accountModal.floor')" />
        </SField>
        <SHint v-else size="xs">{{ inherited('floor') }}</SHint>
      </div>
    </fieldset>

    <template v-if="readonly" #footer>
      <SButton @click="emit('close')">{{ t('cfg.close') }}</SButton>
    </template>
    <template v-else-if="footerHint" #footer-start>
      <SHint size="xs">{{ footerHint }}</SHint>
    </template>
  </SFormModal>
</template>
