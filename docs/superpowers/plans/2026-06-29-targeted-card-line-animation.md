# Targeted Card Line Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw a red directional line from attacker to target(s) for 1 second when any targeted card (杀/决斗/探囊取物/借刀杀人/釜底抽薪/火攻/顺手牵羊) or AoE card (南蛮入侵/万箭齐发) is played. Works for both player and AI actions. Runs in parallel with the existing flying-card animation.

**Architecture:** SVG `<line>` overlay portal-rendered to `document.body` at `zIndex 1500`. New `directionalLines` state slice in `battleStore`, populated by extending the existing `card:play` event handler. CSS keyframe drives `stroke-dasharray` draw-on (200ms) + `opacity` fade (800ms). Pure frontend — no engine changes.

**Tech Stack:** React 19, TypeScript, Zustand 5, CSS keyframes. No new dependencies.

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `apps/web/src/components/DirectionalLineOverlay.tsx` | NEW | SVG portal overlay rendering all active lines. |
| `apps/web/src/styles/global.css` | MODIFY | Append `@keyframes directional-line-draw` + `directional-line-fade` + `.directional-line` class. |
| `apps/web/src/components/BattleBoard.tsx` | MODIFY | Import + mount `<DirectionalLineOverlay />` next to `<FlyingCardOverlay />`. |
| `apps/web/src/stores/battleStore.ts` | MODIFY | Add `DirectionalLine` type, `directionalLines` state, `findHeroCenter` helper, enqueue + cleanup logic in `card:play` handler, reset in `startBattle`. |

**Total:** 1 new file, 3 modified, ~80 lines net.

---

## Task 1: Add CSS keyframe animation

**Files:**
- Modify: `apps/web/src/styles/global.css` (append at end of file)

- [ ] **Step 1.1: Append directional-line CSS at end of `global.css`**

Append this block as the LAST CSS in `apps/web/src/styles/global.css`:

```css
/* 指向性卡牌: 攻击者 → 目标 的红线动画 */
@keyframes directional-line-draw {
  0%   { stroke-dashoffset: 1000; opacity: 0; }
  15%  { opacity: 0.85; }
  100% { stroke-dashoffset: 0; opacity: 0.85; }
}
@keyframes directional-line-fade {
  0%, 70% { opacity: 0.85; }
  100%    { opacity: 0; }
}
.directional-line {
  stroke-dasharray: 1000;
  animation: directional-line-draw 200ms ease-out forwards,
             directional-line-fade 1000ms ease-out forwards;
  filter: drop-shadow(0 0 4px rgba(255, 82, 82, 0.6));
}
```

- [ ] **Step 1.2: Verify file ends correctly**

Run: `tail -20 apps/web/src/styles/global.css`
Expected: file ends with the closing `}` of `.directional-line`.

- [ ] **Step 1.3: Commit**

```bash
git add apps/web/src/styles/global.css
git commit -m "feat(web): add directional-line CSS keyframes"
```

---

## Task 2: Add state slice + helper + enqueue logic to battleStore

**Files:**
- Modify: `apps/web/src/stores/battleStore.ts`

- [ ] **Step 2.1: Locate `FlyingCard` type definition**

Run: `grep -n "flyingCards\|FlyingCard\|flying:" apps/web/src/stores/battleStore.ts | head -10`

Find the existing `FlyingCard` type declaration. It will be near other type declarations around line 270-290.

- [ ] **Step 2.2: Add `DirectionalLine` type after `FlyingCard` type**

Insert directly AFTER the closing of the `FlyingCard` type:

```ts
export type DirectionalLine = {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  cardName: string
  createdAt: number
}
```

- [ ] **Step 2.3: Add `directionalLines` to state interface**

Find the state interface (search for `flyingCards: FlyingCard[]`). In the SAME interface block, add:

```ts
  directionalLines: DirectionalLine[]
```

- [ ] **Step 2.4: Add `directionalLines: []` to initial state object**

Find the initial state object literal containing `flyingCards: []` (in `startBattle` or wherever the store is initialized). Add immediately after `flyingCards: []`:

```ts
    directionalLines: [],
```

- [ ] **Step 2.5: Add `findHeroCenter` helper**

Find the existing helpers `rectCenter`, `findCenterPos`, `findSourcePos`, `findHandPos` (~lines 296-330). Add a new helper below them:

```ts
  const findHeroCenter = (heroId: string): { x: number; y: number } | null => {
    const el = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
    return el ? rectCenter(el.getBoundingClientRect()) : null
  }
```

- [ ] **Step 2.6: Locate `card:play` event handler**

Run: `grep -n "'card:play'" apps/web/src/stores/battleStore.ts`

This finds the existing handler. Open that section.

- [ ] **Step 2.7: Verify AoE target field name in engine emit**

Run: `grep -n "targetHeroIds\|南蛮入侵\|万箭齐发" packages/game-engine/src/core/Game.ts | head -20`

Look for how AoE cards (南蛮入侵/万箭齐发) emit `card:play`. Specifically check what target info is in the event payload. Update Step 2.8 below based on what you find — the most likely candidates are `event.data.targetHeroIds` (array) or `event.targetHeroId` (single). Use whichever the engine actually emits. If neither exists, the engine may use `data.affectedHeroIds` — fall back to that.

- [ ] **Step 2.8: Insert enqueue logic at TOP of `card:play` handler**

Find the `if (et === 'card:play') {` (or equivalent) and insert this block as the FIRST statement inside, BEFORE any other logic in that branch:

```ts
      // 指向性卡牌: 画攻击线 (从 source 到 target(s))
      {
        const cardName = (event.data as any)?.cardName as string | undefined
        const sourceId = event.sourceHeroId
        const singleTargetId = event.targetHeroId
        const aoeTargets: string[] =
          ((event.data as any)?.targetHeroIds as string[] | undefined)
          ?? ((event.data as any)?.affectedHeroIds as string[] | undefined)
          ?? (singleTargetId ? [singleTargetId] : [])

        if (sourceId && aoeTargets.length > 0) {
          const from = findHeroCenter(sourceId)
          if (from) {
            const targets = aoeTargets
              .filter(tid => tid !== sourceId)
              .map(tid => findHeroCenter(tid))
              .filter((p): p is { x: number; y: number } => !!p)
            if (targets.length > 0) {
              const now = Date.now()
              const newLines: DirectionalLine[] = targets.map((p, i) => ({
                id: `${now}-${i}-${Math.random().toString(36).slice(2, 6)}`,
                fromX: from.x, fromY: from.y,
                toX: p.x, toY: p.y,
                cardName: cardName ?? '',
                createdAt: now,
              }))
              set(s => ({ directionalLines: [...s.directionalLines, ...newLines] }))
              setTimeout(() => {
                useBattleStore.setState(s => ({
                  directionalLines: s.directionalLines.filter(
                    l => !newLines.find(n => n.id === l.id)
                  ),
                }))
              }, 1100)
            }
          }
        }
      }
```

NOTE: If Step 2.7 revealed a different AoE field name, adjust the `aoeTargets` definition accordingly.

- [ ] **Step 2.9: Reset `directionalLines` on `startBattle` / `resetBattle`**

Find the function that resets store state when a new battle starts (search for `flyingCards: []` initialization — that same site likely also resets other state). In the same `set({...})` block, add:

```ts
      directionalLines: [],
```

- [ ] **Step 2.10: Type-check**

Run: `pnpm --filter @hero-legend/web exec tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 2.11: Commit**

```bash
git add apps/web/src/stores/battleStore.ts
git commit -m "feat(web): add directional line state + enqueue on card:play"
```

---

## Task 3: Create DirectionalLineOverlay component

**Files:**
- Create: `apps/web/src/components/DirectionalLineOverlay.tsx`

- [ ] **Step 3.1: Create file with SVG portal overlay**

Create `apps/web/src/components/DirectionalLineOverlay.tsx`:

```tsx
import { createPortal } from 'react-dom'
import { useBattleStore } from '../stores/battleStore'

export function DirectionalLineOverlay() {
  const lines = useBattleStore(s => s.directionalLines)
  if (lines.length === 0) return null
  return createPortal(
    <svg
      data-directional-overlay
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1500,
      }}
    >
      <defs>
        <marker
          id="directional-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff5252" />
        </marker>
      </defs>
      {lines.map(l => (
        <line
          key={l.id}
          className="directional-line"
          x1={l.fromX}
          y1={l.fromY}
          x2={l.toX}
          y2={l.toY}
          stroke="#ff5252"
          strokeWidth={3}
          opacity={0.85}
          markerEnd="url(#directional-arrow)"
        />
      ))}
    </svg>,
    document.body,
  )
}
```

- [ ] **Step 3.2: Type-check**

Run: `pnpm --filter @hero-legend/web exec tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3.3: Commit**

