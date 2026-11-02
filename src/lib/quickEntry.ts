import type { Party, PartyType, TxnType } from './types'
import { matchTier, norm } from './search'

interface Parsed { type: TxnType; amount: number; note: string; name: string }
export type QuickResult =
  | ({ ok: true; party: Party } & Parsed)
  | ({ ok: false; kind: 'pick'; candidates: Party[] } & Parsed) // several match: show tap-to-pick chips
  | ({ ok: false; kind: 'new' } & Parsed) // nobody matches: offer "Add and record"
  | { ok: false; kind: 'error'; error: string }

// "Payment" words and "credit" words. For customers the default is credit given (gave);
// for suppliers it is goods received on credit (got).
const PAY_IN = new Set(['got', 'received', 'recd', 'mila', 'liya', 'jama'])
const PAY_OUT = new Set(['paid', 'pay', 'diya', 'chukaya'])
const CREDIT = new Set(['gave', 'give', 'udhaar', 'udhar', 'credit', 'maal', 'goods'])
const isAmount = (t: string) => /^₹?\d[\d,]*(\.\d+)?$/.test(t)

/**
 * Parses "sharma 420 atta", "Ramesh 500 got", "flat 302 1,200", "302 420 atta".
 * The amount is a number after the name. When several numbers could be the amount
 * (e.g. an alias like "Flat 302"), the split whose name matches a party best wins.
 */
export function parseQuickEntry(input: string, parties: Party[], partyType: PartyType = 'customer'): QuickResult {
  const tokens = input.trim().split(/\s+/).filter(Boolean)
  const cands = tokens.map((t, i) => (i > 0 && isAmount(t) ? i : -1)).filter((i) => i > 0)
  if (cands.length === 0) {
    return tokens.length && isAmount(tokens[0])
      ? { ok: false, kind: 'error', error: 'Start with a customer name, e.g. "sharma 420 atta"' }
      : { ok: false, kind: 'error', error: 'Add an amount, e.g. "sharma 420 atta"' }
  }

  const best = (name: string) => {
    let tier = Infinity
    for (const p of parties) { const t = matchTier(name, p); if (t !== null && t < tier) tier = t }
    return tier
  }
  // Pick the amount position whose name part matches best; ties go to the earliest.
  let amtIdx = cands[0], bestTier = Infinity
  for (const i of cands) {
    const name = tokens.slice(0, i).filter((t) => !PAY_IN.has(t.toLowerCase()) && !PAY_OUT.has(t.toLowerCase()) && !CREDIT.has(t.toLowerCase())).join(' ')
    const tier = best(name)
    if (tier < bestTier) { bestTier = tier; amtIdx = i }
  }
  const amount = Math.round(parseFloat(tokens[amtIdx].replace(/[₹,]/g, '')) * 100)
  if (!(amount > 0)) return { ok: false, kind: 'error', error: 'Amount must be more than 0' }

  let type: TxnType = partyType === 'customer' ? 'gave' : 'got'
  const nameTokens: string[] = []
  const noteTokens: string[] = []
  tokens.forEach((t, i) => {
    if (i === amtIdx) return
    const k = t.toLowerCase()
    if (PAY_IN.has(k)) type = 'got'
    else if (PAY_OUT.has(k)) type = 'gave'
    else if (CREDIT.has(k)) type = partyType === 'customer' ? 'gave' : 'got'
    else if (i < amtIdx) nameTokens.push(t)
    else noteTokens.push(t)
  })
  const name = nameTokens.join(' ')
  const parsed: Parsed = { type, amount, note: noteTokens.join(' '), name }
  if (!norm(name)) return { ok: false, kind: 'error', error: 'Start with a customer name, e.g. "sharma 420 atta"' }

  const scored = parties
    .map((p) => ({ p, tier: matchTier(name, p) }))
    .filter((x): x is { p: Party; tier: number } => x.tier !== null)
  if (scored.length === 0) return { ok: false, kind: 'new', ...parsed }
  const top = Math.min(...scored.map((x) => x.tier))
  const hits = scored.filter((x) => x.tier === top).map((x) => x.p)
  if (hits.length > 1) return { ok: false, kind: 'pick', candidates: hits.slice(0, 6), ...parsed }
  return { ok: true, party: hits[0], ...parsed }
}
