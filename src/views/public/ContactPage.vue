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
        <h1 class="dl-h1">We're happy to <DlGradientText>help.</DlGradientText></h1>
        <p>Questions about a listing, your account, or becoming an owner? Send us a message and we will get back to you.</p>

        <ion-button expand="block" :href="`mailto:${SUPPORT_EMAIL}`">
          <Mail slot="start" :size="18" aria-hidden="true" />
          {{ SUPPORT_EMAIL }}
        </ion-button>

        <h2 class="dl-h2">Quick answers</h2>
        <p class="muted">
          Looking for a place? <router-link to="/find">Browse available dormitories</router-link>. Want to list a
          property? <router-link to="/apply-owner">Apply as an owner</router-link>. Already have an account?
          <router-link to="/login">Sign in</router-link>.
        </p>
      </article>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { Mail } from 'lucide-vue-next'
import { DlGradientText } from '@/components/dl'
import { SUPPORT_EMAIL } from '@/lib/site'
</script>
