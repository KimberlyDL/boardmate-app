/** Success envelope returned by every BoardMate API endpoint. */
export interface ApiEnvelope<T, M = Record<string, unknown>> {
  data: T
  meta?: M
  message?: string
}

/** Error body: { message, errors? } — errors present on 422 validation failures. */
export interface ApiErrorBody {
  message: string
  errors?: Record<string, string[]>
  /** Set for refusals the app handles specially (email_unverified, consent_required...). */
  code?: string
}
