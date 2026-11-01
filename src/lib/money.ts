import type { Party, Txn } from './types'

const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

/** paise -> "1,00,000" (Indian grouping, decimals only when non-zero) */
export function formatPaise(paise: number): string {
  return fmt.format(Math.abs(paise) / 100)
}
export const rupees = (paise: number) => `₹${formatPaise(paise)}`

/** Balance of a party = sum(gave) - sum(got). Positive = they owe the shop. */
export function balanceOf(txns: Txn[]): number {
  let b = 0
  for (const t of txns) b += t.type === 'gave' ? t.amount : -t.amount
  return b
}

export function groupByParty(txns: Txn[]): Map<string, Txn[]> {
  const m = new Map<string, Txn[]>()
  for (const t of txns) {
    const l = m.get(t.party_id)
    if (l) l.push(t)
    else m.set(t.party_id, [t])
  }
  return m
}

export function totals(parties: Party[], byParty: Map<string, Txn[]>) {
  let receivable = 0
  let payable = 0
  for (const p of parties) {
    const b = balanceOf(byParty.get(p.id) ?? [])
    if (b > 0) receivable += b
    else payable += -b
  }
  return { receivable, payable }
}

export const sortTxns = (txns: Txn[]) =>
  [...txns].sort((a, b) => a.txn_date.localeCompare(b.txn_date) || a.created_at.localeCompare(b.created_at))

/** Entries in chronological order, each with the running balance after it. */
export function withRunning(txns: Txn[]): { txn: Txn; running: number }[] {
  let run = 0
  return sortTxns(txns).map((txn) => {
    run += txn.type === 'gave' ? txn.amount : -txn.amount
    return { txn, running: run }
  })
}

export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const uid = () => crypto.randomUUID()
