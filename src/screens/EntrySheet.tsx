import { useState } from 'react'
import { Sheet, Confirm } from '../components/ui'
import { Keypad } from '../components/Keypad'
import { useStore } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { MAX_RUPEES, type Party, type Txn, type TxnType } from '../lib/types'
import { rupees, todayStr } from '../lib/money'

export function EntrySheet({ party, initialType, txn, onClose, onSaved }: {
  party: Party; initialType?: TxnType; txn?: Txn; onClose: () => void; onSaved?: (t: Txn, isNew: boolean) => void
}) {
  const { saveTxn, deleteTxn, balance } = useStore()
  const { t } = useI18n()
  const [type, setType] = useState<TxnType>(txn?.type ?? initialType ?? 'gave')
  const [amt, setAmt] = useState(txn ? String(txn.amount / 100) : '')
  const [note, setNote] = useState(txn?.note ?? '')
  const [date, setDate] = useState(txn?.txn_date ?? todayStr())
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const paise = Number(amt || 0) * 100
  const signed = (t: TxnType, p: number) => (t === 'gave' ? p : -p)
  const base = balance(party.id) - (txn ? signed(txn.type, txn.amount) : 0)
  const preview = base + signed(type, paise)
  const you = party.type === 'customer'

  async function save() {
    if (paise <= 0) return setErr(t('Enter an amount'))
    setBusy(true); setErr('')
    try {
      const t = await saveTxn({ id: txn?.id, party_id: party.id, type, amount: paise, note: note.trim(), txn_date: date })
      onSaved?.(t, !txn); onClose()
    } catch (x) { setErr(t('Could not save: {e}. Your entry is still here, try again.', { e: (x as Error).message })) }
    setBusy(false)
  }

  if (confirm && txn)
    return (
      <Confirm title={t('Delete this entry?')} body={t('{a} will be removed and the balance recalculated.', { a: rupees(txn.amount) })} confirmLabel={t('Delete')}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => { try { await deleteTxn(txn.id); onClose() } catch (x) { setConfirm(false); setErr((x as Error).message) } }} />
    )

  return (
    <Sheet title={txn ? t('Edit entry') : party.name} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2 mb-4" role="group" aria-label={t('Entry type')}>
        <button className={`btn ${type === 'gave' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setType('gave')} aria-pressed={type === 'gave'}>{t(you ? 'You gave' : 'You paid')}</button>
        <button className={`btn ${type === 'got' ? 'btn-accent' : 'btn-secondary'}`} onClick={() => setType('got')} aria-pressed={type === 'got'}>{t(you ? 'You got' : 'Goods received')}</button>
      </div>
      <div className="text-center my-4">
        <div className="font-mono text-6xl tracking-tight" aria-live="polite">₹{amt ? new Intl.NumberFormat('en-IN').format(Number(amt)) : '0'}</div>
        <div className="text-sm text-muted mt-2">
          {t('New balance')} <span className="font-mono">{rupees(preview)}</span>{' '}
          {preview === 0 ? t('(settled)') : preview > 0 ? t("(you'll get)") : t("(you'll give)")}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 mb-3">
        <input className="field" placeholder={t('Note (e.g. atta, rice)')} value={note} onChange={(e) => setNote(e.target.value)} aria-label={t('Note')} />
        <input type="date" className="field w-auto" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value || todayStr())} aria-label={t('Date')} />
      </div>
      <Keypad value={amt} onChange={setAmt} max={MAX_RUPEES} />
      {err && <p className="text-due text-sm mt-3" role="alert">{err}</p>}
      <button className="btn btn-accent btn-lg w-full mt-3" disabled={busy || paise <= 0} onClick={save}>{busy ? t('Saving…') : t('Save entry')}</button>
      {txn && <button className="btn btn-secondary w-full mt-2 text-due" onClick={() => setConfirm(true)}>{t('Delete entry')}</button>}
    </Sheet>
  )
}
