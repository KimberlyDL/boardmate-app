<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/" /></ion-buttons>
        <ion-title>Contact</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <article class="narrow">
        <h1>We're happy to help.</h1>
        <p>Questions about a listing, your account, or becoming an owner? Send us a message and we will get back to you.</p>

        <ion-button expand="block" :href="`mailto:${SUPPORT_EMAIL}`">
          <ion-icon slot="start" :icon="mailOutline" />
          {{ SUPPORT_EMAIL }}
        </ion-button>

        <h3>Quick answers</h3>
        <p class="muted">
          Looking for a place? <router-link to="/find">Browse available dormitories</router-link>. Want to list a
          property? <router-link to="/apply-owner">Apply as an owner</router-link>. Already have an account?
          <router-link to="/login">Log in</router-link>.
        </p>
      </article>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { mailOutline } from 'ionicons/icons'
import { SUPPORT_EMAIL } from '@/lib/site'
</script>
