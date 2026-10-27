<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/stay" /></ion-buttons>
        <ion-title>House rules</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <DlSkeleton v-if="loading" :height="200" :radius="18" />
        <DlCard v-else-if="!stay">
          <DlEmptyState note="not staying yet" :icon="House">You are not staying anywhere right now.</DlEmptyState>
        </DlCard>
        <DlCard v-else-if="!rules?.current">
          <DlEmptyState note="no rules yet" :icon="ScrollText">{{ stay.property.name }} has no house rules yet.</DlEmptyState>
        </DlCard>

        <template v-else>
          <header class="intro">
            <span class="dl-eyebrow">{{ stay.property.name }}</span>
            <h1 class="dl-h2">Version {{ rules.current.version }}</h1>
            <p class="dl-small">
              <strong>{{ stay.property.name }}</strong> · version {{ rules.current.version }}, from
              {{ manilaDate(rules.current.published_at!).format('MMM D, YYYY') }}
            </p>
            <p v-if="rules.current.note" class="dl-small">What changed: {{ rules.current.note }}</p>
          </header>

          <DlBanner v-if="rules.needs_acceptance" tone="info" title="Please read these and accept them." class="ask">
            The owner published new house rules. Nothing is blocked in the meantime.
          </DlBanner>

          <DlCard class="rules"><house-rules-list :rules="rules.current.rules" /></DlCard>

          <ion-button v-if="rules.needs_acceptance" expand="block" class="form-actions" :disabled="busy" @click="accept">
            I have read them and accept
          </ion-button>
          <p v-else class="accepted"><CircleCheck :size="16" aria-hidden="true" /> You accepted these house rules.</p>

          <template v-if="rules.acceptances.length">
            <h2 class="dl-h2 history">What you accepted</h2>
            <ion-list lines="full">
              <ion-item v-for="a in rules.acceptances" :key="`${a.version}-${a.accepted_at}`">
                <ion-label class="ion-text-wrap">
                  <h2>Version {{ a.version }}</h2>
                  <p>{{ manilaDate(a.accepted_at).format('MMM D, YYYY') }} · {{ a.method_label }}<template v-if="a.recorded_by"> (recorded by {{ a.recorded_by }})</template></p>
                </ion-label>
              </ion-item>
            </ion-list>
          </template>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { CircleCheck, House, ScrollText } from 'lucide-vue-next'
import { ref } from 'vue'
import HouseRulesList from '@/components/houseRules/HouseRulesList.vue'
import { DlBanner, DlCard, DlEmptyState, DlSkeleton } from '@/components/dl'
import { manilaDate } from '@/lib/dayjs'
import { firstError } from '@/services/api'
import { houseRuleService } from '@/services/houseRules'
import { tenancyService } from '@/services/tenancies'
import { useToast } from '@/composables/useToast'
import type { StayHouseRules } from '@/types/houseRules'
import type { Tenancy } from '@/types/tenancy'

/** The tenant's house rules (D3): the version in force, accepting a new one, and what they accepted before. */
const toast = useToast()
const stay = ref<Tenancy | null>(null)
const rules = ref<StayHouseRules | null>(null)
const loading = ref(true)
const busy = ref(false)

async function load() {
  try {
    stay.value = (await tenancyService.mine())[0] ?? null
    rules.value = stay.value ? await houseRuleService.forStay(stay.value.id) : null
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(load)

async function accept() {
  if (!stay.value || !rules.value?.current?.version) return
  busy.value = true
  try {
    toast.success(await houseRuleService.accept(stay.value.id, rules.value.current.version))
    await load()
  } catch (e) {
    toast.error(firstError(e))
    await load()
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.intro {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}
.intro h1,
.intro p {
  margin: 0;
}
.ask,
.rules {
  margin-bottom: 16px;
}
.accepted {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--success-text);
}
.history {
  margin: 24px 0 12px;
}
</style>
