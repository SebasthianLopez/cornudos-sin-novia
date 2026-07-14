export type Tab = 'ranking' | 'salidas' | 'vivo' | 'perfil'

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'ranking', label: 'Ranking', icon: '🏆' },
  { id: 'salidas', label: 'Salidas', icon: '🌙' },
  { id: 'vivo', label: 'En vivo', icon: '⚡' },
  { id: 'perfil', label: 'Perfil', icon: '👤' },
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
              <span
                className={`text-xl transition ${active ? 'scale-110' : 'grayscale opacity-60'}`}
              >
                {it.icon}
              </span>
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
