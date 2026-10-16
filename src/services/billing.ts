import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { PageMeta } from '@/types/roles'
import type {
  Bill,
  BillsMeta,
  CollectionNote,
  DocumentLink,
  MyBillsMeta,
  OverdueRow,
  PayerBalance,
  Payment,
  PaymentInput,
  PaymentsMeta,
  UtilityBill,
  UtilityBillInput,
  UtilityShare,
} from '@/types/billing'

function paymentForm(input: PaymentInput, extra: Record<string, string | number>): FormData {
  const form = new FormData()
  Object.entries(extra).forEach(([k, v]) => form.append(k, String(v)))
  form.append('amount_centavos', String(input.amount_centavos))
  form.append('method', input.method)
  form.append('paid_on', input.paid_on)
  if (input.reference) form.append('reference', input.reference)
  if (input.note) form.append('note', input.note)
  if (input.proof) form.append('proof', input.proof)
  return form
}

/** Bills (C4), payments recorded by hand (C6) and metered utility bills. */
export const billingService = {
  // Bills
  async bills(propertyId: number, params: { status?: 'unpaid' | 'paid' | 'all'; payer_id?: number; page?: number } = {}) {
    const { data } = await api.get<ApiEnvelope<Bill[], BillsMeta>>(`/properties/${propertyId}/bills`, { params })
    return { items: data.data, meta: data.meta! }
  },

  async addCharge(propertyId: number, body: { tenancy_id: number; amount_centavos: number; description: string; reason: string; due_on?: string }) {
    const { data } = await api.post<ApiEnvelope<Bill>>(`/properties/${propertyId}/charges`, body)
    return { bill: data.data, message: data.message ?? '' }
  },

  /** A correction: positive charges more, negative is a credit. */
  async adjust(billId: number, body: { amount_centavos: number; reason: string; description?: string; line_id?: number | null }) {
    const { data } = await api.post<ApiEnvelope<Bill>>(`/bills/${billId}/adjustments`, body)
    return { bill: data.data, message: data.message ?? '' }
  },

  // Payments (staff)
  async payments(propertyId: number, params: { status?: string; payer_id?: number; page?: number } = {}) {
    const { data } = await api.get<ApiEnvelope<Payment[], PaymentsMeta>>(`/properties/${propertyId}/payments`, { params })
    return { items: data.data, meta: data.meta! }
  },

  async balance(propertyId: number, payerId: number): Promise<PayerBalance> {
    const { data } = await api.get<ApiEnvelope<PayerBalance>>(`/properties/${propertyId}/payers/${payerId}/balance`)
    return data.data
  },

  async record(propertyId: number, payerId: number, input: PaymentInput) {
    const { data } = await api.post<ApiEnvelope<Payment>>(`/properties/${propertyId}/payments`, paymentForm(input, { payer_id: payerId }))
    return { payment: data.data, message: data.message ?? '' }
  },

  async confirm(paymentId: number) {
    const { data } = await api.post<ApiEnvelope<Payment>>(`/payments/${paymentId}/confirm`)
    return { payment: data.data, message: data.message ?? '' }
  },

  async reject(paymentId: number, reason: string) {
    const { data } = await api.post<ApiEnvelope<Payment>>(`/payments/${paymentId}/reject`, { reason })
    return { payment: data.data, message: data.message ?? '' }
  },

  async reverse(paymentId: number, reason: string) {
    const { data } = await api.post<ApiEnvelope<Payment>>(`/payments/${paymentId}/reverse`, { reason })
    return { payment: data.data, message: data.message ?? '' }
  },

  // Overdue list and follow-up (C7)
  async overdue(propertyId: number) {
    const { data } = await api.get<ApiEnvelope<OverdueRow[], { payers: number; overdue_total_centavos: number }>>(`/properties/${propertyId}/collections`)
    return { items: data.data, meta: data.meta! }
  },

  async notes(propertyId: number, payerId: number): Promise<CollectionNote[]> {
    const { data } = await api.get<ApiEnvelope<CollectionNote[]>>(`/properties/${propertyId}/collections/${payerId}/notes`)
    return data.data
  },

  async addNote(propertyId: number, payerId: number, note: string, promisedOn?: string | null): Promise<CollectionNote> {
    const { data } = await api.post<ApiEnvelope<CollectionNote>>(`/properties/${propertyId}/collections/${payerId}/notes`, { note, promised_on: promisedOn || null })
    return data.data
  },

  /** A reminder now for what is due; once a day per payer. */
  async remind(propertyId: number, payerId: number): Promise<string> {
    const { data } = await api.post<ApiEnvelope<null>>(`/properties/${propertyId}/collections/${payerId}/remind`)
    return data.message ?? ''
  },

  async markLate(billId: number) {
    const { data } = await api.post<ApiEnvelope<Bill>>(`/bills/${billId}/mark-late`)
    return { bill: data.data, message: data.message ?? '' }
  },

  async startReview(billId: number, reason: string) {
    const { data } = await api.put<ApiEnvelope<Bill>>(`/bills/${billId}/review`, { reason })
    return { bill: data.data, message: data.message ?? '' }
  },

  async endReview(billId: number) {
    const { data } = await api.delete<ApiEnvelope<Bill>>(`/bills/${billId}/review`)
    return { bill: data.data, message: data.message ?? '' }
  },

  // PDF documents (A9): each call returns a short-lived link
  async receiptLink(paymentId: number): Promise<DocumentLink> {
    const { data } = await api.get<ApiEnvelope<DocumentLink>>(`/payments/${paymentId}/receipt-link`)
    return data.data
  },

  async noticeLink(billId: number): Promise<DocumentLink> {
    const { data } = await api.get<ApiEnvelope<DocumentLink>>(`/bills/${billId}/notice-link`)
    return data.data
  },

  async statementLink(propertyId: number, payerId: number, period: { from?: string; to?: string } = {}): Promise<DocumentLink> {
    const { data } = await api.get<ApiEnvelope<DocumentLink>>(`/properties/${propertyId}/payers/${payerId}/statement-link`, { params: period })
    return data.data
  },

  async myStatementLink(propertyId: number, period: { from?: string; to?: string } = {}): Promise<DocumentLink> {
    const { data } = await api.get<ApiEnvelope<DocumentLink>>('/me/statement-link', { params: { property_id: propertyId, ...period } })
    return data.data
  },

  // The signed-in boarder
  async myBills(params: { status?: 'unpaid' | 'paid' | 'all'; page?: number } = {}) {
    const { data } = await api.get<ApiEnvelope<Bill[], MyBillsMeta>>('/me/bills', { params })
    return { items: data.data, meta: data.meta! }
  },

  async myPayments(page = 1) {
    const { data } = await api.get<ApiEnvelope<Payment[], PageMeta>>('/me/payments', { params: { page } })
    return { items: data.data, meta: data.meta! }
  },

  /** "I paid": waits for the owner or a caretaker to confirm. Needs a reference no. or a screenshot. */
  async report(propertyId: number, input: PaymentInput) {
    const { data } = await api.post<ApiEnvelope<Payment>>('/me/payments', paymentForm(input, { property_id: propertyId }))
    return { payment: data.data, message: data.message ?? '' }
  },

  // Metered utility bills
  async utilityBills(propertyId: number): Promise<UtilityBill[]> {
    const { data } = await api.get<ApiEnvelope<UtilityBill[]>>(`/properties/${propertyId}/utility-bills`)
    return data.data
  },

  async previewUtilityBill(propertyId: number, input: UtilityBillInput): Promise<UtilityShare[]> {
    const body = {
      utility_account_id: input.utility_account_id,
      coverage_from_on: input.coverage_from_on,
      coverage_to_on: input.coverage_to_on,
      total_centavos: input.total_centavos,
      waive_room_ids: input.waive_room_ids ?? [],
    }
    const { data } = await api.post<ApiEnvelope<UtilityShare[]>>(`/properties/${propertyId}/utility-bills/preview`, body)
    return data.data
  },

  async enterUtilityBill(propertyId: number, input: UtilityBillInput) {
    const form = new FormData()
    form.append('utility_account_id', String(input.utility_account_id))
    form.append('coverage_from_on', input.coverage_from_on)
    form.append('coverage_to_on', input.coverage_to_on)
    form.append('total_centavos', String(input.total_centavos))
    ;(input.waive_room_ids ?? []).forEach((id) => form.append('waive_room_ids[]', String(id)))
    if (input.photo) form.append('photo', input.photo)
    const { data } = await api.post<ApiEnvelope<UtilityBill>>(`/properties/${propertyId}/utility-bills`, form)
    return { utilityBill: data.data, message: data.message ?? '' }
  },

  async correctUtilityBill(utilityBillId: number, totalCentavos: number, reason: string) {
    const { data } = await api.post<ApiEnvelope<UtilityBill>>(`/utility-bills/${utilityBillId}/correct`, { total_centavos: totalCentavos, reason })
    return { utilityBill: data.data, message: data.message ?? '' }
  },
}
