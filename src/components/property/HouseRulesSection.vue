<template>
  <div>
    <p v-if="loading" class="muted">Loading…</p>

    <template v-else-if="data">
      <!-- The rules in force -->
      <template v-if="!editing">
        <p class="muted">
          Boarders accept these when they apply. When you publish a new version, everyone staying here is asked to accept it.
        </p>
        <template v-if="data.current">
          <h3>Version {{ data.current.version }}</h3>
          <p class="muted small">
            Published {{ manilaDate(data.current.published_at!).format('MMM D, YYYY') }}<template v-if="data.current.published_by"> by {{ data.current.published_by }}</template>
          </p>
          <house-rules-list :rules="data.current.rules" />
        </template>
        <p v-else class="muted center">No house rules yet.</p>

        <ion-card v-if="data.draft" class="draft">
          <ion-card-content>
            <strong>Unpublished draft</strong> ({{ data.draft.rules.length }} {{ data.draft.rules.length === 1 ? 'rule' : 'rules' }}). Boarders do not see it yet.
          </ion-card-content>
        </ion-card>
        <ion-button v-if="canEdit" expand="block" class="form-actions" @click="startEditing">
          {{ data.draft ? 'Continue the draft' : data.current ? 'Change the rules' : 'Write house rules' }}
        </ion-button>

        <template v-if="data.versions.length > 1">
          <h3>Earlier versions</h3>
          <ion-list lines="full">
            <ion-item v-for="v in data.versions.slice(1)" :key="v.version" button :detail="true" @click="openVersion(v.version)">
              <ion-label class="ion-text-wrap">
                <h2>Version {{ v.version }}</h2>
                <p>
                  {{ v.published_at ? manilaDate(v.published_at).format('MMM D, YYYY') : '' }} · {{ v.rules_count }} rules<template v-if="v.note"> · {{ v.note }}</template>
                </p>
              </ion-label>
            </ion-item>
          </ion-list>
        </template>
      </template>

      <!-- Editing the draft -->
      <template v-else>
        <p class="muted small">One rule per box. Saving keeps a draft; boarders see the rules only once you publish.</p>
        <ion-card v-for="(rule, i) in rows" :key="rule.key">
          <ion-card-content>
            <div class="row-head">
              <ion-select v-model="rule.category" :aria-label="`Category of rule ${i + 1}`" interface="popover" fill="outline" class="category">
                <ion-select-option v-for="(label, value) in HouseRuleCategoryLabels" :key="value" :value="value">{{ label }}</ion-select-option>
              </ion-select>
              <ion-button fill="clear" size="small" :disabled="i === 0" :aria-label="`Move rule ${i + 1} up`" @click="move(i, -1)">↑</ion-button>
              <ion-button fill="clear" size="small" color="danger" :aria-label="`Remove rule ${i + 1}`" @click="rows.splice(i, 1)">Remove</ion-button>
            </div>
            <ion-textarea v-model="rule.body" :aria-label="`Rule ${i + 1}`" fill="outline" :auto-grow="true" :rows="2" :maxlength="500" placeholder="e.g. Keep quiet from 10:00 PM to 6:00 AM." />
          </ion-card-content>
        </ion-card>
        <ion-button fill="outline" size="small" @click="addRow">Add a rule</ion-button>

        <template v-if="data.automatic.length">
          <p class="label">Added from your curfew and visitor settings</p>
          <p class="muted small">Change these in the Settings tab; changing them publishes a new version by itself.</p>
          <house-rules-list :rules="data.automatic" />
        </template>

        <ion-input v-model="note" label="What changed (optional, shown to boarders)" label-placement="stacked" fill="outline" class="gap" :maxlength="255" />

        <div class="actions">
          <ion-button :disabled="busy" @click="save(false)">Save draft</ion-button>
          <ion-button :disabled="busy" color="success" @click="save(true)">Publish</ion-button>
          <ion-button fill="clear" color="medium" :disabled="busy" @click="editing = false">Back</ion-button>
          <ion-button v-if="data.draft" fill="clear" color="danger" :disabled="busy" @click="discard">Discard draft</ion-button>
        </div>
      </template>
    </template>

    <ion-modal :is-open="shown !== null" @did-dismiss="shown = null">
      <ion-header>
        <ion-toolbar>
          <ion-title>Version {{ shown?.version }}</ion-title>
          <ion-buttons slot="end"><ion-button @click="shown = null">Close</ion-button></ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div v-if="shown" class="narrow">
          <p class="muted small">Published {{ manilaDate(shown.published_at!).format('MMM D, YYYY') }}<template v-if="shown.note"> · {{ shown.note }}</template></p>
          <house-rules-list :rules="shown.rules" />
        </div>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import HouseRulesList from '@/components/houseRules/HouseRulesList.vue'
