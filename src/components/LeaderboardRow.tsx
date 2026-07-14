import Avatar from './Avatar'
import { formatPuntos } from '../lib/format'
import type { RankingRow } from '../types'

// oro / plata / bronce para el top 3
const MEDAL_COLORS = ['#fbbf24', '#cbd5e1', '#d97706']

interface Props {
  row: RankingRow
  rank: number
  isMe?: boolean
  onClick?: () => void
}

export default function LeaderboardRow({ row, rank, isMe, onClick }: Props) {
  const { profile, conteos, rechazos, mvps, puntosTotal } = row
  const breakdown: string[] = []
  if (conteos.cerveza) breakdown.push(`${conteos.cerveza} cerveza`)
  if (conteos.fernet) breakdown.push(`${conteos.fernet} fernet`)
  if (conteos.whisky) breakdown.push(`${conteos.whisky} whisky`)
  if (conteos.ron) breakdown.push(`${conteos.ron} ron`)
  if (rechazos) breakdown.push(`${rechazos} rechazos`)
  if (mvps) breakdown.push(`${mvps} MVP`)

  const medalColor = rank <= 3 ? MEDAL_COLORS[rank - 1] : null

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition active:scale-[0.99] ${
        isMe ? 'bg-brand-500/10 border border-brand-500/30' : 'hover:bg-white/5'
      }`}
    >
      <div className="w-7 shrink-0 grid place-items-center">
        {medalColor ? (
          <span
            className="w-7 h-7 rounded-full grid place-items-center text-sm font-bold text-ink-950"
            style={{ background: medalColor }}
          >
            {rank}
          </span>
        ) : (
          <span className="text-lg font-bold text-gray-500">{rank}</span>
        )}
      </div>
      <Avatar profile={profile} size={46} ring={rank <= 3} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white truncate">{profile.displayName}</span>
          {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/30 text-brand-200">vos</span>}
        </div>
        <p className="text-xs text-gray-500 truncate">{breakdown.join(' · ') || 'sin registros todavía'}</p>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-lg font-bold tabular-nums ${puntosTotal < 0 ? 'text-red-400' : 'text-white'}`}>
          {formatPuntos(puntosTotal)}
        </div>
        <div className="text-[10px] text-gray-500 -mt-0.5">pts</div>
      </div>
    </button>
  )
}
