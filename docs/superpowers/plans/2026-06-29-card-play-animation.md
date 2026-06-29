# Card Play Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visual flying-card animations to the card battle game — cards visually fly from source (hand/equipment) to page center (or to equipment slot) so players can intuitively track every card move, including AI actions.

**Architecture:** Purely decorative React overlay layer using `framer-motion`. `battleStore` subscribes to 5 engine events (`card:play` / `card:discard` / `card:gain` / `equipment:equip` / `equipment:unequip`) and, in their handlers, queries the DOM for source/target positions via `data-*` attributes, then pushes a `FlyingCard` object into state. A Portal-rendered overlay (`FlyingCardOverlay` → `body`) animates the cards with 1- or 2-stage trajectories.

**Tech Stack:** React 19, TypeScript, Zustand 5, framer-motion 12 (already in `apps/web/package.json` deps, not yet used). No engine logic changes beyond 3 small `data` field additions to existing `eventBus.emit(...)` calls.

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `apps/web/src/components/HandCardVisual.tsx` | NEW | Pure visual clone of `HandCard` (no onClick / disabled / canUse logic). 100% opaque. |
| `apps/web/src/components/FlyingCard.tsx` | NEW | Single-card motion component (multi-stage via `useState` stageIdx). |
| `apps/web/src/components/FlyingCardOverlay.tsx` | NEW | Portal-to-body container that renders all `flyingCards` from store. |
| `apps/web/src/components/HeroBattleCard.tsx` | MODIFY | Add `data-hero-id` to root div, `data-equip-slot` to each of 4 equipment `<span>`. |
| `apps/web/src/components/BattleBoard.tsx` | MODIFY | Add `data-card-id` to each player hand wrapper; add invisible `data-center-marker` div; mount `<FlyingCardOverlay />`. |
| `apps/web/src/stores/battleStore.ts` | MODIFY | Add `FlyingCard` type, `flyingCards` state, 4 position helpers, `queueFlyingCard`, 5 event hooks in the existing `handler`, reset in `startBattle`. |
| `packages/game-engine/src/core/Game.ts` | MODIFY | 3 emit changes: emit `equipment:unequip` per item in death loop, add `cards: [id]` field on death `card:discard` and 诀别 `card:gain`. |

**Total:** 3 new files, 4 modified, ~500 lines net.

---

## Task 1: Create HandCardVisual.tsx (pure visual clone of HandCard)

**Files:**
- Create: `apps/web/src/components/HandCardVisual.tsx`

- [ ] **Step 1.1: Create file with card image glob, suit symbols, and theme constants**

