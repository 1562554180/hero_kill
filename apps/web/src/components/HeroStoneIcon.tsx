import { useMemo } from 'react'
import { HERO_NAME_TO_ID as NAME_TO_ID } from '../heroPortraitNames'

const avatarModules = import.meta.glob('../images/avatars/*.jpg', { eager: true, import: 'default' }) as Record<string, string>
const HERO_AVATARS: Record<string, string> = {}
for (const [path, url] of Object.entries(avatarModules)) {
  const filename = path.replace('../images/avatars/', '').replace('.jpg', '')
  const heroId = NAME_TO_ID[filename]
  if (heroId) HERO_AVATARS[heroId] = url
}

const STONE_PALETTE: Record<number, { face: string; faceLight: string; faceDark: string; shadow: string; edge: string }> = {
  1: { face: '#9e9e9e', faceLight: '#e0e0e0', faceDark: '#616161', shadow: '#2b2b2b', edge: '#3a3a3a' },
  2: { face: '#66bb6a', faceLight: '#a5d6a7', faceDark: '#2e7d32', shadow: '#143a14', edge: '#1b5e20' },
  3: { face: '#42a5f5', faceLight: '#90caf9', faceDark: '#1565c0', shadow: '#0a2a52', edge: '#0d47a1' },
  4: { face: '#ab47bc', faceLight: '#ce93d8', faceDark: '#6a1b9a', shadow: '#2a0d3f', edge: '#4a148c' },
  5: { face: '#ffd54f', faceLight: '#fff59d', faceDark: '#f9a825', shadow: '#5a3d00', edge: '#bf6f00' },
}

export function HeroStoneIcon({ heroId, starLevel, size = 56 }: { heroId: string; starLevel: number; size?: number }) {
  const avatar = HERO_AVATARS[heroId]
  const palette = STONE_PALETTE[Math.min(starLevel, 5)] ?? STONE_PALETTE[1]
  const gid = useMemo(() => `stone-${heroId}-${starLevel}-${Math.random().toString(36).slice(2, 8)}`, [heroId, starLevel])
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${gid}-face`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.faceLight} />
          <stop offset="50%" stopColor={palette.face} />
          <stop offset="100%" stopColor={palette.faceDark} />
        </linearGradient>
        <linearGradient id={`${gid}-side`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={palette.faceDark} />
          <stop offset="100%" stopColor={palette.shadow} />
        </linearGradient>
        <radialGradient id={`${gid}-top`} cx="40%" cy="30%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <clipPath id={`${gid}-clip`}>
          <circle cx="50" cy="46" r="24" />
        </clipPath>
      </defs>
      <polygon
        points="50,6 78,12 92,38 92,62 78,86 22,86 8,62 8,38 22,12"
        fill={`url(#${gid}-face)`}
        stroke={palette.edge}
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      <g stroke={palette.edge} strokeWidth="0.6" opacity="0.5" fill="none">
        <line x1="50" y1="6" x2="50" y2="46" />
        <line x1="22" y1="12" x2="50" y2="46" />
        <line x1="78" y1="12" x2="50" y2="46" />
        <line x1="8" y1="38" x2="50" y2="46" />
        <line x1="92" y1="38" x2="50" y2="46" />
        <line x1="8" y1="62" x2="50" y2="46" />
        <line x1="92" y1="62" x2="50" y2="46" />
      </g>
      <polygon
        points="50,6 78,12 92,38 50,46 8,38 22,12"
        fill={`url(#${gid}-top)`}
        opacity="0.75"
      />
      {avatar ? (
        <>
          <image
            href={avatar}
            x="26" y="22" width="48" height="48"
            clipPath={`url(#${gid}-clip)`}
            preserveAspectRatio="xMidYMid slice"
          />
          <circle cx="50" cy="46" r="24" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
          <circle cx="50" cy="46" r="24" fill="none" stroke={palette.edge} strokeWidth="0.8" opacity="0.7" />
        </>
      ) : (
        <circle cx="50" cy="46" r="24" fill="rgba(0,0,0,0.35)" stroke={palette.edge} strokeWidth="1" />
      )}
    </svg>
  )
}
