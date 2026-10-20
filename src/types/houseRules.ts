import type { HouseRuleAcceptanceMethod, HouseRuleCategory } from './enums'

/** A property's house rules (D3). */

export interface HouseRule {
  category: HouseRuleCategory
  category_label: string
  body: string
  /** Written by the app from the curfew and visitor settings */
  is_auto?: boolean
}

export interface HouseRuleVersion {
  id: number
  /** null for the draft */
  version: number | null
  is_draft: boolean
  note: string | null
  published_at: string | null
  published_by?: string | null
  rules: HouseRule[]
}

export interface PropertyHouseRules {
  current: HouseRuleVersion | null
  draft: HouseRuleVersion | null
  /** The lines the curfew and visitor settings give now; added to every version on publish */
  automatic: HouseRule[]
  versions: { version: number; published_at: string | null; published_by: string | null; note: string | null; rules_count: number }[]
}

export interface StayHouseRules {
  current: HouseRuleVersion | null
  needs_acceptance: boolean
  acceptances: { version: number; method: HouseRuleAcceptanceMethod; method_label: string; recorded_by: string | null; accepted_at: string }[]
}

export interface HouseRuleInput {
  category: HouseRuleCategory
  body: string
}
