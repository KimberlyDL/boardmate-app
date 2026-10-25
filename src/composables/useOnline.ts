import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Whether the device has a network connection right now (updates live). */
export function useOnline() {
  const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
  const update = () => (online.value = navigator.onLine)

  onMounted(() => {
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
  })

  return online
}
