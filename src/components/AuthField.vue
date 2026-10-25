<template>
  <div class="field">
    <label :for="id" class="label">{{ label }}</label>
    <div class="box" :class="{ invalid: !!error }">
      <ion-input
        v-bind="$attrs"
        :id="id"
        :value="modelValue"
        :type="type"
        :aria-label="label"
        :aria-invalid="!!error"
        :aria-describedby="error || helper ? `${id}-note` : undefined"
        @ion-input="emit('update:modelValue', String($event.detail.value ?? ''))"
      >
        <ion-input-password-toggle v-if="type === 'password'" slot="end" />
      </ion-input>
    </div>
    <small v-if="error" :id="`${id}-note`" class="note error" role="alert">{{ error }}</small>
    <small v-else-if="helper" :id="`${id}-note`" class="note">{{ helper }}</small>
  </div>
</template>

<script setup lang="ts">
import type { TextFieldTypes } from '@ionic/core'
import { IonInput, IonInputPasswordToggle } from '@ionic/vue'
import { useId } from 'vue'

/**
 * The design system's text field for the auth pages: label above, a 48px box with a
 * hairline border, Pine border + halo on focus, red on error, helper text below.
 * Extra attributes (placeholder, autocomplete…) go to the input.
 */
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ modelValue: string; label: string; type?: TextFieldTypes; error?: string; helper?: string }>(), {
  type: 'text',
  error: undefined,
  helper: undefined,
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const id = `auth-${useId()}`
</script>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}
.box {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 6px 0 14px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  box-shadow: inset 0 0 0 1px var(--border-default);
  transition: box-shadow var(--motion-fast) var(--ease-out);
}
.box:focus-within {
  box-shadow: inset 0 0 0 1.5px var(--brand-primary), 0 0 0 3px var(--brand-primary-subtle);
}
.box.invalid {
  box-shadow: inset 0 0 0 1.5px var(--danger-solid);
}
ion-input {
  --background: transparent;
  --padding-start: 0;
  --padding-end: 0;
  --highlight-color-focused: transparent;
  min-height: 46px;
  font-size: 15px;
}
.note {
  font-size: 12px;
  color: var(--text-muted);
}
.error {
  color: var(--danger-text);
}
</style>
