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
    // toggle: 再点同一行取消
    if (pendingStoneId === stoneId) {
      setPendingStoneId(null)
      return
    }
    // 不能选已投入凹槽的 stoneId (取该组的第一个未用 stoneId)
    const targetStone = stones.find(s => s.stoneId === stoneId)
    if (!targetStone) return
    setPendingStoneId(stoneId)
  }

  // 凹槽点击 4 路逻辑
  const handleSlotClick = (idx: number) => {
    if (phase !== 'idle') return
    const current = slots[idx]
    if (!current && pendingStoneId) {
      // 槽空 + 待用 → 投入 (取待用对应组的 stoneId; 若该 stoneId 已投入, 取该组下一个未用的)
      const pending = stones.find(x => x.stoneId === pendingStoneId)
      if (!pending) return
      const group = stones.filter(s => s.starLevel === pending.starLevel && s.heroId === pending.heroId)
      const target = group.find(s => !usedStoneIds.has(s.stoneId))
      if (!target) return
      const newSlots = [...slots]
      newSlots[idx] = { stoneId: target.stoneId, starLevel: target.starLevel, heroId: target.heroId }
      setSlots(newSlots)
      // pending 保留, 用户可继续投入另两个槽
      return
    }
    if (!current && !pendingStoneId) {
      setToast('请先在右侧池中选一颗')
      setTimeout(() => setToast(''), 2000)
      return
    }
    if (current && pendingStoneId && pendingStoneId !== current.stoneId) {
      // 槽有 + 待用 ≠ 槽内 → 替换 (旧回池)
      const targetStone = stones.find(s => s.stoneId === pendingStoneId)
      if (!targetStone) return
      const newSlots = [...slots]
      newSlots[idx] = { stoneId: targetStone.stoneId, starLevel: targetStone.starLevel, heroId: targetStone.heroId }
      setSlots(newSlots)
      return
    }
    if (current && !pendingStoneId) {
      // 槽有 + 无待用 → 取出
      const newSlots = [...slots]
      newSlots[idx] = null
      setSlots(newSlots)
      return
    }
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
      }, 800)
    } catch (e: any) {
      setToast('网络错误: ' + (e?.message ?? ''))
      setTimeout(() => setToast(''), 3000)
    } finally {
      setBusy(false)
    }
  }

  const handleCollect = async () => {
    setSlots([null, null, null])
    setPendingStoneId(null)
    setResultStone(null)
    setPhase('idle')
    await refresh()
  }

  const resultHeroName = resultStone ? heroMap.get(resultStone.heroId)?.name ?? resultStone.heroId : ''

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
            onCollect={handleCollect}
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
            disabled={phase !== 'idle'}
          />
        </div>
      </div>

      {/* 底部 */}
      <div style={{
        marginTop: '16px', padding: '12px 16px', background: 'var(--bg-medium)',
        border: '1px solid var(--border-wood)', borderRadius: '8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          color: totalSelected === 3 && allSameStar ? 'var(--text-gold)' : '#ff6b6b',
          fontSize: '14px', fontWeight: 'bold',
        }}>
          已选 {totalSelected}/3
          {totalSelected > 0 && !allSameStar && ' (跨星级无效)'}
        </span>
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
  )
}
