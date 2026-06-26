import type { Card } from '@hero-legend/shared-types'
import { isRedSuit, isBlackSuit } from '@hero-legend/shared-types'

// 卡牌图片: 扫 cards/*.png, 文件名即卡名
const cardImgModules = import.meta.glob('../images/cards/*.png', { eager: true, import: 'default' }) as Record<string, string>
const CARD_IMAGES: Record<string, string> = {}
for (const [path, url] of Object.entries(cardImgModules)) {
  const filename = path.replace('../images/cards/', '').replace('.png', '')
  CARD_IMAGES[filename] = url
}

interface Props {
  card: Card
  disabled: boolean
  canPlayKill: boolean
  isFullHp: boolean
  aoJianActive: boolean
  hasHongZhuang: boolean
  isResponse?: boolean
  isJudgeReplace?: boolean
  isPending?: boolean
  isLifted?: boolean
  treasureSelectMode?: boolean
  selectDualMode?: boolean
  selectDiscardMode?: boolean
  /** 任一"选手牌"模式: 弃牌/侠胆/曼舞/天香/补刀/超脱/treasure/... 此模式下整张牌都不可加阴影 */
  isHandCardSelect?: boolean
  hasValidSchemeTarget?: boolean
  huiChunAvailable?: boolean
  shadowed?: boolean
  hasLeiInJudge?: boolean
  onPlayKill: (cardId: string) => void
  onPlayHeal: (cardId: string) => void
  onEquip: (cardId: string) => void
  onPlayScheme?: (cardId: string) => void
  onPlaySchemeSelf?: (cardId: string) => void
  onJudgeReplace?: (cardId: string | null) => void
  onRespondWithCard?: (cardId: string | null) => void
  onHuiChunHeal?: (cardId: string) => void
}

const suitSymbol: Record<string, string> = {
  spade: '♠', heart: '♥', diamond: '♦', club: '♣'
}

// 三色主题: 基本牌 (米色/金边), 锦囊牌 (蓝色), 装备牌 (绿色)
const TYPE_THEME: Record<string, { bg1: string; bg2: string; bg3: string; border: string; main: string; corner: string }> = {
  basic:    { bg1: '#f4e4bc', bg2: '#e8d4a0', bg3: '#dcc890', border: '#8b6914', main: '#5d4037', corner: 'rgba(139,105,20,0.6)' },
  scheme:   { bg1: '#e3f2fd', bg2: '#bbdefb', bg3: '#90caf9', border: '#1565c0', main: '#0d47a1', corner: 'rgba(21,101,192,0.6)' },
  equipment:{ bg1: '#e8f5e9', bg2: '#c8e6c9', bg3: '#a5d6a7', border: '#2e7d32', main: '#1b5e20', corner: 'rgba(46,125,50,0.6)' },
}
const TYPE_LABEL: Record<string, string> = {
  basic: '基本牌', scheme: '锦囊牌', equipment: '装备牌',
}

const suitFontColor = (suit: string) => (suit === 'heart' || suit === 'diamond') ? '#c62828' : '#212121'
const suitWaterColor = (suit: string) => (suit === 'heart' || suit === 'diamond') ? 'rgba(198,40,40,0.10)' : 'rgba(33,33,33,0.10)'

