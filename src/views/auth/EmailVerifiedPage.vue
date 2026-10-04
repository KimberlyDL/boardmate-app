<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Email confirmation</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow center">
        <h2>{{ content.title }}</h2>
        <p>{{ content.body }}</p>
        <ion-button expand="block" :router-link="auth.isLoggedIn ? '/account' : '/login'">
          {{ auth.isLoggedIn ? 'Go to my account' : 'Log in' }}
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const messages = {
  success: { title: 'Email confirmed', body: 'Thanks! Your email is confirmed. You can now log in.' },
  already: { title: 'Already confirmed', body: 'Your email was confirmed earlier. You can log in.' },
  changed: { title: 'Email changed', body: 'Your new email is confirmed. Use it the next time you log in.' },
  taken: {
    title: 'Email not changed',
    body: 'Another account started using that address before you confirmed it. Your email stays the same.',
  },
  invalid: {
    title: 'Link not valid',
    body: 'This link is invalid or has expired. Ask for a new one from the log in page (or your profile, for an email change).',
  },
} as const

const content = computed(() => {
  const status = route.query.status as keyof typeof messages
  return messages[status] ?? messages.invalid
})

// Refresh the signed-in user so a changed email shows right away.
onMounted(() => {
  if (auth.isLoggedIn) auth.refresh().catch(() => undefined)
})
</script>
