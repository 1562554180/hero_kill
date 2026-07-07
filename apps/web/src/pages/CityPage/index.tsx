import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = '/api'

interface SaveData {
  userId: string; mainCityLevel: number; buildings: any[]
  materials: { type: string; amount: number }[]
}

const buildingNames: Record<string, string> = {
  mainCity: '主城', recruit: '招贤馆', smelt: '熔炼炉',
  treasureWorkshop: '宝具工坊', training: '校练场', commandPost: '点将台',
}

const buildingDescs: Record<string, string> = {
  mainCity: '提升金币征收量', recruit: '解锁更高星级英雄招募',
  smelt: '解锁更高星级英雄熔炼', treasureWorkshop: '提高辅印强化等级上限',
  training: '提高训练成长值', commandPost: '增加持有英雄数量上限',
}

export function CityPage() {
  const navigate = useNavigate()
  const [save, setSave] = useState<SaveData | null>(null)
  const [message, setMessage] = useState('')

  const userId = localStorage.getItem('hero-legend-userId') || ''

  useEffect(() => {
    if (!userId) { navigate('/'); return }
    fetch(`${API}/save/${userId}`).then(r => r.json()).then(setSave)
  }, [userId])

  const upgradeBuilding = async (type: string) => {
    const gold = save?.materials?.find(m => m.type === 'gold')?.amount ?? 0
    const cost = 200 + (save?.buildings.find((b: any) => b.type === type)?.level ?? 1) * 100
    if (gold < cost) { setMessage('金币不足'); return }

    const buildings = save!.buildings.map((b: any) =>
      b.type === type ? { ...b, level: b.level + 1 } : b
    )
    const materials = save!.materials.map((m: any) =>
      m.type === 'gold' ? { ...m, amount: m.amount - cost } : m
    )

    const res = await fetch(`${API}/save/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildings, materials }),
    })
    if (!res.ok) { setMessage('升级失败'); return }
    // 重新拉取完整存档, 避免响应缺少字段
    const fresh = await fetch(`${API}/save/${userId}`).then(r => r.json())
    setSave(fresh)
    setMessage(`${buildingNames[type]} 升级成功!`)
  }

  if (!save) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>

  const gold = save.materials?.find(m => m.type === 'gold')?.amount ?? 0

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text-gold)' }}>主城</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ color: 'var(--text-gold)' }}>金币: {gold}</span>
          <button onClick={() => navigate('/stages')}>关卡</button>
          <button onClick={() => navigate('/heroes')}>英雄</button>
          <button onClick={() => navigate('/backpack')}>背包</button>
          <button onClick={() => navigate('/recruit')}>招贤馆</button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '8px', background: 'var(--bg-medium)', borderRadius: '4px', marginBottom: '12px', textAlign: 'center', color: 'var(--text-gold)' }}>
          {message}
        </div>
      )}

      <div style={{
        background: 'linear-gradient(135deg, var(--bg-light), var(--bg-medium))',
        border: '2px solid var(--border-gold)', borderRadius: '12px', padding: '20px',
        textAlign: 'center', marginBottom: '20px',
      }}>
        <h3 style={{ color: 'var(--text-gold)', fontSize: '24px' }}>主城 Lv.{save.mainCityLevel}</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>每次征收金币: {save.mainCityLevel * 100}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {(save.buildings ?? []).map((b: any) => {
          const cost = 200 + b.level * 100
          return (
            <div key={b.type} style={{
              background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
              borderRadius: '8px', padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ color: 'var(--text-gold)' }}>{buildingNames[b.type] || b.type}</h4>
                <span style={{ color: 'var(--text-gold)', fontSize: '14px' }}>Lv.{b.level}</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>
                {buildingDescs[b.type] || ''}
              </p>
              {b.type === 'recruit' && (
                <button style={{ width: '100%', fontSize: '12px', marginBottom: '8px' }}
                  onClick={() => navigate('/recruit')}>
                  进入招贤馆
                </button>
              )}
              {b.type === 'smelt' && (
                <button style={{ width: '100%', fontSize: '12px', marginBottom: '8px' }}
                  onClick={() => navigate('/smelter')}>
                  进入熔炼炉
                </button>
              )}
              {b.type === 'treasureWorkshop' && (
                <button style={{ width: '100%', fontSize: '12px', marginBottom: '8px' }}
                  onClick={() => navigate('/treasure-workshop')}>
                  进入宝具工坊
                </button>
              )}
              <button style={{ width: '100%', fontSize: '12px' }}
                onClick={() => upgradeBuilding(b.type)}>
                升级 (需 {cost} 金币)
              </button>
            </div>
          )
        })}
        {/* 珍宝阁: 不可升级, 仅入口 */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.10), var(--bg-medium))',
          border: '1px solid var(--border-gold)',
          borderRadius: '8px', padding: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ color: 'var(--text-gold)' }}>珍宝阁</h4>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>抽取宝具</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>
            消耗宝具券抽取稀有宝具与碎片
          </p>
          <button style={{ width: '100%', fontSize: '12px' }}
            onClick={() => navigate('/treasure-pavilion')}>
            进入珍宝阁
          </button>
        </div>
      </div>
    </div>
  )
}
