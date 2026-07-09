import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Treasure, Material, Hero, HeroInstance } from '@hero-legend/shared-types'
import { Cauldron } from './Cauldron'
import { SubTreasureList } from './SubTreasureList'
import { TransferModal } from './TransferModal'
import { LuckyStoneSlots } from './LuckyStoneSlots'
import { useWorkshopKeyframes } from './animations'

const API = '/api'

/** 跨背包 + 所有英雄装备槽查找指定 treasureId 的宝具副本 */
function findTreasureAcrossSlots(save: any, treasureId: string): Treasure | undefined {
  const inBag = save?.treasures?.find((x: Treasure) => x.id === treasureId)
  if (inBag) return inBag
  for (const h of save?.heroes ?? []) {
    const ts = h.treasures ?? { main: [], sub: [] }
    const inMain = ts.main?.find((x: Treasure | null) => x?.id === treasureId)
    if (inMain) return inMain
    const inSub = ts.sub?.find((x: Treasure | null) => x?.id === treasureId)
    if (inSub) return inSub
  }
  return undefined
}

interface SaveData {
  treasures: Treasure[]
  materials: Material[]
  heroes?: HeroInstance[]
}

type Phase = 'idle' | 'upgrading' | 'revealed'

export function TreasureWorkshopPage() {
  useWorkshopKeyframes()
  const navigate = useNavigate()
  const [save, setSave] = useState<SaveData | null>(null)
  const [allHeroes, setAllHeroes] = useState<Hero[]>([])
  const [selectedTreasureId, setSelectedTreasureId] = useState<string | null>(null)
  const [luckyStones, setLuckyStones] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<{ success: boolean; lucky: boolean; newLevel: number; oldLevel: number; message?: string } | null>(null)
  const [toast, setToast] = useState('')
  const [transferOpen, setTransferOpen] = useState(false)

  const refresh = useCallback(async () => {
    const [data, heroData] = await Promise.all([
      fetch(`${API}/save`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API}/hero`, { credentials: 'include' }).then(r => r.json()),
    ])
    setSave(data)
    setAllHeroes(heroData.heroes ?? [])
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // 工坊列表 = 背包里的辅印 + 已镶嵌在英雄身上的辅印 (按 id 去重)
  const subs = useMemo(() => {
    const bagSubs = (save?.treasures ?? []).filter(t => t.type === 'sub')
    const seen = new Set(bagSubs.map(t => t.id))
    const equippedSubs: Treasure[] = []
    for (const h of save?.heroes ?? []) {
      const ts = h.treasures ?? { main: [], sub: [] }
      for (const t of ts.sub ?? []) {
        if (t && !seen.has(t.id)) {
          seen.add(t.id)
          equippedSubs.push(t)
        }
      }
    }
    return [...bagSubs, ...equippedSubs]
  }, [save])
  const selectedTreasure = subs.find(t => t.id === selectedTreasureId) ?? null

  const heroNameMap = useMemo(() => new Map(allHeroes.map(h => [h.id, h.name])), [allHeroes])
  const equippedMap = useMemo(() => {
    const m = new Map<string, { heroId: string; slot: 'main' | 'sub'; index: number }>()
    for (const h of save?.heroes ?? []) {
      const ts = h.treasures ?? { main: [], sub: [] }
      ts.main?.forEach((t, i) => { if (t?.id) m.set(t.id, { heroId: h.heroId, slot: 'main', index: i }) })
      ts.sub?.forEach((t, i) => { if (t?.id) m.set(t.id, { heroId: h.heroId, slot: 'sub', index: i }) })
    }
    return m
  }, [save?.heroes])
  const talismanCount = save?.materials.find(m => m.type === 'enhancementTalisman')?.amount ?? 0
  const luckyStoneCount = save?.materials.find(m => m.type === 'luckyStone')?.amount ?? 0
  const goldCount = save?.materials.find(m => m.type === 'gold')?.amount ?? 0
  const transferTalismanCount = save?.materials.find(m => m.type === 'transferTalisman')?.amount ?? 0

  const baseRate = selectedTreasure ? Math.round(100 - (selectedTreasure.level ?? 0) * 85 / 44) : 0
  const adjustedRate = Math.min(100, baseRate + luckyStones * 5)
  const goldCost = selectedTreasure ? 100 * ((selectedTreasure.level ?? 0) + 1) : 0
  const canUpgrade = !!selectedTreasure
    && phase === 'idle'
    && talismanCount >= 1
    && luckyStoneCount >= luckyStones
    && goldCount >= goldCost
    && (selectedTreasure.enhanceCount ?? 0) < 50
    && (selectedTreasure.level ?? 0) < 45

  /** 一键拉满: 选中宝具存在 + 至少还有 1 次剩余 + 未满级 */
  const canUpgradeMax = (() => {
    if (!canUpgrade || !selectedTreasure) return false
    const remaining = 50 - (selectedTreasure.enhanceCount ?? 0)
    return remaining > 0 && (selectedTreasure.level ?? 0) < 45
  })()
  const upgradeMaxRemaining = selectedTreasure
    ? Math.max(0, 50 - (selectedTreasure.enhanceCount ?? 0))
    : 0

  const handleUpgrade = async () => {
    if (!canUpgrade || !selectedTreasure) return
    setPhase('upgrading')
    try {
      const res = await fetch(`${API}/treasure/upgrade/${encodeURIComponent(selectedTreasure.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ luckyStones }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setToast('强化失败: ' + (data.error ?? data.message ?? `${res.status}`))
        setTimeout(() => setToast(''), 3000)
        setPhase('idle')
        return
      }
      setResult({
        success: data.success,
        lucky: !!data.lucky,
        oldLevel: (selectedTreasure.level ?? 0),
        newLevel: data.newLevel,
      })
      setPhase('revealed')
      setTimeout(() => {
        setResult(null)
        setPhase('idle')
        // 成功/失败都保留选中 — 双击列表行才手动移除
        refresh()
      }, 1800)
    } catch (e: any) {
      setToast('网络错误: ' + (e?.message ?? ''))
      setTimeout(() => setToast(''), 3000)
      setPhase('idle')
    }
  }

  // 连续强化最多 10 次, 资源不足 / 满级 / 达上限时提前停止
  const handleUpgrade10 = async () => {
    if (!canUpgrade || !selectedTreasure) return
    setPhase('upgrading')
    let successCount = 0
    let luckyCount = 0
    let failCount = 0
    let oldLevel = selectedTreasure.level ?? 0
    let newLevel = oldLevel
    let stoppedReason = ''
    try {
      for (let i = 0; i < 10; i++) {
        // 每轮重新拉取最新存档, 判断资源/等级/次数是否允许继续
        const fresh = await fetch(`${API}/save`, { credentials: 'include' }).then(r => r.json())
        const t = findTreasureAcrossSlots(fresh, selectedTreasure.id)
        const talisman = (fresh.materials as Material[])?.find(m => m.type === 'enhancementTalisman')?.amount ?? 0
        const lucky = (fresh.materials as Material[])?.find(m => m.type === 'luckyStone')?.amount ?? 0
        const gold = (fresh.materials as Material[])?.find(m => m.type === 'gold')?.amount ?? 0
        if (!t) { stoppedReason = '辅印不存在'; break }
        const lvl = t.level ?? 0
        const cnt = t.enhanceCount ?? 0
        const cost = 100 * (lvl + 1)
        if (lvl >= 45) { stoppedReason = '已满级'; break }
        if (cnt >= 50) { stoppedReason = '已达强化次数上限'; break }
        if (talisman < 1) { stoppedReason = '强化符不足'; break }
        if (lucky < luckyStones) { stoppedReason = '幸运石不足'; break }
        if (gold < cost) { stoppedReason = '金币不足'; break }
        const res = await fetch(`${API}/treasure/upgrade/${encodeURIComponent(selectedTreasure.id)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ luckyStones }),
        })
        const data = await res.json()
        if (!res.ok || data.error) { stoppedReason = data.error ?? data.message ?? `${res.status}`; break }
        if (data.success) successCount++
        else failCount++
        if (data.lucky) luckyCount++
        newLevel = data.newLevel as number
      }
      setResult({
        success: successCount > 0,
        lucky: luckyCount > 0,
        oldLevel,
        newLevel,
        message: `十连完成: 成功 ${successCount} / 失败 ${failCount}${luckyCount > 0 ? ` / 欧皇 ${luckyCount}` : ''}${stoppedReason ? ` / 提前停止: ${stoppedReason}` : ''}`,
      })
      setPhase('revealed')
      setTimeout(() => {
        setResult(null)
        setPhase('idle')
        refresh()
      }, 2800)
    } catch (e: any) {
      setToast('网络错误: ' + (e?.message ?? ''))
      setTimeout(() => setToast(''), 3000)
      setPhase('idle')
    }
  }

  /**
   * 一键拉满: 用完所有剩余强化次数 (50 - currentEnhanceCount).
   * 资源/等级/次数上限遇任一限制时提前停止.
   */
  const handleUpgradeMax = async () => {
    if (!canUpgrade || !selectedTreasure) return
    setPhase('upgrading')
    let successCount = 0
    let luckyCount = 0
    let failCount = 0
    let oldLevel = selectedTreasure.level ?? 0
    let newLevel = oldLevel
    let stoppedReason = ''

    try {
      // 第一次拉存档确定本次循环上限
      const initial = await fetch(`${API}/save`, { credentials: 'include' }).then(r => r.json())
      const initialT = findTreasureAcrossSlots(initial, selectedTreasure.id)
      if (!initialT) {
        stoppedReason = '辅印不存在'
      }
      const remaining = Math.max(0, 50 - (initialT?.enhanceCount ?? 0))

      for (let i = 0; i < remaining; i++) {
        const fresh = await fetch(`${API}/save`, { credentials: 'include' }).then(r => r.json())
        const t = findTreasureAcrossSlots(fresh, selectedTreasure.id)
        const talisman = (fresh.materials as Material[])?.find(m => m.type === 'enhancementTalisman')?.amount ?? 0
        const lucky = (fresh.materials as Material[])?.find(m => m.type === 'luckyStone')?.amount ?? 0
        const gold = (fresh.materials as Material[])?.find(m => m.type === 'gold')?.amount ?? 0
        if (!t) { stoppedReason = '辅印不存在'; break }
        const lvl = t.level ?? 0
        const cnt = t.enhanceCount ?? 0
        const cost = 100 * (lvl + 1)
        if (lvl >= 45) { stoppedReason = '已满级'; break }
        if (cnt >= 50) { stoppedReason = '已达强化次数上限'; break }
        if (talisman < 1) { stoppedReason = '强化符不足'; break }
        if (lucky < luckyStones) { stoppedReason = '幸运石不足'; break }
        if (gold < cost) { stoppedReason = '金币不足'; break }
        const res = await fetch(`${API}/treasure/upgrade/${encodeURIComponent(selectedTreasure.id)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ luckyStones }),
        })
        const data = await res.json()
        if (!res.ok || data.error) { stoppedReason = data.error ?? data.message ?? `${res.status}`; break }
        if (data.success) successCount++
        else failCount++
        if (data.lucky) luckyCount++
        newLevel = data.newLevel as number
      }

      setResult({
        success: successCount > 0,
        lucky: luckyCount > 0,
        oldLevel,
        newLevel,
        message: `一键拉满完成: 成功 ${successCount} / 失败 ${failCount}${luckyCount > 0 ? ` / 欧皇 ${luckyCount}` : ''}${stoppedReason ? ` / 提前停止: ${stoppedReason}` : ''}`,
      })
      setPhase('revealed')
      setTimeout(() => {
        setResult(null)
        setPhase('idle')
        refresh()
      }, 2800)
    } catch (e: any) {
      setToast('网络错误: ' + (e?.message ?? ''))
      setTimeout(() => setToast(''), 3000)
      setPhase('idle')
    }
  }

  const handleLuckyStoneToggle = (n: number) => {
    setLuckyStones(prev => (n <= prev ? n - 1 : n))
  }

  const handleTransfer = async (fromId: string, toId: string) => {
    try {
      const res = await fetch(`${API}/treasure/transfer-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fromTreasureId: fromId, toTreasureId: toId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setToast('转移失败: ' + (data.error ?? data.message ?? `${res.status}`))
        setTimeout(() => setToast(''), 3000)
        throw new Error(data.error)
      }
      await refresh()
      // 在炉区覆盖层显示转移成功 (与单次强化成功位置一致)
      const fromT = save?.treasures.find(t => t.id === fromId)
      setResult({
        success: true,
        lucky: false,
        oldLevel: 0,
        newLevel: fromT?.level ?? 0,
        message: `转移成功: Lv.${fromT?.level ?? 0} 已转移`,
      })
      setPhase('revealed')
      setTimeout(() => {
        setResult(null)
        setPhase('idle')
      }, 2200)
    } catch (e: any) {
      if (e?.message && e.message !== 'CANCEL') {
        // already toasted
      }
      throw e
    }
  }

  if (!save) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => navigate('/city')}>←返回主城</button>
          <h2 style={{ color: 'var(--text-gold)', margin: 0 }}>宝具工坊</h2>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          强化符 {talismanCount} · 幸运石 {luckyStoneCount} · 转移符 {transferTalismanCount}
        </div>
      </div>

      {toast && (
        <div style={{ padding: '8px', background: '#c62828', color: '#fff', borderRadius: '4px', marginBottom: '12px', textAlign: 'center' }}>
          {toast}
        </div>
      )}

      {/* 主体 */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* 左: 炉区 */}
        <div style={{
          position: 'relative', background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
          borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Cauldron
            selectedTreasure={selectedTreasure}
            phase={phase === 'revealed' && result?.success ? 'revealed' : phase}
            onSlotClick={() => phase === 'idle' && selectedTreasureId && setSelectedTreasureId(null)}
          />

          <LuckyStoneSlots
            used={luckyStones}
            available={luckyStoneCount}
            disabled={phase !== 'idle'}
            onToggle={handleLuckyStoneToggle}
          />

          {phase === 'revealed' && result && (
            <div style={{
              position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
              padding: '8px 16px', borderRadius: '20px',
              background: result.success ? 'rgba(76, 175, 80, 0.9)' : 'rgba(198, 40, 40, 0.9)',
              color: '#fff', fontSize: '14px', fontWeight: 'bold',
              pointerEvents: 'none', zIndex: 10,
            }}>
              {result.message
                ? result.message
                : result.success
                  ? result.lucky
                    ? `欧皇附体! Lv.${result.oldLevel} → Lv.${result.newLevel} (连升3级)`
                    : `强化成功! Lv.${result.oldLevel} → Lv.${result.newLevel}`
                  : `强化失败,等级维持 Lv.${result.oldLevel}`}
            </div>
          )}
        </div>

        {/* 右: 辅印列表 */}
        <div style={{
          background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
          borderRadius: '8px', padding: '12px', overflowY: 'auto',
        }}>
          <h4 style={{ color: 'var(--text-gold)', marginBottom: '8px' }}>辅印列表</h4>
          <SubTreasureList
            treasures={subs}
            selectedTreasureId={selectedTreasureId}
            disabledTreasureIds={new Set(selectedTreasureId ? [selectedTreasureId] : [])}
            onPick={(id) => setSelectedTreasureId(id)}
            onUnpick={() => setSelectedTreasureId(null)}
            disabled={phase !== 'idle'}
            equippedMap={equippedMap}
            heroNameMap={heroNameMap}
          />
        </div>
      </div>

      {/* 底部 */}
      <div style={{
        marginTop: '16px', padding: '12px 16px', background: 'var(--bg-medium)',
        border: '1px solid var(--border-wood)', borderRadius: '8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
      }}>
        <div style={{ flex: 1, fontSize: '13px' }}>
          {selectedTreasure ? (
            <>
              <div style={{ color: 'var(--text-gold)', fontWeight: 'bold' }}>
                {'★'.repeat(selectedTreasure.starLevel)} {selectedTreasure.name} Lv.{selectedTreasure.level ?? 0}
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                本次成功率: {adjustedRate}% (基础 {baseRate}% {luckyStones > 0 && `+ 幸运石 ${luckyStones} 颗 = +${luckyStones * 5}%`})
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                消耗: {goldCost} 金币 + 1 强化符{luckyStones > 0 && ` + ${luckyStones} 幸运石`}
              </div>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>请从右侧选择辅印</span>
          )}
        </div>

        <button onClick={() => setTransferOpen(true)} disabled={phase !== 'idle'}>
          + 等级转移
        </button>
        <button className="primary" onClick={handleUpgrade}
          disabled={!canUpgrade}
          style={{ padding: '10px 20px', fontSize: '15px', opacity: canUpgrade ? 1 : 0.4 }}>
          {phase === 'upgrading' ? '强化中...' : '强化'}
        </button>
        <button className="primary" onClick={handleUpgrade10}
          disabled={!canUpgrade}
          style={{ padding: '10px 20px', fontSize: '15px', opacity: canUpgrade ? 1 : 0.4 }}>
          {phase === 'upgrading' ? '强化中...' : '强化十次'}
        </button>
        <button onClick={handleUpgradeMax}
          disabled={!canUpgradeMax || phase !== 'idle'}
          style={{
            padding: '10px 20px', fontSize: '15px', fontWeight: 'bold',
            color: 'var(--text-gold)',
            border: `1px solid ${canUpgradeMax ? 'var(--text-gold)' : '#555'}`,
            background: 'transparent',
            borderRadius: '4px',
            cursor: canUpgradeMax ? 'pointer' : 'not-allowed',
            opacity: canUpgradeMax ? 1 : 0.4,
          }}>
          {phase === 'upgrading' ? '拉满中...' : `一键拉满 (${upgradeMaxRemaining}次)`}
        </button>
      </div>

      <TransferModal
        open={transferOpen}
        treasures={subs}
        transferTalismanCount={transferTalismanCount}
        onConfirm={handleTransfer}
        onClose={() => setTransferOpen(false)}
        equippedMap={equippedMap}
        heroNameMap={heroNameMap}
      />
    </div>
  )
}
