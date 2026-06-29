# 指向性卡牌 — 攻击线动画 Spec

**日期**: 2026-06-29
**会话**: 杀/决斗/探囊取物等指向性卡牌使用时的可视化反馈
**状态**: 设计已确认, 待用户审阅后进入实施规划

## 目标

当玩家或 AI 使用指向性卡牌（杀/决斗/探囊取物/借刀杀人/釜底抽薪/火攻/顺手牵羊）以及 AoE 卡牌（南蛮入侵/万箭齐发）时, 在攻击者与目标之间画一条红色直线, 持续 1 秒后消失. 直观传达"这张牌的流向", 与已有的飞牌动画（飞向弃牌堆）配合, 强化"谁对谁做了什么"的视觉表达.

## 背景

现有动画:
- **飞牌动画** (`FlyingCardOverlay`, zIndex 2000): 卡牌从手牌或装备区飞出, 落到屏幕中心或弃牌堆, framer-motion 实现. 该动画目前不体现"指向谁", 杀/决斗等指向性牌最后都飞向 discard 堆, 与药/装备看上去一样, 玩家难以一眼分辨"这是一张指向性牌".
- **判定区动画** (`fuse-flicker` / `lock-toggle`): 角色右上角的小图标, 与本次需求无关.
- **基础设施**: `battleStore.ts` 已订阅所有引擎事件 (`startBattle` 内 `game.eventBus.on(et, handler)`, ~第 1313 行); 通过 `document.querySelector('[data-hero-id="..."]')` + `getBoundingClientRect` 获取坐标; 已存在 `rectCenter` / `findCenterPos` / `findHandPos` 等辅助函数.

## 范围

### 包含

- 单目标卡: 杀/决斗/探囊取物/借刀杀人/釜底抽薪/火攻/顺手牵羊 — 1 条线
- AoE 卡: 南蛮入侵/万箭齐发 — 从攻击者向每个目标各画 1 条线, 同时出现
- 玩家 + AI 都触发 (任何 `card:play` 事件只要有 sourceHeroId + targetHeroId(s))
- SVG `<line>` + `<marker>` 箭头, CSS keyframe 实现 draw-on + fade
- `position: fixed` 全屏浮层, Portal 到 body, zIndex 1500 (高于英雄卡, 低于飞牌 2000)
- 1 秒后自动清理状态

### 不包含

- 不按卡牌类型改变线条颜色 — 统一红色
- 不做音效
- 不做 resize/scroll 重定位
- 不影响现有飞牌动画 — 两者并行, 飞牌继续飞向 discard, 线从攻击者指向目标
- 不修改 game-engine 包 — 纯前端实现

## 数据流

### 触发链

```
engine emit 'card:play' { sourceHeroId, targetHeroId, data: { cardName, cardId, ... } }
    ↓
battleStore 的 card:play handler (battleStore.ts ~第 1220 行)
    ↓ (扩展)
读取 sourceHeroId + targetHeroId (或 data.targetHeroIds AoE)
findHeroCenter(sourceId) → {x, y}    攻击者屏幕坐标
findHeroCenter(targetId) → {x, y}    目标屏幕坐标
    ↓
set({ directionalLines: [...prev, newLines] })
setTimeout(1100ms, 过滤掉本次添加的 ids)
    ↓
React 重渲染
    ↓
DirectionalLineOverlay (portal to body)
    ↓
<svg><line>...  CSS animation (200ms draw + 800ms fade)
```

### 状态切片

`battleStore` 新增:

```ts
type DirectionalLine = {
  id: string          // 唯一 id (用于 filter)
  fromX: number       // 攻击者屏幕中心 X
  fromY: number       // 攻击者屏幕中心 Y
  toX: number         // 目标屏幕中心 X
  toY: number         // 目标屏幕中心 Y
  cardName: string    // 保留字段, 未来可扩展按卡着色
  createdAt: number   // 创建时间戳 (调试用)
}

directionalLines: DirectionalLine[]  // 初始值 []
```

不新增 action, 直接在 `card:play` handler 内通过 `set(...)` 和 `useBattleStore.setState(...)` 操作 (与 `flyingCards` 模式一致).

## 组件结构

### 新增文件 1: `apps/web/src/components/DirectionalLineOverlay.tsx`

```tsx
import { createPortal } from 'react-dom'
import { useBattleStore } from '../stores/battleStore'

export function DirectionalLineOverlay() {
  const lines = useBattleStore(s => s.directionalLines)
  if (lines.length === 0) return null
  return createPortal(
    <svg style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1500 }}>
      <defs>
        <marker id="directional-arrow" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff5252" />
        </marker>
      </defs>
      {lines.map(l => (
        <line key={l.id} className="directional-line"
          x1={l.fromX} y1={l.fromY} x2={l.toX} y2={l.toY}
          stroke="#ff5252" strokeWidth="3" opacity="0.85"
          markerEnd="url(#directional-arrow)" />
      ))}
    </svg>,
    document.body
  )
}
```

