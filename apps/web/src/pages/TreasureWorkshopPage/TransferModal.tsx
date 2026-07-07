import { useState, useEffect, useMemo } from 'react'
import type { Treasure } from '@hero-legend/shared-types'
import { getSkillIcon } from '../../skillIcons'

interface TransferModalProps {
  open: boolean
  treasures: Treasure[]
  transferTalismanCount: number
  onConfirm: (fromId: string, toId: string) => Promise<void>
  onClose: () => void
}

const SLOT_COLOR_BY_STAR: Record<number, string> = {
  1: '#8a6a3a',
  2: '#8a6a3a',
  3: '#8a6a3a',
  4: '#9c7ec8',
  5: '#ffd54f',
}

const STAR_BORDER: Record<number, string> = {
  5: '#ffd700',
  4: '#a78bfa',
  3: '#60a5fa',
  2: '#86efac',
  1: '#9ca3af',
}

type SlotKind = 'source' | 'target'

export function TransferModal({ open, treasures, transferTalismanCount, onConfirm, onClose }: TransferModalProps) {
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [busy, setBusy] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [pickerFor, setPickerFor] = useState<SlotKind | null>(null)

  useEffect(() => {
    if (!open) { setFromId(''); setToId(''); setTransferring(false); setPickerFor(null) }
  }, [open])

  const subs = useMemo(() => treasures.filter(t => t.type === 'sub'), [treasures])

  // 当 pickerFor === 'source' 时, 候选 = 有等级的辅印 (排除已被选作目标的)
  // 当 pickerFor === 'target' 时, 候选 = 等级为 0 的辅印 (排除已被选作源的)
  const pickerCandidates = useMemo(() => {
    if (pickerFor === 'source') return subs.filter(t => (t.level ?? 0) >= 1 && t.id !== toId)
    if (pickerFor === 'target') return subs.filter(t => (t.level ?? 0) === 0 && t.id !== fromId)
    return []
  }, [pickerFor, subs, fromId, toId])

  if (!open) return null

  const fromTreasure = subs.find(t => t.id === fromId)
  const toTreasure = subs.find(t => t.id === toId)
  const canConfirm = !!fromTreasure && !!toTreasure && !busy && transferTalismanCount >= 1

  const handleConfirm = async () => {
    if (!canConfirm) return
    setBusy(true)
    setTransferring(true)
    try {
      const minDelay = new Promise(r => setTimeout(r, 1100))
      await Promise.all([onConfirm(fromId, toId), minDelay])
      onClose()
    } catch (e) {
      // error already toasted by parent
    } finally {
      setBusy(false)
      setTransferring(false)
    }
  }

  const handlePick = (id: string) => {
    if (pickerFor === 'source') setFromId(id)
    else if (pickerFor === 'target') setToId(id)
    setPickerFor(null)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-medium)', border: '2px solid var(--border-wood)',
        borderRadius: '8px', padding: '24px', minWidth: '520px', maxWidth: '640px',
      }}>
        <h3 style={{ color: 'var(--text-gold)', marginTop: 0, textAlign: 'center' }}>等级转移</h3>

        {/* 两个凹槽 + 中间通道 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0', marginBottom: '20px', position: 'relative',
        }}>
          <ForgeSlot
            label="源辅印"
            treasure={fromTreasure}
            displayLevel={fromTreasure?.level ?? 0}
            dimmed={transferring}
            clickable={!busy}
            onClick={() => setPickerFor('source')}
          />

          {/* 通道 */}
          <div style={{
            position: 'relative',
            width: '140px', height: '6px',
            background: 'linear-gradient(90deg, rgba(255,213,79,0.05), rgba(255,213,79,0.25), rgba(255,213,79,0.05))',
            borderTop: '1px solid rgba(255,213,79,0.25)',
            borderBottom: '1px solid rgba(255,213,79,0.25)',
            overflow: 'hidden',
            boxShadow: transferring ? '0 0 8px rgba(255,213,79,0.4)' : 'none',
          }}>
            {transferring && (
              <div style={{
                position: 'absolute', top: '-3px', width: '24px', height: '12px',
                background: 'linear-gradient(90deg, rgba(255,213,79,0) 0%, #ffd54f 50%, rgba(255,213,79,0) 100%)',
                borderRadius: '6px',
                filter: 'blur(0.5px)',
                animation: 'transfer-flow 1100ms linear infinite',
              }} />
            )}
          </div>

          <ForgeSlot
            label="目标辅印"
            treasure={toTreasure}
            displayLevel={transferring && fromTreasure ? fromTreasure.level ?? 0 : (toTreasure?.level ?? 0)}
            highlight={transferring}
            clickable={!busy}
            onClick={() => setPickerFor('target')}
          />
        </div>

        <div style={{ color: transferTalismanCount >= 1 ? 'var(--text-light)' : '#ff6b6b', marginBottom: '16px', fontSize: '13px' }}>
          消耗: 1 张转移符 (你持有 {transferTalismanCount} 张)
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <button onClick={onClose} disabled={busy}>取消</button>
          <button className="primary" onClick={handleConfirm} disabled={!canConfirm}
            style={{ opacity: canConfirm ? 1 : 0.4 }}>
            {busy ? '转移中...' : '确认转移'}
          </button>
        </div>
      </div>

      {/* 辅印选择弹框 */}
      {pickerFor && (
        <SubTreasurePicker
          title={pickerFor === 'source' ? '选择源辅印 (需有等级)' : '选择目标辅印 (需无等级)'}
          treasures={pickerCandidates}
          onPick={handlePick}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  )
}

