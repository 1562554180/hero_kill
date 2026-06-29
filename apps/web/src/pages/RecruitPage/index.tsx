import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Hero, HeroStone, Material, RecruitPool } from '@hero-legend/shared-types'
import { DrawAnimation } from '../../components/DrawAnimation'

const API = '/api'

interface SaveData {
  materials: Material[]
  dailyRecruitGuarantee: { qianliDate: string | null; wanliDate: string | null }
}

const POOLS: Array<{ pool: RecruitPool; name: string; ticket: string }> = [
  { pool: 'baili', name: '初级酒馆', ticket: 'bailiTicket' },
  { pool: 'qianli', name: '中级酒馆', ticket: 'qianliTicket' },
  { pool: 'wanli', name: '高级酒馆', ticket: 'wanliTicket' },
]

const POOL_PROBS: Record<RecruitPool, string> = {
  baili: '3★20% / 2★30% / 1★50%',
  qianli: '4★10% / 3★20% / 2★70%',
  wanli: '5★3% / 4★10% / 3★87%',
}

function nextUtcMidnight(): number {
  const d = new Date()
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0)
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function todayUtc(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function RecruitPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<RecruitPool>('baili')
  const [save, setSave] = useState<SaveData | null>(null)
  const [allHeroes, setAllHeroes] = useState<Hero[]>([])
  const [drawing, setDrawing] = useState<{ stones: HeroStone[]; count: 1 | 10 } | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [countdown, setCountdown] = useState('')
  const userId = localStorage.getItem('hero-legend-userId') || ''

  const refreshSave = useCallback(async () => {
    const data = await fetch(`${API}/save/${userId}`).then(r => r.json())
    setSave(data)
  }, [userId])

  useEffect(() => {
    refreshSave()
    fetch(`${API}/hero`).then(r => r.json()).then(d => setAllHeroes(d.heroes ?? []))
  }, [refreshSave])

  // 倒计时 (每 1s 更新)
  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(nextUtcMidnight() - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const current = POOLS.find(p => p.pool === tab)!
  const ticketCount = save?.materials.find(m => m.type === current.ticket)?.amount ?? 0
  const guaranteeKey = tab === 'qianli' ? 'qianliDate' : tab === 'wanli' ? 'wanliDate' : null
  const today = todayUtc()
  const guaranteeUsed = guaranteeKey ? save?.dailyRecruitGuarantee?.[guaranteeKey] === today : false

  const draw = async (count: 1 | 10) => {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`${API}/recruit/draw/${userId}/${tab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setMessage(data.error ?? data.message ?? `抽卡失败 (${res.status})`)
      } else if (!Array.isArray(data.stones)) {
        setMessage('抽卡返回数据格式异常')
      } else {
        setDrawing({ stones: data.stones, count })
        await refreshSave()
      }
    } catch (e: any) {
      setMessage('抽卡失败: ' + (e?.message ?? '网络错误'))
    } finally {
      setBusy(false)
    }
  }

  const closeAnimation = () => setDrawing(null)
  const continueDraw = () => {
    if (!drawing) return
    setDrawing(null)
    draw(drawing.count)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--text-gold)' }}>招贤馆</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/city')}>主城</button>
          <button onClick={() => navigate('/heroes')}>英雄</button>
          <button onClick={() => navigate('/backpack')}>背包</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {POOLS.map(p => (
          <button key={p.pool} onClick={() => setTab(p.pool)} style={{
            flex: 1, padding: '10px',
            background: tab === p.pool ? 'var(--bg-light)' : 'var(--bg-medium)',
            border: `1px solid ${tab === p.pool ? 'var(--border-gold)' : 'var(--border-wood)'}`,
            color: tab === p.pool ? 'var(--text-gold)' : 'var(--text-light)',
            fontWeight: tab === p.pool ? 'bold' : 'normal',
          }}>
            {p.name}
          </button>
        ))}
      </div>

      {message && (
        <div style={{ padding: '8px', background: 'var(--bg-medium)', borderRadius: '4px', marginBottom: '12px', textAlign: 'center', color: '#ff6b6b' }}>
          {message}
        </div>
      )}

      {/* 池子信息 */}
      <div style={{
        background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
        borderRadius: '8px', padding: '20px', marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ color: 'var(--text-gold)', fontSize: '18px' }}>{current.name}</span>
          <span style={{ color: 'var(--text-light)' }}>抽卡券: <span style={{ color: 'var(--text-gold)' }}>{ticketCount}</span> 张</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
          概率: {POOL_PROBS[tab]}
        </div>
        {tab !== 'baili' && (
          <div style={{ color: guaranteeUsed ? 'var(--text-muted)' : '#ff6b6b', fontSize: '13px' }}>
            每日首次十连保底: {guaranteeUsed ? '今日已使用' : '可用'}
            <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>
              距刷新 {countdown}
            </span>
          </div>
        )}
        {tab === 'baili' && (
          <div style={{ color: '#ff6b6b', fontSize: '13px' }}>
            每次十连必出 3★ (限 1 张)
          </div>
        )}
      </div>

      {/* 按钮区 */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          disabled={busy || ticketCount < 1}
          onClick={() => draw(1)}
          style={{ flex: 1, padding: '14px', fontSize: '15px', opacity: busy || ticketCount < 1 ? 0.5 : 1 }}
        >
          单抽 (消耗 1 张)
        </button>
        <button
          disabled={busy || ticketCount < 9}
          onClick={() => draw(10)}
          style={{ flex: 1, padding: '14px', fontSize: '15px', opacity: busy || ticketCount < 9 ? 0.5 : 1 }}
        >
          十连 (消耗 9 张)
        </button>
      </div>

      {/* 抽卡动画 */}
      {drawing && (
        <DrawAnimation
          stones={drawing.stones}
          heroes={allHeroes}
          count={drawing.count}
          onContinue={continueDraw}
          onClose={closeAnimation}
        />
      )}
    </div>
  )
}