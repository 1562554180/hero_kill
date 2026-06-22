import type { BattleHero } from '@hero-legend/shared-types'

interface Props {
  hero: BattleHero
  size?: number
}

type Archetype = 'emperor' | 'female' | 'scholar' | 'assassin' | 'berserker' | 'warrior'

const FACTION_THEME: Record<string, { bg1: string; bg2: string; label: string; accent: string; skin: string; cloth: string }> = {
  '君': { bg1: '#8b1a1a', bg2: '#2a0808', label: '君', accent: '#c62828', skin: '#f4c4a0', cloth: '#7a1a1a' },
  '臣': { bg1: '#0d47a1', bg2: '#001f3f', label: '臣', accent: '#1565c0', skin: '#f4c4a0', cloth: '#0d3a7a' },
  '民': { bg1: '#2e7d32', bg2: '#0d2818', label: '民', accent: '#43a047', skin: '#f4c4a0', cloth: '#1d5a1f' },
}

const HERO_ARCHETYPE: Record<string, Archetype> = {
  'ying-zheng': 'emperor', 'liu-bang': 'emperor', 'zhao-kuang-yin': 'emperor',
  'xiang-yu': 'emperor', 'li-shi-min': 'emperor', 'cao-cao': 'emperor',
  'zhu-yuan-zhang': 'emperor', 'mu-rong': 'emperor',
  'wu-ze-tian': 'female', 'lv-zhi': 'female', 'yu-ji': 'female',
  'li-shi-shi': 'female', 'xiao-qiao': 'female',
  'zhuge-liang': 'scholar', 'shang-yang': 'scholar', 'song-jiang': 'scholar',
  'gou-jian': 'scholar', 'li-yu': 'scholar',
  'jing-ke': 'assassin',
  'li-kui': 'berserker', 'cheng-yao-jin': 'berserker',
}

function getArchetype(heroId: string): Archetype {
  return HERO_ARCHETYPE[heroId] ?? 'warrior'
}

// 人物剪影: 头 + 肩 (faction 配色)
function CharacterSilhouette({ archetype, cloth, skin }: { archetype: Archetype; cloth: string; skin: string }) {
  const assassin = archetype === 'assassin'
  return (
    <g>
      {/* 肩/身 (梯形) */}
      <path d="M 18 92 L 22 70 Q 26 62 36 60 L 64 60 Q 74 62 78 70 L 82 92 Z"
            fill={cloth} stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
      {/* 衣领 (V 字) */}
      <path d="M 42 62 L 50 72 L 58 62 L 56 66 L 50 75 L 44 66 Z"
            fill="rgba(0,0,0,0.5)" />
      {/* 衣领金边 */}
      <path d="M 42 62 L 50 72 L 58 62" stroke="#ffd54f" strokeWidth="0.6" fill="none" />
      {/* 颈 */}
      <rect x="46" y="56" width="8" height="6" fill={skin} />
      {/* 头 (圆) */}
      <circle cx="50" cy="42" r="13" fill={skin} stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
      {/* 头发 (头顶) — 刺客全黑罩, 其他人露额头 */}
      {!assassin && (
        <path d="M 38 38 Q 40 30 50 28 Q 60 30 62 38 Q 60 34 50 33 Q 40 34 38 38 Z"
              fill="rgba(0,0,0,0.7)" />
      )}
      {/* 眼睛 (两点) */}
      {!assassin && (
        <>
          <ellipse cx="46" cy="42" rx="0.9" ry="1.2" fill="rgba(0,0,0,0.7)" />
          <ellipse cx="54" cy="42" rx="0.9" ry="1.2" fill="rgba(0,0,0,0.7)" />
        </>
      )}
      {/* 嘴 (微笑) */}
      {!assassin && (
        <path d="M 47 47 Q 50 49 53 47" stroke="rgba(0,0,0,0.6)" strokeWidth="0.6" fill="none" />
      )}
      {/* 鼻 (小竖线) */}
      {!assassin && (
        <line x1="50" y1="43" x2="50" y2="45" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
      )}
    </g>
  )
}

