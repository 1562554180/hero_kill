import { useSmelterKeyframes } from './keyframes'
import type { HeroStone } from '@hero-legend/shared-types'
import { HeroStoneIcon } from '../../components/HeroStoneIcon'

const SLOT_POS: Array<{ top?: string; bottom?: string; left?: string; right?: string }> = [
  { top: '8%', left: '50%' },           // 凹槽① 顶中
  { bottom: '35%', left: '18%' },       // 凹槽② 左下
  { bottom: '35%', right: '18%' },      // 凹槽③ 右下
]

const SLOT_COLOR: Record<number, string> = {
  1: '#8a6a3a',
  2: '#8a6a3a',
  3: '#8a6a3a',
  4: '#9c7ec8',
  5: '#ffd54f',
}

export interface CauldronSlot {
  stoneId: string
  starLevel: number
  heroId: string
}

interface CauldronProps {
  slots: Array<CauldronSlot | null>
  phase: 'idle' | 'brewing' | 'revealed'
  resultStone?: HeroStone | null
  onSlotClick: (idx: number) => void
  /** 渲染时是否给空槽加 slot-pulse 动画 (idle 阶段 true, brewing/revealed 阶段 false) */
  slotsPulsing: boolean
}

export function Cauldron({ slots, phase, resultStone, onSlotClick, slotsPulsing }: CauldronProps) {
  useSmelterKeyframes()
  const isBrewing = phase === 'brewing'

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '480px', aspectRatio: '1', margin: '0 auto' }}>
      {/* 炉身 */}
      <div
        style={{
          position: 'absolute', inset: '15% 5% 5% 5%',
          borderRadius: '50% / 40%',
          background: 'linear-gradient(180deg, #4a3525 0%, #2a1f15 100%)',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.7), 0 0 0 4px #1a0f08, 0 0 0 6px #c8a050',
          animation: isBrewing ? 'cauldron-shake 0.6s ease-in-out 1' : undefined,
        }}
      >
        {/* 炉口 */}
        <div style={{
          position: 'absolute', top: '-12%', left: '12%', right: '12%', height: '24%',
          borderRadius: '50% / 100%',
          background: 'linear-gradient(180deg, #1a0f08 0%, #2a1f15 100%)',
          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.9)',
        }} />

        {/* 炉火 (炉口下半部) */}
        <div style={{
          position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '20%',
          background: 'radial-gradient(ellipse at center bottom, #ffaa3a 0%, #ff6b1a 50%, transparent 80%)',
          filter: isBrewing ? 'brightness(1.5)' : 'brightness(1)',
          transition: 'filter 200ms ease',
          animation: 'flicker 2s ease-in-out infinite',
          transformOrigin: 'center bottom',
          pointerEvents: 'none',
        }} />
      </div>

      {/* 3 个凹槽 */}
      {SLOT_POS.map((pos, idx) => {
        const stone = slots[idx]
        const isEmpty = !stone
        const slotColor = stone ? SLOT_COLOR[stone.starLevel] : 'rgba(255, 213, 79, 0.5)'
        return (
          <div
            key={idx}
            onClick={() => onSlotClick(idx)}
            style={{
              position: 'absolute',
              ...pos,
              transform: pos.left === '50%' ? 'translateX(-50%)' : undefined,
              width: '64px', height: '64px', borderRadius: '50%',
              background: stone
                ? `linear-gradient(135deg, var(--bg-dark), ${slotColor}33)`
                : 'radial-gradient(circle, rgba(255, 213, 79, 0.15), rgba(0,0,0,0.4))',
              border: `2px ${isEmpty ? 'dashed' : 'solid'} ${slotColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isBrewing ? 'default' : 'pointer',
              opacity: isBrewing ? 0.4 : 1,
              transition: 'opacity 200ms, transform 200ms',
              animation: slotsPulsing && isEmpty
                ? 'slot-pulse 1.6s ease-in-out infinite'
                : undefined,
              ['--slot-color' as any]: slotColor,
              color: '#fff', fontSize: '12px', fontWeight: 'bold',
              userSelect: 'none',
            }}
          >
            {stone ? (
              <HeroStoneIcon heroId={stone.heroId} starLevel={stone.starLevel} size={56} />
            ) : (
              <span style={{ color: slotColor, fontSize: '18px' }}>+</span>
            )}
          </div>
        )
      })}

      {/* 结果英雄石 (revealed 阶段显示) */}
      {phase === 'revealed' && resultStone && (
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 5, animation: 'result-rise 400ms ease-out forwards',
        }}>
          <div style={{
            position: 'relative',
            filter: 'drop-shadow(0 0 20px rgba(255, 213, 79, 0.9))',
          }}>
            <HeroStoneIcon heroId={resultStone.heroId} starLevel={resultStone.starLevel} size={96} />
            {/* 高光环 */}
            <div style={{
              position: 'absolute', inset: '-8px', borderRadius: '50%',
              border: '2px solid #ffd54f', pointerEvents: 'none',
              animation: 'ring-pulse 800ms ease-out forwards',
            }} />
          </div>
        </div>
      )}
    </div>
  )
}
