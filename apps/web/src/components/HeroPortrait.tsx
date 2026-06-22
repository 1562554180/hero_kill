import type { BattleHero } from '@hero-legend/shared-types'

interface Props {
  hero: BattleHero
  size?: number
}

type Archetype = 'emperor' | 'female' | 'scholar' | 'assassin' | 'berserker' | 'warrior'

const FACTION_THEME: Record<string, { bg1: string; bg2: string; label: string; accent: string }> = {
  '君': { bg1: '#8b1a1a', bg2: '#2a0808', label: '君', accent: '#c62828' },
  '臣': { bg1: '#0d47a1', bg2: '#001f3f', label: '臣', accent: '#1565c0' },
  '民': { bg1: '#2e7d32', bg2: '#0d2818', label: '民', accent: '#43a047' },
}

// 每个英雄分配一个 archetype — 用于决定头像装饰
const HERO_ARCHETYPE: Record<string, Archetype> = {
  // 帝王/君主: 戴冕
  'ying-zheng': 'emperor', 'liu-bang': 'emperor', 'zhao-kuang-yin': 'emperor',
  'xiang-yu': 'emperor', 'li-shi-min': 'emperor', 'cao-cao': 'emperor',
  'zhu-yuan-zhang': 'emperor', 'mu-rong': 'emperor',
  // 女将: 戴花
  'wu-ze-tian': 'female', 'lv-zhi': 'female', 'yu-ji': 'female',
  'li-shi-shi': 'female', 'xiao-qiao': 'female',
  // 谋士: 持卷
  'zhuge-liang': 'scholar', 'shang-yang': 'scholar', 'song-jiang': 'scholar',
  'gou-jian': 'scholar', 'li-yu': 'scholar',
  // 刺客: 蒙面
  'jing-ke': 'assassin',
  // 猛男: 持斧
  'li-kui': 'berserker', 'cheng-yao-jin': 'berserker',
  // 其余武将 (持剑)
}

function getArchetype(heroId: string): Archetype {
  return HERO_ARCHETYPE[heroId] ?? 'warrior'
}

// archetype 装饰 (在头像内绘制)
function ArchetypeDecor({ archetype }: { archetype: Archetype }) {
  switch (archetype) {
    case 'emperor':
      return (
        <g>
          {/* 冕旒 冠 */}
          <path d="M 28 22 L 35 14 L 42 20 L 50 10 L 58 20 L 65 14 L 72 22 L 72 28 L 28 28 Z"
                fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.5" />
          <circle cx="35" cy="18" r="1.3" fill="#c62828" />
          <circle cx="50" cy="14" r="1.8" fill="#1565c0" />
          <circle cx="65" cy="18" r="1.3" fill="#2e7d32" />
          {/* 冕旒 珠串 */}
          {[0,1,2,3,4,5,6].map(i => (
            <circle key={i} cx={30 + i*7} cy="31" r="0.8" fill="#ffd54f" />
          ))}
        </g>
      )
    case 'female':
      return (
        <g>
          {/* 头饰花 */}
          <circle cx="76" cy="20" r="3" fill="#e91e63" opacity="0.9" />
          <circle cx="76" cy="20" r="1.3" fill="#fce4ec" />
          <circle cx="22" cy="20" r="2.2" fill="#f48fb1" opacity="0.85" />
          {/* 流苏 */}
          <line x1="76" y1="23" x2="76" y2="34" stroke="#e91e63" strokeWidth="0.7" />
        </g>
      )
    case 'scholar':
      return (
        <g>
          {/* 纶巾 */}
          <ellipse cx="50" cy="14" rx="14" ry="5" fill="#37474f" />
          <path d="M 36 14 Q 50 18 64 14" stroke="#263238" strokeWidth="0.5" fill="none" />
          {/* 帛带 */}
          <path d="M 36 14 Q 28 22 26 30" stroke="#37474f" strokeWidth="1.5" fill="none" />
          {/* 卷轴 */}
          <rect x="68" y="58" width="14" height="6" rx="3" fill="#f4e4bc" stroke="#8b6914" strokeWidth="0.5" />
          <line x1="70" y1="60" x2="80" y2="60" stroke="#5d4037" strokeWidth="0.3" />
        </g>
      )
    case 'assassin':
      return (
        <g>
          {/* 黑罩 */}
          <path d="M 22 14 Q 50 6 78 14 L 78 38 Q 50 30 22 38 Z"
                fill="rgba(0,0,0,0.85)" />
          {/* 匕首 */}
          <line x1="80" y1="50" x2="92" y2="62" stroke="#bdbdbd" strokeWidth="1.5" />
          <polygon points="92,62 96,66 94,68 88,64" fill="#c62828" />
          <rect x="78" y="48" width="3" height="3" fill="#5d4037" />
        </g>
      )
    case 'berserker':
      return (
        <g>
          {/* 斧 */}
          <line x1="22" y1="22" x2="22" y2="62" stroke="#5d4037" strokeWidth="2.5" />
          <path d="M 14 24 L 30 24 L 30 38 L 14 38 Z" fill="#9e9e9e" stroke="#212121" strokeWidth="0.5" />
          <path d="M 16 28 L 28 28" stroke="#212121" strokeWidth="0.5" />
        </g>
      )
    case 'warrior':
    default:
      return (
        <g>
          {/* 剑 (右侧) */}
          <line x1="82" y1="22" x2="82" y2="68" stroke="#e0e0e0" strokeWidth="2.5" />
          <rect x="76" y="32" width="12" height="3" fill="#5d4037" />
          <rect x="80" y="65" width="4" height="3" fill="#5d4037" />
        </g>
      )
  }
}