### 新增 CSS: `apps/web/src/styles/global.css` 末尾追加

```css
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

### 修改文件 1: `apps/web/src/components/BattleBoard.tsx`

- 顶部 import 新增 `import { DirectionalLineOverlay } from './DirectionalLineOverlay'`
- 在 `<FlyingCardOverlay />` 旁边 (~第 2104 行) 添加 `<DirectionalLineOverlay />`

预计改动 ~2 行.

### 修改文件 2: `apps/web/src/stores/battleStore.ts`

- 在初始 state (~第 281 行, `flyingCards` 旁) 加 `directionalLines: []`
- 在 helper 区 (~第 296-330 行) 加 `findHeroCenter(heroId)` 函数:
  ```ts
  const findHeroCenter = (heroId: string): { x: number; y: number } | null => {
    const el = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
    return el ? rectCenter(el.getBoundingClientRect()) : null
  }
  ```
- 在 `card:play` handler 内 (~第 1220 行), 现有 `queueFly` 调用前后, 加入攻击线入队逻辑 (见下方"入队逻辑")

### 入队逻辑 (插入 `card:play` handler 顶部)

```ts
const cardName = (event.data as any)?.cardName
const sourceId = event.sourceHeroId
const singleTargetId = event.targetHeroId
const aoeTargets: string[] = (event.data as any)?.targetHeroIds
  ?? (singleTargetId ? [singleTargetId] : [])

if (sourceId && aoeTargets.length > 0) {
  const from = findHeroCenter(sourceId)
  if (from) {
    const now = Date.now()
    const targets = aoeTargets
      .filter(tid => tid !== sourceId)  // 跳过自指
      .map(tid => findHeroCenter(tid))
      .filter((p): p is { x: number; y: number } => !!p)
    if (targets.length > 0) {
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
          directionalLines: s.directionalLines.filter(l => !newLines.find(n => n.id === l.id)),
        }))
      }, 1100)
    }
  }
}
```

现有 `queueFly({..., targetType: 'discard'})` 调用保持不变, 飞牌动画继续.

## 边缘情况

| 场景 | 行为 |
|------|------|
| 攻击者/目标 DOM 不存在 | `findHeroCenter` 返回 null, 该条线跳过 |
| 攻击者 = 目标 (自指) | 入队前 `filter(tid => tid !== sourceId)` 排除, 0 条线 |
| 快速连击 | 多条线并存, 数组追加, 各有唯一 id, CSS 动画独立运行 |
| 动画期间窗口 resize / scroll | 线条保持在捕获时的坐标 (1s 短暂, 可接受) |
| 组件卸载时动画进行中 | setTimeout 仍触发, 对不存在的 id 做 filter, 无副作用 |
| 玩家区域不在视口内 | `getBoundingClientRect` 仍返回坐标, 线可能画在屏幕外, 用户看不到 (1s 短暂) |
| AoE 事件 payload 字段名不确定 | `data.targetHeroIds` 优先, 回退到 `event.targetHeroId`, 实施时验证引擎 emit 字段 |

## 文件改动清单

| 文件 | 类型 | 行数 |
|------|------|------|
| `apps/web/src/components/DirectionalLineOverlay.tsx` | 新建 | ~30 |
| `apps/web/src/styles/global.css` | 追加 | ~14 |
| `apps/web/src/components/BattleBoard.tsx` | 修改 | +2 |
| `apps/web/src/stores/battleStore.ts` | 修改 | +30 |

总计 ~76 行. 零引擎改动.

## 验证

实施完成后手动测试:
1. 玩家回合出杀 → 红线从玩家指向目标, 飞牌飞向弃牌堆, 两者并行
2. 玩家决斗 → 红线从玩家指向决斗对手
3. 玩家探囊取物 → 红线从玩家指向被探囊者
4. AI 对玩家出杀 → 红线从 AI 指向玩家 (验证对称)
5. 南蛮入侵触发 → 攻击者向所有存活敌人同时发线
6. 重复点出指向性牌 → 多条线并存, 各自消失
7. 目标被移除/阵亡 → `findHeroCenter` 返回 null, 跳过, 不报错

## 不做 (YAGNI)

- 按卡牌类型改变线条颜色/样式
- 音效
- resize/scroll 重定位
- 修改引擎事件 payload
- 复杂入场动画 (弹跳/粒子)