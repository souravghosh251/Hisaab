import { useState } from 'react'
import { Sheet } from '../components/ui'
import { useStore } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { todayStr } from '../lib/money'
import type { Party } from '../lib/types'

export function StatementSheet({ party, onClose }: { party: Party; onClose: () => void }) {
  const { txns, profile } = useStore()
  const { t } = useI18n()
  const mine = txns.filter((t) => t.party_id === party.id)
  const first = mine.map((t) => t.txn_date).sort()[0] ?? todayStr()
  const [from, setFrom] = useState(first)
  const [to, setTo] = useState(todayStr())
  const [err, setErr] = useState('')

  async function go() {
    if (from > to) return setErr(t('Start date must be before end date'))
    try {
      const { buildStatement, shareOrSave } = await import('../lib/pdf')
      await shareOrSave(buildStatement({ party, txns: mine, profile, from, to }), `${party.name.replace(/\s+/g, '-')}-statement.pdf`)
      onClose()
    } catch (x) { setErr((x as Error).message) }
  }
  return (
    <Sheet title={t('PDF statement')} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="sf">{t('From')}</label><input id="sf" type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label" htmlFor="st">{t('To')}</label><input id="st" type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      {err && <p className="text-due text-sm mt-3" role="alert">{err}</p>}
      <button className="btn btn-accent btn-lg w-full mt-5" onClick={go}>{t('Share / download PDF')}</button>
    </Sheet>
  )
}
