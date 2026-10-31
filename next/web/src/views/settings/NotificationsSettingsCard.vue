<script setup lang="ts">
// Notifications (CONTRACTS §73.4): the channels plugins deliver, a test send,
// and the delivery record of what the core and plugins sent.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SHint, SInput, SPagination, SSectionTitle, SSelect, SSettingRow, SSettingsGroup, STable, localizedText, toast, type TableColumn, type Tone } from '@sub2api/ui'
import type { NotificationChannel, NotificationRecord, NotificationStatus } from '@/api/types'
import TimeText from '@/components/TimeText.vue'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import { applyFormError } from '@/utils/formErrors'

const { t, locale } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))

const channels = ref<NotificationChannel[]>([])
const channelsLoaded = ref(false)
const test = ref({ channel: '', recipients: '' })
const testing = ref(false)
const testErrors = ref<Record<string, string>>({})
const records = useList<NotificationRecord>('/notifications', { status: '' })

const channelOptions = computed(() => channels.value.map((c) => ({ value: c.id, label: `${localizedText(c.label, locale.value)} (${c.id})` })))
const statusOptions = computed(() => [
  { value: '', label: t('settings.notifications.allStatuses') },
  ...(['pending', 'sending', 'sent', 'failed'] as const).map((s) => ({ value: s, label: t(`settings.notifications.status.${s}`) }))
])
const STATUS_TONE: Record<NotificationStatus, Tone> = { pending: 'gray', sending: 'primary', sent: 'success', failed: 'danger' }
const SEVERITY_TONE: Record<NotificationRecord['severity'], Tone> = { info: 'gray', warning: 'warning', critical: 'danger' }

const channelColumns = computed<TableColumn[]>(() => [
  { key: 'id', label: t('settings.notifications.channel') },
  { key: 'plugin_key', label: t('settings.notifications.provider') },
  { key: 'recipient', label: t('settings.notifications.recipientFormat') }
])
const recordColumns = computed<TableColumn[]>(() => [
  { key: 'created_at', label: t('common.createdAt') },
  { key: 'source', label: t('settings.notifications.source') },
  { key: 'channel', label: t('settings.notifications.channel') },
  { key: 'subject', label: t('settings.notifications.subject') },
  { key: 'status', label: t('common.status') }
])

async function loadChannels() {
  try {
    channels.value = (await api.get<NotificationChannel[]>('/notifications/channels')) || []
    test.value.channel ||= channels.value[0]?.id ?? ''
  } catch (e) {
    notifyError(e)
  } finally {
    channelsLoaded.value = true
  }
}

async function sendTest() {
  testErrors.value = {}
  const recipients = test.value.recipients.split(/[\s,;]+/).filter(Boolean)
  testing.value = true
  try {
    await api.post('/notifications/test', { channel: test.value.channel, recipients })
    toast(t('settings.notifications.testQueued'), 'success')
    await records.reload()
  } catch (e) {
    applyFormError(e, testErrors)
  } finally {
    testing.value = false
  }
}

onMounted(loadChannels)
</script>

<template>
  <div class="space-y-5" data-testid="notification-settings">
    <STable card :columns="channelColumns" :rows="channels" row-key="id" :loading="!channelsLoaded" :empty-text="t('settings.notifications.noChannels')" data-testid="notification-channels">
      <template #toolbar>
        <div>
          <SSectionTitle tag="h3" class="mb-0" :title="t('settings.notifications.channelsTitle')" />
          <SHint size="xs">{{ t('settings.notifications.channelsHint') }}</SHint>
        </div>
      </template>
      <template #cell-id="{ row }">
        <div class="font-medium">{{ localizedText(row.label, locale) }} <span class="font-mono text-xs text-fg-muted">{{ row.id }}</span></div>
        <div v-if="localizedText(row.description, locale)" class="text-xs text-fg-muted">{{ localizedText(row.description, locale) }}</div>
      </template>
      <template #cell-plugin_key="{ row }">{{ localizedText(row.plugin_name, locale) }}</template>
      <template #cell-recipient="{ row }">{{ t(`settings.notifications.recipient.${row.recipient}`) }}</template>
    </STable>

    <SSettingsGroup v-if="canManage && channels.length" :title="t('settings.notifications.testTitle')" :description="t('settings.notifications.testHint')">
      <SSettingRow :label="t('settings.notifications.channel')" :error="testErrors.channel">
        <SSelect v-model="test.channel" :options="channelOptions" class="w-full sm:w-64" />
      </SSettingRow>
      <SSettingRow :label="t('settings.notifications.recipients')" :description="t('settings.notifications.recipientsHint')" :error="testErrors.recipients">
        <div class="flex w-full gap-2 sm:w-auto">
          <SInput v-model="test.recipients" name="recipients" class="w-full sm:w-64" />
          <SButton :loading="testing" :disabled="!test.recipients.trim()" data-testid="notification-test" @click="sendTest">{{ t('settings.notifications.sendTest') }}</SButton>
        </div>
      </SSettingRow>
    </SSettingsGroup>

    <STable card :columns="recordColumns" :rows="records.items.value" :loading="records.loading.value" data-testid="notification-records">
      <template #toolbar>
        <div class="flex w-full flex-wrap items-center justify-between gap-2">
          <div>
            <SSectionTitle tag="h3" class="mb-0" :title="t('settings.notifications.recordsTitle')" />
            <SHint size="xs">{{ t('settings.notifications.recordsHint') }}</SHint>
          </div>
          <SSelect v-model="records.filters.status" :options="statusOptions" class="w-40" />
        </div>
      </template>
      <template #cell-created_at="{ row }"><TimeText :value="row.created_at" mode="relative" /></template>
      <template #cell-channel="{ row }">
        <span class="font-mono text-xs">{{ row.channel }}</span>
        <div class="max-w-[16rem] truncate text-xs text-fg-muted" :title="row.recipients.join(', ')">{{ row.recipients.join(', ') }}</div>
      </template>
      <template #cell-subject="{ row }">
        <SBadge :tone="SEVERITY_TONE[row.severity]" class="mr-1">{{ t(`settings.notifications.severity.${row.severity}`) }}</SBadge>
        <span :title="row.body">{{ row.subject }}</span>
      </template>
      <template #cell-status="{ row }">
        <SBadge :tone="STATUS_TONE[row.status]">{{ t(`settings.notifications.status.${row.status}`) }}</SBadge>
        <span v-if="row.attempts > 1" class="ml-1 text-xs text-fg-muted">{{ t('settings.notifications.attempts', { n: row.attempts }) }}</span>
        <div v-if="row.last_error" class="max-w-[20rem] truncate text-xs text-danger-600 dark:text-danger-400" :title="row.last_error">{{ row.last_error }}</div>
      </template>
      <template #footer>
        <SPagination v-model:page="records.page.value" v-model:page-size="records.pageSize.value" :total="records.total.value" />
      </template>
    </STable>
  </div>
</template>
