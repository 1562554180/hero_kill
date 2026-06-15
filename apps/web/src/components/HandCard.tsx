import type { Card } from '@hero-legend/shared-types'
import { isRedSuit, isBlackSuit } from '@hero-legend/shared-types'

interface Props {
  card: Card
  disabled: boolean
  canPlayKill: boolean
  isFullHp: boolean
  aoJianActive: boolean
  hasHongZhuang: boolean
  isResponse?: boolean  // 响应模式 (决斗/南蛮入侵): 只能出杀
  isJudgeReplace?: boolean
  isPending?: boolean  // 玩家刚点选等待选目标 (出杀/出锦囊时进入selectTarget)
  treasureSelectMode?: boolean  // 宝具选牌模式: 禁用常规出牌, 由外层div处理点击
  selectDualMode?: boolean  // 芦叶枪选2张手牌模式: 禁用常规出牌, 由外层div处理点击
  selectDiscardMode?: boolean  // 弃牌阶段选牌模式: 禁用常规出牌, 由外层div处理点击
  onPlayKill: (cardId: string) => void
  onPlayHeal: (cardId: string) => void
  onEquip: (cardId: string) => void
  onPlayScheme?: (cardId: string) => void
  onPlaySchemeSelf?: (cardId: string) => void
  onJudgeReplace?: (cardId: string | null) => void
  onRespondWithCard?: (cardId: string | null) => void
}

const suitSymbol: Record<string, string> = {
  spade: '♠', heart: '♥', diamond: '♦', club: '♣'
}
const suitColor: Record<string, string> = {
  spade: '#fff', heart: '#e57373', diamond: '#e57373', club: '#fff'
}
const typeColor: Record<string, string> = {
  basic: 'var(--text-light)', scheme: '#64b5f6', equipment: '#81c784'
}

export function HandCard({ card, disabled, canPlayKill, isFullHp, aoJianActive, hasHongZhuang, isResponse, isJudgeReplace, isPending, treasureSelectMode, selectDualMode, selectDiscardMode, onPlayKill, onPlayHeal, onEquip, onPlayScheme, onPlaySchemeSelf, onJudgeReplace, onRespondWithCard }: Props) {
  const isKill = card.name === '杀'
  const isHeal = card.name === '药'
  const isEquip = card.type === 'equipment'
  const isScheme = card.type === 'scheme'
  const isSelfTargeted = card.name === '手捧雷' || card.name === '无中生有' || card.name === '休养生息' || card.name === '万箭齐发' || card.name === '烽火狼烟' || card.name === '五谷丰登'

  const effectiveIsRed = isRedSuit(card.suit) || (hasHongZhuang && isBlackSuit(card.suit))
  const canUseAsKill = isKill || (aoJianActive && effectiveIsRed)  // 傲剑主动模式: 红色牌当杀, 包括药

  const canUseAsKillNow = canUseAsKill && canPlayKill

  // 响应模式: 出杀(决斗) / 出无懈可击(抵消锦囊) / 出闪(防杀)
  const isWuXie = card.name === '无懈可击'
  const isDodge = card.name === '闪'
  const canRespond = isResponse && onRespondWithCard && (canUseAsKill || isWuXie || isDodge)

  const canUse = !disabled && !treasureSelectMode && !selectDualMode && !selectDiscardMode && (
    isJudgeReplace ||
    canRespond ||
    canUseAsKillNow ||
    (isHeal && !isFullHp) ||
    isEquip ||
    (isSelfTargeted && !!onPlaySchemeSelf) ||
    (isScheme && !isSelfTargeted && card.name !== '无懈可击' && !!onPlayScheme)
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
    if (canUseAsKillNow) onPlayKill(card.id)
    else if (isHeal) onPlayHeal(card.id)
    else if (isEquip) onEquip(card.id)
    else if (isSelfTargeted && onPlaySchemeSelf) onPlaySchemeSelf(card.id)
    else if (isScheme && onPlayScheme) onPlayScheme(card.id)
  }

  return (
    <div
      onClick={handleClick}
      style={{
        background: 'var(--bg-dark)',
        border: `1px solid ${isJudgeReplace && !disabled ? '#64b5f6' : (canUse || treasureSelectMode || selectDualMode || selectDiscardMode) ? '#8b6914' : '#333'}`,
        borderRadius: '6px',
        padding: '22px 8px 8px',
        cursor: (canUse || treasureSelectMode || selectDualMode || selectDiscardMode) ? 'pointer' : 'default',
        opacity: (canUse || treasureSelectMode || selectDualMode || selectDiscardMode) ? 1 : 0.5,
        minWidth: '60px',
        textAlign: 'center',
        transition: 'all 0.15s',
        userSelect: 'none',
        position: 'relative',
        transform: isPending ? 'translateY(-12px)' : 'translateY(0)',
        boxShadow: isPending ? '0 4px 8px rgba(0,0,0,0.5)' : 'none',
        zIndex: isPending ? 1 : 0,
      }}
    >
      <div style={{ position: 'absolute', top: '4px', left: '6px', color: typeColor[card.type], fontSize: '10px', fontWeight: 'bold', writingMode: 'vertical-rl', lineHeight: 1.1 }}>
        {card.name}
      </div>
      <div style={{ position: 'absolute', top: '4px', right: '6px', color: suitColor[card.suit], fontSize: '11px' }}>
        {suitSymbol[card.suit]}{card.number > 13 ? '' : card.number === 1 ? 'A' : card.number > 10 ? ['J','Q','K'][card.number - 11] : card.number}
      </div>
      <div style={{ color: typeColor[card.type], fontSize: '20px', fontWeight: 'bold', margin: '2px 0 6px', lineHeight: 1.1 }}>
        {card.name.slice(0, 1)}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
        {card.type === 'basic' ? '基本' : card.type === 'scheme' ? '锦囊' : '装备'}
      </div>
      {effectiveIsRed && canUseAsKillNow && !isJudgeReplace && (aoJianActive || !isKill) && (
        <div style={{
          position: 'absolute', top: '-6px', right: '-4px',
          background: '#e57373', color: '#fff', fontSize: '9px',
          padding: '0 4px', borderRadius: '3px', fontWeight: 'bold',
        }}>
          当杀
        </div>
      )}
      {isResponse && canUseAsKill && (
        <div style={{
          position: 'absolute', top: '-6px', left: '-4px',
          background: '#ff9800', color: '#fff', fontSize: '9px',
          padding: '0 4px', borderRadius: '3px', fontWeight: 'bold',
        }}>
          响应
        </div>
      )}
    </div>
  )
}
