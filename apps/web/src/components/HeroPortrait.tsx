import type { BattleHero } from '@hero-legend/shared-types'

// 中文件名 → heroId 映射
const NAME_TO_ID: Record<string, string> = {
  '扁鹊': 'bian-que', '曹操': 'cao-cao', '陈胜': 'chen-sheng', '程咬金': 'cheng-yao-jin',
  '勾践': 'gou-jian', '关羽': 'guan-yu', '韩信': 'han-xin', '荆轲': 'jing-ke',
  '李逵': 'li-kui', '李世民': 'li-shi-min', '李师师': 'li-shi-shi', '李煜': 'li-yu',
  '刘邦': 'liu-bang', '吕雉': 'lv-zhi', '慕容': 'mu-rong', '秦琼': 'qin-qiong',
  '商鞅': 'shang-yang', '宋江': 'song-jiang', '澹台名': 'tan-tai-ming', '铁木真': 'tie-mu-zhen',
  '武松': 'wu-song', '武则天': 'wu-ze-tian', '项羽': 'xiang-yu', '小乔': 'xiao-qiao',
  '杨延昭': 'yang-yan-zhao', '嬴政': 'ying-zheng', '虞姬': 'yu-ji',
  '岳飞': 'yue-fei', '赵匡胤': 'zhao-kuang-yin', '朱元璋': 'zhu-yuan-zhang', '诸葛亮': 'zhuge-liang',
}

// 自动扫 images/ 下所有 PNG, 按文件名匹配 hero ID
const portraitModules = import.meta.glob('../images/*.png', { eager: true, import: 'default' }) as Record<string, string>
const HERO_PORTRAIT_IMAGES: Record<string, string> = {}
for (const [path, url] of Object.entries(portraitModules)) {
  const filename = path.replace('../images/', '').replace('.png', '')
  const heroId = NAME_TO_ID[filename]
  if (heroId) HERO_PORTRAIT_IMAGES[heroId] = url
}

interface Props {
  hero: BattleHero
  size?: number
  fill?: boolean
}

type Archetype = 'emperor' | 'female' | 'scholar' | 'assassin' | 'berserker' | 'warrior'

