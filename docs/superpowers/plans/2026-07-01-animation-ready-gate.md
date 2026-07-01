# Animation Ready Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all UI popups (闪 response, 探囊取物 picker, 借刀 step picker, 五谷丰登 picker, etc.) wait for the originating card's flying animation to complete before showing, via an `awaitUIReady` gate in the engine + a Zustand-subscribe-based resolver in the web store.

**Architecture:** Engine gets a new `awaitUIReady?: () => Promise<void>` config field. Before each UI-bound handler call (`responseActionHandler`, `multiTargetHandler`, `dualCardHandler`, `luYeQiangTargetHandler`, `longLinPickHandler`, `jieDaoTargetHandler`, `jieDaoAttackTargetHandler`, `tanNangTargetHandler`, `tanNangPickHandler`, `wuguPickHandler`, `playerActionHandler`), the engine awaits the gate. Web implements the gate using `useBattleStore.subscribe` to detect when `flyingCards.length` transitions to 0, plus a 5s safety timeout. Event-driven, 0 polling.

**Tech Stack:** TypeScript, Zustand, game-engine (EventBus, playerActionHandler pattern)

**User constraints (from memory):**
- Don't write tests for fixes/features — only verify with `npx tsc` type-check
- After `packages/game-engine/src` changes, run `npx tsc` to rebuild dist so web app sees updates

---

## File Structure

| File | Change |
|---|---|
| `packages/game-engine/src/core/Game.ts` | Add `awaitUIReady` to `GameConfig`, add private `awaitUI()` method, add `await this.awaitUI()` before 11 handler call sites |
| `apps/web/src/stores/battleStore.ts` | Implement `awaitUIReady` in the `GameConfig` object constructed inside `startBattle` |

No new files. No new tests (per user memory `feedback_no_tests_on_fixes.md`).

---

## Task 1: Engine — add `awaitUIReady` to `GameConfig` and `awaitUI()` private method

**Files:**
- Modify: `packages/game-engine/src/core/Game.ts:9-50` (GameConfig interface, add `awaitUIReady?: () => Promise<void>`)
- Modify: `packages/game-engine/src/core/Game.ts:111-170` (add `awaitUI()` private method next to `isAoJianActive`)

- [ ] **Step 1: Add `awaitUIReady` field to `GameConfig`**

Open `packages/game-engine/src/core/Game.ts`. Find the `GameConfig` interface (around line 9). Add the new field at the end of the interface:

```ts
  /** UI 动画就绪门控: web 端返回的 Promise 在 flyingCards 全部完成后 resolve */
  awaitUIReady?: () => Promise<void>
```

- [ ] **Step 2: Add `awaitUI()` private method**

Find the `isAoJianActive` method (around line 163). Immediately after it, add:

```ts
  /** 调 UI handler 前的动画就绪闸门 — 等 web 端 flyingCards 清空 */
  private async awaitUI(): Promise<void> {
    if (this.config.awaitUIReady) {
      await this.config.awaitUIReady()
    }
  }
```

- [ ] **Step 3: Type-check engine**

```bash
cd packages/game-engine && npx tsc --noEmit
```

