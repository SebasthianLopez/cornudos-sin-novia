import type { Profile } from '../types'

interface Props {
  profile: Profile
  size?: number
  ring?: boolean
  className?: string
}

export default function Avatar({ profile, size = 44, ring = false, className = '' }: Props) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: size * 0.5,
    background: profile.avatar ? undefined : `linear-gradient(135deg, ${profile.color}, ${profile.color}88)`,
    boxShadow: ring ? `0 0 0 2px ${profile.color}` : undefined,
  }
  return (
    <div
      className={`shrink-0 grid place-items-center rounded-full overflow-hidden select-none ${className}`}
      style={style}
    >
      {profile.avatar ? (
        <img src={profile.avatar} alt={profile.displayName} className="w-full h-full object-cover" />
      ) : (
        <span aria-hidden>{profile.emoji}</span>
      )}
    </div>
  )
}
