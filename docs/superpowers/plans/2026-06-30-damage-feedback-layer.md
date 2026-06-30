# Damage Feedback Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 英雄杀-style damage feedback layer to the battle UI — floating damage/heal numbers, hero card border flash on hit, smooth HP cell color transitions, and a red-border pulse during the 濒死 (dying) phase.

**Architecture:** Portal-rendered `<DamageFloaterOverlay>` (zIndex 1700) follows the existing `FlyingCardOverlay` / `DirectionalLineOverlay` pattern. New `damageFloaters` slice in `battleStore` with a 120ms aggregation window so multi-hit damage to one hero in a single attack chain shows as one merged floater. `HeroBattleCard` gets local border-flash on HP drop + a `hero-card-pulse` class while dying. Pure frontend — no engine changes.

**Tech Stack:** React 19, TypeScript, Zustand 5, CSS keyframes. No new dependencies. No tests per project convention (memory: `feedback_no_tests_on_fixes.md`).

**Spec:** `docs/superpowers/specs/2026-06-30-damage-feedback-layer-design.md`

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `apps/web/src/styles/global.css` | MODIFY | Append floater + flash + pulse + hp-cell CSS |
| `apps/web/src/stores/battleStore.ts` | MODIFY | Add `DamageFloater` type, `damageFloaters` state, `removeFloater` action, `pushFloater` helper, wire into damage/heal events, reset in `_resetBattleState` |
| `apps/web/src/components/DamageFloaterOverlay.tsx` | NEW | Portal overlay rendering each floater with RAF hero-position tracking |
| `apps/web/src/components/BattleBoard.tsx` | MODIFY | Import + mount `<DamageFloaterOverlay />`; derive `isDying`/`isDead` from store; pass as props to `HeroBattleCard` |
| `apps/web/src/components/HeroBattleCard.tsx` | MODIFY | Accept `isDying`/`isDead` props; track `prevHp` and toggle `hero-card-flash`; apply `hero-card-pulse` class when dying; add `hp-cell` class to HP cells |

**Total:** 1 new file, 4 modified, ~157 lines net.

---

## Task 1: Add CSS keyframes and classes

**Files:**
- Modify: `apps/web/src/styles/global.css` (append at end of file)

- [ ] **Step 1.1: Append damage-feedback CSS at end of `global.css`**

Open `apps/web/src/styles/global.css` and append the following block as the LAST CSS block in the file (after the existing `.directional-line` rule):

```css
/* 伤害/治疗飘字 */
@keyframes damage-floater-rise {
  0%   { opacity: 0; transform: translate(-50%, 0) scale(0.6); }
  20%  { opacity: 1; transform: translate(-50%, -8px) scale(1.1); }
  100% { opacity: 0; transform: translate(-50%, -50px) scale(1); }
}
.floater {
  position: fixed;
  transform: translate(-50%, 0);
  font-size: 32px;
  font-weight: 900;
  text-shadow: 0 0 4px rgba(0,0,0,0.8), 2px 2px 0 #000;
  pointer-events: none;
  animation: damage-floater-rise 600ms ease-out forwards;
  white-space: nowrap;
}
.floater-damage { color: #ff3333; }
.floater-heal   { color: #44dd66; }

/* 武将牌受击红闪 */
@keyframes hero-card-flash {
  0%, 100% { box-shadow: 0 0 0 rgba(255, 50, 50, 0); }
  50%      { box-shadow: 0 0 24px rgba(255, 50, 50, 0.9); }
}
.hero-card-flash { animation: hero-card-flash 150ms ease-out; }

/* 濒死红边脉动 */
@keyframes hero-card-pulse {
  0%, 100% { border-color: #ff2222; box-shadow: 0 0 8px rgba(255, 34, 34, 0.5); }
  50%      { border-color: #ff6666; box-shadow: 0 0 20px rgba(255, 34, 34, 0.9); }
}
.hero-card-pulse { animation: hero-card-pulse 1s ease-in-out infinite; }

/* 血格过渡 */
.hp-cell {
  transition: background-color 0.3s ease-out;
}
```

