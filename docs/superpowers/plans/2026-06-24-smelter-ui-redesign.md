# 熔炼炉 UI 重做 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把熔炼功能从 `BackpackPage` 内嵌 modal 迁移到独立 `/smelter` 页面, 以纯 CSS 炼丹炉为主体, 三角凹槽投入石头, 底部"融合"按钮触发 5 段轻量动效.

**Architecture:** 新页面 = 组合式 React (Cauldron 纯展示 + StonePicker 池列表 + SmeltAnimation 结果展示), 状态机驱动 (`idle → brewing → revealed → idle`). 关键 CSS keyframes 通过一次性 `<style>` 注入 `document.head`. 后端 `/api/recruit/smelt/:userId` 不动, 只换前端入口与展示.

**Tech Stack:** React 19 + Vite + inline styles + 一次性 `<style>` 标签注入 keyframes + 现有 `/api/recruit/smelt/:userId` endpoint.

---

## File Structure

| 文件 | 责任 | 类型 |
|------|------|------|
| `apps/web/src/pages/SmelterPage/index.tsx` | 页面装配 + 状态机 + 数据流 | 新建 |
| `apps/web/src/pages/SmelterPage/Cauldron.tsx` | 纯 CSS 炉身 + 三角凹槽 + 炉火动画 | 新建 |
| `apps/web/src/pages/SmelterPage/StonePicker.tsx` | 右侧英雄石池, 按 (星, 英雄) 分组 | 新建 |
| `apps/web/src/pages/SmelterPage/SmeltAnimation.tsx` | 结果英雄石升起 + 高光环 + "收下" | 新建 |
| `apps/web/src/pages/SmelterPage/keyframes.ts` | 5 个 keyframes 字符串 (slot-pulse / flicker / shake / slot-fly-in / result-rise), 由组件注入 | 新建 |
| `apps/web/src/main.tsx` | 加 `/smelter` 路由 | 改 +1 行 |
| `apps/web/src/pages/CityPage/index.tsx` | smelt 建筑卡片加"进入熔炼炉"按钮 | 改 +6 行 |
| `apps/web/src/pages/BackpackPage/index.tsx` | 删 SmeltModal + 熔炼按钮 + 说明文字 | 改 -160 行 |

**关注点分离:**
- Cauldron 只管"长什么样", 接收 `slots / activeSlot / phase / resultStone / onSlotClick`, 无数据获取
- StonePicker 只管"池列表渲染", 接收 `stones / heroMap / pendingStoneId / usedStoneIds / onPick`
- SmeltAnimation 只管"结果展示", 接收 `resultStone / onCollect`
- SmelterPage 装配三者, 管状态/请求

---

## Task 1: 注入共享 keyframes

**Files:**
- Create: `apps/web/src/pages/SmelterPage/keyframes.ts`

- [ ] **Step 1: 创建 keyframes.ts 文件**

内容:

```ts
/**
 * SmelterPage 用到的所有 CSS keyframes, 通过 useSmelterKeyframes() 注入 document.head
 * 一次性注入, 后续 render 复用.
 */
export const SMELTER_KEYFRAMES = `
@keyframes slot-pulse {
  0%, 100% { box-shadow: 0 0 8px 2px var(--slot-color, rgba(255, 213, 79, 0.3)); }
  50%      { box-shadow: 0 0 16px 4px var(--slot-color, rgba(255, 213, 79, 0.7)); }
}
@keyframes flicker {
  0%, 100% { opacity: 0.7; transform: scaleY(1) translateX(-50%); }
  50%      { opacity: 0.95; transform: scaleY(1.08) translateX(-50%); }
}
@keyframes cauldron-shake {
  0%, 100% { transform: rotate(0deg); }
  25%      { transform: rotate(-2deg); }
  75%      { transform: rotate(2deg); }
}
@keyframes slot-fly-out {
  0%   { transform: scale(1);    opacity: 1; }
  100% { transform: scale(0.3);  opacity: 0; }
}
@keyframes result-rise {
  0%   { transform: translateY(40px) scale(0.6); opacity: 0; }
  100% { transform: translateY(0)    scale(1);   opacity: 1; }
}
@keyframes ring-pulse {
  0%   { transform: scale(0.8); opacity: 0; }
  40%  { opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0; }
}
`

let injected = false

/** 注入 SMELTER_KEYFRAMES 到 document.head, 只注入一次 */
export function useSmelterKeyframes(): void {
  if (typeof document === 'undefined') return
  if (injected) return
  injected = true
  const style = document.createElement('style')
  style.setAttribute('data-smelter', 'true')
  style.textContent = SMELTER_KEYFRAMES
  document.head.appendChild(style)
}
```

