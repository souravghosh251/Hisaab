import { useMemo, useState } from 'react'
import { Avatar, Balance } from '../components/ui'
import { useStore } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { balanceOf, formatDate, rupees, todayStr } from '../lib/money'
import { parseQuickEntry } from '../lib/quickEntry'
import type { PartyType } from '../lib/types'
import { PartySheet } from './PartySheet'
import { BulkReminderSheet } from './BulkReminderSheet'

type Sort = 'amount' | 'due'

export function Home({ open, goSettings, toast }: { open: (id: string) => void; goSettings: () => void; toast: (m: string, undo?: () => void) => void }) {
  const { parties, byParty, txns, profile, saveTxn, deleteTxn } = useStore()
  const { t } = useI18n()
  const [bulk, setBulk] = useState(false)
  const [tab, setTab] = useState<PartyType>('customer')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('amount')
  const [adding, setAdding] = useState(false)
  const [quick, setQuick] = useState('')
  const [quickErr, setQuickErr] = useState('')

  const list = useMemo(() => parties.filter((p) => p.type === tab), [parties, tab])
  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return list
      .filter((p) => !ql || p.name.toLowerCase().includes(ql) || p.phone.includes(ql))
      .map((p) => ({ p, bal: balanceOf(byParty.get(p.id) ?? []) }))
      .sort((a, b) =>
        sort === 'amount'
          ? Math.abs(b.bal) - Math.abs(a.bal)
          : (a.p.due_date ?? '9999').localeCompare(b.p.due_date ?? '9999') || Math.abs(b.bal) - Math.abs(a.bal))
  }, [list, byParty, q, sort])

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

  async function submitQuick(e: React.FormEvent) {
    e.preventDefault()
    if (!quick.trim()) return
    const r = parseQuickEntry(quick, list)
    if (!r.ok) return setQuickErr(t(r.error, r.vars))
    try {
      const tx = await saveTxn({ party_id: r.party.id, type: r.type, amount: r.amount, note: r.note, txn_date: today })
      setQuick(''); setQuickErr('')
      toast(`${t(r.type === 'gave' ? 'Gave' : 'Got')} ${rupees(r.amount)} · ${r.party.name}`, () => { deleteTxn(tx.id).catch(() => toast(t('Could not undo'))) })
    } catch (x) { setQuickErr(t('Could not save: {e}. Try again.', { e: (x as Error).message })) }
  }

  return (
    <main className="mx-auto max-w-md pb-40">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="text-2xl font-semibold truncate">{profile.business_name || 'Hisaab'}</h1>
        <button className="btn btn-secondary px-4" onClick={goSettings}>{t('Settings')}</button>
      </header>

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
          <button key={t2} role="tab" aria-selected={tab === t2} className={`rounded-full min-h-[40px] text-sm font-medium ${tab === t2 ? 'bg-ink text-white' : ''}`} onClick={() => setTab(t2)}>
            {t2 === 'customer' ? t('Customers') : t('Suppliers')}
          </button>
        ))}
      </div>

      <div className="mx-4 mt-3 flex gap-2">
        <input className="field flex-1" type="search" placeholder={t(tab === 'customer' ? 'Search customers' : 'Search suppliers')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('Search')} />
        <button className="btn btn-accent px-5" onClick={() => setAdding(true)}>{t('+ Add')}</button>
      </div>
      <div className="mx-4 mt-2 flex gap-2 items-center text-sm text-muted">
        {t('Sort:')}
        <button className={`chip ${sort === 'amount' ? 'chip-on' : ''}`} onClick={() => setSort('amount')}>{t('Amount')}</button>
        <button className={`chip ${sort === 'due' ? 'chip-on' : ''}`} onClick={() => setSort('due')}>{t('Oldest due')}</button>
      </div>

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
          return (
            <button key={p.id} className="card w-full p-4 flex items-center gap-3 text-left min-h-[68px]" onClick={() => open(p.id)}>
              <Avatar name={p.name} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className={`text-xs truncate ${late ? 'text-due font-medium' : 'text-muted'}`}>
                  {late ? t('Overdue since {d}', { d: formatDate(p.due_date!) }) : p.due_date ? t('Collect by {d}', { d: formatDate(p.due_date) }) : p.phone || p.note || '—'}
                </div>
              </div>
              <Balance paise={bal} />
            </button>
          )
        })}
      </section>

      {tab === 'customer' && (
        <form onSubmit={submitQuick} className="fixed bottom-0 inset-x-0 z-30 bg-bg/95 border-t border-line pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-md p-3">
            {quickErr && <p className="text-due text-xs px-2 pb-2" role="alert">{quickErr}</p>}
            <div className="flex gap-2">
              <input className="field font-mono flex-1" placeholder="sharma 420 atta" value={quick} onChange={(e) => { setQuick(e.target.value); setQuickErr('') }} aria-label={t('Quick entry')} autoCapitalize="none" autoCorrect="off" />
              <button className="btn btn-accent w-12 h-12 !p-0 text-2xl" aria-label="Add quick entry">+</button>
            </div>
            <p className="text-[11px] text-muted px-2 pt-1">{t('Name, amount, note. Add “got” for a payment received.')}</p>
          </div>
        </form>
      )}
      {bulk && <BulkReminderSheet onClose={() => setBulk(false)} />}
      {adding && <PartySheet type={tab} onClose={() => setAdding(false)} onSaved={(p) => open(p.id)} />}
    </main>
  )
}
