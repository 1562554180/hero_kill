# 熔炼炉 UI 重做 — Spec

**日期**: 2026-06-24
**会话**: 重构招贤馆/英雄系统
**状态**: 设计已确认, 待用户审阅后进入实施规划

## 目标

把熔炼功能从 `BackpackPage` 内嵌 modal 改成独立 `/smelter` 页面. 视觉上以"炼丹炉"为主体, 三个凹槽围绕炉口呈三角布置, 用户点凹槽选英雄石投入, 底部"融合"按钮触发带动画的融合流程.

## 背景

当前熔炼入口在 `BackpackPage` 的英雄石 tab 顶部"熔炼"按钮, 弹 `SmeltModal` 走"+/- 步进"选 3 颗同星石头. 功能完整但体验割裂, 与游戏"炼丹炉"主题脱节.

新方案把熔炼变成主城建筑级别的独立场景, 强调"把原料投入炉中"的仪式感.

## 范围

### 包含

- 新路由 `/smelter` + 新 `SmelterPage` 页面
- 纯 CSS 绘制的炼丹炉 (炉身 + 炉火 + 三角凹槽)
- 凹槽脉冲发光 / 石头飞入 / 炉火跳动 / 酝酿摇晃 / 结果升起 — 5 段轻量动效
- `CityPage` 熔炼炉卡片加"进入熔炼炉"入口
- 删除 `BackpackPage` 的 `SmeltModal` 与触发按钮

### 不包含 (YAGNI)

- 真正的粒子系统 / 烟雾物理
- 炉子升级 (炉火颜色随主城等级变化) — 留给后续
- 熔炼历史记录
- 音效
- 多个炉子主题切换

## 路由

新增 `/smelter` (独立页面, 不复用 `/backpack` 任何状态).

```
GET /smelter  →  SmelterPage
```

## 页面布局

`SmelterPage` 全屏, 上下两段:

```
┌────────────────────────────────────────────────────┐
│  ←返回主城       熔炼炉          规则说明             │
├─────────────────────────────────┬──────────────────┤
│                                 │  英雄石池          │
│       ┌──────┐                  │  ┌──────────────┐ │
│       │ 凹槽① │                  │  │ ★★★虞姬 ×2    │ │
│       └──────┘                  │  │ ★★★吕布 ×1    │ │
│                                 │  │ ★★关羽 ×3    │ │
│      ╭───────────────╮          │  │ ...           │ │
│      │    炼丹炉      │          │  └──────────────┘ │
│   ┌──┘               └──┐       │                   │
│   │  凹槽②       凹槽③  │       │  点行 → 选为"待用"  │
│   │   (左下)     (右下)   │       │  再点凹槽 → 投入   │
│   └──┬───────────────┬──┘       │                   │
│      │   🔥 炉火       │       │                   │
│      ╰───────────────╯          │                   │
├─────────────────────────────────┴──────────────────┤
│  已选 2/3                          [  融 合  ]      │
└────────────────────────────────────────────────────┘
```

- 左 60% 宽 = 炼丹炉区 (CSS 炉身 + 三角凹槽 + 炉火动画)
- 右 40% 宽 = 英雄石池 (按 (星, 英雄) 分组, 每行带计数)
- 底部固定条 = 选中计数 + "融合" 按钮

## 组件

### Cauldron.tsx (新建)

纯 CSS 炼丹炉, 无 props (状态由父组件 `SmelterPage` 传 props 控制):

```ts
interface CauldronProps {
  slots: Array<{ stoneId: string; starLevel: number; heroId: string } | null>
  activeSlot: number | null        // 当前激活 (待投入) 的凹槽
  onSlotClick: (idx: number) => void
  phase: 'idle' | 'brewing' | 'revealed'
  resultStone?: HeroStone          // revealed 时显示
}
```

**炉子结构:**
- 顶层 div (相对定位, `aspect-ratio: 1`)
- 炉身: 椭圆 `border-radius: 50%`, `background: linear-gradient(180deg, #4a3525, #2a1f15)`, 双层边框 (内深外金)
- 炉口: 顶部半圆, 深色内陷阴影
- 3 凹槽: `position: absolute`, 圆形 (40-60px), 三角坐标:
  - 凹槽① (顶): `top: 8%, left: 50%, translateX(-50%)`
  - 凹槽② (左下): `bottom: 35%, left: 18%`
  - 凹槽③ (右下): `bottom: 35%, right: 18%`
