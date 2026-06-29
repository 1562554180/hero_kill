# 卡牌飞行动画 — Spec

**日期**: 2026-06-29
**会话**: 卡牌使用 / 装备穿戴 / 装备移出 交互动画
**状态**: 设计已确认, 待用户审阅后进入实施规划

## 目标

给卡牌操作加上视觉飞行轨迹, 让玩家 (和旁观者) 直观看到每张牌的流向:

- **手牌使用** (杀/药/锦囊/响应): 牌从手牌飞入屏幕中心, 淡出消失
- **装备穿戴**: 牌从手牌飞入中心, 继续飞到角色装备区, 缩放淡出
- **装备移出** (绝击/释权/烽火/驭人/被火攻/受伤害/濒死/替换): 牌从装备区飞入中心, 淡出
- **跨人取牌** (探囊取物/五谷丰登/釜底抽薪): 牌从源手牌或源装备区飞向接收方手牌 (经中心中转)
- **强制弃牌** (回合末/受伤害/决斗失败/响应弃): 牌从手牌或装备区飞入中心, 淡出
- **覆盖范围**: 玩家 + AI 全部动画 (让玩家能看到 AI 行为)

预期效果: 战斗过程中每张牌的去向一目了然, 减少"刚才 AI 用的是啥牌?"的疑惑, 提升整体观感.

## 背景

当前卡牌交互:
- 玩家点击手牌 → 出牌或装备 (引擎处理, 状态变化, React 重渲染)
- AI 回合: 引擎通过 playerActionHandler 让 AI 决策, 玩家只看到日志文字
- 装备变动: 玩家看到 hero card 上的图标变了, 但没有视觉过渡
- 弃牌: 牌直接从手牌列表消失

整个过程无视觉飞行, 玩家只能靠日志文字知道发生了什么, 体验不直观. `framer-motion` 已在 `apps/web/package.json` 的 dependencies 里 (第 19 行), 但目前未用于卡牌动画. `DrawAnimation.tsx` 是抽卡时的 3D 翻牌动画, 用 CSS transition 实现的, 也不涉及运动轨迹.

## 范围

### 包含

- 5 类引擎事件 → 飞行卡动画: `card:play` / `card:discard` / `card:gain` / `equipment:equip` / `equipment:unequip`
- 多段动画 (1 段: 直接飞入中心淡出; 2 段: 经中心中转到目标)
- 玩家 + AI 全部覆盖
- DOM data-* 属性 + querySelector 定位源/目标
- `position: fixed` 浮层 + framer-motion 实现
- Portal 渲染到 body, 避免被 BattleBoard overflow 裁剪
- 边缘降级: 找不到 DOM 跳过, 不阻塞游戏逻辑
- 多卡并行 (死亡弃全套装备 / 五谷丰登) — 数组模式

### 不包含 (YAGNI)

- 卡牌旋转 / 翻转 / 粒子 / 光效 / 音效
- 判定区卡的移动 (顺手牵羊的临时区等) — 用户没要求
- AI 手牌区"亮起"或"思考中"指示 — 动画飞走已表明 AI 在行动
- 写 vitest 单元测试 (CLAUDE.md 约定)
- 改 game-engine 核心逻辑 (skill/damage/turn) — 只改 3 个事件 emit (向后兼容, 加字段)

## 架构

### 数据流

```
引擎 emit (card:play / equipment:equip / ...)
  ↓
battleStore event handler 同步执行:
  1. querySelector 找源 DOM (handler 在 React 重渲染前, DOM 还在)
  2. getBoundingClientRect() 拿源/中心/目标坐标
  3. push FlyingCard 到 flyingCards 数组
  ↓
handler 调 set({ gameState, playerHand, ... })
  ↓
React 重渲染 (手牌列表移除已出牌, 装备区更新)
  ↓
FlyingCardOverlay (Portal 到 body, zIndex 2000) 渲染
  ↓
framer-motion 动画 (1 段或 2 段)
  ↓
onAnimationComplete 从数组移除
```

### 关键时序保证

事件 handler 同步执行时, React 还没重渲染. 此时 querySelector 仍能定位到旧的 DOM 节点. 这是本方案能正确捕获源位置的核心.

## State Shape

### battleStore 新增

