<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Account</ion-title>
        <ion-buttons slot="end"><NotificationBell /></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="auth.user" class="narrow page">
        <!-- Me -->
        <DlCard class="me" to="/profile">
          <DlAvatar :name="auth.user.name" :src="auth.user.photo_url" :size="56" />
          <span class="me-text">
            <span class="dl-title">{{ auth.user.name }}</span>
            <span class="dl-small">{{ auth.user.email }}</span>
            <DlStatusTag v-if="auth.user.active_role" tone="brand">{{ UserRoleLabels[auth.user.active_role] }}</DlStatusTag>
          </span>
          <ChevronRight :size="18" class="chev" aria-hidden="true" />
        </DlCard>

        <!-- Role switcher: one account can be e.g. an owner and a boarder -->
        <DlSection v-if="auth.user.roles.length > 1" title="Use DormLink as">
          <ion-segment :value="auth.user.active_role ?? undefined" @ion-change="onSwitch($event.detail.value as UserRole)">
            <ion-segment-button v-for="role in auth.user.roles" :key="role" :value="role">
              <ion-label>{{ UserRoleLabels[role] }}</ion-label>
            </ion-segment-button>
          </ion-segment>
        </DlSection>

        <DlCard padding="4px 16px">
          <DlListRow :icon="UserRound" title="My profile" subtitle="Name, phone, photo, emergency contact" to="/profile" />
          <DlListRow v-if="isOwner" :icon="Wallet" title="Business and payment details" to="/owner/business" divider />
          <DlListRow v-if="isOwner" :icon="ListChecks" title="Activity log" subtitle="Who did what in your business" to="/owner/activity" divider />
          <DlListRow v-if="isAdmin" :icon="ListChecks" title="Admin activity" to="/admin/activity" divider />
          <DlListRow v-if="canApply" :icon="Building2" title="List your property" subtitle="Apply to be an owner on DormLink" to="/apply-owner" divider />
          <DlListRow :icon="ShieldCheck" title="Privacy notice" to="/privacy" divider />
        </DlCard>

        <DlSection title="Appearance">
          <theme-toggle />
        </DlSection>

        <ion-button expand="block" fill="outline" class="signout" @click="logout">
          <LogOut slot="start" :size="18" aria-hidden="true" /> Sign out
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import NotificationBell from '@/components/NotificationBell.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { Building2, ChevronRight, ListChecks, LogOut, ShieldCheck, UserRound, Wallet } from 'lucide-vue-next'
import { DlAvatar, DlCard, DlListRow, DlSection, DlStatusTag } from '@/components/dl'
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
.page {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
}
.me {
  display: flex;
  align-items: center;
  gap: 14px;
}
.me-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}
.me-text .dl-small {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chev {
  flex-shrink: 0;
  color: var(--text-muted);
}
.signout {
  margin: 8px 0 0;
}
</style>
