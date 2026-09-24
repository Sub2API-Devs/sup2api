<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SField, SSpinner, SSwitch, toast } from '@sub2api/ui'
import type { Account, AccountType } from '@/api/types'
import SchemaForm from '@/components/schema/SchemaForm.vue'
import PluginIframe from '@/components/plugin/PluginIframe.vue'
import PluginSlot from '@/components/plugin/PluginSlot.vue'
import GroupPicker from '@/components/GroupPicker.vue'
import ProxyPicker from '@/components/ProxyPicker.vue'
import { lt } from '@/i18n'
import { assetURL, usePluginStore } from '@/stores/plugins'
import { useAuthStore } from '@/stores/auth'
import { errorMessage, fieldErrors, notifyError } from '@/utils/errors'

// Step 2 of "new account" and the edit form (wireframe A.4): core basic
// information + the plugin-provided credential form (schema / iframe / native).
const props = defineProps<{ accountType: AccountType | null; account?: Account | null }>()
const emit = defineEmits<{ (e: 'saved', a: Account): void; (e: 'cancel'): void; (e: 'back'): void; (e: 'test', a: Account): void }>()
const { t } = useI18n()
const plugins = usePluginStore()
const auth = useAuthStore()

const editing = computed(() => !!props.account?.id)
const mode = computed(() => props.accountType?.form.mode || 'schema')

const basic = reactive({
  name: '',
  group_ids: [] as number[],
  proxy_id: null as number | null,
  priority: 10,
  max_concurrency: 10,
  schedulable: true
})
const credentials = ref<Record<string, any>>({})
const schema = ref<Record<string, any> | null>(null)
const uiSchema = ref<Record<string, any> | null>(null)
const formLoading = ref(false)
const formError = ref('')
const errors = ref<Record<string, string>>({})
const credErrors = ref<Record<string, string>>({})
const saving = ref(false)

const schemaForm = ref<InstanceType<typeof SchemaForm>>()
const iframe = ref<InstanceType<typeof PluginIframe>>()
const nativeRef = ref<any>()

const uiPlugin = computed(() => (props.accountType ? plugins.plugin(props.accountType.plugin_key) : undefined))
const iframeSrc = computed(() => (uiPlugin.value && props.accountType?.form.page ? assetURL(uiPlugin.value, props.accountType.form.page) : ''))
const nativeComponent = computed(() => (props.accountType ? plugins.component(props.accountType.plugin_key, props.accountType.form.component) : undefined))

watch(
  () => [props.account, props.accountType] as const,
  async ([a, at]) => {
    errors.value = {}
    credErrors.value = {}
    basic.name = a?.name || ''
    basic.group_ids = [...(a?.group_ids || [])]
    basic.proxy_id = a?.proxy_id ?? null
    basic.priority = a?.priority ?? 10
    basic.max_concurrency = a?.max_concurrency ?? 10
    basic.schedulable = a?.schedulable ?? true
    credentials.value = { ...(a?.credentials || {}) }
    schema.value = null
    uiSchema.value = null
    formError.value = ''
    if (at && at.form.mode === 'schema') {
      formLoading.value = true
      try {
        const f = await api.get<{ schema: Record<string, any>; ui_schema?: Record<string, any> }>(
          `/account-types/${encodeURIComponent(at.plugin_key)}/${encodeURIComponent(at.type)}/form`
        )
        schema.value = f.schema
        uiSchema.value = f.ui_schema || null
      } catch (e) {
        formError.value = errorMessage(e)
      } finally {
        formLoading.value = false
      }
    }
  },
  { immediate: true }
)

// Server-side credential errors are stale once the user edits the form.
watch(
  credentials,
  () => {
    if (Object.keys(credErrors.value).length) credErrors.value = {}
  },
  { deep: true }
)

async function collectCredentials(): Promise<Record<string, any> | null> {
  if (!props.accountType) return credentials.value
  if (mode.value === 'schema') {
    if (!schemaForm.value?.validate()) return null
    return credentials.value
  }
  if (mode.value === 'iframe') {
    if (!iframe.value?.isReady()) {
      toast(t('pluginHost.frameNotReady'), 'warning')
      return null
    }
    const v = await iframe.value.validate().catch(() => ({ ok: false }))
    if (!v?.ok) return null
    return (await iframe.value.getValue()) || {}
  }
  if (mode.value === 'native') {
    const fn = nativeRef.value?.validate
    if (typeof fn === 'function' && !(await fn())) return null
    return credentials.value
  }
  return credentials.value
}

