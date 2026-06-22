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

// archetype 装饰 — 粗实 SVG 图形 (类似手牌图标, 醒目)
function ArchetypeDecor({ archetype }: { archetype: Archetype }) {
  switch (archetype) {
    case 'emperor':
      // 玉玺 (右上): 方形印 + 龙钮
      return (
        <g>
          <rect x="60" y="14" width="28" height="22" rx="2" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="1" />
          <rect x="64" y="18" width="20" height="14" fill="none" stroke="#5d4037" strokeWidth="0.8" />
          <text x="74" y="29" fontSize="9" fill="#5d4037" textAnchor="middle" fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold">受命</text>
          <text x="74" y="36" fontSize="6" fill="#5d4037" textAnchor="middle" fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold">于天</text>
          {/* 龙钮 */}
          <ellipse cx="74" cy="13" rx="6" ry="3" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.8" />
          <circle cx="71" cy="12" r="1" fill="#c62828" />
          <circle cx="77" cy="12" r="1" fill="#c62828" />
        </g>
      )
    case 'female':
      // 凤簪 (右上): 凤凰轮廓 + 花
      return (
        <g>
          {/* 簪杆 */}
          <line x1="76" y1="14" x2="76" y2="40" stroke="#ffd54f" strokeWidth="2.5" />
          {/* 凤凰头 */}
          <circle cx="76" cy="14" r="4" fill="#e91e63" stroke="#880e4f" strokeWidth="0.8" />
          {/* 凤冠 */}
          <path d="M 73 11 Q 76 8 79 11 L 79 13 L 73 13 Z" fill="#f48fb1" stroke="#880e4f" strokeWidth="0.5" />
          {/* 凤喙 */}
          <polygon points="76,18 80,18 76,20" fill="#ffd54f" />
          {/* 流苏坠 */}
          <circle cx="76" cy="42" r="2.5" fill="#c62828" />
          <line x1="76" y1="44" x2="76" y2="50" stroke="#c62828" strokeWidth="1" />
          <circle cx="76" cy="51" r="1" fill="#c62828" />
        </g>
      )
    case 'scholar':
      // 羽扇 (右下): 扇面 + 扇骨
      return (
        <g>
          {/* 扇柄 */}
          <line x1="86" y1="50" x2="86" y2="68" stroke="#5d4037" strokeWidth="1.8" />
          {/* 扇面 (扇形) */}
          <path d="M 86 50 L 70 56 Q 64 62 70 66 L 86 60 Z"
                fill="#f4e4bc" stroke="#8b6914" strokeWidth="1" />
          {/* 扇骨 */}
          <line x1="86" y1="50" x2="70" y2="56" stroke="#8b6914" strokeWidth="0.6" />
          <line x1="86" y1="55" x2="68" y2="60" stroke="#8b6914" strokeWidth="0.6" />
          <line x1="86" y1="60" x2="70" y2="66" stroke="#8b6914" strokeWidth="0.6" />
          {/* 扇坠 */}
          <line x1="86" y1="68" x2="86" y2="76" stroke="#c62828" strokeWidth="1.2" />
          <circle cx="86" cy="78" r="2" fill="#c62828" />
        </g>
      )
    case 'assassin':
      // 匕首 (右上): 刀刃 + 握柄
      return (
        <g>
          {/* 刀刃 (亮银, 菱形) */}
          <polygon points="62,16 84,32 78,38 58,22" fill="#e0e0e0" stroke="#212121" strokeWidth="0.8" />
          <polygon points="62,16 84,32 78,36 60,20" fill="#f5f5f5" />
          {/* 刀尖 */}
          <polygon points="84,32 90,38 86,40 80,36" fill="#9e9e9e" stroke="#212121" strokeWidth="0.6" />
          {/* 护手 */}
          <rect x="56" y="20" width="6" height="3" fill="#5d4037" transform="rotate(-45 59 21.5)" />
          {/* 握柄 */}
          <rect x="48" y="26" width="10" height="4" fill="#3e2723" transform="rotate(-45 53 28)" />
          {/* 柄尾 */}
          <circle cx="47" cy="29" r="1.8" fill="#c62828" />
        </g>
      )
    case 'berserker':
      // 战斧 (左上): 斧头 + 斧柄
      return (
        <g>
          {/* 斧头 (大铁块) */}
          <path d="M 12 18 L 32 14 L 36 30 L 30 42 L 12 38 Z"
                fill="#9e9e9e" stroke="#212121" strokeWidth="1" />
          {/* 斧刃高光 */}
          <path d="M 14 20 L 32 17 L 34 26 L 14 26 Z" fill="#bdbdbd" opacity="0.7" />
          {/* 斧刃刃边 */}
          <path d="M 12 18 L 8 28 L 12 38" fill="none" stroke="#f5f5f5" strokeWidth="1.5" />
          {/* 斧柄 (深棕) */}
          <rect x="22" y="14" width="4" height="48" fill="#5d4037" stroke="#3e2723" strokeWidth="0.5" transform="rotate(8 24 38)" />
          {/* 柄尾包铁 */}
          <rect x="20" y="60" width="8" height="3" fill="#212121" />
        </g>
      )
    case 'warrior':
    default:
      // 长剑 (右上): 剑身 + 护手 + 握柄
      return (
        <g>
          {/* 剑身 */}
          <polygon points="76,12 80,12 79,60 77,60" fill="#e0e0e0" stroke="#212121" strokeWidth="0.8" />
          {/* 剑刃高光 */}
          <line x1="78.5" y1="14" x2="77.5" y2="58" stroke="#ffffff" strokeWidth="0.5" />
          {/* 剑尖 */}
          <polygon points="76,12 80,12 78,8" fill="#bdbdbd" stroke="#212121" strokeWidth="0.5" />
          {/* 护手 */}
          <rect x="72" y="60" width="12" height="3" fill="#5d4037" />
          <rect x="72" y="60" width="12" height="3" fill="none" stroke="#3e2723" strokeWidth="0.5" />
          {/* 握柄 (缠绕) */}
          <rect x="76" y="63" width="4" height="10" fill="#3e2723" />
          <line x1="76" y1="65" x2="80" y2="65" stroke="#ffd54f" strokeWidth="0.5" />
          <line x1="76" y1="68" x2="80" y2="68" stroke="#ffd54f" strokeWidth="0.5" />
          <line x1="76" y1="71" x2="80" y2="71" stroke="#ffd54f" strokeWidth="0.5" />
          {/* 剑首 (圆球) */}
          <circle cx="78" cy="75" r="2.5" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.5" />
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