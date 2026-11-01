import { useState } from 'react'
import { Sheet, Confirm } from '../components/ui'
import { useStore } from '../lib/store'
import { useI18n } from '../lib/i18n'
import type { Party, PartyType } from '../lib/types'

export function PartySheet({ party, type, onClose, onSaved, onDeleted }: {
  party?: Party; type: PartyType; onClose: () => void; onSaved?: (p: Party) => void; onDeleted?: () => void
}) {
  const { saveParty, deleteParty } = useStore()
  const { t } = useI18n()
  const [name, setName] = useState(party?.name ?? '')
  const [phone, setPhone] = useState(party?.phone ?? '')
  const [note, setNote] = useState(party?.note ?? '')
  const [due, setDue] = useState(party?.due_date ?? '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const label = type === 'customer' ? 'customer' : 'supplier'
  const kind = (pre: string) => t(`${pre} ${label}`)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setErr(t('Name is required'))
    setBusy(true); setErr('')
    try {
      const p = await saveParty({ id: party?.id, name: name.trim(), phone: phone.trim(), note: note.trim(), type: party?.type ?? type, due_date: due || null })
      onSaved?.(p); onClose()
    } catch (x) { setErr(t('Could not save: {e}. Your details are still here, try again.', { e: (x as Error).message })) }
    setBusy(false)
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
        <div><label className="label" htmlFor="pn">{t('Name')}</label><input id="pn" className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div><label className="label" htmlFor="pp">{t('Phone (for WhatsApp)')}</label><input id="pp" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" /></div>
        <div><label className="label" htmlFor="pnote">{t('Note (optional)')}</label><input id="pnote" className="field" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <div><label className="label" htmlFor="pd">{t('Collect by (optional)')}</label><input id="pd" type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        {err && <p className="text-due text-sm" role="alert">{err}</p>}
        <button className="btn btn-accent btn-lg w-full" disabled={busy}>{busy ? t('Saving…') : t('Save')}</button>
        {party && <button type="button" className="btn btn-secondary w-full text-due" onClick={() => setConfirm(true)}>{kind('Delete')}</button>}
      </form>
    </Sheet>
  )
}