// archetype 装饰 — 粗实 SVG 图形 (类似手牌图标, 醒目)
function ArchetypeDecor({ archetype }: { archetype: Archetype }) {
  switch (archetype) {
    case 'emperor':
      // 帝王: 头戴冕旒冠 + 身前玉玺
      return (
        <g>
          {/* 冕旒冠底板 (横长方) */}
          <rect x="32" y="24" width="36" height="5" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.6" />
          {/* 冠顶 (锯齿) */}
          <path d="M 32 24 L 36 18 L 40 22 L 44 16 L 50 14 L 56 16 L 60 22 L 64 18 L 68 24 Z"
                fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.6" />
          {/* 冠顶红蓝绿玉 */}
          <circle cx="36" cy="20" r="1.2" fill="#c62828" />
          <circle cx="50" cy="16" r="1.5" fill="#1565c0" />
          <circle cx="64" cy="20" r="1.2" fill="#2e7d32" />
          {/* 冕旒珠串 (前后各 7 颗) */}
          {[0,1,2,3,4,5,6].map(i => (
            <circle key={`f${i}`} cx={34 + i*5} cy="30" r="0.9" fill="#ffd54f" stroke="#5d4037" strokeWidth="0.2" />
          ))}
          {[0,1,2,3,4,5,6].map(i => (
            <circle key={`b${i}`} cx={34 + i*5} cy="33" r="0.7" fill="#fff" opacity="0.5" />
          ))}
          {/* 身前玉玺 (右下) */}
          <rect x="72" y="70" width="20" height="16" rx="1.5" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.8" />
          <rect x="75" y="73" width="14" height="10" fill="none" stroke="#5d4037" strokeWidth="0.5" />
          <text x="82" y="80" fontSize="5" fill="#5d4037" textAnchor="middle" fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold">受命</text>
          <text x="82" y="84" fontSize="3.5" fill="#5d4037" textAnchor="middle" fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold">于天</text>
          {/* 玉玺龙钮 */}
          <ellipse cx="82" cy="69" rx="4" ry="2" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.5" />
        </g>
      )
    case 'female':
      // 女将: 凤簪斜插发髻 + 胸前绢花
      return (
        <g>
          {/* 凤簪 (斜插右上) */}
          <line x1="68" y1="32" x2="80" y2="20" stroke="#ffd54f" strokeWidth="1.5" />
          {/* 凤凰头 (大粉球) */}
          <circle cx="80" cy="20" r="4" fill="#e91e63" stroke="#880e4f" strokeWidth="0.6" />
          {/* 凤冠 */}
          <path d="M 77 17 Q 80 14 83 17 L 83 19 L 77 19 Z" fill="#f48fb1" stroke="#880e4f" strokeWidth="0.4" />
          {/* 凤喙 */}
          <polygon points="80,24 84,24 80,26" fill="#ffd54f" />
          {/* 凤眼 */}
          <circle cx="79" cy="19" r="0.6" fill="#212121" />
          {/* 流苏坠 (簪尾) */}
          <circle cx="68" cy="33" r="2" fill="#c62828" stroke="#7f0000" strokeWidth="0.3" />
          {/* 胸前绢花 (左下) */}
          <g transform="translate(28 75)">
            <circle r="4" fill="#f48fb1" stroke="#880e4f" strokeWidth="0.5" />
            {[0,1,2,3,4].map(i => (
              <ellipse key={i} cx={Math.cos(i * Math.PI * 2 / 5) * 3} cy={Math.sin(i * Math.PI * 2 / 5) * 3}
                       rx="1.5" ry="2" fill="#fce4ec" transform={`rotate(${i * 72})`} />
            ))}
            <circle r="1" fill="#ffd54f" />
          </g>
        </g>
      )
    case 'scholar':
      // 谋士: 头戴纶巾 + 手持羽扇
      return (
        <g>
          {/* 纶巾 (黑头巾包头) */}
          <path d="M 37 32 Q 50 26 63 32 L 63 38 Q 50 35 37 38 Z" fill="#37474f" stroke="#212121" strokeWidth="0.5" />
          <ellipse cx="50" cy="32" rx="13" ry="3" fill="#455a64" />
          {/* 帛带 (左飘带) */}
          <path d="M 38 34 Q 32 42 30 52" stroke="#37474f" strokeWidth="1.5" fill="none" />
          {/* 手持羽扇 (右下手) */}
          <g transform="translate(72 65)">
            {/* 扇柄 */}
            <line x1="0" y1="0" x2="0" y2="20" stroke="#5d4037" strokeWidth="1.5" />
            {/* 扇面 (扇形) */}
            <path d="M 0 0 L -14 4 Q -18 9 -14 14 L 0 8 Z"
                  fill="#f4e4bc" stroke="#8b6914" strokeWidth="0.8" />
            {/* 扇骨 */}
            <line x1="0" y1="0" x2="-14" y2="4" stroke="#8b6914" strokeWidth="0.5" />
            <line x1="0" y1="4" x2="-16" y2="8" stroke="#8b6914" strokeWidth="0.5" />
            <line x1="0" y1="8" x2="-14" y2="14" stroke="#8b6914" strokeWidth="0.5" />
            {/* 扇坠 */}
            <line x1="0" y1="20" x2="0" y2="26" stroke="#c62828" strokeWidth="1" />
            <circle cx="0" cy="28" r="1.8" fill="#c62828" />
          </g>
        </g>
      )
    case 'assassin':
      // 刺客: 蒙面 + 匕首
      return (
        <g>
          {/* 黑罩 (蒙住下半脸) */}
          <path d="M 38 42 Q 50 48 62 42 L 62 50 Q 50 54 38 50 Z" fill="rgba(0,0,0,0.85)" />
          {/* 露眼 */}
          <ellipse cx="46" cy="42" rx="1.2" ry="0.8" fill="rgba(255,255,255,0.9)" />
          <ellipse cx="54" cy="42" rx="1.2" ry="0.8" fill="rgba(255,255,255,0.9)" />
          <circle cx="46" cy="42" r="0.5" fill="#212121" />
          <circle cx="54" cy="42" r="0.5" fill="#212121" />
          {/* 兜帽 (包头) */}
          <path d="M 35 38 Q 50 28 65 38 L 65 50 Q 50 45 35 50 Z" fill="rgba(0,0,0,0.7)" stroke="rgba(0,0,0,0.9)" strokeWidth="0.5" />
          {/* 匕首 (右下手) */}
          <g transform="translate(70 68)">
            {/* 刀刃 */}
            <polygon points="0,0 16,12 12,16 -2,4" fill="#e0e0e0" stroke="#212121" strokeWidth="0.6" />
            <polygon points="0,0 16,12 12,14 -2,2" fill="#f5f5f5" />
            {/* 刀尖 */}
            <polygon points="16,12 22,18 18,20 12,16" fill="#9e9e9e" stroke="#212121" strokeWidth="0.4" />
            {/* 护手 */}
            <rect x="-5" y="2" width="5" height="3" fill="#5d4037" transform="rotate(-45 -2.5 3.5)" />
            {/* 握柄 */}
            <rect x="-12" y="8" width="8" height="3" fill="#3e2723" transform="rotate(-45 -8 9.5)" />
            {/* 柄尾 */}
            <circle cx="-13" cy="11" r="1.5" fill="#c62828" />
          </g>
        </g>
      )
    case 'berserker':
      // 猛男: 头盔 (兽皮) + 战斧
      return (
        <g>
          {/* 兽皮头盔 (头顶带毛) */}
          <path d="M 36 36 Q 50 28 64 36 L 64 44 L 36 44 Z" fill="#5d4037" stroke="#3e2723" strokeWidth="0.6" />
          {/* 头盔毛刺 */}
          {[0,1,2,3,4,5,6,7].map(i => (
            <line key={i} x1={37 + i*4} y1="30" x2={37 + i*4} y2="36" stroke="#3e2723" strokeWidth="0.8" />
          ))}
          {/* 头盔金边 */}
          <line x1="36" y1="44" x2="64" y2="44" stroke="#ffd54f" strokeWidth="0.8" />
          {/* 战斧 (左下手) */}
          <g transform="translate(20 70) rotate(-15)">
            {/* 斧头 */}
            <path d="M 0 -10 L 20 -14 L 24 0 L 18 12 L 0 8 Z"
                  fill="#9e9e9e" stroke="#212121" strokeWidth="0.8" />
            <path d="M 2 -8 L 20 -12 L 22 -4 L 2 -4 Z" fill="#bdbdbd" opacity="0.7" />
            {/* 斧刃刃边 */}
            <path d="M 0 -10 L -4 0 L 0 8" fill="none" stroke="#f5f5f5" strokeWidth="1.2" />
            {/* 斧柄 */}
            <rect x="9" y="-14" width="4" height="40" fill="#5d4037" stroke="#3e2723" strokeWidth="0.4" />
            {/* 柄尾包铁 */}
            <rect x="7" y="24" width="8" height="3" fill="#212121" />
          </g>
        </g>
      )
    case 'warrior':
    default:
      // 武将: 头盔 + 长剑
      return (
        <g>
          {/* 头盔 (圆顶) */}
          <path d="M 36 36 Q 50 28 64 36 L 64 44 L 36 44 Z" fill="#455a64" stroke="#212121" strokeWidth="0.6" />
          {/* 头盔面甲 (横线) */}
          <line x1="36" y1="40" x2="64" y2="40" stroke="#ffd54f" strokeWidth="0.8" />
          {/* 头盔红缨 (顶) */}
          <circle cx="50" cy="26" r="3" fill="#c62828" stroke="#7f0000" strokeWidth="0.5" />
          <line x1="50" y1="22" x2="50" y2="29" stroke="#7f0000" strokeWidth="0.6" />
          {/* 长剑 (右下手) */}
          <g transform="translate(70 70) rotate(15)">
            {/* 剑身 */}
            <polygon points="0,0 4,0 3,-30 1,-30" fill="#e0e0e0" stroke="#212121" strokeWidth="0.6" />
            <line x1="2" y1="-2" x2="2" y2="-28" stroke="#ffffff" strokeWidth="0.4" />
            {/* 剑尖 */}
            <polygon points="0,0 4,0 2,-34" fill="#bdbdbd" stroke="#212121" strokeWidth="0.4" />
            {/* 护手 */}
            <rect x="-3" y="0" width="10" height="2.5" fill="#5d4037" />
            <rect x="-3" y="0" width="10" height="2.5" fill="none" stroke="#3e2723" strokeWidth="0.3" />
            {/* 握柄 (缠绕) */}
            <rect x="0" y="2.5" width="4" height="9" fill="#3e2723" />
            <line x1="0" y1="4.5" x2="4" y2="4.5" stroke="#ffd54f" strokeWidth="0.4" />
            <line x1="0" y1="7" x2="4" y2="7" stroke="#ffd54f" strokeWidth="0.4" />
            <line x1="0" y1="9.5" x2="4" y2="9.5" stroke="#ffd54f" strokeWidth="0.4" />
            {/* 剑首 (圆球) */}
            <circle cx="2" cy="13" r="2" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.4" />
          </g>
        </g>
      )
  }
}