```ts
type FlyingStage = {
  from: { x: number; y: number }  // viewport 坐标
  to: { x: number; y: number }
  durationMs: number              // 该段时长
  endScale?: number               // 段末缩放 (默认 1)
  endOpacity?: number             // 段末透明度 (默认 1)
}

type FlyingCard = {
  id: string                      // 唯一 id (nanoid)
  card: Card                      // 完整 Card 对象
  stages: FlyingStage[]           // 1 段或 2 段
  onDone: () => void              // 全部段完成后调 (从数组移除)
}

// state
flyingCards: FlyingCard[]         // 数组支持并行
```

### 5 类事件 → 飞行模式

| 事件 | 源位置 | 目标 | 段数 |
|------|--------|------|------|
| `card:play` (data.cardId) | 玩家: `[data-card-id="X"]`; AI: `[data-hero-id="Y"]` 中心 | 中心 | 1 段, 500ms, endScale:0.3, endOpacity:0 |
| `equipment:equip` (data.cardId, slot) | 玩家/AI: `[data-card-id="X"]` 源手牌 | `[data-equip-slot="..."]` 目标装备槽 | 2 段: 中心 300ms → 装备槽 500ms, endScale:0.3, endOpacity:0 |
| `equipment:unequip` (data.cardId, slot) | `[data-hero-id="Y"][data-equip-slot="..."]` 装备槽 | 中心 | 1 段, 500ms, endScale:0.3, endOpacity:0 |
| `card:discard` (data.cards 数组 / 兜底扫手牌 diff) | 每张: 玩家真实 HandCard DOM / AI HeroBattleCard 中心 | 中心 | 1 段, 500ms, endScale:0.3, endOpacity:0 |
| `card:gain` (data.from 探囊取物/五谷丰登) | `[data-card-id="X"]` 源 (data.from) | 接收方手牌区 | 2 段: 中心 300ms → 接收方 500ms, endScale:0.3, endOpacity:0 |

### 位置查找优先级

1. 中心点: `[data-center-marker]` 不可见 div 的 bounding rect, 兜底 `window.innerWidth/2, window.innerHeight/2`
2. 玩家手牌: 真实 `[data-card-id]` 节点
3. AI 手牌: `[data-hero-id]` HeroBattleCard 根的中心 (因为 AI 手牌不显示)
4. 玩家/AI 装备: 真实 `[data-equip-slot]` 节点

## DOM data-* 属性

| 元素 | 属性 | 位置 |
|------|------|------|
| 玩家手牌包装 | `data-card-id={card.id}` | BattleBoard playerHand.map |
| 玩家装备槽 (4 个) | `data-hero-id={player.id}` + `data-equip-slot={slot}` | BattleBoard 玩家装备区 |
| AI/敌方 hero 根 | `data-hero-id={hero.id}` | HeroBattleCard 根 div |
| AI/敌方装备槽 (4 个) | `data-hero-id={hero.id}` + `data-equip-slot={slot}` | HeroBattleCard 装备区 |
| 中心 marker | `data-center-marker` | BattleBoard 末尾, fixed 居中, 1x1 不可见 |

slot 字符串值: `weapon` / `armor` / `attackMount` / `defenseMount` (与 `EquipmentSlot` 联合类型对齐, 跟 HeroBattleCard 第 181-186 行一致)

## 新增组件

### `HandCardVisual.tsx`

从 `HandCard.tsx` 复制视觉 (主题背景, 花色数字, 主字, SVG/PNG 图标, 装饰边框), 删除所有 onClick / disabled / canUse / 选牌状态逻辑. 纯展示, 永远 100% 不透明. 用于飞行卡的视觉克隆. 现有 `HandCard.tsx` 一行不动.

### `FlyingCard.tsx`

```tsx
function FlyingCard({ animation }: { animation: FlyingCard }) {
  const [stageIdx, setStageIdx] = useState(0)
  const stage = animation.stages[stageIdx]
  return (
    <motion.div
      initial={{ x: stage.from.x, y: stage.from.y, scale: 1, opacity: 1 }}
      animate={{
        x: stage.to.x, y: stage.to.y,
        scale: stage.endScale ?? 1,
        opacity: stage.endOpacity ?? 1,
      }}
      transition={{ duration: stage.durationMs / 1000, ease: [0.25, 0.1, 0.25, 1] }}
      onAnimationComplete={() => {
        if (stageIdx < animation.stages.length - 1) {
          setStageIdx(stageIdx + 1)
        } else {
          animation.onDone()
        }
      }}
      style={{
        position: 'fixed', top: 0, left: 0,
        zIndex: 2000, pointerEvents: 'none',
        transformOrigin: 'center center',
      }}
    >
      <HandCardVisual card={animation.card} />
    </motion.div>
  )
}
```

