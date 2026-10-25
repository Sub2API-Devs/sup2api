<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SProgress } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { formatCompact } from '@/utils/format'
import { cappedLimits } from './keyLimits'

// The capped limits of a key, each as used / cap with a bar (unknown use
// shows only the cap); a pencil opens the editor (emits edit).
const props = defineProps<{ apiKey: ApiKey; editable?: boolean }>()
defineEmits<{ (e: 'edit'): void }>()
const { t } = useI18n()
const rows = computed(() => cappedLimits(props.apiKey))
const tone = (used: number, max: number) => (used >= max ? 'danger' : used >= max * 0.8 ? 'warning' : 'primary')
</script>

<template>
  <div class="flex items-center gap-1" data-testid="key-limits">
    <div v-if="rows.length" class="min-w-32 space-y-1">
      <div v-for="r in rows" :key="r.field" class="text-xs tabular-nums">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-fg-muted">{{ t(r.short) }}</span>
          <span class="text-fg"><template v-if="r.used !== undefined">{{ formatCompact(r.used) }} / </template>{{ formatCompact(r.max) }}</span>
        </div>
        <SProgress v-if="r.used !== undefined" :value="r.used" :max="r.max" :tone="tone(r.used, r.max)" class="mt-0.5" />
      </div>
    </div>
    <span v-else class="text-xs text-fg-muted">{{ t('apikeys.limits.none') }}</span>
    <SButton v-if="editable" variant="ghost" size="xs" icon="edit" icon-only :aria-label="t('apikeys.limits.edit')" :title="t('apikeys.limits.edit')" data-testid="edit-key-limits" @click.stop="$emit('edit')" />
  </div>
</template>
