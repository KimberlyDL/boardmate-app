import axios, { AxiosError } from 'axios'
import { tokenStorage } from './tokenStorage'
import type { ApiErrorBody } from '@/types/api'

/**
 * The one HTTP client every service module uses (src/services/<module>.ts).
 * Base URL: VITE_API_URL + /v1, e.g. http://localhost:8000/api/v1.
 */
export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/v1`,
  headers: { Accept: 'application/json' },
  timeout: 20000,
})

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type UnauthorizedHandler = () => void | Promise<void>
let onUnauthorized: UnauthorizedHandler | null = null

/** Registered by the auth store: called when the API rejects the token (401). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && onUnauthorized) {
      await onUnauthorized()
    }
    return Promise.reject(error)
  },
)

/** A readable message from any API or network error, for toasts and forms. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) return 'Cannot reach the server. Check your connection.'
    return error.response.data?.message || fallback
  }
  return fallback
}

/** The API's machine-readable error code, e.g. "email_unverified", "consent_required". */
export function errorCode(error: unknown): string | null {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.code ?? null
  }
  return null
}

/** Field errors from a 422 validation response, keyed by field name. */
export function fieldErrors(error: unknown): Record<string, string[]> {
  if (axios.isAxiosError<ApiErrorBody>(error) && error.response?.status === 422) {
    return error.response.data?.errors ?? {}
  }
  return {}
}

/** The first validation message if there is one, otherwise the general error: one line for a toast. */
export function firstError(error: unknown): string {
  return Object.values(fieldErrors(error))[0]?.[0] ?? errorMessage(error)
}