### `FlyingCardOverlay.tsx`

```tsx
function FlyingCardOverlay() {
  const flyingCards = useBattleStore(s => s.flyingCards)
  return createPortal(
    <>
      {flyingCards.map(fc => <FlyingCard key={fc.id} animation={fc} />)}
    </>,
    document.body,
  )
}
```

## 文件改动清单

| 文件 | 改动 | 行数估计 |
|------|------|----------|
| `apps/web/src/components/BattleBoard.tsx` | + import FlyingCardOverlay; + center marker; + 5 处 data-* 属性 (手牌包装 + 4 装备槽); 末尾 `<FlyingCardOverlay />` | +20 |
| `apps/web/src/components/HeroBattleCard.tsx` | + 1 个 data-hero-id 根; + 4 个 data-equip-slot 装备槽 (第 252-253 行 span 加 data 属性) | +5 |
| `apps/web/src/stores/battleStore.ts` | + FlyingCard type; + flyingCards state; + findPos helpers; + queueFlyingCard; + 5 个事件钩子; + startBattle reset | +150 |
| `apps/web/src/components/HandCardVisual.tsx` | 新建, 复制 HandCard 视觉 (第 1-252 行) | +250 |
| `apps/web/src/components/FlyingCard.tsx` | 新建 | +40 |
| `apps/web/src/components/FlyingCardOverlay.tsx` | 新建 | +15 |
| `packages/game-engine/src/core/Game.ts` | + 死亡时为每件装备 emit `equipment:unequip` (line 622-628 内); + 死亡 card:discard data 加 `cards: [id]` (line 648); + 诀别 card:gain data 加 `cards: [id]` (line 641) | +6 |

合计 7 个文件, 约 +486 行. game-engine 改动小且向后兼容 (只 data 多带一个字段), 但需要按 CLAUDE.md 重新 build dist (`npx turbo build --filter=@hero-legend/game-engine`).

## 事件钩子代码骨架

```ts
// battleStore event handler 新增 (在现有 1068-1082 行附近)
if (event.type === 'card:play' && event.data?.cardId) {
  const cardId = event.data.cardId as string
  const heroId = event.sourceHeroId
  if (heroId) {
    // card:play 事件触发时, 引擎已将该牌从手牌移走
    // 查 hero 的手牌 / 装备 / 通过 (game.players 全员扫一遍兜底)
    const hero = game.getPlayerById(heroId)
    let card = hero?.getHand().find(c => c.id === cardId)
    if (!card) {
      for (const p of game.players) {
        for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
          const eq = p.getEquippedCard(slot)
          if (eq?.id === cardId) { card = eq; break }
        }
        if (card) break
      }
    }
    if (card) {
      queueFlyingCard({ card, heroId, sourceType: 'hand', sourceRef: cardId, targetType: 'discard' })
    }
  }
}

if (event.type === 'equipment:equip' && event.data?.cardId && event.data?.slot) {
  const cardId = event.data.cardId as string
  const slot = event.data.slot as 'weapon' | 'armor' | 'attackMount' | 'defenseMount'
  const heroId = event.sourceHeroId
  if (heroId) {
    // equipment:equip 触发时, 装备已放入槽
    const hero = game.getPlayerById(heroId)
    const card = hero?.getEquippedCard(slot)
    if (card) {
      queueFlyingCard({
        card, heroId, sourceType: 'hand', sourceRef: cardId,
        targetType: 'equipment', targetHeroId: heroId, targetSlot: slot,
      })
    }
  }
}

if (event.type === 'equipment:unequip' && event.data?.cardId && event.data?.slot) {
  const slot = event.data.slot as 'weapon' | 'armor' | 'attackMount' | 'defenseMount'
  const heroId = event.sourceHeroId
  if (heroId) {
    // equipment:unequip 触发时, 装备已从槽中移除
    // 查源 hero 的手牌 (装备可能从装备区到手里 — 释权场景) 或其他 hero 的装备
    const hero = game.getPlayerById(heroId)
    let card = hero?.getHand().find(c => c.id === event.data.cardId)
    if (!card) {
      for (const p of game.players) {
        for (const s of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
          const eq = p.getEquippedCard(s)
          if (eq?.id === event.data.cardId) { card = eq; break }
        }
        if (card) break
      }
    }
    if (card) {
      queueFlyingCard({
        card, heroId, sourceType: 'equipment', sourceRef: slot,
        targetType: 'discard',
      })
    }
  }
}

if (event.type === 'card:discard' && event.sourceHeroId) {
  const heroId = event.sourceHeroId
  const cardsData = event.data?.cards as string[] | undefined
  if (Array.isArray(cardsData)) {
    for (const cid of cardsData) {
      // card:discard 时, 牌已从源移除. 在所有 hero 的手牌 + 装备里找
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
      if (card) {
        queueFlyingCard({ card, heroId, sourceType: 'hand', sourceRef: cid, targetType: 'discard' })
      }
    }
  }
}

if (event.type === 'card:gain' && event.data?.from) {
  const fromHeroId = event.data.from as string
  const toHeroId = event.sourceHeroId
  const cardId = event.data.cardId as string | undefined
  const cardsArr = event.data?.cards as string[] | undefined  // 诀别场景用
  const cardIdsToAnimate = cardId ? [cardId] : (cardsArr ?? [])
  if (fromHeroId && toHeroId) {
    const fromHero = game.getPlayerById(fromHeroId)
    for (const cid of cardIdsToAnimate) {
      // card:gain 时牌已到 toHero 的手牌. 在 toHero 的当前手牌里找
      const toHero = game.getPlayerById(toHeroId)
      const card = toHero?.getHand().find(c => c.id === cid) as any
      if (card) {
        queueFlyingCard({
          card, heroId: fromHeroId, sourceType: 'hand', sourceRef: cid,
          targetType: 'hand', targetHeroId: toHeroId,
        })
      }
    }
  }
}
```

