import { useState, useEffect } from 'react'
import type { Treasure } from '@hero-legend/shared-types'

interface TransferModalProps {
  open: boolean
  treasures: Treasure[]
  transferTalismanCount: number
  onConfirm: (fromId: string, toId: string) => Promise<void>
  onClose: () => void
}

export function TransferModal({ open, treasures, transferTalismanCount, onConfirm, onClose }: TransferModalProps) {
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) { setFromId(''); setToId('') }
  }, [open])

  if (!open) return null

  const subs = treasures.filter(t => t.type === 'sub')
  const sources = subs.filter(t => (t.level ?? 0) >= 1)
  const targets = subs.filter(t => (t.level ?? 0) === 0)

  const fromTreasure = subs.find(t => t.id === fromId)
  const toTreasure = subs.find(t => t.id === toId)
  const canConfirm = !!fromTreasure && !!toTreasure && !busy && transferTalismanCount >= 1

  const handleConfirm = async () => {
    if (!canConfirm) return
    setBusy(true)
    try {
      await onConfirm(fromId, toId)
      onClose()
    } catch (e) {
      // error already toasted by parent
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-medium)', border: '2px solid var(--border-wood)',
        borderRadius: '8px', padding: '24px', minWidth: '480px', maxWidth: '600px',
      }}>
        <h3 style={{ color: 'var(--text-gold)', marginTop: 0 }}>等级转移</h3>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '13px' }}>源辅印 (需有等级)</label>
          <select
            value={fromId}
            onChange={e => setFromId(e.target.value)}
            style={{ width: '100%', padding: '8px', background: 'var(--bg-dark)', color: 'var(--text-light)', border: '1px solid var(--border-wood)', borderRadius: '4px' }}
          >
            <option value="">-- 选择 --</option>
            {sources.map(t => (
              <option key={t.id} value={t.id}>
                {'★'.repeat(t.starLevel)} {t.name} (Lv.{t.level}, {t.enhanceCount ?? 0}/50 次)
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '13px' }}>目标辅印 (需无等级)</label>
          <select
            value={toId}
            onChange={e => setToId(e.target.value)}
            style={{ width: '100%', padding: '8px', background: 'var(--bg-dark)', color: 'var(--text-light)', border: '1px solid var(--border-wood)', borderRadius: '4px' }}
          >
            <option value="">-- 选择 --</option>
            {targets.map(t => (
              <option key={t.id} value={t.id}>
                {'★'.repeat(t.starLevel)} {t.name} (Lv.0, {t.enhanceCount ?? 0}/50 次)
              </option>
            ))}
          </select>
        </div>

        {fromTreasure && toTreasure && (
          <div style={{
            background: 'var(--bg-dark)', borderRadius: '4px', padding: '12px',
            marginBottom: '12px', fontSize: '13px',
          }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>转移后:</div>
            <div style={{ color: 'var(--text-light)' }}>
              源: {'★'.repeat(fromTreasure.starLevel)} {fromTreasure.name}
              → Lv.0 ({fromTreasure.enhanceCount ?? 0}/50 次)
            </div>
            <div style={{ color: 'var(--text-gold)' }}>
              目标: {'★'.repeat(toTreasure.starLevel)} {toTreasure.name}
              → Lv.{fromTreasure.level} ({toTreasure.enhanceCount ?? 0}/50 次)
            </div>
          </div>
        )}

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
    </div>
  )
}
