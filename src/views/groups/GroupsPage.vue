<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/stay" /></ion-buttons>
        <ion-title>Room groups</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <DlSkeleton v-if="loading" :height="120" :radius="18" />
        <template v-else>
          <DlCard v-if="!shown.length && !showHidden">
            <DlEmptyState note="no group yet" :icon="Users">
              {{ hiddenCount ? 'Your old room groups are hidden.' : 'You are not in a room group yet. You join one when you move in.' }}
            </DlEmptyState>
          </DlCard>
          <ion-list v-if="shown.length" lines="full">
            <ion-item v-for="g in shown" :key="g.id" button :router-link="`/groups/${g.id}`">
              <DlIconTile slot="start" :icon="g.is_hidden ? Archive : Users" />
              <ion-label>
                <h2>Room {{ g.room_label }} · {{ g.property_name }}</h2>
                <p>{{ g.my_role_label }}<template v-if="!g.is_current"> · you left</template><template v-if="g.is_hidden"> · hidden</template></p>
              </ion-label>
              <ion-button v-if="g.is_hidden" slot="end" size="small" fill="clear" @click.prevent.stop="unhide(g)">Show</ion-button>
              <ion-button v-else-if="g.can_hide" slot="end" size="small" fill="clear" @click.prevent.stop="hide(g)">Hide</ion-button>
            </ion-item>
          </ion-list>
          <p v-if="!showHidden && groups.some((g) => !g.is_current && !g.can_hide)" class="dl-small soft note">
            You can hide a group you left once you are settled up: nobody owes you and you owe nobody.
          </p>
          <ion-button v-if="hiddenCount || showHidden" fill="clear" size="small" class="toggle" @click="toggleHidden">
            {{ showHidden ? 'Back to my groups' : `Hidden groups (${hiddenCount})` }}
          </ion-button>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  alertController,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Archive, Users } from 'lucide-vue-next'
import { DlCard, DlEmptyState, DlIconTile, DlSkeleton } from '@/components/dl'
import { computed, ref } from 'vue'
import { firstError } from '@/services/api'
import { groupService } from '@/services/groups'
import { useToast } from '@/composables/useToast'
import type { GroupSummary } from '@/types/groups'

/** The room groups I am (or was) in; old ones I settled can be hidden from this list. */
const toast = useToast()
const groups = ref<GroupSummary[]>([])
const hiddenCount = ref(0)
const showHidden = ref(false)
const loading = ref(true)
const shown = computed(() => (showHidden.value ? groups.value.filter((g) => g.is_hidden) : groups.value))

async function load() {
  try {
    const { items, hiddenCount: count } = await groupService.list(showHidden.value)
    groups.value = items
    if (!showHidden.value) hiddenCount.value = count
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(load)

async function toggleHidden() {
  showHidden.value = !showHidden.value
  await load()
}

async function hide(g: GroupSummary) {
  const alert = await alertController.create({
    header: 'Hide this group?',
    message: `Room ${g.room_label} at ${g.property_name} leaves your list. Nothing is deleted: the others keep its records, and you can show it again any time.`,
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Hide', role: 'confirm' }],
  })
  await alert.present()
  if ((await alert.onDidDismiss()).role !== 'confirm') return
  try {
    toast.success(await groupService.hide(g.id))
    await load()
  } catch (e) {
    toast.error(firstError(e))
  }
}

async function unhide(g: GroupSummary) {
  try {
    toast.success(await groupService.unhide(g.id))
    await load()
    if (!groups.value.some((x) => x.is_hidden)) {
      showHidden.value = false
      await load()
    }
  } catch (e) {
    toast.error(firstError(e))
  }
}
</script>

<style scoped>
.note {
  margin: 12px 4px 0;
}
.toggle {
  margin-top: 8px;
}
</style>
