import type { Hero, HeroStone } from '@hero-legend/shared-types'

interface StoneGroup {
  stoneId: string
  starLevel: number
  heroId: string
  stoneIds: string[]
}

function groupStones(stones: HeroStone[]): StoneGroup[] {
  const groups = new Map<string, StoneGroup>()
  for (const s of stones) {
    const key = `${s.starLevel}|${s.heroId}`
    const g = groups.get(key)
    if (g) g.stoneIds.push(s.stoneId)
    else groups.set(key, { stoneId: s.stoneId, starLevel: s.starLevel, heroId: s.heroId, stoneIds: [s.stoneId] })
  }
  return Array.from(groups.values()).sort((a, b) => b.starLevel - a.starLevel || a.heroId.localeCompare(b.heroId))
}

interface StonePickerProps {
  stones: HeroStone[]
  heroMap: Map<string, Hero>
  pendingStoneId: string | null
  usedStoneIds: Set<string>
  onPick: (stoneId: string) => void
  disabled?: boolean
}

export function StonePicker({ stones, heroMap, pendingStoneId, usedStoneIds, onPick, disabled }: StonePickerProps) {
  const groups = groupStones(stones)

  if (groups.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 16px' }}>
        没有待用的英雄石 — 去招贤馆抽卡吧
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px', padding: '0 4px' }}>
        点行选为"待用", 再点左侧凹槽投入
      </div>
      {groups.map(g => {
        const hero = heroMap.get(g.heroId)
        // 该组至少有一颗未投入凹槽 → 可选; 否则全灰
        const available = g.stoneIds.some(id => !usedStoneIds.has(id))
        const isPending = pendingStoneId === g.stoneId
        return (
          <div
            key={`${g.starLevel}-${g.heroId}`}
            onClick={() => !disabled && available && onPick(g.stoneId)}
            style={{
              background: isPending ? '#3a2a1a' : 'var(--bg-dark)',
              border: `1px solid ${isPending ? 'var(--text-gold)' : 'var(--border-wood)'}`,
              borderRadius: '4px', padding: '8px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: disabled || !available ? 'not-allowed' : 'pointer',
              opacity: disabled || !available ? 0.4 : 1,
              transition: 'all 150ms',
            }}
          >
            <span style={{ color: 'var(--text-light)', fontWeight: 'bold' }}>
              {hero?.name ?? g.heroId}
            </span>
            <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-gold)', fontSize: '11px' }}>
                {'★'.repeat(g.starLevel)}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>× {g.stoneIds.length}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
