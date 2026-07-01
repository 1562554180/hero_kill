# Animation Ready Gate — Design Spec

**Date**: 2026-07-01
**Status**: Draft, awaiting review

## 1. Problem

When a card is played in battle, the engine emits a `card:play` event that triggers a flying-card animation on the web side. The engine then immediately calls the next UI handler (e.g. `responseActionHandler` for 闪 response, `tanNangPickHandler` for 探囊取物 picker). Today these two things happen in parallel: the animation runs while the response/selection popup appears on top. The visual result is janky — the user sees the popup before the card has visually arrived, breaking the "play card → animation → response" reading order.

Specific cases the user reported:
- "I play 杀 on a target — the 闪 response popup should only appear after my kill card animation finishes."
- "Opponent plays 探囊取物 — the picker popup should only appear after the 探囊取物 animation finishes."

## 2. Goal

Every UI popup that results from a card play (responses, target selection, card picking, scheme picking) must wait for the card's flying animation to complete before being shown.

## 3. Design

### 3.1 High-level

Add an "animation ready gate" in the engine. Before invoking any UI-bound handler, the engine awaits an `awaitUIReady` callback. The web implements `awaitUIReady` to return a Promise that resolves when all in-flight `flyingCards` have finished animating. Web uses Zustand `subscribe` to detect when `flyingCards.length` transitions to 0 — event-driven, no polling.

### 3.2 Engine changes (`packages/game-engine/src/core/Game.ts`)

#### 3.2.1 `GameConfig` new field

```ts
awaitUIReady?: () => Promise<void>
```

Optional. If absent, the gate is a no-op (existing tests still pass).

#### 3.2.2 Private helper

```ts
private async awaitUI(): Promise<void> {
  if (this.config.awaitUIReady) {
    await this.config.awaitUIReady()
  }
}
```

#### 3.2.3 Call sites

Insert `await this.awaitUI()` immediately before each `await this.config.<handler>(...)` for the following handlers:

| Handler | File location (approx) | Purpose |
|---|---|---|
| `playerActionHandler` | `playerTurn` (play phase) | 出牌阶段,等前一回合动画结束再让玩家操作 |
| `responseActionHandler` | `executeKill`, `executeScheme`, `promptAoeResponse` | 闪/杀/无懈 响应 |
| `multiTargetHandler` | `playKillMulti` (侠胆) | 侠胆多选目标 |
| `dualCardHandler` | `playerUseLuYeQiang` | 芦叶枪选2张 |
| `luYeQiangTargetHandler` | `playerUseLuYeQiang` | 芦叶枪选杀目标 |
| `longLinPickHandler` | `executeLongLin` | 龙鳞刀选弃牌 |
| `jieDaoTargetHandler` | `playerPlayJieDao` step 1 | 借刀选武器持有者 |
| `jieDaoAttackTargetHandler` | `playerPlayJieDao` step 2 | 借刀选攻击目标 |
| `tanNangTargetHandler` | `playerPlayTanNang` | 探囊取物选目标 |
| `tanNangPickHandler` | `playerPlayTanNang` | 探囊取物选牌 |
| `wuguPickHandler` | `executeWuguFengdeng` | 五谷丰登选牌 |

Multiple call sites for the same handler (e.g. `responseActionHandler` is called from several engine methods) each get their own `awaitUI()` call. The 烽火狼烟 case relies on this: the engine calls `promptAoeResponse` per target, and each call individually awaits the gate.

### 3.3 Web changes (`apps/web/src/stores/battleStore.ts`)

