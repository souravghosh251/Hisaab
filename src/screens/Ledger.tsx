import { useState } from 'react'
import { Balance } from '../components/ui'
import { useStore } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { formatDate, rupees, todayStr, withRunning } from '../lib/money'
import { MAX_PINS, OPENING_NOTE, type Txn, type TxnType } from '../lib/types'
import { EntrySheet } from './EntrySheet'
import { PartySheet } from './PartySheet'
import { ReminderSheet } from './ReminderSheet'
import { StatementSheet } from './StatementSheet'

/** Toast text for a saved entry: says plainly when it is only on this phone for now (F26). */
export const savedMsg = (t: (s: string) => string, queued?: boolean) => (queued ? t('Saved on this phone, will sync') : t('Entry saved'))

export function Ledger({ id, back, goSettings, toast }: { id: string; back: () => void; goSettings: () => void; toast: (m: string, undo?: () => void) => void }) {
  const { parties, byParty, balance, deleteTxn, saveTxn, togglePin, pendingIds } = useStore()
  const { t } = useI18n()
  const party = parties.find((p) => p.id === id)
  const [sheet, setSheet] = useState<null | { k: 'entry'; type?: TxnType; txn?: Txn } | { k: 'remind' } | { k: 'statement' } | { k: 'edit' }>(null)
  const [opened] = useState(() => performance.now())
  const [busy, setBusy] = useState(false)
  if (!party) return <div className="p-6">{t('Not found.')} <button className="underline" onClick={back}>{t('Back')}</button></div>

  const bal = balance(id)
  const rows = withRunning(byParty.get(id) ?? []).reverse() // newest first
  const you = party.type === 'customer'
  const overdue = bal > 0 && party.due_date && party.due_date < new Date().toISOString().slice(0, 10)
  // F25a: repeat the latest credit entry (goods given to a customer / received from a supplier).
  const creditType: TxnType = you ? 'gave' : 'got'
  const last = rows.find((r) => r.txn.type === creditType && r.txn.source !== 'opening')?.txn
  const undo = (id: string) => () => { deleteTxn(id).catch(() => toast(t('Could not undo'))) }
  const entryLabel = (x: Txn) =>
    x.source === 'opening' ? t(OPENING_NOTE) : x.note || t(x.type === 'gave' ? (you ? 'You gave' : 'You paid') : (you ? 'You got' : 'Goods received'))

  async function repeat() {
    if (!last || busy) return
    setBusy(true)
    try {
      const tx = await saveTxn({ party_id: id, type: last.type, amount: last.amount, note: last.note, txn_date: todayStr(), source: 'repeat' }, { ms: performance.now() - opened })
      toast(`${savedMsg(t, tx.queued)} · ${rupees(tx.amount)}`, undo(tx.id))
    } catch (x) { toast(t('Could not save: {e}. Try again.', { e: (x as Error).message })) }
    setBusy(false)
  }

  async function pin() {
    if (!(await togglePin(id).catch(() => true))) toast(t('You can pin up to {n}. Unpin one first.', { n: MAX_PINS }))
  }

  return (
    <main className={`mx-auto max-w-md ${last ? 'pb-48' : 'pb-32'}`}>
      <header className="flex items-center gap-2 px-3 py-3">
        <button className="btn min-w-[44px] px-2" onClick={back} aria-label={t('Back')}>←</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">{party.name}</h1>
          <div className="text-xs text-muted truncate">{[party.alias, party.phone || t('No phone'), party.note].filter(Boolean).join(' · ')}</div>
        </div>
        <button className={`btn !px-0 w-11 ${party.pinned ? 'btn-primary' : 'btn-secondary'}`} onClick={pin} aria-pressed={!!party.pinned} aria-label={t(party.pinned ? 'Unpin' : 'Pin to top')} title={t(party.pinned ? 'Unpin' : 'Pin to top')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={party.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 17v5M9 3h6l-1 6 4 4H6l4-4z" /></svg>
        </button>
        <button className="btn btn-secondary px-4" onClick={() => setSheet({ k: 'edit' })}>{t('Edit')}</button>
      </header>

      <section className="mx-4 card p-5">
        <Balance paise={bal} big />
        {party.due_date && (
          <div className={`mt-2 text-sm ${overdue ? 'text-due font-medium' : 'text-muted'}`}>
            {overdue ? t('Overdue since {d}', { d: formatDate(party.due_date) }) : t('Collect by {d}', { d: formatDate(party.due_date) })}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button className="btn btn-accent flex-1" disabled={bal <= 0} onClick={() => setSheet({ k: 'remind' })}>{t('Remind')}</button>
          <button className="btn btn-secondary flex-1" onClick={() => setSheet({ k: 'statement' })}>{t('Statement PDF')}</button>
        </div>
      </section>

      <section className="mx-4 mt-4 space-y-2" aria-label={t('Entries')}>
        {rows.length === 0 && <p className="text-center text-muted py-10">{t('No entries yet. Tap “{b}” below to add the first one.', { b: t(you ? 'You gave' : 'You paid') })}</p>}
        {rows.map(({ txn, running }) => (
          <button key={txn.id} className="card w-full text-left p-4 flex items-center gap-3 min-h-[64px]" onClick={() => setSheet({ k: 'entry', txn })}>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{entryLabel(txn)}</div>
              <div className="text-xs text-muted">{formatDate(txn.txn_date)} · {t('balance')} <span className="font-mono">{rupees(running)}</span> {running === 0 ? '' : t(running > 0 ? "you'll get" : "you'll give")}</div>
              {pendingIds.has(txn.id) && <div className="text-xs text-due font-medium mt-0.5">{t('On this phone only, not synced yet')}</div>}
            </div>
            <div className="text-right">
              <div className={`font-mono font-medium ${txn.type === 'gave' ? 'text-due' : 'text-paid'}`}>{rupees(txn.amount)}</div>
              <div className="text-xs text-muted">{t(txn.type === 'gave' ? (you ? 'you gave' : 'you paid') : (you ? 'you got' : 'received'))}</div>
            </div>
          </button>
        ))}
      </section>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-bg/95 border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md p-3 space-y-2">
          {last && (
            <button className="btn btn-secondary w-full min-w-0" onClick={repeat} disabled={busy}>
              <span className="truncate">{t('Same as last time')} <span className="font-mono">{rupees(last.amount)}</span>{last.note ? ` · ${last.note}` : ''}</span>
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button className="btn btn-primary btn-lg" onClick={() => setSheet({ k: 'entry', type: 'gave' })}>{t(you ? 'You gave ₹' : 'You paid ₹')}</button>
            <button className="btn btn-accent btn-lg" onClick={() => setSheet({ k: 'entry', type: 'got' })}>{t(you ? 'You got ₹' : 'Goods received ₹')}</button>
          </div>
        </div>
      </div>

      {sheet?.k === 'entry' && (
        <EntrySheet party={party} initialType={sheet.type} txn={sheet.txn} onClose={() => setSheet(null)}
          onSaved={(tx, isNew) => {
            if (isNew) toast(savedMsg(t, tx.queued), undo(tx.id))
            else toast(t(tx.queued ? 'Saved on this phone, will sync' : 'Entry updated'))
          }} />
      )}
      {sheet?.k === 'remind' && <ReminderSheet party={party} amount={bal} onClose={() => setSheet(null)} goSettings={goSettings} />}
      {sheet?.k === 'statement' && <StatementSheet party={party} onClose={() => setSheet(null)} />}
      {sheet?.k === 'edit' && <PartySheet party={party} type={party.type} onClose={() => setSheet(null)} onDeleted={back} />}
    </main>
  )
}
