export type Tab = 'ranking' | 'salidas' | 'vivo' | 'perfil'

function Icon({ tab, active }: { tab: Tab; active: boolean }) {
  const stroke = active ? '#c084fc' : '#6b7280'
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (tab) {
    case 'ranking': // copa
      return (
        <svg {...common}>
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
          <path d="M7 6H4a1 1 0 0 0-1 1c0 2 1.5 3.5 4 3.8M17 6h3a1 1 0 0 1 1 1c0 2-1.5 3.5-4 3.8" />
        </svg>
      )
    case 'salidas': // luna
      return (
        <svg {...common}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )
    case 'vivo': // rayo
      return (
        <svg {...common}>
          <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5z" />
        </svg>
      )
    case 'perfil': // persona
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
      )
  }
}

const ITEMS: { id: Tab; label: string }[] = [
  { id: 'ranking', label: 'Ranking' },
  { id: 'salidas', label: 'Salidas' },
  { id: 'vivo', label: 'En vivo' },
  { id: 'perfil', label: 'Perfil' },
]

interface Props {
  tab: Tab
  onChange: (t: Tab) => void
}

export default function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="sticky bottom-0 z-30 glass border-t border-white/10 pb-safe">
      <div className="flex">
        {ITEMS.map((it) => {
          const active = tab === it.id
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 active:scale-95 transition"
            >
              <Icon tab={it.id} active={active} />
              <span
                className={`text-[11px] font-medium transition ${
                  active ? 'text-brand-300' : 'text-gray-500'
                }`}
              >
                {it.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
