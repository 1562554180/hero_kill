import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Hero, HeroInstance, HeroStone, Material, Treasure } from '@hero-legend/shared-types'
import { getSkillIcon } from '../../skillIcons'

const API = '/api'

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
const HERO_PORTRAITS: Record<string, string> = {}
for (const [path, url] of Object.entries(portraitModules)) {
  const filename = path.replace('../../images/', '').replace('.jpg', '')
  const heroId = NAME_TO_ID[filename]
  if (heroId) HERO_PORTRAITS[heroId] = url
}

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

// 分解宝具碎片奖励: 5★=2500 / 4★=1000 / 3★=400 / 2★=100 / 1★=20
const DECOMPOSE_FRAGMENTS: Record<number, number> = {
  1: 20, 2: 100, 3: 400, 4: 1000, 5: 2500,
}

const SLOT_LABEL: Record<string, string> = { main: '主印槽', sub: '辅印槽' }

const MAX_LEVEL = 45
const MAX_ENHANCE_COUNT = 50

/** 服务端公式: 100 - level * 85 / 44, 向下取整 */
function nextEnhanceRate(level: number): number {
  return Math.max(0, Math.round(100 - level * 85 / 44))
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
  const [heroInstances, setHeroInstances] = useState<HeroInstance[]>([])
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
    setHeroInstances(save?.heroes ?? [])
    setStones(save?.heroStones ?? [])
    setMaterials(save?.materials ?? [])
    setTreasures(save?.treasures ?? [])
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const heroMap = useMemo(() => new Map(allHeroes.map(h => [h.id, h])), [allHeroes])
  const stoneGroups = useMemo(() => groupStones(stones), [stones])

  // 宝具 → 装备它的英雄 (一个宝具同时只能被一个英雄装备, 因 id 唯一)
  const equippedMap = useMemo(() => {
    const m = new Map<string, { instanceId: string; heroId: string; slot: 'main' | 'sub'; index: number }>()
    for (const h of heroInstances) {
      if (!h.instanceId) continue
      const ts = h.treasures ?? { main: [], sub: [] }
      for (let i = 0; i < (ts.main?.length ?? 0); i++) {
        const t = ts.main[i]
        if (t && t.id) m.set(t.id, { instanceId: h.instanceId, heroId: h.heroId, slot: 'main', index: i })
      }
      for (let i = 0; i < (ts.sub?.length ?? 0); i++) {
        const t = ts.sub[i]
        if (t && t.id) m.set(t.id, { instanceId: h.instanceId, heroId: h.heroId, slot: 'sub', index: i })
      }
    }
    return m
  }, [heroInstances])

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

  const decompose = async (treasure: Treasure) => {
    if (busy) return
    const equipped = equippedMap.get(treasure.id)
    const heroName = equipped ? (heroMap.get(equipped.heroId)?.name ?? equipped.heroId) : ''
    const confirmMsg = equipped
      ? `确定要分解 ${'★'.repeat(treasure.starLevel)} ${treasure.name} 吗?\n该宝具当前装备在 [${heroName} ${SLOT_LABEL[equipped.slot]}${equipped.index + 1}], 会被卸下.`
      : `确定要分解 ${'★'.repeat(treasure.starLevel)} ${treasure.name} 吗?`
    if (!confirm(confirmMsg)) return
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`${API}/treasure/decompose/${userId}/${encodeURIComponent(treasure.id)}`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setMessage('分解失败: ' + data.error)
      } else {
        const equippedTip = data.removedFrom
          ? ` (已从 ${heroMap.get(data.removedFrom.heroId)?.name ?? data.removedFrom.heroId} 卸下)`
          : ''
        setMessage(`分解成功: ${treasure.name} → +${data.fragments} 宝具碎片${equippedTip}`)
        await refresh()
      }
    } catch (e: any) {
      setMessage('分解失败: ' + (e?.message ?? '网络错误'))
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
                  const portrait = HERO_PORTRAITS[g.heroId]
                  return (
                    <div key={`${g.starLevel}-${g.heroId}`} style={{
                      background: isHigh ? 'linear-gradient(135deg, #ff6b6b22, #c6282822)' : 'var(--bg-dark)',
                      border: `1px solid ${isHigh ? '#ff6b6b' : 'var(--border-wood)'}`,
                      borderRadius: '6px', padding: '10px',
                    }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '4px' }}>
                        {portrait && (
                          <img
                            src={portrait}
                            alt={hero?.name ?? g.heroId}
                            style={{
                              width: '48px', height: '48px', borderRadius: '4px',
                              objectFit: 'cover', flexShrink: 0,
                              border: '1px solid var(--border-wood)',
                              background: 'var(--bg-dark)',
                            }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                            <span style={{ color: 'var(--text-light)', fontWeight: 'bold' }}>
                              {hero?.name ?? g.heroId}{g.stoneIds.length > 1 && <span style={{ color: 'var(--text-gold)', marginLeft: '6px' }}>× {g.stoneIds.length}</span>}
                            </span>
                            <span style={{ color: 'var(--text-gold)', fontSize: '12px' }}>
                              {'★'.repeat(g.starLevel)}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                            {hero?.faction ?? '?'} | 英雄石
                          </div>
                        </div>
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
                const equipped = equippedMap.get(t.id)
                const equippedHeroName = equipped
                  ? heroMap.get(equipped.heroId)?.name ?? equipped.heroId
                  : null
                const fragments = DECOMPOSE_FRAGMENTS[t.starLevel] ?? 0
                // 辅印才显示强化信息
                const lvl = t.level ?? 0
                const cnt = t.enhanceCount ?? 0
                const atMaxLevel = lvl >= MAX_LEVEL
                const isSub = t.type === 'sub'
                const rate = isSub && !atMaxLevel ? nextEnhanceRate(lvl) : null
                const rateColor = rate == null ? '#ff6b6b'
                  : rate >= 80 ? '#7ec850'
                  : rate >= 50 ? 'var(--text-gold)'
                  : rate >= 20 ? '#ff9e3a'
                  : '#ff6b6b'
                return (
                  <div key={t.id} style={{
                    background: 'var(--bg-dark)', padding: '10px', borderRadius: '4px',
                    border: `1px solid ${equipped ? '#ff6b6b' : 'var(--border-wood)'}`,
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                  }}>
                    {(() => {
                      const icon = getSkillIcon(t.skill?.name ?? t.name)
                      return icon ? (
                        <img src={icon} alt={t.name} style={{
                          width: '48px', height: '48px', flexShrink: 0, borderRadius: '4px',
                          objectFit: 'contain', background: '#1a1a1a',
                          border: '1px solid var(--border-wood)',
                        }} />
                      ) : null
                    })()}
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                    {isSub && (
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', marginTop: '2px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          强化: Lv.<span style={{ color: 'var(--text-gold)', fontWeight: 'bold' }}>{lvl}</span>/{MAX_LEVEL}
                        </span>
                        <span style={{ color: cnt >= MAX_ENHANCE_COUNT ? '#ff6b6b' : 'var(--text-muted)' }}>
                          次数: {cnt}/{MAX_ENHANCE_COUNT}
                        </span>
                        <span style={{ color: rateColor, fontWeight: 'bold' }}>
                          下次成功率: {atMaxLevel ? '已满级' : `${rate}%`}
                        </span>
                      </div>
                    )}
                    <div style={{
                      color: equipped ? '#ff6b6b' : 'var(--text-muted)',
                      fontSize: '11px', marginTop: '2px',
                      fontWeight: equipped ? 'bold' : 'normal',
                    }}>
                      {equipped
                        ? `装备中: ${equippedHeroName} (${SLOT_LABEL[equipped.slot]}${equipped.index + 1})`
                        : '未装备'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                      {t.skill?.description ?? ''}
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginTop: '8px', paddingTop: '6px',
                      borderTop: '1px dashed var(--border-wood)',
                    }}>
                      <span style={{ color: 'var(--text-gold)', fontSize: '12px' }}>
                        分解 → +{fragments} 碎片
                      </span>
                      <button
                        disabled={busy}
                        onClick={() => decompose(t)}
                        style={{ fontSize: '12px', padding: '4px 12px' }}
                      >
                        分解
                      </button>
                    </div>
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