> 注: 死亡/诀别事件本来没 card list, 需要小改 game-engine 加上. 见下方 "engine 改动" 一节.

## 位置查找 helpers

```ts
function findSourcePos(heroId: string, sourceType: 'hand' | 'equipment', ref?: string) {
  if (sourceType === 'hand') {
    if (ref) {
      const el = document.querySelector(`[data-card-id="${ref}"]`) as HTMLElement | null
      if (el) return rectCenter(el.getBoundingClientRect())
    }
    // AI 手牌: 用 hero card 根
    const heroEl = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
    if (heroEl) return rectCenter(heroEl.getBoundingClientRect())
  } else {
    const el = document.querySelector(
      `[data-hero-id="${heroId}"][data-equip-slot="${ref}"]`
    ) as HTMLElement | null
    if (el) return rectCenter(el.getBoundingClientRect())
  }
  return null
}

function findEquipPos(heroId: string, slot: string) {
  const el = document.querySelector(
    `[data-hero-id="${heroId}"][data-equip-slot="${slot}"]`
  ) as HTMLElement | null
  return el ? rectCenter(el.getBoundingClientRect()) : null
}

function findHandPos(heroId: string) {
  // 玩家: 第一张手牌位置
  // AI: hero card 根
  if (heroId === useBattleStore.getState().game?.getPlayer().getId()) {
    const firstCard = document.querySelector(`[data-card-id]`) as HTMLElement | null
    if (firstCard) return rectCenter(firstCard.getBoundingClientRect())
  }
  const heroEl = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
  return heroEl ? rectCenter(heroEl.getBoundingClientRect()) : null
}

function findCenterPos() {
  const el = document.querySelector('[data-center-marker]') as HTMLElement | null
  return el ? rectCenter(el.getBoundingClientRect()) : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

function rectCenter(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}
```

## Engine 改动 (`packages/game-engine/src/core/Game.ts`)

3 处小改, 总共 +6 行. 仅给事件 `data` 多带字段, 现有订阅者不受影响.

**改动 1**: 死亡处理 (line 622-628), 为每件装备 emit `equipment:unequip`

```ts
// 原代码 (line 622-628):
for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
  const eq = victim.getEquippedCard(slot)
  if (eq) {
    victim.unequip(slot)
    allCards.push(eq)
  }
}

// 改为:
for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
  const eq = victim.getEquippedCard(slot)
  if (eq) {
    victim.unequip(slot)
    this.eventBus.emit({ type: 'equipment:unequip', sourceHeroId: victimId, data: { cardId: eq.id, slot } })
    allCards.push(eq)
  }
}
```

