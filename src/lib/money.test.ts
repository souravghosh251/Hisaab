import { describe, it, expect } from 'vitest'
import { balanceOf, formatPaise, withRunning, totals, groupByParty } from './money'
import { parseQuickEntry } from './quickEntry'
import { buildMessage, waNumber } from './reminder'
import { matchTier, searchParties } from './search'
import { applyOp, flush, isNetworkError, readOutbox, writeOutbox, type Queued } from './outbox'
import type { Backend } from './backend'
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
  it('never dead-ends: ambiguity offers chips, a new name offers "Add and record"', () => {
    const pick = parseQuickEntry('ramesh 5', ps)
    expect(pick).toMatchObject({ ok: false, kind: 'pick', amount: 500 })
    expect(pick.ok === false && pick.kind === 'pick' && pick.candidates.map((c) => c.id).sort()).toEqual(['2', '3'])
    expect(parseQuickEntry('zed 5 atta', ps)).toMatchObject({ ok: false, kind: 'new', name: 'zed', amount: 500, note: 'atta' })
    expect(parseQuickEntry('sharma', ps)).toMatchObject({ ok: false, kind: 'error' })
  })
  it('matches aliases, even ones containing numbers', () => {
    const withAlias = [...ps, { ...party('4', 'Mehta'), alias: 'Flat 302' }]
    expect(parseQuickEntry('flat 302 420 atta', withAlias)).toMatchObject({ ok: true, party: { id: '4' }, amount: 42000, note: 'atta' })
    expect(parseQuickEntry('302 420', withAlias)).toMatchObject({ ok: true, party: { id: '4' }, amount: 42000 })
  })
  it('tolerates spelling variants', () => {
    expect(parseQuickEntry('sharama 100', ps)).toMatchObject({ ok: true, party: { id: '1' } })
  })
  it('uses supplier wording on the Suppliers tab', () => {
    const sup = [party('s', 'Agarwal Traders', 'supplier')]
    expect(parseQuickEntry('agarwal 5000 maal', sup, 'supplier')).toMatchObject({ ok: true, type: 'got', amount: 500000 })
    expect(parseQuickEntry('agarwal 2000 paid', sup, 'supplier')).toMatchObject({ ok: true, type: 'gave' })
  })
})

describe('search (F24)', () => {
  const ps = [
    { ...party('1', 'Sunil Verma'), phone: '98765 41234' },
    { ...party('2', 'Mehta'), alias: 'Flat 302' },
    party('3', 'Pooja Shrivastav'),
    party('4', 'Ramesh Sharma'),
  ]
  const ids = (q: string) => searchParties(q, ps).map((p) => p.id)
  it('finds by alias, including flat numbers', () => expect(ids('302')).toEqual(['2']))
  it('finds by last 4 digits of the phone', () => expect(ids('1234')).toEqual(['1']))
  it('matches common spelling variants', () => {
    expect(ids('varma')).toEqual(['1'])
    expect(ids('sharama')).toEqual(['4'])
    expect(ids('puja')).toEqual(['3'])
    expect(ids('srivastava')).toEqual(['3'])
  })
  it('ranks exact and prefix matches above sound-alikes', () => {
    expect(matchTier('ramesh sharma', ps[3])).toBe(0)
    expect(matchTier('sharama', ps[3])).toBe(5)
  })
})

describe('outbox (F26 airplane-mode test)', () => {
  const user = { id: 'u1', email: 'a@b.co' }
  const offline = () => Promise.reject(new TypeError('Failed to fetch'))
  const fake = (fn: (op: string) => Promise<void>) => ({
    addTxn: (_u: unknown, t: Txn) => fn(t.id), addParty: () => fn('party'), updateTxn: () => fn('u'), deleteTxn: () => fn('d'),
    updateParty: () => fn('up'), deleteParty: () => fn('dp'), saveProfile: () => fn('prof'),
  }) as unknown as Backend

  it('keeps 5 entries offline, survives a reload, then syncs in order', async () => {
    const store = new Map<string, string>()
    globalThis.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) } as unknown as Storage
    const q: Queued[] = [1, 2, 3, 4, 5].map((i) => ({ op: { k: 'addTxn', t: mk(i, 'gave', 100 * i, '2026-01-01') } }))
    expect(await flush(fake(offline), user, q)).toHaveLength(5) // still offline: nothing lost
    writeOutbox(user.id, q)
    const reloaded = readOutbox(user.id) // page reload
    expect(reloaded).toHaveLength(5)
    // Balances include the pending entries.
    let snap = { profile: { name: '', business_name: '', phone: '', upi_id: '' }, parties: [party('p1', 'A')], txns: [] as Txn[] }
    for (const it of reloaded) snap = applyOp(snap, it.op)
    expect(balanceOf(snap.txns)).toBe(1500)
    // Replaying twice must not double count.
    for (const it of reloaded) snap = applyOp(snap, it.op)
    expect(balanceOf(snap.txns)).toBe(1500)
    // Back online: everything is sent, in order.
    const sent: string[] = []
    expect(await flush(fake(async (id) => { sent.push(id) }), user, reloaded)).toEqual([])
    expect(sent).toEqual(['1', '2', '3', '4', '5'])
  })
  it('treats a retried insert that already arrived as sent', async () => {
    const q: Queued[] = [{ op: { k: 'addTxn', t: mk(1, 'gave', 100, '2026-01-01') } }]
    expect(await flush(fake(() => Promise.reject(new Error('duplicate key value violates unique constraint'))), user, q)).toEqual([])
  })
  it('keeps a change the server rejects, with its error, and stops there', async () => {
    const q: Queued[] = [1, 2].map((i) => ({ op: { k: 'addTxn', t: mk(i, 'gave', 100, '2026-01-01') } }))
    const rest = await flush(fake(() => Promise.reject(new Error('new row violates row-level security'))), user, q)
    expect(rest).toHaveLength(2)
    expect(rest[0].error).toMatch(/row-level security/)
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true) // Safari's wording
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
  it('has every tone in every launch language (F28)', () => {
    for (const lang of ['en', 'hi', 'mr'] as const)
      for (const tone of ['polite', 'festival'] as const) {
        const m = buildMessage({ tone, lang, name: 'Sharma', amount: 125000, shop: 'Gupta Store', includeUpi: false })
        expect(m).toContain('Sharma'); expect(m).toContain('₹1,250'); expect(m).toContain('Gupta Store')
      }
    expect(buildMessage({ tone: 'polite', lang: 'mr', name: 'A', amount: 100, shop: 'S', includeUpi: false })).toContain('बाकी')
  })
})
