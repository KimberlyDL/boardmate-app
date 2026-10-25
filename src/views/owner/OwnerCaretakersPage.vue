<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Caretakers</ion-title>
        <ion-buttons slot="end"><NotificationBell /></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="narrow">
        <!-- Invite -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Invite a caretaker</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <DlBanner v-if="!verified" tone="info" data-test="invite-locked">
              You can invite caretakers once your owner account is verified.
            </DlBanner>
            <form v-else @submit.prevent="invite">
              <ion-input
                v-model="inviteEmail"
                type="email"
                label="Their email"
                label-placement="stacked"
                fill="outline"
                :class="{ 'ion-invalid ion-touched': inviteErrors.email }"
                :error-text="inviteErrors.email?.[0]"
              />
              <ion-radio-group v-model="inviteLevel" class="levels">
                <ion-item v-for="level in accessLevels" :key="level.value" lines="none">
                  <ion-radio :value="level.value" label-placement="end" justify="start">
                    <strong>{{ level.label }}</strong>
                    <span v-if="level.value === CaretakerAccessLevel.Collector" class="muted"> (recommended to start)</span>
                    <div class="level-desc">{{ level.description }}</div>
                  </ion-radio>
                </ion-item>
              </ion-radio-group>
              <ion-select
                v-if="properties.length"
                v-model="inviteProperties"
                label="Properties they will help run"
                label-placement="stacked"
                fill="outline"
                :multiple="true"
                placeholder="Choose later"
                class="ion-margin-bottom"
              >
                <ion-select-option v-for="p in properties" :key="p.id" :value="p.id">{{ p.name }}</ion-select-option>
              </ion-select>
              <ion-button type="submit" expand="block" :disabled="busy">Send invitation</ion-button>
            </form>
          </ion-card-content>
        </ion-card>

        <!-- Current caretakers -->
        <h2 class="dl-h2 section">Your caretakers</h2>
        <DlCard v-if="!loading && !caretakers.length">
          <DlEmptyState note="no helpers yet" :icon="Users">No caretakers yet. Invite someone to help collect payments and run the house.</DlEmptyState>
        </DlCard>
        <ion-list v-if="caretakers.length">
          <ion-item v-for="c in caretakers" :key="c.id">
            <DlAvatar slot="start" :name="c.person.name" :size="40" />
            <ion-label class="ion-text-wrap">
              <h2>{{ c.person.name }}</h2>
              <p>{{ c.person.email }}<span v-if="c.person.phone"> · {{ c.person.phone }}</span></p>
              <p v-if="c.properties.length">
                <ion-chip v-for="p in c.properties" :key="p.id" class="prop-chip" :router-link="`/properties/${p.id}?tab=caretakers`">
                  {{ p.name }} · {{ p.access_level_label }}
                </ion-chip>
              </p>
              <p v-else class="muted">No properties assigned yet. Open a property → Caretakers.</p>
              <p v-if="c.levels_differ" class="muted">
                Levels differ per property. Choosing a level here applies it to all of them.
              </p>
            </ion-label>
            <ion-select
              slot="end"
              :value="c.access_level"
              interface="popover"
              aria-label="Access level"
              @ion-change="changeAccess(c, $event.detail.value)"
            >
              <ion-select-option v-for="level in accessLevels" :key="level.value" :value="level.value">
                {{ level.label }}
              </ion-select-option>
            </ion-select>
            <ion-button slot="end" fill="clear" color="danger" aria-label="Remove" @click="remove(c)">
              <Trash2 slot="icon-only" :size="20" aria-hidden="true" />
            </ion-button>
          </ion-item>
        </ion-list>

        <!-- Invitations -->
        <template v-if="invitations.length">
          <h2 class="dl-h2 section">Invitations</h2>
          <ion-list>
            <ion-item v-for="inv in invitations" :key="inv.id">
              <DlIconTile slot="start" :icon="Mail" />
              <ion-label class="ion-text-wrap">
                <h2>{{ inv.email }}</h2>
                <p>{{ inv.access_level_label }} · {{ inv.status_label }}</p>
                <p v-if="inv.status === CaretakerInvitationStatus.Pending" class="muted">
                  Expires {{ manila(inv.expires_at).format('MMM D') }}
                </p>
              </ion-label>
              <template v-if="inv.status === CaretakerInvitationStatus.Pending || inv.status === CaretakerInvitationStatus.Expired">
                <ion-button slot="end" size="small" fill="outline" @click="resend(inv)">Resend</ion-button>
              </template>
              <ion-button
                v-if="inv.status === CaretakerInvitationStatus.Pending"
                slot="end"
                size="small"
                fill="clear"
                color="medium"
                @click="revoke(inv)"
              >
                Cancel
              </ion-button>
            </ion-item>
          </ion-list>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Mail, Trash2, Users } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import NotificationBell from '@/components/NotificationBell.vue'
