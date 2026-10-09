<template>
  <ion-segment :value="mode" aria-label="Appearance" @ion-change="setMode($event.detail.value as ThemeMode)">
    <ion-segment-button value="system"><ion-label>Auto</ion-label></ion-segment-button>
    <ion-segment-button value="light"><ion-label>Light</ion-label></ion-segment-button>
    <ion-segment-button value="dark"><ion-label>Dark</ion-label></ion-segment-button>
  </ion-segment>
</template>

<script setup lang="ts">
import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/vue'
import { type ThemeMode, useTheme } from '@/composables/useTheme'

const { mode, setMode } = useTheme()
</script>
