import { useEffect, useState } from 'react'
import { StoreProvider, useStore } from './lib/store'
import { I18nProvider, useI18n } from './lib/i18n'
import { ThemeProvider } from './lib/theme'
import { useToast } from './components/ui'
import { Auth, SetPassword } from './screens/Auth'
import { Home } from './screens/Home'
import { Ledger } from './screens/Ledger'
import { Settings } from './screens/Settings'
import { Landing } from './screens/Landing'
import { Onboarding, isOnboarded } from './screens/Onboarding'

const parse = () => location.hash.replace(/^#\/?/, '')
function useRoute() {
  const [r, setR] = useState(parse())
  useEffect(() => {
    const f = () => setR(parse())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return { r, go: (p: string) => { location.hash = '/' + p } }
}

// Installed (Add to Home Screen) users skip the marketing page.
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

function Shell() {
  const { user, ready, parties, recovery } = useStore()
  const { r, go } = useRoute()
  const { show, el } = useToast()
  const { t } = useI18n()
  const [, rerender] = useState(0)
  useEffect(() => { if (user && (r === 'login' || r === 'signup')) go('') }, [user, r])
  if (!ready) return <div className="p-10 text-center text-muted">{t('Loading…')}</div>
  if (!user) {
    if (r === 'login' || r === 'signup' || standalone()) {
      return <Auth key={r} startNew={r !== 'login'} back={standalone() ? undefined : () => go('')} />
    }
    return <Landing start={() => go('signup')} login={() => go('login')} />
  }
  if (recovery) return <><SetPassword done={() => show(t('Password updated'))} />{el}</>
  if (parties.length === 0 && !isOnboarded(user.id)) {
    return <Onboarding done={(id) => { if (id) go('p/' + id); rerender((n) => n + 1) }} />
  }
  return (
    <>
      {r === 'settings' ? <Settings back={() => go('')} />
        : r.startsWith('p/') ? <Ledger id={r.slice(2)} back={() => go('')} goSettings={() => go('settings')} toast={show} />
        : <Home open={(id) => go('p/' + id)} goSettings={() => go('settings')} toast={show} />}
      {el}
    </>
  )
}

export const App = () => (
  <ThemeProvider>
    <I18nProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </I18nProvider>
  </ThemeProvider>
)
