<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Accounts</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar :debounce="400" placeholder="Name or email" @ion-input="onSearch($event.detail.value ?? '')" />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="narrow">
        <p v-if="!loading && !users.length" class="ion-padding muted center">No accounts found.</p>

        <ion-list>
          <ion-item v-for="u in users" :key="u.id">
            <ion-label class="ion-text-wrap">
              <h2>{{ u.name }}</h2>
              <p>{{ u.email }}</p>
              <p>
                <ion-chip v-for="r in u.roles" :key="r" class="chip">{{ UserRoleLabels[r] }}</ion-chip>
                <ion-chip v-if="u.suspended_at" color="danger" class="chip">Suspended</ion-chip>
                <ion-chip v-if="!u.email_verified_at" color="warning" class="chip">Email not confirmed</ion-chip>
              </p>
            </ion-label>
            <template v-if="!u.roles.includes(UserRole.PlatformAdmin)">
              <ion-button v-if="u.suspended_at" slot="end" size="small" fill="outline" @click="toggle(u, false)">Lift</ion-button>
              <ion-button v-else slot="end" size="small" fill="clear" color="danger" @click="toggle(u, true)">Suspend</ion-button>
            </template>
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
  IonButton,
  IonChip,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { ref } from 'vue'
import { adminService } from '@/services/admin'
import { errorMessage } from '@/services/api'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import { UserRole, UserRoleLabels } from '@/types/enums'
import type { AdminUser } from '@/types/roles'

const toast = useToast()
const prompt = usePrompt()

const users = ref<AdminUser[]>([])
const search = ref('')
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)

async function load(reset = true) {
  loading.value = true
  try {
    const { items, meta } = await adminService.users(search.value, reset ? 1 : page.value + 1)
    users.value = reset ? items : [...users.value, ...items]
    page.value = meta.current_page
    lastPage.value = meta.last_page
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(() => load())

function onSearch(value: string) {
  search.value = value
  load()
}

async function loadMore(event: InfiniteScrollCustomEvent) {
  await load(false)
  event.target.complete()
}

async function toggle(user: AdminUser, suspend: boolean) {
  if (
    suspend &&
    !(await prompt.confirm('Suspend account?', `${user.name} will be logged out everywhere and cannot log in.`, 'Suspend'))
  ) {
    return
  }
  try {
    const { user: updated, message } = await adminService.setSuspended(user.id, suspend)
    Object.assign(user, updated)
    toast.success(message)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
</script>

<style scoped>
.chip {
  height: 22px;
  font-size: 0.75rem;
  margin: 4px 4px 0 0;
}
</style>
