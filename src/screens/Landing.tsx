import type { ReactNode } from 'react'
import { useI18n, LangToggle } from '../lib/i18n'
import { ThemeButton } from '../lib/theme'

const Em = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`font-serif italic font-normal tracking-[-0.02em] ${className}`}>{children}</span>
)

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" /></svg>
)

const wrap = 'mx-auto w-full max-w-[1240px] px-6'
const h2 = 'text-[clamp(40px,5.5vw,76px)] leading-[0.98] tracking-[-0.045em] font-semibold'

/** Public page for logged-out visitors. Copy and layout follow the design canvas (Option 2). */
export function Landing({ start, login }: { start: () => void; login: () => void }) {
  const { t } = useI18n()
  const niches = [t('Kirana stores'), t('Tuition teachers'), t('Milk delivery'), t('PG & mess owners'), t('Newspaper rounds')]
  const who: [string, string][] = [
    ['Kirana stores', 'Forty families, settled at month-end'],
    ['Tuition teachers', 'Whose fee is pending, at a glance'],
    ['Milk & paper delivery', 'Daily drops, one monthly total'],
    ['PGs & mess owners', 'Rent and meal dues in one list'],
  ]
  const faq: [string, string][] = [
    ['Does my customer need the app?', 'No. They get a WhatsApp message with the amount and a UPI link, and pay from any UPI app they already use.'],
    ['What if I lose my phone?', 'Your khata is saved online. Log in on any phone or laptop and every entry is there.'],
    ['Do I have to download anything?', 'No. Open the link in your browser and add it to your home screen if you like.'],
    ['How much does it cost?', 'Nothing. Hisaab is free during the pilot.'],
    ['What do you store about me?', 'Only names, phone numbers and amounts. No ads, no third-party trackers, and nobody else can see your khata.'],
  ]

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      <header className="px-6 pt-5">
        <nav aria-label="Main" className="mx-auto max-w-[1240px] flex items-center justify-between gap-2 bg-surface border border-line rounded-full py-2 pr-2 pl-5 sm:pl-6">
          <a href="#top" className="text-[22px] font-bold tracking-[-0.04em]">hisaab<span className="text-[#8DB800]">.</span></a>
          <div className="flex items-center gap-1 text-[15px] font-medium">
            <a href="#features" className="hidden sm:inline-flex px-4 py-3 rounded-full">{t('Features')}</a>
            <a href="#faq" className="hidden sm:inline-flex px-4 py-3 rounded-full">{t('FAQ')}</a>
            <ThemeButton label={t('Switch light / dark mode')} />
            <LangToggle />
            <button className="btn px-2 sm:px-4 whitespace-nowrap" onClick={login}>{t('Log in')}</button>
            <button className="btn btn-primary hidden sm:inline-flex" onClick={start}>{t('Start free')}</button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section id="top" className={`${wrap} pt-16 pb-16 flex flex-col gap-12`}>
        <div className="flex flex-col gap-6 items-start">
          <p className="inline-flex items-center gap-2.5 bg-surface border border-line rounded-full py-1.5 pl-1.5 pr-3.5 text-sm font-medium">
            <span className="bg-lime rounded-full px-2.5 py-0.5 font-semibold">{t('New')}</span>{t('Reminders now carry a UPI link')}
          </p>
          <h1 className="text-[clamp(56px,10vw,148px)] leading-[0.9] tracking-[-0.055em] font-semibold [text-wrap:balance]">
            {t('Udhaar,')} <Em>{t('finally')}</Em> {t('sorted.')}
          </h1>
        </div>

        <div className="grid gap-12 items-end grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))]">
          <div className="flex flex-col gap-7 pb-2">
            <p className="text-[21px] leading-normal text-muted max-w-[36ch]">{t('The khata app for shops that give credit to the same faces every week. Three taps to write it down. One tap to ask for it back, on WhatsApp.')}</p>
            <div className="flex flex-wrap gap-3 items-center">
              <button className="btn btn-primary min-h-[60px] px-7 text-[17px] font-semibold" onClick={start}>{t('Open your khata')} <Arrow /></button>
              <a href="#features" className="btn btn-secondary min-h-[60px] px-6 text-[17px]">{t('See how it works')}</a>
            </div>
            <p className="font-mono text-[13px] text-muted tracking-[0.02em]">{t('Opens from a link · No app to install · Hindi, Marathi & English')}</p>
          </div>

          {/* Product composition (illustrative) */}
          <div className="relative min-h-[540px] flex justify-center sm:justify-end sm:pr-10 items-end" aria-hidden="true">
            <div className="absolute inset-x-0 bottom-0 top-10 bg-lime rounded-[32px]" />
            <div className="relative w-[min(340px,86%)] bg-surface rounded-t-[28px] p-[22px] pb-[26px] shadow-[0_24px_60px_rgba(14,14,14,0.18)] flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-ink text-lime grid place-items-center font-semibold">SJ</div>
                <div className="flex flex-col"><span className="text-[17px] font-semibold">Sharma ji</span><span className="text-[13px] text-muted">Flat 4B · 3 {t('Entries').toLowerCase()}</span></div>
              </div>
              <div className="bg-bg rounded-[18px] p-4 flex justify-between items-end">
                <div className="flex flex-col gap-0.5"><span className="text-[13px] text-muted">{t("You'll get")}</span><span className="font-mono text-[34px] font-medium tracking-[-0.04em] text-due">₹830</span></div>
                <span className="text-xs text-muted">{t('since')} 30 Oct</span>
              </div>
              <div className="font-mono text-sm flex flex-col">
                <div className="flex justify-between py-2.5 border-b border-line"><span>Oil, sugar · 1 Nov</span><span className="text-due">+1,000</span></div>
                <div className="flex justify-between py-2.5 border-b border-line"><span>UPI · 31 Oct</span><span className="text-paid">−300</span></div>
                <div className="flex justify-between py-2.5"><span>Milk, bread · 30 Oct</span><span className="text-due">+130</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="btn btn-primary min-h-[48px] font-semibold">{t('You gave')}</span>
                <span className="btn btn-secondary min-h-[48px] font-semibold">{t('You got')}</span>
              </div>
            </div>
            <div className="absolute left-0 top-4 w-[230px] z-10 bg-surface rounded-[20px_20px_20px_6px] px-4 py-3.5 shadow-[0_12px_32px_rgba(14,14,14,0.14)] -rotate-[4deg] flex flex-col gap-1.5">
              <span className="font-mono text-[11px] text-paid tracking-[0.04em]">WHATSAPP · SENT</span>
              <span className="text-sm leading-[1.45]">Namaste Sharma ji, ₹830 is pending at Gupta Store. <span className="underline text-link">Pay on UPI</span></span>
            </div>
            <div className="absolute -right-1.5 top-0 h-[132px] w-[132px] rounded-full bg-ink grid place-items-center">
              <svg className="spin absolute inset-0" width="132" height="132" viewBox="0 0 200 200">
                <defs><path id="ring" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" /></defs>
                <text fill="#D4FF3A" style={{ fontFamily: '"Geist Mono", monospace', fontSize: 17, letterSpacing: 3 }}><textPath href="#ring">NO APP · NO ADS · NO LOANS · </textPath></text>
              </svg>
              <Em className="relative text-white text-[34px]">just</Em>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section aria-label={t('Who uses Hisaab')} className="bg-ink text-white py-[22px] overflow-hidden">
        <div className="marquee text-[30px] tracking-[-0.02em] whitespace-nowrap">
          {[0, 1].map((k) => niches.map((n) => (
            <span key={`${k}${n}`} className="flex gap-12" aria-hidden={k === 1 || undefined}><span>{n}</span><Em className="text-lime">✱</Em></span>
          )))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className={`${wrap} pt-28 pb-24 flex flex-col gap-12`}>
        <h2 className={`${h2} max-w-[15ch]`}>{t('Everything a khata needs.')} <Em className="text-muted">{t("Nothing it doesn't.")}</Em></h2>

        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))]">
          <article className="card rounded-[28px] p-8 flex flex-col gap-7 min-h-[340px]">
            <div className="flex flex-col gap-2.5">
              <h3 className="text-[30px] font-semibold">{t("Type it like you'd")} <Em>{t('say it')}</Em></h3>
              <p className="text-[17px] leading-normal text-muted max-w-[38ch]">{t('Hisaab finds the customer, reads the amount and saves the entry.')}</p>
            </div>
            <div className="mt-auto bg-bg rounded-[20px] p-[18px] flex flex-col gap-3.5" aria-hidden="true">
              <span className="font-mono text-xs text-muted tracking-[0.04em]">QUICK ENTRY</span>
              <div className="font-mono text-xl bg-surface rounded-[14px] px-4 py-3.5 outline outline-2 outline-fg">sharma 420 atta</div>
              <div className="flex flex-wrap gap-2 text-sm font-medium">
                <span className="bg-surface border border-line rounded-full px-3 py-1.5">Sharma ji</span>
                <span className="font-mono bg-ink text-lime rounded-full px-3 py-1.5">gave ₹420</span>
                <span className="bg-surface border border-line rounded-full px-3 py-1.5">atta</span>
              </div>
            </div>
          </article>
          <article className="bg-lime rounded-[28px] p-8 flex flex-col gap-7 min-h-[340px]">
            <div className="flex flex-col gap-2.5">
              <h3 className="text-[30px] font-semibold">{t('The app does')} <Em>{t('the asking')}</Em></h3>
              <p className="text-[17px] leading-normal text-[#2A2F10] max-w-[38ch]">{t('A polite WhatsApp reminder with the amount and a UPI link. Send to one customer, or everyone on the 1st.')}</p>
            </div>
            <div className="mt-auto bg-surface text-fg rounded-[20px_20px_20px_6px] p-[18px] flex flex-col gap-2 max-w-[380px]" aria-hidden="true">
              <p className="text-base leading-normal">Namaste Sharma ji, ₹830 is pending at Gupta General Store since 30 Oct. You can pay here:</p>
              <p className="font-mono text-[13px] text-link underline break-all">upi://pay?pa=gupta@upi&amp;am=830</p>
            </div>
          </article>
        </div>

        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          <article className="bg-ink text-white rounded-[28px] p-8 flex flex-col gap-6 min-h-[300px]">
            <h3 className="text-[26px] font-semibold">{t('Balances that')} <Em className="text-lime">{t('never')}</Em> {t('need a calculator')}</h3>
            <div className="mt-auto flex flex-col gap-1">
              <span className="text-sm text-[#B5B5AE]">{t("Total you'll get")}</span>
              <span className="font-mono text-[44px] tracking-[-0.05em]">₹38,420</span>
              <span className="font-mono text-[13px] text-[#B5B5AE]">{t('across 41 customers · example')}</span>
            </div>
          </article>
          <article className="card rounded-[28px] p-8 flex flex-col gap-6 min-h-[300px]">
            <h3 className="text-[26px] font-semibold">{t('Proof,')} <Em>{t('not')}</Em> {t('arguments')}</h3>
            <p className="text-base leading-normal text-muted">{t('Every entry is dated. Send a customer their full statement as a PDF.')}</p>
            <div className="mt-auto flex items-center gap-3 bg-bg rounded-2xl p-3.5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
              <div className="flex flex-col"><span className="text-sm font-semibold">Sharma-ji-Oct-Nov.pdf</span><span className="font-mono text-xs text-muted">3 entries · closing ₹830</span></div>
            </div>
          </article>
          <article className="card rounded-[28px] p-8 flex flex-col gap-6 min-h-[300px]">
            <h3 className="text-[26px] font-semibold">{t('A link,')} <Em>{t('not')}</Em> {t('a download')}</h3>
            <p className="text-base leading-normal text-muted">{t("Opens in any phone's browser. Add it to your home screen and it behaves like an app.")}</p>
            <div className="mt-auto flex items-center gap-2.5 bg-bg rounded-full px-4 py-3 font-mono text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              <span className="truncate">{location.host}</span>
            </div>
          </article>
        </div>
      </section>

      {/* Who it's for */}
      <section id="who" className={`${wrap} pb-28 grid gap-14 items-start grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))]`}>
        <h2 className={h2}>{t('Built for')} <Em>{t('regulars,')}</Em> {t('not strangers.')}</h2>
        <div className="flex flex-col border-t border-fg">
          {who.map(([a, b]) => (
            <div key={a} className="flex flex-wrap justify-between items-baseline gap-6 py-[22px] border-b border-line">
              <span className="text-[26px] font-semibold tracking-[-0.03em]">{t(a)}</span>
              <span className="text-base text-muted">{t(b)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Left out on purpose */}
      <section className="px-6 pb-28">
        <div className="mx-auto max-w-[1240px] card rounded-[36px] p-[clamp(32px,6vw,80px)] grid gap-12 items-center grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))]">
          <div className="flex flex-col gap-[18px]">
            <p className="font-mono text-[13px] tracking-[0.06em] text-muted">{t('ON PURPOSE')}</p>
            <h2 className="text-[clamp(36px,4.5vw,60px)] leading-none tracking-[-0.04em] font-semibold">{t('Other khata apps became')} <Em>{t('everything')}</Em> {t('apps.')}</h2>
            <p className="text-lg leading-normal text-muted max-w-[38ch]">{t('We kept one job: keep the udhaar straight and bring the money back.')}</p>
          </div>
          <div className="flex flex-col gap-1 text-[clamp(30px,3.6vw,48px)] font-semibold tracking-[-0.04em] leading-[1.15]">
            {['Loan offers', 'Ads in your ledger', "Stock you never asked for", 'A 40 MB download'].map((s) => (
              <span key={s} className="text-muted line-through decoration-[3px] decoration-due">{t(s)}</span>
            ))}
            <Em className="text-[1.25em] mt-2">{t('Just the khata.')}</Em>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={`${wrap} pb-28 grid gap-14 grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))]`}>
        <h2 className={h2}>{t('Good')} <Em>{t('questions')}</Em></h2>
        <div className="flex flex-col gap-2.5">
          {faq.map(([q, a]) => (
            <details key={q} className="faq card rounded-[22px] px-6 py-5">
              <summary className="flex justify-between items-center gap-4 text-[19px] font-semibold min-h-[44px]">{t(q)}<span className="plus text-[26px] font-normal transition" aria-hidden="true">+</span></summary>
              <p className="mt-2 mb-1 text-base leading-relaxed text-muted">{t(a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA + footer */}
      <section className="bg-ink text-white rounded-t-[40px] overflow-hidden">
        <div className={`${wrap} pt-28 pb-10 flex flex-col gap-10 items-start`}>
          <h2 className="text-[clamp(52px,8.5vw,128px)] leading-[0.9] tracking-[-0.055em] font-semibold max-w-[12ch]">{t('Close the khata')} <Em className="text-lime">{t('tonight.')}</Em></h2>
          <div className="flex flex-wrap gap-4 items-center">
            <button className="btn btn-accent min-h-[64px] px-8 text-lg font-semibold" onClick={start}>{t('Open your khata')} <Arrow /></button>
            <span className="text-[15px] text-[#B5B5AE]">{t('Works on any phone with a browser.')}</span>
          </div>
          <div className="w-full flex flex-wrap justify-between gap-4 pt-[72px] pb-5 border-b border-white/15 text-[15px] text-[#B5B5AE]">
            <div className="flex flex-wrap gap-6">
              <a href="#features">{t('Features')}</a>
              <a href="#faq">{t('FAQ')}</a>
              <button className="underline-offset-2 hover:underline" onClick={login}>{t('Log in')}</button>
            </div>
            <span>{t('An internship project · 2026')}</span>
          </div>
        </div>
        <p aria-hidden="true" className="-mb-[0.22em] text-center text-[clamp(120px,26vw,380px)] leading-none font-bold tracking-[-0.07em] text-white/[0.07]">hisaab<span className="text-lime">.</span></p>
      </section>
    </div>
  )
}
