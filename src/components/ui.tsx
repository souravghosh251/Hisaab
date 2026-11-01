import { useEffect, useState, type ReactNode } from 'react'
import { rupees } from '../lib/money'
import { useI18n } from '../lib/i18n'

export function Sheet({ title, onClose, children, dark }: { title: string; onClose: () => void; children: ReactNode; dark?: boolean }) {
  const { t } = useI18n()
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md max-h-[94vh] overflow-y-auto rounded-t-[28px] bg-bg" onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between px-5 py-4 ${dark ? 'bg-ink text-white' : ''}`}>
          <h2 className="text-xl font-semibold">{title}</h2>
          <button className={`btn min-h-[44px] px-3 ${dark ? 'text-white' : ''}`} onClick={onClose} aria-label={t('Close')}>✕</button>
        </div>
        <div className="px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  )
}

export function Avatar({ name }: { name: string }) {
  const i = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
  return <div className="h-11 w-11 shrink-0 rounded-full bg-ink text-lime grid place-items-center font-medium text-sm">{i || '?'}</div>
}

/** Amount with the words that explain the colour (never colour alone). */
export function Balance({ paise, big }: { paise: number; big?: boolean }) {
  const { t } = useI18n()
  const word = paise === 0 ? 'settled' : paise > 0 ? "you'll get" : "you'll give"
  const color = paise === 0 ? 'text-muted' : paise > 0 ? 'text-due' : 'text-paid'
  return (
    <div className={big ? '' : 'text-right'}>
      <div className={`font-mono ${color} ${big ? 'text-5xl tracking-tight' : 'text-[15px] font-medium'}`}>{rupees(paise)}</div>
      <div className={`${big ? 'text-sm mt-1' : 'text-xs'} text-muted`}>{t(word)}</div>
    </div>
  )
}

export function useToast() {
  const { t } = useI18n()
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])
  const el = toast && (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm" role="status">
      <div className="flex items-center justify-between gap-3 rounded-full bg-ink text-white pl-5 pr-2 py-2 shadow-lg">
        <span className="text-sm">{toast.msg}</span>
        {toast.undo && (
          <button className="btn btn-accent min-h-[36px] px-4 text-sm" onClick={() => { toast.undo!(); setToast(null) }}>{t('Undo')}</button>
        )}
      </div>
    </div>
  )
  return { show: (msg: string, undo?: () => void) => setToast({ msg, undo }), el }
}

export function Confirm({ title, body, confirmLabel, onConfirm, onCancel }: { title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useI18n()
  return (
    <Sheet title={title} onClose={onCancel}>
      <p className="text-muted mb-5">{body}</p>
      <div className="flex gap-3">
        <button className="btn btn-secondary flex-1" onClick={onCancel}>{t('Cancel')}</button>
        <button className="btn btn-primary flex-1" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Sheet>
  )
}
