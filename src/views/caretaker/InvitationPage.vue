<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Caretaker invitation</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <p v-if="loading">Loading…</p>

        <template v-else-if="loadError">
          <h2>Invitation not found</h2>
          <p>{{ loadError }}</p>
          <ion-button expand="block" fill="outline" :router-link="auth.isLoggedIn ? auth.homePath : '/'">Go home</ion-button>
        </template>

        <template v-else-if="invite">
          <h2>{{ invite.owner_name }}</h2>
          <p>invited <strong>{{ invite.email_hint }}</strong> to help run their boarding house as a:</p>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ invite.access_level_label }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>{{ invite.access_level_description }}</ion-card-content>
          </ion-card>

          <!-- Closed invitation -->
          <template v-if="invite.status !== CaretakerInvitationStatus.Pending">
            <p data-test="invite-closed"><strong>{{ invite.status_label }}.</strong> {{ closedHelp }}</p>
            <ion-button expand="block" fill="outline" :router-link="auth.isLoggedIn ? auth.homePath : '/'">Go home</ion-button>
          </template>

          <!-- Signed out: sign in or sign up with the invited email, then come back -->
          <template v-else-if="!auth.isLoggedIn">
            <p class="muted">
              Log in or create a BoardMate account with the invited email address to accept. We'll bring you back here.
            </p>
            <ion-button expand="block" @click="goTo('/login')">Log in</ion-button>
            <ion-button expand="block" fill="outline" @click="goTo('/register')">Create an account</ion-button>
          </template>

          <!-- Signed in -->
          <template v-else>
            <p class="muted">Signed in as {{ auth.user?.email }}</p>
            <ion-button expand="block" :disabled="busy" @click="accept">Accept invitation</ion-button>
            <ion-button expand="block" fill="clear" color="medium" :disabled="busy" @click="decline">Decline</ion-button>
          </template>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errorMessage } from '@/services/api'
import { caretakerService } from '@/services/caretaker'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { CaretakerInvitationStatus } from '@/types/enums'
import type { InvitationDetails } from '@/types/roles'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const token = String(route.params.token)
const invite = ref<InvitationDetails | null>(null)
const loading = ref(true)
const loadError = ref('')
const busy = ref(false)

const closedHelp = computed(() =>
  invite.value?.status === CaretakerInvitationStatus.Expired ? 'Ask the owner to send a new invitation.' : '',
)

onMounted(async () => {
  try {
    invite.value = await caretakerService.invitation(token)
  } catch (e) {
    loadError.value = errorMessage(e, 'This invitation link is not valid.')
  } finally {
    loading.value = false
  }
})

async function goTo(path: string) {
  await caretakerService.pendingInvite.set(token)
  await router.push(path)
}

async function accept() {
  busy.value = true
  try {
    const { user, message } = await caretakerService.accept(token)
    await caretakerService.pendingInvite.clear()
    auth.setUser(user)
    toast.success(message)
    await router.replace(auth.homePath)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function decline() {
  busy.value = true
  try {
    toast.info(await caretakerService.decline(token))
    await caretakerService.pendingInvite.clear()
    await router.replace(auth.homePath)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>
