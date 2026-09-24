<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, STable, confirm, toast, type TableColumn } from '@sub2api/ui'
import { formatDateTime } from '@/utils/format'
import { notifyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { hpKey, riskOf, type PluginDetail, type PluginGrant } from '../pluginUtil'
import RiskDot from '../parts/RiskDot.vue'
import ScopeChips from '../parts/ScopeChips.vue'
import StatusBadge from '../parts/StatusBadge.vue'

const props = defineProps<{ detail: PluginDetail }>()
const emit = defineEmits<{ (e: 'changed'): void }>()
const { t, te } = useI18n()
const auth = useAuthStore()

const grants = ref<PluginGrant[]>(props.detail.grants || [])
const loading = ref(false)
const revoking = ref('')

const columns = computed<TableColumn[]>(() => [
  { key: 'permission', label: t('plugins.grants.permission') },
  { key: 'risk', label: t('plugins.grants.risk') },
  { key: 'scope', label: t('plugins.grants.scope') },
  { key: 'status', label: t('common.status') },
  { key: 'granted_by', label: t('plugins.grants.grantedBy') },
  { key: 'granted_at', label: t('plugins.grants.grantedAt') },
  { key: 'actions', label: '', align: 'right' }
])

function hpLabel(id: string): string {
  const k = `plugins.hp.${hpKey(id)}`
  return te(k) ? t(k) : id
}

async function load() {
  loading.value = true
  try {
    const r = await api.get<PluginGrant[] | { items: PluginGrant[] }>(`/plugins/${encodeURIComponent(props.detail.key)}/grants`)
    grants.value = Array.isArray(r) ? r : r?.items || []
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}

async function revoke(g: PluginGrant) {
  const ok = await confirm({
    title: t('plugins.grants.revokeTitle'),
    message: t('plugins.grants.revokeConfirm', { perm: hpLabel(g.permission) }),
    danger: true,
    confirmText: t('plugins.grants.revoke')
  })
  if (!ok) return
  revoking.value = g.permission
  try {
    await api.del(`/plugins/${encodeURIComponent(props.detail.key)}/grants/${encodeURIComponent(g.permission)}`)
    toast(t('plugins.grants.revoked'), 'success')
    await load()
    emit('changed')
  } catch (e) {
    notifyError(e)
  } finally {
    revoking.value = ''
  }
}

onMounted(load)
</script>

<template>
  <SCard :padded="false">
    <STable :columns="columns" :rows="grants" :loading="loading" row-key="permission">
      <template #cell-permission="{ row }">
        <div class="font-medium">{{ hpLabel(row.permission) }}</div>
        <div class="font-mono text-xs muted">{{ row.permission }}</div>
      </template>
      <template #cell-risk="{ row }">
        <RiskDot :risk="riskOf(row.permission)" label />
      </template>
      <template #cell-scope="{ row }">
        <ScopeChips v-if="row.scope" :scope="row.scope" />
        <span v-else class="muted">—</span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #cell-granted_by="{ row }">
        {{ row.granted_by_email || row.granted_by || '—' }}
      </template>
      <template #cell-granted_at="{ row }">
        <span class="whitespace-nowrap text-xs">{{ formatDateTime(row.granted_at) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <SButton
          v-if="auth.has('plugin:manage') && row.status !== 'revoked'"
          size="sm"
          variant="ghost"
          class="!text-red-600"
          :loading="revoking === row.permission"
          @click="revoke(row)"
          >{{ t('plugins.grants.revoke') }}</SButton
        >
      </template>
    </STable>
  </SCard>
</template>
