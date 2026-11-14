<script setup lang="ts">
// Role grants a built-in plugin's automatic upgrade held back for review
// (role_grants_to_review, CONTRACTS P4C): listed with what they need; who may
// name every role listed (plugin:install, and each role nameable as on the
// consent page: useNameableRoles, the server's checkRolesGrantable) confirms
// them or rejects them all, per version.
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SButton, confirm, toast } from '@sub2api/ui'
import type { PluginRoleGrant } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import NewRoleGrants from '../consent/NewRoleGrants.vue'
import { useNameableRoles } from '../consent/newPermissionRoles'

const props = defineProps<{ pluginKey: string; grants: PluginRoleGrant[] }>()
const emit = defineEmits<{ (e: 'changed'): void }>()
const { t } = useI18n()
const auth = useAuthStore()

const { canName } = useNameableRoles()
const canReview = computed(() => auth.has('plugin:install') && props.grants.every((g) => canName(g.role)))
const versions = computed(() => [...new Set(props.grants.map((g) => g.version || ''))].filter(Boolean))
const busy = ref<'' | 'confirm' | 'reject'>('')

/** One version; a 404 means nothing of it awaits review any more (settled meanwhile). */
async function post(version: string, action: 'confirm' | 'reject') {
  try {
    await api.post(`/plugins/${encodeURIComponent(props.pluginKey)}/versions/${encodeURIComponent(version)}/role-grants/${action}`)
  } catch (e) {
    if (!isApiError(e) || e.status !== 404) throw e
  }
}

async function review(confirmed: boolean) {
  if (!confirmed && !(await confirm({ message: t('plugins.roleGrants.rejectConfirm'), danger: true }))) return
  busy.value = confirmed ? 'confirm' : 'reject'
  try {
    for (const v of versions.value) await post(v, confirmed ? 'confirm' : 'reject')
    toast(t(confirmed ? 'plugins.roleGrants.confirmed' : 'plugins.roleGrants.rejected'), 'success')
  } catch (e) {
    notifyError(e)
  } finally {
    busy.value = ''
    emit('changed')
  }
}
</script>

<template>
  <NewRoleGrants :grants="grants" :title="t('plugins.roleGrants.title')" :hint="t(canReview ? 'plugins.roleGrants.hint' : 'plugins.roleGrants.hintNoRight')" data-testid="role-grants-review">
    <template v-if="canReview" #actions>
      <div class="mt-3 flex gap-2">
        <SButton size="sm" variant="primary" :loading="busy === 'confirm'" :disabled="!!busy" data-testid="role-grants-confirm" @click="review(true)">{{ t('plugins.roleGrants.confirm') }}</SButton>
        <SButton size="sm" variant="danger" :loading="busy === 'reject'" :disabled="!!busy" data-testid="role-grants-reject" @click="review(false)">{{ t('plugins.roleGrants.rejectAll') }}</SButton>
      </div>
    </template>
  </NewRoleGrants>
</template>
