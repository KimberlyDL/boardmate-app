<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`/listings/${id}`" /></ion-buttons>
        <ion-title>Apply</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form class="narrow form" @submit.prevent="submit">
        <header v-if="listingName" class="intro">
          <span class="dl-eyebrow">{{ listingName }}</span>
          <h1 class="dl-h1">Send your <DlGradientText>application</DlGradientText></h1>
          <p class="dl-body muted-copy">No reservation fee. The owner reviews it and assigns your place.</p>
        </header>

        <section v-if="rooms.length > 1" class="block">
          <h2 class="dl-h2">Which room?</h2>
          <ion-radio-group v-model="form.room_id" class="options">
            <ion-item v-for="r in rooms" :key="r.id" :disabled="r.status !== 'available'" lines="none" class="option">
              <ion-radio :value="r.id" label-placement="end" justify="start" class="ion-text-wrap">
                <span class="option-title">Room {{ r.label }}</span>
                <span class="option-sub">
                  {{ r.floor === null ? 'No floor set' : `Floor ${r.floor}` }} ·
                  {{ r.status === 'available' ? r.availability_label : r.status === 'full' ? 'Full' : 'Not ready' }}
                  <template v-if="r.who_can_stay !== 'any'"> · {{ r.who_can_stay_label }}</template>
                </span>
              </ion-radio>
              <span v-if="r.rent_from_centavos !== null" slot="end" class="option-price">{{ peso(r.rent_from_centavos).replace('.00', '') }}</span>
            </ion-item>
          </ion-radio-group>
          <p class="dl-small">The owner may place you in another room if this one is taken first.</p>
          <small v-if="errors.room_id" class="error" role="alert">{{ errors.room_id[0] }}</small>
        </section>

        <section v-if="chosen?.whole_option" class="block">
          <h2 class="dl-h2">Rent as</h2>
          <ion-segment v-model="rentAs">
            <ion-segment-button value="bed" :disabled="chosen.available === 0"><ion-label>A bedspace</ion-label></ion-segment-button>
            <ion-segment-button value="whole" :disabled="!chosen.whole_option.available">
              <ion-label>The whole room</ion-label>
            </ion-segment-button>
          </ion-segment>
          <p v-if="rentAs === 'whole'" class="dl-small">
            Room {{ chosen.label }} for up to {{ chosen.whole_option.capacity }} people at
            {{ chosen.whole_option.rent_centavos !== null ? peso(chosen.whole_option.rent_centavos) : 'the owner\'s price' }} / month. You will be its
            leader.
          </p>
          <small v-if="errors.whole" class="error" role="alert">{{ errors.whole[0] }}</small>
        </section>
        <small v-else-if="errors.room_id && rooms.length <= 1" class="error" role="alert">{{ errors.room_id[0] }}</small>

        <section class="block">
          <h2 class="dl-h2">About you</h2>
          <ion-input :value="auth.user?.name" label="Name" label-placement="stacked" fill="outline" readonly />
          <ion-input
            v-model="form.contact_phone"
            type="tel"
            inputmode="tel"
            label="Mobile number"
            label-placement="stacked"
            fill="outline"
            :class="{ 'ion-invalid ion-touched': errors.contact_phone }"
            :error-text="errors.contact_phone?.[0]"
          />
          <ion-input
            v-model="form.planned_move_in_on"
            type="date"
            :min="today"
            label="Planned move-in date"
            label-placement="stacked"
            fill="outline"
            :class="{ 'ion-invalid ion-touched': errors.planned_move_in_on }"
            :error-text="errors.planned_move_in_on?.[0]"
          />
          <ion-textarea
            v-model="form.message"
            label="Message to the owner"
            label-placement="stacked"
            fill="outline"
            :rows="3"
            :auto-grow="true"
            :counter="true"
            :maxlength="1000"
            placeholder="e.g. Student at UST, quiet, non-smoker."
          />
        </section>

        <section class="block">
          <span class="field-label">Valid ID (optional)</span>
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden @change="pickFile" />
          <div v-if="idFile" class="file-row">
            <span class="file-icon"><FileText :size="20" aria-hidden="true" /></span>
            <span class="file-text">
              <span class="file-name">{{ idFile.name }}</span>
              <span class="dl-data muted">{{ fileSize(idFile.size) }} · READY</span>
            </span>
            <button type="button" class="file-remove" aria-label="Remove file" @click="clearFile"><X :size="18" /></button>
          </div>
          <button v-else type="button" class="drop" data-dl-focus @click="fileInput?.click()">
            <span class="drop-title"><Upload :size="16" aria-hidden="true" /> Tap to upload</span>
            <span class="dl-small">JPG, PNG, WebP or PDF</span>
          </button>
          <p class="dl-small">Private. Only the owner and their managers see it. Deleted 30 days after your application closes.</p>
          <small v-if="errors.id_document" class="error" role="alert">{{ errors.id_document[0] }}</small>
        </section>

        <section v-if="houseRules" class="block">
          <h2 class="dl-h2">House rules</h2>
          <DlCard><house-rules-list :rules="houseRules.rules" /></DlCard>
          <ion-checkbox :checked="acceptsRules" label-placement="end" justify="start" class="accept" @ion-change="acceptsRules = $event.detail.checked">
            <span class="ion-text-wrap">I have read the house rules and accept them</span>
          </ion-checkbox>
          <small v-if="errors.house_rules_version" class="error" role="alert">{{ errors.house_rules_version[0] }}</small>
        </section>
      </form>
    </ion-content>

    <ion-footer class="action-footer">
      <div class="footer-inner">
        <ion-button expand="block" :disabled="busy" @click="submit">
          <ion-spinner v-if="busy" name="crescent" />
          <template v-else>Send application <ArrowRight slot="end" :size="20" aria-hidden="true" /></template>
        </ion-button>
        <span class="dl-small">No reservation fee.</span>
      </div>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { ArrowRight, FileText, Upload, X } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DlCard, DlGradientText } from '@/components/dl'
