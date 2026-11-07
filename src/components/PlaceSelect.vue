<template>
  <div class="place-select" :class="{ invalid: !!errorText }">
    <ion-input
      :value="modelValue ?? ''"
      :label="label"
      label-placement="stacked"
      fill="outline"
      readonly
      :disabled="disabled"
      :placeholder="placeholder"
      :helper-text="helper"
      :error-text="errorText"
      :class="{ 'ion-invalid ion-touched': !!errorText }"
      class="field"
      @click="openList"
      @keydown.enter.prevent="openList"
    >
      <ChevronDown slot="end" :size="18" aria-hidden="true" />
    </ion-input>

    <ion-modal :is-open="open" @did-present="focusSearch" @did-dismiss="open = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ label }}</ion-title>
          <ion-buttons slot="end"><ion-button @click="open = false">Cancel</ion-button></ion-buttons>
        </ion-toolbar>
        <ion-toolbar>
          <ion-searchbar ref="searchbar" v-model="query" :placeholder="`Search ${label.toLowerCase()}`" :debounce="0" />
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list lines="full">
          <ion-item v-if="clearable && modelValue" button :detail="false" @click="choose(null)">
            <ion-label class="muted">Clear</ion-label>
          </ion-item>
          <ion-item v-for="option in shown" :key="option" button :detail="false" @click="choose(option)">
            <ion-label>{{ option }}</ion-label>
            <Check v-if="option === modelValue" slot="end" :size="18" aria-hidden="true" />
          </ion-item>
        </ion-list>
        <p v-if="!shown.length" class="muted center ion-padding">Nothing matches “{{ query }}”.</p>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { searchKey } from '@/services/places'

/**
 * A field that opens a searchable list to pick one value from (provinces,
 * cities). Search ignores case and accents. A saved value that is not on the
 * list is still shown, with a note to pick again.
 */
const props = withDefaults(
  defineProps<{
    label: string
    options: string[]
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    errorText?: string
    helperText?: string
  }>(),
  { placeholder: 'Choose', disabled: false, clearable: false, errorText: undefined, helperText: undefined },
)
const modelValue = defineModel<string | null | undefined>()

const open = ref(false)
const query = ref('')
const searchbar = ref<{ $el: HTMLIonSearchbarElement } | null>(null)

const shown = computed(() => {
  const key = searchKey(query.value)
  return key ? props.options.filter((o) => searchKey(o).includes(key)) : props.options
})

const helper = computed(() =>
  modelValue.value && props.options.length && !props.options.includes(modelValue.value)
    ? 'Not on the official list. Tap to pick it again.'
    : props.helperText,
)

function openList(): void {
  if (props.disabled) return
  query.value = ''
  open.value = true
}

function focusSearch(): void {
  searchbar.value?.$el.setFocus()
}

function choose(option: string | null): void {
  modelValue.value = option
  open.value = false
}
</script>

<style scoped>
.field {
  cursor: pointer;
}
.place-select + .place-select,
.place-select {
  margin-top: 16px;
}
</style>
