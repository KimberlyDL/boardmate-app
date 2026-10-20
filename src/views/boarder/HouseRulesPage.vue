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
        <p v-if="loading" class="muted">Loading…</p>
        <p v-else-if="!stay" class="muted center">You are not staying anywhere right now.</p>
        <p v-else-if="!rules?.current" class="muted center">{{ stay.property.name }} has no house rules yet.</p>

        <template v-else>
          <p>
            <strong>{{ stay.property.name }}</strong> · version {{ rules.current.version }}, from
            {{ manilaDate(rules.current.published_at!).format('MMM D, YYYY') }}
          </p>
          <p v-if="rules.current.note" class="muted small">What changed: {{ rules.current.note }}</p>

          <ion-card v-if="rules.needs_acceptance" class="ask">
            <ion-card-content>
              <strong>Please read these and accept them.</strong>
              <p>The owner published new house rules. Nothing is blocked in the meantime.</p>
            </ion-card-content>
          </ion-card>

          <house-rules-list :rules="rules.current.rules" />

          <ion-button v-if="rules.needs_acceptance" expand="block" class="form-actions" :disabled="busy" @click="accept">
            I have read them and accept
          </ion-button>
          <p v-else class="muted small accepted">You accepted these house rules.</p>

          <template v-if="rules.acceptances.length">
            <h3>What you accepted</h3>
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
  IonCard,
  IonCardContent,
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
import { ref } from 'vue'
import HouseRulesList from '@/components/houseRules/HouseRulesList.vue'
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
.small {
  font-size: 0.85rem;
}
.ask {
  border-left: 4px solid var(--ion-color-warning);
}
.accepted {
  margin-top: 16px;
}
</style>
