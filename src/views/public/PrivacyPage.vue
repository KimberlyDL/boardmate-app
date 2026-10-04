<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/" /></ion-buttons>
        <ion-title>Privacy notice</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!--
        DRAFT for the BoardMate team to review with counsel before launch.
        Bump PRIVACY_POLICY_VERSION in the API .env whenever this text changes.
      -->
      <article class="narrow">
        <p class="muted">Draft — version {{ version }}</p>

        <h3>What we collect</h3>
        <p>
          Only what BoardMate needs to work: your name, email, and mobile number; an optional profile photo; and,
          for boarders, one emergency contact. When you rent through BoardMate, your stay, bills and payments are
          recorded for you and the property owner.
        </p>

        <h3>Why we use it</h3>
        <p>
          To create your account, connect you with boarding houses, send bills, receipts and reminders, and keep a
          record both you and the owner can refer to if there is a disagreement.
        </p>

        <h3>Who can see it</h3>
        <p>
          The owner of a property you rent, and the caretakers they assign to that property, can see the
          information needed to manage your stay. Other owners cannot. Platform administrators do not see your
          bills or payments.
        </p>

        <h3>How long we keep it</h3>
        <p>
          While your account is active, and for a limited period after you move out so records are available for
          disputes. Visitor records are deleted after 90 days.
        </p>

        <h3>Your rights</h3>
        <p>
          Under the Data Privacy Act of 2012 you can ask to see, correct, or delete your personal data, and you can
          withdraw your consent. Contact the BoardMate team to make a request.
        </p>
      </article>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'

// Must match PRIVACY_POLICY_VERSION in the API, which is stored with each user's consent.
const version = '2026-10-03'
</script>
