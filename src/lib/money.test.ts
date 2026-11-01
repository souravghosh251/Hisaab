import { describe, it, expect } from 'vitest'
import { balanceOf, formatPaise, withRunning, totals, groupByParty } from './money'
import { parseQuickEntry } from './quickEntry'
import { buildMessage, waNumber } from './reminder'
import type { Party, Txn } from './types'

const mk = (i: number, type: 'gave' | 'got', amount: number, date: string, party = 'p1'): Txn => ({
  id: String(i), party_id: party, type, amount, note: '', txn_date: date,
  created_at: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`, updated_at: '',
})
const party = (id: string, name: string, type: 'customer' | 'supplier' = 'customer'): Party => ({
  id, name, phone: '', note: '', type, due_date: null, created_at: '',
})

describe('money', () => {
  it('formats Indian grouping', () => {
    expect(formatPaise(10000000)).toBe('1,00,000')
    expect(formatPaise(12345)).toBe('123.45')
  })
  it('balance matches manual sum for a 50 entry ledger', () => {
    const txns: Txn[] = []
    let manual = 0
    for (let i = 0; i < 50; i++) {
      const type = i % 3 === 0 ? 'got' : 'gave'
      const amt = (i + 1) * 137 // paise
      manual += type === 'gave' ? amt : -amt
      txns.push(mk(i, type, amt, `2026-01-${String((i % 28) + 1).padStart(2, '0')}`))
    }
    expect(balanceOf(txns)).toBe(manual)
    const r = withRunning(txns)
    expect(r[r.length - 1].running).toBe(manual)
    for (let i = 1; i < r.length; i++)
      expect(r[i].running - r[i - 1].running).toBe(r[i].txn.type === 'gave' ? r[i].txn.amount : -r[i].txn.amount)
  })
  it('totals equal sum of party balances', () => {
    const ps = [party('a', 'A'), party('b', 'B')]
    const tx = [mk(1, 'gave', 500, '2026-01-01', 'a'), mk(2, 'got', 800, '2026-01-02', 'b'), mk(3, 'gave', 100, '2026-01-02', 'b')]
    expect(totals(ps, groupByParty(tx))).toEqual({ receivable: 500, payable: 700 })
  })
})

describe('quick entry', () => {
  const ps = [party('1', 'Sharma Ji'), party('2', 'Ramesh Kumar'), party('3', 'Ramesh Gupta')]
  it('parses name amount note', () => {
    const r = parseQuickEntry('sharma 420 atta', ps)
    expect(r).toMatchObject({ ok: true, type: 'gave', amount: 42000, note: 'atta' })
  })
  it('detects got', () => {
    expect(parseQuickEntry('Sharma 1,200 got', ps)).toMatchObject({ ok: true, type: 'got', amount: 120000 })
  })
  it('flags ambiguity and misses', () => {
    expect(parseQuickEntry('ramesh 5', ps)).toMatchObject({ ok: false })
    expect(parseQuickEntry('zed 5', ps)).toMatchObject({ ok: false })
    expect(parseQuickEntry('sharma', ps)).toMatchObject({ ok: false })
  })
})

describe('reminder', () => {
  it('normalizes phones', () => {
    expect(waNumber('98765 43210')).toBe('919876543210')
    expect(waNumber('+91 98765 43210')).toBe('919876543210')
  })
  it('includes upi link and id', () => {
    const m = buildMessage({ tone: 'polite', name: 'A', amount: 50000, shop: 'S', upiId: 'a@upi', includeUpi: true })
    expect(m).toContain('upi://pay?pa=a%40upi')
    expect(m).toContain('am=500.00')
    expect(m).toContain('UPI ID: a@upi')
  })
})
