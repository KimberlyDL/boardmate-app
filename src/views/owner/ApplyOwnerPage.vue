<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`${auth.homePath}/account`" /></ion-buttons>
        <ion-title>List your property</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form class="narrow" @submit.prevent="submit">
        <p>
          Owners are checked by the BoardMate team before their listings go public. You can start setting up while we
          review your application.
        </p>
        <p v-if="previousReason" class="reason"><strong>Last review:</strong> {{ previousReason }}</p>

        <ion-input
          v-model="form.business_name"
          label="Business name (optional)"
          label-placement="stacked"
          fill="outline"
          placeholder="e.g. Santos Boarding House"
          :class="{ 'ion-invalid ion-touched': errors.business_name }"
          :error-text="errors.business_name?.[0]"
        />
        <ion-textarea
          v-model="form.application_notes"
          label="About your property"
          label-placement="stacked"
          fill="outline"
          :auto-grow="true"
          :rows="4"
          :counter="true"
          :maxlength="2000"
          helper-text="Where it is, what kind of place it is, and how many rooms or bedspaces it has."
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.application_notes }"
          :error-text="errors.application_notes?.[0]"
        />
        <ion-input
          v-if="!auth.user?.phone"
          v-model="form.phone"
          type="tel"
          label="Mobile number"
          label-placement="stacked"
          fill="outline"
          helper-text="So we can reach you about your application."
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.phone }"
          :error-text="errors.phone?.[0]"
        />

        <h3 class="ion-margin-top">Proof documents</h3>
        <p class="muted">
          Attach a valid government ID and one proof of the property (title, lease, or a utility bill in your name). A
          business or barangay permit helps but is optional. Photos or PDFs, up to 5 MB each, {{ MAX_DOCUMENTS }} files in
          all. Only the BoardMate team sees them, and they are deleted 90 days after we decide.
        </p>

        <ul class="required">
          <li v-for="kind in REQUIRED_KINDS" :key="kind" :class="{ done: hasKind(kind) }">
            <ion-icon :icon="hasKind(kind) ? checkmarkCircle : ellipseOutline" />
            {{ OwnerDocumentKindLabels[kind] }}
          </li>
        </ul>

        <ion-list v-if="kept.length || added.length" lines="full" data-test="owner-documents">
          <ion-item v-for="doc in kept" :key="`kept-${doc.id}`">
            <ion-icon slot="start" :icon="doc.mime_type === 'application/pdf' ? documentOutline : imageOutline" />
            <ion-label class="ion-text-wrap">
              <h3>{{ doc.original_name }}</h3>
              <p>{{ doc.kind_label }} · sent earlier</p>
            </ion-label>
            <ion-button slot="end" fill="clear" color="danger" aria-label="Remove" @click="removeKept(doc.id)">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-button>
          </ion-item>
          <ion-item v-for="(doc, i) in added" :key="`new-${i}`">
            <ion-icon slot="start" :icon="doc.file.type === 'application/pdf' ? documentOutline : imageOutline" />
            <ion-label class="ion-text-wrap">
              <h3>{{ doc.file.name }}</h3>
              <ion-note v-if="errors[`documents.${i}.file`]" color="danger">{{ errors[`documents.${i}.file`][0] }}</ion-note>
            </ion-label>
            <ion-select
              slot="end"
              v-model="doc.kind"
              interface="popover"
              aria-label="Document type"
              class="kind-select"
            >
              <ion-select-option v-for="kind in kindOptions" :key="kind" :value="kind">
                {{ SHORT_LABELS[kind] }}
              </ion-select-option>
            </ion-select>
            <ion-button slot="end" fill="clear" color="danger" aria-label="Remove" @click="added.splice(i, 1)">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-button>
          </ion-item>
        </ion-list>

        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          hidden
          @change="pickFiles"
        />
        <ion-button size="small" fill="outline" :disabled="total >= MAX_DOCUMENTS" @click="fileInput?.click()">
          <ion-icon slot="start" :icon="attachOutline" />
          Attach files
        </ion-button>
        <ion-note v-if="errors.documents" color="danger" class="block">{{ errors.documents[0] }}</ion-note>

        <ion-button expand="block" type="submit" class="form-actions" :disabled="busy">
          <ion-spinner v-if="busy" name="crescent" />
          <span v-else>Send application</span>
        </ion-button>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import {
  attachOutline,
  checkmarkCircle,
  documentOutline,
  ellipseOutline,
  imageOutline,
  trashOutline,
} from 'ionicons/icons'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { errorMessage, fieldErrors } from '@/services/api'
import { ownerService } from '@/services/owner'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { OwnerDocumentKind, OwnerDocumentKindLabels } from '@/types/enums'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const profile = auth.user?.owner_profile
const previousReason = computed(() => auth.user?.owner_profile?.review_reason)
const form = reactive({
  business_name: profile?.business_name ?? '',
  application_notes: profile?.application_notes ?? '',
  phone: '',
})
const errors = ref<Record<string, string[]>>({})
const busy = ref(false)