- [ ] **Step 1.2: Verify file ends correctly**

Run: `tail -40 apps/web/src/styles/global.css`
Expected: the file ends with the closing `}` of `.hp-cell { ... }`.

- [ ] **Step 1.3: Commit**

```bash
git add apps/web/src/styles/global.css
git commit -m "feat(web): add damage-floater / hero-card-flash / pulse / hp-cell CSS"
```

---

## Task 2: Add state, action, helper, and event wiring to battleStore

**Files:**
- Modify: `apps/web/src/stores/battleStore.ts`

This task adds: `DamageFloater` type, `damageFloaters` state, `removeFloater` action, `pushFloater` helper (closure inside the event handler scope), wiring into `damage:deal` / `damage:receive` / `heal` events, and reset in `_resetBattleState`.

- [ ] **Step 2.1: Add `DamageFloater` type next to `DirectionalLine`**

In `apps/web/src/stores/battleStore.ts`, locate the existing `DirectionalLine` type definition (around line 288-296, just after the `BattleStore` interface). Insert the new type IMMEDIATELY AFTER the `DirectionalLine` type closing brace:

```ts
export type DamageFloater = {
  id: string
  heroId: string
  amount: number      // 正数=治疗, 负数=伤害
  type: 'damage' | 'heal'
  createdAt: number
}
```

- [ ] **Step 2.2: Add `damageFloaters` slice and `removeFloater` action to the BattleStore interface**

In the `BattleStore` interface (around line 280-286), find the line `directionalLines: DirectionalLine[]`. Add the following two lines IMMEDIATELY AFTER it:

```ts
  // 伤害/治疗飘字队列 (渲染层用)
  damageFloaters: DamageFloater[]
  removeFloater: (id: string) => void
```

- [ ] **Step 2.3: Add initial state value**

Find the line `directionalLines: [],` in the initial state (around line 534). Add the following line IMMEDIATELY AFTER it:

```ts
      damageFloaters: [],
```

- [ ] **Step 2.4: Add `removeFloater` action implementation**

Find the spot in the store implementation that mirrors the interface order — search for the action that handles `directionalLines` cleanup (around line 676 area inside `_resetBattleState`, or wherever individual actions are defined). Add the `removeFloater` action right after the state slice declarations. If you cannot find a clean insertion point, add it directly after the initial state block (the `create<BattleStore>(set => ({ ... }))` opening). The exact location should match where `_queueFlyingCard` is defined for consistency.

Add this block:

```ts
      removeFloater: (id: string) => set(s => ({
        damageFloaters: s.damageFloaters.filter(f => f.id !== id),
      })),
```

- [ ] **Step 2.5: Reset `damageFloaters` in `_resetBattleState`**

Find the `_resetBattleState` function (around line 668-676). Locate the line `directionalLines: [],` inside it. Add the following line IMMEDIATELY AFTER it:

```ts
        damageFloaters: [],
```

- [ ] **Step 2.6: Add `pushFloater` helper inside the event handler closure**

In `apps/web/src/stores/battleStore.ts`, find the `startBattle` function (around line 1150) where the `handler` function is defined that handles engine events. We need to define `pushFloater` inside the `handler` closure (or at function scope before `handler`) so it can call `set`.

Insert the helper INSIDE the `startBattle` function body, BEFORE the `handler` function definition. Use this exact code:

