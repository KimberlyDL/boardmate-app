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
        <h1>Boarding houses, made simple.</h1>
        <p>
          Finding a room should not mean scrolling through endless posts and wondering if anything is still
          available. Running a boarding house should not mean juggling notebooks, messages and receipts.
        </p>
        <p>
          BoardMate brings both sides together. Boarders can search, compare and reserve a place. Owners and
          caretakers can list their rooms, review applications and keep bills, payments and receipts in order.
        </p>

        <h3>What we believe in</h3>
        <ul>
          <li><strong>Clarity.</strong> Prices and inclusions are shown upfront.</li>
          <li><strong>Trust.</strong> Owners are reviewed before their listings go live.</li>
          <li><strong>Respect for your data.</strong> We keep only what we need. See our <router-link to="/privacy">privacy notice</router-link>.</li>
        </ul>

        <ion-button expand="block" router-link="/find">Explore available dormitories</ion-button>
        <ion-button expand="block" fill="outline" router-link="/apply-owner">List your properties</ion-button>
      </article>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
</script>
