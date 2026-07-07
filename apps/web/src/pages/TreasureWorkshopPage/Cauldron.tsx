import type { Treasure } from '@hero-legend/shared-types'
import { getSkillIcon } from '../../skillIcons'

interface CauldronProps {
  selectedTreasure: Treasure | null
  phase: 'idle' | 'upgrading' | 'revealed'
  onSlotClick: () => void
}

const SLOT_COLOR_BY_STAR: Record<number, string> = {
  1: '#8a6a3a',
  2: '#8a6a3a',
  3: '#8a6a3a',
  4: '#9c7ec8',
  5: '#ffd54f',
}

export function Cauldron({ selectedTreasure, phase, onSlotClick }: CauldronProps) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* 炉身 */}
      <div style={{
        width: '200px', height: '200px', borderRadius: '50%',
        background: 'radial-gradient(circle, #2a1a0a, #1a0a00)',
        border: '3px solid #4a2a1a',
        boxShadow: '0 0 30px rgba(255, 100, 0, 0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        animation: phase === 'upgrading' ? 'cauldron-shake 200ms ease-in-out infinite' : 'none',
        filter: phase === 'revealed' ? 'brightness(1.2)' : 'none',
      }}>
        {/* 槽 */}
        <div
          onClick={onSlotClick}
          style={{
            width: '120px', height: '120px', borderRadius: '8px',
            background: selectedTreasure ? 'transparent' : 'rgba(0,0,0,0.5)',
            border: `2px dashed ${selectedTreasure ? SLOT_COLOR_BY_STAR[selectedTreasure.starLevel] : 'rgba(255,255,255,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: phase === 'idle' ? 'pointer' : 'not-allowed',
            animation: phase === 'idle' && !selectedTreasure ? 'slot-pulse 1500ms ease-in-out infinite' : 'none',
            '--slot-color': selectedTreasure ? SLOT_COLOR_BY_STAR[selectedTreasure.starLevel] : 'rgba(255, 213, 79, 0.3)',
          } as any}
        >
          {selectedTreasure && (() => {
            const icon = getSkillIcon(selectedTreasure.name)
            return (
              <div style={{
                position: 'relative',
                width: '48px', height: '48px',
                background: icon ? `url("${icon}") -1px -1px / contain no-repeat` : undefined,
              }}>
                <span style={{
                  position: 'absolute', bottom: '-2px', right: '0px',
                  fontSize: '12px', color: 'var(--text-gold)',
                  fontWeight: 'bold',
                  textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                  pointerEvents: 'none',
                }}>
                  Lv.{selectedTreasure.level ?? 0}
                </span>
              </div>
            )
          })()}
          {!selectedTreasure && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
              请从右侧选辅印
            </div>
          )}
        </div>

        {/* success-burst 光环 (仅 revealed-success 时) */}
        {phase === 'revealed' && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '3px solid var(--text-gold)',
            animation: 'success-burst 1500ms ease-out forwards',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* 中央遮罩 */}
      {phase === 'upgrading' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', borderRadius: '4px',
          pointerEvents: 'none', zIndex: 10,
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.7)', color: 'var(--text-gold)',
            padding: '8px 20px', borderRadius: '20px', fontSize: '16px', fontWeight: 'bold',
          }}>
            强化中...
          </div>
        </div>
      )}
    </div>
  )
}
