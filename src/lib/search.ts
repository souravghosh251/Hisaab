import type { Party } from './types'

export const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/**
 * Rough sound-alike key for romanised Indian names, so common spelling variants
 * meet: sharma/sharama, verma/varma, shrivastav/srivastava, pooja/puja.
 * Keeps the first letter, drops later vowels and doubled letters.
 */
export function soundKey(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!w) return ''
  w = w.replace(/ph/g, 'f').replace(/w/g, 'v').replace(/z/g, 'j').replace(/q/g, 'k')
    .replace(/(?<=[sc])h/g, '') // sh/ch -> s/c: shrivastav ~ srivastava
    .replace(/ee/g, 'i').replace(/oo/g, 'u')
  const head = w[0]
  const tail = w.slice(1).replace(/[aeiouy]/g, '')
  return (head + tail).replace(/(.)\1+/g, '$1')
}

/**
 * Match tier, lower is better; null when no match.
 * 0 exact name/alias · 1 starts with · 2 a word starts with · 3 contains · 4 phone digits · 5 sounds alike
 */
export function matchTier(query: string, p: Party): number | null {
  const q = norm(query)
  if (!q) return null
  const fields = [norm(p.name), norm(p.alias ?? '')].filter(Boolean)
  if (fields.some((f) => f === q)) return 0
  if (fields.some((f) => f.startsWith(q))) return 1
  if (fields.some((f) => f.split(' ').some((w) => w.startsWith(q)))) return 2
  if (fields.some((f) => f.includes(q))) return 3
  const digits = q.replace(/\D/g, '')
  if (digits.length >= 3 && digits === q.replace(/\s/g, '') && p.phone.replace(/\D/g, '').endsWith(digits)) return 4
  // Sound-alike: every query word must sound like the start of some word in the name or alias.
  const qk = q.split(' ').map(soundKey).filter((k) => k.length >= 2)
  if (qk.length === 0) return null
  const wk = fields.flatMap((f) => f.split(' ')).map(soundKey)
  if (qk.every((k) => wk.some((w) => w.startsWith(k)))) return 5
  return null
}

/** Parties matching the query, best tier first; with `bestOnly`, just the best tier. */
export function searchParties(query: string, parties: Party[], bestOnly = false): Party[] {
  const scored = parties
    .map((p) => ({ p, tier: matchTier(query, p) }))
    .filter((x): x is { p: Party; tier: number } => x.tier !== null)
    .sort((a, b) => a.tier - b.tier)
  if (bestOnly && scored.length) return scored.filter((x) => x.tier === scored[0].tier).map((x) => x.p)
  return scored.map((x) => x.p)
}
