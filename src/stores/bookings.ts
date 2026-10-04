import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bookingService } from '@/services/bookings'

/** Pending-application count for the owner/Manager Applications tab badge. */
export const useBookingStore = defineStore('bookings', () => {
  const pendingCount = ref(0)

  async function refreshPending() {
    try {
      pendingCount.value = (await bookingService.list('pending')).meta.pending_count
    } catch {
      // Not critical; keep the last count.
    }
  }

  return { pendingCount, refreshPending }
})
