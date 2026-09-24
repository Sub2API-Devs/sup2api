<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SModal, SIcon, toast } from '@sub2api/ui'
import { notifyError } from '@/utils/errors'

const props = defineProps<{ open: boolean; pluginKey: string; name: string }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'done'): void }>()
const { t } = useI18n()

const purge = ref(false)
const typed = ref('')
const busy = ref(false)
const matches = computed(() => typed.value.trim() === props.pluginKey)

watch(
  () => props.open,
  (v) => {
    if (v) {
      purge.value = false
      typed.value = ''
    }
  }
)

async function submit() {
  if (!matches.value) return
  busy.value = true
  try {
    await api.del(`/plugins/${encodeURIComponent(props.pluginKey)}`, { purge: purge.value })
    toast(t('plugins.uninstall.done', { name: props.name }), 'success')
    emit('update:open', false)
    emit('done')
  } catch (e) {
    notifyError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SModal :open="open" :title="t('plugins.uninstall.title', { name })" width="md" @update:open="(v) => emit('update:open', v)">
    <div class="space-y-4 text-sm">
      <p>{{ t('plugins.uninstall.body') }}</p>
      <label
        class="flex items-start gap-2 rounded-lg border p-3"
        :class="purge ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-gray-200 dark:border-dark-700'"
      >
        <input v-model="purge" type="checkbox" class="checkbox mt-0.5" />
        <span>
          <span class="font-medium">{{ t('plugins.uninstall.purge', { schema: 'plg_' + pluginKey }) }}</span>
          <span class="mt-0.5 block text-xs muted">{{ t('plugins.uninstall.purgeHint') }}</span>
        </span>
      </label>
      <p v-if="purge" class="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
        <SIcon name="warning" class="h-4 w-4" />{{ t('plugins.uninstall.purgeWarn') }}
      </p>
      <div>
        <label class="input-label">{{ t('plugins.uninstall.typeKey', { key: pluginKey }) }}</label>
        <input v-model="typed" class="input font-mono" :placeholder="pluginKey" autocomplete="off" @keyup.enter="submit" />
      </div>
    </div>
    <template #footer>
      <SButton :disabled="busy" @click="emit('update:open', false)">{{ t('common.cancel') }}</SButton>
      <SButton variant="danger" :loading="busy" :disabled="!matches" @click="submit">
        <SIcon name="trash" class="h-4 w-4" />{{ t('plugins.uninstall.confirm') }}
      </SButton>
    </template>
  </SModal>
</template>
