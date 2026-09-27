<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SButton, SEmpty, SField, SInput, SModal, SSelect, SSpinner, SSwitch, STable } from '@sub2api/ui'
import type { TableColumn } from '@sub2api/ui'
import { isApiError } from '@sub2api/host'
import { fetchRules, saveRules, useGuardHost, type Rule } from './host'

// Rule management: GET /rules, PUT /rules (replaces the whole set).
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()
const host = useGuardHost()
const t = host.t

const rules = ref<Rule[]>([])
const loading = ref(false)
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const canManage = computed(() => host.can('rules:manage'))

const kindOptions = computed(() => [
  { value: 'keyword', label: t('kind.keyword') },
  { value: 'regex', label: t('kind.regex') }
])

const columns = computed<TableColumn[]>(() => {
  const c: TableColumn[] = [
    { key: 'name', label: t('rules.name') },
    { key: 'kind', label: t('rules.kind'), width: '9rem' },
    { key: 'pattern', label: t('rules.pattern') },
    { key: 'enabled', label: t('rules.enabled'), width: '5rem' }
  ]
  if (canManage.value) c.push({ key: 'actions', label: '', width: '3rem' })
  return c
})

watch(
  () => props.open,
  async (v) => {
    if (!v) return
    loading.value = true
    errors.value = {}
    try {
      rules.value = (await fetchRules()).map((r) => ({ ...r }))
    } catch (e) {
      host.toast(isApiError(e) ? e.message : String(e), 'error')
    } finally {
      loading.value = false
    }
  }
)

function add() {
  rules.value.push({ name: '', kind: 'keyword', pattern: '', enabled: true })
}

function remove(i: number) {
  rules.value.splice(i, 1)
}

function validate(): boolean {
  const errs: Record<string, string> = {}
  rules.value.forEach((r, i) => {
    if (!r.name.trim()) errs[`rules[${i}].name`] = t('rules.required')
    if (!r.pattern) errs[`rules[${i}].pattern`] = t('rules.required')
    else if (r.kind === 'regex') {
      try {
        new RegExp(r.pattern)
      } catch {
        errs[`rules[${i}].pattern`] = t('rules.invalidRegex')
      }
    }
  })
  errors.value = errs
  return Object.keys(errs).length === 0
}

function err(i: number, field: string) {
  return errors.value[`rules[${i}].${field}`] || errors.value[`rules.${i}.${field}`]
}

async function save() {
  if (!validate()) return
  saving.value = true
  try {
    rules.value = await saveRules(rules.value.map(({ updated_at: _u, ...r }) => ({ ...r, name: r.name.trim() })))
    host.toast(t('rules.saved'), 'success')
    emit('saved')
    emit('update:open', false)
  } catch (e) {
    if (isApiError(e) && Object.keys(e.fields).length) errors.value = { ...e.fields }
    else host.toast(isApiError(e) ? e.message : String(e), 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SModal :open="open" :title="t('rules.title')" width="xl" @update:open="emit('update:open', $event)">
    <div v-if="loading" class="guard-center"><SSpinner /></div>
    <template v-else>
      <p v-if="!canManage" class="guard-note">{{ t('rules.readOnly') }}</p>
      <SEmpty v-if="!rules.length" :text="t('rules.empty')" icon="shield" />
      <!-- row-key names no field so every row keys by index; saved rules (id) and new rows would otherwise collide -->
      <STable v-else :columns="columns" :rows="rules" row-key="__index" dense>
        <template #cell-name="{ row, index }">
          <SField :error="err(index, 'name')">
            <SInput v-model="row.name" size="sm" :error="!!err(index, 'name')" :disabled="!canManage" :maxlength="100" />
          </SField>
        </template>
        <template #cell-kind="{ row }">
          <SSelect v-model="row.kind" :options="kindOptions" class="input-sm" :disabled="!canManage" />
        </template>
        <template #cell-pattern="{ row, index }">
          <SField :error="err(index, 'pattern')">
            <SInput
              v-model="row.pattern"
              size="sm"
              mono
              :error="!!err(index, 'pattern')"
              :disabled="!canManage"
              :placeholder="row.kind === 'regex' ? '\\d{18}' : 'keyword'"
            />
          </SField>
        </template>
        <template #cell-enabled="{ row }"><SSwitch v-model="row.enabled" :disabled="!canManage" /></template>
        <template #cell-actions="{ index }">
          <SButton variant="ghost" size="sm" @click="remove(index)">×</SButton>
        </template>
      </STable>
      <p class="input-hint">{{ t('rules.regexHint') }}</p>
    </template>
    <template #footer>
      <SButton v-if="canManage" class="guard-left" @click="add">+ {{ t('rules.add') }}</SButton>
      <SButton @click="emit('update:open', false)">{{ host.i18n.t('common.close') }}</SButton>
      <SButton v-if="canManage" variant="primary" :loading="saving" @click="save">{{ t('rules.save') }}</SButton>
    </template>
  </SModal>
</template>

<style scoped>
.guard-center {
  display: flex;
  justify-content: center;
  padding: 2.5rem 0;
}
.guard-note {
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: #d97706;
}
.guard-left {
  margin-right: auto;
}
</style>
