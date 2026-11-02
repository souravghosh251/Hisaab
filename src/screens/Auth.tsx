import { useState } from 'react'
import { useStore } from '../lib/store'
import { useI18n, LangToggle } from '../lib/i18n'

type Mode = 'signup' | 'login' | 'forgot'

export function Auth({ startNew = true, back }: { startNew?: boolean; back?: () => void }) {
  const { signIn, signUp, signInWithGoogle, sendPasswordReset, mode: backendMode } = useStore()
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>(startNew ? 'signup' : 'login')
  const [business, setBusiness] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const cloud = backendMode === 'supabase'
  const go = (m: Mode) => { setMode(m); setErr(''); setInfo('') }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setInfo(''); setBusy(true)
    try {
      if (mode === 'signup') await signUp(email.trim(), pw, business.trim())
      else if (mode === 'login') await signIn(email.trim(), pw)
      else { await sendPasswordReset(email.trim()); setInfo(t('Check your email for a link to set a new password.')) }
    } catch (x) { setErr((x as Error).message) }
    setBusy(false)
  }

  async function google() {
    setErr(''); setBusy(true)
    try { await signInWithGoogle() } catch (x) { setErr((x as Error).message); setBusy(false) } // on success the page leaves
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-6 pb-10">
      <div className={`flex items-center mb-8 ${back ? 'justify-between' : 'justify-end'}`}>
        {back && <button className="btn min-w-[44px] px-2 -ml-2" onClick={back} aria-label={t('Back')}>←</button>}
        <LangToggle />
      </div>
      {mode === 'forgot' ? (
        <>
          <h1 className="text-[34px] leading-tight font-semibold">{t('Reset your password')}</h1>
          <p className="text-muted mt-3">{t('Enter the email you signed up with. We will send a link to set a new password.')}</p>
        </>
      ) : (
        <>
          <h1 className="text-[34px] leading-tight font-semibold">
            {t('Your khata,')} <span className="font-serif italic font-normal">{t('faster')}</span> {t('than a notebook.')}
          </h1>
          <p className="text-muted mt-3">{t('Record udhaar in seconds, remind on WhatsApp. No ads, nothing to install.')}</p>
        </>
      )}

      {cloud && mode !== 'forgot' && (
        <>
          <button type="button" className="btn btn-secondary btn-lg w-full mt-8" onClick={google} disabled={busy}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
            {t('Continue with Google')}
          </button>
          <div className="flex items-center gap-3 my-5 text-xs text-muted" aria-hidden="true"><span className="h-px flex-1 bg-line" />{t('or')}<span className="h-px flex-1 bg-line" /></div>
        </>
      )}

      <form onSubmit={submit} className={`${cloud && mode !== 'forgot' ? '' : 'mt-8'} space-y-4`}>
        {mode === 'signup' && (
          <div>
            <label className="label" htmlFor="biz">{t('Business name')}</label>
            <input id="biz" className="field" value={business} onChange={(e) => setBusiness(e.target.value)} required placeholder="Sharma General Store" autoComplete="organization" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">{t('Email')}</label>
          <input id="email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" />
        </div>
        {mode !== 'forgot' && (
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="pw">{t('Password')}</label>
              {mode === 'login' && cloud && <button type="button" className="text-[13px] text-muted underline min-h-[32px]" onClick={() => go('forgot')}>{t('Forgot password?')}</button>}
            </div>
            <input id="pw" type="password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </div>
        )}
        {err && <p className="text-due text-sm" role="alert">{err}</p>}
        {info && <p className="text-paid text-sm" role="status">{info}</p>}
        <button className="btn btn-accent btn-lg w-full" disabled={busy}>
          {busy ? t('Please wait…') : mode === 'signup' ? t('Create account') : mode === 'login' ? t('Log in') : t('Send reset link')}
        </button>
      </form>
      <button className="mt-4 w-full text-sm text-muted underline min-h-[44px]" onClick={() => go(mode === 'signup' ? 'login' : mode === 'login' ? 'signup' : 'login')}>
        {mode === 'signup' ? t('Already have an account? Log in') : mode === 'login' ? t('New here? Create an account') : t('Back to log in')}
      </button>
      {!cloud && (
        <p className="mt-8 text-xs text-muted">{t('Demo mode: data is saved only in this browser. Connect Supabase (see README) to sync across devices.')}</p>
      )}
      <p className="mt-4 text-xs text-muted">{t('We store only names, phone numbers and amounts. No ads, no trackers.')}</p>
    </main>
  )
}

/** Shown after following a password-reset email link (F27). */
export function SetPassword({ done }: { done: () => void }) {
  const { updatePassword } = useStore()
  const { t } = useI18n()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pw !== pw2) return setErr(t('The two passwords do not match.'))
    setErr(''); setBusy(true)
    try { await updatePassword(pw); done() } catch (x) { setErr((x as Error).message); setBusy(false) }
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-6 pb-10">
      <div className="flex justify-end mb-8"><LangToggle /></div>
      <h1 className="text-[34px] leading-tight font-semibold">{t('Set a new password')}</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div><label className="label" htmlFor="np">{t('New password')}</label><input id="np" type="password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} autoComplete="new-password" /></div>
        <div><label className="label" htmlFor="np2">{t('Type it again')}</label><input id="np2" type="password" className="field" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} autoComplete="new-password" /></div>
        {err && <p className="text-due text-sm" role="alert">{err}</p>}
        <button className="btn btn-accent btn-lg w-full" disabled={busy}>{busy ? t('Please wait…') : t('Save new password')}</button>
      </form>
    </main>
  )
}