Expected: exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
cd packages/game-engine && npx tsc
cd ../..
git add packages/game-engine/src/core/Game.ts packages/game-engine/dist
git commit -m "feat(game-engine): add awaitUIReady gate + awaitUI() helper"
```

---

## Task 2: Engine — wire `awaitUI()` into `playerActionHandler` call

**Files:**
- Modify: `packages/game-engine/src/core/Game.ts:735` (in `playerTurn` play phase, before `await this.config.playerActionHandler(...)`)

- [ ] **Step 1: Add `await this.awaitUI()` before `playerActionHandler` call**

Find line 735:
```ts
      if (player.getRole() === 'player' && this.config.playerActionHandler) {
        await this.config.playerActionHandler(this, player)
```

Change to:
```ts
      if (player.getRole() === 'player' && this.config.playerActionHandler) {
        await this.awaitUI()
        await this.config.playerActionHandler(this, player)
```

- [ ] **Step 2: Type-check engine**

```bash
cd packages/game-engine && npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd packages/game-engine && npx tsc
cd ../..
git add packages/game-engine/src/core/Game.ts packages/game-engine/dist
git commit -m "feat(game-engine): gate playerActionHandler with awaitUI"
```

---

## Task 3: Engine — wire `awaitUI()` into `responseActionHandler` calls

**Files:**
- Modify: `packages/game-engine/src/core/Game.ts:1118` (`await this.config.responseActionHandler(this, defender, 'dodge', ...)` in `executeKill`)
- Modify: `packages/game-engine/src/core/Game.ts:1151` (`await this.config.responseActionHandler(this, victim, 'dodge', ...)` in `executeKill` second branch)
- Modify: `packages/game-engine/src/core/Game.ts:1551` (`await this.config.responseActionHandler(this, player, handlerType, ...)` in `promptAoeResponse`)

- [ ] **Step 1: Add gate before each `responseActionHandler` call (3 sites)**

For each of the 3 call sites, prepend `await this.awaitUI()`. Example pattern (apply to all 3):

Before:
```ts
      const cardId = await this.config.responseActionHandler(this, defender, 'dodge', { sourceHeroId: source.getId(), targetHeroId: defender.getId() })
```

After:
```ts
      await this.awaitUI()
      const cardId = await this.config.responseActionHandler(this, defender, 'dodge', { sourceHeroId: source.getId(), targetHeroId: defender.getId() })
```

Apply the same pattern to line 1151 and line 1551.

- [ ] **Step 2: Type-check engine**

```bash
cd packages/game-engine && npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd packages/game-engine && npx tsc
cd ../..
git add packages/game-engine/src/core/Game.ts packages/game-engine/dist
git commit -m "feat(game-engine): gate responseActionHandler with awaitUI (3 sites)"
```

---

## Task 4: Engine — wire `awaitUI()` into scheme/kill-auxiliary handlers (8 sites)

**Files:**
- Modify: `packages/game-engine/src/core/Game.ts` — gate these handlers:
  - `multiTargetHandler` (in `playKillMulti`)
  - `dualCardHandler` (in `playerUseLuYeQiang`)
  - `luYeQiangTargetHandler` (in `playerUseLuYeQiang`)
  - `longLinPickHandler` (in `executeLongLin`)
  - `jieDaoTargetHandler` (in `playerPlayJieDao`)
  - `jieDaoAttackTargetHandler` (in `playerPlayJieDao`)
  - `tanNangTargetHandler` (in `playerPlayTanNang`)
  - `tanNangPickHandler` (in `playerPlayTanNang`)
  - `wuguPickHandler` (in `executeWuguFengdeng`)

- [ ] **Step 1: Locate each call site using `grep`**

```bash
grep -n "this.config.\(multiTargetHandler\|dualCardHandler\|luYeQiangTargetHandler\|longLinPickHandler\|jieDaoTargetHandler\|jieDaoAttackTargetHandler\|tanNangTargetHandler\|tanNangPickHandler\|wuguPickHandler\)" packages/game-engine/src/core/Game.ts
```

Expected: 9 matching lines (one per handler).

- [ ] **Step 2: Add `await this.awaitUI()` before each of the 9 call sites**

For each call site that looks like:
```ts
      const x = await this.config.<handlerName>(this, ...)
```

Insert `await this.awaitUI()` on the line before. Example for `multiTargetHandler`:

Before:
```ts
      const targetIds = await this.config.multiTargetHandler(this, player, candidates)
```

After:
```ts
      await this.awaitUI()
      const targetIds = await this.config.multiTargetHandler(this, player, candidates)
```

Apply to all 9 sites: `multiTargetHandler`, `dualCardHandler`, `luYeQiangTargetHandler`, `longLinPickHandler`, `jieDaoTargetHandler`, `jieDaoAttackTargetHandler`, `tanNangTargetHandler`, `tanNangPickHandler`, `wuguPickHandler`.

- [ ] **Step 3: Type-check engine**

```bash
cd packages/game-engine && npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd packages/game-engine && npx tsc
cd ../..
git add packages/game-engine/src/core/Game.ts packages/game-engine/dist
git commit -m "feat(game-engine): gate 9 scheme/kill-auxiliary handlers with awaitUI"
```

---

## Task 5: Web — implement `awaitUIReady` in `startBattle` config

**Files:**
- Modify: `apps/web/src/stores/battleStore.ts:715-720` (in the `GameConfig` object constructed inside `startBattle`, after `playerActionHandler` block, add `awaitUIReady` field)

- [ ] **Step 1: Read the current end of the `startBattle` GameConfig to find the right insertion point**

```bash
grep -n "playerActionHandler: async" apps/web/src/stores/battleStore.ts
```

Find the line and identify the closing `},` of the `playerActionHandler` arrow body (it's the last handler in the config, so the next sibling is the closing `}` of the config object).

- [ ] **Step 2: Add `awaitUIReady` field to the config object**

Right after the closing `},` of `playerActionHandler` (and before the closing `}` of the config), add:

```ts
      awaitUIReady: () => new Promise<void>(resolve => {
        const state = useBattleStore.getState()
        if (state.flyingCards.length === 0) {
          resolve()
          return
        }
        let unsub: (() => void) | null = null
        unsub = useBattleStore.subscribe((s, prev) => {
          if (s.flyingCards.length === 0 && prev.flyingCards.length > 0) {
            unsub?.()
            resolve()
          }
        })
        // 安全超时: 5s. 动画系统卡住时游戏继续, 不至于冻结.
        setTimeout(() => { unsub?.(); resolve() }, 5000)
      })
    }