export function HandCard({ card, disabled, canPlayKill, isFullHp, aoJianActive, hasHongZhuang, isResponse, isJudgeReplace, isPending, isLifted, treasureSelectMode, selectDualMode, selectDiscardMode, isHandCardSelect, hasValidSchemeTarget = true, huiChunAvailable, shadowed = false, hasLeiInJudge = false, onPlayKill, onPlayHeal, onEquip, onPlayScheme, onPlaySchemeSelf, onJudgeReplace, onRespondWithCard, onHuiChunHeal }: Props) {
  const isKill = card.name === '杀'
  const isHeal = card.name === '药'
  const isEquip = card.type === 'equipment'
  const isScheme = card.type === 'scheme'
  const isSelfTargeted = card.name === '手捧雷' || card.name === '无中生有' || card.name === '休养生息' || card.name === '万箭齐发' || card.name === '烽火狼烟' || card.name === '五谷丰登'

  const effectiveIsRed = isRedSuit(card.suit) || (hasHongZhuang && isBlackSuit(card.suit))
  const canUseAsKill = isKill || (aoJianActive && effectiveIsRed)
  const canUseAsKillNow = canUseAsKill && canPlayKill

  const isWuXie = card.name === '无懈可击'
  const isDodge = card.name === '闪'
  const isLei = card.name === '手捧雷'
  const canRespond = isResponse && onRespondWithCard && (canUseAsKill || isWuXie || isDodge)

  // 选牌模式(弃牌/侠胆/曼舞/天香/补刀/超脱/treasure/...)整张牌都不加阴影, 玩家正在做选择
  // 傲剑下红色牌当杀: canUseAsKill=true 也不再视为"不可用" (药满血/雷已在判定区/...)
  const isShadowedByRule = shadowed || (
    !isResponse && !isHandCardSelect && (
      (isDodge && !canUseAsKill) ||
      isWuXie ||
      (isHeal && isFullHp && !canUseAsKill) ||
      (isLei && hasLeiInJudge && !canUseAsKill)
    )
  )

  const canHuiChun = huiChunAvailable && card.suit === 'heart' && !isFullHp && !!onHuiChunHeal

  const canUse = !disabled && !treasureSelectMode && !selectDualMode && !selectDiscardMode && (
    isJudgeReplace ||
    canRespond ||
    canUseAsKillNow ||
    (isHeal && !isFullHp) ||
    isEquip ||
    (isSelfTargeted && !(isLei && hasLeiInJudge) && !!onPlaySchemeSelf) ||
    (isScheme && !isSelfTargeted && card.name !== '无懈可击' && hasValidSchemeTarget && !!onPlayScheme) ||
    canHuiChun
  )

  const handleClick = () => {
    if (!canUse) return
    if (isJudgeReplace && onJudgeReplace) {
      onJudgeReplace(card.id)
      return
    }
    if (canRespond && onRespondWithCard) {
      onRespondWithCard(card.id)
      return
    }
    if (canHuiChun && onHuiChunHeal) {
      onHuiChunHeal(card.id)
      return
    }
    if (canUseAsKillNow) onPlayKill(card.id)
    else if (isHeal) onPlayHeal(card.id)
    else if (isEquip) onEquip(card.id)
    else if (isSelfTargeted && onPlaySchemeSelf) onPlaySchemeSelf(card.id)
    else if (isScheme && onPlayScheme) onPlayScheme(card.id)
  }

  const theme = TYPE_THEME[card.type] ?? TYPE_THEME.basic
  const num = card.number > 13 ? '' : card.number === 1 ? 'A' : card.number > 10 ? ['J','Q','K'][card.number - 11] : String(card.number)
  const mainChar = card.name.length > 2 ? card.name.slice(0, 2) : card.name
  const cardImg = CARD_IMAGES[card.name]

  // 字号自适应: 长名字缩小
  const mainFontSize = card.name.length >= 3 ? 15 : 22
  const waterFontSize = card.name.length >= 3 ? 35 : 56

  // 牌提示: 傲剑下当杀优先显示杀说明, 否则被规则禁用时显示禁用提示
  // disabled 状态下不显示 tooltip (复仇触发/选择/濒死救援等待期间)
  const cardTitle = (!disabled && !isResponse && !isHandCardSelect)
    ? (canUseAsKillNow && !isKill
        ? '当杀: 对攻击范围内的1名其他角色使用, 造成1点伤害'
        : isShadowedByRule
          ? '此牌不可主动使用 (需响应时除外)'
          : undefined)
    : undefined

  return (
    <div
      onClick={handleClick}
      title={cardTitle}
      style={{
        position: 'relative',
        width: '72px',
        height: '110px',
        background: `linear-gradient(135deg, ${theme.bg1} 0%, ${theme.bg2} 50%, ${theme.bg3} 100%)`,
        border: `1.5px solid ${theme.border}`,
        borderRadius: '4px',
        boxShadow: '0 3px 6px rgba(0,0,0,0.5), inset 0 0 8px rgba(139,105,20,0.2)',
        cursor: (canUse || treasureSelectMode || selectDualMode || selectDiscardMode || isHandCardSelect) ? 'pointer' : 'default',
        opacity: (canUse || treasureSelectMode || selectDualMode || selectDiscardMode || isHandCardSelect) ? (isShadowedByRule && !isResponse && !isHandCardSelect ? 0.5 : 1) : 0.45,
        filter: (isShadowedByRule && !isResponse && !isHandCardSelect) ? 'grayscale(0.4) brightness(0.85)' : 'none',
        transition: 'all 0.15s',
        userSelect: 'none',
        overflow: 'hidden',
        transform: (isPending || isLifted) ? 'translateY(-4px)' : 'translateY(0)',
        zIndex: (isPending || isLifted) ? 1 : 0,
        fontFamily: "'KaiTi', 'STKaiti', serif",
      }}
    >
      {/* 双层装饰边框 (实线+虚线) */}
      <div style={{ position: 'absolute', inset: '2px', border: `1px solid ${theme.corner}`, borderRadius: '3px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '3.5px', border: `1px dashed ${theme.corner}`, borderRadius: '2px', opacity: 0.55, pointerEvents: 'none' }} />

      {/* 背景水印: 有图用 PNG (居中), 无图用大字 */}
      {cardImg ? (
        <img
          src={cardImg}
          alt={card.name}
          draggable={false}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60px', height: '60px', objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: waterFontSize, color: suitWaterColor(card.suit),
          fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none',
          letterSpacing: '0.05em',
        }}>{mainChar}</div>
      )}

      {/* 角落花色+数字 (左上) */}
      <div style={{ position: 'absolute', top: '3px', left: '3px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, color: suitFontColor(card.suit) }}>
        <span style={{ fontSize: '8px', fontWeight: 'bold' }}>{suitSymbol[card.suit]}</span>
        <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{num}</span>
      </div>

      {/* 角落花色+数字 (右下, 正向) */}
      <div style={{ position: 'absolute', bottom: '3px', right: '3px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, color: suitFontColor(card.suit) }}>
        <span style={{ fontSize: '8px', fontWeight: 'bold' }}>{suitSymbol[card.suit]}</span>
        <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{num}</span>
      </div>

      {/* 类型标签 (顶部居中) — 仅无图时显示 */}
      {!cardImg && (
        <div style={{
          position: 'absolute', top: '5px', left: 0, right: 0,
          textAlign: 'center', color: theme.main,
          fontSize: '6px', letterSpacing: '1px', fontWeight: 'bold',
        }}>{TYPE_LABEL[card.type]}</div>
      )}

      {/* SVG 图标 (中部) — 仅无图时显示 */}
      {!cardImg && (
        <div style={{ position: 'absolute', top: '21px', left: 0, right: 0, textAlign: 'center' }}>
          <CardIcon card={card} themeMain={theme.main} />
        </div>
      )}

      {/* 主字 (底部) — 仅无图时显示 */}
      {!cardImg && (
        <div style={{
          position: 'absolute', bottom: card.name.length >= 3 ? '7px' : '10px', left: 0, right: 0,
          textAlign: 'center',
          color: isKill && effectiveIsRed ? '#c62828' : theme.main,
          fontSize: mainFontSize, fontWeight: 'bold', lineHeight: 1,
          textShadow: isKill && effectiveIsRed ? '0 0 4px rgba(198,40,40,0.4)' : 'none',
        }}>{mainChar}</div>
      )}

      {/* 响应/杀/回春 徽章 */}
      {effectiveIsRed && canUseAsKillNow && !isJudgeReplace && (aoJianActive || !isKill) && (
        <div style={{
          position: 'absolute', top: '4px', right: '4px',
          background: '#e57373', color: '#fff', fontSize: '10px',
          padding: '0 3px', borderRadius: '2px', fontWeight: 'bold',
        }}>当杀</div>
      )}
      {isResponse && canUseAsKill && (
        <div style={{
          position: 'absolute', top: '-5px', left: '-3px',
          background: '#ff9800', color: '#fff', fontSize: '7px',
          padding: '0 3px', borderRadius: '2px', fontWeight: 'bold',
        }}>响应</div>
      )}
      {canHuiChun && (
        <div style={{
          position: 'absolute', top: '-5px', left: '-3px',
          background: '#e91e63', color: '#fff', fontSize: '7px',
          padding: '0 3px', borderRadius: '2px', fontWeight: 'bold',
        }}>回春</div>
      )}
    </div>
  )
}

// 牌面 SVG 图标 — 每张牌独立设计
function CardIcon({ card, themeMain }: { card: Card; themeMain: string }) {
  const color = themeMain
  const accent = '#ffd54f'
  switch (card.name) {
    // ========== 基本牌 ==========
    case '杀':
      // 长剑 (竖立, 银刃+金护手+黑握柄)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <polygon points="11,1 13,1 12.3,14 11.7,14" fill="#e0e0e0" stroke="#212121" strokeWidth="0.5" />
          <rect x="9" y="14" width="6" height="2" fill="#5d4037" />
          <rect x="10" y="16" width="4" height="5" fill="#3e2723" />
          <line x1="10" y1="17.5" x2="14" y2="17.5" stroke={accent} strokeWidth="0.4" />
          <line x1="10" y1="19" x2="14" y2="19" stroke={accent} strokeWidth="0.4" />
          <circle cx="12" cy="22" r="1.2" fill={accent} stroke="#5d4037" strokeWidth="0.3" />
        </svg>
      )
    case '闪':
      // 盾牌 (蓝纹金边盾牌)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path d="M12 2 L4 5 L4 12 C4 17 7.5 21 12 22 C16.5 21 20 17 20 12 L20 5 Z"
                fill={color} stroke="#5d4037" strokeWidth="0.8" />
          <path d="M12 4 L6 6.5 L6 12 C6 16 8.5 19 12 20 C15.5 19 18 16 18 12 L18 6.5 Z"
                fill="none" stroke={accent} strokeWidth="0.8" />
          <circle cx="12" cy="11" r="2" fill={accent} stroke="#5d4037" strokeWidth="0.4" />
        </svg>
      )
    case '药':
      // 葫芦 (红葫芦 + 绿叶)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path d="M10 2 Q10 4 11 5 L11 6 Q7 7 6 11 Q5 18 12 20 Q19 18 18 11 Q17 7 13 6 L13 5 Q14 4 14 2 Z"
                fill={color} stroke="#5d4037" strokeWidth="0.6" />
          <path d="M10 2 Q10 4 11 5 L13 5 Q14 4 14 2 Q13 1 12 1 Q11 1 10 2 Z" fill="#5d4037" />
          <path d="M12 1 L12 3" stroke="#2e7d32" strokeWidth="0.6" />
          <ellipse cx="10" cy="10" rx="2" ry="1" fill="#fff" opacity="0.4" />
          <text x="12" y="14" fontSize="3" fill={accent} textAnchor="middle" fontFamily="serif" fontWeight="bold">药</text>
        </svg>
      )

    // ========== 锦囊牌 ==========
    case '无中生有':
      // 宝箱 (开启宝箱+光芒+金币)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 光芒 */}
          {[0,1,2,3,4].map(i => (
            <line key={i} x1="12" y1="2" x2="12" y2="5"
                  stroke={accent} strokeWidth="0.6" transform={`rotate(${i * 30} 12 12)`} />
          ))}
          {/* 宝箱盖 (开) */}
          <path d="M5 9 L19 9 L18 6 L6 6 Z" fill={color} stroke="#5d4037" strokeWidth="0.6" />
          {/* 宝箱身 */}
          <rect x="5" y="9" width="14" height="9" fill={color} stroke="#5d4037" strokeWidth="0.6" />
          {/* 锁 */}
          <rect x="11" y="11" width="2" height="3" fill={accent} />
          <circle cx="12" cy="14" r="0.6" fill="#5d4037" />
          {/* 金币 */}
          <circle cx="9" cy="20" r="1.2" fill={accent} stroke="#5d4037" strokeWidth="0.3" />
          <circle cx="15" cy="21" r="1" fill={accent} stroke="#5d4037" strokeWidth="0.3" />
        </svg>
      )
    case '决斗':
      // 交叉双剑
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <g transform="rotate(45 12 12)">
            <polygon points="11,3 13,3 12.3,15 11.7,15" fill="#e0e0e0" stroke="#212121" strokeWidth="0.4" />
            <rect x="9" y="15" width="6" height="1.5" fill="#5d4037" />
            <rect x="10.5" y="16.5" width="3" height="4" fill="#3e2723" />
            <circle cx="12" cy="21" r="0.8" fill={accent} />
          </g>
          <g transform="rotate(-45 12 12)">
            <polygon points="11,3 13,3 12.3,15 11.7,15" fill={color} stroke="#5d4037" strokeWidth="0.4" />
            <rect x="9" y="15" width="6" height="1.5" fill="#5d4037" />
            <rect x="10.5" y="16.5" width="3" height="4" fill="#3e2723" />
            <circle cx="12" cy="21" r="0.8" fill={accent} />
          </g>
          {/* 中心火花 */}
          <circle cx="12" cy="12" r="1.5" fill={accent} stroke="#c62828" strokeWidth="0.4" />
        </svg>
      )
    case '万箭齐发':
      // 漫天箭雨
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {[
            { x: 3, y: 4, a: 35 },
            { x: 8, y: 3, a: 25 },
            { x: 13, y: 2, a: 15 },
            { x: 18, y: 4, a: -25 },
            { x: 5, y: 9, a: 30 },
            { x: 11, y: 7, a: 10 },
            { x: 17, y: 9, a: -20 },
            { x: 8, y: 13, a: 20 },
            { x: 14, y: 13, a: -10 },
            { x: 11, y: 17, a: 5 },
          ].map((arr, i) => (
            <g key={i} transform={`translate(${arr.x} ${arr.y}) rotate(${arr.a})`}>
              <line x1="0" y1="0" x2="4" y2="0" stroke="#5d4037" strokeWidth="0.5" />
              <polygon points="4,0 6,-0.8 6,0.8" fill={color} stroke="#212121" strokeWidth="0.2" />
              <line x1="-1" y1="-1" x2="0" y2="0" stroke={color} strokeWidth="0.4" />
              <line x1="-1" y1="1" x2="0" y2="0" stroke={color} strokeWidth="0.4" />
            </g>
          ))}
        </svg>
      )
    case '烽火狼烟':
      // 烽火台 (城楼+火焰)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 火焰 */}
          <path d="M9 2 Q8 4 9 5 Q7 4 8 6 Q6 5 7 7 L11 7 Q12 5 11 4 Q12 5 12 3 Q11 2 9 2 Z"
                fill={accent} stroke="#c62828" strokeWidth="0.4" />
          <path d="M14 1 Q13 3 14 4 Q12 3 13 5 Q11 4 12 6 L16 6 Q17 4 16 3 Q17 4 17 2 Q16 1 14 1 Z"
                fill={color} stroke="#c62828" strokeWidth="0.4" />
          {/* 烽火台 (城楼) */}
          <rect x="6" y="7" width="12" height="13" fill="#5d4037" stroke="#3e2723" strokeWidth="0.4" />
          <rect x="5" y="6" width="14" height="2" fill="#5d4037" stroke="#3e2723" strokeWidth="0.4" />
          {/* 垛口 */}
          {[6, 9, 12, 15, 18].map(x => (
            <rect key={x} x={x-0.5} y="4" width="1" height="2" fill="#5d4037" />
          ))}
          {/* 门 */}
          <rect x="11" y="14" width="2" height="6" fill="#212121" />
          <rect x="10" y="20" width="4" height="2" fill="#3e2723" />
        </svg>
      )
    case '无懈可击':
      // 锁链 + X (挡住来犯)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 中心盾形 */}
          <path d="M12 3 L18 6 L18 12 C18 16 15 19 12 20 C9 19 6 16 6 12 L6 6 Z"
                fill={color} stroke="#5d4037" strokeWidth="0.6" />
          {/* 锁链环 */}
          <circle cx="12" cy="11" r="3" fill="none" stroke="#212121" strokeWidth="1.2" />
          <circle cx="12" cy="11" r="3" fill="none" stroke={accent} strokeWidth="0.4" />
          {/* X 符号 */}
          <line x1="10" y1="9" x2="14" y2="13" stroke="#c62828" strokeWidth="1.2" />
          <line x1="14" y1="9" x2="10" y2="13" stroke="#c62828" strokeWidth="1.2" />
        </svg>
      )
    case '五谷丰登':
      // 麦穗 (三束麦穗)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {[0, 1, 2].map(i => (
            <g key={i} transform={`translate(${6 + i * 5} ${i === 1 ? 4 : 6})`}>
              <line x1="0" y1="0" x2="0" y2="14" stroke="#8b6914" strokeWidth="0.8" />
              {[-3, -1.5, 0, 1.5, 3].map((dy, j) => (
                <ellipse key={j} cx={j % 2 === 0 ? -2.5 : 2.5} cy={dy + 1}
                         rx="1.2" ry="0.6" fill={accent} stroke="#8b6914" strokeWidth="0.3"
                         transform={`rotate(${j % 2 === 0 ? -30 : 30} ${j % 2 === 0 ? -2.5 : 2.5} ${dy + 1})`} />
              ))}
            </g>
          ))}
          {/* 红丝带 */}
          <path d="M3 20 Q12 17 21 20 L21 22 L3 22 Z" fill="#c62828" />
        </svg>
      )
    case '探囊取物':
      // 袋 + 手 (探囊)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 袋口 */}
          <ellipse cx="9" cy="9" rx="6" ry="2" fill="#212121" />
          <ellipse cx="9" cy="9" rx="5" ry="1.4" fill="#5d4037" />
          {/* 袋身 */}
          <path d="M4 9 Q3 18 9 21 Q15 18 14 9 Z" fill={color} stroke="#5d4037" strokeWidth="0.6" />
          {/* 抽绳 */}
          <line x1="5" y1="7" x2="3" y2="4" stroke="#5d4037" strokeWidth="0.6" />
          <line x1="13" y1="7" x2="15" y2="4" stroke="#5d4037" strokeWidth="0.6" />
          <circle cx="3" cy="4" r="0.8" fill={accent} />
          <circle cx="15" cy="4" r="0.8" fill={accent} />
          {/* 伸进袋的手 */}
          <g transform="translate(15 12) rotate(-20)">
            <ellipse cx="3" cy="2" rx="2.5" ry="1.5" fill="#f4c4a0" stroke="#5d4037" strokeWidth="0.4" />
            <line x1="5" y1="2" x2="8" y2="2" stroke="#f4c4a0" strokeWidth="1" />
          </g>
          {/* 金币 */}
          <circle cx="9" cy="14" r="1.2" fill={accent} stroke="#5d4037" strokeWidth="0.3" />
        </svg>
      )
    case '釜底抽薪':
      // 锅 + 柴火
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 锅 */}
          <ellipse cx="12" cy="10" rx="7" ry="1.5" fill="#5d4037" />
          <path d="M5 10 L6 18 Q9 21 12 21 Q15 21 18 18 L19 10 Z" fill="#212121" stroke="#5d4037" strokeWidth="0.5" />
          {/* 锅耳 */}
          <ellipse cx="4" cy="11" rx="1" ry="0.6" fill="#5d4037" />
          <ellipse cx="20" cy="11" rx="1" ry="0.6" fill="#5d4037" />
          {/* 柴火 (从锅底抽出) */}
          <line x1="9" y1="22" x2="8" y2="14" stroke="#8b6914" strokeWidth="1" />
          <line x1="11" y1="22" x2="11" y2="13" stroke="#a0855a" strokeWidth="0.8" />
          <line x1="13" y1="22" x2="14" y2="14" stroke="#8b6914" strokeWidth="0.8" />
          <line x1="15" y1="22" x2="16" y2="15" stroke="#a0855a" strokeWidth="0.8" />
          {/* 火焰 */}
          <path d="M10 13 Q9 11 10 9 Q11 10 11 8 Q12 9 12 11 Q13 10 13 9 Q14 10 14 12 Z"
                fill={accent} />
        </svg>
      )
    case '借刀杀人':
      // 借字 + 刀
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 刀 (横放) */}
          <g transform="rotate(-15 12 12)">
            <rect x="3" y="11" width="14" height="2" fill="#e0e0e0" stroke="#212121" strokeWidth="0.4" />
            <polygon points="17,12 20,11 20,13" fill="#9e9e9e" stroke="#212121" strokeWidth="0.3" />
            <rect x="1" y="10" width="2" height="4" fill="#5d4037" />
            <rect x="-1" y="10.5" width="2" height="3" fill="#3e2723" />
          </g>
          {/* 借字 (左下) */}
          <rect x="2" y="18" width="8" height="4" fill={accent} stroke="#5d4037" strokeWidth="0.4" />
          <text x="6" y="21.5" fontSize="3.5" fill="#212121" textAnchor="middle" fontFamily="'KaiTi',serif" fontWeight="bold">借</text>
        </svg>
      )
    case '手捧雷':
      // 雷云 + 闪电
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 雷云 */}
          <path d="M5 8 Q3 8 3 11 Q3 14 6 14 L18 14 Q21 14 21 11 Q21 8 19 8 Q19 5 16 5 Q15 3 12 3 Q9 3 8 5 Q5 5 5 8 Z"
                fill="#37474f" stroke="#212121" strokeWidth="0.5" />
          {/* 闪电 (粗) */}
          <polygon points="12,7 14,13 12,13 14,20 10,15 12,15 10,7"
                   fill={accent} stroke="#c62828" strokeWidth="0.4" />
        </svg>
      )
    case '画地为牢':
      // 圆形牢笼 (圈+锁链)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 外圈 (画地为牢) */}
          <circle cx="12" cy="13" r="9" fill="none" stroke={color} strokeWidth="1.2" strokeDasharray="2,1" />
          <circle cx="12" cy="13" r="9" fill="none" stroke="#5d4037" strokeWidth="0.4" />
          {/* 锁链竖 */}
          {[8, 12, 16].map(x => (
            <g key={x}>
              <ellipse cx={x} cy="8" rx="1.2" ry="1.5" fill="none" stroke="#212121" strokeWidth="0.8" />
              <ellipse cx={x} cy="11" rx="1.2" ry="1.5" fill="none" stroke="#212121" strokeWidth="0.8" />
              <ellipse cx={x} cy="14" rx="1.2" ry="1.5" fill="none" stroke="#212121" strokeWidth="0.8" />
              <ellipse cx={x} cy="17" rx="1.2" ry="1.5" fill="none" stroke="#212121" strokeWidth="0.8" />
            </g>
          ))}
          {/* 锁 */}
          <rect x="10" y="12" width="4" height="4" fill={accent} stroke="#5d4037" strokeWidth="0.4" rx="0.5" />
          <circle cx="12" cy="14" r="0.6" fill="#212121" />
        </svg>
      )
    case '休养生息':
      // 月亮 + 山
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 月亮 */}
          <path d="M16 4 A6 6 0 1 0 16 16 A4 4 0 1 1 16 4 Z" fill={accent} stroke="#5d4037" strokeWidth="0.4" />
          {/* 山 */}
          <path d="M2 20 L8 10 L13 16 L18 8 L22 20 Z" fill={color} stroke="#5d4037" strokeWidth="0.5" />
          {/* 山阴影 */}
          <path d="M2 20 L8 10 L10 14 L4 20 Z" fill="rgba(0,0,0,0.2)" />
          <path d="M13 16 L18 8 L20 12 L16 20 Z" fill="rgba(0,0,0,0.2)" />
          {/* 草 */}
          <line x1="6" y1="22" x2="6" y2="20" stroke="#2e7d32" strokeWidth="0.4" />
          <line x1="20" y1="22" x2="20" y2="20" stroke="#2e7d32" strokeWidth="0.4" />
        </svg>
      )

    // ========== 装备 — 武器 ==========
    case '虎符':
      // 虎符 (两半虎形+刻字)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 符身 (左半) */}
          <path d="M3 8 L11 8 L11 16 L3 16 Q1 16 1 14 L1 10 Q1 8 3 8 Z"
                fill={accent} stroke="#5d4037" strokeWidth="0.6" />
          {/* 虎头 (左) */}
          <circle cx="3" cy="12" r="2" fill={accent} stroke="#5d4037" strokeWidth="0.4" />
          <circle cx="3" cy="11" r="0.4" fill="#212121" />
          <path d="M1 12 L0 10 M1 12 L0 14" stroke="#5d4037" strokeWidth="0.4" />
          {/* 符身 (右半) */}
          <path d="M13 8 L21 8 Q23 8 23 10 L23 14 Q23 16 21 16 L13 16 Z"
                fill={accent} stroke="#5d4037" strokeWidth="0.6" />
          {/* 虎头 (右) */}
          <circle cx="21" cy="12" r="2" fill={accent} stroke="#5d4037" strokeWidth="0.4" />
          <circle cx="21" cy="11" r="0.4" fill="#212121" />
          <path d="M23 12 L24 10 M23 12 L24 14" stroke="#5d4037" strokeWidth="0.4" />
          {/* 刻字 */}
          <text x="7" y="13.5" fontSize="2.5" fill="#5d4037" textAnchor="middle" fontFamily="serif" fontWeight="bold">虎</text>
          <text x="17" y="13.5" fontSize="2.5" fill="#5d4037" textAnchor="middle" fontFamily="serif" fontWeight="bold">符</text>
        </svg>
      )
    case '盘龙棍':
      // 龙缠棍
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 棍 */}
          <rect x="11" y="2" width="2" height="20" fill="#5d4037" stroke="#3e2723" strokeWidth="0.3" />
          {/* 金箍 */}
          <rect x="10" y="6" width="4" height="1" fill={accent} />
          <rect x="10" y="17" width="4" height="1" fill={accent} />
          {/* 龙 (缠绕) */}
          <path d="M6 10 Q9 8 12 11 Q15 8 18 10 Q15 12 12 14 Q9 12 6 10 Z" fill={color} stroke="#5d4037" strokeWidth="0.4" />
          <circle cx="6" cy="10" r="0.8" fill={accent} />
          <circle cx="18" cy="10" r="0.8" fill="#212121" />
          <path d="M8 12 L9 11 M16 12 L15 11" stroke="#212121" strokeWidth="0.3" />
        </svg>
      )
    case '鱼肠剑':
      // 短剑 (粗短)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <polygon points="12,2 14,2 13.5,14 12.5,14" fill="#e0e0e0" stroke="#212121" strokeWidth="0.4" />
          <polygon points="12,2 13,2 12.5,5" fill="#bdbdbd" />
          <rect x="9" y="14" width="6" height="1.8" fill="#5d4037" />
          <rect x="10.5" y="15.8" width="3" height="4" fill="#3e2723" />
          <line x1="10.5" y1="17" x2="13.5" y2="17" stroke={accent} strokeWidth="0.3" />
          <line x1="10.5" y1="18" x2="13.5" y2="18" stroke={accent} strokeWidth="0.3" />
          <circle cx="12" cy="21" r="1" fill={accent} stroke="#5d4037" strokeWidth="0.3" />
        </svg>
      )
    case '博浪锤':
      // 锤 (方锤头)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <rect x="9" y="2" width="6" height="9" fill="#5d4037" stroke="#3e2723" strokeWidth="0.5" />
          <rect x="10" y="3" width="4" height="7" fill="#212121" />
          <rect x="8" y="9" width="8" height="2" fill="#5d4037" />
          <rect x="11" y="11" width="2" height="9" fill="#3e2723" />
          <line x1="11" y1="13" x2="13" y2="13" stroke={accent} strokeWidth="0.3" />
          <line x1="11" y1="15" x2="13" y2="15" stroke={accent} strokeWidth="0.3" />
          <line x1="11" y1="17" x2="13" y2="17" stroke={accent} strokeWidth="0.3" />
          <circle cx="12" cy="21" r="1" fill={accent} />
        </svg>
      )
    case '霸王弓':
      // 弓 (大弓+弦)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path d="M5 3 Q3 12 5 21" stroke="#5d4037" strokeWidth="1.5" fill="none" />
          <path d="M7 3 Q5 12 7 21" stroke="#3e2723" strokeWidth="0.8" fill="none" />
          <line x1="5" y1="3" x2="5" y2="21" stroke={accent} strokeWidth="0.4" />
          {/* 弦 */}
          <line x1="5" y1="3" x2="5" y2="21" stroke="#fff" strokeWidth="0.3" />
          {/* 箭 */}
          <line x1="6" y1="12" x2="22" y2="12" stroke="#5d4037" strokeWidth="0.6" />
          <polygon points="22,12 24,11 24,13" fill={color} stroke="#212121" strokeWidth="0.2" />
          <line x1="5.5" y1="11" x2="5.5" y2="13" stroke={color} strokeWidth="0.4" />
          <line x1="6" y1="11" x2="6" y2="13" stroke={color} strokeWidth="0.4" />
        </svg>
      )
    case '芦叶枪':
      // 枪 (长枪+红缨)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 红缨 */}
          <ellipse cx="12" cy="6" rx="2" ry="3" fill="#c62828" stroke="#7f0000" strokeWidth="0.4" />
          <line x1="10" y1="3" x2="9" y2="6" stroke="#c62828" strokeWidth="0.5" />
          <line x1="14" y1="3" x2="15" y2="6" stroke="#c62828" strokeWidth="0.5" />
          {/* 枪尖 */}
          <polygon points="12,8 14,9 12,12 10,9" fill="#e0e0e0" stroke="#212121" strokeWidth="0.4" />
          {/* 枪杆 */}
          <rect x="11.5" y="9" width="1" height="13" fill="#5d4037" stroke="#3e2723" strokeWidth="0.2" />
          {/* 杆尾 */}
          <circle cx="12" cy="22" r="1" fill={accent} stroke="#5d4037" strokeWidth="0.3" />
        </svg>
      )
    case '龙鳞刀':
      // 弯刀 (曲刃+龙鳞纹)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path d="M11 2 Q15 8 14 16 L12 17 Q9 12 11 2 Z" fill="#e0e0e0" stroke="#212121" strokeWidth="0.4" />
          {/* 龙鳞纹 */}
          <path d="M11 6 L12 7 M11 9 L12 10 M11 12 L12 13 M11.5 15 L12.5 16" stroke="#212121" strokeWidth="0.3" />
          {/* 护手 */}
          <rect x="9" y="16" width="6" height="1.8" fill="#5d4037" />
          {/* 握柄 */}
          <rect x="10" y="17.8" width="4" height="4" fill="#3e2723" />
          <line x1="10" y1="19" x2="14" y2="19" stroke={accent} strokeWidth="0.4" />
          <line x1="10" y1="20.5" x2="14" y2="20.5" stroke={accent} strokeWidth="0.4" />
          <circle cx="12" cy="22.5" r="0.8" fill={accent} />
        </svg>
      )
    case '狼牙棒':
      // 狼牙棒 (钉头棒)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 棒头 (椭圆+狼牙) */}
          <ellipse cx="12" cy="6" rx="3" ry="5" fill="#5d4037" stroke="#3e2723" strokeWidth="0.5" />
          {[0,1,2,3,4,5].map(i => (
            <g key={i} transform={`rotate(${i * 60} 12 6)`}>
              <polygon points="12,2 13,4 12,3.5 11,4" fill={accent} stroke="#5d4037" strokeWidth="0.2" />
            </g>
          ))}
          {/* 钉子 */}
          {[1,3,5].map(i => (
            <circle key={i} cx="12" cy="6" r="0.5" fill="#212121" transform={`rotate(${i * 60} 12 6) translate(0 -2.5)`} />
          ))}
          {/* 棒柄 */}
          <rect x="11" y="11" width="2" height="11" fill="#3e2723" stroke="#212121" strokeWidth="0.3" />
          <line x1="11" y1="14" x2="13" y2="14" stroke={accent} strokeWidth="0.3" />
          <line x1="11" y1="17" x2="13" y2="17" stroke={accent} strokeWidth="0.3" />
          <line x1="11" y1="20" x2="13" y2="20" stroke={accent} strokeWidth="0.3" />
        </svg>
      )

    // ========== 装备 — 坐骑 ==========
    case '进攻马':
      return <MountIcon color={color} accent={accent} type="attack" />
    case '防御马':
      return <MountIcon color={color} accent={accent} type="defense" />

    // ========== 装备 — 防具 ==========
    case '玉如意':
      // 如意 (S 形金如意)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path d="M5 4 Q9 4 11 8 Q12 10 12 12 Q12 14 11 16 Q9 20 5 20 Q3 20 3 18 Q3 16 5 16 Q7 16 8 14 L8 10 Q7 8 5 8 Q3 8 3 6 Q3 4 5 4 Z"
                fill={accent} stroke="#5d4037" strokeWidth="0.5" />
          <circle cx="6" cy="5.5" r="1" fill={color} stroke="#5d4037" strokeWidth="0.3" />
          <circle cx="6" cy="18.5" r="1" fill={color} stroke="#5d4037" strokeWidth="0.3" />
          <rect x="11" y="11" width="3" height="2" fill={color} />
          <rect x="14" y="10" width="5" height="4" fill={color} stroke="#5d4037" strokeWidth="0.4" />
          <text x="16.5" y="13" fontSize="2.5" fill={accent} textAnchor="middle" fontFamily="serif" fontWeight="bold">吉</text>
        </svg>
      )
    case '乾坤袋':
      // 袋 (大布袋+束口)
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          {/* 束口绳 */}
          <path d="M8 4 Q12 2 16 4" stroke="#5d4037" strokeWidth="1" fill="none" />
          <circle cx="9" cy="3" r="0.6" fill={accent} />
          <circle cx="15" cy="3" r="0.6" fill={accent} />
          {/* 袋口 */}
          <ellipse cx="12" cy="6" rx="6" ry="1.5" fill="#212121" />
          <ellipse cx="12" cy="6" rx="5" ry="1" fill="#5d4037" />
          {/* 袋身 */}
          <path d="M5 7 Q3 16 7 20 Q12 22 17 20 Q21 16 19 7 Z" fill={color} stroke="#5d4037" strokeWidth="0.6" />
          {/* 袋纹 (八卦) */}
          <g transform="translate(12 13)">
            <circle r="2" fill="none" stroke={accent} strokeWidth="0.5" />
            <path d="M-1.5 -1 L1.5 -1 L1.5 0 A1.5 1.5 0 0 1 0 1.5 A1.5 1.5 0 0 1 -1.5 0 Z" fill={accent} />
            <path d="M-1.5 1 L1.5 1 L1.5 0 A1.5 1.5 0 0 0 0 -1.5 A1.5 1.5 0 0 0 -1.5 0 Z" fill={color} />
          </g>
        </svg>
      )

    default:
      // 兜底: 交叉剑
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
          <path d="M6.92 5L5 6.92l6.84 6.84-2.05 4.05 1.41 1.41 4.05-4.05 6.84 6.84L23.92 20 19 15.08l4.05-4.05-1.41-1.41-4.05 2.05L11.75 5.83 13.92 3.66 12.5 2.25 9.83 4.92z"/>
        </svg>
      )
  }
}

