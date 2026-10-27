<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <BrandLogo slot="start" class="wordmark" />
        <ion-buttons slot="end"><NotificationBell /></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="narrow page">
        <header class="greet">
          <p class="dl-eyebrow">{{ eyebrow }}</p>
          <h1 class="dl-h1">{{ greeting }}, <DlGradientText>{{ firstName }}</DlGradientText></h1>
        </header>

        <template v-if="!loaded">
          <DlSkeleton :height="88" :radius="18" />
          <DlSkeleton :height="160" :radius="18" />
        </template>

        <template v-else>
          <DlSection title="You work for">
            <DlCard v-if="!owners.length">
              <DlEmptyState note="no owners yet" :icon="Users">No owners yet. Accept an invitation from an owner to start.</DlEmptyState>
            </DlCard>
            <DlCard v-for="link in owners" :key="link.id" class="owner">
              <DlAvatar :name="link.person.name" :size="44" />
              <span class="who">
                <span class="dl-title">{{ link.person.business_name || link.person.name }}</span>
                <span class="dl-small">{{ link.person.name }} · {{ link.person.phone || link.person.email }}</span>
                <span class="dl-data upper">Since {{ manila(link.since).format('D MMM YYYY') }}</span>
              </span>
              <DlStatusTag tone="brand">{{ link.access_level_label }}</DlStatusTag>
            </DlCard>
          </DlSection>

          <!-- Dashboard (A10): what waits at the properties assigned to me -->
          <template v-if="dash?.properties.length">
            <todo-list :items="todo" :show-where="dash.properties.length > 1" />
            <DlSection title="Places you look after">
              <property-glance v-for="d in dash.properties" :key="d.property.id" :d="d" />
            </DlSection>
            <DlCard padding="4px 16px">
              <DlListRow :icon="Download" title="Reports" subtitle="Spreadsheets of bills, payments and more" to="/reports" />
            </DlCard>
          </template>
          <DlBanner v-else-if="owners.length" tone="info">
            No properties are assigned to you yet. The owner chooses which places you look after.
          </DlBanner>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButtons, IonContent, IonHeader, IonPage, IonToolbar, onIonViewWillEnter } from '@ionic/vue'
import { Download, Users } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import BrandLogo from '@/components/BrandLogo.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import PropertyGlance from '@/components/dashboard/PropertyGlance.vue'
import TodoList from '@/components/dashboard/TodoList.vue'
import {
  DlAvatar,
  DlBanner,
  DlCard,
  DlEmptyState,
  DlGradientText,
  DlListRow,
  DlRefresher,
  DlSection,
  DlSkeleton,
  DlStatusTag,
} from '@/components/dl'
import { todoItems } from '@/lib/dashboardTodo'
import { manila } from '@/lib/dayjs'
import { errorMessage } from '@/services/api'
import { caretakerService } from '@/services/caretaker'
import { dashboardService } from '@/services/dashboard'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import type { MyDashboard } from '@/types/dashboard'
import type { CaretakerLink } from '@/types/roles'

/** The caretaker's home (A10): who they work for, what waits at their places, and each place at a glance. */
const toast = useToast()
const auth = useAuthStore()
const owners = ref<CaretakerLink[]>([])
const loaded = ref(false)
const dash = ref<MyDashboard | null>(null)
const todo = computed(() => todoItems(dash.value?.properties ?? [], '/caretaker/applications'))

const firstName = computed(() => auth.user?.name.split(' ')[0] ?? '')
const greeting = computed(() => {
  const h = manila().hour()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
})
const eyebrow = computed(() => {
  const n = dash.value?.properties.length ?? 0
  return [manila().format('ddd D MMM'), 'Caretaker', n ? `${n} place${n === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')
})

async function load() {
  try {
    const [employers, dashboard] = await Promise.all([caretakerService.employers(), dashboardService.mine()])
    owners.value = employers
    dash.value = dashboard
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loaded.value = true
  }
}

onIonViewWillEnter(load)
</script>

<style scoped>
.wordmark {
  margin-left: var(--screen-pad);
  font-size: 20px;
}
.page {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
}
.greet {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}
.owner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.who {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.upper {
  text-transform: uppercase;
  color: var(--text-muted);
}
</style>