```ts
      const AGGREGATE_WINDOW_MS = 120

      const pushFloater = (entry: { heroId: string; amount: number; type: 'damage' | 'heal' }) => {
        const now = Date.now()
        set(s => {
          const existing = s.damageFloaters.find(
            f => f.heroId === entry.heroId
              && f.type === entry.type
              && now - f.createdAt < AGGREGATE_WINDOW_MS
          )
          if (existing) {
            return {
              damageFloaters: s.damageFloaters.map(f =>
                f.id === existing.id ? { ...f, amount: f.amount + entry.amount, createdAt: now } : f
              ),
            }
          }
          return {
            damageFloaters: [
              ...s.damageFloaters,
              { id: `${now}-${Math.random().toString(36).slice(2, 6)}`, createdAt: now, ...entry },
            ],
          }
        })
      }
```

- [ ] **Step 2.7: Wire `pushFloater` into damage and heal events**

In the same `handler` function inside `startBattle`, find the existing log-message `switch` block that handles damage/heal events for battle log (around line 364-368, just BEFORE the `gameState` sync block at line 1177-1191). Add a new `switch` block RIGHT AFTER the log-message switch and BEFORE the `gameState` sync `if` statement.

Find the location by searching for the comment `// 关键事件触发时同步 gameState + playerHand`. Insert this block immediately BEFORE that comment:

```ts
      // 飘字入队 (伤害/治疗)
      if (event.type === 'damage:deal' || event.type === 'damage:receive') {
        if (event.targetHeroId) {
          const dmg = (event.data as any)?.damage as number | undefined
          if (typeof dmg === 'number' && dmg > 0) {
            pushFloater({ heroId: event.targetHeroId, amount: -dmg, type: 'damage' })
          }
        }
      } else if (event.type === 'heal') {
        if (event.targetHeroId) {
          const amt = (event.data as any)?.amount as number | undefined
          if (typeof amt === 'number' && amt > 0) {
            pushFloater({ heroId: event.targetHeroId, amount: amt, type: 'heal' })
          }
        }
      }
```

- [ ] **Step 2.8: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0, no type errors.

- [ ] **Step 2.9: Commit**

```bash
git add apps/web/src/stores/battleStore.ts
git commit -m "feat(web): add damageFloaters state + pushFloater helper + removeFloater action"
```

---

## Task 3: Create DamageFloaterOverlay component

**Files:**
- Create: `apps/web/src/components/DamageFloaterOverlay.tsx`

- [ ] **Step 3.1: Create the new file**

Create `apps/web/src/components/DamageFloaterOverlay.tsx` with this exact content:

```tsx
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBattleStore } from '../stores/battleStore'

export function DamageFloaterOverlay() {
  const floaters = useBattleStore(s => s.damageFloaters)
  const remove = useBattleStore(s => s.removeFloater)
  if (floaters.length === 0) return null
  return createPortal(
    <div data-floater-overlay style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1700 }}>
      {floaters.map(f => (
        <Floater key={f.id} entry={f} onDone={() => remove(f.id)} />
      ))}
    </div>,
    document.body,
  )
}

function Floater({ entry, onDone }: {
  entry: { id: string; heroId: string; amount: number; type: 'damage' | 'heal' }
  onDone: () => void
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = document.querySelector(`[data-hero-id="${entry.heroId}"]`) as HTMLElement | null
      if (el) {
        const r = el.getBoundingClientRect()
        setPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [entry.heroId])

  if (!pos) return null
  return (
    <div
      className={entry.type === 'heal' ? 'floater floater-heal' : 'floater floater-damage'}
      style={{ left: pos.x, top: pos.y - 40 }}
      onAnimationEnd={onDone}
    >
      {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
    </div>
  )
}
```

- [ ] **Step 3.2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0, no type errors.

- [ ] **Step 3.3: Commit**

```bash
git add apps/web/src/components/DamageFloaterOverlay.tsx
git commit -m "feat(web): add DamageFloaterOverlay portal component"
```

---

## Task 4: BattleBoard mount + isDying/isDead derivation

**Files:**
- Modify: `apps/web/src/components/BattleBoard.tsx`

- [ ] **Step 4.1: Import the new overlay**

