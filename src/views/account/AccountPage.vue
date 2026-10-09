<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Account</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="auth.user" class="narrow">
        <ion-item lines="none" class="me">
          <ion-avatar slot="start">
            <img v-if="auth.user.photo_url" :src="auth.user.photo_url" alt="" />
            <ion-icon v-else :icon="personCircleOutline" class="placeholder" />
          </ion-avatar>
          <ion-label>
            <h2>{{ auth.user.name }}</h2>
            <p>{{ auth.user.email }}</p>
          </ion-label>
        </ion-item>

        <!-- Role switcher: one account can be e.g. an owner and a boarder -->
        <template v-if="auth.user.roles.length > 1">
          <h3>Use BoardMate as</h3>
          <ion-segment :value="auth.user.active_role ?? undefined" @ion-change="onSwitch($event.detail.value as UserRole)">
            <ion-segment-button v-for="role in auth.user.roles" :key="role" :value="role">
              <ion-label>{{ UserRoleLabels[role] }}</ion-label>
            </ion-segment-button>
          </ion-segment>
        </template>

        <ion-list inset>
          <ion-item button router-link="/profile" detail>
            <ion-icon slot="start" :icon="personOutline" />
            <ion-label>My profile</ion-label>
          </ion-item>
          <ion-item v-if="isOwner" button router-link="/owner/business" detail>
            <ion-icon slot="start" :icon="walletOutline" />
            <ion-label>Business and payment details</ion-label>
          </ion-item>
          <ion-item v-if="isOwner" button router-link="/owner/activity" detail>
            <ion-icon slot="start" :icon="listOutline" />
            <ion-label>
              <h3>Activity log</h3>
              <p>Who did what in your business</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="isAdmin" button router-link="/admin/activity" detail>
            <ion-icon slot="start" :icon="listOutline" />
            <ion-label>Admin activity</ion-label>
          </ion-item>
          <ion-item v-if="canApply" button router-link="/apply-owner" detail>
            <ion-icon slot="start" :icon="homeOutline" />
            <ion-label>
              <h3>List your property</h3>
              <p>Apply to be an owner on BoardMate</p>
            </ion-label>
          </ion-item>
          <ion-item button router-link="/privacy" detail>
            <ion-icon slot="start" :icon="shieldCheckmarkOutline" />
            <ion-label>Privacy notice</ion-label>
          </ion-item>
        </ion-list>

        <h3>Appearance</h3>
        <theme-toggle />

        <ion-button expand="block" fill="clear" color="medium" class="form-actions" @click="logout">Log out</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonAvatar,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { homeOutline, listOutline, personCircleOutline, personOutline, shieldCheckmarkOutline, walletOutline } from 'ionicons/icons'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { useToast } from '@/composables/useToast'
import { UserRole, UserRoleLabels } from '@/types/enums'

const auth = useAuthStore()
const notifications = useNotificationStore()
const router = useRouter()
const toast = useToast()

const isOwner = computed(() => auth.hasRole(UserRole.Owner))
const isAdmin = computed(() => auth.hasRole(UserRole.PlatformAdmin))
const canApply = computed(() => !isOwner.value && !isAdmin.value)

async function onSwitch(role: UserRole) {
  if (!role || role === auth.user?.active_role) return
  try {
    await auth.switchRole(role)
    await router.replace(auth.homePath)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function logout() {
  await auth.logout()
  notifications.$reset()
  await router.replace('/login')
}
</script>

<style scoped>
.me {
  --padding-start: 0;
}
.placeholder {
  width: 40px;
  height: 40px;
  color: var(--ion-color-medium);
}
h3 {
  font-size: 0.95rem;
  margin: 20px 0 8px;
}
</style>
