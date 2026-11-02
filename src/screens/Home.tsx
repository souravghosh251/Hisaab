import { useMemo, useRef, useState } from 'react'
import { Avatar, Balance } from '../components/ui'
import { useStore } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { balanceOf, formatDate, rupees, todayStr } from '../lib/money'
import { parseQuickEntry, type QuickResult } from '../lib/quickEntry'
import { searchParties } from '../lib/search'
import type { Party, PartyType } from '../lib/types'
import { PartySheet } from './PartySheet'
import { BulkReminderSheet } from './BulkReminderSheet'
import { savedMsg } from './Ledger'

type Sort = 'recent' | 'amount' | 'due'
type Parsed = Extract<QuickResult, { kind: 'pick' }> | Extract<QuickResult, { kind: 'new' }>

export function Home({ open, goSettings, toast }: { open: (id: string) => void; goSettings: () => void; toast: (m: string, undo?: () => void) => void }) {
  const { parties, byParty, txns, profile, saveTxn, deleteTxn, lastActivity, pending, syncError, retrySync, discardFailed } = useStore()
  const { t } = useI18n()
  const [bulk, setBulk] = useState(false)
  const [tab, setTab] = useState<PartyType>('customer')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [adding, setAdding] = useState<null | { name?: string; then?: Parsed }>(null)
  const [quick, setQuick] = useState('')
  const [quickErr, setQuickErr] = useState('')
  const [unsure, setUnsure] = useState<Parsed | null>(null) // quick entry that needs a pick or a new customer
  const typedAt = useRef<number | null>(null) // F22: when the owner started typing this quick entry

  const list = useMemo(() => parties.filter((p) => p.type === tab), [parties, tab])
  const rows = useMemo(() => {
    const found = q.trim() ? searchParties(q, list) : list
    const withBal = found.map((p) => ({ p, bal: balanceOf(byParty.get(p.id) ?? []) }))
    // While searching, keep the best matches first; otherwise pins, then the chosen sort.
    if (q.trim()) return withBal
    const by = {
      recent: (a: typeof withBal[0], b: typeof withBal[0]) => lastActivity(b.p.id).localeCompare(lastActivity(a.p.id)),
      amount: (a: typeof withBal[0], b: typeof withBal[0]) => Math.abs(b.bal) - Math.abs(a.bal),
      due: (a: typeof withBal[0], b: typeof withBal[0]) => (a.p.due_date ?? '9999').localeCompare(b.p.due_date ?? '9999') || Math.abs(b.bal) - Math.abs(a.bal),
    }[sort]
    return withBal.sort((a, b) => Number(!!b.p.pinned) - Number(!!a.p.pinned) || by(a, b))
  }, [list, byParty, q, sort, lastActivity])

  // Totals are always over the whole tab, never the filtered view.
  let receivable = 0, payable = 0
  for (const p of list) { const b = balanceOf(byParty.get(p.id) ?? []); if (b > 0) receivable += b; else payable -= b }

  const today = todayStr()
  const weekAgo = new Date(Date.now() - 6 * 864e5)
  const weekStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`
  const custIds = new Set(parties.filter((p) => p.type === 'customer').map((p) => p.id))
  const collected = txns.filter((t) => t.type === 'got' && custIds.has(t.party_id) && t.txn_date >= weekStr).reduce((s, t) => s + t.amount, 0)
  const overdue = parties
    .filter((p) => p.type === 'customer' && p.due_date && p.due_date < today)
    .map((p) => ({ p, bal: balanceOf(byParty.get(p.id) ?? []) }))
    .filter((r) => r.bal > 0)
    .sort((a, b) => b.bal - a.bal)
    .slice(0, 5)

  const you = tab === 'customer'
  const verb = (type: 'gave' | 'got') => t(type === 'gave' ? (you ? 'Gave' : 'Paid') : (you ? 'Got' : 'Received'))

  async function record(party: Party, r: { type: 'gave' | 'got'; amount: number; note: string }) {
    try {
      const ms = typedAt.current !== null ? performance.now() - typedAt.current : undefined
      const tx = await saveTxn({ party_id: party.id, type: r.type, amount: r.amount, note: r.note, txn_date: today, source: 'quick' }, { ms })
      setQuick(''); setQuickErr(''); setUnsure(null); typedAt.current = null
      const where = tx.queued ? ` · ${savedMsg(t, true)}` : ''
      toast(`${verb(r.type)} ${rupees(r.amount)} · ${party.name}${where}`, () => { deleteTxn(tx.id).catch(() => toast(t('Could not undo'))) })
    } catch (x) { setQuickErr(t('Could not save: {e}. Try again.', { e: (x as Error).message })) }
  }

  async function submitQuick(e: React.FormEvent) {
    e.preventDefault()
    if (!quick.trim()) return
    const r = parseQuickEntry(quick, list, tab)
    if (r.ok) return record(r.party, r)
    if (r.kind === 'error') { setUnsure(null); return setQuickErr(t(r.error)) }
    setQuickErr(''); setUnsure(r) // F25c: never a dead end; offer chips or "Add and record"
  }

  return (
    <main className="mx-auto max-w-md pb-48">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="text-2xl font-semibold truncate">{profile.business_name || 'Hisaab'}</h1>
        <button className="btn btn-secondary px-4" onClick={goSettings}>{t('Settings')}</button>
      </header>

      {pending > 0 && (
        <section className={`mx-4 mb-3 rounded-2xl border p-3 text-sm ${syncError ? 'border-due bg-surface' : 'border-line bg-surface'}`} role="status">
          {syncError ? (
            <>
              <p className="text-due font-medium">{t('A change could not be saved to your account: {e}', { e: syncError })}</p>
              <div className="flex gap-2 mt-2">
                <button className="btn btn-secondary min-h-[40px] text-sm" onClick={retrySync}>{t('Try again')}</button>
                <button className="btn btn-secondary min-h-[40px] text-sm text-due" onClick={() => { discardFailed() }}>{t('Discard it')}</button>
              </div>
            </>
          ) : (
            <p><span className="font-medium">{t('{n} changes saved on this phone', { n: pending })}</span> <span className="text-muted">{t('They will sync when you are online.')}</span></p>
          )}
        </section>
      )}

      <section className="mx-4 rounded-[28px] bg-ink text-white p-5" aria-label="Totals">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-white/70">{t("You'll get")}</div>
            <div className="font-mono text-3xl tracking-tight text-lime">{rupees(receivable)}</div>
          </div>
          <div>
            <div className="text-xs text-white/70">{t("You'll give")}</div>
            <div className="font-mono text-3xl tracking-tight">{rupees(payable)}</div>
          </div>
        </div>
        {tab === 'customer' && (
          <div className="mt-4 pt-4 border-t border-white/15 text-sm">
            <span className="text-white/70">{t('Collected this week')} </span><span className="font-mono">{rupees(collected)}</span>
          </div>
        )}
      </section>

      {tab === 'customer' && overdue.length > 0 && (
        <section className="mx-4 mt-3 card p-4" aria-label="Overdue">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">{t('Overdue')}</h2>
          </div>
          {overdue.map(({ p, bal }) => (
            <button key={p.id} className="flex w-full justify-between items-center min-h-[44px] text-left" onClick={() => open(p.id)}>
              <span className="truncate">{p.name} <span className="text-xs text-muted">{t('since')} {formatDate(p.due_date!)}</span></span>
              <span className="font-mono text-due">{rupees(bal)}</span>
            </button>
          ))}
        </section>
      )}

      {tab === 'customer' && receivable > 0 && (
        <div className="mx-4 mt-3">
          <button className="btn btn-accent w-full" onClick={() => setBulk(true)}>{t('Remind all')}</button>
        </div>
      )}

      <div className="mx-4 mt-4 grid grid-cols-2 gap-1 rounded-full bg-surface border border-line p-1" role="tablist">
        {(['customer', 'supplier'] as const).map((t2) => (
          <button key={t2} role="tab" aria-selected={tab === t2} className={`rounded-full min-h-[40px] text-sm font-medium ${tab === t2 ? 'bg-ink text-white' : ''}`} onClick={() => { setTab(t2); setUnsure(null); setQuickErr('') }}>
            {t2 === 'customer' ? t('Customers') : t('Suppliers')}
          </button>
        ))}
      </div>

      <div className="mx-4 mt-3 flex gap-2">
        <input className="field flex-1" type="search" placeholder={t(tab === 'customer' ? 'Name, nickname or phone' : 'Search suppliers')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('Search')} />
        <button className="btn btn-accent px-5" onClick={() => setAdding({})}>{t('+ Add')}</button>
      </div>
      {!q.trim() && (
        <div className="mx-4 mt-2 flex gap-2 items-center text-sm text-muted overflow-x-auto">
          {t('Sort:')}
          {(['recent', 'amount', 'due'] as const).map((s) => (
            <button key={s} className={`chip shrink-0 ${sort === s ? 'chip-on' : ''}`} onClick={() => setSort(s)}>{t(s === 'recent' ? 'Recent' : s === 'amount' ? 'Amount' : 'Oldest due')}</button>
          ))}
        </div>
      )}

      <section className="mx-4 mt-3 space-y-2" aria-label="List">
        {list.length === 0 && (
          <div className="card p-6 text-center">
            <p className="font-medium">{t('Welcome! Three steps to your first entry')}</p>
            <ol className="text-sm text-muted mt-3 space-y-1 text-left list-decimal pl-5">
              <li>{t(`Tap “+ Add” and save a ${tab}.`)}</li>
              <li>{t(`Open them and tap “${tab === 'customer' ? 'You gave ₹' : 'You paid ₹'}”.`)}</li>
              <li>{t('Type the amount and save. Later, tap Remind to ask on WhatsApp.')}</li>
            </ol>
          </div>
        )}
        {list.length > 0 && rows.length === 0 && <p className="text-center text-muted py-8">{t('No match for “{q}”.', { q })}</p>}
        {rows.map(({ p, bal }) => {
          const late = bal > 0 && p.due_date && p.due_date < today
          const sub = late ? t('Overdue since {d}', { d: formatDate(p.due_date!) })
            : p.due_date ? t('Collect by {d}', { d: formatDate(p.due_date) })
            : [p.alias, p.phone || p.note].filter(Boolean).join(' · ') || '—'
          return (
            <button key={p.id} className="card w-full p-4 flex items-center gap-3 text-left min-h-[68px]" onClick={() => open(p.id)}>
              <Avatar name={p.name} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-1.5">
                  {p.pinned && <svg className="shrink-0 text-muted" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-label={t('Pinned')}><path d="M12 17v5M9 3h6l-1 6 4 4H6l4-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>}
                  <span className="truncate">{p.name}</span>
                </div>
                <div className={`text-xs truncate ${late ? 'text-due font-medium' : 'text-muted'}`}>{sub}</div>
              </div>
              <Balance paise={bal} />
            </button>
          )
        })}
      </section>

      <form onSubmit={submitQuick} className="fixed bottom-0 inset-x-0 z-30 bg-bg/95 border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md p-3">
          {quickErr && <p className="text-due text-xs px-2 pb-2" role="alert">{quickErr}</p>}
          {unsure && (
            <div className="pb-2 px-1" role="group" aria-label={t('Who is it for?')}>
              <p className="text-xs text-muted pb-1.5">
                {unsure.kind === 'pick'
                  ? t('Which one? {a} for “{n}”', { a: `${verb(unsure.type)} ${rupees(unsure.amount)}`, n: unsure.name })
                  : t('No one called “{n}” yet.', { n: unsure.name })}
              </p>
              <div className="flex gap-2 overflow-x-auto">
                {unsure.kind === 'pick' && unsure.candidates.map((c) => (
                  <button key={c.id} type="button" className="chip shrink-0 min-h-[40px]" onClick={() => record(c, unsure)}>
                    {c.name}{c.alias ? <span className="text-muted"> · {c.alias}</span> : null}
                  </button>
                ))}
                <button type="button" className="chip chip-on shrink-0 min-h-[40px]" onClick={() => setAdding({ name: unsure.name, then: unsure })}>
                  {t(you ? 'Add customer and record' : 'Add supplier and record')}
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <input
              className="field font-mono flex-1"
              placeholder={you ? 'sharma 420 atta' : 'agarwal 5000 maal'}
              value={quick}
              onChange={(e) => {
                if (!quick && e.target.value) typedAt.current = performance.now()
                setQuick(e.target.value); setQuickErr(''); setUnsure(null)
              }}
              aria-label={t('Quick entry')} autoCapitalize="none" autoCorrect="off" enterKeyHint="done"
            />
            <button className="btn btn-accent w-12 h-12 !p-0 text-2xl" aria-label={t('Quick entry')}>+</button>
          </div>
          <p className="text-[11px] text-muted px-2 pt-1">{t(you ? 'Name, amount, note. Add “got” for a payment received.' : 'Name, amount, note. Add “paid” for a payment you made.')}</p>
        </div>
      </form>
      {bulk && <BulkReminderSheet onClose={() => setBulk(false)} />}
      {adding && (
        <PartySheet type={tab} initialName={adding.name} onClose={() => setAdding(null)}
          onSaved={(p) => { if (adding.then) record(p, adding.then); else open(p.id) }} />
      )}
    </main>
  )
}
