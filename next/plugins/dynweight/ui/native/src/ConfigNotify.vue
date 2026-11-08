<script setup lang="ts">
import { computed } from 'vue'
import { SCard, SField, SSegmented, SSelect, SSettingRow, SSwitch, STagInput } from '@sub2api/ui'
import type { Draft } from './configView'
import { useDwHost, type Channel } from './host'

// Notifications through a core channel, and the event log: both global
// only. The channel, language and recipients stay editable while
// notifications are off, greyed out as not in use.
const props = defineProps<{ channels: Channel[]; readonly?: boolean }>()
const draft = defineModel<Draft>({ required: true })
const host = useDwHost()
const t = host.t

const channelOptions = computed(() => [
  { value: '', label: t('notify.noChannel') },
  ...props.channels.map((c) => ({ value: c.id, label: host.i18n.text(c.label) }))
])
const channel = computed(() => props.channels.find((c) => c.id === draft.value.notify.channel))
const languageOptions = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' }
]
</script>

<template>
  <SCard :title="t('cfg.notify.title')" :subtitle="t('notify.hint')" class="dw-block">
    <fieldset class="dw-fieldset dw-cfg-fields" :disabled="readonly">
      <SSettingRow flush dense :label="t('cfg.notify.send')" :description="t('cfg.notify.sendHint')">
        <SSwitch v-model="draft.notify.enabled" :disabled="readonly" />
      </SSettingRow>
      <div class="dw-cfg-fields" :class="{ 'dw-cfg-idle': !draft.notify.enabled }">
        <div class="dw-cfg-grid">
          <SField :label="t('notify.channel')" :hint="channel ? host.i18n.text(channel.description) : channels.length ? '' : t('notify.noChannels')">
            <SSelect v-model="draft.notify.channel" :options="channelOptions" :disabled="readonly" />
          </SField>
          <SField :label="t('notify.language')">
            <SSegmented v-model="draft.notify.language" :options="languageOptions" size="sm" :disabled="readonly" />
          </SField>
        </div>
        <SField :label="t('notify.recipients')" :hint="channel ? t('notify.recipientsHint', { kind: channel.recipient }) : ''">
          <STagInput v-model="draft.notify.recipients" :max="20" :disabled="readonly" />
        </SField>
      </div>
      <SSettingRow flush dense :label="t('cfg.notify.log')" :description="t('logEvents.hint')">
        <SSwitch v-model="draft.log_events" :disabled="readonly" />
      </SSettingRow>
    </fieldset>
  </SCard>
</template>