export function HeroPortrait({ hero, size = 100 }: Props) {
  const faction = hero.hero.faction
  const theme = FACTION_THEME[faction] ?? FACTION_THEME['民']
  const archetype = getArchetype(hero.hero.id)
  const starLevel = hero.instance.starLevel ?? 1
  const initial = hero.hero.name.charAt(0)
  const gid = `bg-${hero.hero.id}`

  return (
    <svg width={size} height={size} viewBox="0 0 100 100"
         style={{ display: 'block', borderRadius: '6px', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${gid}-vert`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.bg1} />
          <stop offset="100%" stopColor={theme.bg2} />
        </linearGradient>
        <radialGradient id={`${gid}-vignette`} cx="50%" cy="40%" r="60%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
        </radialGradient>
        <linearGradient id="gold-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd54f" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>

      {/* 背景渐变 */}
      <rect width="100" height="100" fill={`url(#${gid}-vert)`} rx="6" />
      {/* 暗角 */}
      <rect width="100" height="100" fill={`url(#${gid}-vignette)`} rx="6" />

      {/* 装饰花纹 (背景纹理) */}
      <g opacity="0.08" stroke="#ffd54f" strokeWidth="0.5" fill="none">
        <path d="M 10 10 Q 25 15 30 30" />
        <path d="M 90 10 Q 75 15 70 30" />
        <path d="M 10 90 Q 25 85 30 70" />
        <path d="M 90 90 Q 75 85 70 70" />
      </g>

      {/* 金色双层边框 */}
      <rect x="2" y="2" width="96" height="96" fill="none"
            stroke="url(#gold-grad)" strokeWidth="1.8" rx="5" />
      <rect x="5" y="5" width="90" height="90" fill="none"
            stroke="rgba(212,175,55,0.4)" strokeWidth="0.5" rx="3"
            strokeDasharray="2,1" />

      {/* archetype 装饰 */}
      <ArchetypeDecor archetype={archetype} />

      {/* 势力标签 (顶部) */}
      <rect x="36" y="6" width="28" height="10" fill="rgba(0,0,0,0.55)" rx="2" />
      <text x="50" y="14" fontSize="8" fill="#ffd54f" textAnchor="middle"
            fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold"
            style={{ letterSpacing: '2px' }}>
        {theme.label}
      </text>

      {/* 主角大字 (人物名首字) */}
      <text x="50" y="68" fontSize="50" fill="white" textAnchor="middle"
            fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
            }}>
        {initial}
      </text>

      {/* 底部名字条 */}
      <rect x="6" y="76" width="88" height="14" fill="rgba(0,0,0,0.6)" rx="2" />
      <text x="50" y="86" fontSize="10" fill="#ffd54f" textAnchor="middle"
            fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold">
        {hero.hero.name}
      </text>

      {/* 星级 (左下角装饰) */}
      <g>
        {Array.from({ length: starLevel }).map((_, i) => (
          <text key={i} x={6 + i*4} y="74" fontSize="5" fill="#ffd54f"
                textAnchor="middle">★</text>
        ))}
      </g>
    </svg>
  )
}