// 角色配色: 玩家=蓝, 友方AI=绿, 敌方AI=红 (与阵营无关)
const ROLE_THEME: Record<string, { bg1: string; bg2: string; accent: string; skin: string; cloth: string }> = {
  player: { bg1: '#0d47a1', bg2: '#001f3f', accent: '#1565c0', skin: '#f4c4a0', cloth: '#0d3a7a' },
  ally:   { bg1: '#2e7d32', bg2: '#0d2818', accent: '#43a047', skin: '#f4c4a0', cloth: '#1d5a1f' },
  enemy:  { bg1: '#8b1a1a', bg2: '#2a0808', accent: '#c62828', skin: '#f4c4a0', cloth: '#7a1a1a' },
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

// 每个英雄的独立道具 — 通过 heroId 区分, 让头像一眼能认出是谁
function HeroItem({ heroId }: { heroId: string }) {
  switch (heroId) {
    // ===== 君阵营 =====
    case 'ying-zheng':
      // 嬴政: 玉玺 (大金方印 + 龙钮 + 受命于天)
      return (
        <g transform="translate(70 68)">
          <rect x="0" y="0" width="22" height="14" rx="1" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.6" />
          <rect x="2" y="2" width="18" height="10" fill="none" stroke="#5d4037" strokeWidth="0.4" />
          <text x="11" y="9" fontSize="5" fill="#5d4037" textAnchor="middle" fontWeight="bold">受命</text>
          {/* 龙钮 (盘龙) */}
          <path d="M 4 -4 Q 8 -8 11 -4 Q 14 -8 18 -4 L 18 -2 L 4 -2 Z" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.5" />
          <circle cx="11" cy="-5" r="0.8" fill="#5d4037" />
        </g>
      )
    case 'liu-bang':
      // 刘邦: 赤霄剑 (剑身有红色光晕)
      return (
        <g transform="translate(70 68) rotate(15)">
          {/* 红光 */}
          <ellipse cx="2" cy="-15" rx="3" ry="22" fill="rgba(229,57,53,0.3)" />
          {/* 剑身 */}
          <polygon points="0,0 4,0 3,-32 1,-32" fill="#e0e0e0" stroke="#212121" strokeWidth="0.6" />
          <line x1="2" y1="-2" x2="2" y2="-30" stroke="#e53935" strokeWidth="0.6" />
          <polygon points="0,0 4,0 2,-36" fill="#bdbdbd" />
          {/* 护手 */}
          <rect x="-3" y="0" width="10" height="2.5" fill="#c62828" />
          {/* 握柄 */}
          <rect x="0" y="2.5" width="4" height="9" fill="#3e2723" />
          <circle cx="2" cy="13" r="2" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.4" />
        </g>
      )
    case 'zhao-kuang-yin':
      // 赵匡胤: 盘龙棍 (棍 + 龙缠绕)
      return (
        <g transform="translate(75 30) rotate(8)">
          {/* 棍身 */}
          <rect x="-1.5" y="0" width="3" height="60" fill="#5d4037" stroke="#3e2723" strokeWidth="0.4" />
          <rect x="-1.5" y="0" width="3" height="60" fill="url(#gold-grad)" opacity="0.3" />
          {/* 龙缠绕 */}
          <path d="M -4 5 Q 6 10 -4 16 Q 6 22 -4 28 Q 6 34 -4 40 Q 6 46 -4 52"
                fill="none" stroke="#ffd54f" strokeWidth="2" />
          {/* 龙头 */}
          <circle cx="-4" cy="4" r="2.5" fill="#ffd54f" stroke="#5d4037" strokeWidth="0.4" />
          <circle cx="-5" cy="3.5" r="0.5" fill="#212121" />
          <path d="M -7 4 L -9 5 L -7 5 Z" fill="#c62828" />
          {/* 棍顶金箍 */}
          <rect x="-2.5" y="0" width="5" height="2" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.3" />
        </g>
      )
    case 'gou-jian':
      // 勾践: 苦胆 (悬挂的小胆囊)
      return (
        <g>
          {/* 绳子从天花板垂下 */}
          <line x1="15" y1="0" x2="15" y2="20" stroke="#8b6914" strokeWidth="0.8" />
          {/* 苦胆 (梨形) */}
          <ellipse cx="15" cy="26" rx="5" ry="6" fill="#7cb342" stroke="#33691e" strokeWidth="0.6" />
          <ellipse cx="13.5" cy="23" rx="1.5" ry="2" fill="#aed581" opacity="0.7" />
          {/* 胆柄 */}
          <line x1="15" y1="20" x2="15" y2="22" stroke="#33691e" strokeWidth="0.8" />
          {/* 尝胆苦脸 (左下小) */}
          <g transform="translate(72 70)">
            <circle r="5" fill="#ffeb3b" stroke="#f57f17" strokeWidth="0.6" />
            <ellipse cx="-1.5" cy="-1" rx="0.6" ry="0.8" fill="#212121" />
            <ellipse cx="1.5" cy="-1" rx="0.6" ry="0.8" fill="#212121" />
            <path d="M -2 2 Q 0 0.5 2 2" stroke="#212121" strokeWidth="0.5" fill="none" />
            {/* 汗滴 */}
            <path d="M 4 -3 Q 5 -2 4 -1" fill="#42a5f5" />
          </g>
        </g>
      )
    case 'xiang-yu':
      // 项羽: 霸王戟 (长柄 + 月牙刃 + 红缨)
      return (
        <g transform="translate(75 25) rotate(5)">
          {/* 长柄 */}
          <rect x="-1" y="0" width="2.5" height="65" fill="#5d4037" stroke="#3e2723" strokeWidth="0.3" />
          {/* 月牙刃 (横向) */}
          <path d="M 0 8 Q 18 4 22 14 Q 18 22 0 18 Z" fill="#e0e0e0" stroke="#212121" strokeWidth="0.6" />
          <path d="M 2 10 Q 16 7 20 14" fill="none" stroke="#ffffff" strokeWidth="0.6" />
          {/* 反面横枝 */}
          <line x1="0" y1="13" x2="-8" y2="13" stroke="#212121" strokeWidth="2" />
          <polygon points="-8,11 -8,15 -12,13" fill="#bdbdbd" stroke="#212121" strokeWidth="0.4" />
          {/* 红缨 (杆顶) */}
          <path d="M -3 0 L 3 0 L 2 -10 L 0 -16 L -2 -10 Z" fill="#c62828" stroke="#7f0000" strokeWidth="0.4" />
          {[0,1,2,3].map(i => (
            <line key={i} x1={-2 + i*1.5} y1="-2" x2={-3 + i*1.5} y2="-14" stroke="#7f0000" strokeWidth="0.3" />
          ))}
          {/* 金箍 */}
          <rect x="-2" y="0" width="4" height="2" fill="url(#gold-grad)" />
        </g>
      )
    case 'li-shi-min':
      // 李世民: 长弓 + 箭 (背后)
      return (
        <g transform="translate(75 35)">
          {/* 弓身 (弧) */}
          <path d="M 0 0 Q -10 25 0 50" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />
          <path d="M 0 0 Q -10 25 0 50" fill="none" stroke="url(#gold-grad)" strokeWidth="1.5" />
          {/* 弓弦 */}
          <line x1="0" y1="0" x2="0" y2="50" stroke="#f5f5f5" strokeWidth="0.4" />
          {/* 箭搭弦 */}
          <line x1="0" y1="5" x2="-15" y2="25" stroke="#5d4037" strokeWidth="1" />
          <polygon points="-15,25 -19,24 -17,27" fill="#212121" />
          <polygon points="0,5 -2,2 -2,8" fill="#9e9e9e" stroke="#212121" strokeWidth="0.3" />
          {/* 红羽 */}
          <path d="M 0 5 L 2 0 L 4 5 Z" fill="#c62828" />
        </g>
      )
    case 'wu-ze-tian':
      // 武则天: 凤冠 (繁复金冠 + 凤凰步摇)
      return (
        <g>
          {/* 冠底 (弧形) */}
          <path d="M 35 32 Q 50 26 65 32 L 65 36 Q 50 33 35 36 Z" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.5" />
          {/* 凤凰 (中央) */}
          <ellipse cx="50" cy="24" rx="5" ry="4" fill="#c62828" stroke="#7f0000" strokeWidth="0.4" />
          <path d="M 47 22 Q 50 18 53 22 L 53 24 L 47 24 Z" fill="#f48fb1" stroke="#880e4f" strokeWidth="0.4" />
          <polygon points="50,28 53,28 50,30" fill="#ffd54f" />
          <circle cx="49" cy="23" r="0.6" fill="#212121" />
          {/* 流苏 (三串) */}
          {[44, 50, 56].map((x, i) => (
            <g key={i}>
              <line x1={x} y1="32" x2={x} y2="40" stroke="#ffd54f" strokeWidth="0.6" />
              <circle cx={x} cy="41" r="1.2" fill="#c62828" stroke="#7f0000" strokeWidth="0.3" />
            </g>
          ))}
          {/* 两侧步摇 */}
          <path d="M 38 32 Q 32 36 30 44" stroke="url(#gold-grad)" strokeWidth="1.5" fill="none" />
          <circle cx="30" cy="44" r="1.5" fill="#c62828" />
          <path d="M 62 32 Q 68 36 70 44" stroke="url(#gold-grad)" strokeWidth="1.5" fill="none" />
          <circle cx="70" cy="44" r="1.5" fill="#c62828" />
        </g>
      )
    case 'cao-cao':
      // 曹操: 兵书 + 短剑 (奸雄, 智武双全)
      return (
        <g>
          {/* 兵书 (展开的竹简) */}
          <g transform="translate(15 65)">
            <rect x="0" y="0" width="22" height="14" fill="#f4e4bc" stroke="#8b6914" strokeWidth="0.6" />
            {[0,1,2,3].map(i => (
              <line key={i} x1="2" y1={3 + i*3} x2="20" y2={3 + i*3} stroke="#5d4037" strokeWidth="0.4" />
            ))}
            {/* 捆绳 */}
            <line x1="0" y1="0" x2="0" y2="14" stroke="#c62828" strokeWidth="1.2" />
            <line x1="22" y1="0" x2="22" y2="14" stroke="#c62828" strokeWidth="1.2" />
          </g>
          {/* 短剑 (右下) */}
          <g transform="translate(72 72) rotate(20)">
            <polygon points="0,0 3,0 2.5,-18 0.5,-18" fill="#cfd8dc" stroke="#212121" strokeWidth="0.5" />
            <polygon points="0,0 3,0 1.5,-22" fill="#90a4ae" />
            <rect x="-2" y="0" width="7" height="2" fill="#5d4037" />
            <rect x="-1" y="2" width="3" height="6" fill="#3e2723" />
            <circle cx="0.5" cy="9" r="1.5" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.3" />
          </g>
        </g>
      )
    case 'chen-sheng':
      // 陈胜: 起义旗 (大旗, 写"义"字)
      return (
        <g transform="translate(70 30)">
          {/* 旗杆 */}
          <rect x="-1" y="0" width="2" height="55" fill="#5d4037" stroke="#3e2723" strokeWidth="0.3" />
          <polygon points="-3,0 3,0 0,-6" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.3" />
          {/* 旗帜 (三角形飘扬) */}
          <path d="M 0 2 L 22 6 L 20 14 L 22 22 L 0 18 Z" fill="#c62828" stroke="#7f0000" strokeWidth="0.6" />
          <path d="M 0 2 L 22 6 L 20 14 L 22 22 L 0 18 Z" fill="none" stroke="#ffd54f" strokeWidth="0.4" strokeDasharray="1,1" />
          {/* 义字 */}
          <text x="11" y="13" fontSize="8" fill="#ffd54f" textAnchor="middle" fontWeight="bold" fontFamily="'KaiTi',serif">义</text>
          {/* 旗穗 */}
          <path d="M 22 6 L 24 4 M 22 14 L 24 14 M 22 22 L 24 24" stroke="#ffd54f" strokeWidth="0.5" />
        </g>
      )
    case 'tie-mu-zhen':
      // 铁木真: 蒙古弯弓 + 箭袋 (背后)
      return (
        <g>
          {/* 弯弓 (弧形更大) */}
          <g transform="translate(75 30)">
            <path d="M 0 0 Q -12 25 0 55" fill="none" stroke="#3e2723" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 0 0 Q -12 25 0 55" fill="none" stroke="url(#gold-grad)" strokeWidth="1.5" />
            <line x1="0" y1="0" x2="0" y2="55" stroke="#f5f5f5" strokeWidth="0.4" />
          </g>
          {/* 箭袋 (左) */}
          <g transform="translate(18 50)">
            <path d="M 0 0 L 8 0 L 7 20 L 1 20 Z" fill="#5d4037" stroke="#3e2723" strokeWidth="0.4" />
            <path d="M 0 0 L 8 0 L 7 3 L 1 3 Z" fill="url(#gold-grad)" />
            {/* 箭尾 */}
            <line x1="3" y1="-4" x2="3" y2="0" stroke="#3e2723" strokeWidth="0.6" />
            <line x1="5" y1="-4" x2="5" y2="0" stroke="#3e2723" strokeWidth="0.6" />
            <path d="M 2 -4 L 4 -7 L 6 -4" fill="#c62828" />
            <path d="M 2 0 L 2 -4" stroke="#c62828" strokeWidth="0.4" />
          </g>
        </g>
      )
    case 'zhu-yuan-zhang':
      // 朱元璋: 朝天槍 (直立长槍 + 红缨)
      return (
        <g transform="translate(72 22)">
          {/* 槍身 */}
          <rect x="-1" y="20" width="2.5" height="68" fill="#5d4037" stroke="#3e2723" strokeWidth="0.3" />
          {/* 红缨 (顶部大束) */}
          <path d="M -4 20 L 4 20 L 3 8 L 1 0 L -1 0 L -3 8 Z" fill="#c62828" stroke="#7f0000" strokeWidth="0.4" />
          {[0,1,2,3,4].map(i => (
            <line key={i} x1={-3 + i*1.5} y1="18" x2={-4 + i*1.5} y2="2" stroke="#7f0000" strokeWidth="0.3" />
          ))}
          {/* 槍尖 */}
          <polygon points="-1.5,20 1.5,20 0,10" fill="#9e9e9e" stroke="#212121" strokeWidth="0.4" />
          {/* 金箍 */}
          <rect x="-2" y="20" width="4" height="2" fill="url(#gold-grad)" />
        </g>
      )
    case 'lv-zhi':
      // 吕雉: 凤簪 + 玉 (后妃气质)
      return (
        <g>
          {/* 凤簪 (斜插右上) */}
          <line x1="65" y1="30" x2="78" y2="18" stroke="#ffd54f" strokeWidth="1.5" />
          <circle cx="78" cy="18" r="3" fill="#c62828" stroke="#7f0000" strokeWidth="0.5" />
          <path d="M 76 16 Q 78 13 80 16 L 80 18 L 76 18 Z" fill="#f48fb1" stroke="#880e4f" strokeWidth="0.4" />
          <polygon points="78,21 81,21 78,23" fill="#ffd54f" />
          {/* 流苏 */}
          <line x1="65" y1="30" x2="64" y2="38" stroke="#c62828" strokeWidth="0.6" />
          <circle cx="64" cy="39" r="1.8" fill="#c62828" stroke="#7f0000" strokeWidth="0.3" />
          {/* 玉佩 (胸前) */}
          <g transform="translate(50 78)">
            <line x1="0" y1="-3" x2="0" y2="0" stroke="url(#gold-grad)" strokeWidth="0.8" />
            <ellipse cx="0" cy="4" rx="5" ry="7" fill="#a5d6a7" stroke="#1b5e20" strokeWidth="0.6" />
            <ellipse cx="0" cy="4" rx="3.5" ry="5" fill="none" stroke="#1b5e20" strokeWidth="0.4" />
            <circle cx="0" cy="3" r="0.8" fill="#1b5e20" />
            <text x="0" y="6" fontSize="4" fill="#1b5e20" textAnchor="middle" fontWeight="bold">吕</text>
          </g>
        </g>
      )
    case 'mu-rong':
      // 慕容: 燕国匕首 (短 + 燕纹)
      return (
        <g transform="translate(70 70) rotate(-30)">
          {/* 刀刃 */}
          <polygon points="0,0 14,10 11,13 -1,3" fill="#e0e0e0" stroke="#212121" strokeWidth="0.6" />
          <polygon points="0,0 14,10 11,12 -1,2" fill="#f5f5f5" />
          {/* 燕纹 (刀面) */}
          <path d="M 4 5 Q 7 3 9 5 M 5 7 Q 7 6 8 7" stroke="#212121" strokeWidth="0.4" fill="none" />
          {/* 刀尖 */}
          <polygon points="14,10 20,16 17,18 11,13" fill="#9e9e9e" />
          {/* 护手 */}
          <rect x="-4" y="1" width="4" height="3" fill="url(#gold-grad)" transform="rotate(-30 -2 2.5)" />
          {/* 握柄 (缠绳) */}
          <rect x="-10" y="6" width="7" height="2.5" fill="#3e2723" transform="rotate(-30 -6.5 7.25)" />
          <line x1="-9" y1="7" x2="-4" y2="7" stroke="#ffd54f" strokeWidth="0.3" />
          {/* 燕坠 (柄尾) */}
          <path d="M -10 7 L -12 5 L -13 8 L -11 9 Z" fill="#c62828" stroke="#7f0000" strokeWidth="0.3" />
        </g>
      )
    case 'li-yu':
      // 李煜: 砚台 + 笔 (词帝, 文人)
      return (
        <g>
          {/* 砚台 (左侧) */}
          <g transform="translate(15 75)">
            <path d="M 0 4 Q 2 0 5 0 L 18 0 Q 22 0 24 4 L 22 8 L 2 8 Z" fill="#37474f" stroke="#212121" strokeWidth="0.6" />
            <ellipse cx="12" cy="3" rx="9" ry="1.5" fill="#1c1c1c" />
            <circle cx="8" cy="3" r="0.8" fill="#1976d2" />
          </g>
          {/* 毛笔 (右侧斜) */}
          <g transform="translate(70 50) rotate(35)">
            <rect x="-1" y="0" width="2.5" height="22" fill="#5d4037" stroke="#3e2723" strokeWidth="0.3" />
            <rect x="-1" y="0" width="2.5" height="22" fill="url(#gold-grad)" opacity="0.3" />
            {/* 笔头 */}
            <ellipse cx="0.25" cy="24" rx="2" ry="3" fill="#212121" />
            <ellipse cx="0.25" cy="24" rx="1.2" ry="2" fill="#424242" />
            {/* 笔顶 */}
            <circle cx="0.25" cy="-1" r="2" fill="#c62828" />
          </g>
        </g>
      )
    case 'bian-que':
      // 扁鹊: 药箱 + 银针 (神医)
      return (
        <g>
          {/* 药箱 (肩背, 左上) */}
          <g transform="translate(18 55)">
            <rect x="0" y="0" width="14" height="16" fill="#5d4037" stroke="#3e2723" strokeWidth="0.5" />
            <rect x="0" y="6" width="14" height="2" fill="url(#gold-grad)" />
            {/* 红十字 */}
            <rect x="6" y="3" width="2" height="6" fill="#c62828" />
            <rect x="4" y="5" width="6" height="2" fill="#c62828" />
            {/* 提手 */}
            <path d="M 2 0 Q 7 -3 12 0" fill="none" stroke="#3e2723" strokeWidth="0.6" />
          </g>
          {/* 银针 (右手) */}
          <g transform="translate(72 70) rotate(15)">
            <line x1="0" y1="0" x2="0" y2="22" stroke="#e0e0e0" strokeWidth="1.2" />
            <circle cx="0" cy="23" r="0.6" fill="#e0e0e0" />
            {/* 针柄 (粗端) */}
            <rect x="-1.5" y="-3" width="3" height="4" fill="#5d4037" />
          </g>
        </g>
      )

    // ===== 臣阵营 =====
    case 'shang-yang':
      // 商鞅: 竹简 + 变法印章
      return (
        <g transform="translate(65 60)">
          {/* 竹简 (展开) */}
          <rect x="0" y="0" width="22" height="20" fill="#a1887f" stroke="#3e2723" strokeWidth="0.5" />
          {[0,1,2,3,4].map(i => (
            <line key={i} x1="2" y1={3 + i*3.5} x2="20" y2={3 + i*3.5} stroke="#3e2723" strokeWidth="0.3" />
          ))}
          {/* 字 (篆体笔画像) */}
          <text x="11" y="11" fontSize="6" fill="#212121" textAnchor="middle" fontWeight="bold">法</text>
          {/* 捆绳 */}
          <line x1="-1" y1="0" x2="-1" y2="20" stroke="#c62828" strokeWidth="1" />
          <line x1="23" y1="0" x2="23" y2="20" stroke="#c62828" strokeWidth="1" />
        </g>
      )
    case 'yang-yan-zhao':
      // 杨延昭: 杨家枪 (长槍 + 红缨)
      return (
        <g transform="translate(72 25)">
          <rect x="-1" y="15" width="2" height="65" fill="#5d4037" stroke="#3e2723" strokeWidth="0.3" />
          {/* 红缨 */}
          <path d="M -3 15 L 3 15 L 2 5 L 1 -2 L -1 -2 L -2 5 Z" fill="#c62828" stroke="#7f0000" strokeWidth="0.3" />
          {[0,1,2,3].map(i => (
            <line key={i} x1={-2 + i*1.5} y1="13" x2={-3 + i*1.5} y2="-1" stroke="#7f0000" strokeWidth="0.2" />
          ))}
          {/* 槍尖 (尖锐) */}
          <polygon points="-1.5,15 1.5,15 0,5" fill="#bdbdbd" stroke="#212121" strokeWidth="0.4" />
          {/* 金箍 */}
          <rect x="-2" y="15" width="4" height="2" fill="url(#gold-grad)" />
        </g>
      )
    case 'tan-tai-ming':
      // 澹台名: 双剑交叉 (修罗剑魔)
      return (
        <g transform="translate(75 50)">
          {/* 剑1 */}
          <g transform="rotate(20)">
            <polygon points="0,0 3,0 2,-25 1,-25" fill="#e0e0e0" stroke="#212121" strokeWidth="0.5" />
            <polygon points="0,0 3,0 1.5,-30" fill="#bdbdbd" />
            <rect x="-2" y="0" width="7" height="2" fill="#5d4037" />
            <rect x="-0.5" y="2" width="3" height="7" fill="#1a1a1a" />
            <circle cx="1" cy="10" r="1.5" fill="url(#gold-grad)" />
          </g>
          {/* 剑2 */}
          <g transform="rotate(-20)">
            <polygon points="0,0 3,0 2,-25 1,-25" fill="#e0e0e0" stroke="#212121" strokeWidth="0.5" />
            <polygon points="0,0 3,0 1.5,-30" fill="#bdbdbd" />
            <rect x="-2" y="0" width="7" height="2" fill="#5d4037" />
            <rect x="-0.5" y="2" width="3" height="7" fill="#1a1a1a" />
            <circle cx="1" cy="10" r="1.5" fill="url(#gold-grad)" />
          </g>
          {/* 中心红光 */}
          <circle cx="0" cy="-5" r="2" fill="#c62828" opacity="0.6" />
        </g>
      )
    case 'qin-qiong':
      // 秦琼: 熟铜锏 (双锏之一)
      return (
        <g transform="translate(72 65) rotate(15)">
          {/* 锏身 (四棱柱, 中间粗两头细) */}
          <path d="M 0 0 L 4 -2 L 5 -25 L 3 -28 L 1 -28 L -1 -25 L 0 0 Z"
                fill="#a1887f" stroke="#3e2723" strokeWidth="0.5" />
          {/* 棱 */}
          <line x1="2.5" y1="-3" x2="3" y2="-26" stroke="#5d4037" strokeWidth="0.4" />
          <line x1="1.5" y1="-3" x2="2" y2="-26" stroke="#5d4037" strokeWidth="0.4" />
          {/* 锏尖 */}
          <polygon points="1,-28 3,-28 2,-32" fill="#5d4037" />
          {/* 锏柄 */}
          <rect x="0" y="0" width="2" height="10" fill="#3e2723" />
          {/* 柄尾金环 */}
          <circle cx="1" cy="11" r="1.5" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.3" />
          {/* 第四锏 */}
          <rect x="-3" y="2" width="6" height="2" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.3" />
        </g>
      )
    case 'yu-ji':
      // 虞姬: 团扇 (丝绸圆扇)
      return (
        <g transform="translate(72 65)">
          {/* 扇柄 */}
          <line x1="0" y1="0" x2="0" y2="15" stroke="#5d4037" strokeWidth="1.2" />
          {/* 扇面 (圆) */}
          <circle cx="0" cy="-8" r="10" fill="#f48fb1" stroke="#880e4f" strokeWidth="0.6" />
          {/* 扇骨 (放射状) */}
          {[0,30,60,90,120,150].map((deg, i) => (
            <line key={i} x1="0" y1="-8" x2={Math.cos((deg - 90) * Math.PI / 180) * 9} y2={-8 + Math.sin((deg - 90) * Math.PI / 180) * 9}
                  stroke="#880e4f" strokeWidth="0.3" />
          ))}
          {/* 扇面花纹 */}
          <circle cx="0" cy="-8" r="4" fill="none" stroke="#880e4f" strokeWidth="0.4" />
          <circle cx="-3" cy="-10" r="1.5" fill="#fce4ec" />
          <circle cx="3" cy="-6" r="1.5" fill="#fce4ec" />
          {/* 扇坠 (流苏) */}
          <line x1="0" y1="15" x2="0" y2="22" stroke="#ffd54f" strokeWidth="0.6" />
          <circle cx="0" cy="24" r="2" fill="#ffd54f" stroke="#8b6914" strokeWidth="0.4" />
        </g>
      )
    case 'yue-fei':
      // 岳飞: 长枪 + "岳"字旗
      return (
        <g>
          {/* 长枪 */}
          <g transform="translate(72 25)">
            <rect x="-1" y="20" width="2.5" height="62" fill="#5d4037" stroke="#3e2723" strokeWidth="0.3" />
            <polygon points="-2,20 2,20 0,10" fill="#bdbdbd" stroke="#212121" strokeWidth="0.4" />
            <rect x="-2" y="20" width="4" height="2" fill="url(#gold-grad)" />
          </g>
          {/* 岳字旗 (背) */}
          <g transform="translate(20 50)">
            <rect x="0" y="0" width="14" height="18" fill="#c62828" stroke="#7f0000" strokeWidth="0.5" />
            <text x="7" y="12" fontSize="9" fill="#ffd54f" textAnchor="middle" fontWeight="bold" fontFamily="'KaiTi',serif">岳</text>
            <rect x="14" y="0" width="1" height="18" fill="#5d4037" />
          </g>
        </g>
      )
    case 'han-xin':
      // 韩信: 兵符 (虎符) + 棋盘纹
      return (
        <g transform="translate(70 65)">
          {/* 虎符 (左半) */}
          <path d="M 0 4 Q 2 0 6 0 L 10 0 Q 12 0 12 4 L 12 12 Q 12 14 10 14 L 6 14 Q 2 14 0 12 Z"
                fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.6" />
          {/* 虎头 */}
          <circle cx="3" cy="3" r="1.5" fill="#ffd54f" stroke="#5d4037" strokeWidth="0.3" />
          <circle cx="2.7" cy="2.7" r="0.3" fill="#212121" />
          <path d="M 1 5 L 2 6 L 1 6" fill="#212121" />
          {/* 缺口 (右) */}
          <path d="M 12 6 L 14 6 L 14 10 L 12 10 Z" fill="#1a1a1a" />
          {/* 铭文 (假字) */}
          <line x1="4" y1="9" x2="10" y2="9" stroke="#5d4037" strokeWidth="0.3" />
          <line x1="4" y1="11" x2="10" y2="11" stroke="#5d4037" strokeWidth="0.3" />
        </g>
      )
    case 'guan-yu':
      // 关羽: 青龙偃月刀 (标志性武器)
      return (
        <g transform="translate(72 28)">
          {/* 长柄 */}
          <rect x="-1" y="20" width="2.5" height="62" fill="#5d4037" stroke="#3e2723" strokeWidth="0.3" />
          {/* 月牙刃 (大弯刀) */}
          <path d="M 0 20 Q 20 14 22 4 Q 20 0 14 0 Q 6 2 0 8 Z" fill="#e0e0e0" stroke="#212121" strokeWidth="0.6" />
          <path d="M 2 18 Q 18 12 20 4" fill="none" stroke="#ffffff" strokeWidth="0.6" />
          {/* 青龙 (刀背盘) */}
          <path d="M 4 8 Q 8 6 14 8 Q 18 8 20 4" stroke="#1976d2" strokeWidth="1.5" fill="none" />
          <circle cx="4" cy="8" r="1.5" fill="#1976d2" />
          <circle cx="3.5" cy="7.5" r="0.4" fill="#212121" />
          {/* 反面横枝 + 小环 */}
          <line x1="0" y1="20" x2="-6" y2="20" stroke="#212121" strokeWidth="1.5" />
          <circle cx="-7" cy="20" r="2" fill="none" stroke="url(#gold-grad)" strokeWidth="1" />
          {/* 红缨 (杆顶) */}
          <path d="M -2 20 L 2 20 L 1 14 L -1 14 Z" fill="#c62828" />
          {/* 金箍 */}
          <rect x="-2" y="20" width="4" height="2" fill="url(#gold-grad)" />
        </g>
      )
    case 'zhuge-liang':
      // 诸葛亮: 羽扇 + 兵书 (头戴纶巾)
      return (
        <g>
          {/* 纶巾 */}
          <path d="M 37 32 Q 50 26 63 32 L 63 38 Q 50 35 37 38 Z" fill="#37474f" stroke="#212121" strokeWidth="0.5" />
          <ellipse cx="50" cy="32" rx="13" ry="3" fill="#455a64" />
          {/* 纶巾顶玉 */}
          <circle cx="50" cy="29" r="1.5" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.3" />
          {/* 帛带 (左飘) */}
          <path d="M 38 34 Q 32 42 30 52" stroke="#37474f" strokeWidth="1.5" fill="none" />
          {/* 羽扇 (右) */}
          <g transform="translate(72 65)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#5d4037" strokeWidth="1.5" />
            {/* 扇面 (扇形, 白色羽毛) */}
            <path d="M 0 0 L -14 4 Q -18 9 -14 14 L 0 8 Z" fill="#f5f5f5" stroke="#8b6914" strokeWidth="0.6" />
            {/* 羽纹 */}
            <line x1="0" y1="1" x2="-13" y2="5" stroke="#bdbdbd" strokeWidth="0.4" />
            <line x1="0" y1="4" x2="-15" y2="8" stroke="#bdbdbd" strokeWidth="0.4" />
            <line x1="0" y1="7" x2="-13" y2="13" stroke="#bdbdbd" strokeWidth="0.4" />
            {/* 扇坠 (白羽) */}
            <line x1="0" y1="20" x2="0" y2="26" stroke="#f5f5f5" strokeWidth="1" />
            <path d="M -1 26 L 1 26 L 0 30 Z" fill="#f5f5f5" />
          </g>
          {/* 兵书 (左下) */}
          <g transform="translate(15 75)">
            <rect x="0" y="0" width="14" height="10" fill="#f4e4bc" stroke="#8b6914" strokeWidth="0.5" />
            <line x1="2" y1="3" x2="12" y2="3" stroke="#5d4037" strokeWidth="0.3" />
            <line x1="2" y1="6" x2="12" y2="6" stroke="#5d4037" strokeWidth="0.3" />
            <text x="7" y="9" fontSize="5" fill="#5d4037" textAnchor="middle" fontWeight="bold">兵</text>
          </g>
        </g>
      )
    case 'cheng-yao-jin':
      // 程咬金: 宣花斧 (三板斧)
      return (
        <g transform="translate(20 70) rotate(-15)">
          {/* 斧头 (大) */}
          <path d="M 0 -12 L 22 -16 L 26 0 L 20 14 L 0 10 Z"
                fill="#9e9e9e" stroke="#212121" strokeWidth="0.8" />
          <path d="M 2 -10 L 22 -14 L 24 -4 L 2 -4 Z" fill="#bdbdbd" opacity="0.6" />
          {/* 斧刃刃边 (亮) */}
          <path d="M 0 -12 L -4 0 L 0 10" fill="none" stroke="#f5f5f5" strokeWidth="1.2" />
          {/* 斧面花纹 (宣花) */}
          <circle cx="13" cy="-2" r="3" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.4" />
          <path d="M 11 -4 L 15 -4 M 11 -2 L 15 -2 M 11 0 L 15 0" stroke="#5d4037" strokeWidth="0.2" />
          {/* 斧柄 */}
          <rect x="11" y="-14" width="4" height="40" fill="#5d4037" stroke="#3e2723" strokeWidth="0.4" />
          {/* 柄尾包铁 */}
          <rect x="9" y="24" width="8" height="3" fill="#212121" />
          <circle cx="13" cy="25" r="1" fill="url(#gold-grad)" />
        </g>
      )

    // ===== 民阵营 =====
    case 'jing-ke':
      // 荆轲: 匕首 + 地图 (图穷匕见)
      return (
        <g>
          {/* 地图卷 (左侧) */}
          <g transform="translate(15 60)">
            <rect x="0" y="0" width="22" height="14" rx="3" fill="#f4e4bc" stroke="#8b6914" strokeWidth="0.6" />
            {/* 地图山脉 (装饰线) */}
            <path d="M 2 9 L 5 5 L 8 8 L 11 4 L 14 7 L 17 5 L 20 8" stroke="#5d4037" strokeWidth="0.4" fill="none" />
            {/* 卷轴 */}
            <ellipse cx="0" cy="7" rx="2" ry="7" fill="#a1887f" stroke="#3e2723" strokeWidth="0.4" />
            <ellipse cx="22" cy="7" rx="2" ry="7" fill="#a1887f" stroke="#3e2723" strokeWidth="0.4" />
          </g>
          {/* 匕首 (右侧) — 从地图后探出 */}
          <g transform="translate(68 50) rotate(40)">
            <polygon points="0,0 12,8 10,11 -2,3" fill="#e0e0e0" stroke="#212121" strokeWidth="0.5" />
            <polygon points="0,0 12,8 10,10 -2,2" fill="#f5f5f5" />
            {/* 匕尖 (锐) */}
            <polygon points="12,8 18,14 14,16 10,11" fill="#9e9e9e" />
            {/* 护手 */}
            <rect x="-3" y="0" width="4" height="2.5" fill="#5d4037" />
            {/* 缠绳握柄 */}
            <rect x="-9" y="2" width="7" height="2.5" fill="#3e2723" />
            <line x1="-8" y1="3" x2="-3" y2="3" stroke="#ffd54f" strokeWidth="0.3" />
            {/* 剧毒标记 (绿) */}
            <circle cx="-8" cy="3.5" r="0.6" fill="#7cb342" />
          </g>
        </g>
      )
    case 'wu-song':
      // 武松: 哨棒 + 酒坛 (打虎)
      return (
        <g>
          {/* 哨棒 (左) */}
          <g transform="translate(20 30) rotate(-5)">
            <rect x="-1" y="0" width="2.5" height="65" fill="#5d4037" stroke="#3e2723" strokeWidth="0.4" />
            <rect x="-1" y="0" width="2.5" height="65" fill="url(#gold-grad)" opacity="0.2" />
            {/* 节疤 */}
            {[10,25,40,55].map((y, i) => (
              <circle key={i} cx="0.25" cy={y} r="1" fill="#3e2723" />
            ))}
            {/* 棒顶铁箍 */}
            <rect x="-2" y="0" width="4" height="2" fill="#212121" />
          </g>
          {/* 酒坛 (右下) */}
          <g transform="translate(72 78)">
            <path d="M -5 -8 L 5 -8 L 7 -3 L 6 5 Q 5 8 3 8 L -3 8 Q -5 8 -6 5 L -7 -3 Z"
                  fill="#8d6e63" stroke="#3e2723" strokeWidth="0.5" />
            <ellipse cx="0" cy="-8" rx="5" ry="1.5" fill="#5d4037" />
            {/* 酒字 */}
            <text x="0" y="2" fontSize="6" fill="#ffd54f" textAnchor="middle" fontWeight="bold">酒</text>
            {/* 坛口红封 */}
            <rect x="-3" y="-9" width="6" height="2" fill="#c62828" />
          </g>
        </g>
      )
    case 'song-jiang':
      // 宋江: 令旗 + 笔 (及时雨, 招安)
      return (
        <g>
          {/* 令旗 (左上) */}
          <g transform="translate(20 30)">
            <rect x="-1" y="0" width="2" height="50" fill="#5d4037" stroke="#3e2723" strokeWidth="0.3" />
            <polygon points="-3,0 3,0 0,-5" fill="url(#gold-grad)" />
            {/* 旗 (三角形) */}
            <path d="M 0 2 L 18 6 L 16 14 L 0 10 Z" fill="#1565c0" stroke="#0d47a1" strokeWidth="0.5" />
            <text x="9" y="11" fontSize="6" fill="#ffd54f" textAnchor="middle" fontWeight="bold" fontFamily="'KaiTi',serif">令</text>
          </g>
          {/* 笔 (右下) */}
          <g transform="translate(72 70) rotate(25)">
            <rect x="-1" y="0" width="2.5" height="18" fill="#5d4037" stroke="#3e2723" strokeWidth="0.3" />
            <ellipse cx="0.25" cy="20" rx="1.8" ry="2.5" fill="#212121" />
            <circle cx="0.25" cy="-1" r="1.8" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.3" />
          </g>
        </g>
      )
    case 'li-shi-shi':
      // 李师师: 琵琶 (乐器)
      return (
        <g transform="translate(70 60)">
          {/* 琵琶头 (右) */}
          <ellipse cx="14" cy="0" rx="4" ry="6" fill="#a1887f" stroke="#3e2723" strokeWidth="0.5" />
          {/* 琵琶颈 */}
          <rect x="-2" y="-2" width="14" height="4" fill="#5d4037" stroke="#3e2723" strokeWidth="0.4" />
          {/* 琵琶身 (左半圆) */}
          <path d="M -2 -2 L -2 2 L -16 8 Q -22 0 -16 -8 Z" fill="#8d6e63" stroke="#3e2723" strokeWidth="0.5" />
          <path d="M -2 -1 L -16 -7 Q -20 0 -16 7 L -2 1 Z" fill="#a1887f" />
          {/* 弦 (4 根) */}
          <line x1="11" y1="-2" x2="-15" y2="-7" stroke="#f5f5f5" strokeWidth="0.3" />
          <line x1="11" y1="-1" x2="-15" y2="-3" stroke="#f5f5f5" strokeWidth="0.3" />
          <line x1="11" y1="1" x2="-15" y2="3" stroke="#f5f5f5" strokeWidth="0.3" />
          <line x1="11" y1="2" x2="-15" y2="7" stroke="#f5f5f5" strokeWidth="0.3" />
          {/* 弦轴 */}
          {[0,1,2,3].map(i => (
            <circle key={i} cx={14} cy={-4 + i*2} r="0.5" fill="#ffd54f" />
          ))}
          {/* 红色装饰 */}
          <circle cx="14" cy="0" r="1" fill="#c62828" />
        </g>
      )
    case 'xiao-qiao':
      // 小乔: 古琴 (七弦琴)
      return (
        <g transform="translate(15 75) rotate(-8)">
          {/* 琴身 (长条) */}
          <path d="M 0 0 L 36 0 Q 40 0 40 4 L 40 6 Q 40 8 36 8 L 0 8 Q -2 8 -2 4 Z"
                fill="#5d4037" stroke="#3e2723" strokeWidth="0.6" />
          <path d="M 0 0 L 36 0 Q 38 0 38 3 L 0 3 Z" fill="#8d6e63" />
          {/* 弦 (7 根) */}
          {[0,1,2,3,4,5,6].map(i => (
            <line key={i} x1="4" y1={4} x2="36" y2={4} stroke="#f5f5f5" strokeWidth="0.2" strokeDasharray={`${0.5 + i*0.3},${1 + i*0.3}`} />
          ))}
          {/* 琴徽 (圆点) */}
          {[6, 12, 18, 24, 30].map((x, i) => (
            <circle key={i} cx={x} cy="4" r="0.6" fill="#ffd54f" stroke="#5d4037" strokeWidth="0.2" />
          ))}
          {/* 琴首 (右侧) */}
          <rect x="36" y="-2" width="6" height="12" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.4" />
          <rect x="42" y="0" width="2" height="8" fill="#5d4037" />
          {/* 流苏 (右侧) */}
          <line x1="44" y1="4" x2="44" y2="12" stroke="#c62828" strokeWidth="0.6" />
          <circle cx="44" cy="13" r="1.5" fill="#c62828" />
        </g>
      )
    case 'li-kui':
      // 李逵: 双板斧 (黑旋风, 凶猛)
      return (
        <g>
          {/* 斧1 (左) */}
          <g transform="translate(20 65) rotate(-25)">
            <path d="M 0 -8 L 16 -10 L 18 0 L 14 8 L 0 6 Z" fill="#5d4037" stroke="#212121" strokeWidth="0.8" />
            <path d="M 0 -8 L -3 0 L 0 6" fill="none" stroke="#f5f5f5" strokeWidth="1" />
            <rect x="6" y="-10" width="3" height="30" fill="#3e2723" stroke="#212121" strokeWidth="0.3" />
            <circle cx="7.5" cy="-10" r="1.5" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.3" />
          </g>
          {/* 斧2 (右) */}
          <g transform="translate(72 65) rotate(25)">
            <path d="M 0 -8 L 16 -10 L 18 0 L 14 8 L 0 6 Z" fill="#5d4037" stroke="#212121" strokeWidth="0.8" />
            <path d="M 16 -10 L 19 0 L 14 8" fill="none" stroke="#f5f5f5" strokeWidth="1" />
            <rect x="9" y="-10" width="3" height="30" fill="#3e2723" stroke="#212121" strokeWidth="0.3" />
            <circle cx="10.5" cy="-10" r="1.5" fill="url(#gold-grad)" stroke="#5d4037" strokeWidth="0.3" />
          </g>
        </g>
      )

    // 默认回退到 archetype 装饰
    default:
      return <ArchetypeDecor archetype={getArchetype(heroId)} />
  }
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

export function HeroPortrait({ hero, size = 100, fill = false }: Props) {
  const role = hero.role ?? 'enemy'
  const theme = ROLE_THEME[role] ?? ROLE_THEME['enemy']
  const faction = hero.hero.faction
  const archetype = getArchetype(hero.hero.id)
  const starLevel = hero.instance.starLevel ?? 1
  const gid = `bg-${hero.hero.id}`
  const portraitImg = HERO_PORTRAIT_IMAGES[hero.hero.id]

  // fill 模式: 占满父容器
  const sizing: React.CSSProperties = fill
    ? { width: '100%', height: '100%' }
    : { width: size, height: size }

  // PNG 立绘模式: 用 <img> 原生分辨率渲染 + 装饰层覆盖
  if (portraitImg) {
    return (
      <div style={{
        position: 'relative', ...sizing,
        borderRadius: '6px', overflow: 'hidden', flexShrink: 0,
        background: `linear-gradient(180deg, ${theme.bg1} 0%, ${theme.bg2} 100%)`,
      }}>
        <img
          src={portraitImg}
          alt={hero.hero.name}
          draggable={false}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* 阵营徽章 (左上角) */}
        <div style={{
          position: 'absolute', top: '4%', left: '4%',
          background: 'rgba(0,0,0,0.65)', color: '#ffd54f',
          padding: '1px 5px', borderRadius: '2px',
          fontSize: Math.max(7, (fill ? 12 : size) * 0.06), fontWeight: 'bold',
          letterSpacing: '1.5px', fontFamily: "'KaiTi','STKaiti',serif",
        }}>{faction}</div>

        {/* 底部名字条 (左下角) */}
        <div style={{
          position: 'absolute', bottom: '2%', left: '4%',
          background: 'rgba(0,0,0,0.7)', color: '#ffd54f',
          padding: '2px 5px', borderRadius: '2px',
          fontSize: Math.max(8, (fill ? 12 : size) * 0.09), fontWeight: 'bold',
          textAlign: 'left',
          fontFamily: "'KaiTi','STKaiti',serif",
        }}>{hero.hero.name}</div>
      </div>
    )
  }

  // 默认 SVG 模式
  return (
    <svg width={fill ? '100%' : size} height={fill ? '100%' : size} viewBox="0 0 100 100"
         preserveAspectRatio="xMidYMid meet"
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

      {/* 英雄专属道具 (头饰 + 武器) — 替代 archetype 通用装饰 */}
      <HeroItem heroId={hero.hero.id} />

      {/* 金色双层边框 */}
      <rect x="2" y="2" width="96" height="96" fill="none"
            stroke="url(#gold-grad)" strokeWidth="1.8" rx="5" />
      <rect x="5" y="5" width="90" height="90" fill="none"
            stroke="rgba(212,175,55,0.4)" strokeWidth="0.5" rx="3"
            strokeDasharray="2,1" />

      {/* 阵营徽章 (左上角) */}
      <rect x="4" y="4" width="18" height="9" fill="rgba(0,0,0,0.65)" rx="2" />
      <text x="13" y="11" fontSize="6" fill="#ffd54f" textAnchor="middle"
            fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold"
            style={{ letterSpacing: '1.5px' }}>
        {faction}
      </text>

      {/* 名字条 (左下角) */}
      <rect x="4" y="83" width="44" height="12" fill="rgba(0,0,0,0.7)" rx="2" />
      <text x="8" y="91" fontSize="9" fill="#ffd54f" textAnchor="start"
            fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold">
        {hero.hero.name}
      </text>
    </svg>
  )
}
