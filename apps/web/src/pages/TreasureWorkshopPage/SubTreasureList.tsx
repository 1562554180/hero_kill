import { useEffect, useMemo, useState } from 'react'
import type { Treasure } from '@hero-legend/shared-types'
import { getSkillIcon } from '../../skillIcons'

interface SubTreasureListProps {
  treasures: Treasure[]
  selectedTreasureId: string | null
  disabledTreasureIds: Set<string>
  onPick: (treasureId: string) => void
  onUnpick?: () => void
  disabled?: boolean
}

const PAGE_SIZE = 48
const MAX_LEVEL = 45
const MAX_ENHANCE_COUNT = 50

/** 服务端公式: 100 - level * 85 / 44, 向下取整 */
function nextEnhanceRate(level: number): number {
  return Math.max(0, Math.round(100 - level * 85 / 44))
}

const STAR_BORDER: Record<number, string> = {
  5: '#ffd700',
  4: '#a78bfa',
  3: '#60a5fa',
  2: '#86efac',
  1: '#9ca3af',
}

export function SubTreasureList({ treasures, selectedTreasureId, disabledTreasureIds, onPick, onUnpick, disabled }: SubTreasureListProps) {
  const subs = useMemo(() => treasures.filter(t => t.type !== 'main'), [treasures])
  const totalPages = Math.max(1, Math.ceil(subs.length / PAGE_SIZE))
  const [page, setPage] = useState(0)

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '0 4px' }}>
        共 {subs.length} 条 · 第 {start + 1}-{end} 条
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
        gap: '6px',
        alignContent: 'start',
      }}>
        {pageItems.map(t => {
          const lvl = t.level ?? 0
          const cnt = t.enhanceCount ?? 0
          const atMaxLevel = lvl >= MAX_LEVEL
          const outOfAttempts = cnt >= MAX_ENHANCE_COUNT
          const isMaxed = atMaxLevel || outOfAttempts
          const isSelected = selectedTreasureId === t.id
          const isDisabled = disabledTreasureIds.has(t.id) || isMaxed
          const rate = atMaxLevel ? null : nextEnhanceRate(lvl)
          const icon = getSkillIcon(t.name)
          const borderColor = isSelected ? 'var(--text-gold)' : (STAR_BORDER[t.starLevel] ?? 'var(--border-wood)')
          return (
            <div
              key={t.id}
              title={`${'★'.repeat(t.starLevel)} ${t.name}\nLv.${lvl}/${MAX_LEVEL}  强化 ${cnt}/${MAX_ENHANCE_COUNT}\n${atMaxLevel ? '已满级' : `成功率 ${rate}%`}`}
              onClick={() => !disabled && !isDisabled && onPick(t.id)}
              onDoubleClick={() => !disabled && isSelected && onUnpick?.()}
              style={{
                position: 'relative',
                aspectRatio: '1',
                background: isSelected ? '#3a2a1a' : 'var(--bg-dark)',
                border: `2px solid ${borderColor}`,
                borderRadius: '6px',
                cursor: disabled || isDisabled ? 'not-allowed' : 'pointer',
                opacity: disabled || isDisabled ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                transition: 'all 150ms',
              }}
            >
              {icon ? (
                <img src={icon} alt={t.name} style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
              ) : (
                <span style={{ color: 'var(--text-light)', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', padding: '2px' }}>
                  {t.name}
                </span>
              )}
              {/* 星级 (左上) */}
              <span style={{
                position: 'absolute', top: '2px', left: '3px',
                fontSize: '10px', color: STAR_BORDER[t.starLevel],
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                fontWeight: 'bold', pointerEvents: 'none',
              }}>{t.starLevel}★</span>
              {/* 等级 (右下) */}
              <span style={{
                position: 'absolute', bottom: '2px', right: '3px',
                fontSize: '10px', color: isMaxed ? '#ff6b6b' : 'var(--text-gold)',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                fontWeight: 'bold', pointerEvents: 'none',
              }}>{atMaxLevel ? '满' : `L${lvl}`}</span>
              {/* 成功率指示 (左下小点) */}
              {!atMaxLevel && (
                <span style={{
                  position: 'absolute', bottom: '3px', left: '3px',
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: rate == null ? '#ff6b6b'
                    : rate >= 80 ? '#7ec850'
                    : rate >= 50 ? 'var(--text-gold)'
                    : rate >= 20 ? '#ff9e3a'
                    : '#ff6b6b',
                  pointerEvents: 'none',
                }} />
              )}
            </div>
          )
        })}
      </div>

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
