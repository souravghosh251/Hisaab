import { useState } from 'react'
import { Balance } from '../components/ui'
import { useStore } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { formatDate, rupees, withRunning } from '../lib/money'
import type { Txn, TxnType } from '../lib/types'
import { EntrySheet } from './EntrySheet'
import { PartySheet } from './PartySheet'
import { ReminderSheet } from './ReminderSheet'
import { StatementSheet } from './StatementSheet'

export function Ledger({ id, back, goSettings, toast }: { id: string; back: () => void; goSettings: () => void; toast: (m: string, undo?: () => void) => void }) {
  const { parties, byParty, balance, deleteTxn } = useStore()
  const { t } = useI18n()
  const party = parties.find((p) => p.id === id)
  const [sheet, setSheet] = useState<null | { k: 'entry'; type?: TxnType; txn?: Txn } | { k: 'remind' } | { k: 'statement' } | { k: 'edit' }>(null)
  if (!party) return <div className="p-6">{t('Not found.')} <button className="underline" onClick={back}>{t('Back')}</button></div>

  const bal = balance(id)
  const rows = withRunning(byParty.get(id) ?? []).reverse() // newest first
  const you = party.type === 'customer'
  const overdue = bal > 0 && party.due_date && party.due_date < new Date().toISOString().slice(0, 10)

  return (
    <main className="mx-auto max-w-md pb-32">
      <header className="flex items-center gap-2 px-3 py-3">
        <button className="btn min-w-[44px] px-2" onClick={back} aria-label={t('Back')}>←</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">{party.name}</h1>
          <div className="text-xs text-muted truncate">{party.phone || t('No phone')}{party.note ? ` · ${party.note}` : ''}</div>
        </div>
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
              <div className="font-medium truncate">{txn.note || t(txn.type === 'gave' ? (you ? 'You gave' : 'You paid') : (you ? 'You got' : 'Goods received'))}</div>
              <div className="text-xs text-muted">{formatDate(txn.txn_date)} · {t('balance')} <span className="font-mono">{rupees(running)}</span> {running === 0 ? '' : t(running > 0 ? "you'll get" : "you'll give")}</div>
            </div>
            <div className="text-right">
              <div className={`font-mono font-medium ${txn.type === 'gave' ? 'text-due' : 'text-paid'}`}>{rupees(txn.amount)}</div>
              <div className="text-xs text-muted">{t(txn.type === 'gave' ? (you ? 'you gave' : 'you paid') : (you ? 'you got' : 'received'))}</div>
            </div>
          </button>
        ))}
      </section>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-bg/95 border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md grid grid-cols-2 gap-3 p-3">
          <button className="btn btn-primary btn-lg" onClick={() => setSheet({ k: 'entry', type: 'gave' })}>{t(you ? 'You gave ₹' : 'You paid ₹')}</button>
          <button className="btn btn-accent btn-lg" onClick={() => setSheet({ k: 'entry', type: 'got' })}>{t(you ? 'You got ₹' : 'Goods received ₹')}</button>
        </div>
      </div>

      {sheet?.k === 'entry' && (
        <EntrySheet party={party} initialType={sheet.type} txn={sheet.txn} onClose={() => setSheet(null)}
          onSaved={(tx, isNew) => {
            if (isNew) toast(t('Entry saved'), () => { deleteTxn(tx.id).catch(() => toast(t('Could not undo'))) })
            else toast(t('Entry updated'))
          }} />
      )}
      {sheet?.k === 'remind' && <ReminderSheet party={party} amount={bal} onClose={() => setSheet(null)} goSettings={goSettings} />}
      {sheet?.k === 'statement' && <StatementSheet party={party} onClose={() => setSheet(null)} />}
      {sheet?.k === 'edit' && <PartySheet party={party} type={party.type} onClose={() => setSheet(null)} onDeleted={back} />}
    </main>
  )
}
