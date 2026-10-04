<template>
  <div>
    <p class="muted">Up to 15 photos (JPG, PNG or WebP, 5 MB each). The cover is shown first on your listing.</p>

    <div class="grid">
      <div v-for="(photo, i) in property.photos" :key="photo.id" class="photo">
        <img :src="photo.url" :alt="`Photo ${i + 1}`" />
        <ion-badge v-if="photo.is_cover" class="cover">Cover</ion-badge>
        <div v-if="canEdit" class="tools">
          <ion-button size="small" fill="clear" :disabled="i === 0" aria-label="Move left" @click="move(i, -1)">
            <ion-icon slot="icon-only" :icon="chevronBack" />
          </ion-button>
          <ion-button v-if="!photo.is_cover" size="small" fill="clear" aria-label="Make cover" @click="cover(photo.id)">
            <ion-icon slot="icon-only" :icon="starOutline" />
          </ion-button>
          <ion-button size="small" fill="clear" color="danger" aria-label="Delete" @click="remove(photo.id)">
            <ion-icon slot="icon-only" :icon="trashOutline" />
          </ion-button>
          <ion-button size="small" fill="clear" :disabled="i === property.photos.length - 1" aria-label="Move right" @click="move(i, 1)">
            <ion-icon slot="icon-only" :icon="chevronForward" />
          </ion-button>
        </div>
      </div>
    </div>

    <template v-if="canEdit && property.photos.length < 15">
      <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden @change="upload" />
      <ion-button expand="block" fill="outline" :disabled="busy" @click="fileInput?.click()">
        <ion-icon slot="start" :icon="imagesOutline" /> {{ busy ? 'Uploading…' : 'Add photos' }}
      </ion-button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonIcon } from '@ionic/vue'
import { chevronBack, chevronForward, imagesOutline, starOutline, trashOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { errorMessage, fieldErrors } from '@/services/api'
import { propertyService } from '@/services/properties'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { Property } from '@/types/property'

const props = defineProps<{ property: Property }>()
const emit = defineEmits<{ updated: [property: Property] }>()

const toast = useToast()
const prompt = usePrompt()
const canEdit = computed(() => props.property.abilities.includes('edit_details'))
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)

async function run(action: () => Promise<Property>) {
  busy.value = true
  try {
    emit('updated', await action())
  } catch (e) {
    toast.error(Object.values(fieldErrors(e))[0]?.[0] ?? errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function upload(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files ?? [])
  if (files.length) await run(() => propertyService.uploadPhotos(props.property.id, files))
  if (fileInput.value) fileInput.value.value = ''
}

function move(index: number, delta: number) {
  const ids = props.property.photos.map((p) => p.id)
  const [id] = ids.splice(index, 1)
  ids.splice(index + delta, 0, id)
  return run(() => propertyService.reorderPhotos(props.property.id, ids))
}

function cover(photoId: number) {
  return run(() => propertyService.setCover(props.property.id, photoId))
}

async function remove(photoId: number) {
  if (!(await prompt.confirm('Delete photo?', 'This cannot be undone.', 'Delete'))) return
  await run(() => propertyService.removePhoto(props.property.id, photoId))
}
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.photo {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: var(--ion-color-light);
}
.photo img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}
.cover {
  position: absolute;
  top: 6px;
  left: 6px;
}
.tools {
  display: flex;
  justify-content: space-between;
}
</style>
