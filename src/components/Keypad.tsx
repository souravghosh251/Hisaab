const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫']

export function Keypad({ value, onChange, max }: { value: string; onChange: (v: string) => void; max: number }) {
  const press = (k: string) => {
    if (k === '⌫') return onChange(value.slice(0, -1))
    const next = (value + k).replace(/^0+/, '')
    if (next === '') return onChange('')
    if (Number(next) > max) return
    onChange(next)
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          aria-label={k === '⌫' ? 'Delete' : k}
          className="h-14 rounded-2xl bg-surface border border-line font-mono text-xl active:bg-lime active:text-[#0E0E0E]"
        >
          {k}
        </button>
      ))}
    </div>
  )
}
