import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Hero, HeroStone } from '@hero-legend/shared-types'
import { Cauldron, type CauldronSlot } from './Cauldron'
import { StonePicker } from './StonePicker'
import { SmeltAnimation } from './SmeltAnimation'
import { useSmelterKeyframes } from './keyframes'

const API = '/api'

type Phase = 'idle' | 'brewing' | 'revealed'

export function SmelterPage() {
  useSmelterKeyframes()
  const navigate = useNavigate()
  const userId = localStorage.getItem('hero-legend-userId') || ''
  const [stones, setStones] = useState<HeroStone[]>([])
  const [allHeroes, setAllHeroes] = useState<Hero[]>([])
  const [slots, setSlots] = useState<Array<CauldronSlot | null>>([null, null, null])
  const [pendingStoneId, setPendingStoneId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [resultStone, setResultStone] = useState<HeroStone | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  // 一键融合进度
  const [batchFusing, setBatchFusing] = useState(false)
  const [batchFused, setBatchFused] = useState(0)
  const [batchPhase, setBatchPhase] = useState<'same' | 'mixed' | 'done'>('done')

  const refresh = useCallback(async () => {
    const [save, heroData] = await Promise.all([
      fetch(`${API}/save/${userId}`).then(r => r.json()),
      fetch(`${API}/hero`).then(r => r.json()),
    ])
    setStones(save?.heroStones ?? [])
    setAllHeroes(heroData.heroes ?? [])
  }, [userId])

  useEffect(() => {
    if (!userId) { navigate('/'); return }
    refresh()
  }, [userId, refresh])

  const heroMap = useMemo(() => new Map(allHeroes.map(h => [h.id, h])), [allHeroes])

  // 槽中已用 stoneId 集合 (用于 StonePicker 灰显)
  const usedStoneIds = useMemo(() => {
    const s = new Set<string>()
    for (const slot of slots) if (slot) s.add(slot.stoneId)
    return s
  }, [slots])

  const totalSelected = slots.filter(Boolean).length
  const filledStars = slots.map(s => s?.starLevel ?? 0)
  const allSameStar = filledStars.every(s => s === 0 || s === filledStars[0])
  const canSmelt = totalSelected === 3 && allSameStar && phase === 'idle' && !busy

  // 池中选"待用"
  const handlePickFromPool = (stoneId: string) => {
    if (phase !== 'idle') return
    const targetStone = stones.find(s => s.stoneId === stoneId)
    if (!targetStone) return
    // 同组再点时: 若该组还有未投入的石头, 保持 pending 不变 (用户想继续投入同组)
    // 若该组已全部投入, 视为 toggle off
    if (pendingStoneId === stoneId) {
      const group = stones.filter(s => s.starLevel === targetStone.starLevel && s.heroId === targetStone.heroId)
      const groupHasUnused = group.some(s => !usedStoneIds.has(s.stoneId))
      if (groupHasUnused) return
      setPendingStoneId(null)
      return
    }
    setPendingStoneId(stoneId)
  }

  // 双击池行: 把该组第一个未投入的石头放到第一个空凹槽
  const handleAutoPlace = (stoneId: string) => {
    if (phase !== 'idle') return
    setSlots(prevSlots => {
      const target = stones.find(s => s.stoneId === stoneId)
      if (!target) return prevSlots
      const currentUsed = new Set(prevSlots.filter(Boolean).map(s => s!.stoneId))
      const group = stones.filter(s => s.starLevel === target.starLevel && s.heroId === target.heroId)
      const stone = group.find(s => !currentUsed.has(s.stoneId))
      if (!stone) return prevSlots  // group fully used
      const emptyIdx = prevSlots.findIndex(s => s === null)
      if (emptyIdx === -1) return prevSlots  // all slots full
      const newSlots = [...prevSlots]
      newSlots[emptyIdx] = { stoneId: stone.stoneId, starLevel: stone.starLevel, heroId: stone.heroId }
      return newSlots
    })
    // 不动 pendingStoneId: 用户可能想再放同组另一个到下一个空凹槽
  }

  // 凹槽点击 4 路逻辑
  const handleSlotClick = (idx: number) => {
    if (phase !== 'idle') return
    setSlots(prevSlots => {
      const current = prevSlots[idx]
      const currentUsed = new Set(prevSlots.filter(Boolean).map(s => s!.stoneId))
      if (!current && pendingStoneId) {
        // 槽空 + 待用 → 投入 (取待用对应组的 stoneId; 若该 stoneId 已投入, 取该组下一个未用的)
        const pending = stones.find(x => x.stoneId === pendingStoneId)
        if (!pending) return prevSlots
        const group = stones.filter(s => s.starLevel === pending.starLevel && s.heroId === pending.heroId)
        const target = group.find(s => !currentUsed.has(s.stoneId))
        if (!target) return prevSlots
        const newSlots = [...prevSlots]
        newSlots[idx] = { stoneId: target.stoneId, starLevel: target.starLevel, heroId: target.heroId }
        return newSlots
      }
      if (!current && !pendingStoneId) {
        setToast('请先在右侧池中选一颗')
        setTimeout(() => setToast(''), 2000)
        return prevSlots
      }
      if (current && pendingStoneId && pendingStoneId !== current.stoneId) {
        // 槽有 + 待用 ≠ 槽内 → 替换 (旧回池)
        const targetStone = stones.find(s => s.stoneId === pendingStoneId)
        if (!targetStone) return prevSlots
        const newSlots = [...prevSlots]
        newSlots[idx] = { stoneId: targetStone.stoneId, starLevel: targetStone.starLevel, heroId: targetStone.heroId }
        return newSlots
      }
      if (current && !pendingStoneId) {
        // 槽有 + 无待用 → 取出
        const newSlots = [...prevSlots]
        newSlots[idx] = null
        return newSlots
      }
      return prevSlots
    })
  }

  const handleSmelt = async () => {
    if (!canSmelt) return
    setBusy(true)
    try {
      const stoneIds = slots.filter(Boolean).map(s => s!.stoneId)
      const res = await fetch(`${API}/recruit/smelt/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stoneIds }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setToast('熔炼失败: ' + (data.error ?? data.message ?? `${res.status}`))
        setTimeout(() => setToast(''), 3000)
        return
      }
      if (!data.stone) {
        setToast('熔炼失败: 返回数据格式异常')
        setTimeout(() => setToast(''), 3000)
        return
      }
      // 成功 → 切到 brewing 触发 800ms 动画
      setPhase('brewing')
      setTimeout(() => {
        setResultStone(data.stone)
        setPhase('revealed')
        // revealed 持续 1500ms 让用户看到结果, 自动收下
        setTimeout(() => {
          setSlots([null, null, null])
          setPendingStoneId(null)
          setResultStone(null)
          setPhase('idle')
          refresh()
        }, 1500)
      }, 800)
    } catch (e: any) {
      setToast('网络错误: ' + (e?.message ?? ''))
      setTimeout(() => setToast(''), 3000)
    } finally {
      setBusy(false)
    }
  }

  const resultHeroName = resultStone ? heroMap.get(resultStone.heroId)?.name ?? resultStone.heroId : ''

  // 可参与一键融合的英雄石 (4 星及以下)
  const eligibleStones = useMemo(
    () => stones.filter(s => s.starLevel <= 3),
    [stones],
  )

  // 估算可融合次数: 同名组合 + 各星级总计 (含同名也算进星级总计)
  const estimatedFusions = useMemo(() => {
    const byGroup = new Map<string, number>()
    const byStar = new Map<number, number>()
    for (const s of eligibleStones) {
      const k = `${s.starLevel}|${s.heroId}`
      byGroup.set(k, (byGroup.get(k) ?? 0) + 1)
      byStar.set(s.starLevel, (byStar.get(s.starLevel) ?? 0) + 1)
    }
    let count = 0
    // 同名融合优先 (每组 ⌊n/3⌋ 次)
    for (const [, n] of byGroup) count += Math.floor(n / 3)
    // 模拟: 同名融合后剩余再混合 (上限估算, 不严格)
    const remaining = new Map<number, number>(byStar)
    for (const [k, n] of byGroup) {
      const [starStr] = k.split('|')
      const star = Number(starStr)
      const used = Math.floor(n / 3) * 3
      remaining.set(star, (remaining.get(star) ?? 0) - used)
    }
    for (const [, n] of remaining) count += Math.floor(n / 3)
    return count
  }, [eligibleStones])

  // 一键融合: 不断调用 /recruit/smelt, 优先同名同星 (3 → 同英雄+1星), 再混合 (3 → 随机其他+1星)
  const oneClickFuse = async () => {
    if (batchFusing || busy) return
    // 直接拉一次最新服务端数据, 避免依赖 React state 的异步更新
    const saveData = await fetch(`${API}/save/${userId}`).then(r => r.json())
    const freshStones: HeroStone[] = saveData?.heroStones ?? []
    const eligible = freshStones.filter(s => s.starLevel <= 3)

    // 估算: 模拟同名 + 混合, 看是否有可融合的组合
    const byGroup = new Map<string, number>()
    const byStar = new Map<number, number>()
    for (const s of eligible) {
      byGroup.set(`${s.starLevel}|${s.heroId}`, (byGroup.get(`${s.starLevel}|${s.heroId}`) ?? 0) + 1)
      byStar.set(s.starLevel, (byStar.get(s.starLevel) ?? 0) + 1)
    }
    let est = 0
    for (const [, n] of byGroup) est += Math.floor(n / 3)
    const remaining = new Map(byStar)
    for (const [k, n] of byGroup) {
      const star = Number(k.split('|')[0])
      remaining.set(star, (remaining.get(star) ?? 0) - Math.floor(n / 3) * 3)
    }
    for (const [, n] of remaining) est += Math.floor(n / 3)

    if (est === 0) {
      setToast('没有可融合的英雄石 (需 4★ 及以下且每组 ≥3 颗)')
      setTimeout(() => setToast(''), 2500)
      return
    }
    setBatchFusing(true)
    setBatchFused(0)
    setBatchPhase('same')

    // 本地可融合集合 (key = stoneId)
    const localMap = new Map<string, HeroStone>()
    for (const s of eligible) localMap.set(s.stoneId, s)

    let failed = 0
    let lastError = ''
    let fused = 0          // 本地计数 (避免读取未更新的 React 状态)
    let safetyMax = 500   // 防御: 防止死循环
    while (safetyMax-- > 0) {
      // 1) 找一组 (star, hero) 数量 ≥3
      const groupCounts = new Map<string, HeroStone[]>()
      for (const s of localMap.values()) {
        const k = `${s.starLevel}|${s.heroId}`
        let arr = groupCounts.get(k)
        if (!arr) { arr = []; groupCounts.set(k, arr) }
        arr.push(s)
      }
      let sameHeroBatch: HeroStone[] | null = null
      for (const arr of groupCounts.values()) {
        if (arr.length >= 3) { sameHeroBatch = arr.slice(0, 3); break }
      }

      let picked: HeroStone[]
      let phase: 'same' | 'mixed'
      if (sameHeroBatch) {
        picked = sameHeroBatch
        phase = 'same'
      } else {
        // 2) 找任一 star 总数 ≥3 (混合)
        const byStar = new Map<number, HeroStone[]>()
        for (const s of localMap.values()) {
          let arr = byStar.get(s.starLevel)
          if (!arr) { arr = []; byStar.set(s.starLevel, arr) }
          arr.push(s)
        }
        let mixedBatch: HeroStone[] | null = null
        for (const arr of byStar.values()) {
          if (arr.length >= 3) { mixedBatch = arr.slice(0, 3); break }
        }
        if (!mixedBatch) break   // 没有可融合的组合了
        picked = mixedBatch
        phase = 'mixed'
      }
      setBatchPhase(phase)

      // 3) 调 API
      const stoneIds = picked.map(s => s.stoneId)
      try {
        const res = await fetch(`${API}/recruit/smelt/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stoneIds }),
        })
        const data = await res.json()
        if (!res.ok || data.error || !data.stone) {
          failed++
          lastError = data.error ?? data.message ?? `HTTP ${res.status}`
          // 服务端失败: 把这 3 颗从本地剔除, 避免下次重复尝试
          for (const s of picked) localMap.delete(s.stoneId)
          if (failed >= 5) break   // 连续失败太多 → 终止
          continue
        }
        const newStone: HeroStone = data.stone
        // 4) 本地: 移除 3 颗消耗, 加入新石头 (若仍 ≤3)
        for (const s of picked) localMap.delete(s.stoneId)
        if (newStone.starLevel <= 3) localMap.set(newStone.stoneId, newStone)
        fused++
        setBatchFused(fused)
      } catch (e: any) {
        failed++
        lastError = e?.message ?? '网络错误'
        for (const s of picked) localMap.delete(s.stoneId)
        if (failed >= 5) break
      }
    }

    setBatchFusing(false)
    setBatchPhase('done')
    if (failed > 0) {
      setToast(`一键融合完成 ${fused} 次, 失败 ${failed} 次 (${lastError})`)
    } else {
      setToast(`一键融合完成: 共 ${fused} 次`)
    }
    setTimeout(() => setToast(''), 3500)
    await refresh()
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => navigate('/city')}>←返回主城</button>
          <h2 style={{ color: 'var(--text-gold)', margin: 0 }}>熔炼炉</h2>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'right' }}>
          3 颗同星 → 1 颗高一级<br/>
          同 3 英雄 → 同英雄升级; 其他 → 随机其他; 5★ → 5★ 其他
        </div>
      </div>

      {toast && (
        <div style={{ padding: '8px', background: '#c62828', color: '#fff', borderRadius: '4px', marginBottom: '12px', textAlign: 'center' }}>
          {toast}
        </div>
      )}

      {/* 主体: 左炉 + 右池 */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* 左: 炉区 */}
        <div style={{
          position: 'relative', background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
          borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Cauldron
            slots={slots}
            phase={phase}
            resultStone={resultStone}
            onSlotClick={handleSlotClick}
            slotsPulsing={phase === 'idle'}
          />
          <SmeltAnimation
            phase={phase}
            resultStone={resultStone}
            heroName={resultHeroName}
          />
        </div>

        {/* 右: 石池 */}
        <div style={{
          background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
          borderRadius: '8px', padding: '12px', overflowY: 'auto',
        }}>
          <h4 style={{ color: 'var(--text-gold)', marginBottom: '8px' }}>英雄石池</h4>
          <StonePicker
            stones={stones}
            heroMap={heroMap}
            pendingStoneId={pendingStoneId}
            usedStoneIds={usedStoneIds}
            onPick={handlePickFromPool}
            onAutoPlace={handleAutoPlace}
            disabled={phase !== 'idle'}
          />
        </div>
      </div>

      {/* 底部 */}
      <div style={{
        marginTop: '16px', padding: '12px 16px', background: 'var(--bg-medium)',
        border: '1px solid var(--border-wood)', borderRadius: '8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
      }}>
        <span style={{
          color: totalSelected === 3 && allSameStar ? 'var(--text-gold)' : '#ff6b6b',
          fontSize: '14px', fontWeight: 'bold',
        }}>
          已选 {totalSelected}/3
          {totalSelected > 0 && !allSameStar && ' (跨星级无效)'}
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {batchFusing && (
            <span style={{ color: 'var(--text-gold)', fontSize: '13px' }}>
              一键融合中 ({batchPhase === 'same' ? '同名' : '混合'}) × {batchFused}
            </span>
          )}
          <button
            onClick={oneClickFuse}
            disabled={batchFusing || busy || estimatedFusions === 0}
            style={{
              padding: '10px 20px', fontSize: '14px',
              opacity: batchFusing || busy || estimatedFusions === 0 ? 0.4 : 1,
              background: 'linear-gradient(135deg, #c8a050, #8a6a30)',
              color: '#fff', border: '1px solid #ffd54f', borderRadius: '4px',
              fontWeight: 'bold',
            }}
          >
            {batchFusing ? `融合中 × ${batchFused}` : `一键融合 (${estimatedFusions})`}
          </button>
          <button
            className="primary"
            onClick={handleSmelt}
            disabled={!canSmelt}
            style={{ padding: '10px 32px', fontSize: '15px', opacity: canSmelt ? 1 : 0.4 }}
          >
            {phase === 'brewing' ? '融合中...' : '融合'}
          </button>
        </div>
      </div>
    </div>
  )
}
