import { api } from './api'
import type { ApiEnvelope } from '@/types/api'

export interface Health {
  app: string
  api_version: string
  database: 'ok' | 'unavailable'
  server_time: string
  timezone: string
}

export const systemService = {
  async health(): Promise<Health> {
    const { data } = await api.get<ApiEnvelope<Health>>('/health')
    return data.data
  },
}
