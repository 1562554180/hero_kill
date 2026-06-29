import { useEffect, useMemo, useState } from 'react'
import type { Treasure } from '@hero-legend/shared-types'

interface SubTreasureListProps {
  treasures: Treasure[]
  selectedTreasureId: string | null
  disabledTreasureIds: Set<string>
  onPick: (treasureId: string) => void
  onUnpick?: () => void
  disabled?: boolean
}

const PAGE_SIZE = 20
const MAX_LEVEL = 45
const MAX_ENHANCE_COUNT = 50

/** 服务端公式: 100 - level * 85 / 44, 向下取整 */
function nextEnhanceRate(level: number): number {
  return Math.max(0, Math.round(100 - level * 85 / 44))
}

export function SubTreasureList({ treasures, selectedTreasureId, disabledTreasureIds, onPick, onUnpick, disabled }: SubTreasureListProps) {
  const subs = useMemo(() => treasures.filter(t => t.type !== 'main'), [treasures])
  const totalPages = Math.max(1, Math.ceil(subs.length / PAGE_SIZE))
  const [page, setPage] = useState(0)

  // 总页数变少 (强化消耗/熔炼后) 把 page 收回
  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  const start = page * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, subs.length)
  const pageItems = subs.slice(start, end)

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
        共 {subs.length} 条 · 第 {start + 1}-{end} 条
      </div>
      {pageItems.map(t => {
        const lvl = t.level ?? 0
        const cnt = t.enhanceCount ?? 0
        const atMaxLevel = lvl >= MAX_LEVEL
        const outOfAttempts = cnt >= MAX_ENHANCE_COUNT
        const isMaxed = atMaxLevel || outOfAttempts
        const isSelected = selectedTreasureId === t.id
        const isDisabled = disabledTreasureIds.has(t.id) || isMaxed
        const rate = atMaxLevel ? null : nextEnhanceRate(lvl)
        const rateColor = rate == null ? '#ff6b6b'
          : rate >= 80 ? '#7ec850'
          : rate >= 50 ? 'var(--text-gold)'
          : rate >= 20 ? '#ff9e3a'
          : '#ff6b6b'
        return (
          <div
            key={t.id}
            onClick={() => !disabled && !isDisabled && onPick(t.id)}
            onDoubleClick={() => !disabled && isSelected && onUnpick?.()}
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
              <span style={{ color: 'var(--text-light)', fontSize: '11px' }}>
                Lv.<span style={{ color: 'var(--text-gold)', fontWeight: 'bold' }}>{lvl}</span>
                <span style={{ color: 'var(--text-muted)' }}>/{MAX_LEVEL}</span>
              </span>
              <span style={{ color: rateColor, fontSize: '11px', fontWeight: 'bold', minWidth: '42px', textAlign: 'right' }}>
                {atMaxLevel ? '已满级' : `${rate}%`}
              </span>
              <span style={{
                color: outOfAttempts ? '#ff6b6b' : 'var(--text-muted)',
                fontSize: '11px',
              }}>
                {cnt}/{MAX_ENHANCE_COUNT}
              </span>
            </span>
          </div>
        )
      })}

      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: '12px', padding: '8px 4px', marginTop: '4px',
          borderTop: '1px solid var(--border-wood)',
        }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ padding: '4px 12px', fontSize: '12px', opacity: page === 0 ? 0.4 : 1 }}
          >
            上一页
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ padding: '4px 12px', fontSize: '12px', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}