- 炉火: 炉口下半部 `::before`, 渐变 + keyframe `flicker` (2s infinite, 透明度 0.6↔0.9, scaleY 0.95↔1.05)
- 三个凹槽共用的脉冲发光: keyframe `slot-pulse` 1.6s infinite, 空槽 box-shadow 透明度 0.3↔0.7

### StonePicker.tsx (新建)

```ts
interface StonePickerProps {
  stones: HeroStone[]
  heroMap: Map<string, Hero>
  pendingStoneId: string | null    // 池中"待用"高亮的石头
  onPick: (stoneId: string) => void // 把池中某石头置为待用
  usedStoneIds: Set<string>        // 已投入凹槽的 stoneId (灰显)
}
```

- 复用 `groupStones()` 按 (star, hero) 分组
- 每行: 英雄名 + 星级 + `× count`
- 点行 → `onPick(g.stoneId)` 切为待用 (高亮金色边框)
- 已被投入凹槽的石头 (usedStoneIds 包含) → opacity 0.4 + cursor not-allowed

### SmeltAnimation.tsx (新建)

```ts
interface SmeltAnimationProps {
  phase: 'brewing' | 'revealed'
  resultStone?: HeroStone
  onCollect: () => void           // "收下" 按钮回调
}
```

- brewing 阶段: 炉火变亮 (filter brightness 1.5), 炉身摇晃 (transform rotate ±2° keyframe 600ms 1 次)
- revealed 阶段: 结果石头从炉口中央 `translateY(40px → 0) scale(0.6 → 1)` + opacity 0→1, 配金色脉冲环 (伪元素)
- "收下" 按钮: revealed 阶段 enabled

## 状态机

`SmelterPage` 内部单一 `phase` state:

| Phase | 含义 | 可做操作 |
|-------|------|---------|
| `idle` | 初始 / 收下后 | 点池, 点凹槽 (投入/取出) |
| `brewing` | 融合中 (动画锁定) | 仅可看 |
| `revealed` | 结果英雄石已升起 | 点"收下"回 idle |

**单次融合流程:**
1. idle → 点"融合" → 立即 fetch `/api/recruit/smelt/:userId`
2. 成功 → phase=brewing → 0.8s 酝酿 → phase=revealed → 用户点"收下" → phase=idle
3. 失败 → 直接回 phase=idle + 顶部错误 toast (不进入 brewing)

**取消 brewing:** 不允许. 一旦点融合就播完 (避免半中断状态).

## 动画时序

全部 CSS `transition` + `@keyframes`, 不阻塞主线程:

| 时刻 | 事件 | 动效 |
|------|------|------|
| 0 ms | 点"融合" | 3 颗石头 `scale 1→0.3` + `opacity 1→0` 250ms 后移除 DOM |
| 100 ms | 进入 brewing | 炉火 `filter: brightness 1.5` 过渡 200ms |
| 100-800 ms | 酝酿中 | 炉身 keyframe `shake` ±2° 600ms, 凹槽变灰 (`opacity 0.4`) |
| 800 ms | 进入 revealed | 结果石头 `translateY(40px → 0) scale(0.6 → 1)` + opacity 0→1, 400ms ease-out |
| 1200 ms | 高光圈 | 结果石头周围伪元素 `scale(0.8 → 1.4)` + opacity 0→0.6→0, 1 轮 800ms |
| 持续 | 等用户 | "收下"按钮从 disabled → enabled |

**凹槽脉冲发光 (空槽常驻, idle 阶段):**
- keyframe `slot-pulse` 1.6s infinite
- box-shadow `rgba(255, 213, 79, 0.3) ↔ rgba(255, 213, 79, 0.7)`
- 星级色变体: 1-3★ 棕 (`#8a6a3a`), 4★ 紫 (`#9c7ec8`), 5★ 金 (`#ffd54f`)

## 数据流

