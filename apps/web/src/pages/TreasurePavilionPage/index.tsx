import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TREASURE_PAVILION_EXCHANGE_LIST,
  TREASURE_COMPOSE_COST,
  treasureDefinitions,
} from '@hero-legend/game-data'
import { getSkillIcon } from '../../skillIcons'

const API = '/api'

type DrawItem =
  | { kind: 'treasure'; defId: string; treasure: any; star: number }
  | { kind: 'universal'; amount: number }
  | { kind: 'piece'; defId: string; amount: number }

type Tab = 'draw' | 'exchange' | 'compose'

const STAR_BORDER: Record<number, string> = {
  5: '#ffd700',
  4: '#a78bfa',
  3: '#60a5fa',
  2: '#86efac',
  1: '#9ca3af',
}

function defName(id: string): string {
  return treasureDefinitions.find(d => d.id === id)?.name ?? id
}

function defDesc(id: string): string {
  return treasureDefinitions.find(d => d.id === id)?.description ?? ''
}

function defStar(id: string): number {
  return treasureDefinitions.find(d => d.id === id)?.starLevel ?? 1
}

export function TreasurePavilionPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('draw')
  const [ticket, setTicket] = useState(0)
  const [universal, setUniversal] = useState(0)
  const [pieces, setPieces] = useState<{ treasureId: string; amount: number }[]>([])
  const [drawing, setDrawing] = useState<DrawItem[] | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const userId = localStorage.getItem('hero-legend-userId') || ''

  const refresh = useCallback(async () => {
    const r = await fetch(`${API}/treasure-pavilion/info/${userId}`)
    const data = await r.json()
    setTicket(data.ticket ?? 0)
    setUniversal(data.universalFragment ?? 0)
    setPieces(data.treasurePiece ?? [])
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  const draw = async (count: 1 | 10) => {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      const cost = count === 10 ? 9 : 1
      if (ticket < cost) { setMessage(`宝具券不足 (需 ${cost})`); return }
      const res = await fetch(`${API}/treasure-pavilion/draw/${userId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setMessage(data.error ?? '抽卡失败'); return }
      setDrawing(data.results)
      await refresh()
    } catch (e: any) {
      setMessage('抽卡失败: ' + (e?.message ?? '网络错误'))
    } finally {
      setBusy(false)
    }
  }

  const compose = async (treasureId: string) => {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      const res = await fetch(`${API}/treasure-pavilion/compose/${userId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treasureId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setMessage(data.error ?? '合成失败'); return }
      setMessage(`合成成功: ${data.treasure.name}`)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const exchange = async (treasureId: string) => {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      const res = await fetch(`${API}/treasure-pavilion/exchange/${userId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treasureId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setMessage(data.error ?? '兑换失败'); return }
      setMessage(`兑换成功: ${data.treasure.name}`)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--text-gold)' }}>珍宝阁</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ color: 'var(--text-gold)' }}>宝具券: {ticket}</span>
          <span style={{ color: 'var(--text-gold)' }}>万能碎片: {universal}</span>
          <button onClick={() => navigate('/city')}>主城</button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '8px', background: 'var(--bg-medium)', borderRadius: '4px', marginBottom: '12px', textAlign: 'center', color: '#ff6b6b' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['draw', 'exchange', 'compose'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px',
            background: tab === t ? 'var(--bg-light)' : 'var(--bg-medium)',
            border: `1px solid ${tab === t ? 'var(--border-gold)' : 'var(--border-wood)'}`,
            color: tab === t ? 'var(--text-gold)' : 'var(--text-light)',
            fontWeight: tab === t ? 'bold' : 'normal',
          }}>
            {t === 'draw' ? '抽卡' : t === 'exchange' ? '兑换' : '碎片合成'}
          </button>
        ))}
      </div>

      {tab === 'draw' && (
        <div>
          <div style={{
            background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
            borderRadius: '8px', padding: '16px', marginBottom: '16px', fontSize: '13px',
            color: 'var(--text-light)', textAlign: 'center',
          }}>
            <span style={{ color: '#ff6b6b' }}>十连必出 3★宝具</span>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              disabled={busy || ticket < 1}
              onClick={() => draw(1)}
              style={{ flex: 1, padding: '14px', fontSize: '15px', opacity: busy || ticket < 1 ? 0.5 : 1 }}
            >单抽 (×1)</button>
            <button
              disabled={busy || ticket < 9}
              onClick={() => draw(10)}
              style={{ flex: 1, padding: '14px', fontSize: '15px', opacity: busy || ticket < 9 ? 0.5 : 1 }}
            >十连 (×9)</button>
          </div>
        </div>
      )}

      {tab === 'exchange' && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
        }}>
          {TREASURE_PAVILION_EXCHANGE_LIST.map((item: { treasureId: string; star: number; price: number }) => {
            const name = defName(item.treasureId)
            const desc = defDesc(item.treasureId)
            const star = item.star
            const icon = getSkillIcon(name)
            const canAfford = universal >= item.price
            return (
              <div key={item.treasureId} style={{
                background: 'var(--bg-medium)',
                border: `1px solid ${STAR_BORDER[star]}`,
                borderRadius: '8px', padding: '12px',
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                  {icon && (
                    <img src={icon} alt={name} style={{ width: '40px', height: '40px', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-gold)', fontWeight: 'bold', fontSize: '13px' }}>{name}</span>
                      <span style={{ color: STAR_BORDER[star], fontSize: '11px' }}>{'★'.repeat(star)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px', minHeight: '32px' }}>{desc}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-gold)', fontSize: '12px' }}>{item.price} 万能</span>
                  <button
                    disabled={busy || !canAfford}
                    onClick={() => exchange(item.treasureId)}
                    style={{ fontSize: '12px', padding: '4px 10px', opacity: busy || !canAfford ? 0.5 : 1 }}
                  >兑换</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'compose' && (
        <div>
          {pieces.length === 0 && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
              暂无碎片. 抽卡获得的指定宝具碎片会在此展示, {TREASURE_COMPOSE_COST} 个合成对应宝具.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {pieces.map(p => {
              const name = defName(p.treasureId)
              const star = defStar(p.treasureId)
              const icon = getSkillIcon(name)
              const progress = Math.min(100, Math.floor(p.amount / TREASURE_COMPOSE_COST * 100))
              const canCompose = p.amount >= TREASURE_COMPOSE_COST
              return (
                <div key={p.treasureId} style={{
                  background: 'var(--bg-medium)',
                  border: `1px solid ${STAR_BORDER[star]}`,
                  borderRadius: '8px', padding: '12px',
                }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                    {icon && (
                      <img src={icon} alt={name} style={{ width: '40px', height: '40px', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-gold)', fontWeight: 'bold', fontSize: '13px' }}>{name} 碎片</span>
                        <span style={{ color: STAR_BORDER[star], fontSize: '11px' }}>{'★'.repeat(star)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    height: '8px', background: 'var(--bg-dark)', borderRadius: '4px',
                    overflow: 'hidden', margin: '8px 0',
                  }}>
                    <div style={{
                      width: `${progress}%`, height: '100%',
                      background: 'linear-gradient(90deg, #b8860b, #ffd700)',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-light)', fontSize: '12px' }}>
                      {p.amount} / {TREASURE_COMPOSE_COST}
                    </span>
                    <button
                      disabled={busy || !canCompose}
                      onClick={() => compose(p.treasureId)}
                      style={{ fontSize: '12px', padding: '4px 10px', opacity: busy || !canCompose ? 0.5 : 1 }}
                    >合成</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {drawing && (
        <PavilionDrawAnimation
          items={drawing}
          onClose={() => setDrawing(null)}
        />
      )}
    </div>
  )
}

function PavilionDrawAnimation({ items, onClose }: { items: DrawItem[]; onClose: () => void }) {
  const [revealedCount, setRevealedCount] = useState(0)
  const [enteredCount, setEnteredCount] = useState(0)

  useEffect(() => {
    if (enteredCount >= items.length) return
    const t = setTimeout(() => setEnteredCount(c => c + 1), 120)
    return () => clearTimeout(t)
  }, [enteredCount, items.length])

  useEffect(() => {
    if (enteredCount < items.length) return
    if (revealedCount >= items.length) return
    const t = setTimeout(() => setRevealedCount(c => c + 1), 200)
    return () => clearTimeout(t)
  }, [enteredCount, revealedCount, items.length])

  const allRevealed = revealedCount >= items.length

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px',
    }}>
      <h2 style={{ color: 'var(--text-gold)', marginBottom: '24px' }}>
        抽卡结果 ({revealedCount}/{items.length})
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: items.length === 1 ? '1fr' : 'repeat(5, 1fr)',
        gap: '12px',
        maxWidth: items.length === 1 ? '200px' : '700px',
        width: '100%',
      }}>
        {items.map((item, i) => {
          const entered = i < enteredCount
          const revealed = i < revealedCount
          return (
            <DrawnCard key={i} item={item} entered={entered} revealed={revealed} />
          )
        })}
      </div>

      <button
        disabled={!allRevealed}
        onClick={onClose}
        style={{
          marginTop: '32px', padding: '10px 32px', fontSize: '16px',
          opacity: allRevealed ? 1 : 0.4,
        }}
      >
        {allRevealed ? '关闭' : '翻开中...'}
      </button>
    </div>
  )
}

function DrawnCard({ item, entered, revealed }: { item: DrawItem; entered: boolean; revealed: boolean }) {
  let star = 1
  let title = ''
  let subtitle = ''
  let iconName: string | null = null
  let isTreasureKind = false
  if (item.kind === 'treasure') {
    star = item.star
    title = item.treasure.name
    subtitle = '宝具'
    iconName = getSkillIcon(title)
    isTreasureKind = true
  } else if (item.kind === 'universal') {
    star = 5
    title = `万能碎片 ×${item.amount}`
    subtitle = '通用货币'
  } else if (item.kind === 'piece') {
    star = defStar(item.defId)
    title = `${defName(item.defId)} 碎片 ×${item.amount}`
    subtitle = '指定碎片'
    iconName = getSkillIcon(defName(item.defId))
  }
  const borderColor = STAR_BORDER[star] ?? '#ffd54f'
  const gradientByStar: Record<number, string> = {
    5: 'linear-gradient(135deg, #ff6b6b, #c62828)',
    4: 'linear-gradient(135deg, #a78bfa, #6d28d9)',
    3: 'linear-gradient(135deg, #60a5fa, #1e40af)',
    2: 'linear-gradient(135deg, #86efac, #166534)',
    1: 'linear-gradient(135deg, #9ca3af, #4b5563)',
  }
  const faceGradient = isTreasureKind
    ? (gradientByStar[star] ?? 'linear-gradient(135deg, #5d4037, #3e2723)')
    : 'linear-gradient(135deg, #5d4037, #3e2723)'

  return (
    <div style={{
      position: 'relative', width: '100%', paddingTop: '140%',
      perspective: '800px',
      opacity: entered ? 1 : 0,
      transform: entered ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.7)',
      transition: 'opacity 0.3s, transform 0.3s',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        transformStyle: 'preserve-3d',
        transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform 0.5s',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg, #5d4037, #3e2723)',
          border: `2px solid ${borderColor}`,
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: borderColor, fontSize: '24px', fontWeight: 'bold',
        }}>珍</div>
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: faceGradient,
          border: `2px solid ${borderColor}`,
          borderRadius: '8px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: borderColor, padding: '8px', boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: '11px', opacity: 0.85, color: '#fff' }}>{subtitle}</div>
          {iconName && (
            <img src={iconName} alt={title} style={{ width: '50%', marginTop: '6px' }} />
          )}
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '4px', textAlign: 'center' }}>{title}</div>
        </div>
      </div>
    </div>
  )
}
