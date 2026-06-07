import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Hero, HeroInstance } from '@hero-legend/shared-types'

const API = '/api'

export function HeroPage() {
  const navigate = useNavigate()
  const [allHeroes, setAllHeroes] = useState<Hero[]>([])
  const [myHeroes, setMyHeroes] = useState<HeroInstance[]>([])
  const [userId, setUserId] = useState<string>('')
  const [selectedHero, setSelectedHero] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const uid = localStorage.getItem('hero-legend-userId') || ''
    setUserId(uid)

    Promise.all([
      fetch(`${API}/hero`).then(r => r.json()),
      fetch(`${API}/save/${uid}`).then(r => r.json()),
    ]).then(([heroData, saveData]) => {
      setAllHeroes(heroData.heroes ?? [])
      setMyHeroes(saveData?.heroes ?? [])
    })
  }, [])

  const isOwned = (heroId: string) => myHeroes.some(h => h.heroId === heroId)

  const getStarDisplay = (level: number) => '★'.repeat(level) + '☆'.repeat(5 - level)

  const recruit = async (heroId: string) => {
    const res = await fetch(`${API}/hero/recruit/${userId}/${heroId}`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      setMessage(`招募成功: ${allHeroes.find(h => h.id === heroId)?.name}`)
      setMyHeroes(prev => [...prev, data.hero])
    } else {
      setMessage(data.error ?? '招募失败')
    }
  }

  const upgradeStar = async (heroId: string) => {
    const res = await fetch(`${API}/hero/upgrade-star/${userId}/${heroId}`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      setMessage('升星成功!')
      setMyHeroes(prev => prev.map(h => h.heroId === heroId ? data.hero : h))
    } else {
      setMessage(data.error ?? '升星失败')
    }
  }

  const selectedInstance = myHeroes.find(h => h.heroId === selectedHero)
  const selectedConfig = allHeroes.find(h => h.id === selectedHero)

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text-gold)' }}>英雄管理</h2>
        <button onClick={() => navigate('/stages')}>返回关卡</button>
      </div>

      {message && (
        <div style={{ padding: '8px', background: 'var(--bg-medium)', borderRadius: '4px', marginBottom: '12px', textAlign: 'center', color: 'var(--text-gold)' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* 左侧：英雄列表 */}
        <div>
          <h3 style={{ color: 'var(--text-gold)', marginBottom: '12px' }}>我的英雄 ({myHeroes.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {myHeroes.map(h => {
              const cfg = allHeroes.find(c => c.id === h.heroId)
              if (!cfg) return null
              return (
                <div key={h.heroId} onClick={() => setSelectedHero(h.heroId)} style={{
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
                    {' | '}宝具: 主{h.treasures.main.filter(Boolean).length}/{h.treasures.main.length}
                    {' + '}辅{h.treasures.sub.filter(Boolean).length}/{h.treasures.sub.length}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                    技能: {cfg.skills.map(s => s.name).join(', ')}
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

        {/* 右侧：英雄详情 */}
        <div>
          {selectedConfig && selectedInstance ? (
            <div style={{
              background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
              borderRadius: '8px', padding: '20px',
            }}>
              <h3 style={{ color: 'var(--text-gold)', fontSize: '20px', marginBottom: '8px' }}>
                {selectedConfig.name}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
                {selectedConfig.description}
              </p>

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

              <h4 style={{ color: 'var(--text-gold)', margin: '16px 0 8px' }}>宝具槽</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedInstance.treasures.main.map((t, i) => (
                  <div key={`main-${i}`} style={{
                    background: 'var(--bg-dark)', border: '1px dashed var(--border-wood)',
                    borderRadius: '4px', padding: '6px 12px', fontSize: '12px',
                    color: t ? 'var(--text-light)' : 'var(--text-muted)',
                  }}>
                    主印{i + 1}: {t ? (t as any).name : '空'}
                  </div>
                ))}
                {selectedInstance.treasures.sub.map((t, i) => (
                  <div key={`sub-${i}`} style={{
                    background: 'var(--bg-dark)', border: '1px dashed #3a2a1a',
                    borderRadius: '4px', padding: '6px 12px', fontSize: '12px',
                    color: t ? 'var(--text-light)' : 'var(--text-muted)',
                  }}>
                    辅印{i + 1}: {t ? (t as any).name : '空'}
                  </div>
                ))}
              </div>

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
