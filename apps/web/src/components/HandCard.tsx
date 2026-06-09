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

export function HandCard({ card, disabled, canPlayKill, isFullHp, aoJianActive, hasHongZhuang, isResponse, isJudgeReplace, onPlayKill, onPlayHeal, onEquip, onPlayScheme, onPlaySchemeSelf, onJudgeReplace, onRespondWithCard }: Props) {
  const isKill = card.name === '杀'
  const isHeal = card.name === '药'
  const isEquip = card.type === 'equipment'
  const isScheme = card.type === 'scheme'
  const isSelfTargeted = card.name === '手捧雷' || card.name === '无中生有'

  const effectiveIsRed = isRedSuit(card.suit) || (hasHongZhuang && isBlackSuit(card.suit))
  const canUseAsKill = isKill || (aoJianActive && effectiveIsRed)  // 傲剑主动模式: 红色牌当杀, 包括药

  const canUseAsKillNow = canUseAsKill && canPlayKill

  // 响应模式: 只能出杀(或傲剑红桃/装备)
  const canRespond = isResponse && canUseAsKill && onRespondWithCard

  const canUse = !disabled && (
    isJudgeReplace ||
    canRespond ||
    canUseAsKillNow ||
    (isHeal && !isFullHp) ||
    isEquip ||
    (isSelfTargeted && !!onPlaySchemeSelf) ||
    (isScheme && !isSelfTargeted && !!onPlayScheme)
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
        border: `1px solid ${isJudgeReplace && !disabled ? '#64b5f6' : canUse ? '#8b6914' : '#333'}`,
        borderRadius: '6px',
        padding: '8px 12px',
        cursor: canUse ? 'pointer' : 'default',
        opacity: canUse ? 1 : 0.5,
        minWidth: '60px',
        textAlign: 'center',
        transition: 'all 0.15s',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      <div style={{ color: suitColor[card.suit], fontSize: '11px' }}>
        {suitSymbol[card.suit]}{card.number > 13 ? '' : card.number === 1 ? 'A' : card.number > 10 ? ['J','Q','K'][card.number - 11] : card.number}
      </div>
      <div style={{ color: typeColor[card.type], fontSize: '15px', fontWeight: 'bold', margin: '2px 0' }}>
        {card.name}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
        {card.type === 'basic' ? '基本' : card.type === 'scheme' ? '锦囊' : '装备'}
      </div>
      {canUseAsKillNow && !isKill && !isJudgeReplace && (
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
