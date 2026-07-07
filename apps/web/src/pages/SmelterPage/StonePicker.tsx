import type { Hero, HeroStone } from '@hero-legend/shared-types'
import { HeroStoneIcon } from '../../components/HeroStoneIcon'

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
  onAutoPlace?: (stoneId: string) => void
  disabled?: boolean
}

export function StonePicker({ stones, heroMap, pendingStoneId, usedStoneIds, onPick, onAutoPlace, disabled }: StonePickerProps) {
  const groups = groupStones(stones)

  if (groups.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 16px' }}>
        没有待用的英雄石 — 去招贤馆抽卡吧
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '0 4px' }}>
        单击选为"待用", 再点凹槽投入; 双击自动放入第一个空凹槽
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
        gap: '8px',
        alignContent: 'start',
      }}>
        {groups.map(g => {
          const hero = heroMap.get(g.heroId)
          const available = g.stoneIds.some(id => !usedStoneIds.has(id))
          const isPending = pendingStoneId === g.stoneId
          const remaining = g.stoneIds.filter(id => !usedStoneIds.has(id)).length
          return (
            <div
              key={`${g.starLevel}-${g.heroId}`}
              onClick={() => !disabled && available && onPick(g.stoneId)}
              onDoubleClick={() => !disabled && available && onAutoPlace?.(g.stoneId)}
              title={`${hero?.name ?? g.heroId} (${'★'.repeat(g.starLevel)})${remaining > 0 ? `\n可用 ${remaining}/${g.stoneIds.length}` : '\n已全部投入凹槽'}`}
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '4px',
                cursor: disabled || !available ? 'not-allowed' : 'pointer',
                opacity: disabled || !available ? 0.4 : 1,
                borderRadius: '6px',
                background: isPending ? '#3a2a1a' : 'transparent',
                border: `1px solid ${isPending ? 'var(--text-gold)' : 'transparent'}`,
                transition: 'background 150ms, border 150ms',
                userSelect: 'none',
              }}
            >
              <HeroStoneIcon heroId={g.heroId} starLevel={g.starLevel} size={72} />
              {g.stoneIds.length > 1 && (
                <span style={{
                  position: 'absolute', right: '2px', bottom: '2px',
                  background: 'rgba(0,0,0,0.75)', color: 'var(--text-gold)',
                  fontSize: '11px', fontWeight: 'bold',
                  padding: '1px 5px', borderRadius: '8px',
                  border: '1px solid rgba(255,213,79,0.4)',
                  pointerEvents: 'none', minWidth: '16px',
                  textAlign: 'center', lineHeight: 1.2,
                }}>×{g.stoneIds.length}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
