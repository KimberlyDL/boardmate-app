<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Caretaker invitation</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <DlSkeleton v-if="loading" :height="220" :radius="18" />

        <template v-else-if="loadError">
          <DlCard>
            <DlEmptyState note="invitation not found" :icon="MailX" action-label="Go home" :to="auth.isLoggedIn ? auth.homePath : '/'">{{ loadError }}</DlEmptyState>
          </DlCard>
        </template>

        <template v-else-if="invite">
          <header class="intro">
            <DlAvatar :name="invite.owner_name" :size="56" />
            <span class="dl-eyebrow">CARETAKER INVITATION</span>
            <h1 class="dl-h1">Join <DlGradientText>{{ invite.owner_name }}</DlGradientText></h1>
            <p class="dl-body copy">invited <strong>{{ invite.email_hint }}</strong> to help run their boarding house as a:</p>
          </header>
          <DlCard tone="pine" class="level">
            <span class="dl-title">{{ invite.access_level_label }}</span>
            <span class="dl-small inherit">{{ invite.access_level_description }}</span>
          </DlCard>

          <!-- Closed invitation -->
          <template v-if="invite.status !== CaretakerInvitationStatus.Pending">
            <p data-test="invite-closed"><strong>{{ invite.status_label }}.</strong> {{ closedHelp }}</p>
            <ion-button expand="block" fill="outline" :router-link="auth.isLoggedIn ? auth.homePath : '/'">Go home</ion-button>
          </template>

          <!-- Signed out: sign in or sign up with the invited email, then come back -->
          <template v-else-if="!auth.isLoggedIn">
            <p class="dl-small">
              Sign in or create a DormLink account with the invited email address to accept. We'll bring you back here.
            </p>
            <ion-button expand="block" @click="goTo('/login')">Sign in</ion-button>
            <ion-button expand="block" fill="outline" @click="goTo('/register')">Create an account</ion-button>
          </template>

          <!-- Signed in -->
          <template v-else>
            <p class="dl-small">Signed in as {{ auth.user?.email }}</p>
            <ion-button expand="block" :disabled="busy" @click="accept">Accept invitation</ion-button>
            <ion-button expand="block" fill="clear" :disabled="busy" @click="decline">Decline</ion-button>
          </template>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { MailX } from 'lucide-vue-next'
import { DlAvatar, DlCard, DlEmptyState, DlGradientText, DlSkeleton } from '@/components/dl'
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

<style scoped>
.intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 16px;
}
.copy {
  margin: 0;
  color: var(--text-secondary);
}
.level {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}
.inherit {
  color: inherit;
}
</style>
