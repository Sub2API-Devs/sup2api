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
// left (a hint, a secondary action). `#header` is SModal's.
import { useId } from 'vue'
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
    persistent?: boolean
    describedby?: string
  }>(),
  { width: 'md', submitVariant: 'primary', submitText: undefined, cancelText: undefined, title: undefined, describedby: undefined }
)
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'submit'): void; (e: 'close'): void }>()
const t = useUiT()
const formId = useId()

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
    :describedby="describedby"
    @update:open="emit('update:open', $event)"
    @close="emit('close')"
  >
    <template v-if="$slots.header" #header><slot name="header" /></template>
    <form :id="formId" class="space-y-4" novalidate @submit.prevent="submit">
      <slot />
    </form>
    <template #footer>
      <slot name="footer">
        <div v-if="$slots['footer-start']" class="mr-auto flex min-w-0 items-center gap-2"><slot name="footer-start" /></div>
        <SButton :disabled="loading" @click="emit('update:open', false)">{{ cancelText || t(readonly ? 'ui.close' : 'ui.cancel') }}</SButton>
        <SButton v-if="!readonly" type="submit" :form="formId" :variant="submitVariant" :loading="loading" :disabled="submitDisabled">
          {{ submitText || t('ui.save') }}
        </SButton>
      </slot>
    </template>
  </SModal>
</template>
