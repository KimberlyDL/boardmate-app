import type {
  CaretakerAccessLevel,
  CaretakerInvitationStatus,
  OwnerVerificationStatus,
  UserRole,
} from './enums'

export interface OwnerProfile {
  business_name: string | null
  application_notes: string | null
  verification_status: OwnerVerificationStatus
  verification_label: string
  submitted_at: string | null
  reviewed_at: string | null
  review_reason: string | null
  payment: OwnerPaymentDetails
}

export interface OwnerPaymentDetails {
  gcash_name: string | null
  gcash_number: string | null
  bank_name: string | null
  bank_account_name: string | null
  bank_account_number: string | null
}

export interface AccessLevelOption {
  value: CaretakerAccessLevel
  label: string
  description: string
}

/** An owner–caretaker link; `person` is the other side. */
export interface CaretakerLink {
  id: number
  access_level: CaretakerAccessLevel
  access_level_label: string
  person: {
    id: number
    name: string
    email: string
    phone: string | null
    photo_url: string | null
    business_name: string | null
  }
  /** The owner's properties this caretaker runs, with the level for each. */
  properties: { id: number; name: string; access_level: CaretakerAccessLevel; access_level_label: string }[]
  since: string
}

export interface CaretakerInvitation {
  id: number
  email: string
  access_level: CaretakerAccessLevel
  access_level_label: string
  status: CaretakerInvitationStatus
  status_label: string
  expires_at: string
  created_at: string
}

/** What the invited person sees when opening the link. */
export interface InvitationDetails {
  owner_name: string
  email_hint: string
  access_level: CaretakerAccessLevel
  access_level_label: string
  access_level_description: string
  status: CaretakerInvitationStatus
  status_label: string
  expires_at: string
}

export interface AdminUser {
  id: number
  name: string
  email: string
  phone: string | null
  roles: UserRole[]
  email_verified_at: string | null
  suspended_at: string | null
  created_at: string
  owner_profile: OwnerProfile | null
}

export interface PageMeta {
  current_page: number
  last_page: number
  total: number
}
