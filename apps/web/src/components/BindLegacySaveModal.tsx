import { useState } from 'react'

const API = '/api'

interface Props {
  open: boolean
  oldUserId: string
  onSuccess: (migrated: { heroes: number; treasures: number; heroStones: number; materials: number; treasurePieces: number }) => void
  onSkip: () => void
  onCancel: () => void
}

export function BindLegacySaveModal({ open, oldUserId, onSuccess, onSkip, onCancel }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleBind = async () => {
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`${API}/auth/bind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ oldUserId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? data.error ?? '绑定失败')
        return
      }
      onSuccess((data as any).migrated ?? { heroes: 0, treasures: 0, heroStones: 0, materials: 0, treasurePieces: 0 })
    } catch (e: any) {
      setError(`网络错误: ${e?.message ?? ''}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '440px', maxWidth: '92vw',
          background: 'var(--bg-medium)', border: '1px solid var(--border-gold)',
          borderRadius: '8px', padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}
      >
        <h3 style={{ color: 'var(--text-gold)', margin: 0 }}>检测到本地存档</h3>
        <p style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
          你之前用临时 ID <code style={{ color: 'var(--text-gold)' }}>{oldUserId}</code> 玩过。
          要把那份存档(英雄、宝具、材料等)并入当前账号吗?
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>
          绑定后会用该账号覆盖原匿名存档,放弃则原匿名存档丢失。
        </p>
        {error && (
          <div style={{ padding: '8px', background: 'rgba(255,68,68,0.15)', color: '#ff6b6b', borderRadius: '4px', fontSize: '12px' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{ padding: '8px 14px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-wood)', borderRadius: '4px', cursor: 'pointer' }}
          >取消</button>
          <button
            onClick={onSkip}
            disabled={busy}
            style={{ padding: '8px 14px', background: 'transparent', color: '#ff6b6b', border: '1px solid #ff6b6b', borderRadius: '4px', cursor: 'pointer' }}
          >放弃旧存档</button>
          <button
            onClick={handleBind}
            disabled={busy}
            style={{
              padding: '8px 14px',
              background: busy ? '#555' : 'var(--text-gold)',
              color: busy ? '#aaa' : '#000',
              border: 'none', borderRadius: '4px',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >{busy ? '处理中...' : '绑定'}</button>
        </div>
      </div>
    </div>
  )
}
