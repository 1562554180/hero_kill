import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Hero, HeroInstance, Treasure } from '@hero-legend/shared-types'

const NAME_TO_ID: Record<string, string> = {
  '扁鹊': 'bian-que', '曹操': 'cao-cao', '陈胜': 'chen-sheng', '程咬金': 'cheng-yao-jin',
  '勾践': 'gou-jian', '关羽': 'guan-yu', '韩信': 'han-xin', '荆轲': 'jing-ke',
  '李逵': 'li-kui', '李世民': 'li-shi-min', '李师师': 'li-shi-shi', '李煜': 'li-yu',
  '刘邦': 'liu-bang', '吕雉': 'lv-zhi', '慕容': 'mu-rong', '秦琼': 'qin-qiong',
  '商鞅': 'shang-yang', '宋江': 'song-jiang', '澹台名': 'tan-tai-ming', '铁木真': 'tie-mu-zhen',
  '武松': 'wu-song', '武则天': 'wu-ze-tian', '项羽': 'xiang-yu', '小乔': 'xiao-qiao',
  '杨延昭': 'yang-yan-zhao', '嬴政': 'ying-zheng', '虞姬': 'yu-ji',
  '岳飞': 'yue-fei', '赵匡胤': 'zhao-kuang-yin', '朱元璋': 'zhu-yuan-zhang', '诸葛亮': 'zhuge-liang',
  '吴三桂': 'wu-san-gui', '宇文化及': 'yu-wen-hua-ji', '孟获': 'meng-huo',
  '萧太后': 'xiao-tai-hou', '兰陵王': 'lan-ling-wang',
}

const portraitModules = import.meta.glob('../../images/*.png', { eager: true, import: 'default' }) as Record<string, string>
const HERO_PORTRAITS: Record<string, string> = {}
for (const [path, url] of Object.entries(portraitModules)) {
  const filename = path.replace('../../images/', '').replace('.png', '')
  const heroId = NAME_TO_ID[filename]
  if (heroId) HERO_PORTRAITS[heroId] = url
}

const API = '/api'