function ForgeSlot({
  label, treasure, displayLevel, dimmed = false, highlight = false,
  clickable = false, onClick,
}: {
  label: string
  treasure: Treasure | undefined
  displayLevel: number
  dimmed?: boolean
  highlight?: boolean
  clickable?: boolean
  onClick?: () => void
}) {
  const borderColor = treasure ? SLOT_COLOR_BY_STAR[treasure.starLevel] : 'rgba(255,255,255,0.3)'
  const icon = treasure ? getSkillIcon(treasure.name) : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div
        onClick={() => clickable && onClick?.()}
        style={{
          width: '90px', height: '90px', borderRadius: '8px',
          background: treasure ? 'transparent' : 'rgba(0,0,0,0.5)',
          border: `2px dashed ${borderColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: dimmed ? 0.55 : 1,
          transition: 'opacity 0.2s',
          cursor: clickable ? 'pointer' : 'default',
          animation: highlight ? 'transfer-pulse 800ms ease-in-out infinite' : (treasure ? 'none' : 'slot-pulse 1500ms ease-in-out infinite'),
          boxShadow: highlight ? `0 0 14px 3px ${borderColor}88` : 'none',
        }}
      >
        {treasure && (
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
              Lv.{displayLevel}
            </span>
          </div>
        )}
        {!treasure && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textAlign: 'center', padding: '4px' }}>
            点击选择
          </div>
        )}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{label}</div>
    </div>
  )
}

const PAGE_SIZE = 48

function SubTreasurePicker({
  title, treasures, onPick, onClose,
}: {
  title: string
  treasures: Treasure[]
  onPick: (id: string) => void
  onClose: () => void
}) {
  const totalPages = Math.max(1, Math.ceil(treasures.length / PAGE_SIZE))
  const [page, setPage] = useState(0)
  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  const start = page * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, treasures.length)
  const pageItems = treasures.slice(start, end)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-medium)', border: '2px solid var(--border-gold)',
          borderRadius: '8px', padding: '16px', minWidth: '420px', maxWidth: '560px',
          maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ color: 'var(--text-gold)', margin: 0 }}>{title}</h4>
          <button onClick={onClose} style={{ padding: '2px 10px', fontSize: '12px' }}>关闭</button>
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>
          共 {treasures.length} 条 · 第 {start + 1}-{end} 条
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))',
          gap: '4px',
          alignContent: 'start',
          overflowY: 'auto',
          flex: 1,
        }}>
          {pageItems.map(t => {
            const lvl = t.level ?? 0
            const cnt = t.enhanceCount ?? 0
            const icon = getSkillIcon(t.name)
            const borderColor = STAR_BORDER[t.starLevel] ?? 'var(--border-wood)'
            return (
              <div
                key={t.id}
                title={`${'★'.repeat(t.starLevel)} ${t.name}\nLv.${lvl}  强化 ${cnt}/50`}
                onClick={() => onPick(t.id)}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  background: icon
                    ? `url("${icon}") 0px 0px / contain no-repeat`
                    : 'var(--bg-dark)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  transition: 'all 150ms',
                }}
              >
                {!icon && (
                  <span style={{ color: 'var(--text-light)', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', padding: '2px' }}>
                    {t.name}
                  </span>
                )}
                <span style={{
                  position: 'absolute', bottom: '1px', right: '2px',
                  fontSize: '9px', color: lvl === 0 ? '#ff6b6b' : 'var(--text-gold)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  fontWeight: 'bold', pointerEvents: 'none',
                }}>{lvl}</span>
              </div>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            gap: '12px', padding: '8px 4px', marginTop: '8px',
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
    </div>
  )
}
