<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SAlert, SBadge, SButton, SCard, SHint } from '@sub2api/ui'
import AccountOverrideRow from './AccountOverrideRow.vue'
import { useCatalog } from './catalog'
import { canManage, clone, errorMessage, fetchOverride, overrideIncomplete, saveOverride, useDwHost, type AccountOverride, type OverrideLayer } from './host'

// account.form.widgets slot of the account editor: the layer in force for
// each group of the account (with the no-climb warning), and the account's
// own override edited with the configuration tab's row. The editor calls
// validate() before saving the account and save(account) after, so a new
// account's override is written under the id it just got. Read-only without
// dynweight:manage; not shown on a new account without it.
const props = defineProps<{ account?: { id: number } | null; accountType?: unknown; credentials?: unknown; editing?: boolean }>()
const host = useDwHost()
const t = host.t
const manage = computed(() => canManage())
const catalog = useCatalog()

const layers = ref<OverrideLayer[]>([])
const draft = ref<AccountOverride | null>(null)
let pristine = 'null' // the override as read or saved, to skip a save that changes nothing
const loading = ref(false)
const error = ref('')

function apply(body: { override: AccountOverride | null; layers: OverrideLayer[] }) {
  layers.value = body.layers ?? []
  draft.value = body.override ? clone(body.override) : null
  pristine = JSON.stringify(draft.value)
}

async function load(id: number) {
  loading.value = true
  error.value = ''
  try {
    apply(await fetchOverride(id))
  } catch (e) {
    error.value = errorMessage(e, t('override.loadFailed'))
  } finally {
    loading.value = false
  }
}
watch(
  () => props.account?.id,
  (id) => (id ? load(id) : apply({ override: null, layers: [] })),
  { immediate: true }
)

const noClimb = computed(() => layers.value.some((l) => l.no_climb))

defineExpose({
  async validate(): Promise<string | null> {
    return draft.value && overrideIncomplete(draft.value) ? t('override.incomplete') : null
  },
  async save(account: { id: number }): Promise<void> {
    if (!manage.value || error.value || JSON.stringify(draft.value) === pristine) return
    apply(await saveOverride(account.id, draft.value))
  }
})
</script>

<template>
  <SCard v-if="editing || manage" variant="flat" :title="t('override.title')" :subtitle="t('override.hint')">
    <SHint v-if="error" tone="danger">{{ error }}</SHint>
    <SHint v-else-if="loading">{{ t('loading') }}</SHint>
    <div v-else class="dw-list">
      <template v-if="editing">
        <SAlert v-if="noClimb" tone="warning" dense>{{ t('detail.noClimb') }}</SAlert>
        <div class="dw-chips">
          <SBadge v-for="l in layers" :key="l.group_id" :tone="l.no_climb ? 'danger' : 'gray'" :title="l.no_climb ? t('detail.noClimb') : undefined">
            {{ catalog.groupName(l.group_id) }} · {{ t(`override.source.${l.source}`) }}
          </SBadge>
          <SHint v-if="!layers.length" inline>{{ t('override.noLayers') }}</SHint>
        </div>
      </template>
      <fieldset class="dw-fieldset" :disabled="!manage">
        <AccountOverrideRow v-if="draft" v-model="draft" :label="t('override.label')" @remove="draft = null" />
        <SButton v-else-if="manage" size="sm" icon="plus" @click="draft = {}">{{ t('override.add') }}</SButton>
        <SHint v-else inline>{{ t('override.none') }}</SHint>
      </fieldset>
      <SHint v-if="!manage" size="xs">{{ t('override.readOnly') }}</SHint>
    </div>
  </SCard>
</template>
