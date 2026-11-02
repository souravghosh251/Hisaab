import { useMemo, useState } from 'react'
import { Sheet } from '../components/ui'
import { useStore } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { buildMessage, waNumber, whatsappUrl } from '../lib/reminder'
import { rupees, todayStr } from '../lib/money'
import { ReminderOptions, useReminderOptions } from './ReminderSheet'

/** Lists every customer with dues (overdue first). Browsers block opening many tabs
 *  at once, so each customer gets their own Send button and is marked once sent. */
export function BulkReminderSheet({ onClose }: { onClose: () => void }) {
  const { parties, balance, profile, track } = useStore()
  const { t } = useI18n()
  const opts = useReminderOptions()
  const { tone, msgLang } = opts
  const [sent, setSent] = useState<Set<string>>(new Set())
  const today = todayStr()

  const rows = useMemo(
    () =>
      parties
        .filter((p) => p.type === 'customer')
        .map((p) => ({ p, bal: balance(p.id), late: !!p.due_date && p.due_date < today }))
        .filter((r) => r.bal > 0)
        .sort((a, b) => Number(b.late) - Number(a.late) || b.bal - a.bal),
    [parties, balance, today],
  )
  const total = rows.reduce((s, r) => s + r.bal, 0)

  return (
    <Sheet title={t('Remind everyone')} onClose={onClose} dark>
      {rows.length === 0 ? (
        <p className="text-muted py-6">{t('Nobody has dues right now.')}</p>
      ) : (
        <>
          <p className="text-sm text-muted mb-3">{t('Customers with dues: {c}, {a} in total. WhatsApp opens one chat at a time: tap Send for each.', { c: rows.length, a: rupees(total) })}</p>
          <ReminderOptions {...opts} />
          <p className="text-xs text-muted mb-2">{t('Overdue first')}</p>
          <ul className="space-y-2">
            {rows.map(({ p, bal, late }) => {
              const ok = waNumber(p.phone).length >= 10
              const done = sent.has(p.id)
              const text = buildMessage({ tone, lang: msgLang, name: p.name, amount: bal, shop: profile.business_name || 'our shop', upiId: profile.upi_id, includeUpi: !!profile.upi_id })
              return (
                <li key={p.id} className="card p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className={`text-xs ${late ? 'text-due font-medium' : 'text-muted'}`}>
                      <span className="font-mono">{rupees(bal)}</span> {t("you'll get")}{late ? ` · ${t('Overdue')}` : ''}
                    </div>
                  </div>
                  {!ok ? (
                    <span className="text-xs text-muted">{t('No phone number')}</span>
                  ) : (
                    <a className={`btn min-h-[44px] px-4 ${done ? 'btn-secondary' : 'btn-accent'}`} href={whatsappUrl(p.phone, text)} target="_blank" rel="noopener noreferrer" onClick={() => { setSent(new Set(sent).add(p.id)); track('reminder_sent', { tone, lang: msgLang, upi: !!profile.upi_id, bulk: true }) }}>
                      {done ? t('Sent') : t('Send')}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Sheet>
  )
}
