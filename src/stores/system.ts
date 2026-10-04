import { defineStore } from 'pinia'
import { ref } from 'vue'
import { systemService, type Health } from '@/services/system'
import { errorMessage } from '@/services/api'

export const useSystemStore = defineStore('system', () => {
  const health = ref<Health | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function checkHealth() {
    loading.value = true
    error.value = null
    try {
      health.value = await systemService.health()
    } catch (e) {
      health.value = null
      error.value = errorMessage(e)
    } finally {
      loading.value = false
    }
  }

  return { health, error, loading, checkHealth }
})
