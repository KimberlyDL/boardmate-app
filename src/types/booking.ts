import type { ApplicationStatus } from './enums'

export interface ListingSummary {
  id: number
  name: string
  type: string
  type_label: string
  rental_mode: 'whole' | 'bedspaces'
  barangay: string | null
  city: string | null
  province: string | null
  latitude: number | null
  longitude: number | null
  who_can_apply: string | null
  price_from_centavos: number | null
  availability: { available: number; total: number; label: string }
  included_utilities: string[]
  cover_photo_url: string | null
  owner_name: string
  published_at: string | null
}

export interface ListingDetail extends ListingSummary {
  description: string | null
  street: string | null
  /** 1600 px WebP, for the gallery */
  photos: string[]
  /** 480 px WebP versions, same order as `photos` */
  photo_thumbs: string[]
  slots: { id: number; label: string; kind: string; capacity: number; rent_centavos: number | null }[]
  utilities: {
    type: string
    name: string
    method: string
    method_label: string
    billed_by: 'owner' | 'group'
    amount_centavos: number | null
  }[]
  deposit: { rule: string | null; label: string | null; fixed_centavos: number | null }
  curfew_time: string | null
  house_rules_summary: string | null
}

export interface BookingApplication {
  id: number
  status: ApplicationStatus
  status_label: string
  property: {
    id: number
    name: string
    area: string
    address: string | null
    cover_photo_url: string | null
    rental_mode: 'whole' | 'bedspaces'
    owner_name: string
  }
  unit: { id: number; label: string; rent_centavos: number | null } | null
  planned_move_in_on: string
  message: string | null
  reserved_until: string | null
  closed_reason: string | null
  decided_at: string | null
  closed_at: string | null
  created_at: string
  can_cancel: boolean
  // Reviewer view only
  applicant?: { id: number; name: string; email: string; phone: string; photo_url: string | null }
  id_document_url?: string | null
  id_document_purged?: boolean
  decided_by?: string | null
}

export interface BookableUnit {
  id: number
  label: string
  rent_centavos: number | null
}
