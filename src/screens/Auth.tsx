import { useState } from 'react'
import { useStore } from '../lib/store'
import { useI18n, LangToggle } from '../lib/i18n'

export function Auth({ startNew = true, back }: { startNew?: boolean; back?: () => void }) {
  const { signIn, signUp, mode } = useStore()
  const { t } = useI18n()
  const [isNew, setIsNew] = useState(startNew)
  const [business, setBusiness] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      if (isNew) await signUp(email.trim(), pw, business.trim())
      else await signIn(email.trim(), pw)
    } catch (x) { setErr((x as Error).message) }
    setBusy(false)
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-6 pb-10">
      <div className={`flex items-center mb-8 ${back ? 'justify-between' : 'justify-end'}`}>
        {back && <button className="btn min-w-[44px] px-2 -ml-2" onClick={back} aria-label={t('Back')}>←</button>}
        <LangToggle />
      </div>
      <h1 className="text-[34px] leading-tight font-semibold">
        {t('Your khata,')} <span className="font-serif italic font-normal">{t('faster')}</span> {t('than a notebook.')}
      </h1>
      <p className="text-muted mt-3">{t('Record udhaar in seconds, remind on WhatsApp. No ads, nothing to install.')}</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {isNew && (
          <div>
            <label className="label" htmlFor="biz">{t('Business name')}</label>
            <input id="biz" className="field" value={business} onChange={(e) => setBusiness(e.target.value)} required placeholder="Sharma General Store" autoComplete="organization" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">{t('Email')}</label>
          <input id="email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" />
        </div>
        <div>
          <label className="label" htmlFor="pw">{t('Password')}</label>
          <input id="pw" type="password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} autoComplete={isNew ? 'new-password' : 'current-password'} />
        </div>
        {err && <p className="text-due text-sm" role="alert">{err}</p>}
        <button className="btn btn-accent btn-lg w-full" disabled={busy}>{busy ? t('Please wait…') : isNew ? t('Create account') : t('Log in')}</button>
      </form>
      <button className="mt-4 w-full text-sm text-muted underline min-h-[44px]" onClick={() => { setIsNew(!isNew); setErr('') }}>
        {isNew ? t('Already have an account? Log in') : t('New here? Create an account')}
      </button>
      {mode === 'local' && (
        <p className="mt-8 text-xs text-muted">{t('Demo mode: data is saved only in this browser. Connect Supabase (see README) to sync across devices.')}</p>
      )}
      <p className="mt-4 text-xs text-muted">{t('We store only names, phone numbers and amounts. No ads, no trackers.')}</p>
    </main>
  )
}
