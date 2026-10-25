<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="auth-screen">
        <div class="top">
          <DlIconButton v-if="!hideBack" :icon="ChevronLeft" :label="backLabel" @click="goBack" />
          <BrandLogo v-else class="logo" />
          <slot name="top-end" />
        </div>

        <header class="head">
          <h1 class="title">
            {{ title }}<template v-if="highlight">&nbsp;<DlGradientText>{{ highlight }}</DlGradientText></template>
          </h1>
          <p v-if="subtitle" class="dl-body subtitle">{{ subtitle }}</p>
        </header>

        <main class="body">
          <slot />
        </main>

        <footer v-if="$slots.footer" class="foot dl-small">
          <slot name="footer" />
        </footer>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage } from '@ionic/vue'
import { ChevronLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/BrandLogo.vue'
import DlGradientText from '@/components/dl/DlGradientText.vue'
import DlIconButton from '@/components/dl/DlIconButton.vue'

/**
 * Shared frame for the sign-in family of pages: the softly lit canvas, a back button,
 * a big heading whose last phrase (`highlight`) carries the one gradient on the screen,
 * the form, and a footer line pinned to the bottom. Back goes to the previous page
 * when there is one, otherwise to `backTo`.
 */
const props = withDefaults(
  defineProps<{ title: string; highlight?: string; subtitle?: string; backTo?: string; backLabel?: string; hideBack?: boolean }>(),
  { highlight: undefined, subtitle: undefined, backTo: '/', backLabel: 'Back' },
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
  gap: 24px;
  min-height: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: calc(var(--ion-safe-area-top, 0px) + 16px) 24px calc(var(--ion-safe-area-bottom, 0px) + 32px);
  box-sizing: border-box;
}
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
}
.head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 32px;
  line-height: 36px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.subtitle {
  color: var(--text-secondary);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.foot {
  margin-top: auto;
  text-align: center;
}
.foot :deep(a) {
  color: var(--brand-primary);
  font-weight: 700;
  text-decoration: none;
}
</style>
