import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Hero, HeroInstance, HeroStone, Material, Treasure } from '@hero-legend/shared-types'
import { getSkillIcon } from '../../skillIcons'
import { HeroStoneIcon } from '../../components/HeroStoneIcon'
import { HERO_NAME_TO_ID as NAME_TO_ID } from '../../heroPortraitNames'

const API = '/api'

const rootModules = import.meta.glob('../../images/*.jpg', { eager: true, import: 'default' }) as Record<string, string>
const avatarModules = import.meta.glob('../../images/avatars/*.jpg', { eager: true, import: 'default' }) as Record<string, string>
const HERO_PORTRAITS: Record<string, string> = {}
for (const [path, url] of Object.entries(rootModules)) {
  const filename = path.replace('../../images/', '').replace('.jpg', '')
  const heroId = NAME_TO_ID[filename]
  if (heroId) HERO_PORTRAITS[heroId] = url
}
for (const [path, url] of Object.entries(avatarModules)) {
  const filename = path.replace('../../images/avatars/', '').replace('.jpg', '')
  const heroId = NAME_TO_ID[filename]
  if (heroId && !HERO_PORTRAITS[heroId]) HERO_PORTRAITS[heroId] = url
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
  enhancementTalisman: '强化符',
  luckyStone: '幸运石',
  transferTalisman: '转移符',
  treasureTicket: '珍宝阁门票',
}

const SLOT_LABEL: Record<string, string> = { main: '主印槽', sub: '辅印槽' }

const TREASURE_PAGE_SIZE = 48

/** 星级 → 罗马数字 (辅印 tooltip 显示) */
const ROMAN_STAR: Record<number, string> = { 1: 'Ⅰ', 2: 'Ⅱ', 3: 'Ⅲ', 4: 'Ⅳ', 5: 'Ⅴ' }

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

