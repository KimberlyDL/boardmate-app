<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`${auth.homePath}/account`" /></ion-buttons>
        <ion-title>{{ scope === 'admin' ? 'Admin activity' : 'Activity log' }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-select
          :value="event"
          interface="popover"
          label="Show"
          label-placement="start"
          class="filter"
          @ion-change="setEvent($event.detail.value)"
        >
          <ion-select-option value="">Everything</ion-select-option>
          <ion-select-option v-for="e in events" :key="e" :value="e">{{ eventLabel(e) }}</ion-select-option>
        </ion-select>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <p v-if="!loading && !entries.length" class="ion-padding muted center">Nothing recorded yet.</p>

        <ion-list>
          <ion-item v-for="e in entries" :key="e.id" lines="full">
            <ion-label class="ion-text-wrap">
              <p class="when">{{ manila(e.created_at).format('MMM D, YYYY · h:mm A') }}</p>
              <h2>
                <strong>{{ e.actor.name }}</strong>
                <span v-if="e.actor.acting_as_label" class="role"> ({{ e.actor.acting_as_label }})</span>
              </h2>
              <p class="what">
                {{ e.description }}<span v-if="e.note">: {{ e.note }}</span>
              </p>
              <ul v-if="e.changes.length" class="changes">
                <li v-for="c in e.changes" :key="c.field">
                  {{ c.label }}: <s>{{ c.old ?? '—' }}</s> → <strong>{{ c.new ?? '—' }}</strong>
                </li>
              </ul>
              <p v-if="e.reason" class="reason">Reason: {{ e.reason }}</p>
            </ion-label>
          </ion-item>
        </ion-list>

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
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { computed, ref } from 'vue'
import { manila } from '@/lib/dayjs'
import { errorMessage } from '@/services/api'
import { auditService, type AuditEntry } from '@/services/audit'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { AuditEvent, AuditEventLabels } from '@/types/enums'

/** Owner's business log, or the platform admin log (same screen). */
const props = defineProps<{ scope: 'owner' | 'admin' }>()

const auth = useAuthStore()
const toast = useToast()

const entries = ref<AuditEntry[]>([])
const event = ref('')
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)

const ADMIN_EVENTS: string[] = [
  AuditEvent.OwnerVerified,
  AuditEvent.OwnerRejected,
  AuditEvent.OwnerSuspended,
  AuditEvent.OwnerReinstated,
  AuditEvent.AccountSuspended,
  AuditEvent.AccountUnsuspended,
]
// Owners see their business events plus BoardMate's decisions about them;
// personal account-security events are not part of either log.
const events = computed(() =>
  props.scope === 'admin' ? ADMIN_EVENTS : Object.values(AuditEvent).filter((e) => !e.startsWith('account.')),
)

function eventLabel(value: string): string {
  return AuditEventLabels[value as AuditEvent] ?? value
}

async function load(reset = true) {
  loading.value = true
  try {
    const next = reset ? 1 : page.value + 1
    const { items, meta } = await auditService.list(props.scope, { event: event.value || undefined }, next)
    entries.value = reset ? items : [...entries.value, ...items]
    page.value = meta.current_page
    lastPage.value = meta.last_page
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(() => load())

function setEvent(value: string) {
  event.value = value
  load()
}

async function refresh(e: RefresherCustomEvent) {
  await load()
  e.target.complete()
}

async function loadMore(e: InfiniteScrollCustomEvent) {
  await load(false)
  e.target.complete()
}
</script>

<style scoped>
.filter {
  padding: 0 16px;
}
.when {
  font-size: 0.8rem;
}
.role {
  color: var(--ion-color-medium);
  font-weight: normal;
}
.what {
  color: var(--ion-text-color);
}
.changes {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 0.85rem;
}
.changes s {
  color: var(--ion-color-medium);
}
.reason {
  font-style: italic;
}
</style>