import { manilaDate } from '@/lib/dayjs'
import { firstError } from '@/services/api'
import { houseRuleService } from '@/services/houseRules'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import { HouseRuleCategoryLabels, type HouseRuleCategory } from '@/types/enums'
import type { HouseRule, HouseRuleVersion, PropertyHouseRules } from '@/types/houseRules'
import type { Property } from '@/types/property'

/** A property's house rules (D3): what is in force, past versions, and (owner or Manager) the draft editor. */
const props = defineProps<{ property: Property }>()

const toast = useToast()
const prompt = usePrompt()
const data = ref<PropertyHouseRules | null>(null)
const loading = ref(true)
const busy = ref(false)
const editing = ref(false)
const rows = ref<{ key: number; category: HouseRuleCategory; body: string }[]>([])
const note = ref('')
const shown = ref<HouseRuleVersion | null>(null)
let nextKey = 1

const canEdit = computed(() => props.property.abilities.includes('manage_rules' as never))

async function load() {
  try {
    data.value = await houseRuleService.forProperty(props.property.id)
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

onMounted(load)

const toRow = (r: HouseRule) => ({ key: nextKey++, category: r.category, body: r.body })

/** Start from the draft if there is one, else from the rules in force. */
function startEditing() {
  const from = data.value?.draft ?? data.value?.current
  rows.value = (from?.rules ?? []).filter((r) => !r.is_auto).map(toRow)
  if (!rows.value.length) addRow()
  note.value = data.value?.draft?.note ?? ''
  editing.value = true
}

function addRow() {
  rows.value.push({ key: nextKey++, category: 'other', body: '' })
}

function move(i: number, by: number) {
  const [row] = rows.value.splice(i, 1)
  rows.value.splice(i + by, 0, row)
}

async function save(publish: boolean) {
  const rules = rows.value.map((r) => ({ category: r.category, body: r.body.trim() })).filter((r) => r.body)
  if (publish && !rules.length) return toast.error('Add at least one rule before publishing.')
  if (publish) {
    const next = (data.value?.current?.version ?? 0) + 1
    const message = data.value?.current
      ? `Everyone staying here is asked to accept version ${next}. New applicants accept it when they apply.`
      : 'New applicants accept these when they apply, and everyone staying here is asked to accept them.'
    if (!(await prompt.confirm(`Publish version ${next}?`, message, 'Publish'))) return
  }
  busy.value = true
  try {
    const saved = await houseRuleService.saveDraft(props.property.id, rules, note.value.trim() || null)
    toast.success(publish ? (await houseRuleService.publish(props.property.id)).message : saved.message)
    editing.value = false
    await load()
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function discard() {
  if (!(await prompt.confirm('Discard the draft?', 'Your unpublished changes are deleted. The rules in force stay as they are.', 'Discard'))) return
  busy.value = true
  try {
    toast.success(await houseRuleService.discardDraft(props.property.id))
    editing.value = false
    await load()
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function openVersion(version: number) {
  try {
    shown.value = await houseRuleService.version(props.property.id, version)
  } catch (e) {
    toast.error(firstError(e))
  }
}
</script>

<style scoped>
.small {
  font-size: 0.85rem;
}
.draft {
  border-left: 4px solid var(--ion-color-warning);
}
.row-head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
.category {
  flex: 1;
}
.gap {
  margin-top: 12px;
}
.label {
  margin: 16px 0 4px;
  font-weight: 500;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
</style>