```
SmelterPage
├── fetch /api/save/:userId  → stones, heroStones
├── fetch /api/hero           → allHeroes
│
├── state: slots: [s1, s2, s3 | null]   (3 凹槽)
├── state: pendingStoneId: string|null   (池中待用)
├── state: phase: 'idle'|'brewing'|'revealed'
├── state: resultStone?: HeroStone
│
├── handler: handleSlotClick(idx)
│   - 如果槽空 + pendingStoneId: 投入 (slots[idx] = pending)
│   - 如果槽有: 弹出菜单 (取出 / 替换)
│   - 取空后 pending 仍保留, 用户可继续投入另两个槽
│
├── handler: handlePickFromPool(stoneId)
│   - 切换 pendingStoneId (toggle, 再点同一行取消)
│   - 已投入凹槽的 stoneId 不能被选为 pending
│
└── handler: handleSmelt()
    - 校验 3 槽同星 (用现有服务端校验逻辑也可, 但前端预校验避免无效请求)
    - phase = 'brewing'
    - fetch POST /api/recruit/smelt/:userId { stoneIds: [s1,s2,s3] }
    - 成功: 800ms 后 phase = 'revealed', resultStone = data.stone
    - 失败: phase = 'idle', toast 显示 error
```

## 错误处理

- 后端返回 `{ error: '...' }` → toast `熔炼失败: ${error}` + phase=idle
- 后端 5xx → 同上, toast `熔炼失败 (${status})`
- 网络错误 → toast `网络错误`
- 客户端预校验失败 (3 颗不同星) → toast `3 颗英雄石必须是相同星级` + 不发请求

## 文件改动清单

| 文件 | 操作 | 估计行数 |
|------|------|---------|
| `apps/web/src/pages/SmelterPage/index.tsx` | 新建 | ~200 |
| `apps/web/src/pages/SmelterPage/Cauldron.tsx` | 新建 | ~120 |
| `apps/web/src/pages/SmelterPage/StonePicker.tsx` | 新建 | ~80 |
| `apps/web/src/pages/SmelterPage/SmeltAnimation.tsx` | 新建 | ~60 |
| `apps/web/src/main.tsx` | 改 (+1 行) | +1 |
| `apps/web/src/pages/CityPage/index.tsx` | 改 (smelt 卡片 +1 按钮) | +6 |
| `apps/web/src/pages/BackpackPage/index.tsx` | 改 (删 SmeltModal + 熔炼入口) | -160 |

**净增量: ~307 行**. `groupStones` 只在 SmelterPage 用, 不抽出共享模块 (YAGNI).

## 测试

按项目记忆, 修复/实现不写 vitest, 仅:

1. `pnpm build` 通过 (类型)
2. 手动验证 web 端:
   - 主城 → 点"进入熔炼炉" → `/smelter` 渲染
   - 池中点石头 → 高亮"待用"
   - 点空凹槽 → 石头飞入
   - 重复 3 次 → "融合" 按钮启用
   - 点"融合" → 动画播 → 结果升起 → "收下" 回 idle
   - 后端 `/api/recruit/smelt` 端到端验证 (curl 已通过)
3. 回归: `/backpack` 不再有熔炼入口, 英雄石 tab 顶部说明文字删除

## 风险

| 风险 | 缓解 |
|------|------|
| 纯 CSS 炉子画风与现有"古风"主题不一致 | 配色用 `--bg-*` / `--border-gold` / `--text-gold` 现有变量, 不引入新色 |
| 三角凹槽绝对定位在窄屏错位 | 用 `%` + `transform: translate`, viewport 媒体查询 < 600px 隐藏右栏 (本期不实现, 后续可加) |
| Brewing 网络慢时用户盯着空炉 | 加"融合中..."文字同步显示 |
| Phase 切换 timing 不准 | 用 `setTimeout` 控制 phase, 不依赖 CSS animationend 事件 |
| 后端 stoneId 不存在时 (竞态) | 服务端 `smeltStones` 已校验 stoneId 存在, 客户端选完后立即 disable 凹槽交互 |

## 后续 (不在本期)

- 炉子按主城等级升级 (炉火更亮 / 炉身花纹)
- 音效 (投入石头 / 融合 / 收下)
- 熔炼历史 / 统计 (本周融合了多少 X 星)