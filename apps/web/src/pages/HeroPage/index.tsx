import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Hero, HeroInstance, Treasure } from '@hero-legend/shared-types'

const API = '/api'

export function HeroPage() {
  const navigate = useNavigate()
  const [allHeroes, setAllHeroes] = useState<Hero[]>([])
  const [myHeroes, setMyHeroes] = useState<HeroInstance[]>([])
  const [inventory, setInventory] = useState<Treasure[]>([])
  const [userId, setUserId] = useState<string>('')
  const [selectedHero, setSelectedHero] = useState<string | null>(null)
  const [selectedTreasure, setSelectedTreasure] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  // 镶嵌凹槽选中状态：点击槽位时展开可镶嵌列表
  const [activeSlot, setActiveSlot] = useState<{ slotType: 'main' | 'sub'; slotIndex: number } | null>(null)

  useEffect(() => {
    const uid = localStorage.getItem('hero-legend-userId') || ''
    setUserId(uid)

    Promise.all([
      fetch(`${API}/hero`).then(r => r.json()),
      fetch(`${API}/save/${uid}`).then(r => r.json()),
    ]).then(([heroData, saveData]) => {
      setAllHeroes(heroData.heroes ?? [])
      setMyHeroes(saveData?.heroes ?? [])
      setInventory(saveData?.treasures ?? [])
    })
  }, [])

  const refreshSave = async () => {
    const res = await fetch(`${API}/save/${userId}`)
    const data = await res.json()
    setMyHeroes(data?.heroes ?? [])
    setInventory(data?.treasures ?? [])
  }

  const isOwned = (heroId: string) => myHeroes.some(h => h.heroId === heroId)

  const getStarDisplay = (level: number) => '★'.repeat(level) + '☆'.repeat(5 - level)

  const recruit = async (heroId: string) => {
    const res = await fetch(`${API}/hero/recruit/${userId}/${heroId}`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      setMessage(`招募成功: ${allHeroes.find(h => h.id === heroId)?.name}`)
      await refreshSave()
    } else {
      setMessage(data.error ?? '招募失败')
    }
  }

  const upgradeStar = async (heroId: string) => {
    const res = await fetch(`${API}/hero/upgrade-star/${userId}/${heroId}`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      setMessage('升星成功!')
      await refreshSave()
    } else {
      setMessage(data.error ?? '升星失败')
    }
  }

  const equipTreasure = async (heroId: string, slotType: 'main' | 'sub', slotIndex: number, treasureId: string) => {
    const res = await fetch(`${API}/hero/equip-treasure/${userId}/${heroId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotType, slotIndex, treasureId }),
    })
    const data = await res.json()
    if (data.success) {
      setMessage('镶嵌成功!')
      setSelectedTreasure(null)
      await refreshSave()
    } else {
      setMessage(data.error ?? '镶嵌失败')
    }
  }

  const unequipTreasure = async (heroId: string, slotType: 'main' | 'sub', slotIndex: number) => {
    const res = await fetch(`${API}/hero/unequip-treasure/${userId}/${heroId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotType, slotIndex }),
    })
    const data = await res.json()
    if (data.success) {
      setMessage('卸下成功!')
      await refreshSave()
    } else {
      setMessage(data.error ?? '卸下失败')
    }
  }

  const selectedInstance = myHeroes.find(h => h.heroId === selectedHero)
  const selectedConfig = allHeroes.find(h => h.id === selectedHero)

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text-gold)' }}>英雄管理</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/city')}>主城</button>
          <button onClick={() => navigate('/stages')}>关卡</button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '8px', background: 'var(--bg-medium)', borderRadius: '4px', marginBottom: '12px', textAlign: 'center', color: 'var(--text-gold)' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: hero list */}
        <div>
          <h3 style={{ color: 'var(--text-gold)', marginBottom: '12px' }}>我的英雄 ({myHeroes.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {myHeroes.map(h => {
              const cfg = allHeroes.find(c => c.id === h.heroId)
              if (!cfg) return null
              return (
                <div key={h.heroId} onClick={() => { setSelectedHero(h.heroId); setSelectedTreasure(null) }} style={{
                  background: selectedHero === h.heroId ? 'var(--bg-light)' : 'var(--bg-medium)',
                  border: `1px solid ${selectedHero === h.heroId ? 'var(--border-gold)' : 'var(--border-wood)'}`,
                  borderRadius: '6px', padding: '10px', cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-light)', fontWeight: 'bold' }}>{cfg.name}</span>
                    <span style={{ color: 'var(--text-gold)', fontSize: '12px' }}>{getStarDisplay(h.starLevel)}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                    Lv.{h.level} | {cfg.faction} | HP {cfg.baseHp + h.starLevel - 1}
                  </div>
                </div>
              )
            })}
          </div>

          <h3 style={{ color: 'var(--text-gold)', margin: '20px 0 12px' }}>可招募</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allHeroes.filter(h => !isOwned(h.id)).map(h => (
              <div key={h.id} style={{
                background: 'var(--bg-medium)', border: '1px solid #3a2a1a',
                borderRadius: '6px', padding: '10px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>{h.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '8px' }}>
                    {getStarDisplay(h.starLevel)} | {h.faction}
                  </span>
                </div>
                <button style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => recruit(h.id)}>
                  招募
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: hero detail */}
        <div>
          {selectedConfig && selectedInstance ? (
            <div style={{
              background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
              borderRadius: '8px', padding: '20px',
            }}>
              <h3 style={{ color: 'var(--text-gold)', fontSize: '20px', marginBottom: '8px' }}>
                {selectedConfig.name}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--bg-dark)', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>等级</div>
                  <div style={{ color: 'var(--text-light)' }}>Lv.{selectedInstance.level}</div>
                </div>
                <div style={{ background: 'var(--bg-dark)', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>星级</div>
                  <div style={{ color: 'var(--text-gold)' }}>{getStarDisplay(selectedInstance.starLevel)}</div>
                </div>
                <div style={{ background: 'var(--bg-dark)', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>血量</div>
                  <div style={{ color: 'var(--text-light)' }}>{selectedConfig.baseHp + selectedInstance.starLevel - 1}</div>
                </div>
                <div style={{ background: 'var(--bg-dark)', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>阵营</div>
                  <div style={{ color: 'var(--text-light)' }}>{selectedConfig.faction}</div>
                </div>
              </div>

              <h4 style={{ color: 'var(--text-gold)', marginBottom: '8px' }}>技能</h4>
              {selectedConfig.skills.map(s => (
                <div key={s.id} style={{ background: 'var(--bg-dark)', padding: '8px', borderRadius: '4px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-blue)' }}>{s.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}> ({s.type === 'active' ? '主动' : '被动'})</span>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{s.description}</p>
                </div>
              ))}

              {/* Treasure slots */}
              <h4 style={{ color: 'var(--text-gold)', margin: '16px 0 8px' }}>
                宝具槽
                {activeSlot && <span style={{ fontSize: '12px', color: '#ff6b6b', marginLeft: '8px' }}>双击宝具镶嵌</span>}
              </h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedInstance.treasures.main.map((t, i) => {
                  const isActive = activeSlot?.slotType === 'main' && activeSlot?.slotIndex === i
                  return (
                    <div key={`main-${i}`}
                      onClick={() => setActiveSlot(isActive ? null : { slotType: 'main', slotIndex: i })}
                      onDoubleClick={() => { if (t) unequipTreasure(selectedInstance.heroId, 'main', i) }}
                      style={{
                        background: isActive ? '#3a2a1a' : 'var(--bg-dark)',
                        border: `1px ${isActive ? 'solid #ff6b6b' : t ? 'solid var(--border-wood)' : 'dashed var(--border-wood)'}`,
                        borderRadius: '4px', padding: '6px 12px', fontSize: '12px',
                        color: t ? 'var(--text-light)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      主印{i + 1}: {t ? `${(t as any).name} (双击卸下)` : '空'}
                    </div>
                  )
                })}
                {selectedInstance.treasures.sub.map((t, i) => {
                  const isActive = activeSlot?.slotType === 'sub' && activeSlot?.slotIndex === i
                  return (
                    <div key={`sub-${i}`}
                      onClick={() => setActiveSlot(isActive ? null : { slotType: 'sub', slotIndex: i })}
                      onDoubleClick={() => { if (t) unequipTreasure(selectedInstance.heroId, 'sub', i) }}
                      style={{
                        background: isActive ? '#3a2a1a' : 'var(--bg-dark)',
                        border: `1px ${isActive ? 'solid #ff6b6b' : t ? 'solid #3a2a1a' : 'dashed #3a2a1a'}`,
                        borderRadius: '4px', padding: '6px 12px', fontSize: '12px',
                        color: t ? 'var(--text-light)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      辅印{i + 1}: {t ? `${(t as any).name} (双击卸下)` : '空'}
                    </div>
                  )
                })}
              </div>

              {/* 可镶嵌列表：点击槽位后展示匹配类型的宝具 */}
              {activeSlot && (() => {
                const candidates = inventory.filter(t => t.type === activeSlot.slotType)
                return candidates.length > 0 ? (
                  <div style={{ marginTop: '8px', background: 'var(--bg-dark)', borderRadius: '4px', padding: '10px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>
                      可镶嵌的{activeSlot.slotType === 'main' ? '主印' : '辅印'}：
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {candidates.map(t => {
                        const n = t.count ?? 1
                        return (
                          <div key={t.id}
                            onDoubleClick={() => equipTreasure(selectedInstance.heroId, activeSlot.slotType, activeSlot.slotIndex, t.id)}
                            style={{
                              background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
                              borderRadius: '4px', padding: '6px 10px', fontSize: '12px',
                              cursor: 'pointer', userSelect: 'none',
                            }}
                          >
                            <div style={{ color: t.type === 'main' ? 'var(--text-gold)' : 'var(--color-blue)' }}>
                              {t.name} * {n}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                              {'★'.repeat(t.starLevel)} | 触发: {Math.round(t.triggerRate * 100)}%
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                              {t.skill.description}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    背包中没有可镶嵌的{activeSlot.slotType === 'main' ? '主印' : '辅印'}
                  </div>
                )
              })()}

              {selectedInstance.starLevel < 5 && (
                <button style={{ marginTop: '16px', width: '100%' }}
                  onClick={() => upgradeStar(selectedInstance.heroId)}>
                  升星 ({getStarDisplay(selectedInstance.starLevel)} → {getStarDisplay(selectedInstance.starLevel + 1)})
                </button>
              )}
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-medium)', border: '1px solid #3a2a1a',
              borderRadius: '8px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)',
            }}>
              选择一个英雄查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
