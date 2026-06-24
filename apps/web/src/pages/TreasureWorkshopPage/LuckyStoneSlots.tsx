import type { CSSProperties } from 'react'

interface LuckyStoneSlotsProps {
  used: number          // currently added (0-6)
  available: number     // how many the player owns total
  disabled?: boolean
  onToggle: (n: number) => void  // n = 1..6; clicking the nth slot toggles it
}

const SLOT_SIZE = 36

export function LuckyStoneSlots({ used, available, disabled, onToggle }: LuckyStoneSlotsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
        幸运石 ({used}/6)
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        {[1, 2, 3, 4, 5, 6].map(n => {
          const filled = n <= used
          const inStock = n <= available
          const clickable = !disabled && inStock
          const slotStyle: CSSProperties = {
            width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: '50%',
            border: `2px solid ${filled ? 'var(--text-gold)' : 'rgba(255,255,255,0.3)'}`,
            background: filled
              ? 'radial-gradient(circle, #ffd54f, #b8860b)'
              : 'rgba(0,0,0,0.5)',
            boxShadow: filled ? '0 0 12px rgba(255, 213, 79, 0.6)' : 'none',
            cursor: clickable ? 'pointer' : 'not-allowed',
            opacity: disabled ? 0.4 : (inStock ? 1 : 0.25),
            transition: 'all 200ms',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: filled ? '#1a0a00' : 'var(--text-muted)',
            fontSize: '12px', fontWeight: 'bold',
          }
          return (
            <div
              key={n}
              title={`幸运石 ${n}`}
              onClick={() => clickable && onToggle(n)}
              style={slotStyle}
            >
              {filled ? '★' : n}
            </div>
          )
        })}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
        持有 {available} 颗 · 点击凹槽添加/移除
      </div>
    </div>
  )
}