import { useState } from 'react'
import { Avatar, Balance } from '../components/ui'
import { useStore } from '../lib/store'
import { useI18n, LangToggle } from '../lib/i18n'
import { todayStr } from '../lib/money'

const KEY = (userId: string) => `hisaab:onboarded:${userId}`
export function isOnboarded(userId: string) {
  try { return localStorage.getItem(KEY(userId)) === '1' } catch { return true }
}
function markOnboarded(userId: string) {
  try { localStorage.setItem(KEY(userId), '1') } catch { /* private mode: guide shows again next time */ }
}

const daysAgo = (n: number) => {
  const d = new Date(todayStr() + 'T00:00:00')
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** F15: three-step first-run guide, then an optional sample customer to practise on. */
export function Onboarding({ done }: { done: (openPartyId?: string) => void }) {
  const { user, profile, saveProfile, saveParty, saveTxn } = useStore()
  const { t } = useI18n()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // Google sign-in (F27) has no shop name yet; reminders need one.
  const [needShop] = useState(() => !profile.business_name)
  const [shop, setShop] = useState('')

  async function next() {
    if (step === 0 && needShop) {
      if (!shop.trim()) return setErr(t('Enter your shop name'))
      setBusy(true); setErr('')
      try { await saveProfile({ ...profile, business_name: shop.trim() }) }
      catch (x) { setErr(t('Could not save: {e}. Try again.', { e: (x as Error).message })); setBusy(false); return }
      setBusy(false)
    }
    setStep(step + 1)
  }

  const finish = () => { markOnboarded(user!.id); done() }
  async function sample() {
    setBusy(true); setErr('')
    try {
      // Sample entries are not the owner's own, so they stay out of the usage metrics (F22).
      const p = await saveParty({ name: t('Sharma ji (sample)'), phone: '', note: t('Sample customer. Delete it any time from Edit.'), type: 'customer', due_date: null })
      await saveTxn({ party_id: p.id, type: 'gave', amount: 100000, note: t('Oil, sugar'), txn_date: daysAgo(2) }, { track: false })
      await saveTxn({ party_id: p.id, type: 'got', amount: 30000, note: 'UPI', txn_date: daysAgo(1) }, { track: false })
      markOnboarded(user!.id)
      done(p.id)
    } catch (x) {
      setErr(t('Could not save: {e}. Try again.', { e: (x as Error).message }))
      setBusy(false)
    }
  }

  const steps = [
    {
      title: t('Add the people who owe you'),
      body: t('Save each customer once, with a phone number for WhatsApp. Suppliers go in their own tab.'),
      art: (
        <div className="card p-4 flex items-center gap-3">
          <Avatar name="Sharma ji" />
          <div className="flex-1"><div className="font-medium">Sharma ji</div><div className="text-xs text-muted">98765 43210</div></div>
          <Balance paise={70000} />
        </div>
      ),
    },
    {
      title: t('Tap “You gave ₹” when you give credit'),
      body: t('Tap “You got ₹” when they pay. Type the amount, save, and the balance updates by itself.'),
      art: (
        <div className="grid grid-cols-2 gap-2">
          <span className="btn btn-primary btn-lg">{t('You gave ₹')}</span>
          <span className="btn btn-secondary btn-lg">{t('You got ₹')}</span>
        </div>
      ),
    },
    {
      title: t('Tap Remind to ask on WhatsApp'),
      body: t('The message carries the amount due and your UPI link. Add your UPI ID in Settings.'),
      art: (
        <div className="rounded-[20px_20px_20px_6px] bg-surface text-fg border border-line p-4 text-sm leading-relaxed">
          Namaste Sharma ji, ₹700 is pending. <span className="underline text-link">Pay on UPI</span>
        </div>
      ),
    },
  ]
  const s = steps[step]
  const last = step === steps.length - 1

  return (
    <main className="mx-auto max-w-md min-h-screen px-5 pt-5 pb-8 flex flex-col">
      <div className="flex items-center justify-between">
        {needShop && step === 0 ? <span /> : <button className="btn px-3 -ml-3 text-muted" onClick={finish}>{t('Skip')}</button>}
        <LangToggle />
      </div>
      {needShop && step === 0 && (
        <div className="mt-6">
          <label className="label" htmlFor="shop">{t('Your shop name (shown in reminders)')}</label>
          <input id="shop" className="field" value={shop} onChange={(e) => { setShop(e.target.value); setErr('') }} placeholder="Sharma General Store" autoComplete="organization" />
        </div>
      )}
      <p className="font-mono text-xs text-muted mt-8">{t('Step {n} of {m}', { n: step + 1, m: steps.length })}</p>
      <h1 className="text-[30px] leading-tight font-semibold mt-2">{s.title}</h1>
      <p className="text-muted mt-3">{s.body}</p>
      <div className="mt-8 rounded-[28px] bg-lime p-5" aria-hidden="true">{s.art}</div>

      <div className="mt-6 flex justify-center gap-2" aria-hidden="true">
        {steps.map((_, i) => <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-fg' : 'w-2 bg-muted/40'}`} />)}
      </div>

      <div className="mt-auto pt-8 space-y-3">
        {err && <p className="text-due text-sm" role="alert">{err}</p>}
        {!last ? (
          <div className="flex gap-3">
            {step > 0 && <button className="btn btn-secondary btn-lg flex-1" onClick={() => setStep(step - 1)}>{t('Back')}</button>}
            <button className="btn btn-primary btn-lg flex-[2]" onClick={next} disabled={busy}>{t('Next')}</button>
          </div>
        ) : (
          <>
            <button className="btn btn-accent btn-lg w-full" onClick={sample} disabled={busy}>{busy ? t('Please wait…') : t('Try it with a sample customer')}</button>
            <button className="btn btn-secondary btn-lg w-full" onClick={finish} disabled={busy}>{t('Start with my own customers')}</button>
          </>
        )}
      </div>
    </main>
  )
}
