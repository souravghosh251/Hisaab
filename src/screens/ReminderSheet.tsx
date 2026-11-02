import { useMemo, useState } from 'react'
import { Sheet } from '../components/ui'
import { useStore } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { buildMessage, whatsappUrl, type MsgLang, type Tone } from '../lib/reminder'
import type { Party } from '../lib/types'
import { rupees } from '../lib/money'

const TONES: Tone[] = ['polite', 'festival']
const LANGS: { id: MsgLang; label: string }[] = [{ id: 'en', label: 'English' }, { id: 'hi', label: 'हिंदी' }, { id: 'mr', label: 'मराठी' }]

/** Tone and message language (F28: every reminder tone in every launch language). Defaults to the app language. */
export function useReminderOptions() {
  const { lang } = useI18n()
  const [tone, setTone] = useState<Tone>('polite')
  const [msgLang, setMsgLang] = useState<MsgLang>(lang)
  return { tone, setTone, msgLang, setMsgLang }
}

export function ReminderOptions({ tone, setTone, msgLang, setMsgLang }: ReturnType<typeof useReminderOptions>) {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <div className="flex gap-2" role="group" aria-label={t('Tone')}>
        {TONES.map((x) => (
          <button key={x} className={`chip ${tone === x ? 'chip-on' : ''}`} aria-pressed={tone === x} onClick={() => setTone(x)}>{t(x === 'polite' ? 'Polite' : 'Festival')}</button>
        ))}
      </div>
      <div className="flex gap-2" role="group" aria-label={t('Message language')}>
        {LANGS.map((x) => (
          <button key={x.id} className={`chip ${msgLang === x.id ? 'chip-on' : ''}`} aria-pressed={msgLang === x.id} onClick={() => setMsgLang(x.id)}>{x.label}</button>
        ))}
      </div>
    </div>
  )
}

export function ReminderSheet({ party, amount, onClose, goSettings }: { party: Party; amount: number; onClose: () => void; goSettings: () => void }) {
  const { profile, track } = useStore()
  const { t } = useI18n()
  const opts = useReminderOptions()
  const [upi, setUpi] = useState(!!profile.upi_id)
  const text = useMemo(
    () => buildMessage({ tone: opts.tone, lang: opts.msgLang, name: party.name, amount, shop: profile.business_name || 'our shop', upiId: profile.upi_id, includeUpi: upi }),
    [opts.tone, opts.msgLang, party.name, amount, profile.business_name, profile.upi_id, upi],
  )
  const hasPhone = party.phone.replace(/\D/g, '').length >= 10

  return (
    <Sheet title={t('Remind on WhatsApp')} onClose={onClose} dark>
      <p className="text-sm text-muted mb-3">{t('{n} owes {a}', { n: party.name, a: rupees(amount) })}</p>
      <ReminderOptions {...opts} />
      <div className="card p-4 text-[15px] whitespace-pre-wrap break-words max-h-48 overflow-y-auto">{text}</div>
      <label className="flex items-center gap-3 mt-4 min-h-[44px]">
        <input type="checkbox" className="h-5 w-5 accent-ink" checked={upi} disabled={!profile.upi_id} onChange={(e) => setUpi(e.target.checked)} />
        <span className="text-sm">{t('Include UPI payment link')} {profile.upi_id ? <span className="text-muted">({profile.upi_id})</span> : null}</span>
      </label>
      {!profile.upi_id && (
        <button className="text-sm underline text-muted min-h-[44px]" onClick={() => { onClose(); goSettings() }}>{t('Add your UPI ID in Settings')}</button>
      )}
      {!hasPhone && <p className="text-due text-sm mt-2" role="alert">{t('Add a phone number for {n} to send on WhatsApp.', { n: party.name })}</p>}
      <a
        className={`btn btn-accent btn-lg w-full mt-4 ${hasPhone ? '' : 'pointer-events-none opacity-50'}`}
        href={hasPhone ? whatsappUrl(party.phone, text) : undefined}
        target="_blank" rel="noopener noreferrer"
        onClick={() => { track('reminder_sent', { tone: opts.tone, lang: opts.msgLang, upi, bulk: false }); setTimeout(onClose, 300) }}
      >
        {t('Send on WhatsApp')}
      </a>
    </Sheet>
  )
}
