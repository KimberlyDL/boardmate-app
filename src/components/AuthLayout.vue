<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="auth-screen">
        <header class="hero" :class="{ tall: !!greeting }">
          <svg class="blob" viewBox="0 0 160 140" aria-hidden="true">
            <path d="M0 0h120c10 38-20 52-44 52-20 0-26 12-18 26 8 14-4 36-30 40C14 122 0 100 0 70z" fill="#fff" opacity=".13" />
            <path d="M0 0h84c6 24-14 34-30 34-14 0-18 8-12 18C48 62 40 78 22 80 8 80 0 66 0 48z" fill="#fff" opacity=".12" />
          </svg>
          <svg v-if="greeting" class="house" viewBox="0 0 120 130" aria-hidden="true">
            <ellipse cx="62" cy="122" rx="48" ry="6" fill="#000" opacity=".12" />
            <path d="M14 58 60 18l46 40v58a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="#fff" />
            <path d="M6 62 60 14l54 48" fill="none" stroke="var(--ion-color-secondary)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
            <rect x="46" y="76" width="28" height="46" rx="4" fill="var(--ion-color-primary)" />
            <rect x="26" y="70" width="14" height="14" rx="3" fill="var(--ion-color-secondary)" />
            <rect x="80" y="70" width="14" height="14" rx="3" fill="var(--ion-color-secondary)" />
          </svg>
          <brand-logo on-dark class="logo" />
          <div v-if="greeting" class="greet">
            <h1>{{ greeting }}</h1>
            <p v-if="subtitle">{{ subtitle }}</p>
          </div>
        </header>

        <main class="auth-sheet">
          <a class="back" :href="backTo" @click.prevent="goBack">
            <ion-icon :icon="arrowBackOutline" aria-hidden="true" /> {{ backLabel }}
          </a>
          <h2>{{ title }}</h2>
          <slot />
        </main>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { arrowBackOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/BrandLogo.vue'

/**
 * Shared frame for the sign-in family of pages: a teal hero on top, a rounded
 * sheet below with an in-page back link (no toolbar). Back goes to the previous
 * page when there is one, otherwise to `backTo`.
 */
const props = withDefaults(
  defineProps<{ title: string; greeting?: string; subtitle?: string; backTo?: string; backLabel?: string }>(),
  { greeting: undefined, subtitle: undefined, backTo: '/', backLabel: 'Back' },
)

const router = useRouter()

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace(props.backTo)
}
</script>

<style scoped>
.auth-screen {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: var(--bm-sheet);
}

.hero {
  position: relative;
  min-height: 150px;
  padding: calc(var(--ion-safe-area-top, 0px) + 18px) 24px 48px;
  background: linear-gradient(160deg, var(--bm-hero-from), var(--bm-hero-to));
  color: #fff;
}
.hero.tall {
  min-height: 250px;
}
.blob {
  position: absolute;
  top: 0;
  left: 0;
  width: 150px;
  pointer-events: none;
}
.logo {
  position: relative;
}
.greet {
  position: relative;
  margin-top: 38px;
}
.greet h1 {
  margin: 0;
  font-size: 2.7rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.greet p {
  margin: 2px 0 0;
  font-size: 1.05rem;
  opacity: 0.9;
}
.house {
  position: absolute;
  right: 18px;
  bottom: -34px;
  width: 112px;
  z-index: 2;
  pointer-events: none;
}

.auth-sheet {
  flex: 1;
  position: relative;
  margin-top: -28px;
  padding: 24px 24px 32px;
  border-radius: 32px 32px 0 0;
  background: var(--bm-sheet);
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  margin-bottom: 10px;
  text-decoration: none;
}
h2 {
  margin: 0 0 18px;
  font-size: 1.9rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ion-color-primary);
}
</style>