In `apps/web/src/components/BattleBoard.tsx`, find the line that imports `DirectionalLineOverlay` (around line 8). Add the new import RIGHT AFTER it:

```tsx
import { DamageFloaterOverlay } from './DamageFloaterOverlay'
```

- [ ] **Step 4.2: Mount the overlay**

Find the JSX block that mounts `<FlyingCardOverlay />` and `<DirectionalLineOverlay />` (around line 2105-2106). Add `<DamageFloaterOverlay />` IMMEDIATELY AFTER `<DirectionalLineOverlay />`:

```tsx
      <DamageFloaterOverlay />
```

- [ ] **Step 4.3: Subscribe to `dyingRescuePrompt` and derive `isDying`/`isDead` per hero**

Locate the function or block where BattleBoard renders each `<HeroBattleCard>` (search for the JSX `<HeroBattleCard` usage in `BattleBoard.tsx`). In that scope, add a subscription to `dyingRescuePrompt`:

Find the existing `useBattleStore` subscriptions at the top of the rendering component (search for `useBattleStore(`). Add this subscription near them:

```tsx
  const dyingTargetId = useBattleStore(s => s.dyingRescuePrompt?.targetId ?? null)
```

Now find the `map` / loop that creates each `<HeroBattleCard>`. For each hero, compute and pass `isDying` and `isDead` props:

```tsx
          const isDying = hero.currentHp === 0 && dyingTargetId === hero.id
          const isDead  = hero.currentHp <= 0 && !isDying
```

In the `<HeroBattleCard ... />` JSX, add these two props:

```tsx
            isDying={isDying}
            isDead={isDead}
```

If `HeroBattleCard` does not currently accept these props, that's fine — TypeScript will flag them and you'll fix the interface in Task 5.

- [ ] **Step 4.4: Verify TypeScript reports the expected `HeroBattleCard` prop errors**

Run: `cd apps/web && npx tsc --noEmit`
Expected: errors ONLY about `isDying` / `isDead` not existing on `HeroBattleCard` props. These will be fixed in Task 5.

- [ ] **Step 4.5: Commit**

```bash
git add apps/web/src/components/BattleBoard.tsx
git commit -m "feat(web): mount DamageFloaterOverlay + derive isDying/isDead per hero"
```

---

## Task 5: HeroBattleCard accepts isDying/isDead props + flash + pulse + hp-cell

**Files:**
- Modify: `apps/web/src/components/HeroBattleCard.tsx`

- [ ] **Step 5.1: Update props interface**

In `apps/web/src/components/HeroBattleCard.tsx`, find the `HeroBattleCardProps` interface or the component's destructured props (around line 30-45). Add `isDying` and `isDead` as optional boolean props:

```tsx
  isDying?: boolean
  isDead?: boolean
```

If the props interface uses inline destructuring instead of a named interface, add the props to the destructured `React.FC` or function signature with default values (`isDying = false, isDead = false`).

- [ ] **Step 5.2: Add useRef + useEffect imports and flash state**

At the top of the file, find the existing imports. Add `useEffect` and `useRef` to the `react` import if not already present:

```tsx
import React, { useEffect, useRef, useState } from 'react'
```

If `useState` is already imported, just add `useEffect, useRef`.

Inside the component body, AFTER the existing destructuring (around line 45, after `const { hero: config, currentHp, maxHp, role, instance } = hero`), add:

```tsx
  const [flash, setFlash] = useState(false)
  const prevHpRef = useRef(currentHp)

  useEffect(() => {
    const prev = prevHpRef.current
    if (currentHp < prev) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 150)
      prevHpRef.current = currentHp
      return () => clearTimeout(t)
    }
    prevHpRef.current = currentHp
  }, [currentHp])
```

- [ ] **Step 5.3: Apply `hero-card-pulse` and `hero-card-flash` classes to the root div**

Find the root `<div>` element of the hero card (around line 75, the one with `data-hero-id={hero.hero.id}` and the inline `style={{...}}` block). In its `style` object's existing `transition` line, append the new pulse-related properties.