import HouseRulesList from '@/components/houseRules/HouseRulesList.vue'
import { manila } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { errorCode, errorMessage, fieldErrors } from '@/services/api'
import { bookingService } from '@/services/bookings'
import { listingService } from '@/services/listings'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import type { ListingDetail, PublicRoom } from '@/types/booking'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const id = Number(route.params.id)
const today = manila().format('YYYY-MM-DD')
const listingName = ref('')
const rooms = ref<PublicRoom[]>([])
const chosen = computed(() => rooms.value.find((r) => r.id === form.room_id) ?? null)
// `?whole=1` comes from "Rent the whole room".
const rentAs = ref<'bed' | 'whole'>(route.query.whole === '1' ? 'whole' : 'bed')
watch(chosen, (room) => {
  if (!room?.whole_option?.available) rentAs.value = 'bed'
  else if (room.available === 0) rentAs.value = 'whole'
})
// `?room=` comes from the room tapped on "Rooms & availability".
const form = reactive({
  contact_phone: auth.user?.phone ?? '',
  planned_move_in_on: today,
  message: '',
  room_id: Number(route.query.room) || (null as number | null),
})
const idFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const errors = ref<Record<string, string[]>>({})
const busy = ref(false)
const houseRules = ref<ListingDetail['house_rules']>(null)
const acceptsRules = ref(false)

onMounted(async () => {
  try {
    const { listing } = await listingService.get(id)
    listingName.value = listing.name
    rooms.value = listing.rooms
    houseRules.value = listing.house_rules
    if (!rooms.value.some((r) => r.id === form.room_id && r.status === 'available')) {
      form.room_id = rooms.value.length === 1 ? rooms.value[0].id : null
    }
  } catch {
    // The submit will explain if the listing is gone.
  }
})

function pickFile(e: Event) {
  idFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

function clearFile() {
  idFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function fileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

async function submit() {
  if (houseRules.value && !acceptsRules.value) {
    errors.value = { house_rules_version: ['Read and accept the house rules first.'] }
    return
  }
  busy.value = true
  errors.value = {}
  try {
    const { message } = await bookingService.apply(id, {
      ...form,
      whole: rentAs.value === 'whole',
      id_document: idFile.value,
      house_rules_version: houseRules.value?.version ?? null,
    })
    toast.success(message)
    await router.replace('/boarder/bookings')
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(errorMessage(e))
    if (errorCode(e) === 'has_reservation') await router.replace('/boarder/bookings')
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 16px;
}
.intro {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.muted-copy {
  margin: 0;
  color: var(--text-secondary);
}
.block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
/* Radio cards: a surface card per room; the chosen one gets the brand tint and a Pine outline. */
.option {
  --background: var(--bg-surface);
  --min-height: 64px;
  border-radius: var(--radius-lg);
  margin-bottom: 8px;
}
.option.item-radio-checked {
  --background: var(--brand-primary-subtle);
  outline: 2px solid var(--brand-primary);
}
.option-title {
  display: block;
  font-weight: 700;
  font-size: 15px;
}
.option-sub {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-muted);
}
.option-price {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--brand-primary);
}
.field-label {
  font-size: 13px;
  font-weight: 700;
}
.drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 96px;
  border: 1.5px dashed var(--border-default);
  border-radius: 14px;
  background: var(--bg-surface);
  font: inherit;
  cursor: pointer;
}
.drop-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-primary);
}
.file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: var(--bg-surface);
}
.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--success-subtle);
  color: var(--success-text);
}
.file-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.file-name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.muted {
  color: var(--text-muted);
}
.file-remove {
  display: flex;
  padding: 8px;
  border: 0;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
}
.accept {
  font-size: 14px;
}
.error {
  font-size: 12px;
  color: var(--danger-text);
}
.action-footer {
  box-shadow: none;
}
.footer-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  max-width: 480px;
  margin: 0 auto;
  padding: 12px 16px calc(var(--ion-safe-area-bottom, 0px) + 12px);
  border-top: 1px solid var(--border-default);
  background: var(--bg-surface);
}
.footer-inner ion-button {
  width: 100%;
  margin: 0;
}
</style>
