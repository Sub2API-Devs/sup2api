<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SButton, SDrawer, SHint } from '@sub2api/ui'
import JevQuestionsView from './JevQuestionsView.vue'
import { matchesDefault, parseCategories, type AuditorForm } from './auditorForm'
import { useModHost } from './host'
import type { Defaults } from './types'

// The defaults of the auditor being edited, read only: the default question
// table (Jev and the question-table LLM) compared row by row with the table
// in the form, or the default system prompt and categories of an LLM verdict
// auditor. "Restore" asks the editor to put them back (it confirms; nothing
// is saved until the form is); `readonly` (a read user, or nothing to
// restore) leaves it out.
const props = defineProps<{ form: AuditorForm; defaults: Defaults | null; readonly?: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ (e: 'restore'): void }>()
const host = useModHost()
const t = host.t

const verdict = computed(() => props.form.type === 'llm_verdict')
const same = computed(() => matchesDefault(props.form, props.defaults))
const title = computed(() => t(verdict.value ? 'auditors.defaultsTitle.llm' : 'auditors.defaultsTitle.questions'))
const formCategories = computed(() => new Set(parseCategories(props.form.categories).map((c) => `${c.id}\u0000${c.description}`)))
</script>

<template>
  <SDrawer v-model:open="open" :title="title" width="lg">
    <div v-if="defaults" class="mod-form">
      <template v-if="verdict">
        <div>
          <div class="mod-view-head">
            <span class="mod-sub">{{ t('auditors.systemPrompt') }}</span>
            <SBadge :tone="same.system_prompt ? 'gray' : 'warning'" size="xs">{{ t(same.system_prompt ? 'auditors.diff.same' : 'auditors.diff.changed') }}</SBadge>
          </div>
          <p class="mod-prewrap mod-view-text">{{ defaults.llm_system_prompt }}</p>
        </div>
        <div>
          <div class="mod-view-head">
            <span class="mod-sub">{{ t('auditors.categories') }}</span>
            <SBadge :tone="same.categories ? 'gray' : 'warning'" size="xs">{{ t(same.categories ? 'auditors.diff.same' : 'auditors.diff.changed') }}</SBadge>
          </div>
          <ul class="mod-view-list">
            <li v-for="c in defaults.llm_categories" :key="c.id">
              <code class="mod-code-plain">{{ c.id }}</code> {{ c.description }}
              <SBadge v-if="!formCategories.has(`${c.id}\u0000${c.description}`)" tone="warning" size="xs">{{ t('auditors.diff.missing') }}</SBadge>
            </li>
          </ul>
        </div>
      </template>
      <template v-else>
        <SHint size="xs">{{ t(defaults.custom ? 'auditors.defaultsFromSettings' : 'auditors.defaultsBuiltin', { v: defaults.default_version }) }}</SHint>
        <JevQuestionsView :questions="defaults.default" :compare="form.questions" :hide-threshold="form.type === 'llm_questions'" />
      </template>
    </div>
    <template #footer>
      <SButton @click="open = false">{{ host.i18n.t('ui.close') }}</SButton>
      <SButton v-if="!readonly" variant="primary" icon="refresh" @click="emit('restore')">{{ t('auditors.restoreDefault') }}</SButton>
    </template>
  </SDrawer>
</template>