REPLACE this line in the `style` object:

```tsx
        transition: 'border-color 0.2s, box-shadow 0.2s, opacity 0.2s',
```

WITH:

```tsx
        transition: 'border-color 0.2s, box-shadow 0.2s, opacity 0.2s',
        borderColor: (isDying || flash) ? '#ff3333' : undefined,
```

(The borderColor override only takes effect when the `hero-card-flash` or `hero-card-pulse` animation is running; CSS animation will paint the box-shadow regardless.)

Now, find the `className` of this root div (if it has no `className` attribute, add one). REPLACE the root div's opening tag:

```tsx
    <div
      data-hero-id={hero.hero.id}
      onClick={isSelectable ? onClick : undefined}
```

WITH:

```tsx
    <div
      className={[isDying && 'hero-card-pulse', flash && 'hero-card-flash'].filter(Boolean).join(' ') || undefined}
      data-hero-id={hero.hero.id}
      onClick={isSelectable ? onClick : undefined}
```

- [ ] **Step 5.4: Add `hp-cell` class to HP cell divs**

Find the HP cell rendering block (around line 196-202). Locate the `<div key={i} style={{ ... background: i < currentHp ? '#8b0000' : '#3a3a3a' ... }} />` inside `Array.from({ length: maxHp }).map((_, i) => (`. REPLACE the opening `<div key={i}`:

WITH:

```tsx
            <div key={i} className="hp-cell" style={{
```

- [ ] **Step 5.5: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0, no type errors.

- [ ] **Step 5.6: Commit**

```bash
git add apps/web/src/components/HeroBattleCard.tsx
git commit -m "feat(web): HeroBattleCard accepts isDying/isDead, adds flash+pulse+hp-cell"
```

---

## Task 6: Final build verification

**Files:** (no changes)

- [ ] **Step 6.1: Build the web app**

Run: `pnpm --filter @hero-legend/web build`
Expected: build succeeds with no errors.

- [ ] **Step 6.2: (Optional) Manual smoke test**

If a dev server is running, open `http://localhost:5173`, start a battle, and trigger:
1. AI 杀 player → red "-1" floater above player card + brief red border flash on player card
2. Player 桃 self → green "+1" floater + HP cell smooth recovery
3. Pile damage to one hero in <120ms → merged floater (e.g. "-2" not "-1 -1")
4. Reduce hero HP to 0 → red border pulse begins (濒死)
5. 出桃 to rescue → pulse stops, green "+1" floater

If the dev server is not running, skip this step and proceed to commit.

- [ ] **Step 6.3: Final commit (only if any verification artifacts were touched)**

If no source files changed since Task 5's commit, skip this commit. Otherwise:

```bash
git status
# If any uncommitted changes:
git add <changed files>
git commit -m "chore: damage-feedback-layer verification"
```

---

## Self-Review Notes

- **Spec coverage:** ✓ Floater (Task 3 + 2.6 + 2.7), border flash (Task 5.2 + 5.3), hp-cell transition (Task 5.4), 濒死 pulse (Task 5.3 + 4.3), death preserved (Task 5.3 via `isDead` prop, no change to existing 阵亡 overlay), reset (Task 2.5), aggregation (Task 2.6).
- **Type consistency:** `DamageFloater`, `damageFloaters`, `removeFloater`, `pushFloater`, `isDying`, `isDead`, `hero-card-pulse`, `hero-card-flash`, `hp-cell`, `floater-damage`, `floater-heal`, `damage-floater-rise`, `hero-card-flash` (keyframes), `hero-card-pulse` (keyframes) — all match across tasks.
- **No placeholders:** All code blocks are complete; no "TODO" / "TBD" / "implement later".
- **No tests added:** Per user feedback memory `feedback_no_tests_on_fixes.md`. Build verification via `tsc --noEmit` and `pnpm build`.