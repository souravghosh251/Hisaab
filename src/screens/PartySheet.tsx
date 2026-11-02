import { useState } from 'react'
import { Sheet, Confirm } from '../components/ui'
import { useStore } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { todayStr } from '../lib/money'
import { MAX_RUPEES, OPENING_NOTE, type Party, type PartyType, type TxnType } from '../lib/types'

export function PartySheet({ party, type, initialName, onClose, onSaved, onDeleted }: {
  party?: Party; type: PartyType; initialName?: string; onClose: () => void; onSaved?: (p: Party) => void; onDeleted?: () => void
}) {
  const { saveParty, deleteParty, saveTxn } = useStore()
  const { t } = useI18n()
  const [name, setName] = useState(party?.name ?? initialName ?? '')
  const [alias, setAlias] = useState(party?.alias ?? '')
  const [phone, setPhone] = useState(party?.phone ?? '')
  const [note, setNote] = useState(party?.note ?? '')
  const [due, setDue] = useState(party?.due_date ?? '')
  // F21: existing balance when the customer is first added. "They owe me" is a gave entry.
  const [openDir, setOpenDir] = useState<TxnType>('gave')
  const [openAmt, setOpenAmt] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const label = type === 'customer' ? 'customer' : 'supplier'
  const kind = (pre: string) => t(`${pre} ${label}`)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setErr(t('Name is required'))
    const opening = Math.round(Number(openAmt || 0) * 100)
    if (!party && (opening < 0 || opening > MAX_RUPEES * 100 || Number.isNaN(opening))) return setErr(t('Opening balance must be between ₹0 and ₹10,00,000'))
    setBusy(true); setErr('')
    try {
      const p = await saveParty({
        id: party?.id, name: name.trim(), alias: alias.trim(), phone: phone.trim(), note: note.trim(),
        type: party?.type ?? type, due_date: due || null, pinned: party?.pinned ?? false,
      })
      if (!party && opening > 0)
        await saveTxn({ party_id: p.id, type: openDir, amount: opening, note: OPENING_NOTE, txn_date: todayStr(), source: 'opening' })
      onSaved?.(p); onClose()
    } catch (x) { setErr(t('Could not save: {e}. Your details are still here, try again.', { e: (x as Error).message })); setBusy(false) }
  }

  if (confirm && party)
    return (
      <Confirm
        title={t('Delete {n}?', { n: party.name })}
        body={t(`This removes the ${label} and hides all their entries from your totals.`)}
        confirmLabel={t('Delete')}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          try { await deleteParty(party.id); onDeleted?.(); onClose() } catch (x) { setConfirm(false); setErr((x as Error).message) }
        }}
      />
    )

  return (
    <Sheet title={party ? kind('Edit') : kind('Add')} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div><label className="label" htmlFor="pn">{t('Name')}</label><input id="pn" className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!initialName} /></div>
        <div>
          <label className="label" htmlFor="pa">{t('Nickname, flat no. or landmark (optional)')}</label>
          <input id="pa" className="field" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder={t('e.g. Flat 302, Doctor sahab')} />
        </div>
        <div><label className="label" htmlFor="pp">{t('Phone (for WhatsApp)')}</label><input id="pp" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" /></div>
        {!party && (
          <fieldset>
            <legend className="label">{t('Existing balance (optional)')}</legend>
            <div className="grid grid-cols-2 gap-2 mb-2" role="group">
              {(['gave', 'got'] as const).map((d) => (
                <button key={d} type="button" aria-pressed={openDir === d} onClick={() => setOpenDir(d)}
                  className={`btn min-h-[44px] text-sm ${openDir === d ? (d === 'gave' ? 'btn-primary' : 'btn-accent') : 'btn-secondary'}`}>
                  {t(d === 'gave' ? 'They owe me ₹' : 'I owe them ₹')}
                </button>
              ))}
            </div>
            <input className="field font-mono" inputMode="decimal" value={openAmt} onChange={(e) => setOpenAmt(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" aria-label={t('Existing balance (optional)')} autoFocus={!!initialName} />
          </fieldset>
        )}
        <div><label className="label" htmlFor="pnote">{t('Note (optional)')}</label><input id="pnote" className="field" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <div><label className="label" htmlFor="pd">{t('Collect by (optional)')}</label><input id="pd" type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        {err && <p className="text-due text-sm" role="alert">{err}</p>}
        <button className="btn btn-accent btn-lg w-full" disabled={busy}>{busy ? t('Saving…') : t('Save')}</button>
        {party && <button type="button" className="btn btn-secondary w-full text-due" onClick={() => setConfirm(true)}>{kind('Delete')}</button>}
      </form>
    </Sheet>
  )
}
