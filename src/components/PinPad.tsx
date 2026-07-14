interface Props {
  value: string
  onChange: (v: string) => void
  length?: number
}

export default function PinPad({ value, onChange, length = 4 }: Props) {
  const press = (d: string) => {
    if (value.length < length) onChange(value + d)
  }
  const back = () => onChange(value.slice(0, -1))

  return (
    <div>
      <div className="flex justify-center gap-3 mb-6">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition ${
              i < value.length ? 'bg-brand-400 shadow-glow-sm' : 'bg-white/15'
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="h-16 rounded-2xl bg-white/5 text-2xl font-semibold text-white hover:bg-white/10 active:scale-95 transition"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => press('0')}
          className="h-16 rounded-2xl bg-white/5 text-2xl font-semibold text-white hover:bg-white/10 active:scale-95 transition"
        >
          0
        </button>
        <button
          onClick={back}
          className="h-16 rounded-2xl bg-white/5 text-xl text-gray-300 hover:bg-white/10 active:scale-95 transition"
          aria-label="Borrar"
        >
          ⌫
        </button>
      </div>
    </div>
  )
}
