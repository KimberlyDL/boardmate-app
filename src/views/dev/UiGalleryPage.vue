<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>UI gallery</ion-title>
        <ion-buttons slot="end">
          <DlIconButton :icon="isDark ? Sun : Moon" label="Switch theme" variant="ghost" @click="setMode(isDark ? 'light' : 'dark')" />
          <DlIconButton :icon="Bell" label="Notifications" variant="ghost" :badge="3" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="wait" />
      <div class="narrow">
        <header class="hero">
          <p class="dl-eyebrow">DEV ONLY · NOT IN PRODUCTION BUILDS</p>
          <h1 class="dl-h1">Good morning, <DlGradientText>Kim</DlGradientText></h1>
        </header>

        <DlBanner title="House rules updated" action-label="Review">Version 3 adds visitor hours. Please read and acknowledge.</DlBanner>
        <div class="gap" />

        <DlCard tone="ink" :padding="20" class="bill">
          <div class="row"><span class="dl-eyebrow on-ink">BILL BL-2026-000231</span><DlStatusTag status="due">DUE 25 OCT</DlStatusTag></div>
          <span class="dl-small on-ink">Amount due</span>
          <span class="big">₱2,250.00</span>
          <div class="lines">
            <div class="row"><span class="dl-small on-ink-strong">Rent · 26 Oct – 25 Nov</span><span class="dl-data">1,800.00</span></div>
            <div class="row"><span class="dl-small on-ink-strong">Water (fixed)</span><span class="dl-data">300.00</span></div>
          </div>
          <div class="row buttons">
            <ion-button class="dl-accent grow">Report payment</ion-button>
            <ion-button class="dl-tonal">View bill</ion-button>
          </div>
        </DlCard>

        <div class="grid2">
          <DlStatCard label="Collected · Oct" value="₱38,450" caption="12 of 16 bills paid" dark />
          <DlStatCard label="Occupancy" value="14/18" caption="4 beds available" />
          <DlStatCard label="Due this week" value="₱11,250" caption="5 bills" tone="butter" />
          <DlStatCard label="Overdue" value="₱3,490" caption="2 billing parties" tone="coral" />
        </div>

        <DlSection title="My requests" link-label="See all" to="/dev/ui">
          <DlCard :padding="'4px 16px'">
            <DlListRow :icon="CircleAlert" title="Low shower pressure" subtitle="PLUMBING · FILED 08 OCT" mono trailing="In progress" @click="toast.info('Tapped a row')" />
            <DlListRow :icon="Users" title="Visitor: Ana Santos" subtitle="12 OCT · OVERNIGHT" mono trailing="Pending" divider @click="toast.success('Saved')" />
            <DlListRow title="Ben Cruz" subtitle="F2-01 BED C · 5 DAYS" mono divider>
              <template #leading><DlAvatar name="Ben Cruz" /></template>
              <template #trailing><DlStatusTag status="overdue">LATE</DlStatusTag></template>
            </DlListRow>
          </DlCard>
        </DlSection>

        <DlSection title="Chips, tags, stickers">
          <div class="wrap">
            <DlChip :selected="chip === 'all'" @click="chip = 'all'">All</DlChip>
            <DlChip :selected="chip === 'cv'" :count="4" @click="chip = 'cv'">Casa Verde</DlChip>
            <DlChip variant="amenity" :icon="Wifi">Wi-Fi</DlChip>
            <DlSticker :rotate="-3">near campus!</DlSticker>
          </div>
          <div class="wrap">
            <DlStatusTag v-for="s in ['paid', 'pending', 'due', 'overdue', 'new', 'verified']" :key="s" :status="s" />
            <DlStatusTag status="paid" solid />
          </div>
          <div class="wrap">
            <ion-badge color="success">Paid</ion-badge>
            <ion-badge color="warning">Grace</ion-badge>
            <ion-badge color="danger">Late</ion-badge>
            <ion-badge color="tertiary">Under review</ion-badge>
            <ion-badge color="medium">Walk-in</ion-badge>
          </div>
          <div class="wrap">
            <DlIconTile :icon="Wallet" />
            <DlIconTile :icon="Receipt" tone="coral" />
            <DlAvatar name="Ericka Lim" :size="32" />
            <DlAvatar name="Kim Santos" :size="32" />
            <DlAvatar name="Paolo Dizon" :size="32" />
          </div>
        </DlSection>

        <DlSection title="Ionic, restyled">
          <ion-segment v-model="seg">
            <ion-segment-button value="unpaid"><ion-label>To pay</ion-label></ion-segment-button>
            <ion-segment-button value="paid"><ion-label>Paid</ion-label></ion-segment-button>
            <ion-segment-button value="payments"><ion-label>Payments</ion-label></ion-segment-button>
          </ion-segment>
          <ion-card color="success">
            <ion-card-header>
              <ion-card-subtitle>Your stay</ion-card-subtitle>
              <ion-card-title>Santos House</ion-card-title>
            </ion-card-header>
            <ion-card-content>Room 203 · Bed 1</ion-card-content>
          </ion-card>
          <ion-card button>
            <ion-card-content><strong>You owe ₱2,500.00</strong><p class="muted">Next: BILL-2026-000001 due Oct 15.</p></ion-card-content>
          </ion-card>
          <ion-list lines="full">
            <ion-item button detail><ion-label><h3>Electricity</h3><p>Sep 10 – Oct 9 · split equal</p></ion-label></ion-item>
            <ion-item button detail><ion-label><h3>Gas refill</h3><p>05 Oct · Ben paid</p></ion-label></ion-item>
          </ion-list>
          <ion-input label="Amount (₱)" label-placement="stacked" fill="outline" inputmode="decimal" placeholder="0.00" />
          <ion-select label="Method" label-placement="stacked" fill="outline" interface="popover" class="gap-top">
            <ion-select-option value="cash">Cash</ion-select-option>
            <ion-select-option value="gcash">GCash</ion-select-option>
          </ion-select>
          <ion-searchbar placeholder="Search near your school" class="gap-top" />
          <ion-item lines="none"><ion-toggle :checked="true">Remind me</ion-toggle></ion-item>
          <ion-button expand="block">Record payment</ion-button>
          <div class="wrap">
            <ion-button>Primary</ion-button>
            <ion-button class="dl-tonal">Tonal</ion-button>
            <ion-button fill="outline">Outline</ion-button>
            <ion-button fill="clear">Ghost</ion-button>
            <ion-button class="dl-accent">Accent</ion-button>
            <ion-button color="danger">Delete</ion-button>
            <ion-button size="small">Small</ion-button>
            <ion-button disabled>Disabled</ion-button>
          </div>
          <div class="wrap">
            <ion-button fill="outline" @click="toast.success('Payment recorded')">Toast: success</ion-button>
            <ion-button fill="outline" @click="toast.error('Cannot reach the server.')">Toast: error</ion-button>
          </div>
        </DlSection>

        <DlSection title="Loading and empty">
          <DlCard>
            <div class="skel">
              <DlSkeleton :width="40" :height="40" :radius="12" />
              <div class="skel-lines"><DlSkeleton width="60%" :height="14" /><DlSkeleton width="40%" :height="10" /></div>
            </div>
          </DlCard>
          <DlCard>
            <DlEmptyState note="nothing saved yet" :icon="Heart" action-label="Browse dorms">Tap the heart on any listing to keep it here.</DlEmptyState>
          </DlCard>
        </DlSection>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue'
