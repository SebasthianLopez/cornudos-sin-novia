interface Props {
  icon: string
  label: string
  value: number
  onChange: (v: number) => void
  accent?: string
}

export default function StatCounter({ icon, label, value, onChange, accent = '#a855f7' }: Props) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-8 h-8 rounded-lg grid place-items-center text-xs font-bold shrink-0"
          style={{ background: `${accent}22`, color: accent }}
        >
          {icon}
        </span>
        <span className="text-sm text-gray-200 font-medium truncate">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 rounded-full bg-white/5 text-xl text-gray-300 grid place-items-center active:scale-90 transition disabled:opacity-30"
          disabled={value <= 0}
          aria-label={`menos ${label}`}
        >
          −
        </button>
        <span
          className="w-8 text-center text-lg font-bold tabular-nums"
          style={{ color: value > 0 ? accent : '#6b7280' }}
        >
          {value}
        </span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-9 h-9 rounded-full grid place-items-center text-xl text-white active:scale-90 transition"
          style={{ background: accent }}
          aria-label={`más ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}
