<script setup lang="ts">
// Form dialog: SModal + <form> + the usual "Cancel / Save" footer, so a page
// only writes its fields and a submit handler.
//   <SFormModal v-model:open="editOpen" :title="…" :loading="saving" @submit="save">
//     <SField …><SInput v-model="form.name" /></SField>
//   </SFormModal>
// Enter in a field and the submit button both emit `submit` (native form
// submission, prevented). While `loading` the dialog cannot be dismissed and
// the submit button spins. `submitText` defaults to "Save"; `submitVariant`
// danger for destructive forms; `submitDisabled` blocks submitting.
// `#footer` replaces the whole footer, `#footer-start` adds content on its
// left (a hint, a secondary action). `#header` is SModal's. Other attributes
// (data-testid, …) land on the <form>.
import { useUiT } from './i18n'
import SButton from './SButton.vue'
import SModal from './SModal.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
    loading?: boolean
    submitText?: string
    cancelText?: string
    submitVariant?: 'primary' | 'danger'
    submitDisabled?: boolean
    /** Hide the submit button (read-only view of the same form). */
    readonly?: boolean
    /** Extra attributes of the submit button (data-testid, …). */
    submitAttrs?: Record<string, unknown>
    /** Extra attributes of the cancel button. */
    cancelAttrs?: Record<string, unknown>
    persistent?: boolean
    describedby?: string
  }>(),
  { width: 'md', submitVariant: 'primary', submitText: undefined, cancelText: undefined, title: undefined, describedby: undefined }
)
defineOptions({ inheritAttrs: false })
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'submit'): void; (e: 'close'): void }>()
const t = useUiT()

function submit() {
  if (props.loading || props.submitDisabled || props.readonly) return
  emit('submit')
}
</script>

<template>
  <SModal
    :open="open"
    :title="title"
    :width="width"
    :persistent="persistent || loading"
    :closable="!loading"
    :describedby="describedby"
    @update:open="emit('update:open', $event)"
    @close="emit('close')"
  >
    <template v-if="$slots.header" #header><slot name="header" /></template>
    <form class="space-y-4" novalidate v-bind="$attrs" @submit.prevent="submit">
      <slot />
      <!-- Enter in a field submits through this (implicit submission needs a submit button inside the form). -->
      <button type="submit" class="hidden" tabindex="-1" aria-hidden="true" />
    </form>
    <template #footer>
      <slot name="footer">
        <div v-if="$slots['footer-start']" class="mr-auto flex min-w-0 items-center gap-2"><slot name="footer-start" /></div>
        <SButton :disabled="loading" v-bind="cancelAttrs" @click="emit('update:open', false)">{{ cancelText || t(readonly ? 'ui.close' : 'ui.cancel') }}</SButton>
        <SButton v-if="!readonly" :variant="submitVariant" :loading="loading" :disabled="submitDisabled" v-bind="submitAttrs" @click="submit">
          {{ submitText || t('ui.save') }}
        </SButton>
      </slot>
    </template>
  </SModal>
</template>