**改动 2**: 死亡 card:discard (line 648) 加 `cards: [id]`

```ts
// 原:
this.eventBus.emit({ type: 'card:discard', sourceHeroId: victimId, data: { count: allCards.length, reason: 'death' } })
// 改为:
this.eventBus.emit({ type: 'card:discard', sourceHeroId: victimId, data: { count: allCards.length, reason: 'death', cards: allCards.map(c => c.id) } })
```

**改动 3**: 诀别 card:gain (line 641) 加 `cards: [id]`

```ts
// 原:
this.eventBus.emit({ type: 'card:gain', sourceHeroId: target.getId(), data: { count: allCards.length, reason: '诀别', from: victim.getId() } })
// 改为:
this.eventBus.emit({ type: 'card:gain', sourceHeroId: target.getId(), data: { count: allCards.length, reason: '诀别', from: victim.getId(), cards: allCards.map(c => c.id) } })
```

**完成后必须**: `npx turbo build --filter=@hero-legend/game-engine` 重新 build dist, 然后 web app 才能看到新事件字段.

## 边缘 / 降级

| 情况 | 处理 |
|------|------|
| `querySelector` 找不到源 DOM | 静默跳过, 不入队, 不影响游戏 |
| 事件 `data` 缺 cardId (如死亡 count-only) | 跳过 |
| 装备替换 (旧 unequip + 新 equip) | 2 张并行, framer-motion 自动处理 |
| 浏览器 tab 不可见 | framer-motion 用 rAF, 自动暂停/续上 |
| React StrictMode 双渲染 | handler 同步调 set 一次, 数组只 push 一次 |
| BattleBoard 卸载 (战斗结束) | startBattle 时 `set({ flyingCards: [] })` 清空 |
| 长时间未完成 (理论不会) | FlyingCardOverlay 入队时记 createdAt, 渲染前检查 > 3 秒强制移除 |

## 性能

- 单场景最坏 8-10 张并行 (死亡弃全套装备)
- 每张 FlyingCard: 1 motion.div + HandCardVisual (约 20 子元素)
- 8 × 20 = 160 额外 DOM 节点, React 渲染 < 1ms
- framer-motion 用 transform/opacity, GPU 加速, 60fps 无压力

## 验证 (CLAUDE.md 约定: 不写 vitest)

**类型层**
```bash
pnpm --filter @hero-legend/web lint
```
必须通过 (TypeScript 类型检查).

**实机冒烟** (启动 dev server 后, 浏览器手测)
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

**回归**
- [ ] 现有所有交互 (出牌/响应/弃牌/装备) 行为不变
- [ ] 起义多步骤交互 正常 (新组件不影响)
- [ ] 抽卡动画 正常 (新组件不影响)

## 关键风险与缓解

| 风险 | 缓解 |
|------|------|
| handler 中 querySelector 拿到的是已被卸载的元素 | React 重渲染是 handler 返回后才发生; handler 同步期间 DOM 不变. 但若 StrictMode 触发两次, 第二次 handler 拿不到源 — 这种情况 card 已在 hand 中被引擎移走, 跳过即可. |
| AI 手牌代理位置 ≠ 真实手牌位置 | 接受. 用户看到"从 AI 飞出一张牌"即可, 不强求手牌本身位置. |
| 装备槽很小 (18px), 卡 72×110 飞过去尺寸反差 | endScale:0.3 在第二段末缩到 ~22×33, 视觉上"装入"小槽, 自然消失 |
| card:gain 事件 data 缺 cardId | 兜底扫 data.cards 数组; 若还没有, 跳过该条 (不影响游戏) |
| 多张飞行卡叠加视觉混乱 (死亡弃全套) | 每张独立 framer-motion 动画, 时间错开 (死亡通常顺序 emit) 不会重叠; 极端情况同时 8+ 张, 用 transform/opacity 渲染, 不卡 |
| framer-motion 库体积 | 已在 deps, 无新增体积; HandCardVisual 复用现有样式 (无新 SVG) |
| 改了 `HandCard.tsx` 误伤现有交互 | 设计上 HandCard.tsx 一行不动, 新组件 HandCardVisual 独立 |
