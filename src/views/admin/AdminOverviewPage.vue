<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Overview</ion-title>
        <ion-buttons slot="end"><NotificationBell /></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="overview">
        <template v-if="!data">
          <div class="tiles">
            <DlSkeleton v-for="i in 4" :key="i" :height="96" :radius="18" />
          </div>
          <DlSkeleton :height="240" :radius="18" />
        </template>

        <template v-else>
          <p class="dl-eyebrow period">The platform today · counts only, no money</p>

          <div class="tiles">
            <DlStatCard label="Accounts" :value="count(data.accounts.total)" :caption="`+${count(data.accounts.new_this_month)} this month`" dark />
            <DlStatCard
              label="Owners to review"
              :value="count(data.owners.pending)"
              :caption="`${count(data.owners.verified)} verified`"
              :tone="data.owners.pending ? 'butter' : 'pine'"
              to="/admin/owners"
            />
            <DlStatCard label="On the Finder" :value="count(data.listings.on_finder)" :caption="`${count(data.listings.free_places)} of ${count(data.listings.places)} places free`" tone="sky" />
            <DlStatCard label="Living in a place" :value="count(data.stays.current)" :caption="`${count(data.stays.applications_waiting)} applications waiting`" tone="lilac" />
          </div>

          <div class="grid">
            <DlCard class="wide-card">
              <h2 class="dl-title">Bookings each month</h2>
              <p class="muted">Applications sent, approved, and people who moved in</p>
              <DlChart
                kind="line"
                label="Applications, approvals and move-ins each month for the last 12 months"
                :labels="labels"
                :series="[
                  { label: 'Applications', data: data.months.map((m) => m.applications), tone: 'sky' },
                  { label: 'Approved', data: data.months.map((m) => m.approved), tone: 'butter' },
                  { label: 'Moved in', data: data.months.map((m) => m.move_ins), tone: 'pine' },
                ]"
                :height="240"
              />
            </DlCard>

            <DlCard>
              <h2 class="dl-title">Sign-ups each month</h2>
              <p class="muted">New accounts</p>
              <DlChart
                kind="bar"
                label="New accounts each month for the last 12 months"
                :labels="labels"
                :series="[{ label: 'Sign-ups', data: data.months.map((m) => m.sign_ups), tone: 'lilac' }]"
                :height="200"
              />
            </DlCard>

            <DlCard>
              <h2 class="dl-title">Owners</h2>
              <p class="muted">By review status</p>
              <DlChart
                v-if="ownerSlices.length"
                kind="doughnut"
                label="Owners by review status"
                :labels="ownerSlices.map((s) => s.label)"
                :series="[{ label: 'Owners', data: ownerSlices.map((s) => s.n), tones: ownerSlices.map((s) => s.tone) }]"
                :height="200"
              />
              <p v-else class="empty">No owner applications yet.</p>
            </DlCard>

            <DlCard>
              <h2 class="dl-title">Accounts</h2>
              <dl class="figures">
                <div><dt>Boarders</dt><dd>{{ count(data.accounts.boarders) }}</dd></div>
                <div><dt>Owners</dt><dd>{{ count(data.accounts.owners) }}</dd></div>
                <div><dt>Caretakers</dt><dd>{{ count(data.accounts.caretakers) }}</dd></div>
                <div><dt>Suspended</dt><dd>{{ count(data.accounts.suspended) }}</dd></div>
              </dl>
              <p class="muted">One account can be a boarder and an owner or caretaker at once.</p>
            </DlCard>

            <DlCard>
              <h2 class="dl-title">Listings</h2>
              <dl class="figures">
                <div><dt>On the Finder</dt><dd>{{ count(data.listings.on_finder) }}</dd></div>
                <div><dt>With a free place</dt><dd>{{ count(data.listings.with_free_places) }}</dd></div>
                <div><dt>Not published</dt><dd>{{ count(data.listings.not_published) }}</dd></div>
                <div><dt>Campuses</dt><dd>{{ count(data.campuses) }}</dd></div>
              </dl>
            </DlCard>
          </div>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue'
import { computed, ref } from 'vue'
import NotificationBell from '@/components/NotificationBell.vue'
import { DlCard, DlRefresher, DlSkeleton, DlStatCard } from '@/components/dl'
import DlChart from '@/components/dl/DlChart.vue'
import { useToast } from '@/composables/useToast'
import { monthLabel, type ChartTone } from '@/lib/charts'
import { errorMessage } from '@/services/api'
import { adminService } from '@/services/admin'
import type { PlatformStats } from '@/types/dashboard'

/** The platform admin's overview (A11): accounts, owners, listings, stays and monthly activity, in counts only. */
const toast = useToast()
const data = ref<PlatformStats | null>(null)

const count = (n: number) => n.toLocaleString('en-PH')
const labels = computed(() => data.value!.months.map((m, i) => monthLabel(m.month, i)))
const ownerSlices = computed(() =>
  ([
    { label: 'Verified', n: data.value!.owners.verified, tone: 'pine' },
    { label: 'Waiting for review', n: data.value!.owners.pending, tone: 'butter' },
    { label: 'Rejected', n: data.value!.owners.rejected, tone: 'coral' },
    { label: 'Suspended', n: data.value!.owners.suspended, tone: 'muted' },
  ] as { label: string; n: number; tone: ChartTone }[]).filter((s) => s.n > 0))

async function load() {
  try {
    data.value = await adminService.stats()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

onIonViewWillEnter(load)
</script>

<style scoped>
.overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 960px;
  margin: 0 auto 24px;
}
.period {
  margin: 0;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
.grid h2 {
  margin: 0;
}
.grid .muted {
  margin: 2px 0 12px;
}
.empty {
  margin: 24px 0;
  color: var(--text-muted);
  text-align: center;
}
.figures {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}
.figures div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.figures dt {
  color: var(--text-secondary);
}
.figures dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
}

@media (min-width: 768px) {
  .tiles {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .wide-card {
    grid-column: 1 / -1;
  }
}
</style>
