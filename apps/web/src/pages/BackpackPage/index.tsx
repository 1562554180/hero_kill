import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Hero, HeroStone, Material, Treasure } from '@hero-legend/shared-types'

const API = '/api'

type Tab = 'stones' | 'tickets' | 'treasures' | 'materials'

const TICKET_LABEL: Record<string, string> = {
  bailiTicket: '初级英雄令',
  qianliTicket: '中级英雄令',
  wanliTicket: '高级英雄令',
}

const MAT_LABEL: Record<string, string> = {
  gold: '金币',
  jade: '玉',
  heroFragment: '英雄碎片',
  treasureFragment: '宝具碎片',
  heroToken: '英雄令牌',
}

type StoneGroup = {
  stoneId: string         // 该组第一颗的 id, 用于 "使用" 时消耗 1 颗
  starLevel: number
  heroId: string
  stoneIds: string[]      // 该组所有石头 id (熔炼时按需消耗)
}

function groupStones(stones: HeroStone[]): StoneGroup[] {
  const groups = new Map<string, StoneGroup>()
  for (const s of stones) {
    const key = `${s.starLevel}|${s.heroId}`
    const g = groups.get(key)
    if (g) g.stoneIds.push(s.stoneId)
    else groups.set(key, { stoneId: s.stoneId, starLevel: s.starLevel, heroId: s.heroId, stoneIds: [s.stoneId] })
  }
  return Array.from(groups.values()).sort((a, b) => b.starLevel - a.starLevel)
}

export function BackpackPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('stones')
  const [allHeroes, setAllHeroes] = useState<Hero[]>([])
  const [stones, setStones] = useState<HeroStone[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [userId, setUserId] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const uid = localStorage.getItem('hero-legend-userId') || ''
    setUserId(uid)
    const [save, heroData] = await Promise.all([
      fetch(`${API}/save/${uid}`).then(r => r.json()),
      fetch(`${API}/hero`).then(r => r.json()),
    ])
    setAllHeroes(heroData.heroes ?? [])
    setStones(save?.heroStones ?? [])
    setMaterials(save?.materials ?? [])
    setTreasures(save?.treasures ?? [])
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const heroMap = useMemo(() => new Map(allHeroes.map(h => [h.id, h])), [allHeroes])
  const stoneGroups = useMemo(() => groupStones(stones), [stones])

  const useStone = async (stoneId: string) => {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`${API}/hero/use-stone/${userId}/${stoneId}`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setMessage(data.error)
      } else if (!data.hero) {
        setMessage('石头不存在')
      } else {
        const heroName = heroMap.get(data.hero.heroId)?.name ?? data.hero.heroId
        setMessage(`使用成功: ${heroName} 加入英雄管理`)
        await refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--text-gold)' }}>背包</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/city')}>主城</button>
          <button onClick={() => navigate('/heroes')}>英雄</button>
          <button onClick={() => navigate('/recruit')}>招贤馆</button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '8px', background: 'var(--bg-medium)', borderRadius: '4px', marginBottom: '12px', textAlign: 'center', color: 'var(--text-gold)' }}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {([
          { key: 'stones', label: `英雄石 (${stones.length})` },
          { key: 'tickets', label: '抽卡券' },
          { key: 'treasures', label: `宝具 (${treasures.length})` },
          { key: 'materials', label: '材料' },
        ] as Array<{ key: Tab; label: string }>).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '8px',
            background: tab === t.key ? 'var(--bg-light)' : 'var(--bg-medium)',
            border: `1px solid ${tab === t.key ? 'var(--border-gold)' : 'var(--border-wood)'}`,
            color: tab === t.key ? 'var(--text-gold)' : 'var(--text-light)',
            fontWeight: tab === t.key ? 'bold' : 'normal',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{
        background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
        borderRadius: '8px', padding: '16px', flex: 1, overflowY: 'auto',
      }}>
        {tab === 'stones' && (
          <>
            {stoneGroups.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                没有待用的英雄石 — 去招贤馆抽卡吧
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                {stoneGroups.map(g => {
                  const hero = heroMap.get(g.heroId)
                  const isHigh = g.starLevel >= 4
                  return (
                    <div key={`${g.starLevel}-${g.heroId}`} style={{
                      background: isHigh ? 'linear-gradient(135deg, #ff6b6b22, #c6282822)' : 'var(--bg-dark)',
                      border: `1px solid ${isHigh ? '#ff6b6b' : 'var(--border-wood)'}`,
                      borderRadius: '6px', padding: '10px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-light)', fontWeight: 'bold' }}>
                          {hero?.name ?? g.heroId}{g.stoneIds.length > 1 && <span style={{ color: 'var(--text-gold)', marginLeft: '6px' }}>× {g.stoneIds.length}</span>}
                        </span>
                        <span style={{ color: 'var(--text-gold)', fontSize: '12px' }}>
                          {'★'.repeat(g.starLevel)}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>
                        {hero?.faction ?? '?'} | 英雄石
                      </div>
                      <button
                        disabled={busy}
                        onClick={() => useStone(g.stoneId)}
                        style={{ width: '100%', fontSize: '12px', padding: '6px' }}
                      >
                        使用 (生成英雄)
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {tab === 'tickets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(['bailiTicket', 'qianliTicket', 'wanliTicket'] as const).map(t => {
              const amount = materials.find(m => m.type === t)?.amount ?? 0
              return (
                <div key={t} style={{
                  background: 'var(--bg-dark)', padding: '12px', borderRadius: '4px',
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span style={{ color: 'var(--text-light)' }}>{TICKET_LABEL[t]}</span>
                  <span style={{ color: 'var(--text-gold)', fontWeight: 'bold' }}>{amount} 张</span>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'treasures' && (
          treasures.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
              背包中没有宝具
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {treasures.map(t => {
                const n = t.count ?? 1
                return (
                  <div key={t.id} style={{
                    background: 'var(--bg-dark)', padding: '10px', borderRadius: '4px',
                    border: '1px solid var(--border-wood)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: t.type === 'main' ? 'var(--text-gold)' : 'var(--color-blue)', fontWeight: 'bold' }}>
                        {t.name} * {n}
                      </span>
                      <span style={{ color: 'var(--text-gold)', fontSize: '12px' }}>
                        {'★'.repeat(t.starLevel)}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      {t.type === 'main' ? '主印' : '辅印'} | 触发率: {Math.round(t.triggerRate * 100)}%
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                      {t.skill?.description ?? ''}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {tab === 'materials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {materials.filter(m => !['bailiTicket', 'qianliTicket', 'wanliTicket'].includes(m.type)).length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                没有其他材料
              </div>
            ) : (
              materials.filter(m => !['bailiTicket', 'qianliTicket', 'wanliTicket'].includes(m.type)).map(m => (
                <div key={m.type} style={{
                  background: 'var(--bg-dark)', padding: '10px', borderRadius: '4px',
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span style={{ color: 'var(--text-light)' }}>{MAT_LABEL[m.type] ?? m.type}</span>
                  <span style={{ color: 'var(--text-gold)', fontWeight: 'bold' }}>{m.amount}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}