- [ ] **Step 2: 类型检查**

```bash
cd apps/web && npx tsc --noEmit
```

预期: 无错误 (no output).

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/pages/SmelterPage/keyframes.ts
git commit -m "feat(smelter): 注入共享 CSS keyframes

slot-pulse (凹槽脉冲) / flicker (炉火跳动) / cauldron-shake (炉身摇晃) /
slot-fly-out (石头飞出) / result-rise (结果升起) / ring-pulse (高光环).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: 创建 Cauldron 组件

**Files:**
- Create: `apps/web/src/pages/SmelterPage/Cauldron.tsx`

- [ ] **Step 1: 创建 Cauldron.tsx**

内容:

```tsx
import { useSmelterKeyframes } from './keyframes'
import type { HeroStone } from '@hero-legend/shared-types'

const SLOT_POS: Array<{ top?: string; bottom?: string; left?: string; right?: string }> = [
  { top: '8%', left: '50%' },           // 凹槽① 顶中
  { bottom: '35%', left: '18%' },       // 凹槽② 左下
  { bottom: '35%', right: '18%' },      // 凹槽③ 右下
]

const SLOT_COLOR: Record<number, string> = {
  1: '#8a6a3a',
  2: '#8a6a3a',
  3: '#8a6a3a',
  4: '#9c7ec8',
  5: '#ffd54f',
}

export interface CauldronSlot {
  stoneId: string
  starLevel: number
  heroId: string
}

interface CauldronProps {
  slots: Array<CauldronSlot | null>
  phase: 'idle' | 'brewing' | 'revealed'
  resultStone?: HeroStone | null
  onSlotClick: (idx: number) => void
  /** 渲染时是否给空槽加 slot-pulse 动画 (idle 阶段 true, brewing/revealed 阶段 false) */
  slotsPulsing: boolean
}

export function Cauldron({ slots, phase, resultStone, onSlotClick, slotsPulsing }: CauldronProps) {
  useSmelterKeyframes()
  const isBrewing = phase === 'brewing'

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '480px', aspectRatio: '1', margin: '0 auto' }}>
      {/* 炉身 */}
      <div
        style={{
          position: 'absolute', inset: '15% 5% 5% 5%',
          borderRadius: '50% / 40%',
          background: 'linear-gradient(180deg, #4a3525 0%, #2a1f15 100%)',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.7), 0 0 0 4px #1a0f08, 0 0 0 6px #c8a050',
          animation: isBrewing ? 'cauldron-shake 0.6s ease-in-out 1' : undefined,
        }}
      >
        {/* 炉口 */}
        <div style={{
          position: 'absolute', top: '-12%', left: '12%', right: '12%', height: '24%',
          borderRadius: '50% / 100%',
          background: 'linear-gradient(180deg, #1a0f08 0%, #2a1f15 100%)',
          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.9)',
        }} />

        {/* 炉火 (炉口下半部) */}
        <div style={{
          position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '20%',
          background: 'radial-gradient(ellipse at center bottom, #ffaa3a 0%, #ff6b1a 50%, transparent 80%)',
          filter: isBrewing ? 'brightness(1.5)' : 'brightness(1)',
          transition: 'filter 200ms ease',
          animation: 'flicker 2s ease-in-out infinite',
          transformOrigin: 'center bottom',
          pointerEvents: 'none',
        }} />
      </div>

      {/* 3 个凹槽 */}
      {SLOT_POS.map((pos, idx) => {
        const stone = slots[idx]
        const isEmpty = !stone
        const slotColor = stone ? SLOT_COLOR[stone.starLevel] : 'rgba(255, 213, 79, 0.5)'
        return (
          <div
            key={idx}
            onClick={() => onSlotClick(idx)}
            style={{
              position: 'absolute',
              ...pos,
              transform: pos.left === '50%' ? 'translateX(-50%)' : undefined,
              width: '64px', height: '64px', borderRadius: '50%',
              background: stone
                ? `linear-gradient(135deg, var(--bg-dark), ${slotColor}33)`
                : 'radial-gradient(circle, rgba(255, 213, 79, 0.15), rgba(0,0,0,0.4))',
              border: `2px ${isEmpty ? 'dashed' : 'solid'} ${slotColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isBrewing ? 'default' : 'pointer',
              opacity: isBrewing ? 0.4 : 1,
              transition: 'opacity 200ms, transform 200ms',
              animation: slotsPulsing && isEmpty
                ? 'slot-pulse 1.6s ease-in-out infinite'
                : undefined,
              ['--slot-color' as any]: slotColor,
              color: '#fff', fontSize: '12px', fontWeight: 'bold',
              userSelect: 'none',
            }}
          >
            {stone ? (
              <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                <div style={{ color: 'var(--text-gold)', fontSize: '10px' }}>{'★'.repeat(stone.starLevel)}</div>
                <div style={{ fontSize: '10px' }}>{stone.heroId.slice(0, 4)}</div>
              </div>
            ) : (
              <span style={{ color: slotColor, fontSize: '18px' }}>+</span>
            )}
          </div>
        )
      })}

      {/* 结果英雄石 (revealed 阶段显示) */}
      {phase === 'revealed' && resultStone && (
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 5, animation: 'result-rise 400ms ease-out forwards',
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: `linear-gradient(135deg, #ff6b6b, #c62828)`,
            border: '3px solid #ffd54f',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 'bold', textAlign: 'center', position: 'relative',
            boxShadow: '0 0 30px rgba(255, 213, 79, 0.8)',
          }}>
            <div style={{ fontSize: '12px', color: '#ffd54f' }}>{'★'.repeat(resultStone.starLevel)}</div>
            <div style={{ fontSize: '11px', padding: '0 4px' }}>{resultStone.heroId.slice(0, 6)}</div>
            {/* 高光环 */}
            <div style={{
              position: 'absolute', inset: '-8px', borderRadius: '50%',
              border: '2px solid #ffd54f', pointerEvents: 'none',
              animation: 'ring-pulse 800ms ease-out forwards',
            }} />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

