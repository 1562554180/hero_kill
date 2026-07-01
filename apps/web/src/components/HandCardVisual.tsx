// apps/web/src/components/HandCardVisual.tsx
import { memo } from 'react'
import type { Card } from '@hero-legend/shared-types'

// 卡牌图片: 扫 cards/*.webp, 文件名即卡名
const cardImgModules = import.meta.glob('../images/cards/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const CARD_IMAGES: Record<string, string> = {}
for (const [path, url] of Object.entries(cardImgModules)) {
  const filename = path.replace('../images/cards/', '').replace('.webp', '')
  CARD_IMAGES[filename] = url
}

const suitSymbol: Record<string, string> = {
  spade: '♠', heart: '♥', diamond: '♦', club: '♣'
}

const TYPE_THEME: Record<string, { bg1: string; bg2: string; bg3: string; border: string; main: string; corner: string }> = {
  basic:    { bg1: '#f4e4bc', bg2: '#e8d4a0', bg3: '#dcc890', border: '#8b6914', main: '#5d4037', corner: 'rgba(139,105,20,0.6)' },
  scheme:   { bg1: '#e3f2fd', bg2: '#bbdefb', bg3: '#90caf9', border: '#1565c0', main: '#0d47a1', corner: 'rgba(21,101,192,0.6)' },
  equipment:{ bg1: '#e8f5e9', bg2: '#c8e6c9', bg3: '#a5d6a7', border: '#2e7d32', main: '#1b5e20', corner: 'rgba(46,125,32,0.6)' },
}
const TYPE_LABEL: Record<string, string> = {
  basic: '基本牌', scheme: '锦囊牌', equipment: '装备牌',
}

const suitFontColor = (suit: string) => (suit === 'heart' || suit === 'diamond') ? '#c62828' : '#212121'
const suitWaterColor = (suit: string) => (suit === 'heart' || suit === 'diamond') ? 'rgba(198,40,40,0.10)' : 'rgba(33,33,33,0.10)'

interface Props {
  card: Card
}

function HandCardVisualInner({ card }: Props) {
  const theme = TYPE_THEME[card.type] ?? TYPE_THEME.basic
  const num = card.number > 13 ? '' : card.number === 1 ? 'A' : card.number > 10 ? ['J','Q','K'][card.number - 11] : String(card.number)
  const mainChar = card.name.length > 2 ? card.name.slice(0, 2) : card.name
  const cardImg = CARD_IMAGES[card.name]

  const mainFontSize = card.name.length >= 3 ? 15 : 22
  const waterFontSize = card.name.length >= 3 ? 35 : 56

  return (
    <div style={{
      position: 'relative',
      width: '72px',
      height: '110px',
      background: `linear-gradient(135deg, ${theme.bg1} 0%, ${theme.bg2} 50%, ${theme.bg3} 100%)`,
      border: `1.5px solid ${theme.border}`,
      borderRadius: '4px',
      boxShadow: '0 3px 6px rgba(0,0,0,0.5), inset 0 0 8px rgba(139,105,20,0.2)',
      userSelect: 'none',
      overflow: 'hidden',
      fontFamily: "'KaiTi', 'STKaiti', serif",
      opacity: 1,
    }}>
      {/* 双层装饰边框 */}
      <div style={{ position: 'absolute', inset: '2px', border: `1px solid ${theme.corner}`, borderRadius: '3px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '3.5px', border: `1px dashed ${theme.corner}`, borderRadius: '2px', opacity: 0.55, pointerEvents: 'none' }} />

      {/* 背景水印: 有图用 PNG, 无图用大字 */}
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

      {/* 主字 (底部) — 仅无图时显示 */}
      {!cardImg && (
        <div style={{
          position: 'absolute', bottom: card.name.length >= 3 ? '7px' : '10px', left: 0, right: 0,
          textAlign: 'center',
          color: theme.main,
          fontSize: mainFontSize, fontWeight: 'bold', lineHeight: 1,
        }}>{mainChar}</div>
      )}
    </div>
  )
}
export const HandCardVisual = memo(HandCardVisualInner)

