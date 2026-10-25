<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Properties</ion-title>
        <ion-buttons slot="end">
          <DlIconButton v-if="isOwnerArea" :icon="Plus" label="Add a property" variant="ghost" to="/owner/properties/new" />
          <NotificationBell />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="narrow page">
        <template v-if="loading && !properties.length">
          <DlSkeleton v-for="n in 2" :key="n" :height="230" :radius="18" />
        </template>

        <DlCard v-else-if="!properties.length">
          <DlEmptyState
            v-if="isOwnerArea"
            note="no properties yet"
            :icon="Building2"
            action-label="Add your first property"
            to="/owner/properties/new"
          >
            You have no properties yet. Add one to set up rooms, prices and the listing.
          </DlEmptyState>
          <DlEmptyState v-else note="nothing assigned yet" :icon="Building2">
            No properties assigned to you yet. The owner chooses which properties you help run.
          </DlEmptyState>
        </DlCard>

        <DlCard v-for="p in properties" :key="p.id" :to="`/properties/${p.id}`" :padding="0" class="prop">
          <img v-if="p.cover_photo_url" :src="p.cover_photo_url" alt="" class="cover" loading="lazy" />
          <span v-else class="cover placeholder"><ImageIcon :size="28" aria-hidden="true" /></span>
          <span class="body">
            <span class="tags">
              <DlStatusTag :tone="p.is_published ? 'success' : 'neutral'">{{ p.is_published ? 'Published' : 'Draft' }}</DlStatusTag>
              <DlStatusTag v-if="p.my_role && p.my_role !== 'owner'" tone="info">
                {{ p.my_role === 'manager' ? 'Manager' : 'Collector' }} · {{ p.owner_name }}
              </DlStatusTag>
            </span>
            <span class="dl-title">{{ p.name }}</span>
            <span class="dl-data upper">{{ p.type_label }} · {{ p.rental_mode_label }}<template v-if="p.city"> · {{ p.city }}</template></span>
            <span class="avail">
              <strong>{{ p.counts.available }} of {{ p.counts.units }}</strong>
              {{ p.rental_mode === 'whole' ? (p.counts.units === 1 ? 'room' : 'rooms') : p.rental_mode === 'bedspaces' ? 'bedspaces' : 'units' }} available
              <template v-if="p.counts.not_ready"> · {{ p.counts.not_ready }} not ready</template>
            </span>
          </span>
        </DlCard>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Building2, Image as ImageIcon, Plus } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import NotificationBell from '@/components/NotificationBell.vue'
import { DlCard, DlEmptyState, DlIconButton, DlRefresher, DlSkeleton, DlStatusTag } from '@/components/dl'
import { errorMessage } from '@/services/api'
import { propertyService } from '@/services/properties'
import { useToast } from '@/composables/useToast'
import type { PropertySummary } from '@/types/property'

/** Owner: their properties. Caretaker: the properties they are assigned to. */
const route = useRoute()
const toast = useToast()
const isOwnerArea = computed(() => route.path.startsWith('/owner'))
const properties = ref<PropertySummary[]>([])
const loading = ref(true)

async function load() {
  try {
    const all = await propertyService.list()
    // An account that is both owner and caretaker sees each list in its own area.
    properties.value = all.filter((p) => (isOwnerArea.value ? p.my_role === 'owner' : p.my_role !== 'owner'))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(load)

</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
}
.prop {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cover {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 8;
  object-fit: cover;
}
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: repeating-linear-gradient(135deg, var(--bg-muted) 0 12px, var(--skeleton-neutral) 12px 24px);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px 16px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.upper {
  text-transform: uppercase;
  color: var(--text-muted);
}
.avail {
  font-size: 14px;
  color: var(--text-secondary);
}
.avail strong {
  color: var(--brand-primary);
}
</style>
