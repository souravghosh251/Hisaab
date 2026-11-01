import type { Party, TxnType } from './types'

export type QuickResult =
  | { ok: true; party: Party; type: TxnType; amount: number; note: string }
  | { ok: false; error: string; vars?: Record<string, string>; name?: string }

const GOT = new Set(['got', 'received', 'paid', 'recd', 'mila', 'liya', 'jama'])
const GAVE = new Set(['gave', 'give', 'diya', 'udhaar', 'udhar', 'credit'])
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Parses "sharma 420 atta", "Ramesh 500 gave", "priya 1,200 got".
 * Direction defaults to "gave" (the common case: giving goods on credit).
 */
export function parseQuickEntry(input: string, parties: Party[]): QuickResult {
  const tokens = input.trim().split(/\s+/).filter(Boolean)
  const amtIdx = tokens.findIndex((t) => /^[₹]?\d[\d,]*(\.\d+)?$/.test(t))
  if (amtIdx < 0) return { ok: false, error: 'Add an amount, e.g. "sharma 420 atta"' }
  const amount = Math.round(parseFloat(tokens[amtIdx].replace(/[₹,]/g, '')) * 100)
  if (!(amount > 0)) return { ok: false, error: 'Amount must be more than 0' }

  let type: TxnType = 'gave'
  const nameTokens: string[] = []
  const noteTokens: string[] = []
  tokens.forEach((t, i) => {
    if (i === amtIdx) return
    const k = t.toLowerCase()
    if (GOT.has(k)) type = 'got'
    else if (GAVE.has(k)) type = 'gave'
    else if (i < amtIdx) nameTokens.push(t)
    else noteTokens.push(t)
  })
  const name = norm(nameTokens.join(' '))
  if (!name) return { ok: false, error: 'Start with a customer name, e.g. "sharma 420 atta"' }

  const exact = parties.filter((p) => norm(p.name) === name)
  const starts = parties.filter((p) => norm(p.name).startsWith(name))
  const words = parties.filter((p) => norm(p.name).split(' ').some((w) => w.startsWith(name)))
  const contains = parties.filter((p) => norm(p.name).includes(name))
  const hits = [exact, starts, words, contains].find((h) => h.length > 0) ?? []
  if (hits.length === 0) return { ok: false, error: 'No customer matches "{name}"', vars: { name: nameTokens.join(' ') }, name: nameTokens.join(' ') }
  if (hits.length > 1) return { ok: false, error: '"{name}" matches {list}. Be more specific.', vars: { name: nameTokens.join(' '), list: hits.map((h) => h.name).join(', ') } }
  return { ok: true, party: hits[0], type, amount, note: noteTokens.join(' ') }
}