import { DlAvatar, DlBanner, DlCard, DlEmptyState, DlIconTile, DlRefresher } from '@/components/dl'
import { manila } from '@/lib/dayjs'
import { errorMessage, fieldErrors } from '@/services/api'
import { ownerService } from '@/services/owner'
import { useAuthStore } from '@/stores/auth'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import { CaretakerAccessLevel, CaretakerInvitationStatus, OwnerVerificationStatus } from '@/types/enums'
import { propertyService } from '@/services/properties'
import type { PropertySummary } from '@/types/property'
import type { AccessLevelOption, CaretakerInvitation, CaretakerLink } from '@/types/roles'

const auth = useAuthStore()
const toast = useToast()
const prompt = usePrompt()

const verified = computed(() => auth.user?.owner_profile?.verification_status === OwnerVerificationStatus.Verified)
const caretakers = ref<CaretakerLink[]>([])
const invitations = ref<CaretakerInvitation[]>([])
const accessLevels = ref<AccessLevelOption[]>([])
const loading = ref(false)
const busy = ref(false)

const inviteEmail = ref('')
const inviteLevel = ref<string>(CaretakerAccessLevel.Collector)
const inviteErrors = ref<Record<string, string[]>>({})
const inviteProperties = ref<number[]>([])
const properties = ref<PropertySummary[]>([])

async function load() {
  loading.value = true
  try {
    propertyService.list().then((all) => (properties.value = all.filter((p) => p.my_role === 'owner'))).catch(() => undefined)
    const data = await ownerService.caretakers()
    caretakers.value = data.caretakers
    invitations.value = data.invitations.filter((i) => i.status !== CaretakerInvitationStatus.Revoked)
    accessLevels.value = data.access_levels
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(load)


async function invite() {
  busy.value = true
  inviteErrors.value = {}
  try {
    toast.success(await ownerService.invite(inviteEmail.value, inviteLevel.value, inviteProperties.value))
    inviteEmail.value = ''
    inviteProperties.value = []
    inviteLevel.value = CaretakerAccessLevel.Collector
    await load()
  } catch (e) {
    inviteErrors.value = fieldErrors(e)
    if (!Object.keys(inviteErrors.value).length) toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function changeAccess(link: CaretakerLink, level: string) {
  if (level === link.access_level) return
  try {
    Object.assign(link, await ownerService.changeAccess(link.id, level))
    toast.success(`${link.person.name} is now a ${link.access_level_label}.`)
  } catch (e) {
    toast.error(errorMessage(e))
    await load()
  }
}

async function remove(link: CaretakerLink) {
  if (!(await prompt.confirm('Remove caretaker?', `${link.person.name} will lose access to all your properties right away.`, 'Remove'))) return
  try {
    toast.success(await ownerService.removeCaretaker(link.id))
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function resend(inv: CaretakerInvitation) {
  try {
    toast.success(await ownerService.resendInvitation(inv.id))
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function revoke(inv: CaretakerInvitation) {
  if (!(await prompt.confirm('Cancel invitation?', `The link sent to ${inv.email} will stop working.`, 'Cancel invitation'))) return
  try {
    await ownerService.revokeInvitation(inv.id)
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
</script>

<style scoped>
.section {
  margin: 24px 0 12px;
}
.levels {
  display: block;
  margin: 12px 0;
}
.level-desc {
  white-space: normal;
  font-size: 0.85rem;
  color: var(--ion-color-medium);
  margin-top: 2px;
}
h3 {
  margin-top: 24px;
}
.prop-chip {
  height: 24px;
  font-size: 0.75rem;
  margin: 4px 4px 0 0;
}
</style>
