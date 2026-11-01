import { useState } from 'react'
import { useStore } from '../lib/store'
import { useI18n, LangToggle } from '../lib/i18n'
import { useTheme } from '../lib/theme'

export function Settings({ back }: { back: () => void }) {
  const { profile, saveProfile, signOut, user, mode } = useStore()
  const { t } = useI18n()
  const { pref, setPref } = useTheme()
  const [p, setP] = useState(profile)
  const [msg, setMsg] = useState('')
  const set = (k: keyof typeof p) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.value })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const upi = p.upi_id.trim()
    if (upi && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi)) return setMsg(t('UPI ID looks wrong. It should look like name@bank.'))
    try { await saveProfile({ ...p, upi_id: upi, business_name: p.business_name.trim() }); setMsg(t('Saved')) }
    catch (x) { setMsg(t('Could not save: {e}', { e: (x as Error).message })) }
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-10">
      <header className="flex items-center gap-2 -mx-2 py-3">
        <button className="btn min-w-[44px] px-2" onClick={back} aria-label={t('Back')}>←</button>
        <h1 className="text-xl font-semibold">{t('Settings')}</h1>
      </header>
      <form onSubmit={save} className="space-y-4">
        <div><label className="label" htmlFor="b">{t('Business name (shown in reminders)')}</label><input id="b" className="field" value={p.business_name} onChange={set('business_name')} /></div>
        <div><label className="label" htmlFor="n">{t('Your name')}</label><input id="n" className="field" value={p.name} onChange={set('name')} /></div>
        <div><label className="label" htmlFor="ph">{t('Your phone')}</label><input id="ph" className="field" inputMode="tel" value={p.phone} onChange={set('phone')} /></div>
        <div><label className="label" htmlFor="u">{t('UPI ID (added to reminders)')}</label><input id="u" className="field" value={p.upi_id} onChange={set('upi_id')} placeholder="shop@okbank" autoCapitalize="none" /></div>
        {msg && <p className={`text-sm ${msg === t('Saved') ? 'text-paid' : 'text-due'}`} role="status">{msg}</p>}
        <div><span className="label">{t('Language')}</span><LangToggle /></div>
        <div>
          <span className="label" id="theme-label">{t('Theme')}</span>
          <div className="inline-flex rounded-full border border-line bg-surface p-1" role="group" aria-labelledby="theme-label">
            {(['system', 'light', 'dark'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={pref === k} onClick={() => setPref(k)} className={`rounded-full px-4 min-h-[40px] text-sm ${pref === k ? 'bg-ink text-white' : ''}`}>
                {t(k === 'system' ? 'Same as phone' : k === 'light' ? 'Light' : 'Dark')}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-accent btn-lg w-full">{t('Save')}</button>
      </form>
      <div className="mt-8 border-t border-line pt-5 text-sm text-muted">
        <p>{t('Signed in as {e}', { e: user?.email ?? '' })}{mode === 'local' ? t(' (demo mode, this browser only)') : ''}</p>
        <button className="btn btn-secondary mt-3" onClick={signOut}>{t('Log out')}</button>
        <p className="mt-6 text-xs">{t('Privacy: we store only names, phone numbers and amounts. No ads, no third-party trackers.')}</p>
      </div>
    </main>
  )
}