```

- [ ] **Step 3: Type-check web app**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd ../..
git add apps/web/src/stores/battleStore.ts
git commit -m "feat(web): implement awaitUIReady via Zustand subscribe + 5s safety timeout"
```

---

## Task 6: Manual QA — verify the gated interactions

**No file changes.** Manually test these scenarios in a running web app:

- [ ] **Step 1: Player plays 杀 → target's 闪 response appears AFTER kill card animation**
  - Setup: Player 装备 无 武器, distance to enemy = 1, 玩家手牌有 杀, 敌方手牌有 闪
  - Action: Player plays 杀 on enemy → click target → confirm
  - Expected: 杀 card flies from hand → center → discard (1.5s) → THEN 闪 response prompt appears
  - Pass if: 闪 prompt only appears after the kill card has finished its 1.5s animation

- [ ] **Step 2: AI plays 杀 → player 闪 response appears AFTER AI's kill animation**
  - Setup: AI's turn, AI has 杀 in hand, player has 闪
  - Action: Wait for AI's turn → AI plays 杀 on player
  - Expected: AI's 杀 card flies → THEN player 闪 prompt appears

- [ ] **Step 3: Player plays 探囊取物 on enemy → picker appears AFTER 探囊取物 animation**
  - Setup: Player 手牌有 探囊取物, 敌方 has at least 1 card
  - Action: Player plays 探囊取物 → select target → confirm
  - Expected: 探囊取物 flies (1.5s) → THEN target picker (select card from target's hand/equipment/judge)

- [ ] **Step 4: AI plays 探囊取物 on player → player picker appears AFTER animation**
  - Setup: AI has 探囊取物
  - Action: AI plays 探囊取物 on player
  - Expected: AI's 探囊取物 flies → THEN player picker

- [ ] **Step 5: Player plays 烽火狼烟 with 2 enemies → each target's 出杀 prompt appears AFTER previous 杀 animation**
  - Setup: 3-player game, 2 enemies both have 杀 in hand
  - Action: Player plays 烽火狼烟
  - Expected sequence:
    1. 烽火狼烟 flies (1.5s)
    2. target1 出杀 prompt appears
    3. Player clicks 杀 → target1's 杀 flies (1.5s)
    4. target2 出杀 prompt appears
    5. Player clicks 杀 → target2's 杀 flies (1.5s)
    6. Done

- [ ] **Step 6: 借刀 (借刀杀人) — both step pickers wait for animations**
  - Setup: Player has 借刀杀人, 1 enemy has weapon + 杀, another enemy is in range
  - Action: Player plays 借刀杀人
  - Expected: After each step's animation completes, the next picker appears

- [ ] **Step 7: 五谷丰登 — picker appears AFTER animation**
  - Setup: 3-player game, player has 五谷丰登
  - Action: Player plays 五谷丰登
  - Expected: 五谷丰登 flies → THEN first picker (player picks first)

- [ ] **Step 8: 5s safety timeout — if animation system hangs, game continues**
  - Optional: Manually inject a hang (e.g., set `flyingCards` to never reach 0 in devtools) and confirm the gate times out at 5s and the game continues.

- [ ] **Step 9: Commit QA notes (if any findings)**

```bash
git commit --allow-empty -m "qa: animation ready gate verified end-to-end"
```

---

## Self-Review

**Spec coverage:**
- [x] Section 3.2.1 `GameConfig` new field → Task 1
- [x] Section 3.2.2 Private helper `awaitUI()` → Task 1
- [x] Section 3.2.3 Call sites — 11 handlers gated → Task 2, 3, 4
- [x] Section 3.3 Web `awaitUIReady` implementation → Task 5
- [x] Section 5 Testing (manual QA) → Task 6
- [x] Section 7 Migration / rollout order → Tasks ordered 1→2→3→4→5→6

**Placeholder scan:** No TBD/TODO/"implement later"/"similar to Task N" found. Every code step shows full code.

**Type consistency:** `awaitUIReady?: () => Promise<void>` is the same signature in Task 1 (engine interface) and Task 5 (web impl). The method name `awaitUI()` is consistent across Tasks 1-4.

**User constraints respected:**
- No test tasks (per `feedback_no_tests_on_fixes.md`)
- `npx tsc` rebuild step in every engine change (per `feedback_rebuild_dist.md`)
- High-performance approach: Zustand `subscribe` (event-driven, 0 polling) per `feedback_high_performance_default.md`
