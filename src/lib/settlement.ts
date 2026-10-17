/**
 * The deposit settlement's numbers (C8), the same way the API works them out
 * (SettlementService::plan), so the sheet shows the result before saving.
 * The API checks again when it saves.
 *
 * The deposit first pays what is owed (after deductions, net of any credit);
 * of what is left the owner may keep part; the rest is refunded together
 * with any unused credit.
 */
export interface SettlementPlan {
  apply: number
  left: number
  refund: number
  stillOwed: number
  creditReturned: number
}

export function planSettlement(deposit: number, owed: number, credit: number, deductions: number, keep: number): SettlementPlan {
  const net = owed - credit + deductions
  const owedAfter = Math.max(0, net)
  const creditAfter = Math.max(0, -net)
  const apply = Math.min(deposit, owedAfter)
  const left = deposit - apply

  return {
    apply,
    left,
    refund: Math.max(0, left - keep) + creditAfter,
    stillOwed: owedAfter - apply,
    creditReturned: creditAfter,
  }
}
