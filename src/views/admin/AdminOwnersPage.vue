<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Owners</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment :value="status" :scrollable="true" @ion-change="setStatus($event.detail.value as OwnerVerificationStatus)">
          <ion-segment-button v-for="s in statuses" :key="s" :value="s">
            <ion-label>{{ OwnerVerificationStatusLabels[s] }} ({{ counts[s] ?? 0 }})</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar :debounce="400" placeholder="Name, email or business" @ion-input="onSearch($event.detail.value ?? '')" />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <p v-if="!loading && !owners.length" class="ion-padding muted center">Nothing here.</p>

        <ion-card v-for="o in owners" :key="o.id">
          <ion-card-header>
            <ion-card-subtitle>
              {{ o.owner_profile?.submitted_at ? `Applied ${manila(o.owner_profile.submitted_at).format('MMM D, YYYY h:mm A')}` : '' }}
            </ion-card-subtitle>
            <ion-card-title>{{ o.owner_profile?.business_name || o.name }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p><strong>{{ o.name }}</strong> · {{ o.email }}<span v-if="o.phone"> · {{ o.phone }}</span></p>
            <p v-if="!o.email_verified_at" class="warn">Email not confirmed</p>
            <p v-if="o.suspended_at" class="warn">Account suspended</p>
            <p class="notes">{{ o.owner_profile?.application_notes }}</p>
            <p v-if="o.owner_profile?.review_reason" class="muted">Last reason: {{ o.owner_profile.review_reason }}</p>

            <!-- Proof documents: signed links that expire, so pull to refresh if one stops opening. -->
            <div v-if="o.owner_profile?.documents.length" class="documents" data-test="owner-documents">
              <template v-for="doc in o.owner_profile.documents" :key="doc.id">
                <a v-if="doc.url" :href="doc.url" target="_blank" rel="noopener" class="document">
                  <strong>{{ doc.kind_label.split(' (')[0] }}</strong> · {{ doc.original_name }}
                </a>
                <span v-else class="document muted">{{ doc.kind_label.split(' (')[0] }} · deleted</span>
              </template>
            </div>
            <p v-else class="warn">No proof documents attached (applied before they were required).</p>

            <div class="actions">
              <template v-if="status === OwnerVerificationStatus.Pending">
                <ion-button size="small" color="success" @click="act(o, 'verify')">Verify</ion-button>
                <ion-button size="small" fill="outline" color="warning" @click="act(o, 'reject')">Reject</ion-button>
              </template>
              <ion-button v-if="status === OwnerVerificationStatus.Rejected" size="small" color="success" @click="act(o, 'verify')">
                Verify anyway
              </ion-button>
              <ion-button
                v-if="status === OwnerVerificationStatus.Verified || status === OwnerVerificationStatus.Pending"
                size="small"
                fill="clear"
                color="danger"
                @click="act(o, 'suspend')"
              >
                Suspend
              </ion-button>
              <ion-button v-if="status === OwnerVerificationStatus.Suspended" size="small" @click="act(o, 'reinstate')">
                Reinstate
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-infinite-scroll :disabled="page >= lastPage" @ion-infinite="loadMore">
          <ion-infinite-scroll-content />
        </ion-infinite-scroll>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type InfiniteScrollCustomEvent,
  type RefresherCustomEvent,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { ref } from 'vue'
import { manila } from '@/lib/dayjs'
import { adminService, type OwnerCounts } from '@/services/admin'
import { errorMessage } from '@/services/api'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import { OwnerVerificationStatus, OwnerVerificationStatusLabels } from '@/types/enums'
import type { AdminUser } from '@/types/roles'

const toast = useToast()
const prompt = usePrompt()

const statuses = Object.values(OwnerVerificationStatus)
const status = ref<OwnerVerificationStatus>(OwnerVerificationStatus.Pending)
const search = ref('')
const owners = ref<AdminUser[]>([])
const counts = ref<Partial<OwnerCounts>>({})
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)

async function load(reset = true) {
  loading.value = true
  try {
    const next = reset ? 1 : page.value + 1
    const { items, meta } = await adminService.owners(status.value, search.value, next)
    owners.value = reset ? items : [...owners.value, ...items]
    page.value = meta.current_page
    lastPage.value = meta.last_page
    counts.value = meta.counts
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(() => load())

function setStatus(value: OwnerVerificationStatus) {
  status.value = value
  load()
}

function onSearch(value: string) {
  search.value = value
  load()
}

async function refresh(event: RefresherCustomEvent) {
  await load()
  event.target.complete()
}

async function loadMore(event: InfiniteScrollCustomEvent) {
  await load(false)
  event.target.complete()
}

async function act(owner: AdminUser, action: 'verify' | 'reject' | 'suspend' | 'reinstate') {
  const name = owner.owner_profile?.business_name || owner.name
  let reason: string | undefined

  if (action === 'reject') {
    reason = (await prompt.reason('Reject application', `Tell ${name} what to fix so they can apply again.`, 'Reject')) ?? undefined
    if (!reason) return
  } else if (action === 'suspend') {
    reason = (await prompt.reason('Suspend owner', `${name}'s listings will be hidden from the public.`, 'Suspend')) ?? undefined
    if (!reason) return
  } else if (!(await prompt.confirm(action === 'verify' ? 'Verify owner?' : 'Reinstate owner?', `${name} will be able to publish listings.`, action === 'verify' ? 'Verify' : 'Reinstate'))) {
    return
  }

  try {
    const { message } = await adminService.ownerAction(owner.id, action, reason)
    toast.success(message)
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
</script>

<style scoped>
.documents {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 8px 0;
}
.document {
  font-size: 0.9em;
}
.notes {
  white-space: pre-wrap;
  margin: 8px 0;
}
.warn {
  color: var(--ion-color-danger);
  font-size: 0.85rem;
}
.actions ion-button {
  margin-right: 6px;
}
</style>
