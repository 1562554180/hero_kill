import type { HeroStone } from '@hero-legend/shared-types'

interface SmeltAnimationProps {
  phase: 'idle' | 'brewing' | 'revealed'
  resultStone: HeroStone | null
  heroName: string
}

export function SmeltAnimation({ phase, resultStone, heroName }: SmeltAnimationProps) {
  if (phase === 'idle') return null
  if (phase === 'brewing') {
    return (
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)', color: 'var(--text-gold)',
          padding: '8px 20px', borderRadius: '20px', fontSize: '16px', fontWeight: 'bold',
        }}>
          融合中...
        </div>
      </div>
    )
  }

  if (phase === 'revealed' && resultStone) {
    return (
      <div style={{
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <div style={{ color: 'var(--text-gold)', fontSize: '14px', textAlign: 'center' }}>
          融合成功: {'★'.repeat(resultStone.starLevel)} {heroName}
        </div>
      </div>
    )
  }

  return null
}