export function HeroPortrait({ hero, size = 100 }: Props) {
  const faction = hero.hero.faction
  const theme = FACTION_THEME[faction] ?? FACTION_THEME['民']
  const archetype = getArchetype(hero.hero.id)
  const starLevel = hero.instance.starLevel ?? 1
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
      <g opacity="0.1" stroke="#ffd54f" strokeWidth="0.5" fill="none">
        <path d="M 10 10 Q 25 15 30 30" />
        <path d="M 90 10 Q 75 15 70 30" />
        <path d="M 10 90 Q 25 85 30 70" />
        <path d="M 90 90 Q 75 85 70 70" />
      </g>

      {/* 人物剪影 (头 + 肩) */}
      <CharacterSilhouette archetype={archetype} cloth={theme.cloth} skin={theme.skin} />

      {/* archetype 装饰 (头饰 + 武器) */}
      <ArchetypeDecor archetype={archetype} />

      {/* 金色双层边框 */}
      <rect x="2" y="2" width="96" height="96" fill="none"
            stroke="url(#gold-grad)" strokeWidth="1.8" rx="5" />
      <rect x="5" y="5" width="90" height="90" fill="none"
            stroke="rgba(212,175,55,0.4)" strokeWidth="0.5" rx="3"
            strokeDasharray="2,1" />

      {/* 势力标签 (顶部) */}
      <rect x="36" y="4" width="28" height="9" fill="rgba(0,0,0,0.65)" rx="2" />
      <text x="50" y="11" fontSize="7" fill="#ffd54f" textAnchor="middle"
            fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold"
            style={{ letterSpacing: '1.5px' }}>
        {theme.label}
      </text>

      {/* 底部名字条 */}
      <rect x="6" y="83" width="88" height="12" fill="rgba(0,0,0,0.7)" rx="2" />
      <text x="50" y="91" fontSize="9" fill="#ffd54f" textAnchor="middle"
            fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold">
        {hero.hero.name}
      </text>

      {/* 星级 (左上角) */}
      <g>
        {Array.from({ length: starLevel }).map((_, i) => (
          <text key={i} x={6 + i*5} y="11" fontSize="6" fill="#ffd54f"
                textAnchor="middle">★</text>
        ))}
      </g>
    </svg>
  )
}
