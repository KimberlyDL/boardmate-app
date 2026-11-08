<template>
  <auth-layout title="Confirming your email" back-to="/">
    <div class="center-block">
      <template v-if="!failed">
        <DlLoader :size="56" label="One moment…" />
      </template>
      <template v-else>
        <span class="art bad" aria-hidden="true"><CircleAlert :size="40" :stroke-width="1.75" /></span>
        <p class="dl-body copy">We could not reach DormLink to confirm your email. Check your connection and try again.</p>
        <ion-button expand="block" @click="confirm">Try again</ion-button>
      </template>
    </div>
  </auth-layout>
</template>

<script setup lang="ts">
import { IonButton } from '@ionic/vue'
import { CircleAlert } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/components/AuthLayout.vue'
import DlLoader from '@/components/dl/DlLoader.vue'
import { api } from '@/services/api'

/**
 * Where the email's confirmation link lands (/verify-email/:id/:hash for a new
 * account, /confirm-new-email/:id/:hash for an email change), on the website
 * or, through App Links, in the installed app. It sends the link's path and
 * signature to the API, then shows the result on /email-verified.
 */
const props = defineProps<{ kind: 'verify' | 'change' }>()
const route = useRoute()
const router = useRouter()
const failed = ref(false)

async function confirm(): Promise<void> {
  failed.value = false
  const { id, hash } = route.params as { id: string; hash: string }
  const q = route.query
  const one = (v: unknown) => (typeof v === 'string' ? v : '')
  // The signature covers the query in this order, so it is written out, not rebuilt.
  const query = `expires=${encodeURIComponent(one(q.expires))}&signature=${encodeURIComponent(one(q.signature))}`
  const path = props.kind === 'verify' ? 'auth/email/verify' : 'auth/email-change/verify'
  try {
    const { data } = await api.get<{ data: { status: string } }>(`/${path}/${id}/${hash}?${query}`)
    await router.replace({ path: '/email-verified', query: { status: data.data.status } })
  } catch {
    failed.value = true
  }
}

onMounted(confirm)
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
.bad { background: var(--warning-subtle); color: var(--warning-text); }
.copy {
  margin: 0;
  color: var(--text-secondary);
}
</style>