```bash
cd apps/web && npx tsc --noEmit
```

预期: 无错误.

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/pages/SmelterPage/Cauldron.tsx
git commit -m "feat(smelter): Cauldron 组件 - 纯 CSS 炉 + 三角凹槽

- 椭圆炉身 + 双层边框 + 炉火 radial gradient + flicker 动画
- 3 个凹槽绝对定位呈三角 (顶 / 左下 / 右下)
- 空槽 slot-pulse 1.6s 脉冲, 凹槽石头按星级色填充
- brewing 阶段炉身摇晃 + 炉火变亮, revealed 阶段结果英雄石升起

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: 创建 StonePicker 组件

**Files:**
- Create: `apps/web/src/pages/SmelterPage/StonePicker.tsx`

- [ ] **Step 1: 创建 StonePicker.tsx**

内容:

```tsx
import type { Hero, HeroStone } from '@hero-legend/shared-types'

interface StoneGroup {
  stoneId: string
  starLevel: number
  heroId: string
  stoneIds: string[]
}

function groupStones(stones: HeroStone[]): StoneGroup[] {
  const groups = new Map<string, StoneGroup>()
  for (const s of stones) {
    const key = `${s.starLevel}|${s.heroId}`
    const g = groups.get(key)
    if (g) g.stoneIds.push(s.stoneId)
    else groups.set(key, { stoneId: s.stoneId, starLevel: s.starLevel, heroId: s.heroId, stoneIds: [s.stoneId] })
  }
  return Array.from(groups.values()).sort((a, b) => b.starLevel - a.starLevel || a.heroId.localeCompare(b.heroId))
}

interface StonePickerProps {
  stones: HeroStone[]
  heroMap: Map<string, Hero>
  pendingStoneId: string | null
  usedStoneIds: Set<string>
  onPick: (stoneId: string) => void
  disabled?: boolean
}

export function StonePicker({ stones, heroMap, pendingStoneId, usedStoneIds, onPick, disabled }: StonePickerProps) {
  const groups = groupStones(stones)

  if (groups.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 16px' }}>
        没有待用的英雄石 — 去招贤馆抽卡吧
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px', padding: '0 4px' }}>
        点行选为"待用", 再点左侧凹槽投入
      </div>
      {groups.map(g => {
        const hero = heroMap.get(g.heroId)
        // 该组至少有一颗未投入凹槽 → 可选; 否则全灰
        const available = g.stoneIds.some(id => !usedStoneIds.has(id))
        const isPending = pendingStoneId === g.stoneId
        return (
          <div
            key={`${g.starLevel}-${g.heroId}`}
            onClick={() => !disabled && available && onPick(g.stoneId)}
            style={{
              background: isPending ? '#3a2a1a' : 'var(--bg-dark)',
              border: `1px solid ${isPending ? 'var(--text-gold)' : 'var(--border-wood)'}`,
              borderRadius: '4px', padding: '8px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: disabled || !available ? 'not-allowed' : 'pointer',
              opacity: disabled || !available ? 0.4 : 1,
              transition: 'all 150ms',
            }}
          >
            <span style={{ color: 'var(--text-light)', fontWeight: 'bold' }}>
              {hero?.name ?? g.heroId}
            </span>
            <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-gold)', fontSize: '11px' }}>
                {'★'.repeat(g.starLevel)}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>× {g.stoneIds.length}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

```bash
cd apps/web && npx tsc --noEmit
```

预期: 无错误.

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/pages/SmelterPage/StonePicker.tsx
git commit -m "feat(smelter): StonePicker 组件 - 右侧英雄石池

- groupStones 按 (星, 英雄) 分组, 复用 BackpackPage 逻辑
- 点行 → 切 pendingStoneId (toggle)
- 已投入凹槽的组 (usedStoneIds 全占) 灰显 + cursor not-allowed

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: 创建 SmeltAnimation 组件

**Files:**
- Create: `apps/web/src/pages/SmelterPage/SmeltAnimation.tsx`

- [ ] **Step 1: 创建 SmeltAnimation.tsx**

内容:

```tsx
import type { HeroStone } from '@hero-legend/shared-types'

