<template>
  <div class="field">
    <label class="pill" :class="{ invalid: !!error }">
      <ion-icon :icon="icon" aria-hidden="true" />
      <ion-input
        v-bind="$attrs"
        :value="modelValue"
        :type="type"
        :aria-label="label"
        :aria-invalid="!!error"
        @ion-input="emit('update:modelValue', String($event.detail.value ?? ''))"
      >
        <ion-input-password-toggle v-if="type === 'password'" slot="end" />
      </ion-input>
    </label>
    <small v-if="error" class="error" role="alert">{{ error }}</small>
    <small v-else-if="helper" class="helper">{{ helper }}</small>
  </div>
</template>

<script setup lang="ts">
import type { TextFieldTypes } from '@ionic/core'
import { IonIcon, IonInput, IonInputPasswordToggle } from '@ionic/vue'

/** One pill-shaped field for the auth pages. Extra attributes (placeholder, autocomplete…) go to the input. */
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ modelValue: string; icon: string; label: string; type?: TextFieldTypes; error?: string; helper?: string }>(), {
  type: 'text',
  error: undefined,
  helper: undefined,
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<style scoped>
.field {
  margin-bottom: 14px;
}
.pill {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  padding: 0 12px 0 18px;
  border-radius: 999px;
  background: var(--bm-surface);
  border: 2px solid transparent;
  transition: border-color 0.15s;
}
.pill:focus-within {
  border-color: var(--ion-color-primary);
}
.pill.invalid {
  border-color: var(--ion-color-danger);
}
.pill > ion-icon {
  flex: none;
  font-size: 20px;
  color: var(--ion-color-medium);
}
ion-input {
  --background: transparent;
  --padding-start: 0;
  --padding-end: 0;
  min-height: 46px;
  text-align: left;
}
small {
  display: block;
  margin: 4px 18px 0;
  text-align: left;
  font-size: 0.8rem;
}
.helper {
  color: var(--ion-color-medium);
}
.error {
  color: var(--ion-color-danger);
}
</style>
