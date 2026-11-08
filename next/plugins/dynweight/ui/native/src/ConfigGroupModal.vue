<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SButton, SField, SHint, SModal, SSettingRow, SSwitch } from '@sub2api/ui'
import ConfigLayerFields from './ConfigLayerFields.vue'
import IdPicker from './IdPicker.vue'
import ItemsTable from './ItemsTable.vue'
import { useCatalog } from './catalog'
import { globalLayer, type Draft } from './configView'
import { clone, layerIncomplete, useDwHost, type Layer } from './host'

// One group layer in a dialog: whether the group adjusts, the same fields
// as the global layer and its own items. `target` is the group opened ('' =
// a new one, picked in the dialog, starting as a copy of the global layer:
// the master switch, notifications and logging stay global). Edits stay in
// the dialog until Apply hands the layer back to the draft.
const props = defineProps<{ target: string | null; draft: Draft; defaults: Layer | null; readonly?: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'apply', id: string, layer: Layer): void }>()
const t = useDwHost().t
const catalog = useCatalog()

const group = ref('')
const layer = ref<Layer | null>(null)
const isNew = computed(() => props.target === '')

watch(
  () => props.target,
  id => {
    if (id === null) return
    group.value = id
    layer.value = clone(props.draft.groups[id] ?? { ...globalLayer(props.draft), enabled: true })
  },
  { immediate: true }
)

const validId = computed(() => /^\d+$/.test(group.value) && Number(group.value) > 0)
const incomplete = computed(() => !!layer.value && layerIncomplete(layer.value))
const title = computed(() =>
  isNew.value ? t('cfg.groupModal.add') : t('cfg.groupModal.edit', { group: catalog.groupName(Number(props.target)) })
)

function apply() {
  if (!layer.value || !validId.value || incomplete.value) return
  emit('apply', group.value, clone(layer.value))
}
</script>

<template>
  <SModal :open="target !== null" :title="title" width="xl" persistent @update:open="!$event && emit('close')">
    <div v-if="layer" class="dw-cfg-modal-body">
      <div v-if="isNew" class="dw-cfg-grid">
        <SField :label="t('cfg.groupModal.group')" :hint="t('cfg.groupModal.groupHint')">
          <IdPicker v-model="group" kind="group" :exclude="Object.keys(draft.groups)" />
        </SField>
      </div>
      <SSettingRow flush dense :label="t('cfg.groupModal.enabled')" :description="t('cfg.groupModal.enabledHint')">
        <SSwitch v-model="layer.enabled" :disabled="readonly" />
      </SSettingRow>
      <ConfigLayerFields v-model="layer" :readonly="readonly" />
      <ItemsTable
        :rules="layer.rules"
        :strategies="layer.strategies"
        :defaults="defaults"
        :readonly="readonly"
        @change="({ rules, strategies }) => layer && Object.assign(layer, { rules, strategies })"
      />
    </div>
    <template #footer>
      <template v-if="readonly">
        <SButton @click="emit('close')">{{ t('cfg.close') }}</SButton>
      </template>
      <template v-else>
        <SHint size="xs" :tone="incomplete ? 'danger' : 'muted'" class="dw-cfg-footer-hint">
          {{ t(incomplete ? 'cfg.incomplete' : 'cfg.applyHint') }}
        </SHint>
        <SButton @click="emit('close')">{{ t('cancel') }}</SButton>
        <SButton variant="primary" :disabled="!validId || incomplete" @click="apply">{{ t('cfg.apply') }}</SButton>
      </template>
    </template>
  </SModal>
</template>