export function HeroPage() {
  const navigate = useNavigate()
  const [allHeroes, setAllHeroes] = useState<Hero[]>([])
  const [myHeroes, setMyHeroes] = useState<HeroInstance[]>([])
  const [inventory, setInventory] = useState<Treasure[]>([])
  const [userId, setUserId] = useState<string>('')
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  // 镶嵌凹槽选中状态: 点击槽位时展开可镶嵌列表
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

  const getStarDisplay = (level: number) => '★'.repeat(level) + '☆'.repeat(5 - level)

  const equipTreasure = async (instanceId: string, slotType: 'main' | 'sub', slotIndex: number, treasureId: string) => {
    const res = await fetch(`${API}/hero/equip-treasure/${userId}/${instanceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotType, slotIndex, treasureId }),
    })
    const data = await res.json()
    if (data.success) {
      setMessage('镶嵌成功!')
      setActiveSlot(null)
      await refreshSave()
    } else {
      setMessage(data.error ?? '镶嵌失败')
    }
  }

  const unequipTreasure = async (instanceId: string, slotType: 'main' | 'sub', slotIndex: number) => {
    const res = await fetch(`${API}/hero/unequip-treasure/${userId}/${instanceId}`, {
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

  // 按 instanceId 选 (同名多份时区分)
  const selectedInstance = myHeroes.find(h => h.instanceId === selectedInstanceId)
  const selectedConfig = selectedInstance
    ? allHeroes.find(h => h.id === selectedInstance.heroId)
    : null

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text-gold)' }}>英雄管理 ({myHeroes.length})</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/city')}>主城</button>
          <button onClick={() => navigate('/backpack')}>背包</button>
          <button onClick={() => navigate('/recruit')}>招贤馆</button>
          <button onClick={() => navigate('/stages')}>关卡</button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '8px', background: 'var(--bg-medium)', borderRadius: '4px', marginBottom: '12px', textAlign: 'center', color: 'var(--text-gold)' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left: hero list */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ color: 'var(--text-gold)', marginBottom: '12px' }}>我的英雄</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '4px' }}>
            {myHeroes.length === 0 && (
              <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
                还没有英雄 — 去招贤馆抽卡获得英雄石, 在背包"使用"获得英雄
              </div>
            )}
            {myHeroes.map((h, idx) => {
              const cfg = allHeroes.find(c => c.id === h.heroId)
              if (!cfg) return null
              // 同名多份时加序号标记
              const sameNameCount = myHeroes.filter(x => x.heroId === h.heroId).length
              const showIndex = sameNameCount > 1
              const sameNameIdx = myHeroes.slice(0, idx + 1).filter(x => x.heroId === h.heroId).length
              return (
                <div key={h.instanceId ?? `${h.heroId}-${idx}`} onClick={() => { setSelectedInstanceId(h.instanceId ?? null); setActiveSlot(null) }} style={{
                  background: selectedInstanceId === h.instanceId ? 'var(--bg-light)' : 'var(--bg-medium)',
                  border: `1px solid ${selectedInstanceId === h.instanceId ? 'var(--border-gold)' : 'var(--border-wood)'}`,
                  borderRadius: '6px', padding: '10px', cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    {HERO_PORTRAITS[h.heroId] && (
                      <img
                        src={HERO_PORTRAITS[h.heroId]}
                        alt={cfg.name}
                        style={{
                          width: '40px', height: '40px', borderRadius: '4px',
                          objectFit: 'cover', marginRight: '10px',
                          border: '1px solid var(--border-wood)',
                          background: 'var(--bg-dark)',
                        }}
                      />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ color: 'var(--text-light)', fontWeight: 'bold' }}>
                        {cfg.name}{showIndex && <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '4px' }}>#{sameNameIdx}</span>}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                        Lv.{h.level} | {cfg.faction} | HP {cfg.baseHp + h.starLevel - 1}
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-gold)', fontSize: '12px' }}>{getStarDisplay(h.starLevel)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: hero detail */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
          {selectedConfig && selectedInstance ? (
            <div style={{
              background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
              borderRadius: '8px', padding: '20px',
            }}>
              <h3 style={{ color: 'var(--text-gold)', fontSize: '20px', marginBottom: '8px' }}>
                {selectedConfig.name}
              </h3>
              {HERO_PORTRAITS[selectedConfig.id] && (
                <img
                  src={HERO_PORTRAITS[selectedConfig.id]}
                  alt={selectedConfig.name}
                  style={{
                    width: '120px', height: '120px', borderRadius: '8px',
                    objectFit: 'cover', marginBottom: '12px',
                    border: '2px solid var(--border-wood)',
                    background: 'var(--bg-dark)',
                    display: 'block',
                  }}
                />
              )}

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
                {activeSlot && <span style={{ fontSize: '12px', color: '#ff6b6b', marginLeft: '8px' }}>点击宝具镶嵌 (从背包)</span>}
              </h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedInstance.treasures.main.map((t, i) => {
                  const isActive = activeSlot?.slotType === 'main' && activeSlot?.slotIndex === i
                  return (
                    <div key={`main-${i}`}
                      onClick={() => setActiveSlot(isActive ? null : { slotType: 'main', slotIndex: i })}
                      onDoubleClick={() => { if (t) unequipTreasure(selectedInstance.instanceId!, 'main', i) }}
                      style={{
                        background: isActive ? '#3a2a1a' : 'var(--bg-dark)',
                        border: `1px ${isActive ? 'solid #ff6b6b' : t ? 'solid var(--border-wood)' : 'dashed var(--border-wood)'}`,
                        borderRadius: '4px', padding: '6px 12px', fontSize: '12px',
                        color: t ? 'var(--text-light)' : 'var(--text-muted)',
                        cursor: 'pointer', userSelect: 'none',
                      }}
                    >
                      {t ? (t as any).name : '空'}
                    </div>
                  )
                })}
                {selectedInstance.treasures.sub.map((t, i) => {
                  const isActive = activeSlot?.slotType === 'sub' && activeSlot?.slotIndex === i
                  return (
                    <div key={`sub-${i}`}
                      onClick={() => setActiveSlot(isActive ? null : { slotType: 'sub', slotIndex: i })}
                      onDoubleClick={() => { if (t) unequipTreasure(selectedInstance.instanceId!, 'sub', i) }}
                      style={{
                        background: isActive ? '#3a2a1a' : 'var(--bg-dark)',
                        border: `1px ${isActive ? 'solid #ff6b6b' : t ? 'solid #3a2a1a' : 'dashed #3a2a1a'}`,
                        borderRadius: '4px', padding: '6px 12px', fontSize: '12px',
                        color: t ? 'var(--text-light)' : 'var(--text-muted)',
                        cursor: 'pointer', userSelect: 'none',
                      }}
                    >
                      {t ? (t as any).name : '空'}
                    </div>
                  )
                })}
              </div>

              {/* 可镶嵌列表: 点击槽位后展示匹配类型的宝具 */}
              {activeSlot && (() => {
                const candidates = inventory.filter(t => t.type === activeSlot.slotType)
                return candidates.length > 0 ? (
                  <div style={{ marginTop: '8px', background: 'var(--bg-dark)', borderRadius: '4px', padding: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '210px', overflowY: 'auto' }}>
                      {candidates.map(t => {
                        const n = t.count ?? 1
                        return (
                          <div key={t.id}
                            onDoubleClick={() => equipTreasure(selectedInstance.instanceId!, activeSlot.slotType, activeSlot.slotIndex, t.id)}
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