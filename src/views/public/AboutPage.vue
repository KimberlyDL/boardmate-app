<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/" /></ion-buttons>
        <ion-title>About us</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <article class="narrow">
        <h1 class="dl-h1">Boarding houses, made <DlGradientText>simple.</DlGradientText></h1>
        <p>
          Finding a room should not mean scrolling through endless posts and wondering if anything is still
          available. Running a boarding house should not mean juggling notebooks, messages and receipts.
        </p>
        <p>
          DormLink brings both sides together. Boarders can search, compare and reserve a place. Owners and
          caretakers can list their rooms, review applications and keep bills, payments and receipts in order.
        </p>

        <h2 class="dl-h2 values-title">What we believe in</h2>
        <DlCard padding="4px 16px" class="values">
          <DlListRow :icon="Eye" title="Clarity" subtitle="Prices and inclusions are shown upfront." />
          <DlListRow :icon="ShieldCheck" title="Trust" subtitle="Owners are reviewed before their listings go live." divider />
          <DlListRow :icon="Lock" title="Respect for your data" subtitle="We keep only what we need." divider to="/privacy" />
        </DlCard>

        <ion-button expand="block" router-link="/find">Explore available dormitories</ion-button>
        <ion-button expand="block" class="dl-tonal" router-link="/apply-owner">List your properties</ion-button>
      </article>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { Eye, Lock, ShieldCheck } from 'lucide-vue-next'
import { DlCard, DlGradientText, DlListRow } from '@/components/dl'
</script>

<style scoped>
article p {
  color: var(--text-secondary);
}
.values-title {
  margin: 24px 0 12px;
}
.values {
  margin-bottom: 24px;
}
</style>