const FRAGMENT_BY_STAR: Record<number, number> = { 1: 20, 2: 100, 3: 400, 4: 1000, 5: 2500 }
/** 一键分解默认选中的星级 */
const ONE_CLICK_STARS = new Set([1, 2])

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
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDecompose, setConfirmDecompose] = useState<null | { treasureIds: string[]; fragments: number }>(null)

  const refresh = useCallback(async () => {
    const [save, heroData] = await Promise.all([
      fetch(`${API}/save`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API}/hero`, { credentials: 'include' }).then(r => r.json()),
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

  /** 宝具列表默认排序: 强化等级 desc → 星级 desc */
  const sortedTreasures = useMemo(() => {
    return [...treasures].sort((a, b) => {
      const lvlDiff = (b.level ?? 0) - (a.level ?? 0)
      if (lvlDiff !== 0) return lvlDiff
      return (b.starLevel ?? 0) - (a.starLevel ?? 0)
    })
  }, [treasures])

  /**
   * 宝具合并展示分组:
   * - 主印: 同 (type,name,star) 总是合并 → icon × n
   * - 辅印: 仅当全部 level=0 时才合并, 否则单独展示 (避免混淆未强化与强化过的)
   */
  type TreasureGroup = {
    key: string
    type: 'main' | 'sub'
    name: string
    starLevel: number
    items: Treasure[]
    totalCount: number
    merged: boolean
  }
  const groupedTreasures = useMemo<TreasureGroup[]>(() => {
    const map = new Map<string, TreasureGroup>()
    for (const t of sortedTreasures) {
      const key = `${t.type}|${t.name}|${t.starLevel ?? 0}`
      const existing = map.get(key)
      if (existing) {
        existing.items.push(t)
        existing.totalCount += (t.count ?? 1)
      } else {
        map.set(key, {
          key,
          type: t.type as 'main' | 'sub',
          name: t.name,
          starLevel: t.starLevel ?? 0,
          items: [t],
          totalCount: t.count ?? 1,
          merged: false,
        })
      }
    }
    for (const g of map.values()) {
      g.merged = g.type === 'main' || g.items.every(it => (it.level ?? 0) === 0)
    }
    return Array.from(map.values())
  }, [sortedTreasures])

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
      const res = await fetch(`${API}/hero/use-stone/${stoneId}`, { method: 'POST', credentials: 'include' })
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

  /** 单个/批量分解, 内部串行调 /api/treasure/decompose */
  const decomposeTreasures = async (ids: string[]) => {
    if (busy || ids.length === 0) return
    setBusy(true)
    setMessage('')
    let totalFragments = 0
    let failed = 0
    try {
      for (const id of ids) {
        const res = await fetch(`${API}/treasure/decompose/${encodeURIComponent(id)}`, { method: 'POST', credentials: 'include' })
        const data = await res.json()
        if (!res.ok || data.error) {
          failed++
          continue
        }
        totalFragments += data.fragments ?? 0
      }
      setMessage(`分解完成: ${ids.length - failed} 件, 获得 ${totalFragments} 万能碎片${failed > 0 ? ` (失败 ${failed})` : ''}`)
      await refresh()
    } finally {
      setBusy(false)
      setConfirmDecompose(null)
    }
  }

  /** 一键分解: 选中所有 1★/2★ 且未装备的宝具, 弹确认 */
  const openOneClickDecompose = () => {
    if (busy) return
    const candidates = sortedTreasures.filter(t =>
      ONE_CLICK_STARS.has(t.starLevel)
      && !equippedMap.has(t.id)
      && (t.level ?? 0) === 0
    )
    if (candidates.length === 0) {
      setMessage('没有可分解的 1★/2★ 宝具')
      return
    }
    const fragments = candidates.reduce((s, t) => s + (FRAGMENT_BY_STAR[t.starLevel] ?? 0), 0)
    setConfirmDecompose({ treasureIds: candidates.map(t => t.id), fragments })
  }

  /** 双击单个: 弹确认 (已装备的也允许, 服务端会自动卸下) */
  const openSingleDecompose = (treasureId: string) => {
    if (busy) return
    const t = treasures.find(x => x.id === treasureId)
    if (!t) return
    setConfirmDecompose({
      treasureIds: [treasureId],
      fragments: FRAGMENT_BY_STAR[t.starLevel] ?? 0,
    })
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                onClick={openOneClickDecompose}
                disabled={busy}
                style={{ fontSize: '12px', padding: '4px 12px', opacity: busy ? 0.5 : 1 }}
              >
                一键分解 1★/2★
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', columnGap: '4px', rowGap: '16px' }}>
              {groupedTreasures.slice(treasurePage * TREASURE_PAGE_SIZE, (treasurePage + 1) * TREASURE_PAGE_SIZE).map(g => {
                const rep = g.items[0]  // 代表实例 (合并时所有项同 (name,star,type), 单项时即本身)
                const n = g.totalCount
                const equipped = g.items.map(it => equippedMap.get(it.id)).find(Boolean) ?? null
                const equippedHeroName = equipped
                  ? heroMap.get(equipped.heroId)?.name ?? equipped.heroId
                  : null
                const lvl = rep.level ?? 0
                const cnt = rep.enhanceCount ?? 0
                const atMaxLevel = lvl >= MAX_LEVEL
                const isSub = g.type === 'sub'
                const rate = isSub && !atMaxLevel ? nextEnhanceRate(lvl) : null
                const rateColor = rate == null ? '#ff6b6b'
                  : rate >= 80 ? '#7ec850'
                  : rate >= 50 ? 'var(--text-gold)'
                  : rate >= 20 ? '#ff9e3a'
                  : '#ff6b6b'
                const icon = getSkillIcon(rep.skill?.name ?? g.name)
                const isEquipped = !!equipped
                const borderColor = isEquipped ? '#ff6b6b' : (STAR_BORDER[g.starLevel] ?? 'var(--border-wood)')
                const displayName = isSub
                  ? `${g.name} ${ROMAN_STAR[g.starLevel] ?? g.starLevel}`
                  : g.name
                return (
                  <div
                    key={g.key}
                    className="treasure-cell"
                    onDoubleClick={() => openSingleDecompose(rep.id)}
                    title="双击分解"
                    style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: busy ? 'not-allowed' : 'pointer' }}
                  >
                    <div style={{
                      width: '52px', height: '52px',
                      backgroundColor: '#1a1a1a',
                      backgroundImage: icon ? `url(${icon})` : 'none',
                      backgroundPosition: '0px -1px',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      borderRadius: '4px',
                      border: `1px solid ${borderColor}`,
                      boxShadow: isEquipped ? '0 0 4px rgba(255,107,107,0.6)' : 'none',
                      position: 'relative',
                      cursor: 'help',
                    }}>
                      {!icon && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: rep.type === 'main' ? 'var(--text-gold)' : 'var(--color-blue)',
                          fontSize: '20px', fontWeight: 'bold',
                        }}>{g.name?.[0] ?? '?'}</div>
                      )}
                      {/* 数量角标 */}
                      {n > 1 && (
                        <span style={{
                          position: 'absolute', right: '0', bottom: '0',
                          background: 'rgba(0,0,0,0.85)', color: 'var(--text-gold)',
                          fontSize: '14px', fontWeight: 'bold', padding: '0 6px',
                          lineHeight: '18px',
                          borderRadius: '4px 0 0 0',
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
                        <span style={{ color: rep.type === 'main' ? 'var(--text-gold)' : 'var(--color-blue)', fontWeight: 'bold', fontSize: '13px' }}>
                          {displayName}{n > 1 && <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>×{n}</span>}
                        </span>
                        {!isSub && (
                          <span style={{ color: 'var(--text-gold)', fontSize: '11px' }}>
                            {'★'.repeat(g.starLevel)}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
                        {rep.type === 'main' ? '主印' : '辅印'} | 触发率: {Math.round(rep.triggerRate * 100)}%
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
                        {rep.skill?.description ?? ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {(() => {
              const totalPages = Math.ceil(groupedTreasures.length / TREASURE_PAGE_SIZE)
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

      {confirmDecompose && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => !busy && setConfirmDecompose(null)}
        >
          <div
            style={{
              background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
              borderRadius: '8px', padding: '20px', minWidth: '320px', maxWidth: '440px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h4 style={{ color: 'var(--text-gold)', margin: '0 0 12px' }}>分解确认</h4>
            <div style={{ fontSize: '13px', lineHeight: 1.7, marginBottom: '16px' }}>
              <div>
                将分解 <span style={{ color: 'var(--text-gold)' }}>{confirmDecompose.treasureIds.length}</span> 件宝具
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                按星级获得万能碎片: 1★=20 / 2★=100 / 3★=400 / 4★=1000 / 5★=2500
              </div>
              <div style={{ marginTop: '6px' }}>
                预计获得 <span style={{ color: 'var(--text-gold)' }}>{confirmDecompose.fragments}</span> 万能碎片
              </div>
              {confirmDecompose.treasureIds.length === 1 && (
                <div style={{ color: '#ff9e3a', marginTop: '6px', fontSize: '12px' }}>
                  注: 双击单个宝具时, 已装备的也会自动卸下分解
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setConfirmDecompose(null)} disabled={busy}>取消</button>
              <button
                className="primary"
                onClick={() => decomposeTreasures(confirmDecompose.treasureIds)}
                disabled={busy}
              >
                {busy ? '处理中...' : '确认分解'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}