// Proof documents: earlier files (when applying again) plus new ones.
const MAX_DOCUMENTS = 5
const MAX_BYTES = 5 * 1024 * 1024
const REQUIRED_KINDS: OwnerDocumentKind[] = [OwnerDocumentKind.GovernmentId, OwnerDocumentKind.PropertyProof]
const SHORT_LABELS: Record<OwnerDocumentKind, string> = {
  [OwnerDocumentKind.GovernmentId]: 'Valid ID',
  [OwnerDocumentKind.PropertyProof]: 'Property proof',
  [OwnerDocumentKind.BusinessPermit]: 'Permit',
  [OwnerDocumentKind.Other]: 'Other',
}
const kindOptions = Object.values(OwnerDocumentKind)

const removedIds = ref<number[]>([])
const kept = computed(() =>
  (profile?.documents ?? []).filter((d) => !d.purged_at && !removedIds.value.includes(d.id)),
)
const added = ref<{ kind: OwnerDocumentKind; file: File }[]>([])
const total = computed(() => kept.value.length + added.value.length)
const fileInput = ref<HTMLInputElement | null>(null)

function hasKind(kind: OwnerDocumentKind): boolean {
  return kept.value.some((d) => d.kind === kind) || added.value.some((d) => d.kind === kind)
}

function removeKept(id: number) {
  removedIds.value.push(id)
}

/** New files get the first required kind still missing, so the usual order (ID, then proof) needs no clicks. */
function pickFiles(event: Event) {
  const input = event.target as HTMLInputElement
  for (const file of Array.from(input.files ?? [])) {
    if (total.value >= MAX_DOCUMENTS) {
      toast.error(`You can attach up to ${MAX_DOCUMENTS} files.`)
      break
    }
    if (file.size > MAX_BYTES) {
      toast.error(`${file.name} is over 5 MB.`)
      continue
    }
    added.value.push({ kind: REQUIRED_KINDS.find((k) => !hasKind(k)) ?? OwnerDocumentKind.Other, file })
  }
  input.value = ''
}

async function submit() {
  busy.value = true
  errors.value = {}
  try {
    const { user, message } = await ownerService.apply({
      business_name: form.business_name || undefined,
      application_notes: form.application_notes,
      phone: form.phone || undefined,
      documents: added.value,
      removeDocumentIds: removedIds.value,
    })
    auth.setUser(user)
    toast.success(message)
    await router.replace('/owner')
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.required {
  list-style: none;
  padding: 0;
  margin: 8px 0;
}
.required li {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ion-color-medium);
}
.required li.done {
  color: var(--ion-color-success);
}
.kind-select {
  max-width: 140px;
}
.block {
  display: block;
  margin-top: 4px;
}
.reason {
  background: var(--ion-color-warning-tint, #fff4d6);
  padding: 8px 12px;
  border-radius: 8px;
}
</style>