import { Bell, CircleAlert, Heart, Moon, Receipt, Sun, Users, Wallet, Wifi } from 'lucide-vue-next'
import { ref } from 'vue'
import {
  DlAvatar,
  DlBanner,
  DlCard,
  DlChip,
  DlEmptyState,
  DlGradientText,
  DlIconButton,
  DlIconTile,
  DlListRow,
  DlRefresher,
  DlSection,
  DlSkeleton,
  DlStatCard,
  DlStatusTag,
  DlSticker,
} from '@/components/dl'
import { useTheme } from '@/composables/useTheme'
import { useToast } from '@/composables/useToast'

/** Dev-only page (registered only in `vite dev`): every DormLink component and restyled Ionic control. */
const { isDark, setMode } = useTheme()
const toast = useToast()
const chip = ref('all')
const seg = ref('unpaid')
const wait = () => new Promise((resolve) => setTimeout(resolve, 800))
</script>

<style scoped>
.hero { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.gap { height: 16px; }
.gap-top { margin-top: 12px; }
.bill { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.on-ink { color: var(--text-on-ink-muted); }
.on-ink-strong { color: var(--text-on-ink); }
.big { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: 800; letter-spacing: -0.03em; }
.lines { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid rgb(255 255 255 / 0.15); }
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.buttons { justify-content: flex-start; gap: 8px; }
.grow { flex: 1; }
.grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
.wrap { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.skel { display: flex; align-items: center; gap: 12px; }
.skel-lines { display: flex; flex: 1; flex-direction: column; gap: 8px; }
</style>
