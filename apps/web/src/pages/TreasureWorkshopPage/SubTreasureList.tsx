import type { Treasure } from '@hero-legend/shared-types'

interface SubTreasureListProps {
  treasures: Treasure[]
  selectedTreasureId: string | null
  disabledTreasureIds: Set<string>
  onPick: (treasureId: string) => void
  disabled?: boolean
}

export function SubTreasureList({ treasures, selectedTreasureId, disabledTreasureIds, onPick, disabled }: SubTreasureListProps) {
  const subs = treasures.filter(t => t.type === 'sub')

  if (subs.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 16px' }}>
        没有辅印 — 去关卡战斗或熔炼获取
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px', padding: '0 4px' }}>
        点行投入强化 (90 条全展开)
      </div>
      {subs.map(t => {
        const lvl = t.level ?? 0
        const cnt = t.enhanceCount ?? 0
        const maxed = cnt >= 50
        const isSelected = selectedTreasureId === t.id
        const isDisabled = disabledTreasureIds.has(t.id) || maxed
        return (
          <div
            key={t.id}
            onClick={() => !disabled && !isDisabled && onPick(t.id)}
            style={{
              background: isSelected ? '#3a2a1a' : 'var(--bg-dark)',
              border: `1px solid ${isSelected ? 'var(--text-gold)' : 'var(--border-wood)'}`,
              borderRadius: '4px', padding: '6px 10px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: disabled || isDisabled ? 'not-allowed' : 'pointer',
              opacity: disabled || isDisabled ? 0.4 : 1,
              fontSize: '12px',
              transition: 'all 150ms',
            }}
          >
            <span style={{ color: 'var(--text-light)', fontWeight: 'bold' }}>
              {'★'.repeat(t.starLevel)} {t.name}
            </span>
            <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                Lv.{lvl}
              </span>
              <span style={{
                color: maxed ? '#ff6b6b' : 'var(--text-muted)',
                fontSize: '11px',
              }}>
                {cnt}/50{maxed ? ' (满)' : ''}
              </span>
              {maxed && <span style={{ fontSize: '10px', color: '#ff6b6b' }}>已满</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}