interface SmeltAnimationProps {
  phase: 'brewing' | 'revealed'
  resultStone: HeroStone | null
  heroName: string
  onCollect: () => void
}

export function SmeltAnimation({ phase, resultStone, heroName, onCollect }: SmeltAnimationProps) {
  if (phase === 'brewing') {
    return (
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)', color: 'var(--text-gold)',
          padding: '8px 20px', borderRadius: '20px', fontSize: '16px', fontWeight: 'bold',
        }}>
          融合中...
        </div>
      </div>
    )
  }

  if (phase === 'revealed' && resultStone) {
    return (
      <div style={{
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        zIndex: 10,
      }}>
        <div style={{ color: 'var(--text-gold)', fontSize: '14px', textAlign: 'center' }}>
          融合成功: {'★'.repeat(resultStone.starLevel)} {heroName}
        </div>
        <button
          className="primary"
          onClick={onCollect}
          style={{ padding: '10px 32px', fontSize: '16px' }}
        >
          收下
        </button>
      </div>
    )
  }

  return null
}
```

- [ ] **Step 2: 类型检查**

```bash
cd apps/web && npx tsc --noEmit
```

预期: 无错误.

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/pages/SmelterPage/SmeltAnimation.tsx
git commit -m "feat(smelter): SmeltAnimation 组件 - 融合中提示 + 收下按钮

- brewing: 中央显示 \"融合中...\" loading
- revealed: 底部显示融合结果 + 收下按钮

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: 创建 SmelterPage 主页面

**Files:**
- Create: `apps/web/src/pages/SmelterPage/index.tsx`

- [ ] **Step 1: 创建 index.tsx**

内容:

```tsx
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
      const group = stones.filter(s => s.starLevel === (() => {
        const t = stones.find(x => x.stoneId === pendingStoneId)
        return t?.starLevel
      })() && s.heroId === (stones.find(x => x.stoneId === pendingStoneId)?.heroId))
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
    setPhase('brewing')
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
        setPhase('idle')
        setTimeout(() => setToast(''), 3000)
        return
      }
      // 800ms 后进入 revealed
      setTimeout(() => {
        setResultStone(data.stone)
        setPhase('revealed')
      }, 800)
    } catch (e: any) {
      setToast('网络错误: ' + (e?.message ?? ''))
      setPhase('idle')
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
            phase={phase === 'brewing' ? 'brewing' : phase === 'revealed' ? 'revealed' : 'brewing'}
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
```

- [ ] **Step 2: 类型检查**

```bash
cd apps/web && npx tsc --noEmit
```

预期: 无错误. 警告 `['--slot-color' as any]` 是已知 (CSS 变量类型绕过), 不影响运行.

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/pages/SmelterPage/index.tsx
git commit -m "feat(smelter): SmelterPage 主页面 - 状态机 + 数据流

- slots[3] / pendingStoneId / phase (idle|brewing|revealed) / resultStone
- handleSlotClick 4 路: 空+待用 / 空+无 / 槽有+不同 / 槽有+无 (取出)
- handleSmelt: 预校验 → fetch /api/recruit/smelt → 800ms 后 reveal
- handleCollect: 清空 + refresh
- 顶部规则说明 + 底部选中计数 + 融合按钮

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: 注册 /smelter 路由

**Files:**
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: 加 import 和 Route**

在 `apps/web/src/main.tsx` 中, 在现有 import 区追加一行:

```tsx
import { SmelterPage } from './pages/SmelterPage'
```

在 `<Routes>` 内, 在 `<Route path="/city" ... />` 后追加:

```tsx
        <Route path="/smelter" element={<SmelterPage />} />
```

完整 diff:

```diff
 import { CityPage } from './pages/CityPage'
 import { BackpackPage } from './pages/BackpackPage'
+import { SmelterPage } from './pages/SmelterPage'
 import './styles/global.css'
```

```diff
         <Route path="/backpack" element={<BackpackPage />} />
         <Route path="/city" element={<CityPage />} />
+        <Route path="/smelter" element={<SmelterPage />} />
       </Routes>
```

- [ ] **Step 2: 类型检查**

```bash
cd apps/web && npx tsc --noEmit
```

预期: 无错误.

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/main.tsx
git commit -m "feat(smelter): 注册 /smelter 路由

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: CityPage 加"进入熔炼炉"入口

**Files:**
- Modify: `apps/web/src/pages/CityPage/index.tsx:105-117` (building card 渲染区域)

- [ ] **Step 1: 在 smelt 卡片加按钮**

找到现有这段 (lines 105-110):

```tsx
              {b.type === 'recruit' && (
                <button style={{ width: '100%', fontSize: '12px', marginBottom: '8px' }}
                  onClick={() => navigate('/recruit')}>
                  进入招贤馆
                </button>
              )}
```

在这段之后插入:

```tsx
              {b.type === 'smelt' && (
                <button style={{ width: '100%', fontSize: '12px', marginBottom: '8px' }}
                  onClick={() => navigate('/smelter')}>
                  进入熔炼炉
                </button>
              )}
```

- [ ] **Step 2: 类型检查**

```bash
cd apps/web && npx tsc --noEmit
```

预期: 无错误.

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/pages/CityPage/index.tsx
git commit -m "feat(smelter): CityPage 熔炼炉卡片加入口按钮

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: 删除 BackpackPage SmeltModal 与熔炼入口

**Files:**
- Modify: `apps/web/src/pages/BackpackPage/index.tsx`

- [ ] **Step 1: 删除 SmeltModal 组件**

整段删除 `SmeltModal` 函数组件 (从 `function SmeltModal({` 开始到它对应的 `}` 结束). 约 145 行.

边界识别: 文件末尾 `function SmeltModal({` 开头, 到文件最后的 `}` 结束.

删除后文件末尾应该只剩 `export function BackpackPage() { ... }`.

- [ ] **Step 2: 删除 smeltOpen state 与相关 props**

在 BackpackPage 函数体内:

1. 删除 `const [smeltOpen, setSmeltOpen] = useState(false)` (一行)
2. 删除 stones tab 顶部的整个说明文字 div + 熔炼按钮 div (约 12 行, 从 `<div style={{ display: 'flex', justifyContent: 'space-between'...` 到对应 `</div>` 结束, 包括 "熔炼炉: 3 颗同星..." 说明文本 和 `<button ... 熔炼 ... onClick={() => setSmeltOpen(true)}`)
3. 删除文件末尾的 `{smeltOpen && (<SmeltModal ... />)}` 调用块 (约 10 行)

- [ ] **Step 3: 类型检查**

```bash
cd apps/web && npx tsc --noEmit
```

预期: 无错误. 警告 `import type` 中未使用的类型如果 TypeScript 报就一并删除; inline styles 不应再有 `slot-pulse` 等.

- [ ] **Step 4: 提交**

```bash
git add apps/web/src/pages/BackpackPage/index.tsx
git commit -m "refactor(backpack): 删除 SmeltModal 与熔炼入口

熔炼功能移至 /smelter 单一入口, 此处不再保留.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: 端到端手动验证

**Files:** (无)

- [ ] **Step 1: 启动 dev server (若未运行)**

```bash
# 终端 A: web
cd apps/web && pnpm dev

# 终端 B: server
cd apps/server && pnpm dev
```

预期: web 在 :5173, server 在 :3000.

- [ ] **Step 2: 创建测试存档 + 抽卡拿石头**

打开浏览器:
1. 访问 `http://localhost:5173/` → 登录任意 userId
2. 访问 `/recruit` → 切到"初级酒馆" → 连续点十连几次, 直到至少 30 个石头
3. (可选) 用 curl 直接往 heroStones 里塞 3 颗同星同英雄的石头, 测试"同英雄升级"路径

- [ ] **Step 3: 走通核心流程**

访问 `/smelter`:
1. 页面渲染: 看到炼丹炉 (左), 英雄石池 (右), 底部"已选 0/3 + 融合"按钮
2. 点池中一行 → 该行高亮金色边框
3. 点左上方凹槽① → 石头出现
4. 点池中另一行 → 再点凹槽② / 凹槽③ → 3 个凹槽填满
5. 底部"已选 3/3", "融合" 按钮启用
6. 点"融合":
   - 3 颗石头缩小淡出
   - 炉火变亮, 炉身摇晃
   - "融合中..." 显示
   - 结果英雄石从炉口升起 + 金色脉冲环
   - 底部出现"融合成功: ★★★ 虞姬" + "收下" 按钮
7. 点"收下" → 回到 idle, 凹槽空, 池刷新

- [ ] **Step 4: 回归 /backpack**

访问 `/backpack` → 切到"英雄石" tab:
1. 顶部**不再有**"熔炼炉: 3 颗同星..." 说明文字
2. 顶部**不再有**"熔炼" 按钮
3. 英雄石列表正常渲染, "使用"按钮仍工作

访问 `/city`:
4. 熔炼炉卡片**有**"进入熔炼炉" 按钮, 点 → 跳 `/smelter`

- [ ] **Step 5: 边界情况**

测试失败场景:
1. 选 3 颗不同星的石头 → 底部"已选 3/3 (跨星级无效)" 红色, "融合" 禁用
2. 点空凹槽 (无待用) → 顶部 toast "请先在右侧池中选一颗"
3. 槽有 + 点池中另一行 + 点槽 → 替换, 旧石头回池
4. 槽有 + 直接点槽 → 取出

如果发现 bug, 修复并额外提交一个 `fix(smelter): ...` commit.

---

## Task 10: 全量 build + push

- [ ] **Step 1: 全 package build**

```bash
cd /d/work/hero-legend && pnpm build
```

预期: 所有包 build 通过, 0 errors.

- [ ] **Step 2: push**

```bash
git push origin master
```

预期: 推到 `origin/master`, 包含本计划所有 commit.

---

## Self-Review

### Spec coverage

| Spec 要求 | 实施 Task |
|----------|----------|
| 路由 /smelter | Task 6 |
| SmelterPage + 3 子组件 | Task 5 (index) + Task 2/3/4 (子组件) |
| 纯 CSS 炼丹炉 + 三角凹槽 | Task 2 (Cauldron) |
| 凹槽脉冲 / 飞入 / 炉火 / 摇晃 / 升起 5 段动画 | Task 1 (keyframes) + Task 2 (应用) + Task 4 (结果) |
| 状态机 idle/brewing/revealed | Task 5 |
| 800ms 酝酿 timing | Task 5 (setTimeout 800) |
| 错误处理 (5xx / 网络 / 跨星) | Task 5 |
| CityPage 入口 | Task 7 |
| 删 BackpackPage SmeltModal | Task 8 |
| 端到端验证 | Task 9 |
| pnpm build | Task 10 |

✅ 全覆盖.

### Placeholder scan

无 "TBD" / "TODO" / "fill in" / "类似 Task N". 每个 Step 含完整代码或精确路径.

### Type consistency

- `CauldronSlot` 在 Task 2 定义, Task 5 引用, 一致 ✓
- `Phase = 'idle' | 'brewing' | 'revealed'` 在 Task 5 定义, Task 2 props / Task 4 props 引用, 一致 ✓
- `useSmelterKeyframes` 在 Task 1 定义, Task 2/5 引用, 一致 ✓
- `groupStones` 在 Task 3 定义 (SmelterPage 内部), Task 5 通过 `StonePicker` 间接用, 不重复实现 ✓

### Scope

单一子系统, 单计划可完成. 无需拆分.