// 坐骑图标 (攻击/防御区别颜色与箭头方向)
function MountIcon({ color, accent, type }: { color: string; accent: string; type: 'attack' | 'defense' }) {
  return (
    <svg width="25" height="22" viewBox="0 0 32 32">
      {/* 马头 (左) */}
      <path d="M4 16 Q6 10 12 10 L18 12 L22 14 L20 18 L18 19 L18 22 L20 22 L20 25 L16 25 L16 22 L12 22 L12 19 Q9 19 6 21 L4 20 Z"
            fill={color} stroke="#3e2723" strokeWidth="0.6" />
      {/* 马眼 */}
      <circle cx="9" cy="14" r="0.8" fill="#212121" />
      {/* 马鬃 */}
      <path d="M4 12 L2 10 M4 14 L2 13 M4 16 L2 16" stroke="#3e2723" strokeWidth="0.6" />
      {/* 马鼻 */}
      <ellipse cx="5" cy="17" rx="1" ry="0.6" fill="#212121" opacity="0.4" />
      {/* 缰绳 */}
      <line x1="22" y1="14" x2="28" y2="16" stroke="#5d4037" strokeWidth="0.6" />
      <line x1="28" y1="16" x2="28" y2="22" stroke="#5d4037" strokeWidth="0.6" />
      {/* 攻击/防御符号 */}
      {type === 'attack' ? (
        <>
          {/* 红箭头 (攻击) */}
          <path d="M26 4 L30 6 L26 8 L28 6 Z" fill="#c62828" stroke="#7f0000" strokeWidth="0.4" />
          <path d="M24 8 L28 10 L24 12 L26 10 Z" fill="#c62828" stroke="#7f0000" strokeWidth="0.4" />
        </>
      ) : (
        <>
          {/* 蓝盾 (防御) */}
          <path d="M26 2 L30 4 L30 8 Q30 11 26 12 Q22 11 22 8 L22 4 Z" fill={color} stroke="#0d47a1" strokeWidth="0.5" />
          <path d="M25 6 L27 8 L29 5" stroke="#fff" strokeWidth="0.8" fill="none" />
        </>
      )}
    </svg>
  )
}