In `startBattle`, the `GameConfig` object now includes:

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
  // Safety timeout: 5s. If animation system is stuck, game continues.
  setTimeout(() => { unsub?.(); resolve() }, 5000)
})
```

Notes:
- `useBattleStore.subscribe` is Zustand's vanilla subscription, available because the store is created with `create` (not `createWithEqualityFn`).
- The subscribe callback compares prev/next state to detect the 0 transition, not just "0 right now" (avoids resolving immediately if there were 0 cards to begin with — handled by the upfront check).
- Timeout 5s is intentionally short; if hit, the game continues without waiting. Better to be responsive than frozen.

The 11 web handlers (`responseActionHandler`, `tanNangTargetHandler`, etc.) do **not** change. The gate is centralized in the engine.

### 3.4 Data flow examples

**Player plays 杀 → target's 闪 response**
```
t=0     confirmPlay → engine receives action
t=0     engine.executeKill() → emit card:play
t=0     web queues fly animation (1.5s)
t=0     engine awaits responseActionHandler
t=0     engine.awaitUI() → awaitUIReady → subscribe to flyingCards
t=1500  flyingCards.length: 1 → 0 → subscribe callback fires
t=1500  resolve → engine proceeds
t=1500  responseActionHandler runs → set awaitingResponse phase
t=1500  UI shows 闪 prompt
```

**AI plays 探囊取物 → player picks card**
```
t=0     AI action → engine.emit card:play
t=0     web queues fly animation
t=0     engine awaits tanNangTargetHandler → awaitUI()
t=1500  fly done → tanNangTargetHandler runs → set selectTanNangTarget phase
t=??    player picks target → resolveTanNangTarget
t=??    engine awaits tanNangPickHandler → awaitUI() (no fly in flight, resolves immediately)
t=??    tanNangPickHandler runs → set selectTanNangCard phase
```

**烽火狼烟 multi-target (3 enemies)**
```
t=0     player plays 烽火狼烟 → engine.emit card:play → fly animation
t=1500  fly done → engine calls promptAoeResponse(target1)
        → responseActionHandler.awaitUI() → no fly in flight → runs immediately
        → set awaitingResponse for target1
t=??    player responds with 杀 → engine.emit card:play → fly animation
t=??    fly done → engine calls promptAoeResponse(target2)
        → responseActionHandler.awaitUI() → resolves → set awaitingResponse for target2
... (repeats for target3)
```

## 4. Error handling

- **Animation system stuck**: 5s safety timeout in `awaitUIReady`. After timeout the promise resolves and the game continues. No crash, just slightly off-sync.
- **Handler throws**: existing behavior — error propagates up. Gate does not change error path.
- **Race condition (engine calls 2 handlers in same microtask)**: each `awaitUI()` is independent. If 2 handlers are called in the same tick, the first resolves on subscribe (length→0), the second resolves immediately on its upfront check (length already 0).
- **No `awaitUIReady` provided (engine unit tests)**: `this.config.awaitUIReady` is undefined, `awaitUI()` becomes a no-op. Existing tests unaffected.

## 5. Testing

### 5.1 Engine unit test

`packages/game-engine/src/__tests__/animation-gate.test.ts`:
- Construct `Game` with `awaitUIReady` that resolves after a controlled number of "ticks"
- Drive a kill → dodge response sequence
- Assert: handler is not called until `awaitUIReady` resolves
- Assert: when `awaitUIReady` never resolves (test resolves it manually after a delay), the handler waits correctly

### 5.2 Manual QA (web)

Cover:
1. Player plays 杀 → 闪 response appears AFTER kill card finishes flying
2. AI plays 杀 → player 闪 prompt appears AFTER AI kill card finishes flying
3. Player plays 探囊取物 → target picker appears AFTER 探囊取物 finishes
4. AI plays 探囊取物 → player picker appears AFTER 探囊取物 finishes
5. Player plays 烽火狼烟 with 2 enemies → first 杀 response appears AFTER 烽火 animation, second AFTER the 杀 animation
6. Player plays 杀 with 借刀 → borrow + attack selection waits for animations
7. Equipment equip animation does NOT block subsequent handler calls (handler is for *card play*, not *equipment*)

## 6. Out of scope

- Directional line animation timing (already auto-clears after 1.1s, separate concern)
- Damage floater timing (already a separate overlay)
- Equipment equip animation (different code path, no handler involved)
- Cards that have no `card:play` event (none currently, but future-proof: if a card is played without animation, the gate trivially passes because `flyingCards.length === 0`)

## 7. Migration / rollout

1. Land the engine change (add `awaitUIReady` config + call sites). All existing engine tests pass (no-op when undefined).
2. Land the engine test for the gate itself.
3. Land the web change (`awaitUIReady` in `startBattle` config).
4. Manual QA on a real battle.
5. No DB migration, no API change, no breaking change for existing saves.
