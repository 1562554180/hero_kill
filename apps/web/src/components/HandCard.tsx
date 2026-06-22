import type { Card } from '@hero-legend/shared-types'
import { isRedSuit, isBlackSuit } from '@hero-legend/shared-types'

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

export function HandCard({ card, disabled, canPlayKill, isFullHp, aoJianActive, hasHongZhuang, isResponse, isJudgeReplace, isPending, isLifted, treasureSelectMode, selectDualMode, selectDiscardMode, hasValidSchemeTarget = true, huiChunAvailable, shadowed = false, hasLeiInJudge = false, onPlayKill, onPlayHeal, onEquip, onPlayScheme, onPlaySchemeSelf, onJudgeReplace, onRespondWithCard, onHuiChunHeal }: Props) {
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

  const isShadowedByRule = shadowed || (
    !isResponse && (
      (isDodge && !(aoJianActive && effectiveIsRed && canUseAsKill)) ||
      isWuXie ||
      (isHeal && isFullHp) ||
      (isLei && hasLeiInJudge)
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

  // 字号自适应: 长名字缩小
  const mainFontSize = card.name.length >= 3 ? 15 : 22
  const waterFontSize = card.name.length >= 3 ? 35 : 56

  return (
    <div
      onClick={handleClick}
      title={isShadowedByRule && !isResponse ? '此牌不可主动使用 (需响应时除外)' : undefined}
      style={{
        position: 'relative',
        width: '55px',
        height: '84px',
        background: `linear-gradient(135deg, ${theme.bg1} 0%, ${theme.bg2} 50%, ${theme.bg3} 100%)`,
        border: `1.5px solid ${theme.border}`,
        borderRadius: '4px',
        boxShadow: '0 3px 6px rgba(0,0,0,0.5), inset 0 0 8px rgba(139,105,20,0.2)',
        cursor: (canUse || treasureSelectMode || selectDualMode || selectDiscardMode) ? 'pointer' : 'default',
        opacity: (canUse || treasureSelectMode || selectDualMode || selectDiscardMode) ? (isShadowedByRule && !isResponse ? 0.5 : 1) : 0.45,
        filter: isShadowedByRule && !isResponse ? 'grayscale(0.4) brightness(0.85)' : 'none',
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

      {/* 背景水印大字 */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: waterFontSize, color: suitWaterColor(card.suit),
        fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none',
        letterSpacing: '0.05em',
      }}>{mainChar}</div>

      {/* 角落花色+数字 (左上) */}
      <div style={{ position: 'absolute', top: '3px', left: '3px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, color: suitFontColor(card.suit) }}>
        <span style={{ fontSize: '8px', fontWeight: 'bold' }}>{suitSymbol[card.suit]}</span>
        <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{num}</span>
      </div>

      {/* 角落花色+数字 (右下, 旋转180) */}
      <div style={{ position: 'absolute', bottom: '3px', right: '3px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, color: suitFontColor(card.suit), transform: 'rotate(180deg)' }}>
        <span style={{ fontSize: '8px', fontWeight: 'bold' }}>{suitSymbol[card.suit]}</span>
        <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{num}</span>
      </div>

      {/* 类型标签 (顶部居中) */}
      <div style={{
        position: 'absolute', top: '5px', left: 0, right: 0,
        textAlign: 'center', color: theme.main,
        fontSize: '6px', letterSpacing: '1px', fontWeight: 'bold',
      }}>{TYPE_LABEL[card.type]}</div>

      {/* SVG 图标 (中部) */}
      <div style={{ position: 'absolute', top: '21px', left: 0, right: 0, textAlign: 'center' }}>
        <CardIcon card={card} themeMain={theme.main} />
      </div>

      {/* 主字 (底部) */}
      <div style={{
        position: 'absolute', bottom: card.name.length >= 3 ? '7px' : '10px', left: 0, right: 0,
        textAlign: 'center',
        color: isKill && effectiveIsRed ? '#c62828' : theme.main,
        fontSize: mainFontSize, fontWeight: 'bold', lineHeight: 1,
        textShadow: isKill && effectiveIsRed ? '0 0 4px rgba(198,40,40,0.4)' : 'none',
      }}>{mainChar}</div>

      {/* 响应/杀/回春 徽章 */}
      {effectiveIsRed && canUseAsKillNow && !isJudgeReplace && (aoJianActive || !isKill) && (
        <div style={{
          position: 'absolute', top: '-5px', right: '-3px',
          background: '#e57373', color: '#fff', fontSize: '7px',
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

// 牌面 SVG 图标 — 杀/剑, 闪/盾, 锦囊/交叉剑, 装备/弓
function CardIcon({ card, themeMain }: { card: Card; themeMain: string }) {
  const color = themeMain
  if (card.name === '杀') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
        <path d="M6.92 5L5 6.92l6.84 6.84-2.05 4.05 1.41 1.41 4.05-4.05 6.84 6.84L23.92 20 19 15.08l4.05-4.05-1.41-1.41-4.05 2.05L11.75 5.83 13.92 3.66 12.5 2.25 9.83 4.92z"/>
      </svg>
    )
  }
  if (card.name === '闪') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
      </svg>
    )
  }
  if (card.type === 'equipment') {
    return (
      <svg width="25" height="22" viewBox="0 0 32 32" fill={color}>
        <path d="M3 16C8 8 18 6 26 6l3-3-1 5 3-2-3 4-3-1 1 4-3-2c-7 0-15 2-20 5z"/>
      </svg>
    )
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
      <path d="M6.92 5L5 6.92l6.84 6.84-2.05 4.05 1.41 1.41 4.05-4.05 6.84 6.84L23.92 20 19 15.08l4.05-4.05-1.41-1.41-4.05 2.05L11.75 5.83 13.92 3.66 12.5 2.25 9.83 4.92z"/>
    </svg>
  )
}
