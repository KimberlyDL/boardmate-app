import type { NotificationEvent, UserRole } from './enums'
import type { OwnerProfile } from './roles'

export interface BoarderProfile {
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
}

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  email_verified_at: string | null
  /** New address waiting for confirmation (email change), if any. */
  pending_email: string | null
  /** False for Google-created accounts that never set a password. */
  has_password: boolean
  google_linked: boolean
  photo_url: string | null
  roles: UserRole[]
  active_role: UserRole | null
  consented_at: string | null
  boarder_profile?: BoarderProfile | null
  owner_profile?: OwnerProfile | null
  created_at: string
}

export interface AppNotification {
  id: string
  event: NotificationEvent | string
  title: string
  body: string
  action_url: string | null
  read_at: string | null
  created_at: string
}

export interface NotificationPreference {
  event: NotificationEvent
  label: string
  muted: boolean
}
