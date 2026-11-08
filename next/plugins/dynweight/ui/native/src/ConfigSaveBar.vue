<script setup lang="ts">
import { computed } from 'vue'
import { SButton } from '@sub2api/ui'
import { useCatalog } from './catalog'
import type { Changes } from './configView'
import { useDwHost } from './host'

// The bar stuck to the bottom of the config page while the draft has
// unsaved edits or cannot be saved: where the edits are, Discard and Save.
// `problems` names the places with a number left empty, which block saving.
const props = defineProps<{ changes: Changes; problems: string[]; saving?: boolean }>()
const emit = defineEmits<{ (e: 'discard'): void; (e: 'save'): void }>()
const t = useDwHost().t
const catalog = useCatalog()

const where = computed(() => [
  ...(props.changes.global ? [t('cfg.save.global')] : []),
  ...props.changes.groups.map((id) => t('cfg.save.group', { name: catalog.groupName(Number(id)) })),
  ...props.changes.accounts.map((id) => t('cfg.save.account', { name: catalog.accountName(Number(id)) })),
  ...(props.changes.notify ? [t('cfg.save.notify')] : [])
])
</script>

<template>
  <div class="dw-cfg-savebar" role="region" :aria-label="t('config.save')">
    <p v-if="problems.length" class="dw-cfg-savebar-text dw-cfg-savebar-bad">{{ t('cfg.save.invalid', { where: problems.join(t('cfg.sep')) }) }}</p>
    <p v-else class="dw-cfg-savebar-text" aria-live="polite">
      <span class="dw-cfg-dot" aria-hidden="true" />{{ t('cfg.save.unsaved', { n: where.length, where: where.join(t('cfg.sep')) }) }}
    </p>
    <div class="dw-cfg-savebar-actions">
      <SButton :disabled="saving" @click="emit('discard')">{{ t('config.discard') }}</SButton>
      <SButton variant="primary" icon="check" :loading="saving" :disabled="problems.length > 0" @click="emit('save')">{{ t('config.save') }}</SButton>
    </div>
  </div>
</template>