```bash
git add apps/web/src/components/DirectionalLineOverlay.tsx
git commit -m "feat(web): add DirectionalLineOverlay SVG portal component"
```

---

## Task 4: Mount overlay in BattleBoard

**Files:**
- Modify: `apps/web/src/components/BattleBoard.tsx`

- [ ] **Step 4.1: Find FlyingCardOverlay import and usage**

Run: `grep -n "FlyingCardOverlay" apps/web/src/components/BattleBoard.tsx`

Two matches expected: one import line near top (~line 7), one usage line near bottom (~line 2104).

- [ ] **Step 4.2: Add import after the FlyingCardOverlay import**

Insert directly after the `import { FlyingCardOverlay } from './FlyingCardOverlay'` line:

```tsx
import { DirectionalLineOverlay } from './DirectionalLineOverlay'
```

- [ ] **Step 4.3: Add `<DirectionalLineOverlay />` next to `<FlyingCardOverlay />`**

In the JSX near line 2104, immediately after the `<FlyingCardOverlay />` element, add:

```tsx
      <DirectionalLineOverlay />
```

- [ ] **Step 4.4: Type-check**

Run: `pnpm --filter @hero-legend/web exec tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 4.5: Commit**

```bash
git add apps/web/src/components/BattleBoard.tsx
git commit -m "feat(web): mount DirectionalLineOverlay next to FlyingCardOverlay"
```

---

## Task 5: Manual smoke test in browser

**Files:** none

- [ ] **Step 5.1: Start dev server**

Run: `pnpm --filter @hero-legend/server dev` (terminal 1) and `pnpm --filter @hero-legend/web dev` (terminal 2).

- [ ] **Step 5.2: Open a battle and play 杀**

Open http://localhost:5173, start or join a battle. On your turn, drag/click a 杀 card and confirm target.

Expected: a red line draws from your hero card center to the target hero card center over ~200ms, then fades over ~800ms. The existing flying card animation still runs to discard pile in parallel.

- [ ] **Step 5.3: Test 决斗 and 探囊取物**

Play a 决斗 and a 探囊取物 card. Each should draw a red line from attacker to target for ~1s.

- [ ] **Step 5.4: Test AoE (南蛮入侵 or 万箭齐发 if available)**

If you have access to an AoE card, play it. Expected: multiple red lines draw simultaneously from attacker to each defender, all fading together.

- [ ] **Step 5.5: Test AI → player direction**

Wait for an AI turn where they play a 杀 or 决斗 against you. Expected: red line draws from the AI hero to your hero card center.

- [ ] **Step 5.6: Test rapid plays**

Play 2 targeted cards in quick succession. Expected: 2 lines visible at once (or sequentially depending on timing), each independent. No console errors.

- [ ] **Step 5.7: Confirm no regressions on flying card animation**

While the red line appears, verify the flying card (going to discard pile) still animates correctly. Both should be visible simultaneously without z-index conflicts.

---

## Self-Review Notes

**Spec coverage:**
- Single-target cards (杀/决斗/探囊取物/借刀杀人/釜底抽薪/火攻/顺手牵羊) → Task 2 step 2.8 + Task 5 steps 5.2-5.3
- AoE cards (南蛮入侵/万箭齐发) → Task 2 step 2.7 + Task 5 step 5.4
- Player + AI both trigger → Task 2 step 2.8 (no role filter) + Task 5 step 5.5
- SVG `<line>` + `<marker>` arrow → Task 3
- CSS keyframe draw-on + fade → Task 1
- Portal to body, zIndex 1500 → Task 3
- 1 second duration, auto-cleanup → Task 1 (1000ms total) + Task 2 step 2.8 (1100ms cleanup timer)
- Reset on battle start → Task 2 step 2.9
- Self-target filter → Task 2 step 2.8 (`filter(tid => tid !== sourceId)`)
- Missing DOM skip → Task 2 step 2.8 (`filter(...!!p)`)

**No placeholders found.** All file paths, code blocks, and commands are explicit.

**Type consistency:** `DirectionalLine` type defined in Task 2, used in same task's state and enqueue logic, consumed in Task 3 component. `findHeroCenter` defined in Task 2 step 2.5, used in Task 2 step 2.8. `directionalLines` state slice initialized in Task 2 step 2.4 and reset in Task 2 step 2.9, consumed in Task 3. All consistent.