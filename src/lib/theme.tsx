import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'

// index.html runs the same logic inline before first paint, so there is no flash of the wrong theme.
const KEY = 'hisaab:theme'
const media = matchMedia('(prefers-color-scheme: dark)')

function stored(): ThemePref {
  try { const s = localStorage.getItem(KEY); if (s === 'light' || s === 'dark') return s } catch { /* private mode */ }
  return 'system'
}

function apply(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0E0E0D' : '#F6F6F3')
}

interface Theme { pref: ThemePref; dark: boolean; setPref: (p: ThemePref) => void }
const Ctx = createContext<Theme>({ pref: 'system', dark: false, setPref: () => {} })
export const useTheme = () => useContext(Ctx)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, set] = useState<ThemePref>(stored)
  const [systemDark, setSystemDark] = useState(media.matches)
  useEffect(() => {
    const f = () => setSystemDark(media.matches) // follow the phone when it switches (e.g. at sunset)
    media.addEventListener('change', f)
    return () => media.removeEventListener('change', f)
  }, [])
  const dark = pref === 'dark' || (pref === 'system' && systemDark)
  useEffect(() => { apply(dark) }, [dark])
  const setPref = (p: ThemePref) => {
    set(p)
    try { if (p === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, p) } catch { /* ignore */ }
  }
  return <Ctx.Provider value={{ pref, dark, setPref }}>{children}</Ctx.Provider>
}

/** Sun/moon button: flips to the opposite of what is showing now. Settings can set it back to "Same as phone". */
export function ThemeButton({ label }: { label: string }) {
  const { dark, setPref } = useTheme()
  return (
    <button type="button" className="btn btn-secondary !px-0 w-11 shrink-0" onClick={() => setPref(dark ? 'light' : 'dark')} aria-label={label} title={label}>
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  )
}
