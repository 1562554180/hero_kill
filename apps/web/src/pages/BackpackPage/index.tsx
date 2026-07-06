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

// 头像小图 (images/avatars/*.jpg) — 用于英雄石内嵌圆形头像窗
const avatarModules = import.meta.glob('../../images/avatars/*.jpg', { eager: true, import: 'default' }) as Record<string, string>
const HERO_AVATARS: Record<string, string> = {}
for (const [path, url] of Object.entries(avatarModules)) {
  const filename = path.replace('../../images/avatars/', '').replace('.jpg', '')
  const heroId = NAME_TO_ID[filename]
  if (heroId) HERO_AVATARS[heroId] = url
}

// 英雄石视觉: 多面切割晶体宝石 + 居中圆形头像窗, 配色按星级
// 1★灰 / 2★绿 / 3★蓝 / 4★紫 / 5★金
function HeroStoneIcon({ heroId, starLevel, size = 56 }: { heroId: string; starLevel: number; size?: number }) {
  const avatar = HERO_AVATARS[heroId]
  const palette = STONE_PALETTE[Math.min(starLevel, 5)] ?? STONE_PALETTE[1]
  const gid = `stone-${heroId}-${starLevel}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${gid}-face`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.faceLight} />
          <stop offset="50%" stopColor={palette.face} />
          <stop offset="100%" stopColor={palette.faceDark} />
        </linearGradient>
        <linearGradient id={`${gid}-side`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={palette.faceDark} />
          <stop offset="100%" stopColor={palette.shadow} />
        </linearGradient>
        <radialGradient id={`${gid}-top`} cx="40%" cy="30%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <clipPath id={`${gid}-clip`}>
          <circle cx="50" cy="46" r="24" />
        </clipPath>
      </defs>
      {/* 主体: 宽胖八边形, 直线切角 (棱角分明) */}
      <polygon
        points="50,6 78,12 92,38 92,62 78,86 22,86 8,62 8,38 22,12"
        fill={`url(#${gid}-face)`}
        stroke={palette.edge}
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      {/* 切面分割线 (从中心放射) */}
      <g stroke={palette.edge} strokeWidth="0.6" opacity="0.5" fill="none">
        <line x1="50" y1="6" x2="50" y2="46" />
        <line x1="22" y1="12" x2="50" y2="46" />
        <line x1="78" y1="12" x2="50" y2="46" />
        <line x1="8" y1="38" x2="50" y2="46" />
        <line x1="92" y1="38" x2="50" y2="46" />
        <line x1="8" y1="62" x2="50" y2="46" />
        <line x1="92" y1="62" x2="50" y2="46" />
      </g>
      {/* 顶部高光 (上半斜面) */}
      <polygon
        points="50,6 78,12 92,38 50,46 8,38 22,12"
        fill={`url(#${gid}-top)`}
        opacity="0.75"
      />
      {/* 圆形头像窗 (内嵌, 加大) */}
      {avatar ? (
        <>
          <image
            href={avatar}
            x="26" y="22" width="48" height="48"
            clipPath={`url(#${gid}-clip)`}
            preserveAspectRatio="xMidYMid slice"
          />
          <circle cx="50" cy="46" r="24" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
          <circle cx="50" cy="46" r="24" fill="none" stroke={palette.edge} strokeWidth="0.8" opacity="0.7" />
        </>
      ) : (
        <circle cx="50" cy="46" r="24" fill="rgba(0,0,0,0.35)" stroke={palette.edge} strokeWidth="1" />
      )}
    </svg>
  )
}

