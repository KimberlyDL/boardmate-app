<template>
  <auth-layout :title="content.title" back-to="/">
    <div class="center-block">
      <span class="art" :class="content.ok ? 'ok' : 'bad'" aria-hidden="true">
        <component :is="content.ok ? CircleCheck : CircleAlert" :size="40" :stroke-width="1.75" />
      </span>
      <p class="dl-body copy">{{ content.body }}</p>
      <span v-if="content.ok" class="dl-note">you're all set!</span>
    </div>
    <ion-button expand="block" :router-link="auth.isLoggedIn ? '/account' : '/login'">
      {{ auth.isLoggedIn ? 'Go to my account' : 'Sign in' }}
    </ion-button>
  </auth-layout>
</template>

<script setup lang="ts">
import { IonButton } from '@ionic/vue'
import { CircleAlert, CircleCheck } from 'lucide-vue-next'
import AuthLayout from '@/components/AuthLayout.vue'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const messages = {
  success: { ok: true, title: 'Email confirmed', body: 'Thanks! Your email is confirmed. You can now sign in.' },
  already: { ok: true, title: 'Already confirmed', body: 'Your email was confirmed earlier. You can sign in.' },
  changed: { ok: true, title: 'Email changed', body: 'Your new email is confirmed. Use it the next time you sign in.' },
  taken: {
    ok: false,
    title: 'Email not changed',
    body: 'Another account started using that address before you confirmed it. Your email stays the same.',
  },
  invalid: {
    ok: false,
    title: 'Link not valid',
    body: 'This link is invalid or has expired. Ask for a new one from the sign-in page (or your profile, for an email change).',
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

<style scoped>
.center-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 8px 0;
  text-align: center;
}
.art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  border-radius: var(--radius-full);
}
.ok { background: var(--success-subtle); color: var(--success-text); }
.bad { background: var(--warning-subtle); color: var(--warning-text); }
.copy {
  margin: 0;
  color: var(--text-secondary);
}
</style>
