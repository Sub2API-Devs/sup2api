<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCheckbox, SField, SHint, SSwitch } from '@sub2api/ui'
import type { Role } from '@/api/types'
import { lt } from '@/i18n'
import { flip } from './flip'

// The roles a role's holders manage (CONTRACTS §43.6): the roles they may
// assign, and the users they may act on (every non-default role of the target
// in the list). The super admin role is never listed.
const props = defineProps<{ roles: Role[]; readOnly?: boolean }>()
const keys = defineModel<Set<string>>('keys', { required: true })
const assignCustom = defineModel<boolean>('assignCustom', { required: true })
const { t } = useI18n()

const options = computed(() => props.roles.filter((r) => !r.superuser))

</script>

<template>
  <SField :label="t('roles.assignable')" data-testid="role-assignable">
    <SHint size="xs" class="mb-2">{{ t('roles.assignableHint') }}</SHint>
    <div class="flex flex-wrap gap-x-4 gap-y-2">
      <SCheckbox
        v-for="r in options"
        :key="r.key"
        size="sm"
        :model-value="keys.has(r.key)"
        :disabled="readOnly"
        :data-role="r.key"
        @update:model-value="keys = flip(keys, r.key, !!$event)"
      >
        {{ lt(r.name) || r.key }}
      </SCheckbox>
    </div>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <SSwitch v-model="assignCustom" :disabled="readOnly" :label="t('roles.assignCustom')" data-testid="role-assign-custom" />
      <SHint inline size="xs">{{ t('roles.assignCustomHint') }}</SHint>
    </div>
  </SField>
</template>