```ts
// apps/web/src/components/HandCardVisual.tsx
import type { Card } from '@hero-legend/shared-types'

// 卡牌图片: 扫 cards/*.png, 文件名即卡名
const cardImgModules = import.meta.glob('../images/cards/*.png', { eager: true, import: 'default' }) as Record<string, string>
const CARD_IMAGES: Record<string, string> = {}
for (const [path, url] of Object.entries(cardImgModules)) {
  const filename = path.replace('../images/cards/', '').replace('.png', '')
  CARD_IMAGES[filename] = url
}

const suitSymbol: Record<string, string> = {
  spade: '♠', heart: '♥', diamond: '♦', club: '♣'
}

const TYPE_THEME: Record<string, { bg1: string; bg2: string; bg3: string; border: string; main: string; corner: string }> = {
  basic:    { bg1: '#f4e4bc', bg2: '#e8d4a0', bg3: '#dcc890', border: '#8b6914', main: '#5d4037', corner: 'rgba(139,105,20,0.6)' },
  scheme:   { bg1: '#e3f2fd', bg2: '#bbdefb', bg3: '#90caf9', border: '#1565c0', main: '#0d47a1', corner: 'rgba(21,101,192,0.6)' },
  equipment:{ bg1: '#e8f5e9', bg2: '#c8e6c9', bg3: '#a5d6a7', border: '#2e7d32', main: '#1b5e20', corner: 'rgba(46,125,32,0.6)' },
}
const TYPE_LABEL: Record<string, string> = {
  basic: '基本牌', scheme: '锦囊牌', equipment: '装备牌',
}

const suitFontColor = (suit: string) => (suit === 'heart' || suit === 'diamond') ? '#c62828' : '#212121'
const suitWaterColor = (suit: string) => (suit === 'heart' || suit === 'diamond') ? 'rgba(198,40,40,0.10)' : 'rgba(33,33,33,0.10)'

interface Props {
  card: Card
}

export function HandCardVisual({ card }: Props) {
  const theme = TYPE_THEME[card.type] ?? TYPE_THEME.basic
  const num = card.number > 13 ? '' : card.number === 1 ? 'A' : card.number > 10 ? ['J','Q','K'][card.number - 11] : String(card.number)
  const mainChar = card.name.length > 2 ? card.name.slice(0, 2) : card.name
  const cardImg = CARD_IMAGES[card.name]

  const mainFontSize = card.name.length >= 3 ? 15 : 22
  const waterFontSize = card.name.length >= 3 ? 35 : 56

  return (
    <div style={{
      position: 'relative',
      width: '72px',
      height: '110px',
      background: `linear-gradient(135deg, ${theme.bg1} 0%, ${theme.bg2} 50%, ${theme.bg3} 100%)`,
      border: `1.5px solid ${theme.border}`,
      borderRadius: '4px',
      boxShadow: '0 3px 6px rgba(0,0,0,0.5), inset 0 0 8px rgba(139,105,20,0.2)',
      userSelect: 'none',
      overflow: 'hidden',
      fontFamily: "'KaiTi', 'STKaiti', serif",
      opacity: 1,
    }}>
      {/* 双层装饰边框 */}
      <div style={{ position: 'absolute', inset: '2px', border: `1px solid ${theme.corner}`, borderRadius: '3px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '3.5px', border: `1px dashed ${theme.corner}`, borderRadius: '2px', opacity: 0.55, pointerEvents: 'none' }} />

      {/* 背景水印: 有图用 PNG, 无图用大字 */}
      {cardImg ? (
        <img
          src={cardImg}
          alt={card.name}
          draggable={false}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60px', height: '60px', objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: waterFontSize, color: suitWaterColor(card.suit),
          fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none',
          letterSpacing: '0.05em',
        }}>{mainChar}</div>
      )}

      {/* 角落花色+数字 (左上) */}
      <div style={{ position: 'absolute', top: '3px', left: '3px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, color: suitFontColor(card.suit) }}>
        <span style={{ fontSize: '8px', fontWeight: 'bold' }}>{suitSymbol[card.suit]}</span>
        <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{num}</span>
      </div>

      {/* 角落花色+数字 (右下, 正向) */}
      <div style={{ position: 'absolute', bottom: '3px', right: '3px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, color: suitFontColor(card.suit) }}>
        <span style={{ fontSize: '8px', fontWeight: 'bold' }}>{suitSymbol[card.suit]}</span>
        <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{num}</span>
      </div>

      {/* 类型标签 (顶部居中) — 仅无图时显示 */}
      {!cardImg && (
        <div style={{
          position: 'absolute', top: '5px', left: 0, right: 0,
          textAlign: 'center', color: theme.main,
          fontSize: '6px', letterSpacing: '1px', fontWeight: 'bold',
        }}>{TYPE_LABEL[card.type]}</div>
      )}

      {/* 主字 (底部) — 仅无图时显示 */}
      {!cardImg && (
        <div style={{
          position: 'absolute', bottom: card.name.length >= 3 ? '7px' : '10px', left: 0, right: 0,
          textAlign: 'center',
          color: theme.main,
          fontSize: mainFontSize, fontWeight: 'bold', lineHeight: 1,
        }}>{mainChar}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 1.2: Verify the file type-checks**

Run: `cd D:/work/hero-legend && pnpm --filter @hero-legend/web lint`
Expected: zero errors (the new file is self-contained, no imports broken).

- [ ] **Step 1.3: Commit**

```bash
cd D:/work/hero-legend
git add apps/web/src/components/HandCardVisual.tsx
git commit -m "feat(web): add HandCardVisual pure visual clone for flying-card animation"
```

---

## Task 2: Add data-* attributes to HeroBattleCard.tsx

**Files:**
- Modify: `apps/web/src/components/HeroBattleCard.tsx:75-103` (root div) and `:192-309` (equipment slots)

- [ ] **Step 2.1: Add `data-hero-id` to the root div of HeroBattleCard**

In `apps/web/src/components/HeroBattleCard.tsx` line 75 (the `<div onClick={isSelectable ? onClick : undefined}` opening tag), add `data-hero-id={hero.hero.id}` as a new attribute. The new opening tag should look like:

```tsx
    <div
      data-hero-id={hero.hero.id}
      onClick={isSelectable ? onClick : undefined}
      style={{
```

- [ ] **Step 2.2: Add `data-equip-slot` to the placeholder span (line 197-205)**

Replace the placeholder span block:

```tsx
                return (
                  <span key={s.slot} style={{
                    flex: 1, alignSelf: 'stretch',
                    border: '1px dashed #444',
                    borderRadius: '2px',
                    fontSize: '7px',
                    color: '#555',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{placeholder}</span>
                )
```

with:

```tsx
                return (
                  <span key={s.slot} data-equip-slot={s.slot} style={{
                    flex: 1, alignSelf: 'stretch',
                    border: '1px dashed #444',
                    borderRadius: '2px',
                    fontSize: '7px',
                    color: '#555',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{placeholder}</span>
                )
```

- [ ] **Step 2.3: Add `data-equip-slot` to the equipped-card span (line 253-282)**

Replace the equipped span opening tag (the one with `key={s.slot}` and `title={hoverText}` and `onClick={handleClick}`):

```tsx
                <span
                  key={s.slot}
                  title={hoverText}
                  onClick={handleClick}
                  style={{
```

with:

```tsx
                <span
                  key={s.slot}
                  data-equip-slot={s.slot}
                  title={hoverText}
                  onClick={handleClick}
                  style={{
```

- [ ] **Step 2.4: Verify the file type-checks**

Run: `cd D:/work/hero-legend && pnpm --filter @hero-legend/web lint`
Expected: zero errors (the `data-*` attributes are arbitrary string attributes, no type changes needed).

- [ ] **Step 2.5: Commit**

```bash
cd D:/work/hero-legend
git add apps/web/src/components/HeroBattleCard.tsx
git commit -m "feat(web): add data-hero-id and data-equip-slot markers to HeroBattleCard"
```

---

## Task 3: Add data-card-id to player hand wrappers in BattleBoard.tsx

**Files:**
- Modify: `apps/web/src/components/BattleBoard.tsx:1238-1319` (playerHand.map)

- [ ] **Step 3.1: Add `data-card-id={card.id}` to the wrapper div in playerHand.map**

In `apps/web/src/components/BattleBoard.tsx`, locate the wrapper div inside `playerHand.map((card, idx) => { ... })`. The wrapper starts at the line with `key={card.id}` and `onClick={() => {` and ends with the closing `</div>` after `<HandCard ... />` closes.

Replace the opening tag from:

```tsx
                <div
                  key={card.id}
                  onClick={() => {
```

to:

```tsx
                <div
                  key={card.id}
                  data-card-id={card.id}
                  onClick={() => {
```

(Leave the inner `onClick` callback body untouched.)

- [ ] **Step 3.2: Verify the file type-checks**

Run: `cd D:/work/hero-legend && pnpm --filter @hero-legend/web lint`
Expected: zero errors.

- [ ] **Step 3.3: Commit**

```bash
cd D:/work/hero-legend
git add apps/web/src/components/BattleBoard.tsx
git commit -m "feat(web): add data-card-id marker to player hand card wrappers"
```

---

## Task 4: Create FlyingCard.tsx component (animation primitive)

**Files:**
- Create: `apps/web/src/components/FlyingCard.tsx`

- [ ] **Step 4.1: Create the file**

```tsx
// apps/web/src/components/FlyingCard.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { HandCardVisual } from './HandCardVisual'
import type { Card } from '@hero-legend/shared-types'

export interface FlyingStage {
  from: { x: number; y: number }
  to: { x: number; y: number }
  durationMs: number
  endScale?: number
  endOpacity?: number
}

export interface FlyingCard {
  id: string
  card: Card
  stages: FlyingStage[]
  onDone: () => void
}

const EASE = [0.25, 0.1, 0.25, 1] as const

export function FlyingCard({ animation }: { animation: FlyingCard }) {
  const [stageIdx, setStageIdx] = useState(0)
  const stage = animation.stages[stageIdx]
  return (
    <motion.div
      initial={{ x: stage.from.x, y: stage.from.y, scale: 1, opacity: 1 }}
      animate={{
        x: stage.to.x,
        y: stage.to.y,
        scale: stage.endScale ?? 1,
        opacity: stage.endOpacity ?? 1,
      }}
      transition={{ duration: stage.durationMs / 1000, ease: EASE }}
      onAnimationComplete={() => {
        if (stageIdx < animation.stages.length - 1) {
          setStageIdx(stageIdx + 1)
        } else {
          animation.onDone()
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 2000,
        pointerEvents: 'none',
        transformOrigin: 'center center',
      }}
    >
      <HandCardVisual card={animation.card} />
    </motion.div>
  )
}
```

- [ ] **Step 4.2: Verify the file type-checks**

Run: `cd D:/work/hero-legend && pnpm --filter @hero-legend/web lint`
Expected: zero errors. (Note: `framer-motion` is already in deps; this is the first import but the type is bundled.)

- [ ] **Step 4.3: Commit**

```bash
cd D:/work/hero-legend
git add apps/web/src/components/FlyingCard.tsx
git commit -m "feat(web): add FlyingCard motion component with multi-stage support"
```

---

## Task 5: Create FlyingCardOverlay.tsx (Portal to body)

**Files:**
- Create: `apps/web/src/components/FlyingCardOverlay.tsx`

- [ ] **Step 5.1: Create the file**

```tsx
// apps/web/src/components/FlyingCardOverlay.tsx
import { createPortal } from 'react-dom'
import { useBattleStore } from '../stores/battleStore'
import { FlyingCard } from './FlyingCard'

export function FlyingCardOverlay() {
  const flyingCards = useBattleStore(s => s.flyingCards)
  return createPortal(
    <>
      {flyingCards.map(fc => (
        <FlyingCard key={fc.id} animation={fc} />
      ))}
    </>,
    document.body,
  )
}
```

- [ ] **Step 5.2: Verify the file type-checks**

Run: `cd D:/work/hero-legend && pnpm --filter @hero-legend/web lint`
Expected: an error like "Property 'flyingCards' does not exist on type 'BattleState'" — this is expected, the next task adds it. Move to Task 6.

---

## Task 6: Extend battleStore with FlyingCard type, state, helpers, event hooks, reset

**Files:**
- Modify: `apps/web/src/stores/battleStore.ts`
  - Line 3: extend type import (no change needed, `Card` already imported)
  - After line 5 (or near top of file): add `FlyingCard` type import
  - Inside `BattleState` interface (around line 7-278): add `flyingCards` field
  - After line 287 (after `getHeroName` helper): add 4 position helper functions
  - In the `useBattleStore` create block (line 369-471), add `flyingCards: []` to initial state
  - In `startBattle` reset block (line 477-572), add `flyingCards: []` to reset
  - In the event `handler` closure (line 1042-1135), add 5 new `if` blocks after the existing `equipment:unequip` tracking (after line 1134)

- [ ] **Step 6.1: Add `FlyingCard` type import from FlyingCard.tsx**

Replace the import block at line 1-3:

```ts
import { create } from 'zustand'
import { Game, type GameConfig, type Player } from '@hero-legend/game-engine'
import type { GameState, BattleResult, Card, GameEvent, GameEventType, HeroInstance, EquipmentSlot } from '@hero-legend/shared-types'
```

with:

```ts
import { create } from 'zustand'
import { Game, type GameConfig, type Player } from '@hero-legend/game-engine'
import type { GameState, BattleResult, Card, GameEvent, GameEventType, HeroInstance, EquipmentSlot } from '@hero-legend/shared-types'
import type { FlyingCard, FlyingStage } from '../components/FlyingCard'
```

- [ ] **Step 6.2: Add `flyingCards` field to BattleState interface**

After line 142 (`lastJudgeResult: ...`) and before the `startBattle` method signature (line 144), insert:

```ts
  // 卡牌飞行动画队列 (渲染层用)
  flyingCards: FlyingCard[]
  // 内部辅助: 入队一张飞行卡
  _queueFlyingCard: (req: { card: Card; sourceType: 'hand' | 'equipment'; sourceRef?: string; targetType: 'discard' | 'equipment' | 'hand'; targetHeroId?: string; targetSlot?: EquipmentSlot; fromHeroId?: string }) => void
```

- [ ] **Step 6.3: Add 4 position helper functions after the `getHeroName` function (after line 287)**

Append after the existing `getHeroName` function (line 282-287) and before `eventToLog` (line 289):

```ts
// 飞行卡动画: 位置查找 helpers
function rectCenter(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function findCenterPos(): { x: number; y: number } {
  const el = document.querySelector('[data-center-marker]') as HTMLElement | null
  if (el) return rectCenter(el.getBoundingClientRect())
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

function findSourcePos(heroId: string, sourceType: 'hand' | 'equipment', ref: string | undefined): { x: number; y: number } | null {
  if (sourceType === 'hand') {
    if (ref) {
      const el = document.querySelector(`[data-card-id="${ref}"]`) as HTMLElement | null
      if (el) return rectCenter(el.getBoundingClientRect())
    }
    // AI 手牌: 用 hero card 根的中心作代理
    const heroEl = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
    if (heroEl) return rectCenter(heroEl.getBoundingClientRect())
  } else {
    const el = document.querySelector(`[data-hero-id="${heroId}"][data-equip-slot="${ref}"]`) as HTMLElement | null
    if (el) return rectCenter(el.getBoundingClientRect())
  }
  return null
}

function findHandPos(heroId: string): { x: number; y: number } | null {
  const heroEl = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
  if (heroEl) return rectCenter(heroEl.getBoundingClientRect())
  return null
}
```

- [ ] **Step 6.4: Add `flyingCards: []` to initial state in `useBattleStore` create block**

In the initial state object starting at line 370, add the line `flyingCards: [],` and `_queueFlyingCard: () => {},` somewhere near the top of the state properties. Insert after the line `actionLog: [],` (line 374):

```ts
  flyingCards: [],
  _queueFlyingCard: () => {},
```

- [ ] **Step 6.5: Add `flyingCards: []` to `startBattle` reset block**

In the `startBattle` function (line 473), the `set({...})` reset call at line 477-572 should include `flyingCards: []` and reset the queue helper. Find the line `actionLog: [],` (around line 482 in the reset) and add the same line right after it:

```ts
      actionLog: [],
      flyingCards: [],
```

Also find `_queueFlyingCard: () => {},` is already set in initial state — no need to reset since it's a stable reference; skip.

- [ ] **Step 6.6: Add the `_queueFlyingCard` implementation in the create block (after all state fields, before the `startBattle` method)**

In the `useBattleStore` create block, immediately after the last state field initializers (around line 471, just before the `startBattle: async (config) => {` at line 473), add the `_queueFlyingCard` method:

```ts
  _queueFlyingCard: (req) => {
    const fromHeroId = req.fromHeroId ?? ''
    const from = findSourcePos(fromHeroId, req.sourceType, req.sourceRef)
    if (!from) return
    const center = findCenterPos()
    let to: { x: number; y: number }
    let stages: FlyingStage[]
    if (req.targetType === 'discard') {
      to = center
      stages = [{ from, to, durationMs: 500, endScale: 0.3, endOpacity: 0 }]
    } else if (req.targetType === 'equipment' && req.targetSlot) {
      const equipPos = (() => {
        const el = document.querySelector(`[data-hero-id="${req.targetHeroId}"][data-equip-slot="${req.targetSlot}"]`) as HTMLElement | null
        return el ? rectCenter(el.getBoundingClientRect()) : center
      })()
      stages = [
        { from, to: center, durationMs: 300 },
        { from: center, to: equipPos, durationMs: 500, endScale: 0.3, endOpacity: 0 },
      ]
    } else if (req.targetType === 'hand' && req.targetHeroId) {
      const handPos = findHandPos(req.targetHeroId) ?? center
      stages = [
        { from, to: center, durationMs: 300 },
        { from: center, to: handPos, durationMs: 500, endScale: 0.3, endOpacity: 0 },
      ]
    } else {
      to = center
      stages = [{ from, to, durationMs: 500, endScale: 0.3, endOpacity: 0 }]
    }
    const id = `fly-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    set(s => ({
      flyingCards: [...s.flyingCards, { id, card: req.card, stages, onDone: () => {
        set(cur => ({ flyingCards: cur.flyingCards.filter(fc => fc.id !== id) }))
      }}],
    }))
  },
```

- [ ] **Step 6.7: Add 5 event hooks in the existing `handler` closure (after line 1134)**

The `handler` closure is at line 1042. The last `if` block is the `equipment:unequip` tracking at line 1125-1134. After that block (and before the closing `}` of `handler` on line 1135), insert:

```ts
      // === 飞行卡动画钩子: 5 类事件 → 飞行卡 ===
      const queueFly = (req: { card: Card; fromHeroId: string; sourceType: 'hand' | 'equipment'; sourceRef?: string; targetType: 'discard' | 'equipment' | 'hand'; targetHeroId?: string; targetSlot?: EquipmentSlot }) => {
        get()._queueFlyingCard(req)
      }

      if (event.type === 'card:play' && event.data?.cardId) {
        const cardId = event.data.cardId as string
        const heroId = event.sourceHeroId
        if (heroId) {
          const hero = game.getPlayerById(heroId)
          let card: Card | undefined = hero?.getHand().find(c => c.id === cardId)
          if (!card) {
            for (const p of game.players) {
              for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
                const eq = p.getEquippedCard(slot)
                if (eq?.id === cardId) { card = eq; break }
              }
              if (card) break
            }
          }
          if (card) queueFly({ card, fromHeroId: heroId, sourceType: 'hand', sourceRef: cardId, targetType: 'discard' })
        }
      }

      if (event.type === 'equipment:equip' && event.data?.cardId && event.data?.slot) {
        const cardId = event.data.cardId as string
        const slot = (event.data as any).slot as EquipmentSlot
        const heroId = event.sourceHeroId
        if (heroId) {
          const hero = game.getPlayerById(heroId)
          const card = hero?.getEquippedCard(slot)
          if (card) queueFly({ card, fromHeroId: heroId, sourceType: 'hand', sourceRef: cardId, targetType: 'equipment', targetHeroId: heroId, targetSlot: slot })
        }
      }

      if (event.type === 'equipment:unequip' && event.data?.cardId && event.data?.slot) {
        const slot = (event.data as any).slot as EquipmentSlot
        const heroId = event.sourceHeroId
        if (heroId) {
          const hero = game.getPlayerById(heroId)
          let card: Card | undefined = hero?.getHand().find(c => c.id === (event.data as any).cardId)
          if (!card) {
            for (const p of game.players) {
              for (const s of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
                const eq = p.getEquippedCard(s)
                if (eq?.id === (event.data as any).cardId) { card = eq; break }
              }
              if (card) break
            }
          }
          if (card) queueFly({ card, fromHeroId: heroId, sourceType: 'equipment', sourceRef: slot, targetType: 'discard' })
        }
      }

      if (event.type === 'card:discard' && event.sourceHeroId) {
        const heroId = event.sourceHeroId
        const cardsData = (event.data as any)?.cards as string[] | undefined
        if (Array.isArray(cardsData)) {
          for (const cid of cardsData) {
            let card: Card | undefined
            for (const p of game.players) {
              const inHand = p.getHand().find(c => c.id === cid)
              if (inHand) { card = inHand; break }
              for (const s of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
                const eq = p.getEquippedCard(s)
                if (eq?.id === cid) { card = eq; break }
              }
              if (card) break
            }
            if (card) queueFly({ card, fromHeroId: heroId, sourceType: 'hand', sourceRef: cid, targetType: 'discard' })
          }
        }
      }

      if (event.type === 'card:gain' && (event.data as any)?.from && event.sourceHeroId) {
        const fromHeroId = (event.data as any).from as string
        const toHeroId = event.sourceHeroId
        const cardId = (event.data as any).cardId as string | undefined
        const cardsArr = (event.data as any)?.cards as string[] | undefined
        const cardIdsToAnimate = cardId ? [cardId] : (cardsArr ?? [])
        for (const cid of cardIdsToAnimate) {
          const toHero = game.getPlayerById(toHeroId)
          const card = toHero?.getHand().find(c => c.id === cid)
          if (card) queueFly({ card, fromHeroId: fromHeroId, sourceType: 'hand', sourceRef: cid, targetType: 'hand', targetHeroId: toHeroId })
        }
      }
```

- [ ] **Step 6.8: Verify the file type-checks**

Run: `cd D:/work/hero-legend && pnpm --filter @hero-legend/web lint`
Expected: zero errors. (The `FlyingCard` type is now defined and used; the `EquipmentSlot` import is already present.)

- [ ] **Step 6.9: Commit**

```bash
cd D:/work/hero-legend
git add apps/web/src/stores/battleStore.ts
git commit -m "feat(web): add FlyingCard state, position helpers, queueFlyingCard and 5 event hooks"
```

---

## Task 7: Modify Game.ts engine — emit equipment:unequip on death and add cards field to discard/gain

**Files:**
- Modify: `packages/game-engine/src/core/Game.ts:622-628` (death equipment loop), `:641` (诀别 card:gain), `:648` (death card:discard)

- [ ] **Step 7.1: Add `equipment:unequip` emit in the death equipment loop (lines 622-628)**

Replace:

```ts
    // 装备区
    for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
      const eq = victim.getEquippedCard(slot)
      if (eq) {
        victim.unequip(slot)
        allCards.push(eq)
      }
    }
```

with:

```ts
    // 装备区
    for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
      const eq = victim.getEquippedCard(slot)
      if (eq) {
        victim.unequip(slot)
        this.eventBus.emit({ type: 'equipment:unequip', sourceHeroId: victimId, data: { cardId: eq.id, slot } })
        allCards.push(eq)
      }
    }
```

- [ ] **Step 7.2: Add `cards: [id]` field to 诀别 `card:gain` (line 641)**

Replace:

```ts
          this.eventBus.emit({ type: 'card:gain', sourceHeroId: target.getId(), data: { count: allCards.length, reason: '诀别', from: victim.getId() } })
```

with:

```ts
          this.eventBus.emit({ type: 'card:gain', sourceHeroId: target.getId(), data: { count: allCards.length, reason: '诀别', from: victim.getId(), cards: allCards.map(c => c.id) } })
```

- [ ] **Step 7.3: Add `cards: [id]` field to death `card:discard` (line 648)**

Replace:

```ts
      this.eventBus.emit({ type: 'card:discard', sourceHeroId: victimId, data: { count: allCards.length, reason: 'death' } })
```

with:

```ts
      this.eventBus.emit({ type: 'card:discard', sourceHeroId: victimId, data: { count: allCards.length, reason: 'death', cards: allCards.map(c => c.id) } })
```

- [ ] **Step 7.4: Verify game-engine type-checks**

Run: `cd D:/work/hero-legend && pnpm --filter @hero-legend/game-engine lint`
Expected: zero errors. (Engine event payloads are `Record<string, any>` in shared-types, so adding new fields is type-compatible.)

- [ ] **Step 7.5: Rebuild game-engine dist (CLAUDE.md: required for web to see the changes)**

Run: `cd D:/work/hero-legend && npx turbo build --filter=@hero-legend/game-engine`
Expected: build completes successfully, `packages/game-engine/dist/core/Game.js` contains the new emit.

- [ ] **Step 7.6: Commit**

```bash
cd D:/work/hero-legend
git add packages/game-engine/src/core/Game.ts
git commit -m "feat(engine): emit equipment:unequip on death + add cards field to death/诀别 events"
```

---

## Task 8: Mount FlyingCardOverlay and add center marker in BattleBoard.tsx

**Files:**
- Modify: `apps/web/src/components/BattleBoard.tsx` (top imports + bottom JSX)

- [ ] **Step 8.1: Add the FlyingCardOverlay import**

At the top of `apps/web/src/components/BattleBoard.tsx`, find the import block (lines 1-8). Add a new import after `import { HandCard } from './HandCard'`:

```ts
import { HandCard } from './HandCard'
import { FlyingCardOverlay } from './FlyingCardOverlay'
```

- [ ] **Step 8.2: Add invisible center marker div + mount FlyingCardOverlay at the end of the component's return**

The BattleBoard component's return statement ends around line 2065 (the `</style>` block) and line 2066-2067 (the final `</div></div>`). Locate the final `</div>` of the outer container (line 2067) and insert the marker + overlay just before it. The closing JSX is:

```tsx
      <style>{`
        @keyframes judgePopup {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
      </div>
    </div>
  )
}
```

Replace with:

```tsx
      <style>{`
        @keyframes judgePopup {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
      {/* 中心 marker: 飞行卡的中心点定位参考 (1x1 不可见) */}
      <div data-center-marker style={{ position: 'fixed', top: '50%', left: '50%', width: '1px', height: '1px', pointerEvents: 'none', zIndex: -1 }} />
      {/* 飞行卡浮层: Portal 到 body, zIndex 2000 */}
      <FlyingCardOverlay />
      </div>
    </div>
  )
}
```

- [ ] **Step 8.3: Verify the file type-checks**

Run: `cd D:/work/hero-legend && pnpm --filter @hero-legend/web lint`
Expected: zero errors.

- [ ] **Step 8.4: Commit**

```bash
cd D:/work/hero-legend
git add apps/web/src/components/BattleBoard.tsx
git commit -m "feat(web): mount FlyingCardOverlay and add center marker in BattleBoard"
```

---

## Task 9: Final lint + visual smoke test

**Files:** none modified

- [ ] **Step 9.1: Run full web lint to catch any cross-file issues**

Run: `cd D:/work/hero-legend && pnpm --filter @hero-legend/web lint`
Expected: zero errors.

- [ ] **Step 9.2: Start dev servers (server + web) and manually verify per spec checklist**

Run in two terminals:
```bash
cd D:/work/hero-legend && pnpm --filter @hero-legend/server dev
```
```bash
cd D:/work/hero-legend && pnpm --filter @hero-legend/web dev
```

Open `http://localhost:5173`, start any battle, then walk through the spec checklist (`docs/superpowers/specs/2026-06-29-card-play-animation-design.md` "验证" section, line 432-457):

- [ ] 玩家用杀 → 看到飞行卡从手牌飞入中心淡出
- [ ] 玩家用药 → 同上
- [ ] 玩家用锦囊 (无中生有/决斗/万箭齐发) → 同上
- [ ] 玩家装备 (虎符) → 手牌→中心→装备区两段动画, 缩放淡出
- [ ] 玩家装备替换 (新装备顶掉旧) → 旧牌先飞出, 新牌再飞入
- [ ] 玩家回合末弃牌 → 飞入中心淡出
- [ ] AI 用杀 → 从 AI HeroBattleCard 飞出, 玩家能看到是啥牌
- [ ] AI 装备 → AI 卡→中心→AI 装备区
- [ ] AI 被 探囊取物/五谷丰登 → AI 卡飞向接收方
- [ ] AI 死亡 → 装备 + 手牌 (如果引擎支持) 全部飞入中心
- [ ] 跨场景连发 (出杀后接 决斗响应) → 动画独立不冲突
- [ ] 5 张以上同时飞 (万箭齐发弃多张) → 全部流畅
- [ ] 回归: 现有所有交互 (出牌/响应/弃牌/装备) 行为不变
- [ ] 回归: 起义多步骤交互 正常 (新组件不影响)
- [ ] 回归: 抽卡动画 正常 (新组件不影响)

If any check fails, fix and commit a fix-up patch before marking complete.

- [ ] **Step 9.3: Commit any fix-up patches (if any)**

```bash
cd D:/work/hero-legend
git add -A
git commit -m "fix(web): address animation smoke-test regressions"
```

---

## Acceptance Criteria

- All 8 tasks completed, all commits present in git log.
- `pnpm --filter @hero-legend/web lint` returns zero errors.
- `pnpm --filter @hero-legend/game-engine lint` returns zero errors.
- All 16 visual smoke-test items pass.
- 3 regression items (起义/抽卡/现有交互) still pass.