async function save() {
  errors.value = {}
  credErrors.value = {}
  if (!basic.name.trim()) {
    errors.value = { name: t('schema.v.required') }
    return
  }
  const creds = await collectCredentials()
  if (!creds) return
  saving.value = true
  const body: Record<string, any> = {
    name: basic.name.trim(),
    group_ids: basic.group_ids,
    proxy_id: basic.proxy_id,
    priority: Number(basic.priority),
    max_concurrency: Number(basic.max_concurrency),
    schedulable: basic.schedulable
  }
  if (props.accountType && !props.account?.orphaned) body.credentials = creds
  try {
    let saved: Account
    if (editing.value) {
      saved = await api.patch<Account>(`/accounts/${props.account!.id}`, body)
    } else {
      // The account type is (plugin_key, type); accounts have no platform.
      body.plugin_key = props.accountType!.plugin_key
      body.type = props.accountType!.type
      saved = await api.post<Account>('/accounts', body)
    }
    toast(editing.value ? t('common.updated') : t('common.created'), 'success')
    emit('saved', saved)
  } catch (e) {
    const all = fieldErrors(e)
    const cred: Record<string, string> = {}
    const base: Record<string, string> = {}
    for (const [k, v] of Object.entries(all)) {
      const m = /^credentials[.[]?(.*?)]?$/.exec(k)
      if (m && k.startsWith('credentials')) cred[m[1].replace(/^\./, '')] = v
      else base[k] = v
    }
    errors.value = base
    credErrors.value = cred
    if (mode.value === 'iframe' && Object.keys(cred).length) iframe.value?.setErrors(cred)
    if (!Object.keys(all).length) notifyError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <section>
      <div class="mb-3 flex items-center justify-between">
        <h4 class="section-title !mb-0">{{ t('accounts.basic') }}</h4>
        <span class="badge badge-gray">{{ t('accounts.core') }}</span>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <SField :label="t('common.name')" :error="errors.name" required>
          <input v-model="basic.name" class="input" maxlength="100" />
        </SField>
        <SField :label="t('accounts.groups')" :error="errors.group_ids">
          <GroupPicker v-model="basic.group_ids as any" multiple />
        </SField>
        <SField :label="t('accounts.proxy')" :error="errors.proxy_id">
          <ProxyPicker v-model="basic.proxy_id" />
        </SField>
        <div class="grid grid-cols-2 gap-3">
          <SField :label="t('accounts.priority')" :hint="t('accounts.priorityHint')" :error="errors.priority">
            <input v-model.number="basic.priority" type="number" min="0" class="input" />
          </SField>
          <SField :label="t('accounts.maxConcurrency')" :hint="t('accounts.zeroUnlimited')" :error="errors.max_concurrency">
            <input v-model.number="basic.max_concurrency" type="number" min="0" class="input" />
          </SField>
        </div>
        <div class="sm:col-span-2">
          <SSwitch v-model="basic.schedulable" :label="t('accounts.schedulable')" />
        </div>
      </div>
    </section>

    <section class="border-t border-gray-100 pt-5 dark:border-dark-700">
      <div class="mb-3 flex items-center justify-between">
        <h4 class="section-title !mb-0">{{ t('accounts.credentials') }}</h4>
        <span v-if="accountType" class="badge badge-purple">{{ lt(accountType.plugin_name) || accountType.plugin_key }} · {{ lt(accountType.label) || accountType.type }}</span>
      </div>

      <p v-if="account?.orphaned || !accountType" class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
        {{ t('accounts.orphanedEdit') }}
      </p>
      <template v-else-if="mode === 'schema'">
        <div v-if="formLoading" class="flex justify-center py-6"><SSpinner /></div>
        <p v-else-if="formError" class="text-sm text-red-500">{{ formError }}</p>
        <SchemaForm v-else-if="schema" ref="schemaForm" v-model="credentials" :schema="schema" :ui-schema="uiSchema" :errors="credErrors" />
      </template>
      <template v-else-if="mode === 'iframe'">
        <PluginIframe
          v-if="iframeSrc"
          ref="iframe"
          :plugin-key="accountType.plugin_key"
          :page="accountType.form.page"
          :src="iframeSrc"
          mode="account-form"
          :value="credentials"
          :min-height="200"
          @change="credentials = $event || {}"
        />
        <p v-else class="text-sm text-red-500">{{ t('accounts.formUnavailable') }}</p>
      </template>
      <template v-else-if="mode === 'native'">
        <component
          :is="nativeComponent"
          v-if="nativeComponent"
          ref="nativeRef"
          v-model="credentials"
          :mode="editing ? 'edit' : 'create'"
          :account="account"
          :errors="credErrors"
        />
        <p v-else class="text-sm text-red-500">
          {{ plugins.errors[accountType.plugin_key] || t('accounts.formUnavailable') }}
        </p>
      </template>

      <div class="mt-4 space-y-3">
        <PluginSlot name="account.form.widgets" :props="{ account, accountType, credentials }" />
      </div>
    </section>

    <div class="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-dark-700">
      <SButton v-if="!editing" class="mr-auto" variant="ghost" @click="emit('back')">← {{ t('common.previous') }}</SButton>
      <SButton v-if="editing && auth.has('account:test')" class="mr-auto" @click="emit('test', account!)">{{ t('accounts.testConnection') }}</SButton>
      <SButton @click="emit('cancel')">{{ t('common.cancel') }}</SButton>
      <SButton type="submit" variant="primary" :loading="saving">{{ t('common.save') }}</SButton>
    </div>
  </form>
</template>
