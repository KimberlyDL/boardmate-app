import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { Balances, ExpenseInput, Group, GroupLine, GroupSummary, Repayment, RepaymentInput } from '@/types/groups'

/** FormData for an expense: arrays and maps as name[key] fields. */
function expenseForm(input: Partial<ExpenseInput>): FormData {
  const form = new FormData()
  if (input.description !== undefined) form.append('description', input.description)
  if (input.amount_centavos !== undefined) form.append('amount_centavos', String(input.amount_centavos))
  if (input.spent_on) form.append('spent_on', input.spent_on)
  if (input.method) form.append('method', input.method)
  if (input.paid_by_member_id) form.append('paid_by_member_id', String(input.paid_by_member_id))
  ;(input.participants ?? []).forEach((id) => form.append('participants[]', String(id)))
  Object.entries(input.weights ?? {}).forEach(([id, w]) => form.append(`weights[${id}]`, String(w)))
  Object.entries(input.amounts ?? {}).forEach(([id, a]) => form.append(`amounts[${id}]`, String(a)))
  if (input.proof) form.append('proof', input.proof)
  return form
}

/** Room groups (D5): shared bills, members' expenses, repayments. */
export const groupService = {
  async mine(): Promise<GroupSummary[]> {
    const { data } = await api.get<ApiEnvelope<GroupSummary[]>>('/me/groups')
    return data.data
  },

  async get(groupId: number): Promise<Group> {
    const { data } = await api.get<ApiEnvelope<Group>>(`/groups/${groupId}`)
    return data.data
  },

  /** Staff: a room's group (created if needed). */
  async forRoom(roomId: number): Promise<Group> {
    const { data } = await api.get<ApiEnvelope<Group>>(`/rooms/${roomId}/group`)
    return data.data
  },

  async setRole(groupId: number, memberId: number, role: 'moderator' | 'member'): Promise<string> {
    const { data } = await api.put<ApiEnvelope<unknown>>(`/groups/${groupId}/members/${memberId}/role`, { role })
    return data.message ?? ''
  },

  async setDefaultSplit(groupId: number, method: 'equal' | 'occupant_days'): Promise<string> {
    const { data } = await api.put<ApiEnvelope<unknown>>(`/groups/${groupId}/default-split`, { method })
    return data.message ?? ''
  },

  // Lines
  async lines(groupId: number): Promise<GroupLine[]> {
    const { data } = await api.get<ApiEnvelope<GroupLine[]>>(`/groups/${groupId}/expenses`)
    return data.data
  },

  async addExpense(groupId: number, input: ExpenseInput): Promise<{ line: GroupLine; message: string }> {
    const { data } = await api.post<ApiEnvelope<GroupLine>>(`/groups/${groupId}/expenses`, expenseForm(input))
    return { line: data.data, message: data.message ?? '' }
  },

  async editExpense(groupId: number, lineId: number, input: Partial<ExpenseInput>): Promise<{ line: GroupLine; message: string }> {
    const { proof: _ignored, ...body } = input
    void _ignored
    const { data } = await api.patch<ApiEnvelope<GroupLine>>(`/groups/${groupId}/expenses/${lineId}`, body)
    return { line: data.data, message: data.message ?? '' }
  },

  async deleteExpense(groupId: number, lineId: number): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<null>>(`/groups/${groupId}/expenses/${lineId}`)
    return data.message ?? ''
  },

  async resplit(groupId: number, lineId: number, body: { method: string; weights?: Record<number, number>; amounts?: Record<number, number> }) {
    const { data } = await api.put<ApiEnvelope<GroupLine>>(`/groups/${groupId}/expenses/${lineId}/split`, body)
    return { line: data.data, message: data.message ?? '' }
  },

  /** `changes`: member id => signed centavos. For an owner bill they add up to ₱0. */
  async correct(groupId: number, lineId: number, changes: Record<number, number>, reason: string) {
    const { data } = await api.post<ApiEnvelope<GroupLine>>(`/groups/${groupId}/expenses/${lineId}/corrections`, { changes, reason })
    return { line: data.data, message: data.message ?? '' }
  },

  // Balances and repayments
  async balances(groupId: number): Promise<Balances> {
    const { data } = await api.get<ApiEnvelope<Balances>>(`/groups/${groupId}/balances`)
    return data.data
  },

  async repayments(groupId: number): Promise<Repayment[]> {
    const { data } = await api.get<ApiEnvelope<Repayment[]>>(`/groups/${groupId}/repayments`)
    return data.data
  },

  async markRepayment(groupId: number, input: RepaymentInput): Promise<{ repayment: Repayment; message: string }> {
    const form = new FormData()
    form.append('to_member_id', String(input.to_member_id))
    if (input.from_member_id) form.append('from_member_id', String(input.from_member_id))
    form.append('amount_centavos', String(input.amount_centavos))
    form.append('method', input.method)
    if (input.reference) form.append('reference', input.reference)
    if (input.note) form.append('note', input.note)
    if (input.proof) form.append('proof', input.proof)
    const { data } = await api.post<ApiEnvelope<Repayment>>(`/groups/${groupId}/repayments`, form)
    return { repayment: data.data, message: data.message ?? '' }
  },

  async confirmRepayment(groupId: number, id: number): Promise<string> {
    const { data } = await api.post<ApiEnvelope<Repayment>>(`/groups/${groupId}/repayments/${id}/confirm`)
    return data.message ?? ''
  },

  async rejectRepayment(groupId: number, id: number, reason: string): Promise<string> {
    const { data } = await api.post<ApiEnvelope<Repayment>>(`/groups/${groupId}/repayments/${id}/reject`, { reason })
    return data.message ?? ''
  },
}
