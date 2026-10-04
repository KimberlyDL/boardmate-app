<template>
  <div v-if="settings">
    <p class="muted">Every setting starts from BoardMate's recommended default. Change only what you need.</p>

    <template v-for="section in visibleSections" :key="section.id">
      <div class="section-head">
        <h3>{{ section.title }}</h3>
        <ion-button v-if="canEdit && !keyOnly" size="small" fill="clear" @click="reset(section.id)">Reset</ion-button>
      </div>

      <ion-list lines="full">
        <ion-item v-for="field in fieldsOf(section)" :key="field.key">
          <!-- Yes / no -->
          <ion-toggle
            v-if="field.type === 'bool'"
            :checked="!!draft[field.key]"
            :disabled="!canEdit"
            @ion-change="draft[field.key] = $event.detail.checked"
          >
            <span class="ion-text-wrap">{{ field.label }}</span>
          </ion-toggle>

          <!-- Choice -->
          <ion-select
            v-else-if="field.type === 'select'"
            v-model="draft[field.key]"
            :label="field.label"
            label-placement="stacked"
            interface="popover"
            :disabled="!canEdit"
          >
            <ion-select-option v-for="o in field.options" :key="o.value" :value="o.value">{{ o.label }}</ion-select-option>
          </ion-select>

          <!-- Numbers, money, times -->
          <ion-input
            v-else
            :value="display(field)"
            :type="field.type === 'time' ? 'time' : 'text'"
            :inputmode="field.type === 'time' ? undefined : 'decimal'"
            :label="field.label + (field.unit ? ` (${field.unit})` : field.type === 'money' ? ' (₱)' : field.type === 'percent' ? ' (%)' : '')"
            label-placement="stacked"
            :readonly="!canEdit"
            :class="{ 'ion-invalid ion-touched': errors[field.key] }"
            :error-text="errors[field.key]?.[0]"
            @ion-input="setFromInput(field, String($event.detail.value ?? ''))"
          />

          <ion-note slot="helper" class="note">
            <span v-if="field.help">{{ field.help }} </span>
            <span v-if="isDefault(field)" class="default">Default</span>
            <span v-else class="changed">Default: {{ describeDefault(field) }}</span>
            <span v-if="field.pending" class="pending"> · Takes effect once {{ field.pending }} is available.</span>
          </ion-note>
        </ion-item>
      </ion-list>
    </template>

    <ion-button v-if="keyOnly" expand="block" fill="clear" size="small" @click="keyOnly = false">More settings</ion-button>

    <ion-button v-if="canEdit" expand="block" class="form-actions" :disabled="busy || !dirty" @click="save">
      {{ dirty ? 'Save settings' : 'No changes' }}
    </ion-button>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonInput, IonItem, IonList, IonNote, IonSelect, IonSelectOption, IonToggle } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { peso, toCentavos, toPesoInput } from '@/lib/money'
import { SETTING_SECTIONS, type SettingField, type SettingSection } from '@/lib/propertySettings'
import { errorMessage, fieldErrors } from '@/services/api'
import { propertyService } from '@/services/properties'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { Property, PropertySettings, SettingsValues } from '@/types/property'

/** `compact` starts with only the key settings (setup wizard). */
const props = defineProps<{ property: Property; compact?: boolean }>()

const toast = useToast()
const prompt = usePrompt()
const canEdit = computed(() => props.property.abilities.includes('manage_rules'))
const settings = ref<PropertySettings | null>(null)
const draft = ref<SettingsValues>({})
const errors = ref<Record<string, string[]>>({})
const busy = ref(false)
const keyOnly = ref(!!props.compact)

const visibleSections = computed(() => SETTING_SECTIONS.filter((s) => fieldsOf(s).length > 0))

function fieldsOf(section: SettingSection): SettingField[] {
  return section.fields.filter((f) => (!keyOnly.value || f.key_setting) && (!f.showIf || f.showIf(draft.value)))
}

const dirty = computed(() =>
  settings.value ? Object.keys(draft.value).some((k) => JSON.stringify(draft.value[k]) !== JSON.stringify(settings.value!.values[k])) : false,
)

async function load() {
  try {
    settings.value = await propertyService.settings(props.property.id)
    draft.value = JSON.parse(JSON.stringify(settings.value.values))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
onMounted(load)

function display(field: SettingField): string {
  const v = draft.value[field.key]
  if (v === null || v === undefined) return ''
  if (field.type === 'money') return toPesoInput(v as number)
  if (field.type === 'percent') return String((v as number) / 100)
  if (field.type === 'day-list') return (v as number[]).join(', ')
  return String(v)
}

function setFromInput(field: SettingField, raw: string) {
  const text = raw.trim()
  let value: SettingsValues[string] = text === '' ? null : text
  if (field.type === 'int') value = text === '' ? null : Number(text)
  if (field.type === 'money') value = text === '' ? null : toCentavos(text)
  if (field.type === 'percent') value = text === '' ? null : Math.round(Number(text) * 100)
  if (field.type === 'day-list') value = text.split(/[,\s]+/).filter(Boolean).map(Number)
  draft.value[field.key] = value
}

function isDefault(field: SettingField): boolean {
  return JSON.stringify(draft.value[field.key]) === JSON.stringify(settings.value?.defaults[field.key])
}

function describeDefault(field: SettingField): string {
  const d = settings.value?.defaults[field.key]
  if (d === null || d === undefined) return 'none'
  if (field.type === 'bool') return d ? 'on' : 'off'
  if (field.type === 'money') return peso(d as number)
  if (field.type === 'select') return field.options?.find((o) => o.value === d)?.label ?? String(d)
  if (field.type === 'day-list') return (d as number[]).join(', ')
  return `${d}${field.unit ? ` ${field.unit}` : ''}`
}

async function save() {
  if (!settings.value) return
  const changes: SettingsValues = {}
  for (const key of Object.keys(draft.value)) {
    if (JSON.stringify(draft.value[key]) !== JSON.stringify(settings.value.values[key])) changes[key] = draft.value[key]
  }
  busy.value = true
  errors.value = {}
  try {
    settings.value = await propertyService.updateSettings(props.property.id, changes)
    draft.value = JSON.parse(JSON.stringify(settings.value.values))
    toast.success('Settings saved.')
  } catch (e) {
    errors.value = fieldErrors(e)
    keyOnly.value = false
    toast.error(Object.values(errors.value)[0]?.[0] ?? errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function reset(section: string) {
  const title = SETTING_SECTIONS.find((s) => s.id === section)?.title
  if (!(await prompt.confirm('Reset to defaults?', `"${title}" goes back to BoardMate's recommended settings.`, 'Reset'))) return
  try {
    settings.value = await propertyService.resetSettings(props.property.id, [section])
    draft.value = JSON.parse(JSON.stringify(settings.value.values))
    toast.success('Back to the defaults.')
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
</script>

<style scoped>
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}
.section-head h3 {
  margin: 0;
  font-size: 1rem;
}
.note {
  white-space: normal;
}
.default {
  color: var(--ion-color-medium);
}
.changed {
  color: var(--ion-color-primary);
}
.pending {
  color: var(--ion-color-medium);
  font-style: italic;
}
</style>
