import type { HeroStone } from '@hero-legend/shared-types'

interface SmeltAnimationProps {
  phase: 'idle' | 'brewing' | 'revealed'
  resultStone: HeroStone | null
  heroName: string
  onCollect: () => void
}

export function SmeltAnimation({ phase, resultStone, heroName, onCollect }: SmeltAnimationProps) {
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
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        zIndex: 10,
      }}>
        <div style={{ color: 'var(--text-gold)', fontSize: '14px', textAlign: 'center' }}>
          融合成功: {'★'.repeat(resultStone.starLevel)} {heroName}
        </div>
        <button
          className="primary"
          onClick={onCollect}
          style={{ padding: '10px 32px', fontSize: '16px' }}
        >
          收下
        </button>
      </div>
    )
  }

  return null
}