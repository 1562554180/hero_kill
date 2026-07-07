import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Hero, HeroInstance, Treasure } from '@hero-legend/shared-types'
import { getSkillIcon } from '../../skillIcons'

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

const portraitModules = import.meta.glob('../../images/*.jpg', { eager: true, import: 'default' }) as Record<string, string>
const HERO_PORTRAITS_BY_NAME: Record<string, string> = {}
for (const [path, url] of Object.entries(portraitModules)) {
  const filename = path.replace('../../images/', '').replace('.jpg', '')
  HERO_PORTRAITS_BY_NAME[filename] = url
}
// 同时按 heroId 索引 (兼容旧代码)
const HERO_PORTRAITS: Record<string, string> = {}
for (const [cnName, heroId] of Object.entries(NAME_TO_ID)) {
  if (HERO_PORTRAITS_BY_NAME[cnName]) HERO_PORTRAITS[heroId] = HERO_PORTRAITS_BY_NAME[cnName]
}

const API = '/api'

// 宝具星级 → 边框色 (与背包宝具展示一致)
const STAR_BORDER: Record<number, string> = {
  5: '#ffd700',
  4: '#a78bfa',
  3: '#60a5fa',
  2: '#86efac',
  1: '#9ca3af',
}

// 英雄星级 → 名字颜色
const STAR_NAME_COLOR: Record<number, string> = {
  5: '#ffd700',
  4: '#a78bfa',
  3: '#60a5fa',
  2: '#86efac',
  1: '#9ca3af',
}

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
  const [equipPage, setEquipPage] = useState(0)

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
        {/* Left: hero grid */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ color: 'var(--text-gold)', marginBottom: '12px' }}>我的英雄</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
            gap: '8px', flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '4px',
            alignContent: 'start',
          }}>
            {myHeroes.length === 0 && (
              <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center', gridColumn: '1 / -1' }}>
                还没有英雄 — 去招贤馆抽卡获得英雄石, 在背包"使用"获得英雄
              </div>
            )}

            {myHeroes.map((h, idx) => {
              const cfg = allHeroes.find(c => c.id === h.heroId)
              if (!cfg) return null
              const sameNameCount = myHeroes.filter(x => x.heroId === h.heroId).length
              const showIndex = sameNameCount > 1
              const sameNameIdx = myHeroes.slice(0, idx + 1).filter(x => x.heroId === h.heroId).length
              const nameColor = STAR_NAME_COLOR[h.starLevel] ?? 'var(--text-light)'
              const avatar = HERO_PORTRAITS_BY_NAME[cfg.name] ?? HERO_PORTRAITS[h.heroId]
              return (
                <div
                  key={h.instanceId ?? `${h.heroId}-${idx}`}
                  onClick={() => { setSelectedInstanceId(h.instanceId ?? null); setActiveSlot(null) }}
                  title={cfg.name}
                  style={{
                    background: selectedInstanceId === h.instanceId ? 'var(--bg-light)' : 'var(--bg-medium)',
                    border: `1px solid ${selectedInstanceId === h.instanceId ? 'var(--border-gold)' : 'var(--border-wood)'}`,
                    borderRadius: '6px', padding: '4px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  }}
                >
                  {avatar && (
                    <img
                      src={avatar}
                      alt={cfg.name}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: '4px',
                        objectFit: 'cover', display: 'block',
                        border: '1px solid var(--border-wood)',
                        background: 'var(--bg-dark)',
                      }}
                    />
                  )}
                  <span style={{ color: nameColor, fontWeight: 'bold', fontSize: '12px', textAlign: 'center', lineHeight: 1.1 }}>
                    {cfg.name}{showIndex && <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginLeft: '2px' }}>#{sameNameIdx}</span>}
                  </span>
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
              <div style={{ display: 'flex', gap: '14px', alignItems: 'stretch', marginBottom: '16px' }}>
                {HERO_PORTRAITS[selectedConfig.id] && (
                  <img
                    src={HERO_PORTRAITS[selectedConfig.id]}
                    alt={selectedConfig.name}
                    style={{
                      width: '120px', height: '120px', borderRadius: '8px',
                      objectFit: 'cover',
                      border: '2px solid var(--border-wood)',
                      background: 'var(--bg-dark)',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', flex: 1, alignContent: 'stretch' }}>
                  <div style={{ background: 'var(--bg-dark)', padding: '6px 10px', borderRadius: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>等级</div>
                    <div style={{ color: 'var(--text-light)', fontSize: '13px', fontWeight: 'bold' }}>Lv.{selectedInstance.level}</div>
                  </div>
                  <div style={{ background: 'var(--bg-dark)', padding: '6px 10px', borderRadius: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>星级</div>
                    <div style={{ color: 'var(--text-gold)', fontSize: '13px' }}>{getStarDisplay(selectedInstance.starLevel)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-dark)', padding: '6px 10px', borderRadius: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>血量</div>
                    <div style={{ color: 'var(--text-light)', fontSize: '13px', fontWeight: 'bold' }}>{selectedConfig.baseHp + selectedInstance.starLevel - 1}</div>
                  </div>
                  <div style={{ background: 'var(--bg-dark)', padding: '6px 10px', borderRadius: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>阵营</div>
                    <div style={{ color: 'var(--text-light)', fontSize: '13px', fontWeight: 'bold' }}>{selectedConfig.faction}</div>
                  </div>
                </div>
              </div>

              <h4 style={{ color: 'var(--text-gold)', marginBottom: '8px' }}>技能</h4>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {selectedConfig.skills.map(s => (
                  <span
                    key={s.id}
                    title={`${s.name} (${s.type === 'active' ? '主动' : '被动'})\n${s.description}`}
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: s.type === 'active' ? 'rgba(255,215,0,0.12)' : 'rgba(144,202,249,0.12)',
                      color: s.type === 'active' ? 'var(--text-gold)' : 'var(--color-blue)',
                      border: `1px solid ${s.type === 'active' ? 'rgba(255,215,0,0.4)' : 'rgba(144,202,249,0.4)'}`,
                      cursor: 'help',
                      userSelect: 'none',
                    }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>

              {/* Treasure slots — 视觉/尺寸与背包宝具格子一致 */}
              <h4 style={{ color: 'var(--text-gold)', margin: '16px 0 8px' }}>
                宝具槽
                {activeSlot && <span style={{ fontSize: '12px', color: '#ff6b6b', marginLeft: '8px' }}>点击宝具镶嵌 (从背包)</span>}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '4px', maxWidth: '320px' }}>
                {selectedInstance.treasures.main.map((t, i) => {
                  const isActive = activeSlot?.slotType === 'main' && activeSlot?.slotIndex === i
                  const tt = t as any
                  const icon = tt ? getSkillIcon(tt.skill?.name ?? tt.name) : null
                  const borderColor = isActive ? '#ff6b6b' : (tt ? (STAR_BORDER[tt.starLevel] ?? 'var(--border-wood)') : 'var(--border-wood)')
                  return (
                    <div key={`main-${i}`} className="treasure-cell" style={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
                      <div
                        title={tt ? `${tt.name} (主印 · ${'★'.repeat(tt.starLevel ?? 1)})\n双击卸下\n${tt.skill?.description ?? ''}` : '空槽 (主印) - 点击选择'}
                        onClick={() => { setActiveSlot(isActive ? null : { slotType: 'main', slotIndex: i }); setEquipPage(0) }}
                        onDoubleClick={() => { if (tt) unequipTreasure(selectedInstance.instanceId!, 'main', i) }}
                        style={{
                          width: '100%', height: '100%',
                          backgroundColor: '#1a1a1a',
                          backgroundImage: icon ? `url(${icon})` : 'none',
                          backgroundPosition: '0px -1px',
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          borderRadius: '3px',
                          border: `1px solid ${borderColor}`,
                          boxShadow: isActive ? '0 0 4px rgba(255,107,107,0.6)' : 'none',
                          position: 'relative',
                          cursor: 'pointer',
                        }}
                      >
                        {!icon && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-gold)',
                            fontSize: '10px', fontWeight: 'bold',
                          }}>{tt ? (tt.name?.[0] ?? '?') : '主'}</div>
                        )}
                        {tt && tt.level > 0 && (
                          <span style={{
                            position: 'absolute', right: '0', bottom: '0',
                            background: 'rgba(0,0,0,0.85)', color: 'var(--text-gold)',
                            fontSize: '9px', fontWeight: 'bold', padding: '0 3px',
                            lineHeight: '11px', borderRadius: '3px 0 0 0',
                          }}>L{tt.level}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {selectedInstance.treasures.sub.map((t, i) => {
                  const isActive = activeSlot?.slotType === 'sub' && activeSlot?.slotIndex === i
                  const tt = t as any
                  const icon = tt ? getSkillIcon(tt.skill?.name ?? tt.name) : null
                  const borderColor = isActive ? '#ff6b6b' : (tt ? (STAR_BORDER[tt.starLevel] ?? '#3a2a1a') : '#3a2a1a')
                  return (
                    <div key={`sub-${i}`} className="treasure-cell" style={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
                      <div
                        title={tt ? `${tt.name} (辅印 · ${'★'.repeat(tt.starLevel ?? 1)})\n双击卸下\n${tt.skill?.description ?? ''}` : '空槽 (辅印) - 点击选择'}
                        onClick={() => { setActiveSlot(isActive ? null : { slotType: 'sub', slotIndex: i }); setEquipPage(0) }}
                        onDoubleClick={() => { if (tt) unequipTreasure(selectedInstance.instanceId!, 'sub', i) }}
                        style={{
                          width: '100%', height: '100%',
                          backgroundColor: '#1a1a1a',
                          backgroundImage: icon ? `url(${icon})` : 'none',
                          backgroundPosition: '0px -1px',
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          borderRadius: '3px',
                          border: `1px solid ${borderColor}`,
                          boxShadow: isActive ? '0 0 4px rgba(255,107,107,0.6)' : 'none',
                          position: 'relative',
                          cursor: 'pointer',
                        }}
                      >
                        {!icon && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--color-blue)',
                            fontSize: '10px', fontWeight: 'bold',
                          }}>{tt ? (tt.name?.[0] ?? '?') : '辅'}</div>
                        )}
                        {tt && tt.level > 0 && (
                          <span style={{
                            position: 'absolute', right: '0', bottom: '0',
                            background: 'rgba(0,0,0,0.85)', color: 'var(--text-gold)',
                            fontSize: '9px', fontWeight: 'bold', padding: '0 3px',
                            lineHeight: '11px', borderRadius: '3px 0 0 0',
                          }}>L{tt.level}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 可镶嵌列表: 点击槽位后展示匹配类型的宝具 */}
              {activeSlot && (() => {
                const candidates = inventory.filter(t => t.type === activeSlot.slotType)
                const heroStar = selectedInstance.starLevel ?? 1
                const PAGE_SIZE = 20
                const totalPages = Math.ceil(candidates.length / PAGE_SIZE)
                const safePage = Math.min(equipPage, Math.max(0, totalPages - 1))
                const pageItems = candidates.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
                return candidates.length > 0 ? (
                  <div style={{ marginTop: '8px', background: 'var(--bg-dark)', borderRadius: '4px', padding: '10px' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))',
                      gap: '4px',
                      maxHeight: '280px', overflowY: 'auto',
                      alignContent: 'start',
                    }}>
                      {pageItems.map(t => {
                        const n = t.count ?? 1
                        const lvl = t.level ?? 0
                        const cnt = t.enhanceCount ?? 0
                        const atMaxLevel = lvl >= 45
                        const outOfAttempts = cnt >= 50
                        // 战斗中实际触发率 = base + level*0.01 + (5星英雄 +0.10)
                        const baseRate = t.triggerRate ?? 0
                        const starBonus = heroStar === 5 ? 0.1 : 0
                        const actualRate = baseRate + lvl * 0.01 + starBonus
                        const ratePercent = Math.round(actualRate * 100)
                        const rateColor = actualRate >= 0.5 ? '#7ec850' : actualRate >= 0.3 ? 'var(--text-gold)' : actualRate >= 0.15 ? '#ff9e3a' : '#ff6b6b'
                        const icon = getSkillIcon(t.skill?.name ?? t.name)
                        const titleText = `${t.name} ×${n}\n★${t.starLevel} ${t.type === 'main' ? '主印' : '辅印'}\n基础触发: ${Math.round(baseRate * 100)}%${t.type === 'sub' ? `\n强化 Lv.${lvl}/45 次数 ${cnt}/50\n强化后触发: ${ratePercent}%${starBonus > 0 ? ` (含星5 +10%)` : ''}${atMaxLevel ? '\n已满级' : ''}${outOfAttempts ? '\n次数用尽' : ''}` : ''}\n双击镶嵌\n${t.skill.description}`
                        return (
                          <div key={t.id}
                            title={titleText}
                            onDoubleClick={() => equipTreasure(selectedInstance.instanceId!, activeSlot.slotType, activeSlot.slotIndex, t.id)}
                            style={{
                              position: 'relative',
                              aspectRatio: '1',
                              background: icon
                                ? `url("${icon}") 0px 0px / contain no-repeat`
                                : 'var(--bg-medium)',
                              border: `1px solid ${STAR_BORDER[t.starLevel] ?? 'var(--border-wood)'}`,
                              borderRadius: '4px',
                              cursor: 'pointer', userSelect: 'none',
                            }}
                          >
                            {!icon && (
                              <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: t.type === 'main' ? 'var(--text-gold)' : 'var(--color-blue)',
                                fontSize: '10px', fontWeight: 'bold',
                              }}>{t.name?.[0] ?? '?'}</div>
                            )}
                            {/* 等级 (右下) */}
                            {t.type === 'sub' && lvl > 0 && (
                              <span style={{
                                position: 'absolute', bottom: '1px', right: '2px',
                                fontSize: '9px', color: 'var(--text-gold)',
                                textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                                fontWeight: 'bold', pointerEvents: 'none',
                              }}>{lvl}</span>
                            )}
                            {/* 成功率指示 (左下小点) */}
                            {t.type === 'sub' && (
                              <span style={{
                                position: 'absolute', bottom: '2px', left: '2px',
                                width: '5px', height: '5px', borderRadius: '50%',
                                background: rateColor,
                                pointerEvents: 'none',
                              }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {totalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                        <button
                          disabled={safePage === 0}
                          onClick={() => setEquipPage(p => Math.max(0, p - 1))}
                          style={{ fontSize: '12px', padding: '4px 12px' }}
                        >上一页</button>
                        <span style={{ color: 'var(--text-gold)', fontSize: '12px' }}>
                          {safePage + 1} / {totalPages}
                        </span>
                        <button
                          disabled={safePage >= totalPages - 1}
                          onClick={() => setEquipPage(p => Math.min(totalPages - 1, p + 1))}
                          style={{ fontSize: '12px', padding: '4px 12px' }}
                        >下一页</button>
                      </div>
                    )}
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