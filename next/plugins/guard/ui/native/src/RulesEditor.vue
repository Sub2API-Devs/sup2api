<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SButton, SEmpty, SModal, SSpinner, SSwitch } from '@sub2api/ui'
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
      <table v-else class="table">
        <thead>
          <tr>
            <th>{{ t('rules.name') }}</th>
            <th class="guard-w-kind">{{ t('rules.kind') }}</th>
            <th>{{ t('rules.pattern') }}</th>
            <th class="guard-w-switch">{{ t('rules.enabled') }}</th>
            <th v-if="canManage" class="guard-w-x" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rules" :key="r.id ?? `new-${i}`">
            <td>
              <input v-model="r.name" class="input input-sm" :class="err(i, 'name') ? 'input-error' : ''" :disabled="!canManage" maxlength="100" />
              <p v-if="err(i, 'name')" class="input-error-text">{{ err(i, 'name') }}</p>
            </td>
            <td>
              <select v-model="r.kind" class="input input-sm" :disabled="!canManage">
                <option value="keyword">{{ t('kind.keyword') }}</option>
                <option value="regex">{{ t('kind.regex') }}</option>
              </select>
            </td>
            <td>
              <input
                v-model="r.pattern"
                class="input input-sm guard-mono"
                :class="err(i, 'pattern') ? 'input-error' : ''"
                :disabled="!canManage"
                :placeholder="r.kind === 'regex' ? '\\d{18}' : 'keyword'"
              />
              <p v-if="err(i, 'pattern')" class="input-error-text">{{ err(i, 'pattern') }}</p>
            </td>
            <td><SSwitch v-model="r.enabled" :disabled="!canManage" /></td>
            <td v-if="canManage">
              <button type="button" class="btn btn-ghost btn-sm" @click="remove(i)">×</button>
            </td>
          </tr>
        </tbody>
      </table>
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
.guard-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.guard-w-kind {
  width: 9rem;
}
.guard-w-switch {
  width: 5rem;
}
.guard-w-x {
  width: 3rem;
}
.guard-left {
  margin-right: auto;
}
</style>
