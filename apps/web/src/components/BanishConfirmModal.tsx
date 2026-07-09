import { useEffect, useState } from 'react'

interface BanishConfirmModalProps {
  open: boolean
  heroName: string
  heroLevel: number
  heroStar: number
  faction: string
  returnedCount: number
  onConfirm: () => void
  onCancel: () => void
}

/** 2 秒倒计时确认按钮, 防误点 */
export function BanishConfirmModal({
  open,
  heroName,
  heroLevel,
  heroStar,
  faction,
  returnedCount,
  onConfirm,
  onCancel,
}: BanishConfirmModalProps) {
  const [remaining, setRemaining] = useState(2)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!open) {
      setRemaining(2)
      setConfirmed(false)
      return
    }
    setRemaining(2)
    setConfirmed(false)
    const tick = setInterval(() => {
      setRemaining(s => {
        if (s <= 1) {
          clearInterval(tick)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [open])

  if (!open) return null

  const starText = '★'.repeat(heroStar) + '☆'.repeat(5 - heroStar)
  const canConfirm = remaining === 0 && !confirmed

  const handleConfirm = () => {
    setConfirmed(true)
    onConfirm()
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
          borderRadius: '8px', padding: '24px', minWidth: '360px', maxWidth: '480px',
        }}
      >
        <h3 style={{ margin: '0 0 12px', color: '#c62828' }}>⚠️ 放逐英雄</h3>
        <div style={{ marginBottom: '8px', color: 'var(--text)' }}>
          <strong style={{ color: 'var(--text-gold)' }}>{heroName}</strong>
          {' '}{starText} Lv.{heroLevel} · {faction}
        </div>
        <div style={{ marginBottom: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
          将返还 <strong style={{ color: 'var(--text-gold)' }}>{returnedCount}</strong> 件宝具到背包
        </div>
        <div style={{ marginBottom: '20px', color: '#c62828', fontSize: '13px' }}>
          此操作不可恢复
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel}>取消</button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              padding: '8px 16px', fontWeight: 'bold',
              background: canConfirm ? '#c62828' : '#555',
              color: '#fff', border: 'none', borderRadius: '4px',
              cursor: canConfirm ? 'pointer' : 'not-allowed',
            }}
          >
            {confirmed ? '处理中...' : remaining > 0 ? `请等待 ${remaining}...` : '确认放逐'}
          </button>
        </div>
      </div>
    </div>
  )
}