const STONE_PALETTE: Record<number, { face: string; faceLight: string; faceDark: string; shadow: string; edge: string }> = {
  1: { face: '#9e9e9e', faceLight: '#e0e0e0', faceDark: '#616161', shadow: '#2b2b2b', edge: '#3a3a3a' },
  2: { face: '#66bb6a', faceLight: '#a5d6a7', faceDark: '#2e7d32', shadow: '#143a14', edge: '#1b5e20' },
  3: { face: '#42a5f5', faceLight: '#90caf9', faceDark: '#1565c0', shadow: '#0a2a52', edge: '#0d47a1' },
  4: { face: '#ab47bc', faceLight: '#ce93d8', faceDark: '#6a1b9a', shadow: '#2a0d3f', edge: '#4a148c' },
  5: { face: '#ffd54f', faceLight: '#fff59d', faceDark: '#f9a825', shadow: '#5a3d00', edge: '#bf6f00' },
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

const SLOT_LABEL: Record<string, string> = { main: '主印槽', sub: '辅印槽' }

const TREASURE_PAGE_SIZE = 48

// 星级 → 边框色
const STAR_BORDER: Record<number, string> = {
  5: '#ffd700',
  4: '#a78bfa',
  3: '#60a5fa',
  2: '#86efac',
  1: '#9ca3af',
}

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
  const [treasurePage, setTreasurePage] = useState(0)
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

  // 分解功能已移到宝具工坊

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
          <button key={t.key} onClick={() => { setTab(t.key); setTreasurePage(0) }} style={{
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '8px' }}>
                {stoneGroups.map(g => {
                  return (
                    <div
                      key={`${g.starLevel}-${g.heroId}`}
                      onDoubleClick={() => !busy && useStone(g.stoneId)}
                      title={busy ? undefined : '双击使用 (生成英雄)'}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '6px',
                        cursor: busy ? 'not-allowed' : 'pointer',
                        opacity: busy ? 0.5 : 1,
                        borderRadius: '6px',
                        transition: 'background 0.15s',
                        userSelect: 'none',
                      }}
                      onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <HeroStoneIcon heroId={g.heroId} starLevel={g.starLevel} size={96} />
                      {g.stoneIds.length > 1 && (
                        <span style={{
                          position: 'absolute',
                          right: '4px',
                          bottom: '4px',
                          background: 'rgba(0,0,0,0.75)',
                          color: 'var(--text-gold)',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,213,79,0.4)',
                          pointerEvents: 'none',
                          minWidth: '18px',
                          textAlign: 'center',
                          lineHeight: 1.2,
                        }}>
                          ×{g.stoneIds.length}
                        </span>
                      )}
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
            <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', columnGap: '4px', rowGap: '16px' }}>
              {treasures.slice(treasurePage * TREASURE_PAGE_SIZE, (treasurePage + 1) * TREASURE_PAGE_SIZE).map(t => {
                const n = t.count ?? 1
                const equipped = equippedMap.get(t.id)
                const equippedHeroName = equipped
                  ? heroMap.get(equipped.heroId)?.name ?? equipped.heroId
                  : null
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
                const icon = getSkillIcon(t.skill?.name ?? t.name)
                const isEquipped = !!equipped
                const borderColor = isEquipped ? '#ff6b6b' : (STAR_BORDER[t.starLevel] ?? 'var(--border-wood)')
                return (
                  <div key={t.id} className="treasure-cell" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{
                      width: '24px', height: '24px',
                      backgroundColor: '#1a1a1a',
                      backgroundImage: icon ? `url(${icon})` : 'none',
                      backgroundPosition: '0px -1px',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      borderRadius: '3px',
                      border: `1px solid ${borderColor}`,
                      boxShadow: isEquipped ? '0 0 4px rgba(255,107,107,0.6)' : 'none',
                      position: 'relative',
                      cursor: 'help',
                    }}>
                      {!icon && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: t.type === 'main' ? 'var(--text-gold)' : 'var(--color-blue)',
                          fontSize: '10px', fontWeight: 'bold',
                        }}>{t.name?.[0] ?? '?'}</div>
                      )}
                      {/* 数量角标 */}
                      {n > 1 && (
                        <span style={{
                          position: 'absolute', right: '0', bottom: '0',
                          background: 'rgba(0,0,0,0.85)', color: 'var(--text-gold)',
                          fontSize: '11px', fontWeight: 'bold', padding: '0 4px',
                          lineHeight: '14px',
                          borderRadius: '3px 0 0 0',
                        }}>×{n}</span>
                      )}
                    </div>
                    {/* hover 弹层 */}
                    <div className="treasure-tooltip" style={{
                      position: 'absolute', zIndex: 50,
                      top: '100%', left: '50%', transform: 'translateX(-50%) translateY(4px)',
                      minWidth: '240px', maxWidth: '320px',
                      background: 'var(--bg-medium)', border: '1px solid var(--border-gold)',
                      borderRadius: '6px', padding: '10px',
                      pointerEvents: 'none', opacity: 0,
                      transition: 'opacity 0.15s',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: t.type === 'main' ? 'var(--text-gold)' : 'var(--color-blue)', fontWeight: 'bold', fontSize: '13px' }}>
                          {t.name}{n > 1 && <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>×{n}</span>}
                        </span>
                        <span style={{ color: 'var(--text-gold)', fontSize: '11px' }}>
                          {'★'.repeat(t.starLevel)}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
                        {t.type === 'main' ? '主印' : '辅印'} | 触发率: {Math.round(t.triggerRate * 100)}%
                      </div>
                      {isSub && (
                        <div style={{ display: 'flex', gap: '10px', fontSize: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--text-muted)' }}>
                            强化 Lv.<span style={{ color: 'var(--text-gold)', fontWeight: 'bold' }}>{lvl}</span>/{MAX_LEVEL}
                          </span>
                          <span style={{ color: cnt >= MAX_ENHANCE_COUNT ? '#ff6b6b' : 'var(--text-muted)' }}>
                            次数 {cnt}/{MAX_ENHANCE_COUNT}
                          </span>
                          <span style={{ color: rateColor, fontWeight: 'bold' }}>
                            下次: {atMaxLevel ? '已满级' : `${rate}%`}
                          </span>
                        </div>
                      )}
                      <div style={{
                        color: isEquipped ? '#ff6b6b' : 'var(--text-muted)',
                        fontSize: '10px', marginBottom: '4px',
                        fontWeight: isEquipped ? 'bold' : 'normal',
                      }}>
                        {isEquipped
                          ? `装备中: ${equippedHeroName} (${SLOT_LABEL[equipped!.slot]}${equipped!.index + 1})`
                          : '未装备'}
                      </div>
                      <div style={{ color: 'var(--text-light)', fontSize: '11px', lineHeight: 1.4 }}>
                        {t.skill?.description ?? ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {(() => {
              const totalPages = Math.ceil(treasures.length / TREASURE_PAGE_SIZE)
              if (totalPages <= 1) return null
              return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                  <button
                    disabled={treasurePage === 0}
                    onClick={() => setTreasurePage(p => Math.max(0, p - 1))}
                    style={{ fontSize: '12px', padding: '4px 12px' }}
                  >上一页</button>
                  <span style={{ color: 'var(--text-gold)', fontSize: '12px' }}>
                    {treasurePage + 1} / {totalPages}
                  </span>
                  <button
                    disabled={treasurePage >= totalPages - 1}
                    onClick={() => setTreasurePage(p => Math.min(totalPages - 1, p + 1))}
                    style={{ fontSize: '12px', padding: '4px 12px' }}
                  >下一页</button>
                </div>
              )
            })()}
            </>
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